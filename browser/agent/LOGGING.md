# Agent File Logging System

## Overview

The agent now includes comprehensive file-based logging that captures all activities including LLM requests/responses, browser actions, and performance metrics.

## Features

### 📁 Dual File Strategy
- **`agent-YYYY-MM-DD-HH-MM-SS-sessionId.log`** - Complete agent activity log
- **`llm-YYYY-MM-DD-HH-MM-SS-sessionId.log`** - **ONLY** actual OpenAI API requests and responses

### 🧠 LLM Payload & Response Logging
- **Full request payloads** including system prompts, user prompts, tools, and parameters
- **Complete response data** including choices, tool calls, token usage, and costs
- **Vision model interactions** with screenshot analysis metadata
- **Token usage tracking** and cost estimation for budget monitoring
- **Pure API data** - The LLM log file contains no general logging, only the actual API calls

### 🎯 Action & Browser Event Logging
- **Multi-selector attempts** with fallback tracking
- **Browser events** (navigation, clicks, typing, scrolling, etc.)
- **Performance metrics** including action duration and success rates
- **Screenshot capture** with size and timing metadata

### 📊 Session & Performance Tracking
- **Session lifecycle** with start/end timestamps and metadata
- **Instruction processing** with complete context and timing
- **Performance metrics** including memory usage and processing duration
- **Error tracking** with stack traces and context

## Log Structure

### Session Events
```json
{
  "event": "SESSION_START",
  "sessionId": "session-12345",
  "timestamp": "2025-01-28T12:00:00.000Z",
  "pid": 1234,
  "nodeVersion": "v18.19.0",
  "platform": "darwin"
}
```

### LLM Request Logging
```json
{
  "event": "LLM_REQUEST",
  "timestamp": "2025-01-28T12:00:01.000Z",
  "sessionId": "session-12345",
  "llmPayload": {
    "model": "gpt-4-turbo-preview",
    "temperature": 0.1,
    "max_tokens": 2000,
    "messages": [...],
    "tools": [...]
  },
  "metadata": {
    "instruction": "click on the main article",
    "stepCount": 2,
    "hasScreenshot": false,
    "contextUrl": "https://news.ycombinator.com",
    "domContentLength": 45678,
    "totalPromptLength": 12345
  },
  "payloadSize": 15432
}
```

### LLM Response Logging
```json
{
  "event": "LLM_RESPONSE",
  "timestamp": "2025-01-28T12:00:03.000Z",
  "sessionId": "session-12345",
  "llmResponse": {
    "model": "gpt-4-turbo-preview",
    "usage": {
      "prompt_tokens": 1234,
      "completion_tokens": 567,
      "total_tokens": 1801
    },
    "choices": [...],
    "finish_reason": "tool_calls"
  },
  "metadata": {
    "instruction": "click on the main article",
    "stepCount": 2,
    "toolCallName": "click",
    "costEstimate": "$0.003456"
  },
  "responseSize": 2345
}
```

### Action Execution Logging
```json
{
  "event": "ACTION_EXECUTED",
  "timestamp": "2025-01-28T12:00:04.000Z",
  "sessionId": "session-12345",
  "action": {
    "type": "click",
    "selectors": ["#main-article", ".article-link", "article a", "a"],
    "description": "Click main article link"
  },
  "actionResult": {
    "success": true,
    "usedSelector": ".article-link"
  },
  "performanceMetrics": {
    "duration": 234,
    "usedSelector": ".article-link",
    "success": true
  }
}
```

### Browser Events
```json
{
  "event": "BROWSER_EVENT",
  "timestamp": "2025-01-28T12:00:04.500Z",
  "sessionId": "session-12345",
  "browserEvent": "click_attempt_multi",
  "data": {
    "selectors": ["#main-article", ".article-link", "article a", "a"],
    "selectorCount": 4
  }
}
```

## Usage

### Automatic Initialization
The file logger is automatically initialized when the orchestrator starts:

