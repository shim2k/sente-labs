import { LLMService, LLMResponse } from './llm';
import { BrowserService, PageObservation, ElementDescriptor } from './browser';
import { Logger } from './logger';
import { PlanManager } from './planManager';

// Utility function for retrying operations on specific errors
async function retryOnError<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: Error) => boolean,
    delay: number = 1000
): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof Error && shouldRetry(error)) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return await operation();
        }
        throw error;
    }
}

export class AgentService {
    private llm: LLMService;
    private browser: BrowserService;
    private sendResponse: (type: string, payload: any) => void;
    private planner: PlanManager = new PlanManager();
    private isComplete: boolean = false;
    private isPausedForManualIntervention: boolean = false;
    private currentElementMap: Map<number, ElementDescriptor> = new Map();
    private logger: Logger;

    constructor(browser: BrowserService, sendResponse: (type: string, payload: any) => void, logger: Logger) {
        this.browser = browser;
        this.llm = new LLMService(logger);
        this.sendResponse = sendResponse;
        this.logger = logger;
    }

    async onInstruction(instruction: string): Promise<void> {
        this.planner.pushGoal(instruction);

        this.logger.info('agent', `New instruction added. Plan depth: ${this.planner.depth()}`);
        this.logger.info('agent', `Current goal: ${instruction}`);

        this.isComplete = false;

        // Start the main processing loop
        await this.runProcessingLoop();
    }

    private buildContext(originalInstruction: string, pageObs: PageObservation): string {
        const currentPlan = this.planner.current();
        if (!currentPlan) return originalInstruction;

        let context = '';

        // Show the sequence of instructions if we have multiple
        if (this.planner.depth() > 1) {
            context += `**Instruction Sequence:**\n`;
            this.planner.getStack().forEach((plan, index) => {
                const status = index === this.planner.depth() - 1 ? ' (CURRENT)' : ' (COMPLETED)';
                context += `${index + 1}. ${plan.goal}${status}\n`;
            });
            context += '\n';
        } else {
            context += `Task: ${originalInstruction}\n`;
        }

        context += `Current Goal: ${currentPlan.goal}\n`;

        const subLines = this.planner.activeSubGoals();
        if (subLines.length) {
            context += `Active Subgoals:\n`;
            subLines.forEach(l => context += `  - ${l}\n`);
        } else {
            context += `⚠️ No subgoals yet - Consider using 'branch' to plan your steps!\n`;
            context += `💡 If the goal is already achieved, use 'stop' with your final answer!\n`;
        }

        if (currentPlan.actions.length > 0) {
            context += `Recent Actions:\n`;
            currentPlan.actions.slice(-3).forEach(action => {
                context += `  - ${action}\n`;
            });
        }

        if (currentPlan.notes.length > 0) {
            context += `Notes: ${currentPlan.notes.join('; ')}\n`;
        }

        // Add timeout warnings
        const timeoutNotes = this.planner.checkTimeouts();
        if (timeoutNotes.length > 0) {
            context += `⚠️ Timeout Warnings:\n`;
            timeoutNotes.forEach(note => {
                context += `  - ${note}\n`;
            });
        }

        context += `\nPlan Depth: ${this.planner.depth()} goals, ${currentPlan.subGoals.length} subgoals (use 'branch' to add sub-goals, 'prune' to remove latest subgoal)\n`;

        // Add completion reminder when it seems like task might be done
        const hasRecentActions = currentPlan.actions.length > 0;
        const hasNoSubgoals = currentPlan.subGoals.length === 0;
        if (hasRecentActions && hasNoSubgoals) {
            context += `🎯 IMPORTANT: If you've successfully completed the goal "${currentPlan.goal}", call 'stop' with your final answer instead of continuing!\n`;
        }
        context += `\n`;

        // Include page observation
        context += `**Current Page:**\n${pageObs.content}\n`;
        context += `\nUse element IDs [number] for click actions (e.g., click with elementId: 1)`;

        return context;
    }

