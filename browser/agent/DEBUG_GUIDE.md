# Browser Agent Debugging Guide

This guide covers multiple approaches to debug the Browser Agent service, including breakpoints, step-through debugging, and log analysis.

## 🚀 Quick Start: Debug Mode via API Gateway

The **easiest** way to debug is using the built-in debug mode in the API Gateway:

### 1. Enable Debug Mode Globally

Set environment variable for the API Gateway:

```bash
# In browser/api-gateway/.env
AGENT_DEBUG=true
```

All spawned agents will now start with debugging enabled.

### 2. Enable Debug Mode Per Session

Or enable debug mode for specific sessions via API call:

```bash
curl -X POST http://localhost:3001/api/session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"userId": "user123", "debugMode": true}'
```

### 3. Connect Debugger

1. **Start the API Gateway**: `cd browser/api-gateway && npm run dev`
2. **Create a session** (with `debugMode: true`)
3. **Check logs** for debug connection info
4. **Connect using one of these methods**:

#### 🔥 **Quick Connect (Recommended)**
Copy the DevTools URL from the logs and paste into Chrome:
```
devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:9000
```

#### 🔍 **Auto-Discovery**
- Open Chrome → `chrome://inspect`
- Look for "Remote Target" section
- Click "inspect" next to `127.0.0.1:9000`

#### ⚙️ **Manual Configuration**
- Chrome DevTools → ⋮ menu → More tools → Remote devices
- Settings → Discover network targets → Add `127.0.0.1:9000`

#### 🔧 **Troubleshooting**
If connection fails, use the debug port tester:
```bash
cd browser/api-gateway
node test-debug-port.js        # Scan for active debug ports
node test-debug-port.js 9000   # Test specific port
```

## 🔧 Alternative Methods

### Method 1: Standalone Agent Development

For intensive debugging, run the agent standalone (bypassing the API Gateway):

```bash
# Terminal 1: Start agent directly
cd browser/agent
PORT=4000 npm run dev

# Terminal 2: Connect debugger
node --inspect-brk=9229 dist/server.js
```

Then create a test client:

```javascript
// test-client.js
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:4000');

ws.on('open', () => {
  console.log('Connected to agent');
  ws.send(JSON.stringify({
    type: 'instruction',
    data: {
      id: 'test-123',
      text: 'Navigate to google.com'
    }
  }));
});

ws.on('message', (data) => {
  console.log('Received:', JSON.parse(data));
});
```

### Method 2: VS Code Debug Configuration

Create `.vscode/launch.json` in the agent directory:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Agent Service",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/server.ts",
      "env": {
        "PORT": "4000",
        "SESSION_ID": "debug-session",
        "USER_ID": "debug-user",
        "NODE_ENV": "development"
      },
      "runtimeArgs": ["-r", "ts-node/register"],
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "console": "integratedTerminal",
      "restart": true,
      "resolveSourceMapLocations": [
        "${workspaceFolder}/**",
        "!**/node_modules/**"
      ]
    },
    {
      "name": "Debug ReAct Agent Only",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/test-react-agent.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    }
  ]
}
```

### Method 3: Remote Debugging (Production)

For debugging in production-like environments:

```bash
# Start agent with remote debugging
node --inspect=0.0.0.0:9229 dist/server.js

# SSH tunnel to access remotely
ssh -L 9229:localhost:9229 user@your-server

