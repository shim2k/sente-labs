# Browser UI

This is the UI component of the Remote Browser Automation system. It provides a chat-driven interface for controlling a browser through natural language instructions.

## Overview

The Browser UI connects to the Browser Runner via WebSockets to:
1. Send user instructions for processing
2. Receive browser screenshots in real-time
3. Display execution results

## Architecture

The UI establishes two persistent WebSocket connections as specified in the SRS:

1. `/screenshot` - Receives binary frames containing browser screenshots
2. `/instructions` - Sends user instructions and receives execution results

## Key Features

- Real-time browser visualization with <500ms latency (requirement F-2)
- Efficient rendering of screenshots in canvas without flicker (requirement F-3)
- Instruction messaging with status updates (requirement F-4)
- Sequential instruction processing with timeout handling (requirements F-5, F-6)
- Proper error handling and user feedback

## Components

### SessionContext

Manages WebSocket connections and messaging state. Handles:
- Opening both required WebSockets within 2s of page load (requirement F-1)
- Processing binary screenshot data
- Sending and tracking instructions
- Handling execution responses

### BrowserPanel

Displays the browser view via an HTML canvas element:
- Renders screenshots at their native resolution
- Updates the canvas when new screenshots arrive
- Displays connection status

### InstructionPanel

Provides the chat interface for sending instructions:
- Displays sent instructions and their responses
- Shows executed code when available
- Provides visual indicators for connection and processing states

## Development

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

## Dependencies

- React 18
- TypeScript
- Tailwind CSS for styling
- UUID for message tracking

## Integration with Browser Runner

The UI connects to the Browser Runner service which:
1. Controls a headless Chrome browser
2. Processes instructions via an LLM
3. Executes Playwright commands
4. Captures and streams screenshots

This implementation follows the SRS document specifications for the Remote Browser Automation MVP.
