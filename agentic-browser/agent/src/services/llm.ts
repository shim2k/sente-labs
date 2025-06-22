import OpenAI from 'openai';

export interface LLMResponse {
    content: string;
    toolCalls?: {
        id: string;
        name: string;
        arguments: any;
    }[];
}

export class LLMService {
    private openai: OpenAI;
    private systemPrompt: string = `
        You are an agentic browser. Your job is to translate user instructions into actions on a playwright chrome browser.
        You can click on elements, navigate to URLs, and go back in browser history. 
        Your job is to translate the user's instructions into actions on the page.

        PLANNING STRATEGY: When you receive a new instruction, first consider breaking it down into sub-goals using 'branch'. 
        Use the 'subgoals' array parameter - you can send one step or multiple steps. Always think: "What are all the steps needed to complete this?"
        
        You can use planning actions:
        - 'branch' to add sub-goal(s) to the Active Subgoals list (use 'subgoals' array - HIGHLY RECOMMENDED for new instructions).
        - 'complete_subgoal' to mark the current subgoal as COMPLETED and advance to the next one
        - 'prune' to remove the most recent sub-goal (backtrack from current subgoal approach)
        - 'note' to record important observations
        - 'manual_intervention' to request human help (use for login pages, CAPTCHAs, or other human-only tasks)
        - 'stop' to complete the task
        
        SUBGOAL STATUS: Subgoals show their status: no status (pending), (CURRENT) for the one you're working on, (COMPLETED) for finished ones.
        Use 'complete_subgoal' when you finish the current subgoal to advance to the next one. 
        Trigger 'complete_subgoal' when it seems like you have completed the current subgoal.
        
        IMPORTANT: Goals are user instructions and can be branched into sub-goals, but cannot be pruned/removed. Only sub-goals can be pruned.
        
        MANUAL INTERVENTION: Use 'manual_intervention' when you encounter:
        - Login or authentication pages requiring credentials
        - CAPTCHA verification systems
        - Two-factor authentication prompts
        - Payment forms requiring sensitive information
        - Any situation where human judgment or input is essential
        
        COMPLETION: When you have successfully completed the task or reached the goal, you MUST call the 'stop' tool. 
        DO NOT provide conversational responses like "let me know what else you'd like me to do" - instead, call 'stop' with your final answer.
        Examples of when to call 'stop':
        - Successfully navigated to the requested page/site
        - Found and provided the requested information
        - Completed the specified action (search, login, form submission, etc.)
        - Reached a logical endpoint for the user's instruction
        
        ALWAYS use 'stop' instead of asking "what else would you like me to do" or similar conversational responses.
        
        For clicking elements, use the element IDs shown in brackets [number] from the page content.
        For typing text, use the element IDs of input fields.
        Use the 'enter' action to press the Enter key, commonly needed after typing in search boxes or forms.
    `;
    private tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        {
            type: 'function',
            function: {
                name: 'click',
                description: 'Click on an element using its ID number from the page',
                parameters: {
                    type: 'object',
                    properties: {
                        elementId: {
                            type: 'number',
                            description: 'The ID number of the element to click (from the page content brackets [number])'
                        }
                    },
                    required: ['elementId']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'type',
                description: 'Type text into an input field using its ID number from the page',
                parameters: {
                    type: 'object',
                    properties: {
                        elementId: {
                            type: 'number',
                            description: 'The ID number of the input field (from the page content brackets [number])'
                        },
                        text: {
                            type: 'string',
                            description: 'The text to type into the input field'
                        }
                    },
                    required: ['elementId', 'text']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'enter',
                description: 'Press the Enter key to submit forms or trigger actions',
                parameters: {
                    type: 'object',
                    properties: {}
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'goto',
                description: 'Navigate to a specific URL',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL to navigate to'
                        }
                    },
                    required: ['url']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'goBack',
                description: 'Go back to the previous page in browser history',
                parameters: {
                    type: 'object',
                    properties: {}
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'branch',
                description: 'Append one or multiple sub-goals to the current goal to break down complex tasks. The sub-goals will be added to the end of the sub-goals list.',
                parameters: {
                    type: 'object',
                    properties: {
                        subgoals: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'Array of sub-goals to add (can be one or multiple steps)'
                        }
                    },
                    required: ['subgoals']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'prune',
                description: 'Remove the most recent sub-goal (cannot remove user goals)',
                parameters: {
                    type: 'object',
                    properties: {}
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'complete_subgoal',
                description: 'Mark the current subgoal as completed and advance to the next one',
                parameters: {
                    type: 'object',
                    properties: {}
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'note',
                description: 'Record an important observation or piece of information',
                parameters: {
                    type: 'object',
                    properties: {
                        message: {
                            type: 'string',
                            description: 'The observation or information to record'
                        }
                    },
                    required: ['message']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'manual_intervention',
                description: 'Request human intervention for tasks that require human input (login pages, CAPTCHAs, etc.)',
                parameters: {
                    type: 'object',
                    properties: {
                        reason: {
                            type: 'string',
                            description: 'Explanation of why manual intervention is needed'
                        },
                        suggestion: {
                            type: 'string',
                            description: 'What the human should do to help'
                        }
                    },
                    required: ['reason', 'suggestion']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'stop',
                description: 'REQUIRED: Call this when the task is complete. Use instead of conversational responses.',
                parameters: {
                    type: 'object',
                    properties: {
                        answer: {
                            type: 'string',
                            description: 'The final answer, result, or confirmation of what was accomplished'
                        }
                    },
                    required: ['answer']
                }
            }
        }
    ];

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async getResponse(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<LLMResponse> {
        const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
            role: 'system',
            content: this.systemPrompt.trim()
        };

        const messageHistory = [systemMessage, ...messages];

        const completion = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messageHistory,
            tools: this.tools
        });

        const message = completion.choices[0]?.message;
        const content = message?.content || '';

        const toolCalls = message?.tool_calls?.map(call => ({
            id: call.id,
            name: call.function.name,
            arguments: JSON.parse(call.function.arguments)
        }));

        console.log('LLM response:', { content, toolCalls });

        return {
            content,
            toolCalls
        };
    }
}
