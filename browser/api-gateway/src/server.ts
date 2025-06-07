import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import WebSocket from 'ws';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import middleware and routes
import { createRateLimit } from './middleware/rateLimit';
import { wsHandler } from './websocket/handler';
import sessionRoutes from './routes/session';
import commandRoutes from './routes/command';
import logsRoutes from './routes/logs';
import { logger } from './utils/logger';
import { agentSpawner } from './services/agentSpawner';

// Create Express app
const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Middleware setup
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Add your production domains
    : true, // Allow all origins in development
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(createRateLimit());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const agentStats = agentSpawner.getStats();
    const wsStats = wsHandler.getStats();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        apiGateway: 'healthy',
        spawnedAgents: {
          total: agentStats.totalAgents,
          running: agentStats.runningAgents,
          starting: agentStats.startingAgents,
          stopping: agentStats.stoppingAgents
        }
      },
      websockets: wsStats
    };
    
    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/session', sessionRoutes);
app.use('/api/command', commandRoutes);
app.use('/api/logs', logsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((error: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error', { error, path: req.path });
  
  res.status(500).json({
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server
});

// Handle WebSocket connections
wss.on('connection', (ws, request) => {
  wsHandler.handleConnection(ws, request);
});

// Start heartbeat for WebSocket connections
wsHandler.startHeartbeat();

// Start server
server.listen(port, () => {
  logger.info('API Gateway started', {
    port,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}); 