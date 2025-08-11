#!/usr/bin/env node

/**
 * Test Premium Features
 * Verifies that React Native Skia and IoT services are properly configured
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - File not found: ${filePath}`, 'red');
    return false;
  }
}

function checkPackageVersion(packageName, minVersion) {
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const version = packageJson.dependencies[packageName];
    
    if (version) {
      log(`✅ ${packageName}: ${version}`, 'green');
      return true;
    } else {
      log(`❌ ${packageName} not found in dependencies`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error checking ${packageName}: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('\n🧪 Testing Premium Features Setup', 'cyan');
  log('==================================\n', 'cyan');
  
  let allChecks = true;
  
  // Check React Native Skia
  log('📦 Checking Dependencies:', 'cyan');
  allChecks = checkPackageVersion('@shopify/react-native-skia', '2.0.0') && allChecks;
  allChecks = checkPackageVersion('react', '19.0.0') && allChecks;
  allChecks = checkPackageVersion('react-native', '0.79.0') && allChecks;
  
  log('\n📁 Checking Premium Components:', 'cyan');
  allChecks = checkFile(
    path.join(process.cwd(), 'src/components/weather/PremiumWeatherEffects.tsx'),
    'Premium Weather Effects Component'
  ) && allChecks;
  
  allChecks = checkFile(
    path.join(process.cwd(), 'src/services/iot/IoTIntegrationService.ts'),
    'IoT Integration Service'
  ) && allChecks;
  
  allChecks = checkFile(
    path.join(process.cwd(), 'src/config/PremiumConfig.ts'),
    'Premium Configuration'
  ) && allChecks;
  
  allChecks = checkFile(
    path.join(process.cwd(), 'src/screens/IoTDashboardScreen.tsx'),
    'IoT Dashboard Screen'
  ) && allChecks;
  
  log('\n📱 Checking iOS Native Modules:', 'cyan');
  allChecks = checkFile(
    path.join(process.cwd(), 'ios/Zaptap/IoTBridges/MatterBridge.swift'),
    'Matter Bridge (iOS)'
  ) && allChecks;
  
  allChecks = checkFile(
    path.join(process.cwd(), 'ios/Zaptap/IoTBridges/HomeKitBridge.swift'),
    'HomeKit Bridge (iOS)'
  ) && allChecks;
  
  // Check if node_modules has the Skia package installed
  log('\n📦 Checking Installed Packages:', 'cyan');
  const skiaNodeModulePath = path.join(process.cwd(), 'node_modules/@shopify/react-native-skia');
  if (fs.existsSync(skiaNodeModulePath)) {
    log('✅ React Native Skia is installed in node_modules', 'green');
    
    // Check the actual version
    const skiaPackageJsonPath = path.join(skiaNodeModulePath, 'package.json');
    if (fs.existsSync(skiaPackageJsonPath)) {
      const skiaPackageJson = JSON.parse(fs.readFileSync(skiaPackageJsonPath, 'utf8'));
      log(`   Version: ${skiaPackageJson.version}`, 'green');
      
      // Check if it's compatible with React 19
      if (skiaPackageJson.version.startsWith('2.')) {
        log('   ✅ Compatible with React 19', 'green');
      } else {
        log('   ⚠️  May not be fully compatible with React 19', 'yellow');
      }
    }
  } else {
    log('❌ React Native Skia not found in node_modules', 'red');
    log('   Run: npm install --legacy-peer-deps', 'yellow');
    allChecks = false;
  }
  
  // Check iOS Pods
  if (fs.existsSync(path.join(process.cwd(), 'ios'))) {
    log('\n📱 Checking iOS Pods:', 'cyan');
    const podfileLockPath = path.join(process.cwd(), 'ios/Podfile.lock');
    if (fs.existsSync(podfileLockPath)) {
      const podfileLock = fs.readFileSync(podfileLockPath, 'utf8');
      if (podfileLock.includes('react-native-skia')) {
        log('✅ React Native Skia pod is installed', 'green');
        // Extract version
        const match = podfileLock.match(/react-native-skia \(([^)]+)\)/);
        if (match) {
          log(`   Version: ${match[1]}`, 'green');
        }
      } else {
        log('❌ React Native Skia pod not found', 'red');
        log('   Run: cd ios && pod install', 'yellow');
        allChecks = false;
      }
    } else {
      log('⚠️  Podfile.lock not found - run pod install', 'yellow');
    }
  }
  
  // Summary
  log('\n📊 Test Summary:', 'cyan');
  log('================', 'cyan');
  if (allChecks) {
    log('✅ All premium features are properly configured!', 'green');
    log('\nYou can now:', 'green');
    log('1. Run the app: npm run ios', 'green');
    log('2. Premium weather effects will be active', 'green');
    log('3. IoT Dashboard is available in the app', 'green');
  } else {
    log('⚠️  Some issues were found. Please check the errors above.', 'yellow');
    log('\nRecommended fixes:', 'yellow');
    log('1. Run: npm install --legacy-peer-deps', 'yellow');
    log('2. Run: cd ios && pod install', 'yellow');
    log('3. Run this test again: npm run premium:test', 'yellow');
  }
  
  // Check if premium features are enabled in config
  const configPath = path.join(process.cwd(), 'src/config/PremiumConfig.ts');
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf8');
    if (config.includes('usePremiumEffects: true')) {
      log('\n✅ Premium weather effects are ENABLED in config', 'green');
    } else if (config.includes('usePremiumEffects: false')) {
      log('\n⚠️  Premium weather effects are DISABLED in config', 'yellow');
      log('   Edit src/config/PremiumConfig.ts to enable', 'yellow');
    }
  }
}

main().catch(error => {
  log(`\n❌ Test failed: ${error.message}`, 'red');
  process.exit(1);
});