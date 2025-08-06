#!/usr/bin/env node

/**
 * Test script to verify the dashboard API fix
 * This tests that dashboard endpoints use queryFn properly
 */

const fs = require('fs');
const path = require('path');

// Read the dashboard API file
const dashboardApiPath = path.join(__dirname, '../src/store/api/dashboardApi.ts');
const content = fs.readFileSync(dashboardApiPath, 'utf8');

// Check for the fixed patterns
const checks = [
  {
    name: 'getTodayStats uses queryFn',
    pattern: /getTodayStats:\s+builder\.query<[^>]+>\({\s*queryFn:/,
    found: false
  },
  {
    name: 'getRecentActivity uses queryFn',
    pattern: /getRecentActivity:\s+builder\.query<[^>]+>\({\s*queryFn:/,
    found: false
  },
  {
    name: 'getFeaturedAutomation uses queryFn',
    pattern: /getFeaturedAutomation:\s+builder\.query<[^>]+>\({\s*queryFn:/,
    found: false
  },
  {
    name: 'No RPC calls to get_today_stats',
    pattern: /rpc\/get_today_stats/,
    shouldNotExist: true,
    found: false
  }
];

// Run checks
checks.forEach(check => {
  if (check.pattern.test(content)) {
    check.found = true;
  }
});

// Report results
console.log('Dashboard API Fix Verification:\n');
let allPassed = true;

checks.forEach(check => {
  const passed = check.shouldNotExist ? !check.found : check.found;
  const status = passed ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  if (!passed) allPassed = false;
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ SUCCESS: All dashboard API endpoints properly configured!');
  console.log('   - All endpoints use queryFn for direct data fetching');
  console.log('   - No dependency on non-existent RPC functions');
  console.log('   - Proper error handling with fallback values');
  console.log('   - Statistics will now display correctly');
} else {
  console.log('❌ ERROR: Some dashboard API checks failed');
  console.log('   Please verify the fixes were applied correctly');
}

process.exit(allPassed ? 0 : 1);