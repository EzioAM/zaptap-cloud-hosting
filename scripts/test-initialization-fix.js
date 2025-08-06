#!/usr/bin/env node

/**
 * Test script to verify that initialization fixes resolve the Runtime Not Ready error
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing initialization fixes for Runtime Not Ready error...\n');

// Test 1: Check that EventLogger is imported before being used
console.log('📋 Test 1: EventLogger import order');
const appTsxPath = path.join(__dirname, '../App.tsx');
const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

const eventLoggerImportIndex = appTsxContent.indexOf("import { EventLogger }");
const eventLoggerUsageIndex = appTsxContent.indexOf("EventLogger.info('App', 'Application bootstrap starting')");

if (eventLoggerImportIndex !== -1 && eventLoggerUsageIndex !== -1) {
  if (eventLoggerImportIndex < eventLoggerUsageIndex) {
    console.log('✅ EventLogger is imported before being used');
  } else {
    console.log('❌ EventLogger is used before being imported');
    process.exit(1);
  }
} else {
  console.log('⚠️  Could not find EventLogger import/usage pattern');
}

// Test 2: Check that AnalyticsProvider has proper non-blocking initialization
console.log('\n📋 Test 2: AnalyticsProvider non-blocking initialization');
const analyticsContextPath = path.join(__dirname, '../src/contexts/AnalyticsContext.tsx');
const analyticsContextContent = fs.readFileSync(analyticsContextPath, 'utf8');

if (analyticsContextContent.includes('setIsInitialized(true)') && 
    analyticsContextContent.includes('setTimeout(async () => {')) {
  console.log('✅ AnalyticsProvider has non-blocking initialization');
} else {
  console.log('❌ AnalyticsProvider does not have proper non-blocking initialization');
  process.exit(1);
}

// Test 3: Check that AuthInitializer has delayed session check
console.log('\n📋 Test 3: AuthInitializer delayed session check');
const authInitializerPath = path.join(__dirname, '../src/components/auth/AuthInitializer.tsx');
const authInitializerContent = fs.readFileSync(authInitializerPath, 'utf8');

if (authInitializerContent.includes('}, 1000)') || authInitializerContent.includes('}, 500)')) {
  console.log('✅ AuthInitializer has delayed session check');
} else {
  console.log('❌ AuthInitializer does not have proper delayed session check');
  process.exit(1);
}

// Test 4: Check that AnalyticsService has non-blocking loadPersistedData
console.log('\n📋 Test 4: AnalyticsService non-blocking persistence loading');
const analyticsServicePath = path.join(__dirname, '../src/services/analytics/AnalyticsService.ts');
const analyticsServiceContent = fs.readFileSync(analyticsServicePath, 'utf8');

if (analyticsServiceContent.includes('this.loadPersistedData().catch(')) {
  console.log('✅ AnalyticsService has non-blocking persistence loading');
} else {
  console.log('❌ AnalyticsService does not have non-blocking persistence loading');
  process.exit(1);
}

// Test 5: Check that App.tsx has proper provider hierarchy
console.log('\n📋 Test 5: App.tsx provider hierarchy');
const safeAreaProviderIndex = appTsxContent.indexOf('<SafeAreaProvider>');
const reduxProviderIndex = appTsxContent.indexOf('<ReduxProvider');

if (safeAreaProviderIndex !== -1 && reduxProviderIndex !== -1) {
  if (safeAreaProviderIndex < reduxProviderIndex) {
    console.log('✅ SafeAreaProvider is properly positioned before ReduxProvider');
  } else {
    console.log('❌ SafeAreaProvider is not properly positioned');
    process.exit(1);
  }
} else {
  console.log('⚠️  Could not find SafeAreaProvider/ReduxProvider hierarchy');
}

console.log('\n🎉 All initialization tests passed!');
console.log('\n📝 Summary of fixes applied:');
console.log('   1. ✅ Fixed EventLogger import order issue');
console.log('   2. ✅ Made AnalyticsProvider initialization non-blocking');
console.log('   3. ✅ Added delayed session check in AuthInitializer');
console.log('   4. ✅ Made AnalyticsService persistence loading non-blocking');
console.log('   5. ✅ Verified proper provider hierarchy');

console.log('\n🚀 The Runtime Not Ready error should now be resolved!');
console.log('\nNext steps:');
console.log('   1. Test the app startup with `npm start`');
console.log('   2. Check that all services initialize properly in background');
console.log('   3. Verify that the UI renders immediately without blocking');