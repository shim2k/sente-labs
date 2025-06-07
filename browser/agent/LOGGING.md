# Agent Session Logging System

## Overview

The agent includes comprehensive file-based logging that captures all activities including LLM requests/responses, browser actions, and performance metrics in a single session file.

## Features

### 📁 Single Session File
- **`session-YYYY-MM-DD-HH-MM-SS-sessionId.log`** - Complete session log with all activity

### 🧠 LLM Payload & Response Logging
- **Full request payloads** including system prompts, user prompts, tools, and parameters
- **Complete response data** including choices, tool calls, token usage, and costs
- **Vision model interactions** with screenshot analysis metadata
- **Token usage tracking** and cost estimation for budget monitoring
- **Clearly marked events** - LLM requests/responses are tagged with `LLM_REQUEST` and `LLM_RESPONSE` events

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

### LLM Request Logging (New Structured System)
```json
{
  "event": "LLM_REQUEST",
  "timestamp": "2025-01-28T12:00:01.000Z",
  "sessionId": "session-12345",
  "llmPayload": {
    "model": "gpt-4o",
    "temperature": 0.7,
    "max_tokens": 2000,
    "tool_choice": "auto",
    "messages": [
      {
        "role": "system",
        "contentType": "system_prompt",
        "characterCount": 1234,
        "preview": "You are a web automation agent that helps users interact with websites..."
      },
      {
        "role": "user",
        "contentType": "structured_prompt",
        "instruction": "search for Gal Shitrit",
        "domTokens": 8000,
        "hasVisualContext": true,
        "hasRecentSteps": false,
        "stepCount": 3,
        "screenshotAnalysisLength": 245,
        "previousStepsCount": 2,
        "preview": "TASK: search for Gal Shitrit [8000 DOM tokens] [WITH VISUAL CONTEXT]"
      }
    ]
  },
  "metadata": {
    "instruction": "search for Gal Shitrit",
    "stepCount": 3,
    "hasScreenshot": true,
    "messageCount": 2,
    "totalPromptLength": 1856,
    "hasTools": true,
    "toolCount": 8,
    "hasStructuredPrompt": true,
    "hasDOMContent": true
  },
  "payloadSize": 45231
}
```

