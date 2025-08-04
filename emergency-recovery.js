#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚨 ZAPTAP EMERGENCY RECOVERY TOOL 🚨\n');

const modes = {
  '1': {
    name: 'Ultra Simple (App-Simple.tsx)',
    description: 'Basic navigation only, no providers',
    file: 'App-Simple.tsx'
  },
  '2': {
    name: 'Emergency Mode (App-Emergency.tsx)', 
    description: 'Minimal app with basic state management',
    file: 'App-Emergency.tsx'
  },
  '3': {
    name: 'Current App (App.tsx)',
    description: 'Full app with all providers and debugging',
    file: 'App.tsx'
  }
};

console.log('Available recovery modes:');
Object.entries(modes).forEach(([key, mode]) => {
  console.log(`${key}. ${mode.name} - ${mode.description}`);
});

const mode = process.argv[2] || '1';

if (!modes[mode]) {
  console.error('\n❌ Invalid mode. Using mode 1 (Ultra Simple)');
  mode = '1';
}

const selectedMode = modes[mode];
console.log(`\n✅ Using ${selectedMode.name}`);

// Read the selected app file
const appPath = path.join(__dirname, selectedMode.file);
const indexPath = path.join(__dirname, 'index.js');

if (!fs.existsSync(appPath)) {
  console.error(`\n❌ Error: ${selectedMode.file} not found!`);
  process.exit(1);
}

// Update index.js to use the selected app
const indexContent = `import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './${selectedMode.file.replace('.tsx', '')}';

console.log('🚨 Using ${selectedMode.name} configuration');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
`;

fs.writeFileSync(indexPath, indexContent);

console.log('\n✅ Recovery mode activated!');
console.log('\nNext steps:');
console.log('1. Clear Metro cache: npx react-native start --reset-cache');
console.log('2. Run the app: npm start');
console.log('3. Check console logs for errors');
console.log('\nIf the app loads, gradually add features back.');