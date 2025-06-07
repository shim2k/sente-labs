import { spawn, ChildProcess } from 'child_process';
import { logger } from '../utils/logger';
import { AgentInstance } from '../types';
import axios from 'axios';
import path from 'path';

interface InternalAgentInstance extends AgentInstance {
  process: ChildProcess;
}

class AgentSpawner {
  private agents: Map<string, InternalAgentInstance> = new Map();
  private portRange = { min: 4000, max: 5000 }; // Port range for agent instances
  private debugPortRange = { min: 9000, max: 9100 }; // Debug port range
  private usedPorts: Set<number> = new Set();
  private usedDebugPorts: Set<number> = new Set();
  private agentPath: string;
  private isDebugMode: boolean;

  constructor() {
    // Path to the agent service
    this.agentPath = path.resolve(__dirname, '../../../agent');
    this.isDebugMode = process.env.AGENT_DEBUG === 'true';
    
    logger.info('Agent spawner initialized', {
      agentPath: this.agentPath,
      portRange: this.portRange,
      debugMode: this.isDebugMode,
      debugPortRange: this.isDebugMode ? this.debugPortRange : 'disabled'
    });
  }

  // Get next available port
  private getNextAvailablePort(): number {
    for (let port = this.portRange.min; port <= this.portRange.max; port++) {
      if (!this.usedPorts.has(port)) {
        this.usedPorts.add(port);
        return port;
      }
    }
    throw new Error('No available ports in range');
  }

  // Get next available debug port
  private getNextAvailableDebugPort(): number {
    for (let port = this.debugPortRange.min; port <= this.debugPortRange.max; port++) {
      if (!this.usedDebugPorts.has(port)) {
        this.usedDebugPorts.add(port);
        return port;
      }
    }
    throw new Error('No available debug ports in range');
  }

  // Release port
  private releasePort(port: number): void {
    this.usedPorts.delete(port);
  }

  // Release debug port
  private releaseDebugPort(port: number): void {
    this.usedDebugPorts.delete(port);
  }

