export interface ChangeDetectionResult {
  hasChanges: boolean;
  changeCount: number;
  changeTypes: string[];
  urlChanged: boolean;
  beforeUrl: string;
  afterUrl: string;
}

export interface ActionExecutionResult {
  success: boolean;
  error?: string;
  observation?: string;
  metadata?: {
    duration: number;
    changeDetection?: ChangeDetectionResult;
    [key: string]: any;
  };
}

export interface TaskCompletionCheck {
  shouldComplete: boolean;
  reason?: string;
}

export interface SignalState {
  stopSignal: boolean;
  completeSignal: boolean;
  currentInstructionId?: string;
}

export interface ProcessingState {
  isProcessing: boolean;
  processedInstructions: Set<string>;
  shouldCompleteTask: boolean;
  taskCompletionMessage?: string;
} 