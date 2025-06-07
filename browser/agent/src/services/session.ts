import { SessionState, InstructionMessage } from '../types';
import { logger } from '../utils/logger';

export class SessionService {
  private state: SessionState;

  constructor() {
    this.state = {
      id: this.generateSessionId(),
      isActive: true,
      actionsHistory: [],
      outputs: [],
      manualInterventionEnabled: false,
      lastActivity: Date.now()
    };

    logger.info('Session initialized', { 
      sessionId: this.state.id 
    });
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getState(): SessionState {
    return { ...this.state };
  }

  addAction(action: string): void {
    this.state.actionsHistory.push(action);
    this.updateActivity();
  }

  addOutput(output: { id: string; type: 'text' | 'json' | 'image'; content: any }): void {
    this.state.outputs.push({
      ...output,
      timestamp: Date.now()
    });
    this.updateActivity();
  }

  getOutputs(): Array<{ id: string; type: 'text' | 'json' | 'image'; content: any; timestamp: number }> {
    return [...this.state.outputs];
  }

  addInstruction(_instruction: InstructionMessage): void {
    // For now, just update activity - we can track instructions differently if needed
    this.updateActivity();
  }

  clearHistory(): void {
    this.state.actionsHistory = [];
    this.state.outputs = [];
    this.updateActivity();
  }

  private updateActivity(): void {
    this.state.lastActivity = Date.now();
  }

  isActive(): boolean {
    const inactiveThreshold = 60 * 60 * 1000; // 1 hour
    const timeSinceActivity = Date.now() - this.state.lastActivity;
    return timeSinceActivity < inactiveThreshold;
  }
} 