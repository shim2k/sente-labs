import { z } from 'zod';

// Tool definitions for the ReAct agent
export const tools = [
  {
    type: 'function',
    function: {
      name: 'classifyInstruction',
      description: 'Classify the type of instruction to optimize processing (should be called first)',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['simple_navigation', 'complex_interaction', 'content_extraction', 'multi_step_task', 'visual_task', 'unknown'],
            description: 'Semantic classification of the instruction type'
          },
          needsScreenshot: {
            type: 'boolean',
            description: 'Whether this instruction type requires screenshot analysis'
          },
          complexity: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Estimated complexity level of the task'
          },
          estimatedSteps: {
            type: 'number',
            description: 'Estimated number of steps to complete the task'
          },
          reason: {
            type: 'string',
            description: 'Detailed reasoning for this classification'
          }
        },
        required: ['type', 'needsScreenshot', 'complexity', 'estimatedSteps', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'thought',
      description: 'Add a reasoning step about what to do next',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Your reasoning about the current situation and next steps' }
        },
        required: ['content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'click',
      description: 'Click an element on the page with multiple fallback selectors',
      parameters: {
        type: 'object',
        properties: {
          selectors: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Array of CSS selectors to try in order of preference'
          },
          reason: { type: 'string', description: 'Why you are clicking this element' }
        },
        required: ['selectors', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'clickByPosition',
      description: 'Click at specific coordinates on the page when selectors fail or are unreliable',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate to click' },
          y: { type: 'number', description: 'Y coordinate to click' },
          reason: { type: 'string', description: 'Reason for using position-based clicking' }
        },
        required: ['x', 'y', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'type',
      description: 'Type text into an input field with multiple fallback selectors',
      parameters: {
        type: 'object',
        properties: {
          selectors: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Array of CSS selectors to try in order of preference'
          },
          value: { type: 'string', description: 'Text to type' },
          reason: { type: 'string', description: 'Why you are typing this text' }
        },
        required: ['selectors', 'value', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'pressEnter',
      description: 'Press the Enter key, typically used to submit forms or trigger actions',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why you are pressing Enter (e.g., "submit form", "trigger search")' }
        },
        required: ['reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Navigate to a URL',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to navigate to' },
          reason: { type: 'string', description: 'Why you are navigating to this URL' }
        },
        required: ['url', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'wait',
      description: 'Wait for a specified duration',
      parameters: {
        type: 'object',
        properties: {
          duration: { type: 'number', description: 'Duration to wait in milliseconds' },
          reason: { type: 'string', description: 'Why you are waiting' }
        },
        required: ['duration', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'complete',
      description: 'Signal that the task has been completed successfully',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Brief summary of what was accomplished' },
          finalAnswer: { type: 'string', description: 'Final answer or result for the user' }
        },
        required: ['summary', 'finalAnswer']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scroll',
      description: 'Scroll the page to reveal elements that might be outside the viewport',
      parameters: {
        type: 'object',
        properties: {
          direction: { 
            type: 'string', 
            enum: ['up', 'down'],
            description: 'Direction to scroll' 
          },
          amount: { 
            type: 'number', 
            description: 'Amount to scroll in pixels (default: 300)' 
          },
          reason: { 
            type: 'string', 
            description: 'Reason for scrolling (e.g., "looking for comment section")' 
          }
        },
        required: ['direction', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manualIntervention',
      description: 'Request manual intervention when automated action is not safe or possible',
      parameters: {
        type: 'object',
        properties: {
          reason: { 
            type: 'string', 
            description: 'Detailed reason why manual intervention is needed' 
          },
          suggestion: { 
            type: 'string', 
            description: 'Specific suggestion for what the user should do manually' 
          },
          category: {
            type: 'string',
            enum: ['login', 'captcha', 'security', 'privacy', 'complex_interaction', 'other'],
            description: 'Category of manual intervention needed'
          }
        },
        required: ['reason', 'suggestion', 'category']
      }
    }
  }
] as const;

// Validation schemas
export const schemas = {
  classifyInstruction: z.object({
    type: z.enum(['simple_navigation', 'complex_interaction', 'content_extraction', 'multi_step_task', 'visual_task', 'unknown']),
    needsScreenshot: z.boolean(),
    complexity: z.enum(['low', 'medium', 'high']),
    estimatedSteps: z.number(),
    reason: z.string()
  }),
  thought: z.object({
    content: z.string()
  }),
  click: z.object({
    selectors: z.array(z.string()),
    reason: z.string()
  }),
  clickByPosition: z.object({
    x: z.number(),
    y: z.number(),
    reason: z.string()
  }),
  type: z.object({
    selectors: z.array(z.string()),
    value: z.string(),
    reason: z.string()
  }),
  pressEnter: z.object({
    reason: z.string()
  }),
  navigate: z.object({
    url: z.string(),
    reason: z.string()
  }),
  wait: z.object({
    duration: z.number(),
    reason: z.string()
  }),
  scroll: z.object({
    direction: z.enum(['up', 'down']),
    amount: z.number().optional(),
    reason: z.string()
  }),
  complete: z.object({
    summary: z.string(),
    finalAnswer: z.string()
  }),
  manualIntervention: z.object({
    reason: z.string(),
    suggestion: z.string(),
    category: z.enum(['login', 'captcha', 'security', 'privacy', 'complex_interaction', 'other'])
  })
}; 