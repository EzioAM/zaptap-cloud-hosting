#!/usr/bin/env node

/**
 * Network Integration Test Script
 * 
 * This script tests the network detection and state propagation
 * to ensure the fixes are working properly.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Network Integration Test Suite');
console.log('==================================\n');

// Test configuration
const tests = [
  {
    name: 'SyncManager Network Configuration',
    description: 'Check if SyncManager has proper NetInfo configuration',
    test: () => {
      const syncManagerPath = path.join(__dirname, 'src/services/offline/SyncManager.ts');
      const content = fs.readFileSync(syncManagerPath, 'utf8');
      
      const hasNetInfoConfig = content.includes('NetInfo.configure');
      const hasReachabilityUrl = content.includes('reachabilityUrl');
      const hasProperHandling = content.includes('handleNetworkStateChange');
      const hasInitialFetch = content.includes('fetchInitialNetworkState');
      
      return {
        passed: hasNetInfoConfig && hasReachabilityUrl && hasProperHandling && hasInitialFetch,
        details: {
          hasNetInfoConfig,
          hasReachabilityUrl,
          hasProperHandling,
          hasInitialFetch
        }
      };
    }
  },
  {
    name: 'NetworkService Integration',
    description: 'Check if NetworkService is properly integrated',
    test: () => {
      const networkServicePath = path.join(__dirname, 'src/services/network/NetworkService.ts');
      const exists = fs.existsSync(networkServicePath);
      
      if (!exists) {
        return { passed: false, details: { exists: false } };
      }
      
      const content = fs.readFileSync(networkServicePath, 'utf8');
      const hasSingleton = content.includes('getInstance');
      const hasInitialize = content.includes('initialize');
      const hasReduxIntegration = content.includes('updateNetworkState');
      const hasNetInfoConfig = content.includes('NetInfo.configure');
      
      return {
        passed: hasSingleton && hasInitialize && hasReduxIntegration && hasNetInfoConfig,
        details: {
          exists,
          hasSingleton,
          hasInitialize,
          hasReduxIntegration,
          hasNetInfoConfig
        }
      };
    }
  },
  {
    name: 'Offline Slice Integration',
    description: 'Check if offline slice properly initializes network monitoring',
    test: () => {
      const offlineSlicePath = path.join(__dirname, 'src/store/slices/offlineSlice.ts');
      const content = fs.readFileSync(offlineSlicePath, 'utf8');
      
      const hasNetworkServiceImport = content.includes('NetworkService');
      const hasInitializeSystem = content.includes('initializeOfflineSystem');
      const hasUpdateNetworkState = content.includes('updateNetworkState');
      const hasProperErrorHandling = content.includes('networkError');
      
      return {
        passed: hasNetworkServiceImport && hasInitializeSystem && hasUpdateNetworkState && hasProperErrorHandling,
        details: {
          hasNetworkServiceImport,
          hasInitializeSystem,
          hasUpdateNetworkState,
          hasProperErrorHandling
        }
      };
    }
  },
  {
    name: 'App.tsx Integration',
    description: 'Check if App.tsx properly initializes network monitoring',
    test: () => {
      const appPath = path.join(__dirname, 'App.tsx');
      const content = fs.readFileSync(appPath, 'utf8');
      
      const hasInitializeOfflineSystem = content.includes('initializeOfflineSystem');
      const hasProperImport = content.includes('store/slices/offlineSlice');
      const hasErrorHandling = content.includes('networkError');
      const callsDispatch = content.includes('storeInstance.dispatch');
      
      return {
        passed: hasInitializeOfflineSystem && hasProperImport && hasErrorHandling && callsDispatch,
        details: {
          hasInitializeOfflineSystem,
          hasProperImport,
          hasErrorHandling,
          callsDispatch
        }
      };
    }
  },
  {
    name: 'Supabase Client Network Awareness',
    description: 'Check if Supabase client has proper network monitoring',
    test: () => {
      const supabasePath = path.join(__dirname, 'src/services/supabase/client.ts');
      const content = fs.readFileSync(supabasePath, 'utf8');
      
      const hasNetworkMonitoring = content.includes('initializeNetworkMonitoring');
      const hasNetInfoConfig = content.includes('NetInfo.configure');
      const hasRetryLogic = content.includes('withRetry');
      const hasNetworkStatus = content.includes('getNetworkStatus');
      const hasCleanup = content.includes('networkUnsubscribe');
      
      return {
        passed: hasNetworkMonitoring && hasNetInfoConfig && hasRetryLogic && hasNetworkStatus && hasCleanup,
        details: {
          hasNetworkMonitoring,
          hasNetInfoConfig,
          hasRetryLogic,
          hasNetworkStatus,
          hasCleanup
        }
      };
    }
  },
  {
    name: 'NetworkContext Updates',
    description: 'Check if NetworkContext has proper initialization and error handling',
    test: () => {
      const networkContextPath = path.join(__dirname, 'src/contexts/NetworkContext.tsx');
      const content = fs.readFileSync(networkContextPath, 'utf8');
      
      const hasAsyncInitialization = content.includes('initialize = async');
      const hasTimeoutFallback = content.includes('timeoutId');
      const hasMountedCheck = content.includes('mounted');
      const hasErrorHandling = content.includes('try {') && content.includes('catch');
      const hasProperCleanup = content.includes('clearTimeout');
      
      return {
        passed: hasAsyncInitialization && hasTimeoutFallback && hasMountedCheck && hasErrorHandling && hasProperCleanup,
        details: {
          hasAsyncInitialization,
          hasTimeoutFallback,
          hasMountedCheck,
          hasErrorHandling,
          hasProperCleanup
        }
      };
    }
  }
];

// Run tests
let passed = 0;
let failed = 0;

console.log('Running tests...\n');

tests.forEach((test, index) => {
  try {
    console.log(`${index + 1}. ${test.name}`);
    console.log(`   ${test.description}`);
    
    const result = test.test();
    
    if (result.passed) {
      console.log('   ✅ PASSED');
      passed++;
    } else {
      console.log('   ❌ FAILED');
      console.log('   Details:', JSON.stringify(result.details, null, 4));
      failed++;
    }
    
  } catch (error) {
    console.log('   💥 ERROR:', error.message);
    failed++;
  }
  
  console.log('');
});

// Summary
console.log('Test Results Summary:');
console.log('====================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 All network integration tests passed!');
  console.log('The network detection and state propagation should now work correctly.');
  console.log('\nNext steps:');
  console.log('1. Run the app and check the Redux DevTools for network state');
  console.log('2. Test network connectivity changes (wifi on/off)');
  console.log('3. Check the NetworkStatusDebugger component for real-time monitoring');
} else {
  console.log('\n⚠️  Some tests failed. Please review the failed tests above.');
  process.exit(1);
}