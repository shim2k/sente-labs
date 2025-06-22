import { LLMService, LLMResponse } from './llm';
import { BrowserService, PageObservation, ElementDescriptor } from './browser';

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

interface PlanContext {
    goal: string;
    subGoals: string[];
    currentSubgoalIndex: number; // -1 means no current subgoal, 0+ is index of current subgoal
    actions: string[];
    notes: string[];
}

export class AgentService {
    private llm: LLMService;
    private browser: BrowserService;
    private sendResponse: (type: string, payload: any) => void;
    private planStack: PlanContext[] = [];
    private isComplete: boolean = false;
    private isPausedForManualIntervention: boolean = false;
    private currentElementMap: Map<number, ElementDescriptor> = new Map();

    constructor(browser: BrowserService, sendResponse: (type: string, payload: any) => void) {
        this.browser = browser;
        this.llm = new LLMService();
        this.sendResponse = sendResponse;
    }

    async onInstruction(instruction: string): Promise<void> {
        // Always add the new instruction as a new goal to build upon previous context
        this.planStack.push({
            goal: instruction,
            subGoals: [],
            currentSubgoalIndex: -1, // No current subgoal initially
            actions: [],
            notes: []
        });

        console.log(`[AGENT] New instruction added. Plan depth: ${this.planStack.length}`);
        console.log(`[AGENT] Current goal: ${instruction}`);

        this.isComplete = false;

        // Start the main processing loop
        await this.runProcessingLoop();
    }

    private buildContext(originalInstruction: string, pageObs: PageObservation): string {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan) return originalInstruction;

        let context = '';

        // Show the sequence of instructions if we have multiple
        if (this.planStack.length > 1) {
            context += `**Instruction Sequence:**\n`;
            this.planStack.forEach((plan, index) => {
                const status = index === this.planStack.length - 1 ? ' (CURRENT)' : ' (COMPLETED)';
                context += `${index + 1}. ${plan.goal}${status}\n`;
            });
            context += '\n';
        } else {
            context += `Task: ${originalInstruction}\n`;
        }

        context += `Current Goal: ${currentPlan.goal}\n`;

        if (currentPlan.subGoals.length > 0) {
            context += `Active Subgoals:\n`;
            currentPlan.subGoals.forEach((subgoal, index) => {
                let status = '';
                if (index < currentPlan.currentSubgoalIndex) {
                    status = ' (COMPLETED)';
                } else if (index === currentPlan.currentSubgoalIndex) {
                    status = ' (CURRENT)';
                }
                context += `  - ${subgoal}${status}\n`;
            });
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

        context += `\nPlan Depth: ${this.planStack.length} goals, ${currentPlan.subGoals.length} subgoals (use 'branch' to add sub-goals, 'prune' to remove latest subgoal)\n`;
        
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

    private getCurrentPlan(): PlanContext | undefined {
        return this.planStack[this.planStack.length - 1];
    }

    // Method to resume agent processing after manual intervention
    async resumeAfterManualIntervention(): Promise<void> {
        if (this.isPausedForManualIntervention) {
            console.log(`[AGENT] Resuming processing after manual intervention completion`);
            this.isPausedForManualIntervention = false;

            this.planStack[this.planStack.length - 1].actions.push('manual_intervention_complete()');
            this.planStack[this.planStack.length - 1].notes.push('Manual intervention complete. User unblocked the issue.');

            // Continue processing if there are still goals and not complete
            if (!this.isComplete && this.planStack.length > 0) {
                console.log(`[AGENT] Continuing with current goal: ${this.getCurrentPlan()?.goal}`);
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
        while (!this.isComplete && this.planStack.length > 0 && !this.isPausedForManualIntervention) {
            const currentPlan = this.getCurrentPlan();

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
                    planDepth: this.planStack.length,
                    currentGoal: currentPlan?.goal
                });
            }
        }

        // Log why the loop ended
        if (this.isPausedForManualIntervention) {
            console.log(`[AGENT] Processing paused - waiting for manual intervention completion`);
        } else if (this.isComplete) {
            console.log(`[AGENT] Processing complete`);
        } else if (this.planStack.length === 0) {
            console.log(`[AGENT] Processing stopped - no more goals`);
        }
    }