    // Method to resume agent processing after manual intervention
    async resumeAfterManualIntervention(): Promise<void> {
        if (this.isPausedForManualIntervention) {
            this.logger.info('agent', 'Resuming processing after manual intervention completion');
            this.isPausedForManualIntervention = false;

            this.planner.addAction('manual_intervention_complete()');
            this.planner.addNote('Manual intervention complete. User unblocked the issue.');

            // Continue processing if there are still goals and not complete
            if (!this.isComplete && this.planner.depth() > 0) {
                this.logger.info('agent', `Continuing with current goal: ${this.planner.current()?.goal}`);
                // Restart the processing loop
                await this.runProcessingLoop();
            } else {
                this.logger.info('agent', 'No goals remaining or task already complete');
            }
        } else {
            this.logger.warn('agent', 'Resume called but agent was not paused for manual intervention');
        }
    }

    // Shared processing loop used by both onInstruction and resumeAfterManualIntervention
    private async runProcessingLoop(): Promise<void> {
        while (!this.isComplete && this.planner.depth() > 0 && !this.isPausedForManualIntervention) {
            const currentPlan = this.planner.current();

            // Check if we should pop completed goals
            if (currentPlan?.completedAt) {
                this.logger.info('agent', `Goal "${currentPlan.goal}" completed, popping from stack`);
                this.planner.popCompletedGoal();
                
                // Continue with next goal if available
                const nextPlan = this.planner.current();
                if (nextPlan) {
                    this.logger.info('agent', `Continuing with goal: ${nextPlan.goal}`);
                    continue;
                } else {
                    this.logger.info('agent', 'All goals completed');
                    break;
                }
            }

            // Get current page observation (with navigation retry)
            const obsStart = Date.now();
            const pageObs = await retryOnError(
                () => this.browser.getPageObservation(),
                (error) => error.message.includes('Execution context was destroyed')
            );
            this.logger.debug('agent', `Page observation took ${Date.now() - obsStart}ms`);
            this.currentElementMap = pageObs.elementMap;

            // Use the current goal for context building
            const currentGoal = currentPlan?.goal || '';
            const context = this.buildContext(currentGoal, pageObs);

            this.logger.debug('agent', 'Context built', { context });
            const llmResponse: LLMResponse = await this.llm.getResponse([
                { role: 'user', content: context }
            ]);

            if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
                for (const toolCall of llmResponse.toolCalls) {
                    await this.toolActivation(toolCall.name, toolCall.arguments);
                    if (this.isComplete || this.isPausedForManualIntervention) break;
                }
            }

            if (llmResponse.content) {
                this.sendResponse('agent_response', {
                    response: llmResponse.content,
                    planDepth: this.planner.depth(),
                    currentGoal: currentPlan?.goal
                });
            }
        }

