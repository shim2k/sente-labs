import { LogEntry } from '../types';
import { FileLogger } from './file-logger';

export class Logger {
  private static instance: Logger;
  private logHandlers: ((log: LogEntry) => void)[] = [];
  private fileLogger: FileLogger | null = null;

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  initializeFileLogging(sessionId?: string): void {
    try {
      this.fileLogger = new FileLogger(sessionId || `session-${Date.now()}`);
      
      // Add file logger as a handler for all logs
      this.addHandler((logEntry: LogEntry) => {
        if (this.fileLogger) {
          this.fileLogger.logEntry(logEntry);
        }
      });

      this.info('Session file logging initialized', { 
        sessionId: this.fileLogger.getSessionId(),
        logDir: this.fileLogger.getLogDirectory()
      });
    } catch (error) {
      this.error('Failed to initialize file logging', error);
    }
  }

  addHandler(handler: (log: LogEntry) => void): void {
    this.logHandlers.push(handler);
  }

  private log(type: LogEntry['type'], message: string, data?: any): void {
    const logEntry: LogEntry = {
      type,
      message,
      timestamp: Date.now(),
      data
    };

    // Console output
    const prefix = `[${new Date().toISOString()}] [${type.toUpperCase()}]`;
    console.log(`${prefix} ${message}`, data || '');

    // Notify handlers
    this.logHandlers.forEach(handler => handler(logEntry));
  }

  info(message: string, data?: any): void {
    this.log('system', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  action(message: string, data?: any): void {
    this.log('action', message, data);
  }

  agent(message: string, data?: any): void {
    this.log('agent', message, data);
  }

  llm(message: string, data?: any): void {
    this.log('llm', message, data);
  }

  // Enhanced LLM logging methods - now writes to single session file
  llmRequest(payload: any, metadata?: any): void {
    if (this.fileLogger) {
      this.fileLogger.logLLMRequest(payload, metadata);
    }
    
    // More descriptive console logging without DOM content
    const systemMessage = payload?.messages?.find((m: any) => m.role === 'system');
    const userMessage = payload?.messages?.find((m: any) => m.role === 'user');
    
    const systemPromptLength = systemMessage?.content?.length || 0;
    let userPromptLength = 0;
    let hasDOMContent = false;
    let instruction = metadata?.instruction;
    let domTokens = 0;
    
    // Handle structured prompts vs string prompts
    if (userMessage?.content) {
      if (typeof userMessage.content === 'object' && userMessage.content.instruction) {
        // Structured prompt
        const structured = userMessage.content;
        instruction = structured.instruction;
        domTokens = structured.metadata?.domTokens || 0;
        hasDOMContent = true;
        // Calculate prompt length without DOM for better metrics
        userPromptLength = structured.instruction?.length || 0;
        userPromptLength += structured.screenshotAnalysis?.length || 0;
        userPromptLength += (structured.previousSteps?.length || 0) * 50; // Rough estimate
        userPromptLength += 200; // Template overhead
      } else if (typeof userMessage.content === 'string') {
        // String prompt (legacy)
        userPromptLength = userMessage.content.length;
        hasDOMContent = userMessage.content.includes('<html>') || 
                        userMessage.content.includes('CURRENT PAGE') ||
                        userMessage.content.length > 10000;
        
        // Extract instruction if not provided and DOM content is present
        if (!instruction && hasDOMContent) {
          const taskLine = userMessage.content.split('\n').find((line: string) => line.startsWith('TASK:'));
          instruction = taskLine ? taskLine.replace('TASK: ', '').trim().substring(0, 100) : 'DOM-heavy prompt';
        }
      }
    }
    
    const totalPromptLength = systemPromptLength + userPromptLength;
    
    this.info('🤖 LLM Request', { 
      model: payload?.model,
      systemPromptLength,
      userPromptLength,
      totalPromptLength,
      messageCount: payload?.messages?.length || 0,
      toolCount: payload?.tools?.length || 0,
      temperature: payload?.temperature,
      maxTokens: payload?.max_tokens,
      instruction: instruction ? `"${instruction}${instruction.length > 50 ? '...' : ''}"` : undefined,
      stepCount: metadata?.stepCount,
      hasScreenshot: metadata?.hasScreenshot,
      hasDOMContent,
      domTokens: domTokens > 0 ? domTokens : undefined,
      promptType: hasDOMContent ? (domTokens > 0 ? 'structured' : 'legacy_string') : 'simple'
    });
  }

  llmResponse(response: any, metadata?: any): void {
    if (this.fileLogger) {
      this.fileLogger.logLLMResponse(response, metadata);
    }
    
    // More descriptive console logging
    const toolCalls = response?.choices?.[0]?.message?.tool_calls || [];
    const toolCallNames = toolCalls.map((tc: any) => tc.function?.name).filter(Boolean);
    const responseContent = response?.choices?.[0]?.message?.content;
    
    this.info('🎯 LLM Response', {
      model: response?.model,
      usage: response?.usage,
      finishReason: response?.choices?.[0]?.finish_reason,
      hasContent: !!responseContent,
      contentLength: responseContent?.length || 0,
      toolCallCount: toolCalls.length,
      toolCalls: toolCallNames,
      responseLength: JSON.stringify(response).length,
      costEstimate: metadata?.costEstimate,
      instruction: metadata?.instruction ? `"${metadata.instruction.substring(0, 50)}${metadata.instruction.length > 50 ? '...' : ''}"` : undefined
    });
  }

  instructionStart(instructionId: string, instruction: string, context?: any): void {
    if (this.fileLogger) {
      this.fileLogger.logInstruction(instructionId, instruction, context);
    }
    this.agent('Instruction started', { instructionId, instruction: instruction.substring(0, 100), context });
  }

  instructionComplete(instructionId: string, result: any, metrics?: any): void {
    if (this.fileLogger) {
      this.fileLogger.logInstructionComplete(instructionId, result, metrics);
    }
    this.agent('Instruction completed', { instructionId, status: result?.status, metrics });
  }

  actionExecuted(action: any, result?: any, metrics?: any): void {
    if (this.fileLogger) {
      this.fileLogger.logAction(action, result, metrics);
    }
    this.action('Action executed', { 
      type: action?.type, 
      description: action?.description,
      success: result?.success,
      duration: metrics?.duration
    });
  }

  browserEvent(event: string, data?: any): void {
    if (this.fileLogger) {
      this.fileLogger.logBrowserEvent(event, data);
    }
    this.info(`Browser event: ${event}`, data);
  }

  performanceMetrics(metrics: any): void {
    if (this.fileLogger) {
      this.fileLogger.logPerformanceMetrics(metrics);
    }
    this.info('Performance metrics', metrics);
  }

  flushLogs(): void {
    if (this.fileLogger) {
      this.fileLogger.flush();
    }
  }

  closeFileLogging(): void {
    if (this.fileLogger) {
      this.fileLogger.close();
      this.fileLogger = null;
    }
  }

  getFileLogger(): FileLogger | null {
    return this.fileLogger;
  }
}

export const logger = Logger.getInstance(); 