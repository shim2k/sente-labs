# Agent Specification

## Overview

The Agent is a browser automation system that uses the ReAct (Reasoning and Acting) framework to execute natural language instructions by interacting with web pages.

## Core Architecture

### Services
- **BrowserService**: Handles browser operations (navigation, clicks, typing, DOM extraction)
- **ReActAgent**: Implements reasoning and action cycles using LLM interactions
- **OrchestratorService**: Coordinates instruction processing and action execution
- **SessionService**: Manages session state and action history

### DOM Extraction
- **Minimization Strategy**: Fast DOM cleaning with noise removal
- Uses simple element filtering and size-based visibility detection
- Configurable token budgets for content extraction

## Instruction Processing Flow

1. **Instruction Received**: User sends natural language instruction
2. **ReAct Processing**: Agent reasons about next actions using LLM
3. **Action Execution**: Browser actions are executed (click, type, navigate, etc.)
4. **Observation**: Results are observed and fed back to reasoning loop
5. **Completion**: Task completion is determined automatically or manually

## Response Types

### Success Response
```json
{
  "id": "instruction-123",
  "status": "success",
  "executed": ["navigated to example.com", "clicked login button"],
  "currentUrl": "https://example.com/dashboard",
  "pageTitle": "Dashboard - Example"
}
```

### Error Response
```json
{
  "id": "instruction-123", 
  "status": "error",
  "error": "Failed to find clickable element",
  "currentUrl": "https://example.com",
  "pageTitle": "Example Homepage"
}
```

### Manual Intervention Response
```json
{
  "id": "instruction-123",
  "status": "manual_intervention_required",
  "manualInterventionRequest": {
    "reason": "Login page detected",
    "suggestion": "Please manually sign in with your credentials",
    "category": "login"
  }
}
```

## Action Types

- **navigate**: Go to specific URL
- **click**: Click on elements using selectors or coordinates
- **type**: Type text into input fields
- **scroll**: Scroll page up/down
- **wait**: Wait for specified duration
- **hover**: Hover over elements

## Logging

### Single Session File
- **session-*.log** - Complete session activity including all events, actions, and LLM API calls

### Log Structure
Each log entry contains:
- Event type (INSTRUCTION_START, LLM_REQUEST, LLM_RESPONSE, ACTION_EXECUTED, etc.)
- Timestamp and session ID
- Detailed payload data
- Performance metrics

## Manual Intervention

The system automatically detects scenarios requiring human input:
- Login pages
- Security challenges
- Ambiguous content
- Technical failures

Users can also manually signal completion or stop processing at any time.

## WebSocket API

Real-time communication between UI and agent:
- Instruction submission
- Live screenshot streaming
- Progress updates
- Manual intervention controls 