```typescript
// In orchestrator constructor
const sessionId = this.session.getState().id;
logger.initializeFileLogging(sessionId);
```

### Manual Logging Methods
```typescript
// Enhanced LLM logging
logger.llmRequest(payload, metadata);
logger.llmResponse(response, metadata);

// Instruction tracking
logger.instructionStart(instructionId, instruction, context);
logger.instructionComplete(instructionId, result, metrics);

// Action logging
logger.actionExecuted(action, result, metrics);

// Browser events
logger.browserEvent(eventName, data);

// Performance metrics
logger.performanceMetrics(metrics);
```

## File Locations

Logs are stored in the `/logs` directory relative to the agent's working directory:

```
logs/
├── agent-2025-01-28-12-00-00-12345678.log
├── llm-2025-01-28-12-00-00-12345678.log
├── agent-2025-01-28-14-30-15-87654321.log
└── llm-2025-01-28-14-30-15-87654321.log
```

**File naming format:**
- `agent-YYYY-MM-DD-HH-MM-SS-sessionId.log` - Complete agent activity
- `llm-YYYY-MM-DD-HH-MM-SS-sessionId.log` - OpenAI API calls only
- Date: YYYY-MM-DD format
- Time: HH-MM-SS format (24-hour)  
- Session ID: First 8 characters for brevity

## Key Benefits

### 🔍 Debugging & Analysis
- **Complete LLM conversation history** for prompt engineering
- **Pure LLM API data** - No general logging mixed in, just clean request/response pairs
- **Selector failure analysis** with fallback tracking
- **Performance bottleneck identification** with detailed timing
- **Error reproduction** with complete context

### 💰 Cost Monitoring
- **Clean LLM-only data** for accurate cost analysis
- **Token usage tracking** across all LLM calls
- **Cost estimation** for budget planning
- **Model usage patterns** for optimization

### 📈 Performance Optimization
- **Action timing analysis** for speed improvements
- **Memory usage tracking** for resource optimization
- **Success rate monitoring** for reliability metrics

### 🛠️ Production Monitoring
- **Session activity tracking** for user behavior analysis
- **System health monitoring** with error rates and patterns
- **Resource usage monitoring** for scaling decisions

## Example Analysis Queries

### LLM-Specific Analysis (using clean LLM log)
```bash
# Count total LLM requests
grep '"event":"LLM_REQUEST"' llm-*.log | wc -l

# Calculate total tokens used
grep '"event":"LLM_RESPONSE"' llm-*.log | jq '.llmResponse.usage.total_tokens' | awk '{sum+=$1} END {print sum}'

# Find most expensive calls
grep '"event":"LLM_RESPONSE"' llm-*.log | jq '.metadata.costEstimate' | sort -n

# Extract all prompts for analysis
grep '"event":"LLM_REQUEST"' llm-*.log | jq '.llmPayload.messages'

# Track model usage
grep '"event":"LLM_REQUEST"' llm-*.log | jq '.llmPayload.model' | sort | uniq -c

# Analyze specific session (example: session starting with 12345678)
grep '"event":"LLM_REQUEST"' llm-*-12345678.log | jq '.llmPayload'
```

### General Agent Analysis
```bash
# Find Expensive LLM Calls
grep '"costEstimate"' llm-*.log | grep -E '\$0\.[5-9]|1\.'

# Track Selector Success Rates
grep '"event":"ACTION_EXECUTED"' agent-*.log | grep '"type":"click"' | jq '.actionResult.success'

# Monitor Session Performance
grep '"event":"PERFORMANCE_METRICS"' agent-*.log | jq '.metrics.duration'

# Analyze Failed Actions
grep '"success":false' agent-*.log | jq '.'
```

## Log Rotation

Logs are automatically:
- **Organized by date** for easy management
- **Separated by session** to avoid conflicts
- **Flushed regularly** to ensure data persistence
- **Closed properly** on session end

## Security & Privacy

- **No sensitive data** is logged by default
- **User input** is truncated for privacy
- **Credentials** are never logged
- **File permissions** are set appropriately 