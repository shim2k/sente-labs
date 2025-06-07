import { Response } from 'express';
import { LogEntry } from '../types';
import { logger } from '../utils/logger';

export class StreamManager {
  private sseClients: Map<string, Response> = new Map();

  addSSEClient(clientId: string, res: Response): void {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    // Store client
    this.sseClients.set(clientId, res);

    // Handle client disconnect
    res.on('close', () => {
      logger.info(`SSE client disconnected: ${clientId}`);
      this.sseClients.delete(clientId);
    });
  }

  sendLogToClients(log: LogEntry): void {
    const data = `data: ${JSON.stringify({ type: 'log', log })}\n\n`;
    
    this.sseClients.forEach((client, clientId) => {
      try {
        client.write(data);
      } catch (error) {
        logger.error(`Failed to send log to SSE client ${clientId}`, error);
        this.sseClients.delete(clientId);
      }
    });
  }

  sendEventToClients(event: any): void {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    
    this.sseClients.forEach((client, clientId) => {
      try {
        client.write(data);
      } catch (error) {
        logger.error(`Failed to send event to SSE client ${clientId}`, error);
        this.sseClients.delete(clientId);
      }
    });
  }

  getConnectedSSEClients(): number {
    return this.sseClients.size;
  }

  closeAllConnections(): void {
    this.sseClients.forEach((client) => {
      try {
        client.end();
      } catch (error) {
        // Ignore errors during cleanup
      }
    });
    this.sseClients.clear();
  }
} 