        // Log why the loop ended
        if (this.isPausedForManualIntervention) {
            this.logger.info('agent', 'Processing paused - waiting for manual intervention completion');
        } else if (this.isComplete) {
            this.logger.info('agent', 'Processing complete');
        } else if (this.planner.depth() === 0) {
            this.logger.info('agent', 'Processing stopped - no more goals');
        }
    }

    private async toolActivation(actionName: string, args: any): Promise<void> {
        try {
            switch (actionName) {
                case 'branch':
                    if (args.subgoals && Array.isArray(args.subgoals)) {
                        this.planner.updateSubGoals(args.subgoals);
                        this.planner.addAction(`branch([${args.subgoals.join(', ')}])`);
                    } else {
                        this.logger.warn('agent', 'Branch called without subgoals array');
                    }
                    break;

                case 'prune':
                    const currentPlan = this.planner.current();
                    if (currentPlan && currentPlan.subGoals.length > 0) {
                        this.planner.pruneSubGoal();
                        this.planner.addAction('prune()');
                    } else {
                        this.logger.warn('agent', `Cannot prune: no subgoals to remove from goal "${currentPlan?.goal}"`);
                    }
                    break;

                case 'complete_subgoal':
                    const current = this.planner.current();
                    if (current && current.subGoals.length > 0) {
                        const done = this.planner.completeSubGoal();
                        this.planner.addAction('complete_subgoal()');
                        if (done) this.logger.info('agent', 'All subgoals done');
                    } else {
                        this.logger.warn('agent', 'Cannot complete subgoal: no subgoals exist');
                    }
                    break;

                case 'note':
                    const note = args.message || args.content || '';
                    this.planner.addNote(note);
                    this.logger.info('agent', `Noted: ${note}`);
                    this.planner.addAction(`note(${note})`);
                    break;

                case 'manual_intervention':
                    const reason = args.reason || 'Manual intervention required';
                    const suggestion = args.suggestion || 'Please complete the required action in the browser';
                    const currentUrl = await this.browser.getPage()?.url() || 'Unknown URL';

                    this.logger.info('agent', `Manual intervention requested: ${reason}`);
                    this.logger.info('agent', `Suggestion: ${suggestion}`);
                    this.logger.info('agent', 'Pausing agent processing until intervention is complete');

                    // Pause the agent processing
                    this.isPausedForManualIntervention = true;

                    this.sendResponse('manual_intervention', {
                        reasoning: reason,
                        suggestion: suggestion,
                        currentUrl: currentUrl,
                        timestamp: Date.now()
                    });

                    this.planner.addAction(`manual_intervention("${reason}")`);
                    break;

                case 'stop':
                    this.isComplete = true;
                    const finalAnswer = args.answer || args.message || 'Task completed';
                    this.logger.info('agent', `Stopped: ${finalAnswer}`);
                    this.sendResponse('agent_complete', {
                        answer: finalAnswer,
                        planSummary: this.planner.getStack().map(p => ({ goal: p.goal, actions: p.actions }))
                    });
                    break;

                case 'click':
                    if (args.elementId && this.currentElementMap.has(args.elementId)) {
                        const elementDesc = this.currentElementMap.get(args.elementId)!;
                        const beforeUrl = await this.browser.getPage()?.url();
                        await this.browser.click(elementDesc.selector);

                        // Check if page changed after click
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for potential navigation
                        const afterUrl = await this.browser.getPage()?.url();
                        const pageChanged = beforeUrl !== afterUrl;

                        this.logger.info('agent', `Clicked element ${args.elementId}: ${elementDesc.name} (${elementDesc.selector})`);

                        if (pageChanged) {
                            this.planner.addAction(`click("${elementDesc.name}") → navigated to new page`);
                        } else {
                            this.planner.addAction(`click("${elementDesc.name}") → success`);
                        }
                    } else if (args.selector) {
                        await this.browser.click(args.selector);
                        this.logger.info('agent', `Clicked selector: ${args.selector}`);
                        this.planner.addAction(`click(${args.selector})`);
                    } else {
                        throw new Error('No valid elementId or selector provided for click');
                    }
                    break;

                case 'type':
                    if (args.elementId && this.currentElementMap.has(args.elementId)) {
                        const elementDesc = this.currentElementMap.get(args.elementId)!;
                        await this.browser.type(elementDesc.selector, args.text);
                        this.logger.info('agent', `Typed "${args.text}" into element ${args.elementId}: ${elementDesc.name} (${elementDesc.selector})`);
                        this.planner.addAction(`type("${elementDesc.name}", "${args.text}")`);
                    } else if (args.selector) {
                        await this.browser.type(args.selector, args.text);
                        this.logger.info('agent', `Typed "${args.text}" into selector: ${args.selector}`);
                        this.planner.addAction(`type(${args.selector}, "${args.text}")`);
                    } else {
                        throw new Error('No valid elementId or selector provided for type');
                    }
                    break;

                case 'enter':
                    await this.browser.enter();
                    this.logger.info('agent', 'Pressed Enter key');
                    this.planner.addAction('enter()');
                    break;

                case 'goto':
                    await this.browser.goto(args.url);
                    this.logger.info('agent', `Navigated to: ${args.url}`);
                    this.planner.addAction(`goto(${args.url})`);
                    break;

                case 'goBack':
                    await this.browser.goBack();
                    this.logger.info('agent', 'Went back');
                    this.planner.addAction('goBack()');
                    break;

                default:
                    this.logger.warn('agent', `Unknown action: ${actionName}`);
                    break;
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message?.slice(0, 200) : 'Unknown error';
            this.logger.error('agent', `Error executing ${actionName}`, error);
            this.planner.addAction(`error(${actionName}: ${errorMsg})`);
            this.sendResponse('agent_error', {
                action: actionName,
                error: errorMsg
            });
        }
    }
}
