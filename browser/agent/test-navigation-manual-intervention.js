/**
 * Test script to verify navigation-triggered manual intervention
 * Run with: node test-navigation-manual-intervention.js
 */

const WebSocket = require('ws');

console.log('🧪 Testing navigation manual intervention...');

const ws = new WebSocket('ws://localhost:4000/ws');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket');
  
  // Test navigation to a login page  
  const instruction = {
    type: 'instruction',
    data: {
      id: `test_${Date.now()}`,
      text: 'go to linkedin.com',
      sessionId: 'test_session',
      timestamp: Date.now()
    }
  };

  console.log('📤 Sending navigation test:', instruction.data.text);
  ws.send(JSON.stringify(instruction));
});

let stepCount = 0;
let hasNavigated = false;

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    
    // Track LLM step count
    if (parsed.type === 'log' && parsed.data?.message?.includes('Starting ReAct processing')) {
      stepCount = parsed.data?.stepCount || 0;
      console.log(`🔄 ReAct Step ${stepCount}:`, parsed.data?.instruction);
    }
    
    // Track navigation completion
    if (parsed.type === 'log' && parsed.data?.message?.includes('Navigation detected during action')) {
      hasNavigated = true;
      console.log('🚀 Navigation completed to:', parsed.data?.afterUrl);
    }
    
    // Check for LLM manual intervention tool usage
    if (parsed.type === 'log' && parsed.data?.message?.includes('LLM Response') && 
        parsed.data?.toolCalls?.includes('manualIntervention')) {
      console.log('🎉 SUCCESS: LLM used manualIntervention tool!');
    }
    
    // Check for manual intervention result
    if (parsed.type === 'instruction_complete') {
      if (parsed.result?.status === 'manual_intervention_required') {
        console.log('✅ SUCCESS: Manual intervention properly triggered!');
        const intervention = parsed.result.manualInterventionRequest;
        if (intervention) {
          console.log('📋 Intervention Details:');
          console.log('  Reason:', intervention.reason);
          console.log('  Category:', intervention.category);
          console.log('  Suggestion:', intervention.suggestion?.substring(0, 100) + '...');
        }
      } else if (parsed.result?.status === 'success') {
        console.log('⚠️  Task completed without manual intervention');
        console.log('   This might be expected if the page doesn\'t require intervention');
        if (hasNavigated) {
          console.log('   Navigation occurred but LLM determined no intervention needed');
        }
      } else {
        console.log('❌ Unexpected status:', parsed.result?.status);
      }
      
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 1000);
    }
    
    // Log any errors
    if (parsed.type === 'log' && parsed.data?.message?.includes('error')) {
      console.log('⚠️  Error detected:', parsed.data?.message);
    }
    
  } catch (error) {
    // Ignore non-JSON messages
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
  process.exit(1);
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
});

// Timeout after 60 seconds
setTimeout(() => {
  console.log('⏰ Test timeout after 60 seconds');
  if (hasNavigated) {
    console.log('   Navigation occurred but may need more time for LLM analysis');
  } else {
    console.log('   No navigation detected - check if the agent is running');
  }
  ws.close();
  process.exit(1);
}, 60000); 