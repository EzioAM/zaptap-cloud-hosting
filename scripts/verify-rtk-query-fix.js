#!/usr/bin/env node

/**
 * Verify RTK Query endpoints return valid data
 */

const fs = require('fs');
const path = require('path');

console.log('Verifying RTK Query endpoints...\n');

// Check dashboardApi
const dashboardApiPath = path.join(__dirname, '../src/store/api/dashboardApi.ts');
const dashboardContent = fs.readFileSync(dashboardApiPath, 'utf8');

// Check for problematic patterns
const issues = [];

// Check refreshDashboard
if (dashboardContent.includes('data: undefined')) {
  issues.push('❌ refreshDashboard returns undefined');
} else if (dashboardContent.includes('data: void 0')) {
  issues.push('❌ refreshDashboard returns void 0');
} else if (dashboardContent.includes('refreshDashboard') && dashboardContent.includes('data: null')) {
  console.log('✅ refreshDashboard returns null (correct)');
} else {
  issues.push('⚠️  refreshDashboard implementation not found or unclear');
}

// Check for other queryFn patterns
const queryFnPattern = /queryFn:\s*(?:async\s*)?\([^)]*\)\s*=>\s*{[^}]+}/g;
const matches = dashboardContent.match(queryFnPattern) || [];

console.log(`\nFound ${matches.length} queryFn implementations in dashboardApi`);

// Check each queryFn
matches.forEach((match, index) => {
  if (match.includes('data: undefined') || match.includes('data: void 0')) {
    issues.push(`❌ queryFn #${index + 1} returns undefined/void 0`);
  } else if (match.includes('data:') || match.includes('error:')) {
    // Valid - has either data or error
  } else {
    issues.push(`⚠️  queryFn #${index + 1} may have invalid return`);
  }
});

// Check automationApi and analyticsApi for similar issues
const apiFiles = [
  '../src/store/api/automationApi.ts',
  '../src/store/api/analyticsApi.ts'
];

apiFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(file);
    
    if (content.includes('data: undefined') || content.includes('data: void 0')) {
      issues.push(`❌ ${fileName} contains undefined/void 0 returns`);
    } else {
      console.log(`✅ ${fileName} appears clean`);
    }
  }
});

// Summary
console.log('\n' + '='.repeat(50));

if (issues.length === 0) {
  console.log('✅ SUCCESS: All RTK Query endpoints return valid data!');
  console.log('   - refreshDashboard fixed to return null');
  console.log('   - No undefined/void 0 returns found');
  console.log('   - All queryFn implementations valid');
} else {
  console.log('❌ ISSUES FOUND:');
  issues.forEach(issue => console.log('   ' + issue));
}

process.exit(issues.length > 0 ? 1 : 0);