#!/usr/bin/env node

/**
 * Debug Connection Helper
 * 
 * Fetches the exact DevTools URL from running debug sessions
 * and provides copy-paste connection instructions.
 */

const http = require('http');

async function getDebugTargets(port = 9000) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: port,
      path: '/json/list',
      method: 'GET',
      timeout: 3000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function findActiveDebugPorts() {
  console.log('🔍 Scanning for active debug sessions...\n');
  
  const activeSessions = [];
  
  for (let port = 9000; port <= 9010; port++) {
    try {
      const targets = await getDebugTargets(port);
      if (targets && targets.length > 0) {
        activeSessions.push({ port, targets });
        console.log(`✅ Found debug session on port ${port}`);
        targets.forEach((target, index) => {
          console.log(`   ${index + 1}. ${target.title}`);
          console.log(`      Type: ${target.type}`);
          console.log(`      ID: ${target.id}`);
        });
        console.log('');
      }
    } catch (error) {
      // Port not active, continue
    }
  }
  
  return activeSessions;
}

async function showConnectionInstructions(port) {
  try {
    const targets = await getDebugTargets(port);
    
    if (!targets || targets.length === 0) {
      console.log(`❌ No debug targets found on port ${port}`);
      return false;
    }
    
    console.log(`🎯 Debug Connection for Port ${port}\n`);
    
    targets.forEach((target, index) => {
      console.log(`📱 Target ${index + 1}: ${target.title}`);
      console.log(`   Type: ${target.type}`);
      console.log(`   ID: ${target.id}\n`);
      
      console.log('🔥 DIRECT CONNECTION (Copy to Chrome):');
      console.log(`${target.devtoolsFrontendUrl}\n`);
      
      console.log('🔍 Alternative Connection:');
      console.log(`${target.devtoolsFrontendUrlCompat}\n`);
      
      console.log('⚙️  Manual Setup:');
      console.log(`   1. Chrome → chrome://inspect`);
      console.log(`   2. Configure → Add: 127.0.0.1:${port}`);
      console.log(`   3. Look for: "${target.title.split('/').pop()}"`);
      console.log(`   4. Click "inspect"\n`);
      
      console.log('🐛 WebSocket URL (for advanced users):');
      console.log(`   ${target.webSocketDebuggerUrl}\n`);
      
      if (index < targets.length - 1) {
        console.log('─'.repeat(60) + '\n');
      }
    });
    
    return true;
  } catch (error) {
    console.log(`❌ Cannot connect to debug port ${port}: ${error.message}`);
    return false;
  }
}

async function main() {
  const port = process.argv[2];
  
  if (port) {
    const portNum = parseInt(port, 10);
    const success = await showConnectionInstructions(portNum);
    process.exit(success ? 0 : 1);
  } else {
    const activeSessions = await findActiveDebugPorts();
    
    if (activeSessions.length === 0) {
      console.log('❌ No active debug sessions found in ports 9000-9010\n');
      console.log('💡 Make sure you have:');
      console.log('   1. Started API Gateway with AGENT_DEBUG=true');
      console.log('   2. Created a debug session');
      console.log('   3. Seen "Debugger listening" in the logs\n');
      console.log('🔧 Try: node debug-connect.js 9000');
      process.exit(1);
    }
    
    console.log(`🎉 Found ${activeSessions.length} active debug session(s)!\n`);
    
    for (const session of activeSessions) {
      await showConnectionInstructions(session.port);
      if (activeSessions.indexOf(session) < activeSessions.length - 1) {
        console.log('═'.repeat(80) + '\n');
      }
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = { getDebugTargets, showConnectionInstructions }; 