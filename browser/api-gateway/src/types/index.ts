import { Request } from 'express';

// Auth types
export interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    email?: string;
  };
}

export interface JWTPayload {
  sub: string;
  email?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  iat?: number;
}

// Session types
export interface CreateSessionRequest {
  userId: string;
  debugMode?: boolean;
}

export interface CreateSessionResponse {
  sessionId: string;
  wsUrl: string;
  httpUrl: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
  debugPort?: number;
  debugMode?: boolean;
  createdAt: Date;
}

// Command types
export interface SendCommandRequest {
  command: 'run_agent' | 'complete_task' | 'mouse_action';
  data?: {
    prompt?: string;
    mission?: string;
    // Mouse action data
    actionType?: 'mouse_move' | 'mouse_click' | 'mouse_down' | 'mouse_up';
    x?: number;
    y?: number;
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
  };
}

export interface CommandResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// WebSocket types
export interface WebSocketMessage {
  type: 'screenshot' | 'instruction' | 'output' | 'log' | 'error';
  sessionId: string;
  data: any;
  timestamp: number;
}

// Agent service types
export interface AgentSession {
  sessionId: string;
  userId: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}

// Error types
export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
}

// Agent instance types
export interface AgentInstance {
  sessionId: string;
  userId: string;
  port: number;
  debugPort?: number;
  wsUrl: string;
  httpUrl: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
  createdAt: Date;
  lastActivity: Date;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  wsUrl: string;
  httpUrl: string;
  debugPort?: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
  createdAt: Date;
  lastActivity: Date;
}

export interface AgentSpawnerStats {
  totalAgents: number;
  runningAgents: number;
  startingAgents: number;
  stoppingAgents: number;
  usedPorts: number[];
  portRange: {
    min: number;
    max: number;
  };
} 