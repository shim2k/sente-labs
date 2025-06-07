import { ReActStep } from './types';
import { schemas } from './validation';

export class StepParser {
  parseToolCall(toolCall: any): ReActStep {
    const args = JSON.parse(toolCall.function.arguments);
    const toolName = toolCall.function.name as keyof typeof schemas;
    
    try {
      switch (toolName) {
        case 'classifyInstruction': {
          const payload = schemas.classifyInstruction.parse(args);
          return {
            type: 'thought',
            content: `Used classifyInstruction tool - classified as ${payload.type} (${payload.complexity} complexity, ${payload.estimatedSteps} steps): ${payload.reason}`,
            timestamp: Date.now(),
            // Store classification data for later use
            classificationData: payload
          } as any;
        }
        
        case 'thought': {
          const payload = schemas.thought.parse(args);
          return {
            type: 'thought',
            content: payload.content,
            timestamp: Date.now()
          };
        }
        
        case 'click': {
          const payload = schemas.click.parse(args);
          return {
            type: 'action',
            content: payload.reason,
            actionData: {
              type: 'click',
              selectors: payload.selectors,
              description: `Click ${payload.selectors.join(', ')}: ${payload.reason}`
            },
            timestamp: Date.now()
          };
        }
        
        case 'clickByPosition': {
          const payload = schemas.clickByPosition.parse(args);
          return {
            type: 'action',
            content: payload.reason,
            actionData: {
              type: 'clickByPosition',
              x: payload.x,
              y: payload.y,
              description: `Click at coordinates (${payload.x}, ${payload.y}): ${payload.reason}`
            },
            timestamp: Date.now()
          };
        }
        
        case 'type': {
          const payload = schemas.type.parse(args);
          return {
            type: 'action',
            content: payload.reason,
            actionData: {
              type: 'type',
              selectors: payload.selectors,
              value: payload.value,
              description: `Type "${payload.value}" into ${payload.selectors.join(', ')}: ${payload.reason}`
            },
            timestamp: Date.now()
          };
        }
        
        case 'pressEnter': {
          const payload = schemas.pressEnter.parse(args);
          return {
            type: 'action',
            content: payload.reason,
            actionData: {
              type: 'pressEnter',
              description: `Press Enter: ${payload.reason}`
            },
            timestamp: Date.now()
          };
        }
        
        case 'navigate': {
          const payload = schemas.navigate.parse(args);
          return {
            type: 'action',
            content: payload.reason,
            actionData: {
              type: 'navigate',
              url: payload.url,
              description: `Navigate to ${payload.url}: ${payload.reason}`
            },
            timestamp: Date.now()
          };
        }
        
        case 'wait': {
          const payload = schemas.wait.parse(args);
          return {
            type: 'action',
            content: payload.reason,
            actionData: {
              type: 'wait',
              duration: payload.duration,
              description: `Wait ${payload.duration}ms: ${payload.reason}`
            },
            timestamp: Date.now()
          };
        }
        
        case 'complete': {
          const payload = schemas.complete.parse(args);
          return {
            type: 'complete',
            content: payload.summary,
            timestamp: Date.now(),
            ...payload
          } as any;
        }
        
        case 'scroll': {
          const payload = schemas.scroll.parse(args);
          return {
            type: 'action',
            content: payload.reason,
            actionData: {
              type: 'scroll',
              direction: payload.direction,
              amount: payload.amount,
              description: `Scroll ${payload.direction} ${payload.amount}px: ${payload.reason}`
            },
            timestamp: Date.now()
          };
        }
        
        case 'manualIntervention': {
          const payload = schemas.manualIntervention.parse(args);
          return {
            type: 'manualIntervention',
            content: payload.reason,
            timestamp: Date.now(),
            ...payload
          } as any;
        }
        
        default:
          throw new Error(`Unknown tool: ${String(toolName)}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse ${String(toolName)} tool call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 