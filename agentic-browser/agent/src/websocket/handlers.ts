import WebSocket from 'ws';
import { Session } from '../services/session';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export class WebSocketHandlers {
  private clients: Map<WebSocket, Session> = new Map();

  handleConnection(ws: WebSocket): void {
    console.log('[WS] New client connected');
    
    // Create a session for this connection
    const session = new Session(ws);
    
    this.clients.set(ws, session);

    // Send initial connection confirmation
    session.sendResponse('connection', { 
      status: 'connected',
      sessionId: session.getSessionId()
    });

    ws.on('message', (data) => {
      this.handleMessage(ws, data);
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
      this.clients.delete(ws);
    });
  }

  private handleMessage(ws: WebSocket, data: WebSocket.Data): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      console.log('[WS] Received message:', message.type);
      
      const session = this.clients.get(ws);
      if (session) {
        session.onInstruction(message);
      }
    } catch (error) {
      console.error('[WS] Error parsing message:', error);
    }
  }

  sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
} 