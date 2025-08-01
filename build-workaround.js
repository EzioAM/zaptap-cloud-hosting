#!/usr/bin/env node

// Workaround for Node.js 22 TypeScript extension issues
// This script manually fixes the expo-modules-core package entry point

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'node_modules', 'expo-modules-core', 'package.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Change main entry from TypeScript to the index.js file
  packageJson.main = 'index.js';
  
  // Write back the modified package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  console.log('Fixed expo-modules-core package.json main entry');
  
  // Now update the index.js file to export from build/index.js if it exists
  const indexJsPath = path.join(__dirname, 'node_modules', 'expo-modules-core', 'index.js');
  const buildIndexPath = path.join(__dirname, 'node_modules', 'expo-modules-core', 'build', 'index.js');
  
  if (fs.existsSync(buildIndexPath)) {
    const exportCode = "module.exports = require('./build/index.js');";
    fs.writeFileSync(indexJsPath, exportCode);
    console.log('Updated index.js to point to built version');
  } else {
    // Try to build it
    console.log('Build directory not found, trying to require src/index.ts differently...');
    const srcRequireCode = `
try {
  module.exports = require('./src/index.ts');
} catch (e) {
  console.warn('Could not load expo-modules-core:', e.message);
  module.exports = {};
}`;
    fs.writeFileSync(indexJsPath, srcRequireCode);
  }
  
} catch (error) {
  console.error('Error fixing expo-modules-core:', error.message);
  process.exit(1);
}