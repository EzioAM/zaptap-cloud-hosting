#!/usr/bin/env node

/**
 * Verification script for AsyncStorage and RLS policy fixes
 * Checks that all fixes have been properly applied
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m'
};

function log(message, color = COLORS.RESET) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

function checkFile(filePath, checks) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`❌ File not found: ${filePath}`, COLORS.RED);
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  let passed = true;
  
  checks.forEach(check => {
    if (check.shouldContain && !content.includes(check.pattern)) {
      log(`  ❌ Missing: ${check.description}`, COLORS.RED);
      passed = false;
    } else if (!check.shouldContain && content.includes(check.pattern)) {
      log(`  ❌ Should not contain: ${check.description}`, COLORS.RED);
      passed = false;
    } else {
      log(`  ✅ ${check.description}`, COLORS.GREEN);
    }
  });
  
  return passed;
}

log('\n🔍 Verifying AsyncStorage Size Limit and RLS Policy Fixes\n', COLORS.BLUE);

// Check CrashReporter fixes
log('1️⃣ Checking CrashReporter fixes:', COLORS.YELLOW);
log('\n  CrashReporter.ts:', COLORS.CYAN);
const crashReporterFixed = checkFile('src/services/monitoring/CrashReporter.ts', [
  {
    pattern: 'clearOversizedOfflineData',
    description: 'Oversized data cleanup method',
    shouldContain: true
  },
  {
    pattern: "error.message.includes('Row too big')",
    description: 'Row too big error handling',
    shouldContain: true
  },
  {
    pattern: 'maxOfflineReports = 50',
    description: 'Reduced report limit to 50',
    shouldContain: true
  },
  {
    pattern: 'estimatedSize > 250000',
    description: 'Size check before storing',
    shouldContain: true
  }
]);

// Check PerformanceMonitor fixes
log('\n2️⃣ Checking PerformanceMonitor fixes:', COLORS.YELLOW);
log('\n  PerformanceMonitor.ts:', COLORS.CYAN);
const perfMonitorFixed = checkFile('src/services/monitoring/PerformanceMonitor.ts', [
  {
    pattern: 'clearOversizedOfflineData',
    description: 'Oversized data cleanup method',
    shouldContain: true
  },
  {
    pattern: "error.message.includes('Row too big')",
    description: 'Row too big error handling',
    shouldContain: true
  },
  {
    pattern: 'maxOfflineMetrics = 100',
    description: 'Reduced metrics limit to 100',
    shouldContain: true
  },
  {
    pattern: 'maxOfflineAlerts = 50',
    description: 'Reduced alerts limit to 50',
    shouldContain: true
  },
  {
    pattern: 'filter(m => m.timestamp > oneDayAgo)',
    description: 'Old metrics cleanup (24 hours)',
    shouldContain: true
  }
]);

// Check SQL script updates
log('\n3️⃣ Checking SQL script updates:', COLORS.YELLOW);
log('\n  setup-monitoring-tables.sql:', COLORS.CYAN);
const sqlFixed = checkFile('scripts/setup-monitoring-tables.sql', [
  {
    pattern: 'Allow anonymous insert performance metrics',
    description: 'Anonymous insert policy for metrics',
    shouldContain: true
  },
  {
    pattern: 'Allow anonymous insert error reports',
    description: 'Anonymous insert policy for reports',
    shouldContain: true
  },
  {
    pattern: 'FOR INSERT TO anon WITH CHECK (true)',
    description: 'Anon role insert permission',
    shouldContain: true
  },
  {
    pattern: 'IMPORTANT: Anonymous insert access is required',
    description: 'Documentation of why anon access needed',
    shouldContain: true
  }
]);

// Check cleanup script exists
log('\n4️⃣ Checking cleanup script:', COLORS.YELLOW);
const cleanupScriptExists = fs.existsSync(path.join(__dirname, 'cleanup-offline-data.js'));
if (cleanupScriptExists) {
  log('  ✅ cleanup-offline-data.js exists', COLORS.GREEN);
} else {
  log('  ❌ cleanup-offline-data.js not found', COLORS.RED);
}

// Summary
log('\n📊 Summary:', COLORS.BLUE);
const allFixed = crashReporterFixed && perfMonitorFixed && sqlFixed && cleanupScriptExists;

if (allFixed) {
  log('✅ All fixes have been successfully applied!', COLORS.GREEN);
  log('\n🎯 Next Steps:', COLORS.CYAN);
  log('1. Run the SQL script in Supabase:', COLORS.RESET);
  log('   - Copy contents of scripts/setup-monitoring-tables.sql', COLORS.RESET);
  log('   - Run in Supabase SQL Editor', COLORS.RESET);
  log('\n2. Clear oversized data (if needed):', COLORS.RESET);
  log('   - Run: node scripts/cleanup-offline-data.js', COLORS.RESET);
  log('   - Or add the cleanup code to your app', COLORS.RESET);
  log('\n3. Restart your app:', COLORS.RESET);
  log('   - npm start', COLORS.RESET);
  log('   - Monitoring should work without errors', COLORS.RESET);
  
  log('\n🔧 What was fixed:', COLORS.BLUE);
  log('• AsyncStorage overflow prevention (limited data size)', COLORS.GREEN);
  log('• RLS policies allow anonymous inserts', COLORS.GREEN);
  log('• Old data cleanup (24-hour retention)', COLORS.GREEN);
  log('• Graceful error handling for oversized data', COLORS.GREEN);
  log('• Reduced storage limits to prevent cursor overflow', COLORS.GREEN);
  
} else {
  log('❌ Some fixes are missing', COLORS.RED);
  log('Please review the issues above', COLORS.YELLOW);
}

process.exit(allFixed ? 0 : 1);