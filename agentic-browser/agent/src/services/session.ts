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

    async onInstruction(message: WebSocketMessage): Promise<void> {
        console.log(`[SESSION:${this.sessionId}] Received message:`, message.type);

        switch (message.type) {
            case 'instruction':
                console.log(`[SESSION:${this.sessionId}] Processing instruction:`, message.payload?.text);
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
                console.log(`[SESSION:${this.sessionId}] Unknown message type:`, message.type);
                break;
        }
    }

    private async handleManualInterventionComplete(message: WebSocketMessage): Promise<void> {
        console.log(`[SESSION:${this.sessionId}] Manual intervention marked as complete`);
        
        // Send acknowledgment back to UI
        this.sendResponse('manual_intervention_acknowledged', {
            sessionId: this.sessionId,
            timestamp: Date.now(),
            status: 'acknowledged'
        });
        
        // Resume agent processing
        console.log(`[SESSION:${this.sessionId}] Resuming agent processing`);
        await this.agent.resumeAfterManualIntervention();
    }

    private async handleMouseAction(message: WebSocketMessage): Promise<void> {
        console.log(`[SESSION:${this.sessionId}] Received mouse action:`, message.payload);
        
        try {
            const { actionType, x, y, button = 'left', clickCount = 1, deltaX, deltaY } = message.payload;
            
            switch (actionType) {
                case 'mouse_position':
                case 'mouse_move':
                    await this.browser.mouseMove(x, y);
                    break;
                
                case 'mouse_click':
                    await this.browser.mouseClick(x, y, button, clickCount);
                    console.log(`[SESSION:${this.sessionId}] Mouse click at (${x}, ${y}) with ${button} button`);
                    break;
                
                case 'mouse_down':
                    await this.browser.mouseDown(x, y, button);
                    console.log(`[SESSION:${this.sessionId}] Mouse down at (${x}, ${y}) with ${button} button`);
                    break;
                
                case 'mouse_up':
                    await this.browser.mouseUp(x, y, button);
                    console.log(`[SESSION:${this.sessionId}] Mouse up at (${x}, ${y}) with ${button} button`);
                    break;
                
                case 'scroll':
                    await this.browser.scroll(x, y, deltaX || 0, deltaY || 0);
                    console.log(`[SESSION:${this.sessionId}] Scroll at (${x}, ${y}) delta(${deltaX}, ${deltaY})`);
                    break;
                
                default:
                    console.warn(`[SESSION:${this.sessionId}] Unknown mouse action: ${actionType}`);
                    break;
            }
        } catch (error) {
            console.error(`[SESSION:${this.sessionId}] Error handling mouse action:`, error);
        }
    }

    private async handleKeyboardAction(message: WebSocketMessage): Promise<void> {
        console.log(`[SESSION:${this.sessionId}] Received keyboard action:`, message.payload);
        
        try {
            const { actionType, key, text, modifiers } = message.payload;
            
            switch (actionType) {
                case 'key_down':
                    if (key) {
                        // Skip modifier-only key events that are part of complex input
                        if (this.isModifierKey(key) && modifiers && modifiers.includes(key.toLowerCase())) {
                            console.log(`[SESSION:${this.sessionId}] Skipping redundant modifier key: ${key}`);
                            return;
                        }
                        
                        await this.browser.keyDown(key, modifiers);
                        console.log(`[SESSION:${this.sessionId}] Key down: ${key}${modifiers ? ` with modifiers: ${modifiers.join(', ')}` : ''}`);
                    }
                    break;
                
                case 'key_up':
                    if (key) {
                        await this.browser.keyUp(key, modifiers);
                        console.log(`[SESSION:${this.sessionId}] Key up: ${key}${modifiers ? ` with modifiers: ${modifiers.join(', ')}` : ''}`);
                    }
                    break;
                
                case 'text_input':
                    if (text) {
                        // Use direct text input for better character support
                        await this.browser.typeText(text);
                        console.log(`[SESSION:${this.sessionId}] Text input: "${text}"`);
                    }
                    break;
                
                default:
                    console.warn(`[SESSION:${this.sessionId}] Unknown keyboard action: ${actionType}`);
                    break;
            }
        } catch (error) {
            console.error(`[SESSION:${this.sessionId}] Error handling keyboard action:`, error);
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
