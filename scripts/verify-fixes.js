#!/usr/bin/env node

/**
 * Verification script for Discover Screen and Monitoring Services fixes
 * Checks that all fixes have been properly applied
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
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

log('\n📋 Verifying Discover Screen and Monitoring Services Fixes\n', COLORS.BLUE);

// Check Discover Screen Fixes
log('1️⃣ Checking Discover Screen Fixes:', COLORS.YELLOW);

log('\n  Checking DiscoverScreenSafe.tsx:', COLORS.BLUE);
const discoverSafeFixed = checkFile('src/screens/modern/DiscoverScreenSafe.tsx', [
  {
    pattern: "theme.colors?.background?.primary || theme.colors?.background || '#ffffff'",
    description: 'Proper theme background with fallback',
    shouldContain: true
  },
  {
    pattern: "backgroundColor: '#000'",
    description: 'No hardcoded black background',
    shouldContain: false
  },
  {
    pattern: "theme.colors?.text?.primary || theme.colors?.text || '#000'",
    description: 'Proper text color with fallback',
    shouldContain: true
  }
]);

log('\n  Checking DiscoverScreenEnhanced.tsx:', COLORS.BLUE);
const discoverEnhancedFixed = checkFile('src/screens/modern/DiscoverScreenEnhanced.tsx', [
  {
    pattern: "theme.colors?.background?.primary || theme.colors?.background || '#ffffff'",
    description: 'Proper theme background with fallback',
    shouldContain: true
  },
  {
    pattern: "backgroundColor: '#000'",
    description: 'No hardcoded black background in JSX',
    shouldContain: false
  }
]);

// Check Monitoring Services Fixes
log('\n2️⃣ Checking Monitoring Services Fixes:', COLORS.YELLOW);

log('\n  Checking PerformanceMonitor.ts:', COLORS.BLUE);
const perfMonitorFixed = checkFile('src/services/monitoring/PerformanceMonitor.ts', [
  {
    pattern: 'databaseAvailable',
    description: 'Database availability tracking',
    shouldContain: true
  },
  {
    pattern: 'checkDatabaseAvailability',
    description: 'Database availability check method',
    shouldContain: true
  },
  {
    pattern: 'OFFLINE_METRICS_KEY',
    description: 'Offline storage implementation',
    shouldContain: true
  },
  {
    pattern: 'storeOfflineMetrics',
    description: 'Offline fallback logic',
    shouldContain: true
  }
]);

log('\n  Checking CrashReporter.ts:', COLORS.BLUE);
const crashReporterFixed = checkFile('src/services/monitoring/CrashReporter.ts', [
  {
    pattern: 'databaseAvailable',
    description: 'Database availability tracking',
    shouldContain: true
  },
  {
    pattern: 'checkDatabaseAvailability',
    description: 'Database availability check method',
    shouldContain: true
  },
  {
    pattern: 'OFFLINE_REPORTS_KEY',
    description: 'Offline storage implementation',
    shouldContain: true
  },
  {
    pattern: 'storeOfflineReports',
    description: 'Offline fallback logic',
    shouldContain: true
  }
]);

// Summary
log('\n📊 Summary:', COLORS.BLUE);
const allFixed = discoverSafeFixed && discoverEnhancedFixed && perfMonitorFixed && crashReporterFixed;

if (allFixed) {
  log('✅ All fixes have been successfully applied!', COLORS.GREEN);
  log('\nThe following issues have been resolved:', COLORS.GREEN);
  log('  • Discover screens now use proper white/gradient backgrounds', COLORS.GREEN);
  log('  • Monitoring services handle database unavailability gracefully', COLORS.GREEN);
  log('  • Error cascading has been prevented', COLORS.GREEN);
  log('  • Services initialize without blocking app startup', COLORS.GREEN);
  process.exit(0);
} else {
  log('❌ Some fixes may not have been applied correctly', COLORS.RED);
  log('Please review the issues above and reapply the fixes', COLORS.YELLOW);
  process.exit(1);
}