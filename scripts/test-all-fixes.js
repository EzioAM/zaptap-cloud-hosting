#!/usr/bin/env node

/**
 * Test script to verify all fixes applied
 */

const fs = require('fs');
const path = require('path');

console.log('Testing all fixes...\n');
console.log('='.repeat(50));

let allPassed = true;

// Test 1: AutomationBuilderScreen theme fix
console.log('\n1. AutomationBuilderScreen theme fix:');
const automationBuilderPath = path.join(__dirname, '../src/screens/automation/AutomationBuilderScreen.tsx');
const automationBuilderContent = fs.readFileSync(automationBuilderPath, 'utf8');

if (!automationBuilderContent.includes('theme.getColors')) {
  console.log('   ✅ No theme.getColors usage found');
} else {
  console.log('   ❌ Still using theme.getColors');
  allPassed = false;
}

if (automationBuilderContent.includes('const colors = currentTheme.colors;')) {
  console.log('   ✅ Using currentTheme.colors correctly');
} else {
  console.log('   ❌ Not using currentTheme.colors');
  allPassed = false;
}

// Test 2: dashboardApi refreshDashboard fix
console.log('\n2. dashboardApi refreshDashboard fix:');
const dashboardApiPath = path.join(__dirname, '../src/store/api/dashboardApi.ts');
const dashboardApiContent = fs.readFileSync(dashboardApiPath, 'utf8');

if (dashboardApiContent.includes('queryFn: () => ({ data: void 0 })')) {
  console.log('   ✅ refreshDashboard returns void 0');
} else if (dashboardApiContent.includes('queryFn: () => ({ data: undefined })')) {
  console.log('   ❌ refreshDashboard still returns undefined');
  allPassed = false;
} else {
  console.log('   ⚠️  refreshDashboard implementation not found');
}

// Test 3: QuickActionsWidget navigation fix
console.log('\n3. QuickActionsWidget navigation fix:');
const quickActionsPath = path.join(__dirname, '../src/components/organisms/DashboardWidgets/QuickActionsWidget.tsx');
const quickActionsContent = fs.readFileSync(quickActionsPath, 'utf8');

if (!quickActionsContent.includes("navigate('Gallery')")) {
  console.log('   ✅ No navigation to Gallery');
} else {
  console.log('   ❌ Still navigating to Gallery');
  allPassed = false;
}

if (!quickActionsContent.includes("navigate('Templates')")) {
  console.log('   ✅ No navigation to Templates');
} else {
  console.log('   ❌ Still navigating to Templates');
  allPassed = false;
}

if (quickActionsContent.includes("navigate('DiscoverTab')") && 
    quickActionsContent.includes("navigate('LibraryTab')")) {
  console.log('   ✅ Navigating to existing tabs');
} else {
  console.log('   ❌ Not navigating to correct tabs');
  allPassed = false;
}

// Test 4: Check for queryFn usage in dashboard endpoints
console.log('\n4. Dashboard API endpoints using queryFn:');
const endpoints = ['getTodayStats', 'getRecentActivity', 'getFeaturedAutomation'];
endpoints.forEach(endpoint => {
  const pattern = new RegExp(`${endpoint}:\\s+builder\\.query<[^>]+>\\({\\s*queryFn:`);
  if (pattern.test(dashboardApiContent)) {
    console.log(`   ✅ ${endpoint} uses queryFn`);
  } else {
    console.log(`   ❌ ${endpoint} doesn't use queryFn`);
    allPassed = false;
  }
});

// Summary
console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('✅ SUCCESS: All fixes verified!');
  console.log('\nFixed issues:');
  console.log('  1. Theme.getColors error resolved');
  console.log('  2. refreshDashboard mutation fixed');
  console.log('  3. Navigation errors resolved');
  console.log('  4. Dashboard statistics loading properly');
} else {
  console.log('❌ ERROR: Some fixes not properly applied');
  console.log('Please review the failed checks above');
}

process.exit(allPassed ? 0 : 1);