**Key Improvements:**
- ✅ **No Tools in Logs**: Tool definitions are excluded (they're repetitive and not needed for debugging)
- ✅ **Structured Prompt System**: DOM content is separated as an object key, excluded from logs
- ✅ **Clean Metadata**: Instruction, DOM token count, visual context, steps - all cleanly separated
- ✅ **DOM Content Excluded**: Large DOM content is excluded from logs, replaced with metadata (length, instruction extracted, etc.)
- ✅ **Instruction Extraction**: For DOM-heavy prompts, the actual task instruction is extracted and logged separately
- ✅ **Accurate Token Estimates**: Better length calculation without DOM bloat
- ✅ **Prompt Type Detection**: Distinguishes between structured vs legacy string prompts

### LLM Response Logging (Improved)
```json
{
  "event": "LLM_RESPONSE",
  "timestamp": "2025-01-28T12:00:03.000Z",
  "sessionId": "session-12345",
  "llmResponse": {
    "model": "gpt-4o",
    "usage": {
      "prompt_tokens": 1234,
      "completion_tokens": 567,
      "total_tokens": 1801
    },
    "choices": [
      {
        "index": 0,
        "finish_reason": "tool_calls",
        "tool_calls": [
          {
            "id": "call_123",
            "type": "function",
            "function": {
              "name": "navigate",
              "arguments_preview": "{\n  \"url\": \"https://google.com\",\n  \"reason\": \"Navigate to...",
              "arguments_length": 89
            }
          }
        ]
      }
    ],
    "created": 1699000000,
    "id": "chatcmpl-123",
    "object": "chat.completion"
  },
  "metadata": {
    "instruction": "Navigate to Google and search for AI news",
    "toolCallName": "navigate",
    "costEstimate": "$0.003456",
    "choiceCount": 1,
    "hasToolCalls": true,
    "toolCallCount": 1,
    "totalTokens": 1801,
    "promptTokens": 1234,
    "completionTokens": 567
  },
  "responseSize": 2345
}
```

**Key Improvements:**
- ✅ **Cleaner Tool Calls**: Shows function name and argument preview instead of full payload
- ✅ **Better Metadata**: Includes token breakdown, tool call counts, and choice information
- ✅ **Content Handling**: Text responses show preview and length for better readability

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
// Enhanced LLM logging (now all in single file)
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
├── session-2025-01-28-12-00-00-12345678.log
├── session-2025-01-28-14-30-15-87654321.log
└── session-2025-01-28-16-45-30-98765432.log
```

**File naming format:**
- `session-YYYY-MM-DD-HH-MM-SS-sessionId.log` - Complete session activity
- Date: YYYY-MM-DD format
- Time: HH-MM-SS format (24-hour)  
- Session ID: First 8 characters for brevity
clear

### Console Logging (Improved)
The console output now provides much clearer insights into LLM interactions:

```bash
[2025-01-28T12:00:01.000Z] [SYSTEM] 🤖 LLM Request {
  model: 'gpt-4o',
  systemPromptLength: 1234,
  userPromptLength: 856,
  totalPromptLength: 2090,
  messageCount: 2,
  toolCount: 8,
  temperature: 0.7,
  maxTokens: 2000,
  instruction: '"search for Gal Shitrit"',
  stepCount: 3,
  hasScreenshot: true,
  hasDOMContent: true,
  domTokens: 8000,
  promptType: 'structured'
}

[2025-01-28T12:00:03.000Z] [SYSTEM] 🎯 LLM Response {
  model: 'gpt-4o',
  usage: { prompt_tokens: 1234, completion_tokens: 567, total_tokens: 1801 },
  finishReason: 'tool_calls',
  hasContent: false,
  contentLength: 0,
  toolCallCount: 1,
  toolCalls: [ 'type' ],
  responseLength: 2345,
  costEstimate: '$0.003456',
  instruction: '"search for Gal Shitrit"'
}
```

**Console Improvements:**
- 🤖 **Clear Request Indicators**: Easy to spot LLM requests with emoji and structured info
- 📊 **Accurate Length Metrics**: User prompt length excludes DOM content for better optimization insights
- 🎯 **Response Summaries**: Key response info without overwhelming detail
- 💰 **Cost Tracking**: Immediate cost estimates for budget monitoring
- 🏗️ **Prompt Type Detection**: Shows 'structured', 'legacy_string', or 'simple' prompt types
- 📏 **DOM Token Tracking**: Separate tracking of DOM content size for performance analysis

## Key Benefits

### 🔍 Debugging & Analysis
- **Complete session history** in a single file for easy analysis
- **Cleaner LLM logs** without repetitive tool definitions cluttering the output
- **Readable prompt structure** with length indicators and content previews
- **Selector failure analysis** with fallback tracking
- **Performance bottleneck identification** with detailed timing
- **Error reproduction** with complete context

### 💰 Cost Monitoring
- **LLM request/response data** easily identifiable with event types
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

### LLM-Specific Analysis
```bash
# Count total LLM requests
grep '"event":"LLM_REQUEST"' session-*.log | wc -l

# Calculate total tokens used
grep '"event":"LLM_RESPONSE"' session-*.log | jq '.llmResponse.usage.total_tokens' | awk '{sum+=$1} END {print sum}'

# Find most expensive calls
grep '"event":"LLM_RESPONSE"' session-*.log | jq '.metadata.costEstimate' | sort -n

# Extract all prompts for analysis
grep '"event":"LLM_REQUEST"' session-*.log | jq '.llmPayload.messages'

# Track model usage
grep '"event":"LLM_REQUEST"' session-*.log | jq '.llmPayload.model' | sort | uniq -c

# Analyze specific session (example: session starting with 12345678)
grep '"event":"LLM_REQUEST"' session-*-12345678.log | jq '.llmPayload'
```

### General Agent Analysis
```bash
# Find Expensive LLM Calls in session logs
grep '"costEstimate"' session-*.log | grep -E '\$0\.[5-9]|1\.'

# Track Selector Success Rates
grep '"event":"ACTION_EXECUTED"' session-*.log | grep '"type":"click"' | jq '.actionResult.success'

# Monitor Session Performance
grep '"event":"PERFORMANCE_METRICS"' session-*.log | jq '.metrics.duration'

# Analyze Failed Actions
grep '"success":false' session-*.log | jq '.'

# Get all events for a specific session
grep '"sessionId":"session-12345678"' session-*-12345678.log

# Extract session timeline
grep -E '"event":"(SESSION_START|INSTRUCTION_START|ACTION_EXECUTED|LLM_REQUEST|SESSION_END)"' session-*.log | jq '{event, timestamp, type: .event}'
```

### Session Analysis
```bash
# Session duration analysis
grep -E '"event":"(SESSION_START|SESSION_END)"' session-*.log | jq '{event, timestamp}'

# Instructions per session
grep '"event":"INSTRUCTION_START"' session-*.log | cut -d'-' -f4 | cut -d'.' -f1 | sort | uniq -c

# Average actions per instruction
grep '"event":"ACTION_EXECUTED"' session-*.log | wc -l
grep '"event":"INSTRUCTION_START"' session-*.log | wc -l
```

## Log Rotation

Logs are automatically:
- **Organized by session** with timestamp-based naming
- **Self-contained** - each session file contains complete activity
- **Flushed regularly** to ensure data persistence
- **Closed properly** on session end

## Security & Privacy

- **No sensitive data** is logged by default
- **User input** is truncated for privacy
- **Credentials** are never logged
- **File permissions** are set appropriately 

## Migration from Dual-File System

The previous dual-file system (`agent-*.log` and `llm-*.log`) has been consolidated into a single session file. All data that was previously split between the two files is now contained in one file with clear event markers:

- **LLM data**: Look for `"event":"LLM_REQUEST"` and `"event":"LLM_RESPONSE"`
- **Agent actions**: Look for `"event":"ACTION_EXECUTED"`, `"event":"BROWSER_EVENT"`, etc.
- **Session data**: Look for `"event":"SESSION_START"`, `"event":"INSTRUCTION_START"`, etc.

This simplifies log analysis while maintaining all the detailed information needed for debugging and monitoring. 