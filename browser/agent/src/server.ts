import express from 'express';
import { createServer } from 'http';
import WebSocket from 'ws';
import cors from 'cors';
import { BrowserService } from './services/browser';
import { SessionService } from './services/session';
import { OrchestratorService } from './services/orchestrator';
import { WebSocketHandlers } from './websocket/handlers';
import { logger } from './utils/logger';

class AgentServer {
  private app: express.Express;
  private server: any;
  private wss!: WebSocket.Server;
  private browser!: BrowserService;
  private session!: SessionService;
  private orchestrator!: OrchestratorService;
  private wsHandlers!: WebSocketHandlers;
  private parentPid: number;
  private parentCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.app = express();

    // Store parent process ID for monitoring
    this.parentPid = process.ppid;

    logger.info('Starting Agent Server with ReAct framework');
    logger.info(`Parent process PID: ${this.parentPid}, Current PID: ${process.pid}`);

    this.setupMiddleware();
    this.initializeServices();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupParentProcessMonitoring();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private initializeServices(): void {
    this.browser = new BrowserService();
    this.session = new SessionService();
    this.orchestrator = new OrchestratorService(this.browser, this.session);
    this.wsHandlers = new WebSocketHandlers(this.orchestrator, this.browser, this.session);

    // Connect logger to WebSocket broadcasting
    logger.addHandler((logEntry) => {
      this.wsHandlers.broadcastLog(logEntry);
    });

    logger.info('Logger connected to WebSocket broadcasting');
  }

  private setupRoutes(): void {
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        orchestratorType: 'ReAct',
        processing: this.orchestrator.isCurrentlyProcessing()
      });
    });

    this.app.get('/status', (_req, res) => {
      res.json({
        orchestratorType: 'ReAct',
        isProcessing: this.orchestrator.isCurrentlyProcessing(),
        sessionInfo: this.session.getState(),
        browserContext: this.browser.getContext()
      });
    });

    // Screenshot endpoint for debugging
    this.app.get('/screenshot', async (_req, res) => {
      try {
        await this.browser.screenshot();
        res.json({ message: 'Screenshot taken' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to take screenshot' });
      }
    });
  }

  private setupWebSocket(): void {
    this.server = createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on('connection', (ws, _req) => {
      logger.info('New WebSocket connection established');

      // Send welcome message with orchestrator type
      ws.send(JSON.stringify({
        type: 'connected',
        orchestratorType: 'ReAct',
        sessionId: this.session.getState().id,
        timestamp: Date.now()
      }));

      // Use existing WebSocket handler pattern with client ID
      const clientId = require('uuid').v4();
      this.wsHandlers.handleConnection(ws, clientId);
    });
  }

  private setupParentProcessMonitoring(): void {
    // Check for parent process every 5 seconds
    this.parentCheckInterval = setInterval(() => {
      this.checkParentProcess();
    }, 5000);

    logger.info(`Parent process monitoring started - watching PID ${this.parentPid}`);
  }

  private checkParentProcess(): void {
    try {
      // Check if parent process still exists
      if (this.parentPid === 1) {
        // Parent PID 1 means we were spawned by init (parent died)
        logger.info('Parent process died (orphaned to init), shutting down gracefully...');
        this.gracefulShutdown();
        return;
      }

      // On Unix systems, we can check if the parent process still exists
      if (process.platform !== 'win32') {
        try {
          // This will throw if process doesn't exist
          process.kill(this.parentPid, 0);
        } catch (error) {
          logger.info(`Parent process ${this.parentPid} no longer exists, shutting down gracefully...`);
          this.gracefulShutdown();
          return;
        }
      }

      // Also check if our PPID changed (parent died and we got re-parented)
      if (process.ppid !== this.parentPid) {
        logger.info(`Parent process changed from ${this.parentPid} to ${process.ppid}, shutting down gracefully...`);
        this.gracefulShutdown();
      }
    } catch (error) {
      logger.error('Error checking parent process:', error);
    }
  }

  public async gracefulShutdown(): Promise<void> {
    try {
      await this.stop();
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  }

  async start(port: number = 4001): Promise<void> {
    try {
      // Initialize browser
      await this.browser.initialize();
      logger.info('Browser service initialized');

      // Start server
      this.server.listen(port, () => {
        logger.info(`Agent server running on port ${port}`);
        logger.info(`WebSocket available at ws://localhost:${port}`);
        logger.info(`Orchestrator mode: ReAct`);

        logger.info('🧠 ReAct framework active - reasoning and acting enabled');
      });

    } catch (error) {
      logger.error('Failed to start agent server', error);
      process.exit(1);
    }
  }

  async stop(): Promise<void> {

    if (this.browser) {
      await this.browser.close();
    }

    if (this.wss) {
      this.wss.close();
    }

    if (this.server) {
      this.server.close();
    }

    if (this.parentCheckInterval) {
      clearInterval(this.parentCheckInterval);
    }

    logger.info('Agent server stopped');
  }
}

// Create global server instance for signal handlers
let serverInstance: AgentServer;

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  if (serverInstance) {
    await serverInstance.gracefulShutdown();
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  if (serverInstance) {
    await serverInstance.gracefulShutdown();
  } else {
    process.exit(0);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', () => {
  if (serverInstance) {
    serverInstance.gracefulShutdown().finally(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', () => {
  if (serverInstance) {
    serverInstance.gracefulShutdown().finally(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Start the server
serverInstance = new AgentServer();
const port = parseInt(process.env.PORT || '4001');
serverInstance.start(port); 