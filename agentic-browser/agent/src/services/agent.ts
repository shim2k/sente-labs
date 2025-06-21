import { LLMService, LLMResponse } from './llm';
import { BrowserService, PageObservation } from './browser';

interface PlanContext {
    goal: string;
    actions: string[];
    notes: string[];
}

export class AgentService {
    private llm: LLMService;
    private browser: BrowserService;
    private sendResponse: (type: string, payload: any) => void;
    private planStack: PlanContext[] = [];
    private isComplete: boolean = false;
    private currentElementMap: Map<number, string> = new Map();

    constructor(browser: BrowserService, sendResponse: (type: string, payload: any) => void) {
        this.browser = browser;
        this.llm = new LLMService();
        this.sendResponse = sendResponse;
    }

    async onInstruction(instruction: string): Promise<void> {
        // Initialize root plan if empty
        if (this.planStack.length === 0) {
            this.planStack.push({
                goal: instruction,
                actions: [],
                notes: []
            });
        }

        while (!this.isComplete && this.planStack.length > 0) {
            const currentPlan = this.getCurrentPlan();

            // Get current page observation
            const pageObs = await this.browser.getPageObservation();
            this.currentElementMap = pageObs.elementMap;

            const context = this.buildContext(instruction, pageObs);

            console.log('context: ', context);
            const llmResponse: LLMResponse = await this.llm.getResponse([
                { role: 'user', content: context }
            ]);

            if (llmResponse.toolCalls && llmResponse.toolCalls.length > 0) {
                for (const toolCall of llmResponse.toolCalls) {
                    await this.toolActivation(toolCall.name, toolCall.arguments);
                    if (this.isComplete) break;
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
    }

    private buildContext(originalInstruction: string, pageObs: PageObservation): string {
        const currentPlan = this.getCurrentPlan();
        if (!currentPlan) return originalInstruction;

        let context = `Original Task: ${originalInstruction}\n`;
        context += `Current Goal: ${currentPlan.goal}\n`;

        if (currentPlan.actions.length > 0) {
            context += `Recent Actions: ${currentPlan.actions.slice(-3).join(', ')}\n`;
        }

        if (currentPlan.notes.length > 0) {
            context += `Notes: ${currentPlan.notes.join('; ')}\n`;
        }

        context += `\nPlan Depth: ${this.planStack.length} (use 'branch' to explore sub-goals, 'prune' to backtrack)\n\n`;

        // Include page observation
        context += `**Current Page:**\n${pageObs.content}\n`;
        context += `\nUse element IDs [number] for click actions (e.g., click with elementId: 1)`;

        return context;
    }

    private getCurrentPlan(): PlanContext | undefined {
        return this.planStack[this.planStack.length - 1];
    }

    private async toolActivation(actionName: string, args: any): Promise<void> {
        const currentPlan = this.getCurrentPlan();

        try {
            switch (actionName) {
                case 'branch':
                    this.planStack.push({
                        goal: args.subgoal || args.goal || 'Unnamed subgoal',
                        actions: [],
                        notes: []
                    });
                    console.log(`[AGENT] Branched to: ${args.subgoal || args.goal}`);
                    currentPlan?.actions.push(`branch(${args.subgoal || args.goal})`);
                    break;

                case 'prune':
                    if (this.planStack.length > 1) {
                        const prunedPlan = this.planStack.pop();
                        console.log(`[AGENT] Pruned plan: ${prunedPlan?.goal}`);
                        const parentPlan = this.getCurrentPlan();
                        parentPlan?.actions.push(`prune(${prunedPlan?.goal})`);
                    }
                    break;

                case 'note':
                    const note = args.message || args.content || '';
                    currentPlan?.notes.push(note);
                    console.log(`[AGENT] Noted: ${note}`);
                    currentPlan?.actions.push(`note(${note})`);
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
                        const selector = this.currentElementMap.get(args.elementId)!;
                        await this.browser.click(selector);
                        console.log(`[AGENT] Clicked element ${args.elementId}: ${selector}`);
                        currentPlan?.actions.push(`click(${args.elementId})`);
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
                        const selector = this.currentElementMap.get(args.elementId)!;
                        await this.browser.type(selector, args.text);
                        console.log(`[AGENT] Typed "${args.text}" into element ${args.elementId}: ${selector}`);
                        currentPlan?.actions.push(`type(${args.elementId}, "${args.text}")`);
                    } else if (args.selector) {
                        await this.browser.type(args.selector, args.text);
                        console.log(`[AGENT] Typed "${args.text}" into selector: ${args.selector}`);
                        currentPlan?.actions.push(`type(${args.selector}, "${args.text}")`);
                    } else {
                        throw new Error('No valid elementId or selector provided for type');
                    }
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
