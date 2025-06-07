# Browser Agent Service

The Agent Service is a TypeScript-based browser automation service that combines Playwright for browser control with LLM integration for natural language instruction processing.

## Architecture

The service follows a clean, modular architecture with clear separation of concerns:

```
agent/
├── src/
│   ├── server.ts          # Express + WebSocket server
│   ├── services/
│   │   ├── browser.ts     # Playwright browser control
│   │   ├── llm.ts         # OpenAI LLM integration
│   │   ├── orchestrator.ts # Coordinates LLM + Browser actions
│   │   └── session.ts     # Session state management
│   ├── websocket/
│   │   ├── handlers.ts    # WebSocket message handlers
│   │   └── streams.ts     # SSE log streaming
│   ├── types/
│   │   └── index.ts       # TypeScript interfaces
│   └── utils/
│       ├── logger.ts      # Logging utility
│       └── config.ts      # Configuration
```

## Key Features

- **Natural Language Processing**: Converts user instructions to browser actions via LLM
- **Real-time Communication**: WebSocket for bidirectional communication
- **Screenshot Streaming**: Binary WebSocket frames for efficient screenshot transfer
- **Manual Intervention**: Detects when human help is needed (captchas, complex auth)
- **Error Recovery**: Automatic retry and recovery strategies
- **Session Management**: Maintains context and action history
- **Logging**: Comprehensive logging with SSE streaming

## Services

### Browser Service
- Manages Playwright Chromium browser instance
- Handles navigation, clicks, typing, scrolling
- Captures and streams screenshots
- Executes mouse actions with coordinate precision
- Improved stability and performance compared to Puppeteer

### LLM Service
- Integrates with OpenAI API using function calling
- Processes natural language instructions
- Generates structured action plans
- Analyzes errors for recovery strategies

### Orchestrator Service
- Coordinates between LLM and Browser services
- Implements the ReAct (Reasoning + Acting) loop
- Manages execution flow and error handling
- Determines when manual intervention is needed

### Session Service
- Maintains session state and context
- Tracks instruction and action history
- Manages output collection
- Monitors session activity

## API Endpoints

### HTTP Endpoints

#### `GET /health`
Health check endpoint returning service status.

```json
{
  "status": "healthy",
  "sessionId": "session-uuid",
  "connectedClients": 2,
  "sseClients": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `GET /logs`
Server-Sent Events stream for real-time logs.

### WebSocket Protocol

#### Connection
Connect to `ws://localhost:{PORT}` to establish WebSocket connection.

#### Message Types

**Instruction Message:**
```json
{
  "type": "instruction",
  "data": {
    "id": "msg-uuid",
    "text": "Navigate to google.com and search for AI news"
  }
}
```

**Mouse Action:**
```json
{
  "type": "mouse_action",
  "data": {
    "actionType": "click",
    "x": 100,
    "y": 200,
    "button": "left"
  }
}
```

**Set Mission:**
```json
{
  "type": "set_mission",
  "data": {
    "mission": "Find and summarize latest AI news"
  }
}
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Session Configuration
SESSION_ID=
USER_ID=

# LLM Configuration
OPENAI_API_KEY=your-openai-api-key
LLM_MODEL=gpt-4-turbo-preview
LLM_TEMPERATURE=0.7

# Browser Configuration
HEADLESS=true
VIEWPORT_WIDTH=1280
VIEWPORT_HEIGHT=720

# WebSocket Configuration
WS_HEARTBEAT_INTERVAL=30000
SCREENSHOT_INTERVAL=1000

# Logging
LOG_LEVEL=info
```

## Installation

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

## Configuration

The agent can be configured using environment variables:

### Core Settings

- `PORT`: Server port (default: 4000)
- `HEADLESS`: Run browser in headless mode (default: true)
- `VIEWPORT_WIDTH`: Browser viewport width (default: 1280)
- `VIEWPORT_HEIGHT`: Browser viewport height (default: 720)

### Streaming Configuration

The browser agent supports two streaming modes for real-time browser viewing:

#### Screenshot Mode (Recommended)
- **Configuration**: `ENABLE_CDP_STREAMING=false` (default)
- **Performance**: Lower CPU usage, stable performance
- **FPS**: Configurable via `SCREENSHOT_INTERVAL` (default: 50ms = 20 FPS)
- **Quality**: PNG screenshots, larger file sizes
- **Stability**: High reliability, no process leaks

#### CDP Streaming Mode (Experimental)
- **Configuration**: `ENABLE_CDP_STREAMING=true`
- **Performance**: Higher CPU usage, potential for process leaks
- **FPS**: Real-time (30-60+ FPS capability)
- **Quality**: JPEG frames, smaller file sizes
- **Stability**: Experimental, may cause orphaned browser processes

### Performance Tuning

For different performance requirements, adjust `SCREENSHOT_INTERVAL`:

```bash
# 10 FPS (low CPU usage)
SCREENSHOT_INTERVAL=100

# 20 FPS (balanced - default)
SCREENSHOT_INTERVAL=50

# 30 FPS (higher CPU)
SCREENSHOT_INTERVAL=33

# 60 FPS (high CPU usage)
SCREENSHOT_INTERVAL=16
```

### Troubleshooting High CPU Usage

