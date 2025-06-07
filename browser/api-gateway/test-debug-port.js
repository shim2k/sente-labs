#!/usr/bin/env node

/**
 * Debug Port Test Utility
 * 
 * This script helps test if debug ports are accessible and provides
 * troubleshooting information for Chrome DevTools connection issues.
 * 
 * Usage:
 *   node test-debug-port.js [debugPort]
 */

const net = require('net');
const http = require('http');

async function testDebugPort(port = 9000) {
  console.log(`🔍 Testing debug port ${port}...`);
  console.log('');

  // Test 1: Check if port is listening
  const isListening = await testPortListening(port);
  if (!isListening) {
    console.log('❌ Debug port is not listening');
    console.log('💡 Make sure you have:');
    console.log('   1. Started the API Gateway with AGENT_DEBUG=true');
    console.log('   2. Created a debug session');
    console.log('   3. The agent process has fully started');
    return false;
  }

  console.log('✅ Debug port is listening');

  // Test 2: Check if it responds to WebSocket upgrade
  const isWebSocketReady = await testWebSocketEndpoint(port);
  if (!isWebSocketReady) {
    console.log('❌ Debug WebSocket endpoint not ready');
    console.log('💡 The port is listening but Node.js debugger may not be ready yet');
    return false;
  }

  console.log('✅ Debug WebSocket endpoint is ready');
  console.log('');

  // Test 3: Provide connection URLs
  console.log('🔗 Connection Information:');
  console.log('');
  console.log('🔥 QUICK CONNECT (Copy to Chrome):');
  console.log(`devtools://devtools/bundled/js_app.html?experiments=true&v8only=true&ws=127.0.0.1:${port}`);
  console.log('');
  console.log('🔍 Auto-discovery check:');
  console.log('   1. Open chrome://inspect');
  console.log('   2. Look for "Remote Target" section');
  console.log(`   3. Should see: 127.0.0.1:${port}`);
  console.log('');
  console.log('⚙️  Manual configuration:');
  console.log('   1. Chrome DevTools → More tools → Remote devices');
  console.log('   2. Settings → Discover network targets → Add');
  console.log(`   3. Enter: 127.0.0.1:${port}`);

  return true;
}

function testPortListening(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      resolve(false);
    });
    
    socket.connect(port, '127.0.0.1');
  });
}

function testWebSocketEndpoint(port) {
  return new Promise((resolve) => {
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: '/json/version',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed && parsed.Browser);
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.abort();
      resolve(false);
    });

    req.end();
  });
}

async function scanDebugPorts() {
  console.log('🔍 Scanning for active debug ports (9000-9010)...');
  console.log('');

  const activePorts = [];
  
  for (let port = 9000; port <= 9010; port++) {
    const isActive = await testPortListening(port);
    if (isActive) {
      activePorts.push(port);
      console.log(`✅ Found active debug port: ${port}`);
    }
  }

  if (activePorts.length === 0) {
    console.log('❌ No active debug ports found in range 9000-9010');
    console.log('');
    console.log('💡 Troubleshooting steps:');
    console.log('   1. Make sure API Gateway is running: cd browser/api-gateway && npm run dev');
    console.log('   2. Set debug mode: echo "AGENT_DEBUG=true" >> .env');
    console.log('   3. Create a debug session: node debug-session-example.js');
    console.log('   4. Wait for "Debugger listening" message in logs');
  } else {
    console.log('');
    console.log(`🎯 Test specific port: node test-debug-port.js ${activePorts[0]}`);
  }

  return activePorts;
}

async function main() {
  const port = process.argv[2];
  
  if (port) {
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      console.error('❌ Invalid port number:', port);
      process.exit(1);
    }
    
    const success = await testDebugPort(portNum);
    process.exit(success ? 0 : 1);
  } else {
    await scanDebugPorts();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  });
}

module.exports = { testDebugPort, scanDebugPorts }; 