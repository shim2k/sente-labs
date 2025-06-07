const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4000');

ws.on('open', function open() {
  console.log('Connected to browser agent');
  
  // Send navigation instruction
  ws.send(JSON.stringify({
    type: 'instruction',
    text: 'go to linkedin'
  }));
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    console.log('Received:', JSON.stringify(parsed, null, 2));
    
    if (parsed.type === 'instruction_complete') {
      console.log('\n=== INSTRUCTION COMPLETE ===');
      console.log('Status:', parsed.result?.status);
      console.log('URL:', parsed.result?.currentUrl);
      console.log('Manual intervention required:', parsed.result?.manualInterventionRequest ? 'YES' : 'NO');
      
      if (parsed.result?.manualInterventionRequest) {
        console.log('Reason:', parsed.result.manualInterventionRequest.reason);
      }
      
      // Close connection
      setTimeout(() => {
        ws.close();
        process.exit(0);
      }, 1000);
    }
  } catch (error) {
    console.log('Raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('Test timeout - closing connection');
  ws.close();
  process.exit(1);
}, 30000); 