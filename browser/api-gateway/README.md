# Browser Agent API Gateway

The API Gateway serves as the entry point for the Browser Agent system, handling authentication, request routing, and WebSocket proxying between the UI and the ReAct Agent service.

## Features

- **Authentication**: Auth0 JWT token validation
- **Rate Limiting**: Configurable request rate limiting
- **WebSocket Proxy**: Real-time communication with agent service
- **Health Monitoring**: Service health checks and monitoring
- **Request Logging**: Comprehensive request/response logging
- **CORS Support**: Cross-origin resource sharing configuration

## API Endpoints

### HTTP Endpoints

#### `POST /api/session`
Create a new browser automation session.

**Request:**
```json
{
  "userId": "user123"
}
```

**Response:**
```json
{
  "sessionId": "session-uuid"
}
```

#### `POST /api/command`
Send a command to the agent.

**Request:**
```json
{
  "command": "run_agent",
  "data": {
    "prompt": "Go to Google and search for 'AI news'",
    "mission": "Find latest AI news"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Command executed successfully"
}
```

#### `GET /api/session/:sessionId/logs?token=<jwt>`
Server-Sent Events stream for real-time logs.

**Response:** Stream of log events in SSE format.

#### `GET /health`
Service health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "apiGateway": "healthy",
    "agentService": "healthy"
  },
  "websockets": {
    "totalSessions": 2,
    "totalConnections": 3
  }
}
```

### WebSocket Endpoints

All WebSocket endpoints require authentication via token query parameter.

#### `WS /api/session/:sessionId/agent-com?token=<jwt>`
Real-time browser screenshots stream.

#### `WS /api/session/:sessionId/instructions?token=<jwt>`
Instruction messaging between UI and agent.

#### `WS /api/session/:sessionId/output?token=<jwt>`
Agent output and results stream.

## Environment Variables

Copy `env.example` to `.env` and configure:

```env
PORT=3001
AGENT_SERVICE_URL=http://localhost:3002
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=your-api-audience
NODE_ENV=development

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
```

## Installation & Development

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │────│  API Gateway    │────│  Agent Service  │
│                 │    │                 │    │                 │
│ - Auth0         │    │ - JWT Validation│    │ - ReAct Engine  │
│ - WebSockets    │    │ - Rate Limiting │    │ - Playwright    │
│ - Screenshots   │    │ - WS Proxy      │    │ - LLM Client    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Security

- **JWT Validation**: All requests require valid Auth0 JWT tokens
- **Rate Limiting**: Configurable rate limiting to prevent abuse
- **CORS**: Proper CORS configuration for production
- **Input Validation**: Request validation and sanitization
- **Error Handling**: Secure error responses without sensitive data

## Monitoring

The service provides comprehensive logging and health monitoring:

- **Request Logging**: All HTTP requests and responses
- **WebSocket Events**: Connection lifecycle and message flow
- **Error Tracking**: Detailed error logging with context
- **Health Checks**: Service dependency health monitoring

## Production Deployment

1. Set `NODE_ENV=production`
2. Configure production Auth0 settings
3. Set appropriate CORS origins
4. Configure rate limiting for production load
5. Set up monitoring and alerting
6. Use process manager (PM2, Docker, etc.)

## Development Notes

- The service is designed to be stateless for horizontal scaling
- WebSocket connections are managed in-memory (consider Redis for multi-instance deployments)
- All agent communication is proxied through this gateway
- Comprehensive error handling with proper HTTP status codes
- TypeScript for type safety and better developer experience 