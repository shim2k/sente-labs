import { LLMService, LLMResponse } from './llm';
import { BrowserService, PageObservation, ElementDescriptor } from './browser';
import { Planner, PlanContext } from './planner';

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
    private planner: Planner;
    private isComplete: boolean = false;
    private isPausedForManualIntervention: boolean = false;
    private currentElementMap: Map<number, ElementDescriptor> = new Map();
    private loopIteration: number = 0;

    constructor(browser: BrowserService, sendResponse: (type: string, payload: any) => void) {
        this.browser = browser;
        this.llm = new LLMService();
        this.sendResponse = sendResponse;
        this.planner = new Planner();
    }

    async onInstruction(instruction: string): Promise<void> {
        // Always add the new instruction as a new goal to build upon previous context
        this.planner.addGoal(instruction);

        console.log(`[AGENT] New instruction added. Plan depth: ${this.planner.getPlanDepth()}`);
        console.log(`[AGENT] Current goal: ${instruction}`);

        this.isComplete = false;
        this.loopIteration = 0; // Reset loop counter for new instruction

        // Start the main processing loop
        await this.runProcessingLoop();
    }

    private buildContext(originalInstruction: string, pageObs: PageObservation): string {
        const currentPlan = this.planner.getCurrentPlan();
        if (!currentPlan) return originalInstruction;

        const allPlans = this.planner.getAllPlans();
        const planDepth = this.planner.getPlanDepth();
        const subgoals = this.planner.getSubgoals();
        const hasSubgoals = this.planner.hasSubgoals();
        const recentActions = this.planner.getRecentActions();
        const notes = this.planner.getCurrentNotes();

        let context = '';

        // Show the sequence of instructions if we have multiple
        if (planDepth > 1) {
            context += `**Instruction Sequence:**\n`;
            allPlans.forEach((plan, index) => {
                const status = index === planDepth - 1 ? ' (CURRENT)' : ' (COMPLETED)';
                context += `${index + 1}. ${plan.goal}${status}\n`;
            });
            context += '\n';
        } else {
            context += `Task: ${originalInstruction}\n`;
        }

        context += `Current Goal: ${currentPlan.goal}\n`;

        if (hasSubgoals) {
            context += `Active Subgoals:\n`;
            subgoals.forEach((subgoal) => {
                let statusLabel = '';
                if (subgoal.status === 'completed') {
                    statusLabel = ' (COMPLETED)';
                } else if (subgoal.status === 'current') {
                    statusLabel = ' (CURRENT)';
                } else {
                    statusLabel = ' (PENDING)';
                }
                context += `  - ${subgoal.description}${statusLabel}\n`;
            });
        } else {
            context += `⚠️ No subgoals yet - Consider using 'branch' to plan your steps!\n`;
            context += `💡 If the goal is already achieved, use 'stop' with your final answer!\n`;
        }

        if (recentActions.length > 0) {
            context += `Recent Actions:\n`;
            recentActions.forEach(action => {
                context += `  - ${action}\n`;
            });
        }

        if (notes.length > 0) {
            context += `Recent Notes:\n`;
            notes.forEach(note => {
                context += `  - ${note}\n`;
            });
        }

        context += `\nPlan Depth: ${planDepth} goals, ${subgoals.length} subgoals (use 'branch' once per plan to add sub-goals)\n`;
        context += `Current Iteration ID: ${this.loopIteration}\n`;

        // Add completion reminder when it seems like task might be done
        const hasRecentActions = recentActions.length > 0;
        const hasNoSubgoals = !hasSubgoals;
        if (hasRecentActions && hasNoSubgoals) {
            context += `🎯 IMPORTANT: If you've successfully completed the goal "${currentPlan.goal}", call 'stop' with your final answer instead of continuing!\n`;
        }
        context += `\n`;

        // Include page observation
        context += `**Current Page:**\n${pageObs.content}\n`;
        context += `\nUse element IDs [number] for click actions (e.g., click with elementId: 1)`;
        context += `\nUse the current iteration ID to track actions (e.g., [Loop ID:${this.loopIteration}] click(1))`;

        return context;
    }

    // Helper method to add actions with iteration ID prefix
    private addActionWithIteration(action: string): void {
        this.planner.addAction(`[Loop ID:${this.loopIteration}] ${action}`);
    }

    // Method to resume agent processing after manual intervention
    async resumeAfterManualIntervention(): Promise<void> {
        if (this.isPausedForManualIntervention) {
            console.log(`[AGENT] Resuming processing after manual intervention completion`);
            this.isPausedForManualIntervention = false;

            this.addActionWithIteration('manual_intervention_complete()');
            this.planner.addNote('Manual intervention complete. User unblocked the issue.');

            // Continue processing if there are still goals and not complete
            if (!this.isComplete && this.planner.hasActivePlans()) {
                console.log(`[AGENT] Continuing with current goal: ${this.planner.getCurrentPlan()?.goal}`);
                // Restart the processing loop
                await this.runProcessingLoop();
            } else {
                console.log(`[AGENT] No goals remaining or task already complete`);
            }
        } else {
            console.log(`[AGENT] Resume called but agent was not paused for manual intervention`);
        }
    }

    // Shared processing loop used by both onInstruction and resumeAfterManualIntervention
    private async runProcessingLoop(): Promise<void> {
        while (!this.isComplete && this.planner.hasActivePlans() && !this.isPausedForManualIntervention) {
            this.loopIteration++; // Increment loop counter
            console.log(`[AGENT] Starting loop iteration ${this.loopIteration}`);
            const currentPlan = this.planner.getCurrentPlan();

            // Get current page observation (with navigation retry)
            const obsStart = Date.now();
            const pageObs = await retryOnError(
                () => this.browser.getPageObservation(),
                (error) => error.message.includes('Execution context was destroyed')
            );
            console.log(`[AGENT] Page observation took ${Date.now() - obsStart}ms`);
            this.currentElementMap = pageObs.elementMap;

            // Use the current goal for context building
            const currentGoal = currentPlan?.goal || '';
            const context = this.buildContext(currentGoal, pageObs);

            console.log('context: ', context);
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
                    planDepth: this.planner.getPlanDepth(),
                    currentGoal: currentPlan?.goal
                });
            }
        }

        // Log why the loop ended
        if (this.isPausedForManualIntervention) {
            console.log(`[AGENT] Processing paused - waiting for manual intervention completion`);
        } else if (this.isComplete) {
            console.log(`[AGENT] Processing complete`);
        } else if (!this.planner.hasActivePlans()) {
            console.log(`[AGENT] Processing stopped - no more goals`);
        }
    }

    private async toolActivation(actionName: string, args: any): Promise<void> {
        try {
            switch (actionName) {
                case 'branch':
                    if (args.subgoals && Array.isArray(args.subgoals)) {
                        const newSubgoals = args.subgoals.filter((sg: string) => sg && sg.trim());
                        if (newSubgoals.length > 0) {
                            const wasEmpty = !this.planner.hasSubgoals();

                            if (this.planner.addSubgoals(newSubgoals)) {
                                if (wasEmpty) {
                                    console.log(`[AGENT] Started working on first subgoal: ${newSubgoals[0]}`);
                                }

                                console.log(`[AGENT] Branched to ${newSubgoals.length} subgoal${newSubgoals.length > 1 ? 's' : ''}: [${newSubgoals.join(', ')}]`);

                                const allSubgoals = this.planner.getSubgoalDescriptions();
                                console.log(`[AGENT] All current subgoals: [${allSubgoals.join(', ')}]`);

                                this.addActionWithIteration(`branch([${newSubgoals.join(', ')}])`);
                            } else {
                                console.log(`[AGENT] Failed to add subgoals`);
                            }
                        } else {
                            console.log(`[AGENT] Branch called but no valid subgoals provided`);
                        }
                    } else {
                        console.log(`[AGENT] Branch called without subgoals array`);
                    }
                    break;


                case 'complete_subgoal':
                    const result = this.planner.completeCurrentSubgoal();
                    if (result.completed) {
                        if (result.next) {
                            console.log(`[AGENT] Completed previous subgoal, now working on: ${result.next}`);
                            this.addActionWithIteration(`complete_subgoal() → now on: ${result.next}`);
                        } else if (result.allCompleted) {
                            console.log(`[AGENT] Completed final subgoal! All subgoals done.`);
                            this.addActionWithIteration(`complete_subgoal() → all subgoals completed`);
                        }
                    } else {
                        console.log(`[AGENT] No current subgoal to complete`);
                    }
                    break;

                case 'note':
                    const note = args.message || args.content || '';
                    if (this.planner.addNote(note)) {
                        console.log(`[AGENT] Noted: ${note}`);
                        this.addActionWithIteration(`note(${note})`);
                    }
                    break;

                case 'manual_intervention':
                    const reason = args.reason || 'Manual intervention required';
                    const suggestion = args.suggestion || 'Please complete the required action in the browser';
                    const page = this.browser.getPage();
                    const currentUrl = page ? await page.url() : 'Unknown URL';

                    console.log(`[AGENT] Manual intervention requested: ${reason}`);
                    console.log(`[AGENT] Suggestion: ${suggestion}`);
                    console.log(`[AGENT] Pausing agent processing until intervention is complete`);

                    // Pause the agent processing
                    this.isPausedForManualIntervention = true;

                    this.sendResponse('manual_intervention', {
                        reasoning: reason,
                        suggestion: suggestion,
                        currentUrl: currentUrl,
                        timestamp: Date.now()
                    });

                    this.addActionWithIteration(`manual_intervention("${reason}")`);
                    break;

                case 'stop':
                    this.isComplete = true;
                    const finalAnswer = args.answer || args.message || 'Task completed';
                    console.log(`[AGENT] Stopped: ${finalAnswer}`);
                    this.sendResponse('agent_complete', {
                        answer: finalAnswer,
                        planSummary: this.planner.getSummary()
                    });
                    break;

                case 'click':
                    if (args.elementId && this.currentElementMap.has(args.elementId)) {
                        const elementDesc = this.currentElementMap.get(args.elementId)!;
                        const page = this.browser.getPage();
                        const beforeUrl = page ? await page.url() : undefined;
                        await this.browser.click(elementDesc.selector);

                        // Check if page changed after click
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for potential navigation
                        const afterUrl = page ? await page.url() : undefined;
                        const pageChanged = beforeUrl !== afterUrl;

                        console.log(`[AGENT] Clicked element ${args.elementId}: ${elementDesc.name} (${elementDesc.selector})`);

                        if (pageChanged) {
                            this.addActionWithIteration(`click("${elementDesc.name}") → navigated to new page`);
                        } else {
                            this.addActionWithIteration(`click("${elementDesc.name}") → success`);
                        }
                    } else if (args.selector) {
                        await this.browser.click(args.selector);
                        console.log(`[AGENT] Clicked selector: ${args.selector}`);
                        this.addActionWithIteration(`click(${args.selector})`);
                    } else {
                        throw new Error('No valid elementId or selector provided for click');
                    }
                    break;

                case 'type':
                    if (args.elementId && this.currentElementMap.has(args.elementId)) {
                        const elementDesc = this.currentElementMap.get(args.elementId)!;
                        await this.browser.type(elementDesc.selector, args.text);
                        console.log(`[AGENT] Typed "${args.text}" into element ${args.elementId}: ${elementDesc.name} (${elementDesc.selector})`);
                        this.addActionWithIteration(`type("${elementDesc.name}", "${args.text}")`);
                    } else if (args.selector) {
                        await this.browser.type(args.selector, args.text);
                        console.log(`[AGENT] Typed "${args.text}" into selector: ${args.selector}`);
                        this.addActionWithIteration(`type(${args.selector}, "${args.text}")`);
                    } else {
                        throw new Error('No valid elementId or selector provided for type');
                    }
                    break;

                case 'enter':
                    await this.browser.enter();
                    console.log(`[AGENT] Pressed Enter key`);
                    this.addActionWithIteration('enter()');
                    break;

                case 'goto':
                    await this.browser.goto(args.url);
                    console.log(`[AGENT] Navigated to: ${args.url}`);
                    this.addActionWithIteration(`goto(${args.url})`);
                    break;

                case 'goBack':
                    await this.browser.goBack();
                    console.log(`[AGENT] Went back`);
                    this.addActionWithIteration('goBack()');
                    break;

                default:
                    console.warn(`[AGENT] Unknown action: ${actionName}`);
                    break;
            }
        } catch (error) {
            console.error(`[AGENT] Error executing ${actionName}:`, error);
            debugger
            this.addActionWithIteration(`error(${actionName}(${args.elementId})): error: ${error instanceof Error ? error.message?.slice(0, 80) : 'Unknown error'}`);
            this.sendResponse('agent_error', {
                action: actionName,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
