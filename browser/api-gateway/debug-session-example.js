#!/usr/bin/env node

/**
 * Debug Session Example
 * 
 * This script demonstrates how to create a debug session with the API Gateway
 * and connect to the spawned agent for debugging.
 * 
 * Usage:
 *   node debug-session-example.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Mock JWT token for testing (replace with real token in production)
const MOCK_JWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.test'; // Replace with real JWT

async function createDebugSession() {
  try {
    console.log('🚀 Creating debug session...');
    
    const response = await axios.post(`${API_BASE}/api/session`, {
      userId: 'debug-user-123',
      debugMode: true  // This enables debugging!
    }, {
      headers: {
        'Authorization': `Bearer ${MOCK_JWT}`,
        'Content-Type': 'application/json'
      }
    });

    const session = response.data;
    
    console.log('✅ Debug session created successfully!');
    console.log(`📍 Session ID: ${session.sessionId}`);
    console.log(`🌐 WebSocket URL: ${session.wsUrl}`);
    console.log(`🔗 HTTP URL: ${session.httpUrl}`);
    
    if (session.debugMode && session.debugPort) {
      console.log('🐛 DEBUG MODE ENABLED!');
      console.log(`🔧 Debug Port: ${session.debugPort}`);
      console.log('');
      console.log('📋 Debug Connection Options:');
      console.log('');
      console.log('🔥 QUICK CONNECT (Recommended):');
      console.log(`   Copy this URL and paste into Chrome address bar:`);
      console.log(`   devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:${session.debugPort}`);
      console.log('');
      console.log('🔍 AUTO-DISCOVERY:');
      console.log('   1. Open Chrome → Navigate to: chrome://inspect');
      console.log('   2. Look for "Remote Target" in the list');
      console.log('   3. Click "inspect" next to your agent process');
      console.log('');
      console.log('⚙️  MANUAL SETUP:');
      console.log('   1. Chrome DevTools → ⋮ menu → More tools → Remote devices');
      console.log('   2. Settings tab → Port forwarding → Add rule');
      console.log(`   3. Add: 127.0.0.1:${session.debugPort}`);
      console.log('');
      console.log('✨ Then: Set breakpoints in TypeScript files and send instructions!');
      console.log('');
      console.log('🎯 Common breakpoint locations:');
      console.log('   - src/services/orchestrator/index.ts:processWithReAct()');
      console.log('   - src/services/react-agent/index.ts:processInstructionWithStructuredPrompt()');
      console.log('   - src/services/browser/actions.ts:clickWithSelectors()');
      console.log('   - src/websocket/handlers.ts:handleInstruction()');
    }
    
    return session;

  } catch (error) {
    console.error('❌ Failed to create debug session:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || 'Unknown error'}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   - Make sure API Gateway is running: cd browser/api-gateway && npm run dev');
    console.log('   - Check if AGENT_DEBUG=true in .env file');
    console.log('   - Verify JWT token is valid (or implement proper auth)');
    
    process.exit(1);
  }
}

async function connectWebSocket(session) {
  try {
    console.log('');
    console.log('🔌 Connecting to WebSocket...');
    
    const WebSocket = require('ws');
    const ws = new WebSocket(session.wsUrl);
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected!');
      
      // Send a test instruction
      const testInstruction = {
        type: 'instruction',
        data: {
          id: `debug-test-${Date.now()}`,
          text: 'Navigate to google.com and search for debugging'
        }
      };
      
      console.log('📤 Sending test instruction...');
      console.log(`   Instruction: "${testInstruction.data.text}"`);
      
      ws.send(JSON.stringify(testInstruction));
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📥 Received message:', {
          type: message.type,
          ...(message.type === 'instruction_response' ? {
            status: message.response?.status,
            executed: message.response?.executed?.length || 0
          } : {})
        });
      } catch (error) {
        console.log('📥 Received binary/raw message:', data.length, 'bytes');
      }
    });
    
    ws.on('close', () => {
      console.log('🔌 WebSocket disconnected');
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });
    
    // Keep the connection alive for debugging
    console.log('');
    console.log('🔄 WebSocket connection established. The agent is ready for debugging!');
    console.log('   Press Ctrl+C to exit');
    
  } catch (error) {
    console.error('❌ WebSocket connection failed:', error.message);
  }
}

async function main() {
  console.log('🐛 Browser Agent Debug Session Example');
  console.log('=====================================');
  console.log('');
  
  // Create debug session
  const session = await createDebugSession();
  
  // Connect WebSocket for testing
  await connectWebSocket(session);
  
  // Keep process alive
  process.on('SIGINT', () => {
    console.log('');
    console.log('👋 Exiting debug session example');
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { createDebugSession, connectWebSocket }; 