    private async toolActivation(actionName: string, args: any): Promise<void> {
        const currentPlan = this.getCurrentPlan();

        try {
            switch (actionName) {
                case 'branch':
                    if (args.subgoals && Array.isArray(args.subgoals)) {
                        const newSubgoals = args.subgoals.filter((sg: string) => sg && sg.trim());
                        if (newSubgoals.length > 0) {
                            const wasEmpty = currentPlan?.subGoals.length === 0;
                            currentPlan?.subGoals.push(...newSubgoals);
                            
                            // If this was the first subgoal(s) added, start working on the first one
                            if (wasEmpty && currentPlan) {
                                currentPlan.currentSubgoalIndex = 0;
                                console.log(`[AGENT] Started working on first subgoal: ${currentPlan.subGoals[0]}`);
                            }
                            
                            console.log(`[AGENT] Branched to ${newSubgoals.length} subgoal${newSubgoals.length > 1 ? 's' : ''}: [${newSubgoals.join(', ')}]`);
                            console.log(`[AGENT] All current subgoals: [${currentPlan?.subGoals.join(', ')}]`);
                            currentPlan?.actions.push(`branch([${newSubgoals.join(', ')}])`);
                        } else {
                            console.log(`[AGENT] Branch called but no valid subgoals provided`);
                        }
                    } else {
                        console.log(`[AGENT] Branch called without subgoals array`);
                    }
                    break;

                case 'prune':
                    if (currentPlan && currentPlan.subGoals.length > 0) {
                        const prunedSubgoal = currentPlan.subGoals.pop();
                        console.log(`[AGENT] Pruned subgoal: ${prunedSubgoal}`);
                        console.log(`[AGENT] Remaining subgoals: [${currentPlan.subGoals.join(', ')}]`);
                        currentPlan.actions.push(`prune(${prunedSubgoal})`);
                    } else {
                        console.log(`[AGENT] Cannot prune: no subgoals to remove from goal "${currentPlan?.goal}"`);
                    }
                    break;

                case 'complete_subgoal':
                    if (currentPlan && currentPlan.subGoals.length > 0) {
                        if (currentPlan.currentSubgoalIndex < currentPlan.subGoals.length - 1) {
                            currentPlan.currentSubgoalIndex++;
                            const currentSubgoal = currentPlan.subGoals[currentPlan.currentSubgoalIndex];
                            console.log(`[AGENT] Completed previous subgoal, now working on: ${currentSubgoal}`);
                            currentPlan.actions.push(`complete_subgoal() → now on: ${currentSubgoal}`);
                        } else if (currentPlan.currentSubgoalIndex === currentPlan.subGoals.length - 1) {
                            currentPlan.currentSubgoalIndex = currentPlan.subGoals.length; // All completed
                            console.log(`[AGENT] Completed final subgoal! All subgoals done.`);
                            currentPlan.actions.push(`complete_subgoal() → all subgoals completed`);
                        } else {
                            console.log(`[AGENT] No current subgoal to complete`);
                        }
                    } else {
                        console.log(`[AGENT] Cannot complete subgoal: no subgoals exist`);
                    }
                    break;

                case 'note':
                    const note = args.message || args.content || '';
                    currentPlan?.notes.push(note);
                    console.log(`[AGENT] Noted: ${note}`);
                    currentPlan?.actions.push(`note(${note})`);
                    break;

                case 'manual_intervention':
                    const reason = args.reason || 'Manual intervention required';
                    const suggestion = args.suggestion || 'Please complete the required action in the browser';
                    const currentUrl = await this.browser.getPage()?.url() || 'Unknown URL';

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

                    currentPlan?.actions.push(`manual_intervention("${reason}")`);
                    break;

                case 'stop':
                    this.isComplete = true;
                    const finalAnswer = args.answer || args.message || 'Task completed';
                    console.log(`[AGENT] Stopped: ${finalAnswer}`);
                    this.sendResponse('agent_complete', {
                        answer: finalAnswer,
                        planSummary: this.planStack.map(p => ({ goal: p.goal, actions: p.actions }))
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

                        console.log(`[AGENT] Clicked element ${args.elementId}: ${elementDesc.name} (${elementDesc.selector})`);

                        if (pageChanged) {
                            currentPlan?.actions.push(`click("${elementDesc.name}") → navigated to new page`);
                        } else {
                            currentPlan?.actions.push(`click("${elementDesc.name}") → success`);
                        }
                    } else if (args.selector) {
                        await this.browser.click(args.selector);
                        console.log(`[AGENT] Clicked selector: ${args.selector}`);
                        currentPlan?.actions.push(`click(${args.selector})`);
                    } else {
                        throw new Error('No valid elementId or selector provided for click');
                    }
                    break;

                case 'type':
                    if (args.elementId && this.currentElementMap.has(args.elementId)) {
                        const elementDesc = this.currentElementMap.get(args.elementId)!;
                        await this.browser.type(elementDesc.selector, args.text);
                        console.log(`[AGENT] Typed "${args.text}" into element ${args.elementId}: ${elementDesc.name} (${elementDesc.selector})`);
                        currentPlan?.actions.push(`type("${elementDesc.name}", "${args.text}")`);
                    } else if (args.selector) {
                        await this.browser.type(args.selector, args.text);
                        console.log(`[AGENT] Typed "${args.text}" into selector: ${args.selector}`);
                        currentPlan?.actions.push(`type(${args.selector}, "${args.text}")`);
                    } else {
                        throw new Error('No valid elementId or selector provided for type');
                    }
                    break;

                case 'enter':
                    await this.browser.enter();
                    console.log(`[AGENT] Pressed Enter key`);
                    currentPlan?.actions.push('enter()');
                    break;

                case 'goto':
                    await this.browser.goto(args.url);
                    console.log(`[AGENT] Navigated to: ${args.url}`);
                    currentPlan?.actions.push(`goto(${args.url})`);
                    break;

                case 'goBack':
                    await this.browser.goBack();
                    console.log(`[AGENT] Went back`);
                    currentPlan?.actions.push('goBack()');
                    break;

                default:
                    console.warn(`[AGENT] Unknown action: ${actionName}`);
                    break;
            }
        } catch (error) {
            console.error(`[AGENT] Error executing ${actionName}:`, error);
            currentPlan?.actions.push(`error(${actionName})`);
            this.sendResponse('agent_error', {
                action: actionName,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}
