const { spawn } = require('child_process');

const eas = spawn('eas', ['build', '--platform', 'ios', '--profile', 'development'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Answer "yes" to create EAS project
eas.stdin.write('y\n');

eas.on('close', (code) => {
  console.log(`EAS build process exited with code ${code}`);
});