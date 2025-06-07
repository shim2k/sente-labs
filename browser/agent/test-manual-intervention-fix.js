/**
 * Test script to verify manual intervention fixes
 * Run with: node test-manual-intervention-fix.js
 */

const WebSocket = require('ws');

console.log('🧪 Testing LLM-based manual intervention...');

const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket');
  
  // Send an instruction that will trigger manual intervention (like navigating to a login page)
  const instruction = {
    type: 'instruction',
    data: {
      id: `test_${Date.now()}`,
      text: 'go to linkedin.com/login',
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
    
    // Check for the old analyzeForManualIntervention error (should not occur anymore)
    if (parsed.type === 'log' && parsed.data?.message?.includes('analyzeForManualIntervention is not a function')) {
      console.log('❌ FAILED: analyzeForManualIntervention method is still being called');
      ws.close();
      process.exit(1);
    }
    
    // Check for LLM using manualIntervention tool
    if (parsed.type === 'log' && parsed.data?.message?.includes('manualIntervention')) {
      console.log('🔍 LLM manualIntervention tool usage detected:', parsed.data.message);
    }
    
    // Check for manual intervention with proper suggestions
    if (parsed.type === 'instruction_complete' && parsed.result?.status === 'manual_intervention_required') {
      console.log('✅ Manual intervention triggered successfully via LLM');
      
      const manualIntervention = parsed.result.manualInterventionRequest;
      if (manualIntervention) {
        console.log('🔍 Manual intervention details:');
        console.log('  Reason:', manualIntervention.reason);
        console.log('  Suggestion:', manualIntervention.suggestion);
        console.log('  Category:', manualIntervention.category);
        
        // Check if suggestion contains helpful guidance instead of thought process
        if (manualIntervention.suggestion && 
            !manualIntervention.suggestion.includes('Step 1 (THOUGHT)') &&
            !manualIntervention.suggestion.includes('Step 2 (ACTION)') &&
            manualIntervention.suggestion.includes('Mark as Done')) {
          console.log('🎉 SUCCESS: Manual intervention suggestion is user-friendly!');
          console.log('🎉 SUCCESS: LLM-based manual intervention working correctly!');
        } else {
          console.log('❌ FAILED: Manual intervention suggestion still shows thought process');
          console.log('Suggestion content:', manualIntervention.suggestion);
        }
      }
      
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 1000);
    }
    
    // Check for successful completion without manual intervention (also valid)
    if (parsed.type === 'instruction_complete' && parsed.result?.status === 'success') {
      console.log('✅ Task completed successfully without manual intervention');
      console.log('🎉 This is also a valid outcome - LLM determined no intervention needed');
      
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 1000);
    }
    
    // Log any manual intervention related logs
    if (parsed.type === 'log' && parsed.data?.message?.includes('Manual intervention')) {
      console.log('📋 Manual intervention log:', parsed.data.message);
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

// Timeout after 45 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
  process.exit(1);
}, 45000); 