If you notice high CPU usage from `headless_shell` processes:

1. **Disable CDP Streaming** (recommended):
   ```bash
   echo "ENABLE_CDP_STREAMING=false" >> .env
   ```

2. **Run the cleanup script**:
   ```bash
   ./cleanup-browser-processes.sh
   ```

3. **Manual cleanup**:
   ```bash
   ps aux | grep headless_shell | grep -v grep
   # Kill high CPU processes manually
   kill -9 <PID>
   ```

4. **Reduce screenshot frequency**:
   ```bash
   echo "SCREENSHOT_INTERVAL=100" >> .env  # 10 FPS instead of 20 FPS
   ```

## Integration with API Gateway

The Agent Service is designed to be spawned dynamically by the API Gateway:

1. API Gateway receives session creation request
2. Spawns Agent instance on available port (4000-5000)
3. Returns WebSocket URL to UI for direct connection
4. UI connects directly to Agent for real-time communication

## Development Guidelines

1. **Lean Code**: Minimal dependencies, no unnecessary abstractions
2. **Type Safety**: Strict TypeScript configuration
3. **Error Handling**: Graceful degradation and recovery
4. **Logging**: Comprehensive logging for debugging
5. **Performance**: Efficient screenshot streaming and message handling

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## Monitoring

The service provides comprehensive monitoring through:
- Structured logging with levels
- Health check endpoint
- WebSocket connection tracking
- SSE client monitoring
- Session activity tracking

## Security Considerations

- Runs in isolated process per user session
- No direct database access
- Input validation on all messages
- Secure WebSocket communication
- Environment-based configuration 

## Process Management

### Parent Process Monitoring

The agent automatically monitors its parent process (typically the API Gateway) and will gracefully shut down if the parent process is terminated. This prevents orphaned agent processes from continuing to run after the API Gateway is killed.

**Key Features:**
- **Automatic Detection**: Checks parent process every 5 seconds
- **Graceful Shutdown**: Properly closes browser, WebSocket connections, and cleans up resources
- **Cross-Platform**: Works on Unix-like systems and Windows
- **Resource Cleanup**: Prevents memory leaks and orphaned browser processes

**Monitoring Methods:**
1. **Parent PID Change**: Detects if the parent process ID changes (re-parenting)
2. **Process Existence**: Verifies the parent process still exists
3. **Init Adoption**: Detects if orphaned to init process (PID 1)

**Logging:**
```
[INFO] Parent process monitoring started - watching PID 1234
[INFO] Parent process 1234 no longer exists, shutting down gracefully...
[INFO] Starting graceful shutdown...
[INFO] Browser cleanup completed
[INFO] Agent server stopped
```

### Signal Handling

The agent responds to various termination signals:

- **SIGINT** (Ctrl+C): Graceful shutdown
- **SIGTERM**: Graceful shutdown (used by process managers)
- **Uncaught Exception**: Emergency shutdown with logging
- **Unhandled Promise Rejection**: Emergency shutdown with logging

### Manual Termination

You can manually terminate an agent process:

```bash
# Graceful shutdown
kill -TERM <agent-pid>

# Force kill (not recommended)
kill -9 <agent-pid>

# Find agent processes
ps aux | grep "node.*agent" | grep -v grep
```

## Additional Configuration

### Streaming Configuration - FPS Control

```bash
# Enable CDP streaming for high FPS (requires more CPU)
ENABLE_CDP_STREAMING=false

# CDP streaming settings (only used when ENABLE_CDP_STREAMING=true)
CDP_FRAME_RATE=30          # Target FPS: 15-60 (higher = smoother but more CPU)
CDP_QUALITY=80             # JPEG quality: 1-100 (higher = better quality but larger files)
CDP_MAX_WIDTH=1280         # Max frame width
CDP_MAX_HEIGHT=720         # Max frame height

# Screenshot fallback settings (used when CDP disabled)
SCREENSHOT_INTERVAL=50     # Milliseconds between screenshots (50ms = 20 FPS)
```

#### Example FPS Configurations

**High Performance (smooth but CPU intensive):**
```bash
ENABLE_CDP_STREAMING=true
CDP_FRAME_RATE=60
CDP_QUALITY=85
```

**Balanced (good performance):**
```bash
ENABLE_CDP_STREAMING=true
CDP_FRAME_RATE=30
CDP_QUALITY=80
```

**Conservative (lower CPU usage):**
```bash
ENABLE_CDP_STREAMING=false
SCREENSHOT_INTERVAL=100  # 10 FPS
```

**Battery Saver (minimal CPU):**
```bash
ENABLE_CDP_STREAMING=false
SCREENSHOT_INTERVAL=200  # 5 FPS
```

### Other Configuration Options

```bash
# Server
PORT=4000
NODE_ENV=development

# Browser
HEADLESS=true
VIEWPORT_WIDTH=1280
VIEWPORT_HEIGHT=720

# LLM
OPENAI_API_KEY=your_key_here
LLM_MODEL=gpt-4-turbo-preview
LLM_TEMPERATURE=0.7
MAX_LLM_TOKENS=2000

# Logging
LOG_LEVEL=info
```

## Usage

```bash
npm start
```

The agent will start a WebSocket server on the configured port and begin browser automation. 