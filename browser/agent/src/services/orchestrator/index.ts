import { BrowserService } from '../browser';
import { ReActAgent } from '../react-agent';
import { SessionService } from '../session';
import { Action, InstructionMessage, ResponseMessage, ManualInterventionRequest, IOrchestrator, BrowserContext } from '../../types';
import { logger } from '../../utils/logger';
import { ActionExecutor } from './action-executor';
import { StateManager } from './state-manager';
import { StructuredPrompt } from '../react-agent/prompt-builder';

export class OrchestratorService implements IOrchestrator {
  private browser: BrowserService;
  private reactAgent: ReActAgent;
  private session: SessionService;
  private actionExecutor: ActionExecutor;
  private stateManager: StateManager;

  constructor(browser: BrowserService, session: SessionService) {
    this.browser = browser;
    this.reactAgent = new ReActAgent();
    this.session = session;
    this.actionExecutor = new ActionExecutor(browser);
    this.stateManager = new StateManager();
    
    // Initialize file logging with session ID
    const sessionId = this.session.getState().id;
    logger.initializeFileLogging(sessionId);
    
    logger.info('🧠 ReAct framework enabled in orchestrator');
  }

  async processInstruction(instruction: InstructionMessage): Promise<ResponseMessage> {
    // Step 0: run clarification check
    const { clarifyInstruction } = await import('../../utils/clarifier');
    const historyTexts = this.session.getState().actionsHistory;
    try {
      const clarification = await clarifyInstruction(instruction.text, historyTexts);
      if (clarification.score < 5) {
        return {
          id: instruction.id,
          status: 'needs_clarification',
          clarificationRequest: {
            confidenceScore: clarification.score,
            reasoning: 'Low clarity score',
            message: `Your task is unclear (score ${clarification.score}/10). Please choose one of the suggestions or rephrase.`,
            suggestedQuestions: clarification.suggestions,
            timestamp: Date.now()
          }
        } as any;
      }
      // overwrite instruction text with improved version if better.
      instruction.text = clarification.improved;
    } catch (err) {
      // If clarifier fails, continue normally
    }

    const startTime = Date.now();
    
    // Log current state before attempting to start processing
    logger.agent('Attempting to process new instruction', {
      instructionId: instruction.id,
      text: instruction.text.substring(0, 100),
      currentlyProcessing: this.stateManager.isCurrentlyProcessing(),
      currentInstructionId: this.stateManager.getCurrentInstructionId(),
      isCompleteSignaled: this.stateManager.isCompleteSignaled(),
      isStopSignaled: this.stateManager.isStopSignaled()
    });
    
    // Check if already processing or instruction already processed
    if (!this.stateManager.startProcessing(instruction.id)) {
      const wasProcessed = this.stateManager.wasInstructionProcessed(instruction.id);
      const errorMessage = wasProcessed ? 'Instruction already processed' : 'Already processing an instruction';
      
      logger.agent('Rejecting instruction', {
        instructionId: instruction.id,
        reason: errorMessage,
        wasProcessed,
        currentlyProcessing: this.stateManager.isCurrentlyProcessing(),
        currentInstructionId: this.stateManager.getCurrentInstructionId()
      });
      
      return {
        id: instruction.id,
        status: 'error',
        error: errorMessage
      };
    }

    logger.agent('Instruction accepted for processing', {
      instructionId: instruction.id,
      text: instruction.text.substring(0, 100)
    });

    // Get current browser context for all responses
    let browserContext: BrowserContext;
    try {
      browserContext = await this.browser.getContext();
    } catch (error) {
      // Fallback context if browser is not available
      browserContext = {
        currentUrl: 'about:blank',
        pageTitle: '',
        viewport: { width: 1280, height: 720 }
      };
    }

    // Log instruction start with comprehensive context
    logger.instructionStart(instruction.id, instruction.text, {
      sessionId: this.session.getState().id,
      currentUrl: browserContext.currentUrl,
      actionHistoryLength: this.session.getState().actionsHistory.length
    });

    try {
      const result = await this.processWithReAct(instruction);

      // Get UPDATED browser context after instruction processing
      try {
        const updatedBrowserContext = await this.browser.getContext();
        result.currentUrl = updatedBrowserContext.currentUrl;
        result.pageTitle = updatedBrowserContext.pageTitle;
      } catch (error) {
        // Fallback to old context if we can't get updated context
        result.currentUrl = browserContext.currentUrl;
        result.pageTitle = browserContext.pageTitle;
      }

      // Calculate performance metrics
      const duration = Date.now() - startTime;
      const metrics = {
        duration,
        framework: 'ReAct',
        status: result.status,
        actionsExecuted: result.executed?.length || 0,
        memoryUsage: process.memoryUsage()
      };

      // Log instruction completion
      logger.instructionComplete(instruction.id, result, metrics);
      
      // Log performance metrics
      logger.performanceMetrics({
        instructionId: instruction.id,
        ...metrics
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorResult: ResponseMessage = {
        id: instruction.id,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        currentUrl: browserContext.currentUrl,
        pageTitle: browserContext.pageTitle
      };

      logger.instructionComplete(instruction.id, errorResult, {
        duration,
        framework: 'ReAct',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return errorResult;
    } finally {
      this.stateManager.stopProcessing();
      this.stateManager.cleanupOldInstructions();
      
      // Flush logs to ensure they're written
      logger.flushLogs();
    }
  }

  private async processWithReAct(instruction: InstructionMessage): Promise<ResponseMessage> {
    logger.agent(`Processing instruction with ReAct: ${instruction.text}`);
    
    let currentSteps: any[] = [];
    let isComplete = false;
    let requiresManualIntervention = false;
    let finalAnswer: string | undefined;
    let manualInterventionReason: string | undefined;
    let executedActions: string[] = [];

    // Main ReAct loop
    while (!isComplete && !requiresManualIntervention && 
           !this.stateManager.isStopSignaled() && 
           !this.stateManager.isCompleteSignaled()) {
      
      try {
        // Check for stop signal
        if (this.stateManager.isStopSignaled()) {
          logger.agent('🛑 Stop signal received, terminating ReAct processing');
          return {
            id: instruction.id,
            status: 'error',
            error: 'Instruction stopped by user',
            executed: executedActions
          };
        }

        // Check for complete signal
        if (this.stateManager.isCompleteSignaled()) {
          logger.agent('✅ Complete signal received, marking task as successful');
          return {
            id: instruction.id,
            status: 'success',
            executed: executedActions,
            actions: this.extractActions(currentSteps)
          };
        }

        // Get DOM content and context
        const { context, structuredPrompt } = await this.getDOMContentAndContext(instruction.text, currentSteps);
        const actionHistory = this.session.getState().actionsHistory;

        // PERFORMANCE: Use LLM classification to determine if screenshot is needed
        // Much more accurate than string parsing and handles edge cases better
        let screenshotBuffer: Buffer | undefined;
        let instructionClassification = undefined;
        
        // Extract classification from previous steps if available
        const existingClassification = this.extractClassificationFromSteps(currentSteps);
        
        // Determine if screenshot is needed
        const needsScreenshot = this.shouldTakeScreenshotBasedOnClassification(
          instruction.text, 
          currentSteps, 
          context, 
          existingClassification
        );
        
        if (needsScreenshot) {
          try {
            const screenshotStart = Date.now();
            screenshotBuffer = await this.browser.screenshot();
            const screenshotTime = Date.now() - screenshotStart;
            
            if (screenshotTime > 1000) {
              logger.agent('⚠️ Slow screenshot capture detected', { duration: screenshotTime });
            }
          } catch (error) {
            logger.error('Failed to take screenshot', error);
          }
        } else {
          logger.agent('Skipping screenshot based on LLM classification or step analysis');
        }

        logger.agent('ReAct processing', {
          stepCount: currentSteps.length,
          hasScreenshot: !!screenshotBuffer,
          screenshotSize: screenshotBuffer?.length || 0
        });

        // PERFORMANCE: Add timing metrics
        const reactStart = Date.now();

        // Process next ReAct step with structured prompt
        const reactResponse = await this.reactAgent.processInstructionWithStructuredPrompt(
          structuredPrompt,
          context,
          currentSteps,
          actionHistory,
          screenshotBuffer
        );

        const reactTime = Date.now() - reactStart;
        if (reactTime > 10000) {
          logger.agent('⚠️ Slow ReAct processing detected', { 
            duration: reactTime,
            stepCount: currentSteps.length 
          });
        }

        currentSteps = reactResponse.steps;
        isComplete = reactResponse.isComplete;
        requiresManualIntervention = reactResponse.requiresManualIntervention;
        finalAnswer = reactResponse.finalAnswer;
        manualInterventionReason = reactResponse.manualInterventionReason;
        
        // Store the instruction classification for performance insights
        if (reactResponse.instructionClassification) {
          instructionClassification = reactResponse.instructionClassification;
          logger.agent('Instruction classified', {
            type: instructionClassification.type,
            complexity: instructionClassification.complexity,
            needsScreenshot: instructionClassification.needsScreenshot,
            estimatedSteps: instructionClassification.estimatedSteps,
            reason: instructionClassification.reason
          });
        }

        // Check if ReAct service detected an issue and wants to stop
        if (requiresManualIntervention) {
          logger.agent('ReAct service detected issue, stopping loop', { 
            reason: manualInterventionReason,
            steps: currentSteps.length
          });
          break;
        }

        // Handle the latest step
        const latestStep = currentSteps[currentSteps.length - 1];
        
        // Check if the agent signaled completion
        if (latestStep?.type === 'complete') {
          logger.agent('Agent signaled task completion', { 
            content: latestStep.content,
            finalAnswer: finalAnswer || latestStep.content
          });
          isComplete = true;
          finalAnswer = finalAnswer || latestStep.content;
          break;
        }
        
        // Execute action if this was an action step
        if (latestStep?.type === 'action' && latestStep.actionData && !isComplete) {
          const executionResult = await this.actionExecutor.executeAction(latestStep.actionData);
          
          if (executionResult.success) {
            // Track executed actions
            executedActions.push(latestStep.actionData.description);
            this.session.addAction(latestStep.actionData.description);
            
            // Add success observation for ReAct conversation flow
            const successObservation = {
              type: 'observation',
              content: executionResult.observation || `Successfully executed: ${latestStep.actionData.description}`,
              timestamp: Date.now()
            };
            currentSteps.push(successObservation);
            
            // CRITICAL: Check for manual intervention after navigation actions
            // Navigation completed successfully - let LLM continue reasoning
            // The LLM will analyze the new page content and use appropriate tools:
            // - 'complete' tool when the task is done
            // - 'manualIntervention' tool if human action is needed 
            // - continue with more actions if needed
            if (latestStep.actionData.type === 'navigate' && executionResult.metadata?.changeDetection?.urlChanged) {
              logger.agent('Navigation completed, LLM will analyze new page content in next cycle');
            }
            
            // Check if the action execution detected task completion (only for click actions now)
            if (executionResult.metadata?.changeDetection) {
              const completionCheck = await this.actionExecutor.checkForTaskCompletion(
                executionResult.metadata.changeDetection,
                latestStep.actionData
              );
              
              if (completionCheck.shouldComplete) {
                isComplete = true;
                finalAnswer = completionCheck.reason || `Successfully completed: ${instruction.text}`;
                break;
              }
            }
            
          } else {
            // Handle action execution error
            await this.handleActionError(latestStep.actionData, executionResult.error!, currentSteps);
          }
        }

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        logger.error('Error in ReAct cycle', error);
        requiresManualIntervention = true;
        manualInterventionReason = `ReAct process encountered error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        break;
      }
    }

    return this.buildFinalResponse(
      instruction.id,
      isComplete,
      requiresManualIntervention,
      finalAnswer,
      manualInterventionReason,
      executedActions,
      currentSteps
    );
  }

  private async getDOMContentAndContext(
    instruction: string,
    currentSteps: any[],
    screenshotBuffer?: Buffer
  ): Promise<{ context: BrowserContext; structuredPrompt: StructuredPrompt }> {
    try {
      logger.agent('Getting DOM context for instruction processing');
      
      // Calculate appropriate token budget based on LLM model context size
      const { calculateDOMTokenBudget } = await import('../../utils/config');
      const domTokenBudget = calculateDOMTokenBudget();
      
      logger.agent('Using token budget for DOM extraction', { domTokenBudget });
      
      const domContent = await this.browser.getDOMContent(domTokenBudget);
      
      // Get basic browser context
      const browserContext = await this.browser.getContext();
      const context: BrowserContext = {
        currentUrl: browserContext.currentUrl || 'unknown',
        pageTitle: browserContext.pageTitle || 'unknown',
        viewport: browserContext.viewport || { width: 1280, height: 720 }
      };

      // Create structured prompt in orchestrator (centralizing DOM content handling)
      const structuredPrompt: StructuredPrompt = {
        instruction,
        domContent, // Keep DOM content separate
        screenshotAnalysis: screenshotBuffer ? 'Screenshot analysis will be provided' : undefined,
        previousSteps: currentSteps.slice(-3), // Keep last 3 steps for context
        metadata: {
          hasVisualContext: !!screenshotBuffer,
          hasRecentSteps: currentSteps.length > 0,
          stepCount: currentSteps.length,
          domTokens: Math.ceil(domContent.length / 4)
        }
      };

      return { context, structuredPrompt };
    } catch (contextError) {
      logger.error('Failed to get browser context', contextError);
      
      // Provide absolute fallback
      const fallbackContext: BrowserContext = {
        currentUrl: 'about:blank',
        pageTitle: 'Browser Error',
        viewport: { width: 1280, height: 720 }
      };
      
      const fallbackStructuredPrompt: StructuredPrompt = {
        instruction,
        domContent: '<html><body><h1>Browser Error</h1><p>Browser context unavailable</p></body></html>',
        screenshotAnalysis: undefined,
        previousSteps: currentSteps.slice(-3),
        metadata: {
          hasVisualContext: false,
          hasRecentSteps: currentSteps.length > 0,
          stepCount: currentSteps.length,
          domTokens: 50 // Rough estimate for fallback content
        }
      };
      
      return { context: fallbackContext, structuredPrompt: fallbackStructuredPrompt };
    }
  }

  private async handleActionError(action: Action, errorMessage: string, currentSteps: any[]): Promise<void> {
    // Check if this is a selector-based click failure that should not break the ReAct cycle
    const isSelectorFailure = action.type === 'click' && 
      (errorMessage.includes('outside of the viewport') || 
       errorMessage.includes('not stable') ||
       errorMessage.includes('selector failed') ||
       errorMessage.includes('timeout') ||
       errorMessage.includes('Timeout') ||
       errorMessage.includes('Elements found but not clickable'));
    
    logger.error('Action execution failed', {
      action,
      error: errorMessage,
      isSelectorFailure
    });
    
    // Add error observation for ReAct conversation flow
    const errorObservation = {
      type: 'observation',
      content: isSelectorFailure ? 
        `Click action failed: ${errorMessage}. Elements found but not clickable (outside viewport or not stable). Recommendation: Try scrolling first, then use clickByPosition with screenshot analysis.` :
        `Action failed: ${errorMessage}`,
      timestamp: Date.now()
    };
    currentSteps.push(errorObservation);
    
    // For selector failures, don't throw - let ReAct continue and try clickByPosition
    if (!isSelectorFailure) {
      // For real system errors, throw to break the cycle
      throw new Error(errorMessage);
    }
  }

  private buildFinalResponse(
    instructionId: string,
    isComplete: boolean,
    requiresManualIntervention: boolean,
    finalAnswer: string | undefined,
    manualInterventionReason: string | undefined,
    executedActions: string[],
    currentSteps: any[]
  ): ResponseMessage {
    // Handle stop signal
    if (this.stateManager.isStopSignaled()) {
      logger.agent('ReAct processing stopped by user signal');
      return {
        id: instructionId,
        status: 'error',
        error: 'Instruction stopped by user',
        executed: executedActions
      };
    }

    // Handle complete signal
    if (this.stateManager.isCompleteSignaled()) {
      logger.agent('ReAct processing completed by user signal');
      return {
        id: instructionId,
        status: 'success',
        executed: executedActions,
        actions: this.extractActions(currentSteps)
      };
    }

    if (requiresManualIntervention) {
      const manualIntervention: ManualInterventionRequest = {
        reason: manualInterventionReason || 'Manual action required based on ReAct analysis',
        suggestion: this.generateManualInterventionSuggestion(manualInterventionReason),
        timestamp: Date.now()
      };

      logger.agent('ReAct analysis indicates manual intervention needed', manualIntervention);
      this.browser.enableManualInterventionMode();

      return {
        id: instructionId,
        status: 'manual_intervention_required',
        manualInterventionRequest: manualIntervention,
        executed: executedActions
      };
    }

    if (isComplete && finalAnswer) {
      logger.agent('ReAct process completed successfully', { 
        steps: currentSteps.length,
        finalAnswer,
        completionMethod: currentSteps.some(step => step.type === 'complete') ? 'agent_signaled' : 'automatic'
      });

      return {
        id: instructionId,
        status: 'success',
        executed: executedActions,
        actions: this.extractActions(currentSteps)
      };
    }

    // If not complete and no manual intervention, something went wrong
    return {
      id: instructionId,
      status: 'error',
      error: 'ReAct process did not complete successfully',
      executed: executedActions
    };
  }

  private extractActions(steps: any[]): Action[] {
    return steps.filter(step => step.type === 'action' && step.actionData)
                .map(step => step.actionData);
  }

  // Public interface methods
  isCurrentlyProcessing(): boolean {
    return this.stateManager.isCurrentlyProcessing();
  }

  stopCurrentInstruction(instructionId?: string): void {
    this.stateManager.setStopSignal(instructionId);
  }

  markCurrentInstructionComplete(instructionId?: string): void {
    this.stateManager.setCompleteSignal(instructionId);
  }

  getCurrentInstructionId(): string | undefined {
    return this.stateManager.getCurrentInstructionId();
  }

  private extractClassificationFromSteps(steps: any[]): any {
    // Find the classification step (should be first step with classificationData)
    const classificationStep = steps.find((step: any) => step.classificationData);
    return classificationStep?.classificationData;
  }

  private shouldTakeScreenshotBasedOnClassification(
    instruction: string, 
    currentSteps: any[], 
    _context: BrowserContext,
    classification?: any
  ): boolean {
    // Check for consecutive failures - if 2+ failures in a row, force screenshot
    const consecutiveFailures = this.countConsecutiveFailures(currentSteps);
    if (consecutiveFailures >= 2) {
      logger.agent('🔥 Forcing screenshot due to consecutive failures', { 
        consecutiveFailures,
        overridingClassification: classification?.needsScreenshot === false 
      });
      return true;
    }
    
    // Always take screenshot after any failed action for immediate feedback
    if (currentSteps.some(step => step.type === 'observation' && step.content.includes('failed'))) {
      logger.agent('Taking screenshot due to recent failure');
      return true;
    }
    
    // If we have LLM classification, use it (unless overridden above)
    if (classification?.needsScreenshot !== undefined) {
      logger.agent('Using LLM classification for screenshot decision', {
        type: classification.type,
        needsScreenshot: classification.needsScreenshot,
        reason: classification.reason
      });
      return classification.needsScreenshot;
    }
    
    // Fallback: Use heuristic for first step before classification is available
    if (currentSteps.length === 0) {
      const instructionLower = instruction.toLowerCase();
      // Skip screenshot for simple navigation tasks
      if (instructionLower.match(/^(go to|visit|open|navigate to|browse to)\s+/)) {
        logger.agent('Using heuristic: skipping screenshot for simple navigation');
        return false;
      }
    }
    
    // Default to taking screenshot for complex tasks
    return true;
  }

  private countConsecutiveFailures(steps: any[]): number {
    let consecutiveFailures = 0;
    
    // Look at the most recent steps, working backwards
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      
      // If this is a failure observation, increment counter
      if (step.type === 'observation' && 
          (step.content.includes('failed') || 
           step.content.includes('error') || 
           step.content.includes('timeout') ||
           step.content.includes('Timeout') ||
           step.content.includes('not clickable') ||
           step.content.includes('selector failed'))) {
        consecutiveFailures++;
      } 
      // If this is a successful observation or action, break the failure streak
      else if (step.type === 'observation' && 
               (step.content.includes('Successfully') || 
                step.content.includes('success') ||
                step.content.includes('completed'))) {
        break;
      }
      // Skip thoughts and classification steps, continue counting
      else if (step.type === 'action') {
        // An action step without a following failure observation means it likely succeeded
        // But we need to check if the next step (chronologically) is a failure
        break;
      }
    }
    
    return consecutiveFailures;
  }

  private generateManualInterventionSuggestion(reason: string | undefined): string {
    if (!reason) {
      return 'Please review the current page and take any necessary manual actions, then click "Mark as Done" to continue.';
    }

    const reasonLower = reason.toLowerCase();

    // Login/Authentication scenarios
    if (reasonLower.includes('login') || reasonLower.includes('authentication') || reasonLower.includes('sign in')) {
      return 'Please log in to your account using your credentials, then click "Mark as Done" to continue with the task.';
    }

    // CAPTCHA scenarios  
    if (reasonLower.includes('captcha') || reasonLower.includes('verification') || reasonLower.includes('robot')) {
      return 'Please complete the CAPTCHA verification challenge, then click "Mark as Done" to continue.';
    }

    // Cookie consent scenarios
    if (reasonLower.includes('cookie') || reasonLower.includes('gdpr')) {
      return 'Please accept or decline the cookie consent banner as preferred, then click "Mark as Done" to continue.';
    }

    // Two-factor authentication scenarios
    if (reasonLower.includes('two-factor') || reasonLower.includes('2fa') || reasonLower.includes('verification code')) {
      return 'Please enter the verification code from your authenticator app or SMS, then click "Mark as Done" to continue.';
    }

    // Age verification scenarios
    if (reasonLower.includes('age') || reasonLower.includes('date of birth')) {
      return 'Please complete the age verification form, then click "Mark as Done" to continue.';
    }

    // Error scenarios
    if (reasonLower.includes('error') || reasonLower.includes('failed') || reasonLower.includes('timeout')) {
      return 'An error occurred during automated processing. Please review the page, resolve any issues manually, then click "Mark as Done" to continue.';
    }

    // Timeout/stalled scenarios
    if (reasonLower.includes('timeout') || reasonLower.includes('stalled') || reasonLower.includes('stuck')) {
      return 'The automated process encountered difficulties. Please complete the task manually and click "Mark as Done" when finished.';
    }

    // Generic fallback
    return `Manual action is required: ${reason}. Please complete the necessary steps and click "Mark as Done" to continue.`;
  }
} 