import WebSocket from 'ws';
import { WebSocketMessage } from '../websocket/handlers';
import { BrowserService } from './browser';
import { AgentService } from './agent';

export class Session {
    private sessionId: string;
    private ws: WebSocket;
    private browser: BrowserService;
    private agent: AgentService;

    sendResponse = (type: string, payload: any): void => {
        const message: WebSocketMessage = {
            type,
            payload,
            timestamp: new Date().toISOString()
        };

        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    };

    constructor(ws: WebSocket) {
        this.sessionId = this.generateSessionId();
        this.ws = ws;
        this.browser = new BrowserService();
        this.agent = new AgentService(this.browser, this.sendResponse);
        console.log(`[SESSION] Created session: ${this.sessionId}`);
        this.initializeBrowser();
        this.setupWebSocketCleanup();
    }

    private async initializeBrowser(): Promise<void> {
        try {
            await this.browser.initialize();
            console.log(`[SESSION:${this.sessionId}] Browser initialized`);
            await this.startStreaming();
        } catch (error) {
            console.error(`[SESSION:${this.sessionId}] Failed to initialize browser:`, error);
        }
    }

    private setupWebSocketCleanup(): void {
        this.ws.on('close', () => {
            this.cleanup();
        });
    }

    private async startStreaming(): Promise<void> {
        try {
            await this.browser.startStreaming((frameData: string) => {
                this.sendResponse('frame', {
                    data: frameData,
                    sessionId: this.sessionId
                });
            });
            console.log(`[SESSION:${this.sessionId}] Streaming started`);
        } catch (error) {
            console.error(`[SESSION:${this.sessionId}] Failed to start streaming:`, error);
        }
    }

    private async cleanup(): Promise<void> {
        try {
            await this.browser.stopStreaming();
            console.log(`[SESSION:${this.sessionId}] Session cleaned up`);
        } catch (error) {
            console.error(`[SESSION:${this.sessionId}] Error during cleanup:`, error);
        }
    }

    getSessionId(): string {
        return this.sessionId;
    }

    onInstruction(message: WebSocketMessage): void {
        console.log(`[SESSION:${this.sessionId}] Received instruction:`, message.type);
        this.agent.onInstruction(message.payload.text);
    }

    private generateSessionId(): string {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

}
