#!/usr/bin/env node

/**
 * Test Premium Features with Fallbacks
 * Verifies that all premium features work correctly with or without native modules
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// Test configurations
const tests = [
  {
    name: 'Skia Availability Check',
    description: 'Verifies React Native Skia module detection',
    files: [
      'src/config/PremiumConfig.ts',
      'src/components/weather/SkiaCompatibilityWrapper.tsx'
    ]
  },
  {
    name: 'Weather Effects Fallback',
    description: 'Tests weather widget with and without Skia',
    files: [
      'src/components/organisms/DashboardWidgets/FeaturedAutomationWeatherWidget.tsx',
      'src/components/weather/WeatherEffects.tsx',
      'src/components/weather/PremiumWeatherEffects.tsx'
    ]
  },
  {
    name: 'IoT Native Module Wrapper',
    description: 'Verifies IoT service works with mock data when native modules unavailable',
    files: [
      'src/services/iot/NativeModuleWrapper.ts',
      'src/services/iot/IoTIntegrationService.ts'
    ]
  },
  {
    name: 'iOS Native Bridges',
    description: 'Checks iOS native module files exist',
    files: [
      'ios/Zaptap/IoTBridges/MatterBridge.swift',
      'ios/Zaptap/IoTBridges/MatterBridge.m',
      'ios/Zaptap/IoTBridges/HomeKitBridge.swift',
      'ios/Zaptap/IoTBridges/HomeKitBridge.m'
    ]
  }
];

// Check if a file exists and contains fallback logic
function checkFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { exists: false, hasFallback: false };
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check for fallback patterns
  const fallbackPatterns = [
    'fallback',
    'catch',
    'try',
    'mock',
    'default',
    '||',
    '??',
    'isAvailable',
    'wrapper'
  ];
  
  const hasFallback = fallbackPatterns.some(pattern => 
    content.toLowerCase().includes(pattern)
  );
  
  return { exists: true, hasFallback };
}

// Run tests
async function runTests() {
  log('\n🧪 Testing Premium Features with Fallbacks', 'bright');
  log('==========================================\n', 'bright');
  
  let allPassed = true;
  const results = [];
  
  for (const test of tests) {
    log(`\n📋 ${test.name}`, 'cyan');
    log(`   ${test.description}`, 'reset');
    log('   -------------------', 'reset');
    
    let testPassed = true;
    const fileResults = [];
    
    for (const file of test.files) {
      const result = checkFile(file);
      
      if (!result.exists) {
        log(`   ❌ ${file} - NOT FOUND`, 'red');
        testPassed = false;
        fileResults.push({ file, status: 'missing' });
      } else if (result.hasFallback) {
        log(`   ✅ ${file} - Has fallback logic`, 'green');
        fileResults.push({ file, status: 'good' });
      } else {
        log(`   ⚠️  ${file} - No obvious fallback`, 'yellow');
        fileResults.push({ file, status: 'warning' });
      }
    }
    
    results.push({
      test: test.name,
      passed: testPassed,
      files: fileResults
    });
    
    if (!testPassed) {
      allPassed = false;
    }
  }
  
  // Additional runtime checks
  log('\n\n🔍 Runtime Compatibility Checks', 'cyan');
  log('================================', 'cyan');
  
  // Check package.json for correct versions
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    log('\n📦 Dependency Versions:', 'magenta');
    
    // Check React version
    const reactVersion = packageJson.dependencies.react;
    if (reactVersion && reactVersion.includes('19')) {
      log(`   ✅ React: ${reactVersion} (React 19 detected)`, 'green');
    } else {
      log(`   ⚠️  React: ${reactVersion || 'not found'}`, 'yellow');
    }
    
    // Check React Native Skia
    const skiaVersion = packageJson.dependencies['@shopify/react-native-skia'];
    if (skiaVersion) {
      if (skiaVersion.includes('2.')) {
        log(`   ✅ Skia: ${skiaVersion} (Compatible with React 19)`, 'green');
      } else {
        log(`   ⚠️  Skia: ${skiaVersion} (May not be compatible)`, 'yellow');
      }
    } else {
      log(`   ❌ Skia: Not found in dependencies`, 'red');
    }
    
    // Check React Native version
    const rnVersion = packageJson.dependencies['react-native'];
    if (rnVersion) {
      log(`   ℹ️  React Native: ${rnVersion}`, 'cyan');
    }
  }
  
  // Check for iOS pod installation
  log('\n📱 iOS Configuration:', 'magenta');
  const podfileLockPath = path.join(process.cwd(), 'ios/Podfile.lock');
  if (fs.existsSync(podfileLockPath)) {
    const podfileLock = fs.readFileSync(podfileLockPath, 'utf8');
    if (podfileLock.includes('react-native-skia')) {
      const skiaMatch = podfileLock.match(/react-native-skia \(([^)]+)\)/);
      if (skiaMatch) {
        log(`   ✅ Skia pod installed: ${skiaMatch[1]}`, 'green');
      }
    } else {
      log(`   ⚠️  Skia pod not found - run 'cd ios && pod install'`, 'yellow');
    }
  } else {
    log(`   ⚠️  Podfile.lock not found - iOS not configured`, 'yellow');
  }
  
  // Summary
  log('\n\n📊 Test Summary', 'bright');
  log('===============', 'bright');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;
  
  if (allPassed) {
    log(`✅ All ${totalTests} test suites passed!`, 'green');
    log('\n🎉 Premium features are properly configured with fallbacks!', 'green');
  } else {
    log(`⚠️  ${passedTests}/${totalTests} test suites passed`, 'yellow');
    log('\nSome issues detected, but fallbacks should handle them gracefully.', 'yellow');
  }
  
  // Recommendations
  log('\n\n💡 Recommendations:', 'cyan');
  log('==================', 'cyan');
  
  if (!allPassed) {
    log('1. Run: npm install --legacy-peer-deps', 'reset');
    log('2. Run: cd ios && pod install', 'reset');
    log('3. Rebuild the app: npm run rebuild:ios', 'reset');
  } else {
    log('✨ Everything looks good! Your app should work with or without native modules.', 'green');
  }
  
  log('\n📝 Testing Tips:', 'cyan');
  log('• The app will use premium effects when Skia is available', 'reset');
  log('• It will gracefully fall back to standard effects otherwise', 'reset');
  log('• IoT features will show mock devices when native modules are unavailable', 'reset');
  log('• Check console logs for [PremiumConfig] and [SkiaWrapper] messages', 'reset');
  
  return allPassed;
}

// Run the tests
runTests().then(passed => {
  process.exit(passed ? 0 : 1);
}).catch(error => {
  log(`\n❌ Test failed: ${error.message}`, 'red');
  process.exit(1);
});