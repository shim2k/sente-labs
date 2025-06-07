import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { agentSpawner } from '../services/agentSpawner';
import { AuthenticatedRequest, CreateSessionRequest, ApiError } from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /api/session - Create a new session with dedicated agent
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { userId, debugMode }: CreateSessionRequest = req.body;
    
    // Use authenticated user ID if not provided
    const actualUserId = userId || req.user?.sub;
    
    if (!actualUserId) {
      const error: ApiError = {
        message: 'User ID is required',
        code: 'MISSING_USER_ID',
        statusCode: 400
      };
      return res.status(400).json(error);
    }

    // Generate unique session ID
    const sessionId = uuidv4();

    // Spawn dedicated agent instance for this session (with optional debug mode)
    const agentInstance = await agentSpawner.spawnAgent(sessionId, actualUserId, debugMode);
    
    logger.info('Session created with dedicated agent', {
      userId: actualUserId,
      sessionId,
      agentPort: agentInstance.port,
      debugPort: agentInstance.debugPort,
      debugMode: !!debugMode,
      wsUrl: agentInstance.wsUrl
    });

    // Return session info with direct WebSocket URL
    const sessionResponse = {
      sessionId,
      wsUrl: agentInstance.wsUrl,
      httpUrl: agentInstance.httpUrl,
      status: agentInstance.status,
      debugPort: agentInstance.debugPort,
      debugMode: !!agentInstance.debugPort,
      createdAt: agentInstance.createdAt
    };

    res.json(sessionResponse);
    
  } catch (error) {
    logger.error('Session creation failed', { error });
    
    const apiError: ApiError = {
      message: 'Failed to create session',
      code: 'SESSION_CREATION_FAILED',
      statusCode: 500
    };
    
    res.status(500).json(apiError);
  }
});

// GET /api/session/:sessionId - Get session info
router.get('/:sessionId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.params;
    
    const agentInstance = agentSpawner.getAgent(sessionId);
    
    if (!agentInstance) {
      const error: ApiError = {
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        statusCode: 404
      };
      return res.status(404).json(error);
    }

    // Update activity
    agentSpawner.updateAgentActivity(sessionId);

    const sessionInfo = {
      sessionId,
      userId: agentInstance.userId,
      wsUrl: agentInstance.wsUrl,
      httpUrl: agentInstance.httpUrl,
      debugPort: agentInstance.debugPort,
      status: agentInstance.status,
      createdAt: agentInstance.createdAt,
      lastActivity: agentInstance.lastActivity
    };

    res.json(sessionInfo);
    
  } catch (error) {
    logger.error('Failed to get session info', { sessionId: req.params.sessionId, error });
    
    const apiError: ApiError = {
      message: 'Failed to get session info',
      code: 'SESSION_INFO_FAILED',
      statusCode: 500
    };
    
    res.status(500).json(apiError);
  }
});

// DELETE /api/session/:sessionId - Stop session and agent
router.delete('/:sessionId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.params;
    
    const agentInstance = agentSpawner.getAgent(sessionId);
    
    if (!agentInstance) {
      const error: ApiError = {
        message: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        statusCode: 404
      };
      return res.status(404).json(error);
    }

    // Stop the agent instance
    await agentSpawner.stopAgent(sessionId);
    
    logger.info('Session stopped', {
      sessionId,
      userId: agentInstance.userId,
      port: agentInstance.port
    });

    res.json({ 
      message: 'Session stopped successfully',
      sessionId 
    });
    
  } catch (error) {
    logger.error('Failed to stop session', { sessionId: req.params.sessionId, error });
    
    const apiError: ApiError = {
      message: 'Failed to stop session',
      code: 'SESSION_STOP_FAILED',
      statusCode: 500
    };
    
    res.status(500).json(apiError);
  }
});

// GET /api/sessions - Get all active sessions (admin endpoint)
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const activeAgents = agentSpawner.getActiveAgents();
    const stats = agentSpawner.getStats();
    
    const sessions = activeAgents.map(agent => ({
      sessionId: agent.sessionId,
      userId: agent.userId,
      wsUrl: agent.wsUrl,
      httpUrl: agent.httpUrl,
      debugPort: agent.debugPort,
      status: agent.status,
      createdAt: agent.createdAt,
      lastActivity: agent.lastActivity
    }));

    res.json({
      sessions,
      stats
    });
    
  } catch (error) {
    logger.error('Failed to get sessions', { error });
    
    const apiError: ApiError = {
      message: 'Failed to get sessions',
      code: 'SESSIONS_LIST_FAILED',
      statusCode: 500
    };
    
    res.status(500).json(apiError);
  }
});

export default router; 