  // Spawn a new agent instance
  async spawnAgent(sessionId: string, userId: string, debugMode?: boolean): Promise<AgentInstance & { debugPort?: number }> {
    // Check if an agent already exists for this session
    const existingAgent = this.agents.get(sessionId);
    if (existingAgent && (existingAgent.status === 'running' || existingAgent.status === 'starting')) {
      logger.info('Returning existing agent instance', {
        sessionId,
        port: existingAgent.port,
        status: existingAgent.status
      });
      
      // Update activity timestamp
      existingAgent.lastActivity = new Date();
      
      // If the agent is still starting, wait for it to be ready
      if (existingAgent.status === 'starting') {
        await this.waitForAgentReady(existingAgent);
        existingAgent.status = 'running';
      }
      
      // Return without the process property
      const { process: _, ...agentInfo } = existingAgent;
      return agentInfo;
    }

    try {
      const port = this.getNextAvailablePort();
      const wsUrl = `ws://localhost:${port}`;
      const httpUrl = `http://localhost:${port}`;
      
      // Determine if we should use debug mode
      const shouldDebug = debugMode ?? this.isDebugMode;
      let debugPort: number | undefined;
      let spawnCommand: string[];
      let spawnOptions: any;

      if (shouldDebug) {
        debugPort = this.getNextAvailableDebugPort();
        
        logger.info('Spawning agent in DEBUG mode', {
          sessionId,
          userId,
          port,
          debugPort,
          wsUrl,
          httpUrl
        });

        // Use ts-node-dev with debugging enabled
        // Note: Using 127.0.0.1 instead of 0.0.0.0 for better Chrome DevTools compatibility
        spawnCommand = [
          'npx', 'ts-node-dev',
          '--respawn',
          '--transpile-only',
          `--inspect=127.0.0.1:${debugPort}`,
          'src/server.ts'
        ];

        spawnOptions = {
          cwd: this.agentPath,
          env: {
            ...process.env,
            PORT: port.toString(),
            SESSION_ID: sessionId,
            USER_ID: userId,
            NODE_ENV: 'development'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        };
      } else {
        logger.info('Spawning agent in normal mode', {
          sessionId,
          userId,
          port,
          wsUrl,
          httpUrl
        });

        spawnCommand = ['npm', 'run', 'dev'];
        
        spawnOptions = {
          cwd: this.agentPath,
          env: {
            ...process.env,
            PORT: port.toString(),
            SESSION_ID: sessionId,
            USER_ID: userId,
            NODE_ENV: 'development'
          },
          stdio: ['pipe', 'pipe', 'pipe']
        };
      }

      // Spawn the agent process
      const agentProcess = spawn(spawnCommand[0], spawnCommand.slice(1), spawnOptions);

      const agentInstance: InternalAgentInstance & { debugPort?: number } = {
        sessionId,
        userId,
        port,
        debugPort,
        process: agentProcess,
        wsUrl,
        httpUrl,
        status: 'starting',
        createdAt: new Date(),
        lastActivity: new Date()
      };

      // Store the agent instance
      this.agents.set(sessionId, agentInstance);

      // Handle process events
      agentProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        logger.debug(`Agent ${sessionId} stdout:`, output);
        
        // Log debug connection info
        if (shouldDebug && output.includes('Debugger listening')) {
          logger.info(`🐛 Agent ${sessionId} debugger ready!`, {
            debugPort,
            autoDiscovery: 'chrome://inspect',
            manualConnection: `devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:${debugPort}`,
            instructions: [
              '1. Auto-discovery: Open chrome://inspect → Click "Open dedicated DevTools for Node"',
              `2. Manual connection: Copy this URL → devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:${debugPort}`,
              '3. Alternative: In Chrome DevTools → More tools → Remote devices → Settings → Add 127.0.0.1:' + debugPort
            ]
          });
        }
      });

      agentProcess.stderr?.on('data', (data) => {
        logger.warn(`Agent ${sessionId} stderr:`, data.toString());
      });

      agentProcess.on('exit', (code) => {
        logger.info(`Agent ${sessionId} exited`, { code });
        agentInstance.status = 'stopped';
        this.releasePort(port);
        if (debugPort) this.releaseDebugPort(debugPort);
        this.agents.delete(sessionId);
      });

      agentProcess.on('error', (error) => {
        logger.error(`Agent ${sessionId} error:`, error);
        agentInstance.status = 'stopped';
        this.releasePort(port);
        if (debugPort) this.releaseDebugPort(debugPort);
        this.agents.delete(sessionId);
      });

      // Wait for agent to be ready
      await this.waitForAgentReady(agentInstance);
      agentInstance.status = 'running';

      if (shouldDebug) {
        logger.info('🐛 Agent instance spawned in DEBUG mode!', {
          sessionId,
          port,
          debugPort,
          wsUrl,
          quickConnect: `devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:${debugPort}`,
          debugInstructions: [
            '1. AUTO-DISCOVERY: Open chrome://inspect → Look for "Remote Target" → Click "inspect"',
            `2. MANUAL CONNECTION: Copy and paste this URL into Chrome:`,
            `   devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:${debugPort}`,
            '3. ALTERNATIVE: Chrome DevTools → ⋮ menu → More tools → Remote devices → Settings → Add 127.0.0.1:' + debugPort,
            '4. Set breakpoints in TypeScript files and trigger instructions!'
          ]
        });
      } else {
        logger.info('Agent instance spawned successfully', {
          sessionId,
          port,
          wsUrl
        });
      }

      // Return without the process property
      const { process: _, ...agentInfo } = agentInstance;
      return agentInfo;

    } catch (error) {
      logger.error('Failed to spawn agent instance', { sessionId, userId, error });
      throw error;
    }
  }

  // Wait for agent to be ready
  private async waitForAgentReady(agent: InternalAgentInstance, maxAttempts = 30): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(`${agent.httpUrl}/health`, { timeout: 1000 });
        if (response.status === 200) {
          logger.info(`Agent ${agent.sessionId} is ready`, { attempt });
          return;
        }
      } catch (error) {
        // Agent not ready yet, continue waiting
      }

      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Agent ${agent.sessionId} failed to start within ${maxAttempts} seconds`);
  }

  // Get agent instance
  getAgent(sessionId: string): AgentInstance | undefined {
    const agent = this.agents.get(sessionId);
    if (!agent) return undefined;
    
    // Return without the process property
    const { process: _, ...agentInfo } = agent;
    return agentInfo;
  }

  // Stop agent instance
  async stopAgent(sessionId: string): Promise<void> {
    const agent = this.agents.get(sessionId);
    if (!agent) {
      logger.warn('Attempted to stop non-existent agent', { sessionId });
      return;
    }

    logger.info('Stopping agent instance', { sessionId, port: agent.port });
    agent.status = 'stopping';

    // Gracefully terminate the process
    agent.process.kill('SIGTERM');

    // Force kill after 10 seconds if still running
    setTimeout(() => {
      if (agent.process && !agent.process.killed) {
        logger.warn('Force killing agent process', { sessionId });
        agent.process.kill('SIGKILL');
      }
    }, 10000);
  }

  // Get all active agents
  getActiveAgents(): AgentInstance[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.status === 'running' || agent.status === 'starting')
      .map(agent => {
        const { process: _, ...agentInfo } = agent;
        return agentInfo;
      });
  }

  // Cleanup inactive agents (older than 1 hour with no activity)
  async cleanupInactiveAgents(): Promise<void> {
    const now = new Date();
    const inactiveThreshold = 60 * 60 * 1000; // 1 hour

    for (const [sessionId, agent] of this.agents.entries()) {
      const timeSinceActivity = now.getTime() - agent.lastActivity.getTime();
      
      if (timeSinceActivity > inactiveThreshold) {
        logger.info('Cleaning up inactive agent', { 
          sessionId, 
          timeSinceActivity: Math.round(timeSinceActivity / 1000 / 60) + ' minutes'
        });
        await this.stopAgent(sessionId);
      }
    }
  }

  // Update agent activity
  updateAgentActivity(sessionId: string): void {
    const agent = this.agents.get(sessionId);
    if (agent) {
      agent.lastActivity = new Date();
    }
  }

  // Get spawner stats
  getStats() {
    const agents = Array.from(this.agents.values());
    return {
      totalAgents: agents.length,
      runningAgents: agents.filter(a => a.status === 'running').length,
      startingAgents: agents.filter(a => a.status === 'starting').length,
      stoppingAgents: agents.filter(a => a.status === 'stopping').length,
      usedPorts: Array.from(this.usedPorts).sort(),
      portRange: this.portRange
    };
  }
}

// Export singleton instance
export const agentSpawner = new AgentSpawner();

// Start cleanup interval (every 10 minutes)
setInterval(() => {
  agentSpawner.cleanupInactiveAgents().catch(error => {
    logger.error('Error during agent cleanup', { error });
  });
}, 10 * 60 * 1000); 