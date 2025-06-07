import { SignalState, ProcessingState } from './types';
import { logger } from '../../utils/logger';

export class StateManager {
  private signalState: SignalState = {
    stopSignal: false,
    completeSignal: false,
    currentInstructionId: undefined
  };

  private processingState: ProcessingState = {
    isProcessing: false,
    processedInstructions: new Set<string>(),
    shouldCompleteTask: false,
    taskCompletionMessage: undefined
  };

  // Signal management
  setStopSignal(instructionId?: string): void {
    if (this.signalState.currentInstructionId && 
        instructionId && 
        instructionId !== this.signalState.currentInstructionId) {
      logger.agent('Stop signal ignored - not for current instruction', {
        currentId: this.signalState.currentInstructionId,
        requestedId: instructionId
      });
      return;
    }

    logger.agent('🛑 Stop signal set', { instructionId });
    this.signalState.stopSignal = true;
  }

  setCompleteSignal(instructionId?: string): void {
    if (this.signalState.currentInstructionId && 
        instructionId && 
        instructionId !== this.signalState.currentInstructionId) {
      logger.agent('Complete signal ignored - not for current instruction', {
        currentId: this.signalState.currentInstructionId,
        requestedId: instructionId
      });
      return;
    }

    logger.agent('✅ Complete signal set', { 
      instructionId,
      currentInstructionId: this.signalState.currentInstructionId,
      wasProcessing: this.processingState.isProcessing
    });
    this.signalState.completeSignal = true;
  }

  resetSignals(): void {
    this.signalState.stopSignal = false;
    this.signalState.completeSignal = false;
    // Don't reset currentInstructionId here - it should only be reset in stopProcessing()
  }

  resetSignalsAndInstructionId(): void {
    this.signalState.stopSignal = false;
    this.signalState.completeSignal = false;
    this.signalState.currentInstructionId = undefined;
  }

  isStopSignaled(): boolean {
    return this.signalState.stopSignal;
  }

  isCompleteSignaled(): boolean {
    return this.signalState.completeSignal;
  }

  getCurrentInstructionId(): string | undefined {
    return this.signalState.currentInstructionId;
  }

  // Processing state management
  startProcessing(instructionId: string): boolean {
    // If already processing, check if current instruction was marked complete
    if (this.processingState.isProcessing) {
      // Allow new instructions if the current one was marked complete by user
      if (this.signalState.completeSignal) {
        logger.agent('Allowing new instruction - current instruction marked complete', {
          currentInstructionId: this.signalState.currentInstructionId,
          newInstructionId: instructionId
        });
        // Force stop the current processing to allow the new instruction
        this.forceStopProcessing();
      } else {
        logger.agent('Rejecting instruction - already processing', {
          currentInstructionId: this.signalState.currentInstructionId,
          newInstructionId: instructionId,
          isProcessing: this.processingState.isProcessing
        });
        return false; // Already processing and not marked complete
      }
    }

    if (this.processingState.processedInstructions.has(instructionId)) {
      logger.agent('Rejecting instruction - already processed', {
        instructionId,
        processedCount: this.processingState.processedInstructions.size
      });
      return false; // Already processed
    }

    logger.agent('Starting processing for new instruction', {
      instructionId,
      previouslyProcessing: this.processingState.isProcessing,
      hadCompleteSignal: this.signalState.completeSignal,
      hadStopSignal: this.signalState.stopSignal
    });

    this.processingState.isProcessing = true;
    this.signalState.currentInstructionId = instructionId;
    this.processingState.processedInstructions.add(instructionId);
    this.resetSignals(); // Only reset signals, not the instruction ID

    return true;
  }

  stopProcessing(): void {
    logger.agent('Stopping processing', {
      instructionId: this.signalState.currentInstructionId,
      wasProcessing: this.processingState.isProcessing,
      hadCompleteSignal: this.signalState.completeSignal,
      hadStopSignal: this.signalState.stopSignal
    });
    
    this.processingState.isProcessing = false;
    this.signalState.currentInstructionId = undefined;
    this.processingState.shouldCompleteTask = false;
    this.processingState.taskCompletionMessage = undefined;
    this.resetSignalsAndInstructionId(); // Reset everything when stopping
  }

  // Force stop processing (used when user marks complete and wants to start new instruction)
  private forceStopProcessing(): void {
    logger.agent('Force stopping current processing due to user completion signal', {
      currentInstructionId: this.signalState.currentInstructionId,
      wasProcessing: this.processingState.isProcessing
    });
    this.processingState.isProcessing = false;
    this.signalState.currentInstructionId = undefined;
    this.processingState.shouldCompleteTask = false;
    this.processingState.taskCompletionMessage = undefined;
    this.resetSignalsAndInstructionId();
  }

  isCurrentlyProcessing(): boolean {
    return this.processingState.isProcessing;
  }

  wasInstructionProcessed(instructionId: string): boolean {
    return this.processingState.processedInstructions.has(instructionId);
  }

  // Task completion state
  setShouldCompleteTask(message?: string): void {
    this.processingState.shouldCompleteTask = true;
    this.processingState.taskCompletionMessage = message;
  }

  shouldCompleteTask(): boolean {
    return this.processingState.shouldCompleteTask;
  }

  getTaskCompletionMessage(): string | undefined {
    return this.processingState.taskCompletionMessage;
  }

  // Cleanup
  cleanupOldInstructions(): void {
    // Clean up processed instruction IDs after 5 minutes to prevent memory leaks
    const instructionsToCleanup = Array.from(this.processingState.processedInstructions);
    
    setTimeout(() => {
      instructionsToCleanup.forEach(id => {
        this.processingState.processedInstructions.delete(id);
      });
    }, 5 * 60 * 1000);
  }
} 