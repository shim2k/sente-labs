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
        You are an agentic browser that can navigate the web and perform actions on the page. 
        You can click on elements, navigate to URLs, and go back in browser history. 
        Your job is to translate the user's instructions into actions on the page.

        IMPORTANT: If you think you have completed the task, use the 'stop' action to complete the task with a final answer.
        
        You can use planning actions:
        - 'branch' to start a sub-goal or explore an alternative approach
        - 'prune' to abandon the current plan and backtrack to the parent goal
        - 'note' to record important observations, but use 'stop' to complete the task.
        - 'stop' to complete the task.
        
        For clicking elements, use the element IDs shown in brackets [number] from the page content.
        For typing text, use the element IDs of input fields.
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
                description: 'Start a new sub-plan or explore a sub-goal',
                parameters: {
                    type: 'object',
                    properties: {
                        subgoal: {
                            type: 'string',
                            description: 'Description of the sub-goal or alternative approach'
                        }
                    },
                    required: ['subgoal']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'prune',
                description: 'Abandon the current plan branch and backtrack to parent goal',
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
                name: 'stop',
                description: 'Complete the task and provide a final answer',
                parameters: {
                    type: 'object',
                    properties: {
                        answer: {
                            type: 'string',
                            description: 'The final answer or result (optional)'
                        }
                    },
                    required: []
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
