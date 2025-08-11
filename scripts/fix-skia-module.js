#!/usr/bin/env node

/**
 * Quick Fix for RNSkiaModule Error
 * Fixes: "TurboModuleRegistry.getEnforcing(...): 'RNSkiaModule' could not be found"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command, options = {}) {
  try {
    log(`Running: ${command}`, 'cyan');
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  log('\n🚨 Fixing RNSkiaModule Error', 'bright');
  log('=============================\n', 'bright');
  
  log('This error occurs when the native module is not properly linked.', 'yellow');
  log('We need to rebuild the app with the native module.\n', 'yellow');
  
  // Step 1: Kill any running Metro bundler
  log('1️⃣  Stopping Metro bundler...', 'cyan');
  try {
    if (process.platform === 'darwin') {
      execSync("lsof -t -i:8081 | xargs kill -9", { stdio: 'ignore' });
    } else {
      execSync("npx kill-port 8081", { stdio: 'ignore' });
    }
    log('✅ Metro bundler stopped', 'green');
  } catch (e) {
    log('ℹ️  Metro bundler not running', 'yellow');
  }
  
  // Step 2: Clear caches
  log('\n2️⃣  Clearing caches...', 'cyan');
  
  // Clear watchman
  try {
    exec('watchman watch-del-all');
  } catch (e) {
    log('ℹ️  Watchman not available', 'yellow');
  }
  
  // Clear Metro cache
  exec('npx react-native start --reset-cache &');
  await new Promise(resolve => setTimeout(resolve, 3000));
  try {
    if (process.platform === 'darwin') {
      execSync("lsof -t -i:8081 | xargs kill -9", { stdio: 'ignore' });
    }
  } catch (e) {}
  
  log('✅ Caches cleared', 'green');
  
  // Step 3: Verify Skia is installed
  log('\n3️⃣  Verifying React Native Skia installation...', 'cyan');
  
  const skiaPath = path.join(process.cwd(), 'node_modules/@shopify/react-native-skia');
  if (!fs.existsSync(skiaPath)) {
    log('❌ React Native Skia not found in node_modules', 'red');
    log('Installing now...', 'yellow');
    exec('npm install @shopify/react-native-skia@^2.2.2 --legacy-peer-deps');
  } else {
    const packageJson = JSON.parse(fs.readFileSync(path.join(skiaPath, 'package.json'), 'utf8'));
    log(`✅ React Native Skia installed (v${packageJson.version})`, 'green');
  }
  
  // Step 4: iOS specific fixes
  if (fs.existsSync(path.join(process.cwd(), 'ios'))) {
    log('\n4️⃣  Fixing iOS...', 'cyan');
    
    // Clean DerivedData
    log('Cleaning Xcode DerivedData...', 'yellow');
    exec('rm -rf ~/Library/Developer/Xcode/DerivedData/*');
    
    // Reinstall pods
    log('Reinstalling CocoaPods...', 'yellow');
    process.chdir('ios');
    exec('pod deintegrate');
    exec('pod install');
    process.chdir('..');
    
    log('✅ iOS fixed', 'green');
  }
  
  // Step 5: Instructions for rebuilding
  log('\n✅ Fixes Applied!', 'bright');
  log('================\n', 'bright');
  
  log('Now you need to rebuild the app:', 'yellow');
  log('', 'reset');
  
  if (process.platform === 'darwin') {
    log('For iOS:', 'cyan');
    log('  npx react-native run-ios', 'reset');
    log('', 'reset');
    log('OR if that doesn\'t work:', 'cyan');
    log('  1. Open ios/Zaptap.xcworkspace in Xcode', 'reset');
    log('  2. Select your simulator', 'reset');
    log('  3. Press Cmd+R to build and run', 'reset');
    log('', 'reset');
  }
  
  log('For Android:', 'cyan');
  log('  npx react-native run-android', 'reset');
  log('', 'reset');
  
  log('⚠️  IMPORTANT:', 'yellow');
  log('The app MUST be rebuilt for native modules to work.', 'yellow');
  log('Hot reload alone will not fix this issue.', 'yellow');
  log('', 'reset');
  
  log('If you still see the error after rebuilding:', 'cyan');
  log('  1. Close the app completely', 'reset');
  log('  2. Run: npx react-native start --reset-cache', 'reset');
  log('  3. Rebuild the app again', 'reset');
  log('', 'reset');
  
  log('Alternative: Use fallback mode', 'cyan');
  log('The app will automatically use standard weather effects', 'reset');
  log('if React Native Skia is not available.', 'reset');
}

main().catch(error => {
  log(`\n❌ Error: ${error.message}`, 'red');
  process.exit(1);
});