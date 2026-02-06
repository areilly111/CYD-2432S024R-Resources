
const { spawn } = require('child_process');
const path = require('path');

function restartToPingPong() {
  console.log('Clearing memory and restarting to pingpong.js...');
  
  // Spawn a new process running pingpong.js
  const pingpongPath = path.join(__dirname, 'pingpong.js');
  const child = spawn('node', [pingpongPath]);
  
  // Pipe output
  child.stdout.on('data', (data) => {
    console.log(`[pingpong] ${data}`);
  });
  
  child.stderr.on('data', (data) => {
    console.error(`[pingpong error] ${data}`);
  });
  
  child.on('close', (code) => {
    console.log(`pingpong.js exited with code ${code}`);
  });
}

// Start the app
restartToPingPong();
