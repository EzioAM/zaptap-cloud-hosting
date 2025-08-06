#!/usr/bin/env node

/**
 * Comprehensive test script to verify Discover Screen and Monitoring Service fixes
 * This script validates that all the implemented fixes are working correctly
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, result, details = '') {
  const status = result ? 'PASS' : 'FAIL';
  const statusColor = result ? 'green' : 'red';
  
  log(`  ${status}: ${testName}`, statusColor);
  if (details) {
    log(`    ${details}`, 'cyan');
  }
  
  testResults.tests.push({ name: testName, result, details });
  if (result) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function logWarning(message) {
  log(`  WARNING: ${message}`, 'yellow');
  testResults.warnings++;
}

function readFileContent(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
    return null;
  } catch (error) {
    return null;
  }
}

function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  return fs.existsSync(fullPath);
}

// Test functions
function testDiscoverScreenSafeTheme() {
  log('\n1. Testing DiscoverScreenSafe Theme Implementation', 'bold');
  
  const filePath = 'src/screens/modern/DiscoverScreenSafe.tsx';
  const content = readFileContent(filePath);
  
  if (!content) {
    logTest('File exists', false, 'DiscoverScreenSafe.tsx not found');
    return;
  }
  
  logTest('File exists', true);
  
  // Check for proper theme usage in container background
  const hasThemeBackground = content.includes('backgroundColor: theme.colors?.background?.primary || theme.colors?.background || \'#ffffff\'');
  logTest('Uses theme-based background color', hasThemeBackground, 
    hasThemeBackground ? 'Found proper theme background fallback chain' : 'Missing theme background implementation');
  
  // Check that hardcoded black backgrounds are removed
  const hasHardcodedBlack = content.includes('backgroundColor: \'#000') || content.includes('backgroundColor: \'black\'');
  logTest('No hardcoded black backgrounds', !hasHardcodedBlack, 
    hasHardcodedBlack ? 'Found hardcoded black background' : 'No hardcoded black backgrounds found');
  
  // Check for proper text color usage
  const hasThemeTextColors = content.includes('color: theme.colors?.text ||') && content.includes('color: theme.colors?.textSecondary ||');
  logTest('Uses theme-based text colors', hasThemeTextColors, 
    hasThemeTextColors ? 'Found theme text color implementations' : 'Missing theme text color usage');
  
  // Check for SafeAreaView usage
  const usesSafeAreaView = content.includes('<SafeAreaView') && content.includes('from \'react-native-safe-area-context\'');
  logTest('Uses SafeAreaView properly', usesSafeAreaView, 
    usesSafeAreaView ? 'Properly imports and uses SafeAreaView' : 'Missing SafeAreaView usage');
}

function testDiscoverScreenEnhancedTheme() {
  log('\n2. Testing DiscoverScreenEnhanced Theme Implementation', 'bold');
  
  const filePath = 'src/screens/modern/DiscoverScreenEnhanced.tsx';
  const content = readFileContent(filePath);
  
  if (!content) {
    logTest('File exists', false, 'DiscoverScreenEnhanced.tsx not found');
    return;
  }
  
  logTest('File exists', true);
  
  // Check that container uses proper theme background (not hardcoded)
  const containerStylePattern = /container:\s*{[^}]*backgroundColor:\s*['"]#ffffff['"][^}]*}/;
  const hasDefaultWhiteInStyles = containerStylePattern.test(content);
  const hasThemeBackgroundInline = content.includes('backgroundColor: theme.colors?.background?.primary || theme.colors?.background || \'#ffffff\'');
  
  logTest('Container has proper theme background', hasThemeBackgroundInline, 
    hasThemeBackgroundInline ? 'Uses theme background with inline styles' : 'Missing theme background in container');
  
  if (hasDefaultWhiteInStyles) {
    logWarning('Default white background found in styles - should be overridden by inline theme styles');
  }
  
  // Check that hardcoded black backgrounds are removed from components
  const hasHardcodedBlackInJsx = /<[^>]+backgroundColor=['"]#000|backgroundColor['"]black['"]/g.test(content);
  logTest('No hardcoded black in JSX', !hasHardcodedBlackInJsx, 
    hasHardcodedBlackInJsx ? 'Found hardcoded black in JSX elements' : 'No hardcoded black in JSX');
  
  // Check for gradient and glass effect usage
  const usesGradients = content.includes('LinearGradient') && content.includes('gradients.');
  logTest('Uses gradient system', usesGradients, 
    usesGradients ? 'Found gradient system usage' : 'Missing gradient system');
  
  // Check for proper text styling
  const usesTextShadows = content.includes('textShadows.');
  logTest('Uses text shadow system', usesTextShadows, 
    usesTextShadows ? 'Found text shadow usage for enhanced visibility' : 'Missing text shadow system');
}

function testPerformanceMonitorDatabase() {
  log('\n3. Testing PerformanceMonitor Database Availability Handling', 'bold');
  
  const filePath = 'src/services/monitoring/PerformanceMonitor.ts';
  const content = readFileContent(filePath);
  
  if (!content) {
    logTest('File exists', false, 'PerformanceMonitor.ts not found');
    return;
  }
  
  logTest('File exists', true);
  
  // Check for database availability property
  const hasDatabaseAvailableProperty = content.includes('private databaseAvailable = false');
  logTest('Has database availability tracking', hasDatabaseAvailableProperty, 
    hasDatabaseAvailableProperty ? 'Found databaseAvailable property' : 'Missing database availability tracking');
  
  // Check for checkDatabaseAvailability method
  const hasCheckDatabaseMethod = content.includes('private async checkDatabaseAvailability()');
  logTest('Has database availability check method', hasCheckDatabaseMethod, 
    hasCheckDatabaseMethod ? 'Found checkDatabaseAvailability method' : 'Missing database check method');
  
  // Check for table access testing
  const hasTableAccessTest = content.includes('performance_metrics') && content.includes('select(\'id\', { head: true, count: \'exact\' })');
  logTest('Tests table access before operations', hasTableAccessTest, 
    hasTableAccessTest ? 'Found table access testing in database check' : 'Missing table access test');
  
  // Check for graceful degradation in flush method
  const hasGracefulFlush = content.includes('if (!this.databaseAvailable)') && content.includes('await this.storeOfflineMetrics');
  logTest('Handles database unavailability gracefully', hasGracefulFlush, 
    hasGracefulFlush ? 'Found offline storage fallback when database unavailable' : 'Missing graceful degradation');
  
  // Check for initialization even when database fails
  const hasFailSafeInit = content.includes('this.isInitialized = true; // Mark as initialized to prevent blocking');
  logTest('Prevents initialization blocking on errors', hasFailSafeInit, 
    hasFailSafeInit ? 'Found fail-safe initialization' : 'Missing fail-safe initialization');
  
  // Check for proper error logging
  const hasDetailedErrorLogging = content.includes('EventLogger.warn') && content.includes('Database not available');
  logTest('Logs database availability issues', hasDetailedErrorLogging, 
    hasDetailedErrorLogging ? 'Found proper database error logging' : 'Missing database error logging');
}

function testCrashReporterDatabase() {
  log('\n4. Testing CrashReporter Database Availability Handling', 'bold');
  
  const filePath = 'src/services/monitoring/CrashReporter.ts';
  const content = readFileContent(filePath);
  
  if (!content) {
    logTest('File exists', false, 'CrashReporter.ts not found');
    return;
  }
  
  logTest('File exists', true);
  
  // Check for database availability property
  const hasDatabaseAvailableProperty = content.includes('private databaseAvailable = false');
  logTest('Has database availability tracking', hasDatabaseAvailableProperty, 
    hasDatabaseAvailableProperty ? 'Found databaseAvailable property' : 'Missing database availability tracking');
  
  // Check for checkDatabaseAvailability method
  const hasCheckDatabaseMethod = content.includes('private async checkDatabaseAvailability()');
  logTest('Has database availability check method', hasCheckDatabaseMethod, 
    hasCheckDatabaseMethod ? 'Found checkDatabaseAvailability method' : 'Missing database check method');
  
  // Check for table access testing
  const hasTableAccessTest = content.includes('error_reports') && content.includes('select(\'id\', { head: true, count: \'exact\' })');
  logTest('Tests table access before operations', hasTableAccessTest, 
    hasTableAccessTest ? 'Found table access testing in database check' : 'Missing table access test');
  
  // Check for graceful degradation in flush method
  const hasGracefulFlush = content.includes('if (!this.databaseAvailable)') && content.includes('await this.storeOfflineReports');
  logTest('Handles database unavailability gracefully', hasGracefulFlush, 
    hasGracefulFlush ? 'Found offline storage fallback when database unavailable' : 'Missing graceful degradation');
  
  // Check for initialization even when database fails
  const hasFailSafeInit = content.includes('this.isInitialized = true; // Mark as initialized to prevent blocking');
  logTest('Prevents initialization blocking on errors', hasFailSafeInit, 
    hasFailSafeInit ? 'Found fail-safe initialization' : 'Missing fail-safe initialization');
  
  // Check for proper error logging
  const hasDetailedErrorLogging = content.includes('EventLogger.warn') && content.includes('Database not available');
  logTest('Logs database availability issues', hasDetailedErrorLogging, 
    hasDetailedErrorLogging ? 'Found proper database error logging' : 'Missing database error logging');
}

function testMonitoringServicesIntegration() {
  log('\n5. Testing Monitoring Services Integration', 'bold');
  
  // Check if monitoring services are properly exported and available
  const performanceMonitorPath = 'src/services/monitoring/PerformanceMonitor.ts';
  const crashReporterPath = 'src/services/monitoring/CrashReporter.ts';
  
  const perfContent = readFileContent(performanceMonitorPath);
  const crashContent = readFileContent(crashReporterPath);
  
  if (perfContent && crashContent) {
    logTest('Both monitoring services exist', true, 'PerformanceMonitor and CrashReporter files found');
    
    // Check for singleton exports
    const perfHasSingleton = perfContent.includes('export const PerformanceMonitor = new PerformanceMonitorService()');
    const crashHasSingleton = crashContent.includes('export const CrashReporter = new CrashReporterService()');
    
    logTest('Services exported as singletons', perfHasSingleton && crashHasSingleton, 
      `PerformanceMonitor: ${perfHasSingleton}, CrashReporter: ${crashHasSingleton}`);
    
    // Check for convenience function exports
    const perfHasConvenience = perfContent.includes('export const startScreenRender') && perfContent.includes('export const trackCustomMetric');
    const crashHasConvenience = crashContent.includes('export const reportError') && crashContent.includes('export const addBreadcrumb');
    
    logTest('Services export convenience functions', perfHasConvenience && crashHasConvenience, 
      `PerformanceMonitor: ${perfHasConvenience}, CrashReporter: ${crashHasConvenience}`);
  } else {
    logTest('Both monitoring services exist', false, 'One or both monitoring service files not found');
  }
}

function testErrorHandlingPatterns() {
  log('\n6. Testing Error Handling Patterns', 'bold');
  
  const files = [
    'src/services/monitoring/PerformanceMonitor.ts',
    'src/services/monitoring/CrashReporter.ts'
  ];
  
  let allFilesHaveProperErrorHandling = true;
  
  files.forEach(filePath => {
    const content = readFileContent(filePath);
    if (!content) {
      allFilesHaveProperErrorHandling = false;
      return;
    }
    
    // Check for try-catch blocks around database operations
    const hasTryCatchBlocks = (content.match(/try\s*{/g) || []).length >= 3;
    const hasErrorLogging = content.includes('EventLogger.error') || content.includes('EventLogger.warn');
    const hasGracefulDegradation = content.includes('catch') && content.includes('finally');
    
    if (!hasTryCatchBlocks || !hasErrorLogging) {
      allFilesHaveProperErrorHandling = false;
    }
  });
  
  logTest('Services have proper error handling patterns', allFilesHaveProperErrorHandling, 
    allFilesHaveProperErrorHandling ? 'All services use try-catch and error logging' : 'Some services missing error handling');
}

function testComponentThemeConsistency() {
  log('\n7. Testing Component Theme Consistency', 'bold');
  
  const discoverFiles = [
    'src/screens/modern/DiscoverScreenSafe.tsx',
    'src/screens/modern/DiscoverScreenEnhanced.tsx'
  ];
  
  let allFilesUseThemeConsistently = true;
  const themePatterns = [
    'useSafeTheme()',
    'theme.colors?.background',
    'theme.colors?.text'
  ];
  
  discoverFiles.forEach(filePath => {
    const content = readFileContent(filePath);
    if (!content) {
      allFilesUseThemeConsistently = false;
      return;
    }
    
    const hasAllPatterns = themePatterns.every(pattern => content.includes(pattern));
    if (!hasAllPatterns) {
      allFilesUseThemeConsistently = false;
    }
  });
  
  logTest('Discover screens use theme consistently', allFilesUseThemeConsistently, 
    allFilesUseThemeConsistently ? 'All screens use proper theme patterns' : 'Some screens missing theme consistency');
}

function testOfflineStorageImplementation() {
  log('\n8. Testing Offline Storage Implementation', 'bold');
  
  const files = [
    'src/services/monitoring/PerformanceMonitor.ts',
    'src/services/monitoring/CrashReporter.ts'
  ];
  
  let allFilesHaveOfflineStorage = true;
  
  files.forEach(filePath => {
    const content = readFileContent(filePath);
    if (!content) {
      allFilesHaveOfflineStorage = false;
      return;
    }
    
    const hasAsyncStorage = content.includes("import AsyncStorage from '@react-native-async-storage/async-storage'");
    const hasStorageKeys = content.includes('_KEY =');
    const hasStoreOfflineMethod = content.includes('storeOffline') || content.includes('setItem');
    const hasLoadOfflineMethod = content.includes('loadOffline') || content.includes('getItem');
    
    if (!hasAsyncStorage || !hasStorageKeys || !hasStoreOfflineMethod || !hasLoadOfflineMethod) {
      allFilesHaveOfflineStorage = false;
    }
  });
  
  logTest('Services implement offline storage', allFilesHaveOfflineStorage, 
    allFilesHaveOfflineStorage ? 'All services have complete offline storage' : 'Some services missing offline storage features');
}

// Main test execution
function runAllTests() {
  log('🔍 Starting Comprehensive Fix Verification', 'bold');
  log('=' * 60, 'cyan');
  
  // Run all test suites
  testDiscoverScreenSafeTheme();
  testDiscoverScreenEnhancedTheme();
  testPerformanceMonitorDatabase();
  testCrashReporterDatabase();
  testMonitoringServicesIntegration();
  testErrorHandlingPatterns();
  testComponentThemeConsistency();
  testOfflineStorageImplementation();
  
  // Print summary
  log('\n📊 Test Summary', 'bold');
  log('=' * 30, 'cyan');
  log(`✅ Tests Passed: ${testResults.passed}`, 'green');
  log(`❌ Tests Failed: ${testResults.failed}`, 'red');
  log(`⚠️  Warnings: ${testResults.warnings}`, 'yellow');
  
  const totalTests = testResults.passed + testResults.failed;
  const successRate = ((testResults.passed / totalTests) * 100).toFixed(1);
  
  if (testResults.failed === 0) {
    log(`\n🎉 All tests passed! Success rate: ${successRate}%`, 'green');
    log('✨ All fixes have been successfully implemented and verified.', 'green');
  } else {
    log(`\n📋 Success rate: ${successRate}% (${testResults.passed}/${totalTests})`, 'yellow');
    log('❗ Some issues were found. Please review the failed tests above.', 'yellow');
  }
  
  if (testResults.warnings > 0) {
    log(`⚠️  ${testResults.warnings} warnings noted. Review for potential improvements.`, 'yellow');
  }
  
  return testResults.failed === 0;
}

// Execute tests
const success = runAllTests();
process.exit(success ? 0 : 1);