# Connect Chrome DevTools to localhost:9229
```

## 🎯 Common Debugging Scenarios

### Debugging ReAct Decision Making

Set breakpoints in:
- `src/services/react-agent/index.ts` → `processInstructionWithStructuredPrompt()`
- `src/services/react-agent/step-parser.ts` → `parseToolCall()`
- `src/services/orchestrator/index.ts` → `processWithReAct()`

### Debugging Browser Actions

Set breakpoints in:
- `src/services/browser/actions.ts` → `clickWithSelectors()`, `typeWithSelectors()`
- `src/services/browser/core.ts` → `navigate()`
- `src/services/orchestrator/action-executor.ts` → `executeAction()`

### Debugging DOM Extraction

Set breakpoints in:
- `src/services/browser/dom-extraction/minimization-strategy/index.ts` → `getDOMContent()`
- `src/services/react-agent/prompt-builder.ts` → `buildStructuredPrompt()`

### Debugging WebSocket Communication

Set breakpoints in:
- `src/websocket/handlers.ts` → `handleMessage()`, `handleInstruction()`
- `src/services/orchestrator/index.ts` → `processInstruction()`

## 📊 Debugging Tools & Tips

### 1. Enhanced Logging

Enable verbose logging:

```bash
# In agent .env
LOG_LEVEL=debug
```

### 2. LLM Request/Response Inspection

All LLM calls are logged to session files in `/logs`. Find recent session:

```bash
# View latest session log
ls -la browser/agent/logs/ | tail -1
tail -f browser/agent/logs/session-*.log | grep "LLM_REQUEST\|LLM_RESPONSE"
```

### 3. Performance Profiling

Add timing measurements:

```typescript
// In your code
const start = Date.now();
// ... your code ...
logger.info('Operation completed', { duration: Date.now() - start });
```

### 4. Memory Debugging

Monitor memory usage:

```typescript
// Add to any service
setInterval(() => {
  const used = process.memoryUsage();
  logger.debug('Memory usage', {
    rss: Math.round(used.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(used.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(used.heapUsed / 1024 / 1024) + ' MB'
  });
}, 30000);
```

## 🐛 Debugging Specific Issues

### Issue: "Agent not responding"

1. Check agent health: `curl http://localhost:4000/health`
2. Check logs for errors: `tail -f browser/agent/logs/session-*.log`
3. Verify WebSocket connection: Check browser console for WebSocket errors

### Issue: "LLM making wrong decisions"

1. Set breakpoint in `processInstructionWithStructuredPrompt()`
2. Inspect the `structuredPrompt` object being sent to LLM
3. Check the DOM content quality and token count
4. Verify tool definitions in `validation.ts`

### Issue: "Browser actions failing"

1. Set breakpoint in `executeAction()`
2. Check if selectors are correct: inspect `action.selectors`
3. Verify page state: check `currentUrl` and `pageTitle`
4. Test selectors in browser console: `document.querySelector('your-selector')`

### Issue: "Memory leaks"

1. Enable Node.js heap profiling: `node --inspect --heap-prof dist/server.js`
2. Check for unclosed resources: WebSocket connections, browser pages
3. Monitor memory growth over time

## 🔍 Advanced Debugging Techniques

### 1. Network Traffic Analysis

Monitor all HTTP requests:

```bash
# Install mitmproxy
pip install mitmproxy

# Start proxy
mitmdump -p 8080 --set confdir=~/.mitmproxy

# Set proxy in agent environment
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
```

### 2. Browser DevTools for Page Debugging

Access the actual browser being controlled:

```typescript
// In browser service initialization
await this.browser.initialize({
  headless: false, // Make browser visible
  devtools: true   // Open DevTools automatically
});
```

### 3. Step-by-Step ReAct Debugging

Create a debug version that pauses between steps:

```typescript
// In orchestrator
if (process.env.DEBUG_REACT_STEPS === 'true') {
  console.log('Press Enter to continue to next ReAct step...');
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });
}
```

## 📝 Debugging Checklist

When debugging issues:

- [ ] Check agent health endpoint
- [ ] Review recent session logs
- [ ] Verify environment variables
- [ ] Check browser page state
- [ ] Inspect LLM request/response
- [ ] Test DOM selectors manually
- [ ] Monitor memory usage
- [ ] Check WebSocket connections
- [ ] Verify API Gateway routing

## 🚨 Troubleshooting

### Debug port already in use

```bash
# Kill process using debug port
lsof -ti:9000 | xargs kill -9

# Or use different debug port range
export AGENT_DEBUG_PORT_MIN=9100
export AGENT_DEBUG_PORT_MAX=9200
```

### Chrome DevTools not connecting

**If chrome://inspect doesn't show the target:**

1. **Verify debug port is listening:**
   ```bash
   cd browser/api-gateway
   node test-debug-port.js
   ```

2. **Use direct DevTools URL (most reliable):**
   ```
   devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:9000
   ```

3. **Check Chrome's discovery settings:**
   - `chrome://inspect` → Configure → Add `127.0.0.1:9000`

4. **Alternative Chrome startup:**
   ```bash
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   ```

5. **Check firewall/network:**
   ```bash
   telnet 127.0.0.1 9000  # Should connect
   curl http://127.0.0.1:9000/json/version  # Should return JSON
   ```

### Source maps not working

1. Ensure TypeScript generates source maps: `"sourceMap": true` in tsconfig.json
2. Check source paths in DevTools Settings
3. Restart debugger after code changes

---

**Happy Debugging! 🐛** 

Need help? Check the session logs first, then set breakpoints in the relevant service files. 