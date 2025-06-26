import WebSocket from 'ws';
import { WebSocketMessage } from '../websocket/handlers';
import { BrowserService } from './browser';
import { AgentService } from './agent';
import { Logger } from './logger';

export class Session {
    private sessionId: string;
    private ws: WebSocket;
    private browser: BrowserService;
    private agent: AgentService;
    private logger: Logger;

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
        this.logger = new Logger(this.sessionId);
        this.browser = new BrowserService(this.logger);
        this.agent = new AgentService(this.browser, this.sendResponse, this.logger);
        this.logger.info('session', `Created session: ${this.sessionId}`);
        this.initializeBrowser();
        this.setupWebSocketCleanup();
    }

    private async initializeBrowser(): Promise<void> {
        try {
            await this.browser.initialize();
            this.logger.info('session', 'Browser initialized');
            await this.startStreaming();
        } catch (error) {
            this.logger.error('session', 'Failed to initialize browser', error);
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
            this.logger.info('session', 'Streaming started');
        } catch (error) {
            this.logger.error('session', 'Failed to start streaming', error);
        }
    }

    private async cleanup(): Promise<void> {
        try {
            await this.browser.stopStreaming();
            this.logger.info('session', 'Session cleaned up');
        } catch (error) {
            this.logger.error('session', 'Error during cleanup', error);
        }
    }

    getSessionId(): string {
        return this.sessionId;
    }

    async onInstruction(message: WebSocketMessage): Promise<void> {
        this.logger.debug('session', `Received message: ${message.type}`);

        switch (message.type) {
            case 'instruction':
                this.logger.info('session', `Processing instruction: ${message.payload?.text}`);
                await this.agent.onInstruction(message.payload.text);
                break;
            
            case 'manual_intervention_complete':
                await this.handleManualInterventionComplete(message);
                break;
            
            case 'mouse_action':
                await this.handleMouseAction(message);
                break;
            
            case 'keyboard_action':
                await this.handleKeyboardAction(message);
                break;
            
            default:
                this.logger.warn('session', `Unknown message type: ${message.type}`);
                break;
        }
    }

    private async handleManualInterventionComplete(message: WebSocketMessage): Promise<void> {
        this.logger.info('session', 'Manual intervention marked as complete');
        
        // Send acknowledgment back to UI
        this.sendResponse('manual_intervention_acknowledged', {
            sessionId: this.sessionId,
            timestamp: Date.now(),
            status: 'acknowledged'
        });
        
        // Resume agent processing
        this.logger.info('session', 'Resuming agent processing');
        await this.agent.resumeAfterManualIntervention();
    }

    private async handleMouseAction(message: WebSocketMessage): Promise<void> {
        this.logger.debug('session', 'Received mouse action', message.payload);
        
        try {
            const { actionType, x, y, button = 'left', clickCount = 1, deltaX, deltaY } = message.payload;
            
            switch (actionType) {
                case 'mouse_position':
                case 'mouse_move':
                    await this.browser.mouseMove(x, y);
                    break;
                
                case 'mouse_click':
                    await this.browser.mouseClick(x, y, button, clickCount);
                    this.logger.debug('session', `Mouse click at (${x}, ${y}) with ${button} button`);
                    break;
                
                case 'mouse_down':
                    await this.browser.mouseDown(x, y, button);
                    this.logger.debug('session', `Mouse down at (${x}, ${y}) with ${button} button`);
                    break;
                
                case 'mouse_up':
                    await this.browser.mouseUp(x, y, button);
                    this.logger.debug('session', `Mouse up at (${x}, ${y}) with ${button} button`);
                    break;
                
                case 'scroll':
                    await this.browser.scroll(x, y, deltaX || 0, deltaY || 0);
                    this.logger.debug('session', `Scroll at (${x}, ${y}) delta(${deltaX}, ${deltaY})`);
                    break;
                
                default:
                    this.logger.warn('session', `Unknown mouse action: ${actionType}`);
                    break;
            }
        } catch (error) {
            this.logger.error('session', 'Error handling mouse action', error);
        }
    }

    private async handleKeyboardAction(message: WebSocketMessage): Promise<void> {
        this.logger.debug('session', 'Received keyboard action', message.payload);
        
        try {
            const { actionType, key, text, modifiers } = message.payload;
            
            switch (actionType) {
                case 'key_down':
                    if (key) {
                        // Skip modifier-only key events that are part of complex input
                        if (this.isModifierKey(key) && modifiers && modifiers.includes(key.toLowerCase())) {
                            this.logger.debug('session', `Skipping redundant modifier key: ${key}`);
                            return;
                        }
                        
                        await this.browser.keyDown(key, modifiers);
                        this.logger.debug('session', `Key down: ${key}${modifiers ? ` with modifiers: ${modifiers.join(', ')}` : ''}`);
                    }
                    break;
                
                case 'key_up':
                    if (key) {
                        await this.browser.keyUp(key, modifiers);
                        this.logger.debug('session', `Key up: ${key}${modifiers ? ` with modifiers: ${modifiers.join(', ')}` : ''}`);
                    }
                    break;
                
                case 'text_input':
                    if (text) {
                        // Use direct text input for better character support
                        await this.browser.typeText(text);
                        this.logger.debug('session', `Text input: "${text}"`);
                    }
                    break;
                
                default:
                    this.logger.warn('session', `Unknown keyboard action: ${actionType}`);
                    break;
            }
        } catch (error) {
            this.logger.error('session', 'Error handling keyboard action', error);
        }
    }

    private isModifierKey(key: string): boolean {
        const modifierKeys = ['shift', 'control', 'ctrl', 'alt', 'meta', 'cmd', 'command'];
        return modifierKeys.includes(key.toLowerCase());
    }

    private generateSessionId(): string {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

}
