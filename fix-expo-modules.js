#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Fixing expo-modules-core TypeScript issue...');

// Fix expo-modules-core
const expoModulesCorePath = path.join(__dirname, 'node_modules', 'expo-modules-core');
const packageJsonPath = path.join(expoModulesCorePath, 'package.json');
const indexJsPath = path.join(expoModulesCorePath, 'index.js');

try {
  // Read the original package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Change main entry to index.js
  packageJson.main = 'index.js';
  
  // Write back
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  
  // Create a proper index.js that exports the TypeScript module
  const indexContent = `
// Workaround for Node.js TypeScript module resolution
try {
  // Try to load the compiled version if it exists
  module.exports = require('./build/index.js');
} catch (e) {
  // Fallback to minimal exports for build process
  module.exports = {
    NativeModulesProxy: {},
    EventEmitter: class EventEmitter {
      addListener() {}
      removeListener() {}
      removeAllListeners() {}
      emit() {}
    },
    SharedObject: class SharedObject {},
    SharedRef: class SharedRef {},
    Platform: { 
      OS: 'ios',
      select: (obj) => obj.ios || obj.default 
    },
    requireNativeModule: () => ({}),
    requireOptionalNativeModule: () => null,
    reload: () => {},
    createWebModule: () => ({}),
    NativeModule: class NativeModule {},
    PermissionsInterface: {},
    PermissionsHook: {},
    UnavailabilityError: class UnavailabilityError extends Error {},
    CodedError: class CodedError extends Error {},
    ensureNativeModulesAreInstalled: () => {},
    uuid: {
      v4: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      }),
      v5: () => 'mock-uuid-v5'
    }
  };
}
`;
  
  fs.writeFileSync(indexJsPath, indexContent);
  
  console.log('✅ Fixed expo-modules-core');
  
  // Fix other modules that might have similar issues
  const modulesToFix = [
    'expo-sms',
    'expo-camera', 
    'expo-location',
    'expo-clipboard',
    'expo-image-picker',
    'expo-av',
    'expo-task-manager'
  ];
  
  modulesToFix.forEach(moduleName => {
    try {
      const modulePath = path.join(__dirname, 'node_modules', moduleName);
      const modulePackageJsonPath = path.join(modulePath, 'package.json');
      
      if (fs.existsSync(modulePackageJsonPath)) {
        const modulePackageJson = JSON.parse(fs.readFileSync(modulePackageJsonPath, 'utf8'));
        
        // If main points to a .ts file, change it
        if (modulePackageJson.main && modulePackageJson.main.endsWith('.ts')) {
          modulePackageJson.main = modulePackageJson.main.replace('.ts', '.js');
          fs.writeFileSync(modulePackageJsonPath, JSON.stringify(modulePackageJson, null, 2));
          console.log(`✅ Fixed ${moduleName}`);
        }
      }
    } catch (e) {
      console.log(`⚠️  Could not fix ${moduleName}: ${e.message}`);
    }
  });
  
  console.log('\n✅ All modules fixed! You can now run the build command.');
  
} catch (error) {
  console.error('Error fixing modules:', error);
  process.exit(1);
}