import { createWriteStream, WriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { LogEntry } from '../types';

interface DetailedLogEntry extends LogEntry {
  sessionId?: string;
  instructionId?: string;
  stepNumber?: number;
  llmPayload?: any;
  llmResponse?: any;
  actionResult?: any;
  performanceMetrics?: {
    duration?: number;
    tokenUsage?: any;
    cost?: string;
  };
}

export class FileLogger {
  private logStream: WriteStream | null = null;
  private logDir: string;
  private sessionId: string;

  constructor(sessionId: string = 'default') {
    this.sessionId = sessionId;
    this.logDir = join(process.cwd(), 'logs');
    this.initializeStream();
  }

  private initializeStream(): void {
    try {
      // Create logs directory if it doesn't exist
      if (!existsSync(this.logDir)) {
        mkdirSync(this.logDir, { recursive: true });
      }

      // Create single session log file with clean naming
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS, keeping the colons initially
      const formattedTime = timeStr.replace(/:/g, '-'); // HH-MM-SS
      
      const logFileName = `session-${dateStr}-${formattedTime}.log`;

      // Initialize single write stream
      this.logStream = createWriteStream(join(this.logDir, logFileName), { 
        flags: 'a',
        encoding: 'utf8'
      });

      // Write session header
      const sessionHeader = {
        event: 'SESSION_START',
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      };

      this.writeToStream(sessionHeader);

      console.log(`📁 Session logging initialized: ${logFileName}`);
    } catch (error) {
      console.error('Failed to initialize file logger:', error);
    }
  }

  private writeToStream(data: any): void {
    if (!this.logStream) return;
    
    try {
      const logLine = JSON.stringify(data) + '\n';
      this.logStream.write(logLine);
    } catch (error) {
      console.error('Failed to write to log stream:', error);
    }
  }

  logEntry(entry: LogEntry, additionalData?: Partial<DetailedLogEntry>): void {
    if (!this.logStream) return;

    const detailedEntry: DetailedLogEntry = {
      ...entry,
      sessionId: this.sessionId,
      ...additionalData
    };

    this.writeToStream(detailedEntry);
  }

  logLLMRequest(payload: any, metadata?: any): void {
    // Create a clean version of the payload without tools and DOM content
    const cleanPayload = {
      model: payload.model,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      tool_choice: payload.tool_choice,
      // Extract messages in a more readable format without DOM content
      messages: payload.messages?.map((msg: any) => {
        if (msg.role === 'system') {
          return {
            role: 'system',
            contentType: 'system_prompt',
            characterCount: msg.content?.length || 0,
            preview: msg.content?.substring(0, 200) + (msg.content?.length > 200 ? '...' : '') || ''
          };
        } else if (msg.role === 'user') {
          // Check if this is a structured prompt object
          if (typeof msg.content === 'object' && msg.content.instruction && msg.content.domContent) {
            const structured = msg.content;
            return {
              role: 'user',
              contentType: 'structured_prompt',
              instruction: structured.instruction,
              domTokens: structured.metadata?.domTokens || 0,
              hasVisualContext: structured.metadata?.hasVisualContext || false,
              hasRecentSteps: structured.metadata?.hasRecentSteps || false,
              stepCount: structured.metadata?.stepCount || 0,
              screenshotAnalysisLength: structured.screenshotAnalysis?.length || 0,
              previousStepsCount: structured.previousSteps?.length || 0,
              // Exclude domContent from logs but keep metadata
              preview: `TASK: ${structured.instruction} [${structured.metadata?.domTokens || 0} DOM tokens]${structured.metadata?.hasVisualContext ? ' [WITH VISUAL CONTEXT]' : ''}${structured.metadata?.hasRecentSteps ? ' [WITH RECENT STEPS]' : ''}`
            };
          }
          
          // Check if this is a DOM-heavy string prompt (fallback for legacy)
          const content = msg.content || '';
          const isDOMHeavy = typeof content === 'string' && (content.includes('<html>') || content.includes('CURRENT PAGE') || content.length > 10000);
          
          if (isDOMHeavy) {
            // Extract just the instruction part, exclude DOM content
            const lines = content.split('\n');
            const taskLine = lines.find((line: string) => line.startsWith('TASK:')) || '';
            const visualLine = lines.find((line: string) => line.startsWith('VISUAL')) || '';
            
            return {
              role: 'user',
              contentType: 'instruction_with_dom',
              characterCount: content.length,
              domIncluded: true,
              instruction: taskLine.replace('TASK: ', '').trim(),
              hasVisualContext: !!visualLine,
              hasRecentSteps: content.includes('RECENT STEPS'),
              preview: `${taskLine} ${visualLine ? '[WITH VISUAL CONTEXT]' : ''} ${content.includes('RECENT STEPS') ? '[WITH RECENT STEPS]' : ''}`
            };
          } else {
            // Regular user message without DOM
            return {
              role: 'user',
              contentType: 'regular_message',
              characterCount: content.length,
              fullContent: content,
              preview: content.substring(0, 500) + (content.length > 500 ? '...' : '')
            };
          }
        } else {
          return {
            role: msg.role,
            contentType: 'other',
            characterCount: typeof msg.content === 'string' ? msg.content.length : 0,
            preview: typeof msg.content === 'string' 
              ? msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : '')
              : '[NON-STRING CONTENT]'
          };
        }
      }) || []
    };

    const llmEntry = {
      event: 'LLM_REQUEST',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      llmPayload: cleanPayload,
      metadata: {
        ...metadata,
        messageCount: payload.messages?.length || 0,
        totalPromptLength: this.calculateTotalPromptLength(payload.messages),
        hasTools: !!(payload.tools && payload.tools.length > 0),
        toolCount: payload.tools?.length || 0,
        hasStructuredPrompt: payload.messages?.some((msg: any) => 
          msg.role === 'user' && typeof msg.content === 'object' && msg.content.instruction) || false,
        hasDOMContent: this.checkForDOMContent(payload.messages)
      },
      payloadSize: JSON.stringify(payload).length
    };

    this.writeToStream(llmEntry);
  }

  private calculateTotalPromptLength(messages: any[]): number {
    if (!messages) return 0;
    return messages.reduce((sum: number, msg: any) => {
      if (typeof msg.content === 'string') {
        return sum + msg.content.length;
      } else if (typeof msg.content === 'object' && msg.content.domContent) {
        // For structured prompts, estimate length without DOM
        const structured = msg.content;
        let estimate = structured.instruction?.length || 0;
        estimate += structured.screenshotAnalysis?.length || 0;
        estimate += (structured.previousSteps?.length || 0) * 50; // Rough estimate for steps
        estimate += 200; // Template overhead
        return sum + estimate;
      }
      return sum;
    }, 0);
  }

  private checkForDOMContent(messages: any[]): boolean {
    if (!messages) return false;
    return messages.some((msg: any) => {
      if (msg.role === 'user') {
        if (typeof msg.content === 'object' && msg.content.domContent) {
          return true; // Structured prompt with DOM
        }
        if (typeof msg.content === 'string' && (
          msg.content.includes('<html>') || 
          msg.content.includes('CURRENT PAGE')
        )) {
          return true; // Legacy string prompt with DOM
        }
      }
      return false;
    });
  }

  logLLMResponse(response: any, metadata?: any): void {
    // Extract key information from the response in a readable format
    const cleanResponse = {
      model: response.model,
      usage: response.usage,
      choices: response.choices?.map((choice: any, index: number) => {
        const result: any = {
          index,
          finish_reason: choice.finish_reason
        };

        // Handle text content
        if (choice.message?.content) {
          result.content = {
            type: 'text',
            preview: choice.message.content.substring(0, 300) + (choice.message.content.length > 300 ? '...' : ''),
            length: choice.message.content.length
          };
        }

        // Handle tool calls
        if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
          result.tool_calls = choice.message.tool_calls.map((toolCall: any) => ({
            id: toolCall.id,
            type: toolCall.type,
            function: {
              name: toolCall.function?.name,
              arguments_preview: toolCall.function?.arguments 
                ? JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2).substring(0, 200) + '...'
                : undefined,
              arguments_length: toolCall.function?.arguments?.length || 0
            }
          }));
        }

        return result;
      }) || [],
      created: response.created,
      id: response.id,
      object: response.object,
      system_fingerprint: response.system_fingerprint
    };

    const llmEntry = {
      event: 'LLM_RESPONSE',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      llmResponse: cleanResponse,
      metadata: {
        ...metadata,
        choiceCount: response.choices?.length || 0,
        hasToolCalls: response.choices?.some((choice: any) => choice.message?.tool_calls?.length > 0) || false,
        toolCallCount: response.choices?.reduce((sum: number, choice: any) => 
          sum + (choice.message?.tool_calls?.length || 0), 0) || 0,
        totalTokens: response.usage?.total_tokens || 0,
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0
      },
      responseSize: JSON.stringify(response).length
    };

    this.writeToStream(llmEntry);
  }

  logInstruction(instructionId: string, instruction: string, context?: any): void {
    const instructionEntry = {
      event: 'INSTRUCTION_START',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      instructionId,
      instruction,
      context
    };

    this.writeToStream(instructionEntry);
  }

  logInstructionComplete(instructionId: string, result: any, metrics?: any): void {
    const completionEntry = {
      event: 'INSTRUCTION_COMPLETE',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      instructionId,
      result,
      performanceMetrics: metrics
    };

    this.writeToStream(completionEntry);
  }

  logAction(action: any, result?: any, metrics?: any): void {
    const actionEntry = {
      event: 'ACTION_EXECUTED',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      action,
      actionResult: result,
      performanceMetrics: metrics
    };

    this.writeToStream(actionEntry);
  }

  logError(error: Error | string, context?: any): void {
    const errorEntry = {
      event: 'ERROR',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      context
    };

    this.writeToStream(errorEntry);
  }

  logBrowserEvent(event: string, data?: any): void {
    const browserEntry = {
      event: 'BROWSER_EVENT',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      browserEvent: event,
      data
    };

    this.writeToStream(browserEntry);
  }

  logPerformanceMetrics(metrics: any): void {
    const metricsEntry = {
      event: 'PERFORMANCE_METRICS',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      metrics
    };

    this.writeToStream(metricsEntry);
  }

  flush(): void {
    if (this.logStream) {
      this.logStream.cork();
      this.logStream.uncork();
    }
  }

  close(): void {
    try {
      const sessionEnd = {
        event: 'SESSION_END',
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId
      };

      this.writeToStream(sessionEnd);

      if (this.logStream) {
        this.logStream.end();
        this.logStream = null;
      }

      console.log(`📁 Session logging closed for: ${this.sessionId}`);
    } catch (error) {
      console.error('Error closing file logger:', error);
    }
  }

  getLogDirectory(): string {
    return this.logDir;
  }

  getSessionId(): string {
    return this.sessionId;
  }
} 