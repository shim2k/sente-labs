import OpenAI from 'openai';
import { BrowserContext } from '../../types';
import { logger } from '../../utils/logger';
import { config } from '../../utils/config';
import { withRetry } from '../../utils/withRetry';
import { ReActStep, ReActResponse, ProcessingOptions, InstructionClassification } from './types';
import { tools } from './validation';
import { StepParser } from './step-parser';
import { ScreenshotAnalyzer } from './screenshot-analyzer';
import { PromptBuilder, StructuredPrompt } from './prompt-builder';

export class ReActAgent {
  private openai: OpenAI;
  private stepParser: StepParser;
  private screenshotAnalyzer: ScreenshotAnalyzer;
  private promptBuilder: PromptBuilder;
  private options: ProcessingOptions;

  constructor(options?: Partial<ProcessingOptions>) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    });

    this.stepParser = new StepParser();
    this.screenshotAnalyzer = new ScreenshotAnalyzer(this.openai);
    this.promptBuilder = new PromptBuilder();

    this.options = {
      maxSteps: 15,
      enableVisualAnalysis: true,
      screenshotAnalysisTimeout: 30000,
      ...options
    };
  }

  async processInstructionWithReAct(
    instruction: string,
    context: BrowserContext,
    domContent: string,
    previousSteps: ReActStep[] = [],
    actionHistory: string[] = [],
    screenshotBuffer?: Buffer
  ): Promise<ReActResponse> {
    // Convert legacy call to structured prompt approach
    const structuredPrompt: StructuredPrompt = {
      instruction,
      domContent,
      screenshotAnalysis: undefined, // Will be set by screenshot analysis if available
      previousSteps: previousSteps.slice(-3),
      metadata: {
        hasVisualContext: !!screenshotBuffer,
        hasRecentSteps: previousSteps.length > 0,
        stepCount: previousSteps.length,
        domTokens: Math.ceil(domContent.length / 4)
      }
    };

    // Delegate to new structured method
    return this.processInstructionWithStructuredPrompt(
      structuredPrompt,
      context,
      previousSteps,
      actionHistory,
      screenshotBuffer
    );
  }

  async processActionResult(
    instruction: string,
    context: BrowserContext,
    domContent: string,
    previousSteps: ReActStep[],
    actionResult: { success: boolean; error?: string; observation?: string },
    actionHistory: string[],
    screenshotBuffer?: Buffer
  ): Promise<ReActResponse> {
    // Add observation step
    const observationStep: ReActStep = {
      type: 'observation',
      content: actionResult.success
        ? (actionResult.observation || 'Action completed successfully')
        : `Action failed: ${actionResult.error || 'Unknown error'}`,
      timestamp: Date.now()
    };

    const stepsWithObservation = [...previousSteps, observationStep];

    // Continue reasoning
    return this.processInstructionWithReAct(
      instruction,
      context,
      domContent,
      stepsWithObservation,
      actionHistory,
      screenshotBuffer
    );
  }

  private isStalled(steps: ReActStep[]): boolean {
    if (steps.length < 6) return false;

    // Check for repetitive classification patterns in step content
    const recentSteps = steps.slice(-6);
    const classificationSteps = recentSteps.filter(step => 
      step.content?.toLowerCase().includes('classif') ||
      step.content?.toLowerCase().includes('instruction type') ||
      step.content?.toLowerCase().includes('analyzing the instruction')
    );
    
    if (classificationSteps.length >= 3) {
      logger.agent('Detected repetitive classification pattern', { 
        recentStepsCount: recentSteps.length,
        classificationCount: classificationSteps.length,
        classificationContent: classificationSteps.map(s => s.content?.substring(0, 100))
      });
      return true;
    }

    // Check for repeated action types
    const recentActions = steps
      .filter(step => step.type === 'action' && step.actionData)
      .slice(-4);
    
    if (recentActions.length >= 3) {
      const actionTypes = recentActions.map(action => action.actionData?.type);
      const actionCounts = actionTypes.reduce((counts, type) => {
        if (type) counts[type] = (counts[type] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);
      
      const maxRepeatedAction = Math.max(...Object.values(actionCounts));
      if (maxRepeatedAction >= 3) {
        logger.agent('Detected repetitive action pattern', { 
          actionTypes,
          actionCounts,
          maxRepeated: maxRepeatedAction
        });
        return true;
      }

      // Check for repetitive scrolling actions specifically
      const scrollActions = recentActions.filter(action => 
        action.content?.toLowerCase().includes('scroll') ||
        action.actionData?.type === 'scroll'
      );
      
      if (scrollActions.length === recentActions.length) {
        logger.agent('Detected repetitive scrolling pattern', { 
          recentActions: recentActions.map(a => a.content),
          scrollCount: scrollActions.length
        });
        return true;
      }
    }

    // Check for repeated thoughts
    const recentThoughts = steps.slice(-4).filter(s => s.type === 'thought');
    if (recentThoughts.length >= 3) {
      // Check for repetitive thinking pattern
      const firstThought = recentThoughts[0].content.toLowerCase();
      const similarThoughts = recentThoughts.slice(1).filter(thought =>
        this.similarity(thought.content.toLowerCase(), firstThought) > 0.8
      );
      
      if (similarThoughts.length >= 2) {
        logger.agent('Detected repetitive thinking pattern', { 
          originalThought: firstThought.substring(0, 100),
          similarCount: similarThoughts.length
        });
        return true;
      }
    }

    // Check for lack of progress (no successful actions in recent steps)
    const recentSuccessfulActions = steps.slice(-8).filter(step => 
      step.type === 'observation' && 
      step.content?.toLowerCase().includes('success')
    );
    
    if (steps.length >= 8 && recentSuccessfulActions.length === 0) {
      logger.agent('Detected lack of progress - no successful actions recently', { 
        totalSteps: steps.length,
        recentSuccessfulActions: recentSuccessfulActions.length
      });
      return true;
    }

    return false;
  }

  private similarity(a: string, b: string): number {
    const words1 = new Set(a.split(' '));
    const words2 = new Set(b.split(' '));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  private isSimpleNavigationComplete(instruction: string, steps: ReActStep[], context: BrowserContext): boolean {
    // Only auto-complete in very clear cases where the LLM has explicitly signaled completion
    // or where we can detect successful navigation through action/observation patterns
    
    // Check if there's a recent successful navigation action followed by a success observation
    const recentSteps = steps.slice(-5); // Look at last 5 steps
    
    const hasSuccessfulNavigation = recentSteps.some((step, index) => {
      if (step.type === 'action' && 
          (step.actionData?.type === 'navigate' || 
           step.actionData?.type === 'click' ||
           step.content?.toLowerCase().includes('navigat'))) {
        
        // Check if followed by success observation
        const nextSteps = recentSteps.slice(index + 1);
        return nextSteps.some(nextStep => 
          nextStep.type === 'observation' && 
          nextStep.content?.toLowerCase().includes('success')
        );
      }
      return false;
    });
    
    // Only auto-complete if there was a clear successful action and no recent failures
    if (hasSuccessfulNavigation) {
      const hasRecentFailure = recentSteps.some(step => 
        step.type === 'observation' && 
        (step.content?.toLowerCase().includes('failed') || 
         step.content?.toLowerCase().includes('error'))
      );
      
      if (!hasRecentFailure) {
        logger.agent('Auto-completing: Detected successful navigation without recent failures');
        return true;
      }
    }
    
    return false;
  }

  private extractInstructionClassification(steps: ReActStep[]): InstructionClassification | undefined {
    // Find the classification step (should be first step with classificationData)
    const classificationStep = steps.find(step => step.classificationData);
    return classificationStep?.classificationData;
  }

  private endWithManualIntervention(steps: ReActStep[], reason: string): ReActResponse {
    return {
      steps,
      requiresManualIntervention: true,
      manualInterventionReason: reason,
      isComplete: false
    };
  }

  async processInstructionWithStructuredPrompt(
    structuredPrompt: StructuredPrompt,
    context: BrowserContext,
    previousSteps: ReActStep[] = [],
    actionHistory: string[] = [],
    screenshotBuffer?: Buffer
  ): Promise<ReActResponse> {
    logger.agent('Starting ReAct processing with structured prompt', {
      instruction: structuredPrompt.instruction,
      currentStep: previousSteps.length,
      maxSteps: this.options.maxSteps,
      hasScreenshot: !!screenshotBuffer,
      domTokens: structuredPrompt.metadata.domTokens
    });

    // Check limits
    if (previousSteps.length >= this.options.maxSteps) {
      return this.endWithManualIntervention(previousSteps, 'Maximum reasoning steps reached');
    }

    if (this.isStalled(previousSteps)) {
      return this.endWithManualIntervention(previousSteps, 'Agent appears stuck in reasoning loop');
    }

    // Extract instruction classification from LLM response if available
    const instructionClassification = this.extractInstructionClassification(previousSteps);
    
    // Check if simple navigation task is complete
    if (this.isSimpleNavigationComplete(structuredPrompt.instruction, previousSteps, context)) {
      return {
        steps: previousSteps,
        isComplete: true,
        requiresManualIntervention: false,
        finalAnswer: `Successfully completed: ${structuredPrompt.instruction}`,
        instructionClassification
      };
    }

    // Get screenshot analysis if available
    let screenshotAnalysis = '';
    if (screenshotBuffer && this.options.enableVisualAnalysis) {
      logger.agent('Analyzing screenshot for visual guidance', {
        screenshotSize: screenshotBuffer.length,
        stepCount: previousSteps.length,
        viewport: context.viewport
      });
      const analysisResult = await this.screenshotAnalyzer.analyzeScreenshot(
        structuredPrompt.instruction,
        screenshotBuffer,
        { ...(context.viewport as any), dpr: context.dpr || 1 } as any
      );
      screenshotAnalysis = analysisResult.content;
      
      // Update structured prompt with screenshot analysis
      structuredPrompt.screenshotAnalysis = screenshotAnalysis;
      
      logger.agent('Screenshot analysis completed', {
        analysisLength: analysisResult.length,
        hasCoordinates: analysisResult.hasCoordinates,
        viewport: context.viewport
      });
    }

    // Update structured prompt with current steps
    structuredPrompt.previousSteps = previousSteps.slice(-3);
    structuredPrompt.metadata.stepCount = previousSteps.length;
    structuredPrompt.metadata.hasRecentSteps = previousSteps.length > 0;
    
    // Build prompts
    const systemPrompt = this.promptBuilder.buildSystemPrompt(context, actionHistory);
    
    try {
      const llmPayload = {
        model: config.llmModel,
        temperature: config.llmTemperature,
        max_tokens: config.maxLlmTokens,
        tools: [...tools], // Convert readonly array to mutable array
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: structuredPrompt } // Pass structured prompt directly
        ],
        tool_choice: 'auto' as const
      };

      logger.llmRequest(llmPayload, {
        instruction: structuredPrompt.instruction.substring(0, 100),
        stepCount: previousSteps.length,
        hasScreenshot: !!screenshotBuffer
      });

      // Convert to string only for the actual LLM call
      const llmPayloadForAPI = {
        ...llmPayload,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: this.promptBuilder.convertToString(structuredPrompt) }
        ]
      };

      const response = await withRetry(() => this.openai.chat.completions.create(llmPayloadForAPI), {
        retries: 2,
        timeout: 30000
      }) as OpenAI.Chat.Completions.ChatCompletion;

      logger.llmResponse(response, {
        instruction: structuredPrompt.instruction.substring(0, 100),
        stepCount: previousSteps.length,
        toolCallName: response.choices[0].message.tool_calls?.[0]?.function.name
      });

      const toolCall = response.choices[0].message.tool_calls?.[0];
      if (!toolCall) {
        throw new Error('LLM returned no tool call');
      }

      const step = this.stepParser.parseToolCall(toolCall);
      const updatedSteps = [...previousSteps, step];
      const isComplete = step.type === 'complete';
      const requiresManualIntervention = step.type === 'manualIntervention';

      // Handle manual intervention request from LLM
      if (requiresManualIntervention) {
        return {
          steps: updatedSteps,
          requiresManualIntervention: true,
          manualInterventionReason: `${step.category}: ${step.content}`,
          isComplete: false
        };
      }

      return {
        steps: updatedSteps,
        finalAnswer: step.type === 'complete' ? (step as any).finalAnswer : undefined,
        requiresManualIntervention: false,
        isComplete,
        nextAction: step.type === 'action' ? step.actionData : undefined,
        instructionClassification
      };

    } catch (error) {
      logger.error('ReAct processing failed', error);
      return this.endWithManualIntervention(previousSteps, `Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 