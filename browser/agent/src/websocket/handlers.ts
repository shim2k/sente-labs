import WebSocket from 'ws';
import { InstructionMessage, MouseAction, KeyboardAction, OutputItem, IOrchestrator, ResponseMessage } from '../types';
import { BrowserService } from '../services/browser';
import { SessionService } from '../services/session';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class WebSocketHandlers {
  private orchestrator: IOrchestrator;
  private browser: BrowserService;
  private session: SessionService;
  private clients: Map<string, WebSocket> = new Map();

  constructor(orchestrator: IOrchestrator, browser: BrowserService, session: SessionService) {
    this.orchestrator = orchestrator;
    this.browser = browser;
    this.session = session;
    
    // Initialize screenshot streaming
    this.initializeScreenshotStream();
  }

  private initializeScreenshotStream(): void {
    // Start high-FPS stream that broadcasts to all connected clients
    this.browser.startHighFPSStream((frameData: any) => {
      this.broadcastFrame(frameData);
    });
    
    logger.info('High-FPS streaming initialized');
  }

  private broadcastFrame(frameData: any): void {
    if (frameData.type === 'frame') {
      // CDP screencast frame - send as optimized binary
      const frameBuffer = Buffer.from(frameData.data, 'base64');
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          // Send frame with metadata header
          const metadata = JSON.stringify({
            type: 'cdp_frame',
            timestamp: frameData.metadata.timestamp,
            fps: frameData.metadata.targetFps || 30,
            quality: frameData.metadata.quality || 80,
            viewport: frameData.metadata.viewport
          });
          
          // Send metadata first, then binary frame data
          client.send(metadata);
          client.send(frameBuffer, { binary: true });
        }
      });
    } else if (frameData.type === 'screenshot') {
      // Fallback screenshot mode
      const screenshotBuffer = Buffer.from(frameData.data, 'base64');
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(screenshotBuffer, { binary: true });
        }
      });
    } else if (frameData.type === 'dom_update' || frameData.type === 'lifecycle') {
      // Send DOM/lifecycle events as JSON
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(frameData));
        }
      });
    }
  }

  handleConnection(ws: WebSocket, clientId: string): void {
    logger.info(`WebSocket client connected: ${clientId}`);
    this.clients.set(clientId, ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        logger.error('Failed to handle WebSocket message', error);
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      logger.info(`WebSocket client disconnected: ${clientId}`);
      this.clients.delete(clientId);
      
      // If no clients are connected, we could optionally stop the screenshot stream
      // to save resources (but keeping it running for now for better UX)
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}`, error);
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({ 
      type: 'connected', 
      sessionId: this.session.getState().id 
    }));
    
    // Send streaming info immediately after connection
    ws.send(JSON.stringify({ 
      type: 'streaming_info', 
      info: this.browser.getStreamingInfo()
    }));
  }

  private async handleMessage(ws: WebSocket, message: any): Promise<void> {
    try {
      logger.info('WebSocket message received', { type: message.type });

      switch (message.type) {
        case 'instruction':
          await this.handleInstruction(ws, message.data);
          break;

        case 'clarification_response':
          await this.handleClarificationResponse(ws, message.data);
          break;

        case 'mouse_action':
          await this.handleMouseAction(ws, message.data);
          break;

        case 'mouse_position':
          await this.handleMousePosition(ws, message.data);
          break;

        case 'keyboard_action':
          await this.handleKeyboardAction(ws, message.data);
          break;

        case 'enable_manual_intervention':
          await this.handleEnableManualIntervention(ws);
          break;

        case 'disable_manual_intervention':
          await this.handleDisableManualIntervention(ws);
          break;

        case 'stop_instruction':
          await this.handleStopInstruction(ws, message.data);
          break;

        case 'mark_instruction_complete':
          await this.handleMarkInstructionComplete(ws, message.data);
          break;

        case 'clear_history':
          this.session.clearHistory();
          ws.send(JSON.stringify({ type: 'history_cleared' }));
          break;

        case 'get_outputs':
          ws.send(JSON.stringify({ 
            type: 'outputs', 
            outputs: this.session.getOutputs() 
          }));
          break;

        case 'get_streaming_info':
          ws.send(JSON.stringify({ 
            type: 'streaming_info', 
            info: this.browser.getStreamingInfo()
          }));
          break;

        default:
          logger.error('Unknown message type', { type: message.type, data: message.data });
          ws.send(JSON.stringify({
            type: 'error',
            error: `Unknown message type: ${message.type}`
          }));
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Failed to process message'
      }));
    }
  }

  private async handleInstruction(ws: WebSocket, data: any): Promise<void> {
    const instruction: InstructionMessage = {
      id: data.id || crypto.randomUUID(), // Use client ID if provided, otherwise generate
      text: data.text,
      sessionId: this.session.getState().id,
      timestamp: Date.now()
    };

    logger.agent(`Received instruction: ${instruction.text}`, { 
      instructionId: instruction.id,
      timestamp: instruction.timestamp 
    });

    // Add to session history
    this.session.addInstruction(instruction);

    // Process the instruction
    const response = await this.orchestrator.processInstruction(instruction);

    logger.agent(`Instruction processing completed: ${instruction.text}`, { 
      instructionId: instruction.id,
      status: response.status 
    });

    // Send response
    const responseMessage = {
      type: 'instruction_response',
      response
    };
    
    logger.agent(`Sending instruction response to UI`, { 
      instructionId: instruction.id,
      status: response.status,
      hasExecuted: !!response.executed,
      responseId: response.id
    });
    
    ws.send(JSON.stringify(responseMessage));

    // Generate rich output content based on response status
    if (response.status === 'success') {
      // Create detailed execution report
      const executionReport = this.generateExecutionReport(instruction.text, response);
      
      const output = {
        id: uuidv4(),
        type: 'text' as const,
        content: response.executed?.join('\n') || '',
      };
      this.session.addOutput(output);
      
      this.broadcastOutput({
        id: output.id,
        title: `✅ Task Completed: ${instruction.text.slice(0, 50)}${instruction.text.length > 50 ? '...' : ''}`,
        content: executionReport,
        timestamp: Date.now(),
        type: 'success'
      });
    } else if (response.status === 'manual_intervention_required') {
      // Create manual intervention report
      const manualInterventionReport = this.generateManualInterventionReport(instruction.text, response);
      
      this.broadcastOutput({
        id: uuidv4(),
        title: '🚨 Manual Intervention Required',
        content: manualInterventionReport,
        timestamp: Date.now(),
        type: 'text'
      });
    } else if (response.status === 'error') {
      // Create error report
      const errorReport = this.generateErrorReport(instruction.text, response);
      
      this.broadcastOutput({
        id: uuidv4(),
        title: '❌ Task Failed',
        content: errorReport,
        timestamp: Date.now(),
        type: 'error'
      });
    }
  }

  private generateExecutionReport(instruction: string, response: ResponseMessage): string {
    const executedActions = response.executed || [];
    const currentUrl = response.currentUrl || 'Unknown';
    const pageTitle = response.pageTitle || 'Unknown Page';
    
    let report = `# ✅ Task Completed\n\n`;
    report += `**Instruction:** ${instruction}\n\n`;
    report += `**Final Location:** [${pageTitle}](${currentUrl})\n\n`;
    
    if (executedActions.length > 0) {
      report += `**Actions Performed:**\n`;
      executedActions.forEach((action: string, index: number) => {
        report += `${index + 1}. ${action}\n`;
      });
      report += `\n`;
    }
    
    report += `Task completed successfully with ${executedActions.length} action${executedActions.length === 1 ? '' : 's'}.`;
    
    return report;
  }

  private generateManualInterventionReport(instruction: string, response: ResponseMessage): string {
    const manualIntervention = response.manualInterventionRequest;
    if (!manualIntervention) return 'Manual intervention required but no details provided.';
    
    let report = `# 🚨 Manual Action Required\n\n`;
    report += `**Instruction:** ${instruction}\n\n`;
    report += `**Location:** [${response.currentUrl || 'Unknown'}](${response.currentUrl || 'Unknown'})\n\n`;
    
    report += `**Why:** ${manualIntervention.reason}\n\n`;
    report += `**Action Needed:** ${manualIntervention.suggestion}\n\n`;
    
    report += `Please complete the manual action and click "Mark as Done" to continue.`;
    
    return report;
  }

  private generateErrorReport(instruction: string, response: ResponseMessage): string {
    const error = response.error || 'Unknown error occurred';
    
    let report = `# ❌ Task Failed\n\n`;
    report += `**Instruction:** ${instruction}\n\n`;
    
    report += `**Error:** ${error}\n\n`;
    
    report += `**Next Steps:**\n`;
    report += `- Try rephrasing with more specific details\n`;
    report += `- Check if manual intervention is needed\n`;
    report += `- Break complex tasks into smaller steps`;
    
    return report;
  }

  private async handleClarificationResponse(ws: WebSocket, data: any): Promise<void> {
    const { instructionId, clarificationText, originalInstruction } = data;

    logger.agent(`Received clarification response for instruction ${instructionId}`, { 
      clarificationText,
      originalInstruction 
    });

    // Create a new instruction with the original instruction + clarification combined
    const combinedInstruction = `${originalInstruction}. ${clarificationText}`;
    
    const clarifiedInstruction: InstructionMessage = {
      id: instructionId, // Keep the same ID to maintain context
      text: combinedInstruction, // Use the combined instruction
      sessionId: this.session.getState().id,
      timestamp: Date.now(),
      
    };

    logger.agent('Processing combined instruction after clarification', {
      originalInstruction,
      clarificationText,
      combinedInstruction
    });

    // Process the clarified instruction
    const response = await this.orchestrator.processInstruction(clarifiedInstruction);

    logger.agent(`Clarified instruction processing completed`, { 
      instructionId,
      status: response.status 
    });

    // Send response
    const responseMessage = {
      type: 'instruction_response',
      response
    };
    
    logger.agent(`Sending clarification response to UI`, { 
      instructionId,
      status: response.status,
      hasExecuted: !!response.executed,
      responseId: response.id
    });
    
    ws.send(JSON.stringify(responseMessage));

    // Generate rich output content for clarification response
    if (response.status === 'success') {
      // Create detailed execution report for clarified instruction
      const executionReport = this.generateExecutionReport(combinedInstruction, response);
      
      const output = {
        id: uuidv4(),
        type: 'text' as const,
        content: response.executed?.join('\n') || '',
      };
      this.session.addOutput(output);
      
      this.broadcastOutput({
        id: output.id,
        title: `✅ Clarified Task Completed: ${originalInstruction.slice(0, 40)}...`,
        content: executionReport,
        timestamp: Date.now(),
        type: 'success'
      });
    } else if (response.status === 'manual_intervention_required') {
      // Create manual intervention report
      const manualInterventionReport = this.generateManualInterventionReport(combinedInstruction, response);
      
      this.broadcastOutput({
        id: uuidv4(),
        title: '🚨 Manual Intervention Required',
        content: manualInterventionReport,
        timestamp: Date.now(),
        type: 'text'
      });
    } else if (response.status === 'error') {
      // Create error report
      const errorReport = this.generateErrorReport(combinedInstruction, response);
      
      this.broadcastOutput({
        id: uuidv4(),
        title: '❌ Clarified Task Failed',
        content: errorReport,
        timestamp: Date.now(),
        type: 'error'
      });
    }
  }

  private async handleMouseAction(ws: WebSocket, data: MouseAction): Promise<void> {
    try {
      await this.browser.executeMouseAction(data);
      ws.send(JSON.stringify({ 
        type: 'mouse_action_complete', 
        action: data 
      }));
    } catch (error) {
      logger.error('Mouse action failed', error);
      ws.send(JSON.stringify({ 
        type: 'mouse_action_error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }

  private async handleMousePosition(_ws: WebSocket, data: any): Promise<void> {
    try {
      const { x, y } = data;
      
      // Update mouse position to trigger hover effects
      await this.browser.updateMousePosition(x, y);
      
      // Update visual cursor position
      await this.browser.updateCursorPosition(x, y);
    } catch (error) {
      // Silently ignore position update errors to avoid spamming
    }
  }

  private async handleEnableManualIntervention(ws: WebSocket): Promise<void> {
    try {
      await this.browser.enableManualInterventionMode();
      ws.send(JSON.stringify({ 
        type: 'manual_intervention_enabled' 
      }));
      logger.info('Manual intervention mode enabled');
    } catch (error) {
      logger.error('Failed to enable manual intervention mode', error);
      ws.send(JSON.stringify({ 
        type: 'manual_intervention_error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }

  private async handleDisableManualIntervention(ws: WebSocket): Promise<void> {
    try {
      await this.browser.disableManualInterventionMode();
      ws.send(JSON.stringify({ 
        type: 'manual_intervention_disabled' 
      }));
      logger.info('Manual intervention mode disabled');
    } catch (error) {
      logger.error('Failed to disable manual intervention mode', error);
      ws.send(JSON.stringify({ 
        type: 'manual_intervention_error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }

  private async handleKeyboardAction(ws: WebSocket, data: KeyboardAction): Promise<void> {
    try {
      await this.browser.executeKeyboardAction(data);
      ws.send(JSON.stringify({ 
        type: 'keyboard_action_complete', 
        action: data 
      }));
    } catch (error) {
      logger.error('Keyboard action failed', error);
      ws.send(JSON.stringify({ 
        type: 'keyboard_action_error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }

  private async handleStopInstruction(ws: WebSocket, data: any): Promise<void> {
    try {
      const { instructionId } = data;
      
      if (!instructionId) {
        throw new Error('Instruction ID is required');
      }

      logger.info('Received stop instruction request', { instructionId });

      // Add stop signal to action history so future LLM calls know it was stopped
      this.session.addAction(`INSTRUCTION_STOPPED: User manually stopped instruction ${instructionId}`);

      // Signal the orchestrator to stop processing if it's currently running
      if (this.orchestrator.isCurrentlyProcessing()) {
        const currentInstructionId = (this.orchestrator as any).getCurrentInstructionId?.();
        if (currentInstructionId === instructionId) {
          logger.info('Signaling orchestrator to stop current processing');
          // Pass the instruction ID to the state manager
          (this.orchestrator as any).stopCurrentInstruction?.(instructionId);
          logger.agent('🛑 Stop signal sent to orchestrator');
        } else {
          logger.error('Instruction ID mismatch - cannot stop', { 
            requested: instructionId, 
            current: currentInstructionId 
          });
        }
      }

      // Send confirmation back to client
      ws.send(JSON.stringify({
        type: 'instruction_stopped',
        data: {
          instructionId,
          message: 'Instruction stop signal sent successfully'
        }
      }));

      logger.info('Stop instruction signal processed', { instructionId });
    } catch (error) {
      logger.error('Error handling stop instruction', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: `Failed to stop instruction: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  }

  private async handleMarkInstructionComplete(ws: WebSocket, data: any): Promise<void> {
    try {
      const { instructionId } = data;
      
      if (!instructionId) {
        throw new Error('Instruction ID is required');
      }

      logger.info('Received mark instruction complete request', { instructionId });

      // Add completion signal to action history so future LLM calls know it was marked complete
      this.session.addAction(`INSTRUCTION_COMPLETED: User manually marked instruction ${instructionId} as complete`);

      // Signal the orchestrator that this task should be considered complete
      if (this.orchestrator.isCurrentlyProcessing()) {
        const currentInstructionId = (this.orchestrator as any).getCurrentInstructionId?.();
        if (currentInstructionId === instructionId) {
          logger.info('Signaling orchestrator that task is complete');
          // Pass the instruction ID to the state manager
          (this.orchestrator as any).markCurrentInstructionComplete?.(instructionId);
          logger.agent('✅ Task completion signal sent to orchestrator');
        } else {
          logger.error('Instruction ID mismatch - cannot mark complete', { 
            requested: instructionId, 
            current: currentInstructionId 
          });
        }
      }

      // Generate completion output for the report
      const completionOutputItem: OutputItem = {
        id: `manual_completion_${instructionId}_${Date.now()}`,
        title: 'Task Manually Completed',
        content: `**User Action:** Task has been manually marked as complete.\n\n**Instruction ID:** ${instructionId}\n\n**Status:** The user has indicated that the task objective has been achieved, even though the agent was still processing.`,
        timestamp: Date.now(),
        type: 'success'
      };

      // Broadcast the completion output to all connected clients
      this.broadcastOutput(completionOutputItem);

      // Send confirmation back to client
      ws.send(JSON.stringify({
        type: 'instruction_completed',
        data: {
          instructionId,
          message: 'Instruction marked as complete successfully'
        }
      }));

      logger.info('Mark instruction complete signal processed', { instructionId });
    } catch (error) {
      logger.error('Error handling mark instruction complete', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: `Failed to mark instruction complete: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  }

  broadcastScreenshot(screenshot: Buffer): void {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(screenshot, { binary: true });
      }
    });
  }

  broadcastLog(log: any): void {
    const message = JSON.stringify({ type: 'log', log });
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastOutput(output: OutputItem): void {
    const message = JSON.stringify({ type: 'output', output });
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getConnectedClients(): number {
    return this.clients.size;
  }
} 