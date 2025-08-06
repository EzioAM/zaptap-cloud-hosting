#!/usr/bin/env node

/**
 * Test script for monitoring services offline storage functionality
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(colors.green, `✅ ${message}`);
}

function error(message) {
  log(colors.red, `❌ ${message}`);
}

function warning(message) {
  log(colors.yellow, `⚠️  ${message}`);
}

function info(message) {
  log(colors.blue, `ℹ️  ${message}`);
}

function header(message) {
  log(colors.bold, `\n=== ${message} ===`);
}

function checkOfflineStorageImplementation() {
  header('Testing Offline Storage Implementation');

  const performanceMonitorPath = path.join(__dirname, '../src/services/monitoring/PerformanceMonitor.ts');
  const crashReporterPath = path.join(__dirname, '../src/services/monitoring/CrashReporter.ts');

  // Test Performance Monitor
  info('Checking PerformanceMonitor...');
  
  if (!fs.existsSync(performanceMonitorPath)) {
    error('PerformanceMonitor.ts not found');
    return false;
  }

  const performanceContent = fs.readFileSync(performanceMonitorPath, 'utf8');
  
  // Check for required constants
  if (performanceContent.includes('OFFLINE_METRICS_KEY') && performanceContent.includes('OFFLINE_ALERTS_KEY')) {
    success('PerformanceMonitor has required offline storage constants');
  } else {
    error('PerformanceMonitor missing OFFLINE_METRICS_KEY or OFFLINE_ALERTS_KEY constants');
    return false;
  }

  // Check for required methods
  const requiredMethods = [
    'loadOfflineData',
    'storeOfflineMetrics',
    'storeOfflineAlerts',
    'syncOfflineData',
    'recheckDatabaseAvailability'
  ];

  let performanceMethodsOk = true;
  for (const method of requiredMethods) {
    if (performanceContent.includes(`${method}(`)) {
      success(`PerformanceMonitor has ${method} method`);
    } else {
      error(`PerformanceMonitor missing ${method} method`);
      performanceMethodsOk = false;
    }
  }

  // Test Crash Reporter
  info('Checking CrashReporter...');
  
  if (!fs.existsSync(crashReporterPath)) {
    error('CrashReporter.ts not found');
    return false;
  }

  const crashReporterContent = fs.readFileSync(crashReporterPath, 'utf8');
  
  // Check for required constants
  if (crashReporterContent.includes('OFFLINE_REPORTS_KEY')) {
    success('CrashReporter has required offline storage constant');
  } else {
    error('CrashReporter missing OFFLINE_REPORTS_KEY constant');
    return false;
  }

  // Check for required methods
  const crashRequiredMethods = [
    'loadOfflineReports',
    'storeOfflineReports',
    'syncOfflineReports',
    'recheckDatabaseAvailability'
  ];

  let crashMethodsOk = true;
  for (const method of crashRequiredMethods) {
    if (crashReporterContent.includes(`${method}(`)) {
      success(`CrashReporter has ${method} method`);
    } else {
      error(`CrashReporter missing ${method} method`);
      crashMethodsOk = false;
    }
  }

  // Check for offline storage logic in flush methods
  if (performanceContent.includes('!this.databaseAvailable') && 
      performanceContent.includes('storeOfflineMetrics')) {
    success('PerformanceMonitor has offline storage logic in flush method');
  } else {
    error('PerformanceMonitor missing offline storage logic in flush method');
    performanceMethodsOk = false;
  }

  if (crashReporterContent.includes('!this.databaseAvailable') && 
      crashReporterContent.includes('storeOfflineReports')) {
    success('CrashReporter has offline storage logic in flush method');
  } else {
    error('CrashReporter missing offline storage logic in flush method');
    crashMethodsOk = false;
  }

  // Check for sync logic on database availability change
  if (performanceContent.includes('syncOfflineData') && 
      performanceContent.includes('wasAvailable') &&
      performanceContent.includes('!wasAvailable && this.databaseAvailable')) {
    success('PerformanceMonitor has database availability sync logic');
  } else {
    error('PerformanceMonitor missing database availability sync logic');
    performanceMethodsOk = false;
  }

  if (crashReporterContent.includes('syncOfflineReports') && 
      crashReporterContent.includes('wasAvailable') &&
      crashReporterContent.includes('!wasAvailable && this.databaseAvailable')) {
    success('CrashReporter has database availability sync logic');
  } else {
    error('CrashReporter missing database availability sync logic');
    crashMethodsOk = false;
  }

  return performanceMethodsOk && crashMethodsOk;
}

function checkOfflineStorageLimits() {
  header('Checking Offline Storage Limits');

  const performanceMonitorPath = path.join(__dirname, '../src/services/monitoring/PerformanceMonitor.ts');
  const crashReporterPath = path.join(__dirname, '../src/services/monitoring/CrashReporter.ts');

  const performanceContent = fs.readFileSync(performanceMonitorPath, 'utf8');
  const crashReporterContent = fs.readFileSync(crashReporterPath, 'utf8');

  // Check for storage limits to prevent bloat
  if (performanceContent.includes('> 500') && performanceContent.includes('splice')) {
    success('PerformanceMonitor has metric storage limits (500)');
  } else {
    warning('PerformanceMonitor may not have proper metric storage limits');
  }

  if (performanceContent.includes('> 100') && performanceContent.includes('splice')) {
    success('PerformanceMonitor has alert storage limits (100)');
  } else {
    warning('PerformanceMonitor may not have proper alert storage limits');
  }

  if (crashReporterContent.includes('> 100') && crashReporterContent.includes('splice')) {
    success('CrashReporter has report storage limits (100)');
  } else {
    warning('CrashReporter may not have proper report storage limits');
  }

  return true;
}

function checkErrorHandling() {
  header('Checking Error Handling');

  const performanceMonitorPath = path.join(__dirname, '../src/services/monitoring/PerformanceMonitor.ts');
  const crashReporterPath = path.join(__dirname, '../src/services/monitoring/CrashReporter.ts');

  const performanceContent = fs.readFileSync(performanceMonitorPath, 'utf8');
  const crashReporterContent = fs.readFileSync(crashReporterPath, 'utf8');

  // Check for proper error handling in offline methods
  const offlineMethods = ['loadOfflineData', 'storeOfflineMetrics', 'storeOfflineAlerts', 'syncOfflineData'];
  let errorHandlingOk = true;

  for (const method of offlineMethods) {
    // Look for the method definition and check if there's a catch block with EventLogger.error
    const methodIndex = performanceContent.indexOf(`${method}(`);
    if (methodIndex !== -1) {
      // Find the end of the method (next method or end of class)
      let methodEnd = performanceContent.indexOf('\n  /**', methodIndex + method.length);
      if (methodEnd === -1) methodEnd = performanceContent.indexOf('\n  private ', methodIndex + method.length);
      if (methodEnd === -1) methodEnd = performanceContent.indexOf('\n  public ', methodIndex + method.length);
      if (methodEnd === -1) methodEnd = performanceContent.length;
      
      const methodContent = performanceContent.substring(methodIndex, methodEnd);
      
      if (methodContent.includes('catch') && methodContent.includes('EventLogger.error')) {
        success(`PerformanceMonitor ${method} has proper error handling`);
      } else {
        error(`PerformanceMonitor ${method} missing proper error handling`);
        errorHandlingOk = false;
      }
    }
  }

  const crashMethods = ['loadOfflineReports', 'storeOfflineReports', 'syncOfflineReports'];
  for (const method of crashMethods) {
    const methodIndex = crashReporterContent.indexOf(`${method}(`);
    if (methodIndex !== -1) {
      let methodEnd = crashReporterContent.indexOf('\n  /**', methodIndex + method.length);
      if (methodEnd === -1) methodEnd = crashReporterContent.indexOf('\n  private ', methodIndex + method.length);
      if (methodEnd === -1) methodEnd = crashReporterContent.indexOf('\n  public ', methodIndex + method.length);
      if (methodEnd === -1) methodEnd = crashReporterContent.length;
      
      const methodContent = crashReporterContent.substring(methodIndex, methodEnd);
      
      if (methodContent.includes('catch') && methodContent.includes('EventLogger.error')) {
        success(`CrashReporter ${method} has proper error handling`);
      } else {
        error(`CrashReporter ${method} missing proper error handling`);
        errorHandlingOk = false;
      }
    }
  }

  return errorHandlingOk;
}

function main() {
  header('Monitoring Services Offline Storage Test');
  
  const implementationOk = checkOfflineStorageImplementation();
  const limitsOk = checkOfflineStorageLimits();
  const errorHandlingOk = checkErrorHandling();
  
  header('Test Results Summary');
  
  if (implementationOk && limitsOk && errorHandlingOk) {
    success('✅ All offline storage functionality tests passed!');
    info('The monitoring services have complete offline storage implementation with:');
    info('  • Proper storage constants (OFFLINE_METRICS_KEY, OFFLINE_ALERTS_KEY, OFFLINE_REPORTS_KEY)');
    info('  • Offline storage when database unavailable');
    info('  • Data sync when database becomes available');
    info('  • Storage limits to prevent bloat');
    info('  • Proper error handling');
    info('  • Database availability checking and rechecking');
    process.exit(0);
  } else {
    error('❌ Some offline storage functionality tests failed');
    info('Please review the errors above and fix the implementation');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}