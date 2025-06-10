// WebSocket message types
export interface InstructionMessage {
  id: string;
  text: string;
  sessionId: string;
  timestamp: number;
}

export interface ResponseMessage {
  id: string;
  status: 'success' | 'error' | 'manual_intervention_required';
  error?: string;
  executed?: string[];
  actions?: Action[];
  manualInterventionRequest?: ManualInterventionRequest;
  currentUrl?: string;
  pageTitle?: string;
}

export interface MouseAction {
  actionType: 'click' | 'move' | 'scroll' | 'drag';
  x: number;
  y: number;
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  deltaX?: number;
  deltaY?: number;
}

export interface KeyboardAction {
  actionType: 'key_down' | 'key_up' | 'text_input' | 'key_press';
  key?: string;
  text?: string;
  modifiers?: string[];
}

export interface ManualInterventionRequest {
  reason: string;
  suggestion?: string;
  category?: 'login' | 'navigation' | 'content' | 'technical' | 'general';
  timestamp: number;
  context?: any;
}

// Orchestrator interface - ReAct-only orchestrator
export interface IOrchestrator {
  processInstruction(instruction: InstructionMessage): Promise<ResponseMessage>;
  isCurrentlyProcessing(): boolean;
}

export interface Action {
  type: 'navigate' | 'click' | 'clickByPosition' | 'type' | 'wait' | 'screenshot' | 'scroll' | 'select' | 'hover' | 'pressEnter';
  selector?: string;           // Single selector (for backward compatibility)
  selectors?: string[];        // Multiple selectors ordered by preference
  value?: string;
  url?: string;
  duration?: number;
  x?: number;
  y?: number;
  direction?: 'up' | 'down';   // For scroll actions
  amount?: number;             // For scroll actions (pixels)
  description: string;
}

// Browser context types
export interface BrowserContext {
  currentUrl: string;
  pageTitle: string;
  viewport: { width: number; height: number };
  dpr?: number;
  cookies?: any[];
  localStorage?: Record<string, string>;
}

// Session types
export interface SessionState {
  id: string;
  isActive: boolean;
  actionsHistory: string[];
  outputs: Array<{
    id: string;
    type: 'text' | 'json' | 'image';
    content: any;
    timestamp: number;
  }>;
  manualInterventionEnabled: boolean;
  lastActivity: number;
}

// Log types
export interface LogEntry {
  id?: string;
  type: 'system' | 'agent' | 'action' | 'error' | 'llm';
  message: string;
  timestamp: number;
  data?: any;
}

// Output types
export interface OutputItem {
  id: string;
  title?: string;
  content: string;
  timestamp: number;
  type?: 'text' | 'code' | 'error' | 'success';
}

export interface ClarificationRequest {
  confidenceScore: number;
  reasoning: string;
  message: string;
  suggestedQuestions?: string[];
  timestamp: number;
} 