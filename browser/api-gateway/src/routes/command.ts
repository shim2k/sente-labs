import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { agentSpawner } from '../services/agentSpawner';
import { AuthenticatedRequest, SendCommandRequest, ApiError } from '../types';
import { logger } from '../utils/logger';
import axios from 'axios';

const router = Router();

// POST /api/command - Send command to agent
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const command: SendCommandRequest = req.body;
    
    // Validate command structure
    if (!command.command) {
      const error: ApiError = {
        message: 'Command is required',
        code: 'MISSING_COMMAND',
        statusCode: 400
      };
      return res.status(400).json(error);
    }

    // Validate command type
    if (!['run_agent', 'complete_task', 'mouse_action', 'manual_intervention_complete'].includes(command.command)) {
      const error: ApiError = {
        message: 'Invalid command type',
        code: 'INVALID_COMMAND',
        statusCode: 400
      };
      return res.status(400).json(error);
    }

    // For run_agent command, prompt is required
    if (command.command === 'run_agent' && !command.data?.prompt) {
      const error: ApiError = {
        message: 'Prompt is required for run_agent command',
        code: 'MISSING_PROMPT',
        statusCode: 400
      };
      return res.status(400).json(error);
    }

    // For mouse_action command, validate mouse action data
    if (command.command === 'mouse_action') {
      if (!command.data?.actionType) {
        const error: ApiError = {
          message: 'Action type is required for mouse_action command',
          code: 'MISSING_ACTION_TYPE',
          statusCode: 400
        };
        return res.status(400).json(error);
      }

      if (!['mouse_move', 'mouse_click', 'mouse_down', 'mouse_up'].includes(command.data.actionType)) {
        const error: ApiError = {
          message: 'Invalid mouse action type',
          code: 'INVALID_ACTION_TYPE',
          statusCode: 400
        };
        return res.status(400).json(error);
      }

      if (typeof command.data.x !== 'number' || typeof command.data.y !== 'number') {
        const error: ApiError = {
          message: 'X and Y coordinates are required for mouse actions',
          code: 'MISSING_COORDINATES',
          statusCode: 400
        };
        return res.status(400).json(error);
      }
    }

    // Extract sessionId from headers or body (flexible approach)
    const sessionId = req.headers['x-session-id'] as string || req.body.sessionId;
    
    if (!sessionId) {
      const error: ApiError = {
        message: 'Session ID is required',
        code: 'MISSING_SESSION_ID',
        statusCode: 400
      };
      return res.status(400).json(error);
    }

    // Get the spawned agent instance for this session
    const agentInstance = agentSpawner.getAgent(sessionId);
    
    if (!agentInstance) {
      const error: ApiError = {
        message: 'Session not found or agent not available',
        code: 'SESSION_NOT_FOUND',
        statusCode: 404
      };
      return res.status(404).json(error);
    }

    // Update agent activity
    agentSpawner.updateAgentActivity(sessionId);

    // Send command to the specific spawned agent instance
    const response = await axios.post(
      `${agentInstance.httpUrl}/api/session/${sessionId}/command`,
      command,
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    logger.info('Command executed', {
      userId: req.user?.sub,
      sessionId,
      command: command.command,
      agentPort: agentInstance.port
    });

    res.json(response.data);
    
  } catch (error) {
    logger.error('Command execution failed', { error });
    
    const apiError: ApiError = {
      message: 'Failed to execute command',
      code: 'COMMAND_EXECUTION_FAILED',
      statusCode: 500
    };
    
    res.status(500).json(apiError);
  }
});

export default router; 