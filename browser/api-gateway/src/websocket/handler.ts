import WebSocket from 'ws';
import { IncomingMessage } from 'http';
import { validateToken } from '../middleware/auth';
import { logger } from '../utils/logger';

interface ExtendedWebSocket extends WebSocket {
  sessionId?: string;
  userId?: string;
  isAlive?: boolean;
  endpointType?: 'visual-feedback' | 'instructions' | 'output';
}

// WebSocket connection manager
class WebSocketHandler {
  private connections = new Map<string, Map<string, Set<ExtendedWebSocket>>>();

  constructor() {}

  // Handle new WebSocket connection
  async handleConnection(ws: ExtendedWebSocket, request: IncomingMessage): Promise<void> {
    try {
      // Extract session ID, endpoint type, and token from URL
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const pathParts = url.pathname.split('/');
      
      // Expected path: /api/session/{sessionId}/{endpointType}
      // Where endpointType is: agent-com, instructions, or output
      const sessionId = pathParts[3];
      const urlEndpointType = pathParts[4]; // This can be 'agent-com', 'instructions', or 'output'
      const token = url.searchParams.get('token');

      if (!sessionId) {
        logger.warn('WebSocket connection rejected: missing session ID');
        ws.close(4000, 'Missing session ID');
        return;
      }

      if (!urlEndpointType || !['agent-com', 'instructions', 'output'].includes(urlEndpointType)) {
        logger.warn('WebSocket connection rejected: invalid endpoint type', { endpointType: urlEndpointType });
        ws.close(4000, 'Invalid endpoint type');
        return;
      }

      if (!token) {
        logger.warn('WebSocket connection rejected: missing token');
        ws.close(4001, 'Missing authentication token');
        return;
      }

      // Validate token
      const payload = await validateToken(token);
      if (!payload) {
        logger.warn('WebSocket connection rejected: invalid token');
        ws.close(4002, 'Invalid authentication token');
        return;
      }

      // Map URL path to internal endpoint type
      let internalEndpointType: 'visual-feedback' | 'instructions' | 'output';
      if (urlEndpointType === 'agent-com') {
        internalEndpointType = 'visual-feedback';
      } else {
        internalEndpointType = urlEndpointType as 'instructions' | 'output';
      }

      // Set up connection metadata
      ws.sessionId = sessionId;
      ws.userId = payload.sub;
      ws.isAlive = true;
      ws.endpointType = internalEndpointType;

      // Add to connection pool
      if (!this.connections.has(sessionId)) {
        this.connections.set(sessionId, new Map());
      }
      
      const sessionConnections = this.connections.get(sessionId)!;
      if (!sessionConnections.has(internalEndpointType)) {
        sessionConnections.set(internalEndpointType, new Set());
      }
      sessionConnections.get(internalEndpointType)!.add(ws);

      logger.info('WebSocket connection established', {
        sessionId,
        userId: payload.sub,
        endpointType: internalEndpointType,
        urlPath: urlEndpointType,
        endpoint: url.pathname
      });

      // Set up heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle messages based on endpoint type
      ws.on('message', (data) => {
        this.handleMessage(ws, data);
      });

      // Handle connection close
      ws.on('close', () => {
        this.removeConnection(sessionId, internalEndpointType, ws);
        logger.info('WebSocket connection closed', { sessionId, userId: payload.sub, endpointType: internalEndpointType });
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error', { sessionId, endpointType: internalEndpointType, error });
        this.removeConnection(sessionId, internalEndpointType, ws);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        endpointType: internalEndpointType,
        message: `WebSocket connection established for ${internalEndpointType}`,
        timestamp: Date.now()
      });

    } catch (error) {
      logger.error('WebSocket connection setup failed', { error });
      ws.close(4003, 'Connection setup failed');
    }
  }

  // Handle incoming messages
  private handleMessage(ws: ExtendedWebSocket, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      logger.debug('WebSocket message received', {
        sessionId: ws.sessionId,
        endpointType: ws.endpointType,
        messageType: message.type
      });

      // Handle different message types based on endpoint
      switch (ws.endpointType) {
        case 'instructions':
          // Handle instruction messages
          logger.debug('Instruction message received', { sessionId: ws.sessionId, message });
          break;
        case 'visual-feedback':
          // Forward to all visual-feedback connections for this session
          if (ws.sessionId) {
            this.broadcastToSessionEndpoint(ws.sessionId, 'visual-feedback', message);
          }
          break;
        case 'output':
          // Handle output messages
          logger.debug('Output message received', { sessionId: ws.sessionId, message });
          break;
      }
      
    } catch (error) {
      logger.error('Error handling WebSocket message', { error });
      this.sendToClient(ws, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: Date.now()
      });
    }
  }

  // Remove connection from pool
  private removeConnection(sessionId: string, endpointType: string, ws: ExtendedWebSocket): void {
    const sessionConnections = this.connections.get(sessionId);
    if (sessionConnections) {
      const endpointConnections = sessionConnections.get(endpointType);
      if (endpointConnections) {
        endpointConnections.delete(ws);
        if (endpointConnections.size === 0) {
          sessionConnections.delete(endpointType);
        }
      }
      if (sessionConnections.size === 0) {
        this.connections.delete(sessionId);
      }
    }
  }

  // Send message to specific client
  private sendToClient(ws: ExtendedWebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // Broadcast to all clients of specific type in a session
  broadcastToSessionEndpoint(sessionId: string, endpointType: string, data: any): void {
    const sessionConnections = this.connections.get(sessionId);
    if (sessionConnections) {
      const endpointConnections = sessionConnections.get(endpointType);
      if (endpointConnections) {
        endpointConnections.forEach(ws => {
          this.sendToClient(ws, data);
        });
      }
    }
  }

  // Broadcast to all clients in a session (all endpoint types)
  broadcastToSession(sessionId: string, data: any): void {
    const sessionConnections = this.connections.get(sessionId);
    if (sessionConnections) {
      sessionConnections.forEach((endpointConnections) => {
        endpointConnections.forEach(ws => {
          this.sendToClient(ws, data);
        });
      });
    }
  }

  // Start heartbeat interval
  startHeartbeat(): void {
    const interval = setInterval(() => {
      this.connections.forEach((sessionConnections) => {
        sessionConnections.forEach((endpointConnections) => {
          endpointConnections.forEach(ws => {
            if (!ws.isAlive) {
              logger.debug('Terminating dead WebSocket connection', {
                sessionId: ws.sessionId,
                endpointType: ws.endpointType
              });
              ws.terminate();
              return;
            }
            
            ws.isAlive = false;
            ws.ping();
          });
        });
      });
    }, 30000); // 30 seconds

    // Clean up on process exit
    process.on('SIGTERM', () => {
      clearInterval(interval);
    });
  }

  // Get connection stats
  getStats() {
    let totalConnections = 0;
    const sessionStats: any = {};
    
    this.connections.forEach((sessionConnections, sessionId) => {
      sessionStats[sessionId] = {};
      sessionConnections.forEach((endpointConnections, endpointType) => {
        sessionStats[sessionId][endpointType] = endpointConnections.size;
        totalConnections += endpointConnections.size;
      });
    });
    
    return {
      totalSessions: this.connections.size,
      totalConnections,
      sessionStats
    };
  }
}

export const wsHandler = new WebSocketHandler(); 