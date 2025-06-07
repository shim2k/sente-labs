/**
 * Test script to verify Enter tool functionality
 * Run with: node test-enter-functionality.js
 */

const WebSocket = require('ws');

console.log('🧪 Testing Enter tool functionality...');

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket');
  
  // Send an instruction that would use the Enter key
  const instruction = {
    type: 'instruction',
    data: {
      id: `test_${Date.now()}`,
      text: 'Navigate to google.com and then press Enter to search',
      sessionId: 'test_session',
      timestamp: Date.now()
    }
  };

  console.log('📤 Sending test instruction:', instruction.data.text);
  ws.send(JSON.stringify(instruction));
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    
    // Log agent logs that mention pressEnter
    if (parsed.type === 'log' && parsed.data?.message?.includes('pressEnter')) {
      console.log('🔑 Enter action detected:', parsed.data.message);
    }
    
    // Log when instruction completes
    if (parsed.type === 'instruction_complete') {
      console.log('✅ Instruction completed');
      console.log('Actions executed:', parsed.result?.executed?.length || 0);
      
      // Check if pressEnter was used
      const usedEnter = parsed.result?.executed?.some(action => 
        action.includes('Press Enter') || action.includes('pressEnter')
      );
      
      if (usedEnter) {
        console.log('🎉 SUCCESS: Enter tool function was used!');
      } else {
        console.log('ℹ️  Enter tool was not used in this test');
        console.log('Executed actions:', parsed.result?.executed);
      }
      
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 1000);
    }
  } catch (error) {
    console.log('📨 Raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
  process.exit(1);
}, 30000); 