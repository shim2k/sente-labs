# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a Remote Browser Automation system with two main components:
- **agent/**: TypeScript backend service that uses Playwright for browser automation and LLM integration
- **ui/**: React frontend that provides a chat interface and real-time browser visualization

## Development Commands

### Agent (Backend)
```bash
cd agent
npm install
npm run dev          # Development server with hot reload
npm run debug        # Debug mode with inspector
npm run debug-brk    # Debug mode with breakpoint
npm run build        # Compile TypeScript
npm start            # Production mode
npm test             # Run tests
```

### UI (Frontend)
```bash
cd ui
npm install
npm start            # Development server (React)
npm run build        # Production build
npm test             # Run tests
```

## Core Architecture

### Backend Agent Service
The agent service implements an LLM-driven browser automation system with hierarchical planning:

- **AgentService** (`agent/src/services/agent.ts`): Main coordinator that processes natural language instructions and manages plan execution
- **BrowserService** (`agent/src/services/browser.ts`): Playwright wrapper for browser automation with screenshot streaming
- **LLMService** (`agent/src/services/llm.ts`): OpenAI API integration for instruction processing
- **DomParser** (`agent/src/services/domParser.ts`): Converts DOM to LLM-friendly text observations

### Planning System
The agent uses a hierarchical planning system with:
- **Plan Stack**: Multiple goals can be stacked for complex multi-step tasks
- **Subgoals**: Each plan can have multiple subgoals managed via `branch` and `prune` actions
- **Manual Intervention**: Agent can pause and request human assistance when needed

### WebSocket Communication
- `/screenshot` endpoint: Streams browser screenshots as base64-encoded frames
- `/instructions` endpoint: Handles instruction processing and agent responses

### Frontend Architecture
- **SessionContext**: Manages WebSocket connections and messaging state
- **BrowserPanel**: Displays real-time browser screenshots via HTML canvas
- **InstructionPanel**: Chat interface for sending instructions and viewing responses
- **ThemeContext**: Dark/light mode support

## Agent Actions

The agent supports these primary actions:
- `click(elementId)`: Click elements using numbered IDs from page observations
- `type(elementId, text)`: Type text into input fields
- `goto(url)`: Navigate to URLs
- `goBack()`: Browser back navigation
- `enter()`: Press Enter key
- `branch(subgoals[])`: Create subgoals for complex tasks
- `prune()`: Remove latest subgoal
- `complete_subgoal()`: Mark current subgoal as complete and move to next
- `note(message)`: Record observations for later use
- `manual_intervention(reason, suggestion)`: Request human assistance
- `stop(answer)`: Complete task with final answer

## Key Features

- **Real-time Screenshot Streaming**: <500ms latency browser visualization
- **LLM-Driven Automation**: Natural language instruction processing
- **Hierarchical Planning**: Branch and prune subgoals for complex tasks
- **Manual Intervention Support**: Human-in-the-loop for sensitive operations
- **Element Mapping**: DOM elements are numbered for LLM reference
- **Sequential Processing**: Instructions are processed one at a time with proper state management

## Environment Variables

Create `.env` files in both `agent/` and `ui/` directories:
- `PORT`: Server port (default: 4000 for agent)
- `OPENAI_API_KEY`: Required for LLM functionality

## Testing

Both components use their respective test frameworks:
- Agent: Jest with TypeScript
- UI: React Testing Library with Jest

## Integration Notes

The system implements the SRS (Software Requirements Specification) for Remote Browser Automation MVP. The agent follows AgentOccam principles with minimal action space and concise page observations to improve LLM performance.

The UI establishes dual WebSocket connections for screenshot streaming and instruction processing, with proper error handling and reconnection logic.