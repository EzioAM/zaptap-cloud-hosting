#!/usr/bin/env node

/**
 * Deep Linking and Authentication Configuration Test
 * 
 * This script validates that deep linking and authentication are properly configured
 * in the ShortcutsLike/Zaptap app.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Deep Linking and Authentication Configuration\n');

// Test results tracking
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
const issues = [];

function testFile(filePath, testName, checks) {
  testsRun++;
  console.log(`\n📋 Testing: ${testName}`);
  console.log(`   File: ${filePath}`);
  
  try {
    if (!fs.existsSync(filePath)) {
      testsFailed++;
      issues.push(`❌ ${testName}: File not found - ${filePath}`);
      console.log('   ❌ File not found');
      return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    let allChecksPassed = true;
    
    for (const check of checks) {
      if (check.pattern) {
        const found = check.pattern.test(content);
        if (check.shouldExist ? !found : found) {
          allChecksPassed = false;
          const message = check.shouldExist 
            ? `Missing: ${check.description}`
            : `Should not exist: ${check.description}`;
          console.log(`   ❌ ${message}`);
          issues.push(`❌ ${testName}: ${message}`);
        } else {
          console.log(`   ✅ ${check.description}`);
        }
      }
      
      if (check.custom) {
        const result = check.custom(content);
        if (!result.passed) {
          allChecksPassed = false;
          console.log(`   ❌ ${result.message}`);
          issues.push(`❌ ${testName}: ${result.message}`);
        } else {
          console.log(`   ✅ ${result.message}`);
        }
      }
    }
    
    if (allChecksPassed) {
      testsPassed++;
      console.log('   ✅ All checks passed');
      return true;
    } else {
      testsFailed++;
      return false;
    }
  } catch (error) {
    testsFailed++;
    issues.push(`❌ ${testName}: Error reading file - ${error.message}`);
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

// Test 1: App Configuration
testFile('./app.config.js', 'App Configuration', [
  {
    pattern: /scheme:\s*"zaptap"/,
    shouldExist: true,
    description: 'Zaptap scheme configured'
  },
  {
    pattern: /applinks:zaptap\.cloud/,
    shouldExist: true,
    description: 'Universal links for zaptap.cloud'
  },
  {
    pattern: /applinks:www\.zaptap\.cloud/,
    shouldExist: true,
    description: 'Universal links for www.zaptap.cloud'
  },
  {
    pattern: /scheme:\s*"shortcuts-like"/,
    shouldExist: true,
    description: 'Legacy shortcuts-like scheme support'
  },
  {
    custom: (content) => {
      const hasIosConfig = /ios:\s*{/.test(content);
      const hasAndroidConfig = /android:\s*{/.test(content);
      return {
        passed: hasIosConfig && hasAndroidConfig,
        message: hasIosConfig && hasAndroidConfig 
          ? 'Both iOS and Android configurations present'
          : 'Missing platform configuration'
      };
    }
  }
]);

// Test 2: LinkingService Implementation
testFile('./src/services/linking/LinkingService.ts', 'LinkingService', [
  {
    pattern: /parseDeepLink|handleIncomingLink/,
    shouldExist: true,
    description: 'Deep link parsing methods'
  },
  {
    pattern: /zaptap:\/\//,
    shouldExist: true,
    description: 'Handles zaptap:// scheme'
  },
  {
    pattern: /shortcuts-like:\/\//,
    shouldExist: true,
    description: 'Handles legacy shortcuts-like:// scheme'
  },
  {
    pattern: /handlePasswordReset|handleAuthCallback/,
    shouldExist: true,
    description: 'Auth-related deep link handlers'
  },
  {
    pattern: /zaptap\.cloud/,
    shouldExist: true,
    description: 'Handles zaptap.cloud universal links'
  }
]);

// Test 3: Navigation Configuration
testFile('./src/navigation/AppNavigator.tsx', 'Navigation Configuration', [
  {
    pattern: /linking\s*=\s*{/,
    shouldExist: true,
    description: 'Linking configuration object'
  },
  {
    pattern: /prefixes:\s*\[/,
    shouldExist: true,
    description: 'URL prefixes configured'
  },
  {
    pattern: /'zaptap:\/\/'/,
    shouldExist: true,
    description: 'Zaptap prefix in navigation'
  },
  {
    pattern: /getStateFromPath/,
    shouldExist: true,
    description: 'Custom URL parsing logic'
  }
]);

// Test 4: Supabase Configuration
testFile('./src/services/supabase/client.ts', 'Supabase Client', [
  {
    pattern: /detectSessionInUrl:\s*true/,
    shouldExist: true,
    description: 'Session detection from URL enabled'
  },
  {
    pattern: /autoRefreshToken:\s*true/,
    shouldExist: true,
    description: 'Auto token refresh enabled'
  },
  {
    pattern: /persistSession:\s*true/,
    shouldExist: true,
    description: 'Session persistence enabled'
  },
  {
    pattern: /flowType:\s*['"]pkce['"]/,
    shouldExist: true,
    description: 'PKCE flow configured'
  }
]);

// Test 5: Auth Slice
testFile('./src/store/slices/authSlice.ts', 'Auth Slice', [
  {
    pattern: /resetPassword|updatePassword/,
    shouldExist: true,
    description: 'Password reset actions'
  },
  {
    pattern: /restoreSession/,
    shouldExist: true,
    description: 'Session restoration action'
  },
  {
    pattern: /refreshProfile|recoverAuthState/,
    shouldExist: true,
    description: 'Auth recovery mechanisms'
  }
]);

// Test 6: Auth Initializer
testFile('./src/components/auth/AuthInitializer.tsx', 'Auth Initializer', [
  {
    pattern: /getSession|refreshSession/,
    shouldExist: true,
    description: 'Session management methods'
  },
  {
    pattern: /onAuthStateChange/,
    shouldExist: true,
    description: 'Auth state change listener'
  },
  {
    pattern: /TOKEN_REFRESHED|SIGNED_IN|SIGNED_OUT/,
    shouldExist: true,
    description: 'Auth event handlers'
  }
]);

// Test 7: Navigation Types
testFile('./src/navigation/types.ts', 'Navigation Types', [
  {
    pattern: /ResetPassword:\s*undefined/,
    shouldExist: true,
    description: 'ResetPassword route type'
  },
  {
    pattern: /AutomationExecution:\s*{[^}]*automationId/,
    shouldExist: true,
    description: 'AutomationExecution route type'
  },
  {
    pattern: /AuthCallback:/,
    shouldExist: true,
    description: 'AuthCallback route type'
  }
]);

// Test 8: Main Navigator Routes
testFile('./src/navigation/MainNavigator.tsx', 'Main Navigator', [
  {
    pattern: /name="ResetPassword"/,
    shouldExist: true,
    description: 'ResetPassword screen registered'
  },
  {
    pattern: /import.*ResetPasswordScreen/,
    shouldExist: true,
    description: 'ResetPasswordScreen imported'
  },
  {
    pattern: /name="SignIn"/,
    shouldExist: true,
    description: 'SignIn screen registered'
  },
  {
    pattern: /name="SignUp"/,
    shouldExist: true,
    description: 'SignUp screen registered'
  }
]);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${testsRun}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Success Rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

if (issues.length > 0) {
  console.log('\n🔴 ISSUES FOUND:');
  issues.forEach(issue => console.log(`  ${issue}`));
  
  console.log('\n📝 RECOMMENDATIONS:');
  console.log('1. Review and fix the issues listed above');
  console.log('2. Ensure all deep link routes are properly registered');
  console.log('3. Test deep links on both iOS and Android devices');
  console.log('4. Verify auth flow works with email/password and magic links');
  console.log('5. Test session persistence across app restarts');
} else {
  console.log('\n✅ All deep linking and auth configurations are correct!');
  console.log('\n📝 NEXT STEPS:');
  console.log('1. Test deep links with: npx uri-scheme open "zaptap://automation/test" --ios');
  console.log('2. Test universal links: https://zaptap.cloud/link/[automation-id]');
  console.log('3. Test auth flow end-to-end');
  console.log('4. Verify password reset emails contain correct deep links');
}

process.exit(testsFailed > 0 ? 1 : 0);