#!/usr/bin/env node

/**
 * Performance Test Script
 * Tests the performance improvements made to fix React Native app launch time
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Testing Performance Improvements\n');

// Test files to check for optimization
const filesToCheck = [
  {
    path: 'src/contexts/AnalyticsContext.tsx',
    description: 'AnalyticsContext - should not have 2-second delay',
    antiPatterns: [
      { pattern: 'setTimeout(async () =>', description: 'setTimeout delay removed' },
      { pattern: ', 2000)', description: '2-second delay removed' }
    ],
    goodPatterns: [
      { pattern: 'Promise.resolve().then(async ()', description: 'Uses microtask for async init' },
      { pattern: 'const flush = async ()', description: 'Has flush method' }
    ]
  },
  {
    path: 'src/services/monitoring/PerformanceMonitor.ts',
    description: 'PerformanceMonitor - should have flush method',
    antiPatterns: [],
    goodPatterns: [
      { pattern: 'public async flush(): Promise<void>', description: 'Has public flush method' },
      { pattern: 'this.isInitialized = true', description: 'Marks as initialized properly' }
    ]
  },
  {
    path: 'src/services/monitoring/CrashReporter.ts',
    description: 'CrashReporter - should have flush method',
    antiPatterns: [],
    goodPatterns: [
      { pattern: 'public async flush(): Promise<void>', description: 'Has public flush method' },
      { pattern: 'this.isInitialized = true', description: 'Marks as initialized properly' }
    ]
  },
  {
    path: 'App.tsx',
    description: 'App.tsx - should use lazy loading and performance measurement',
    antiPatterns: [
      { pattern: 'requestAnimationFrame(() =>', description: 'Removed requestAnimationFrame delay' }
    ],
    goodPatterns: [
      { pattern: 'React.lazy(', description: 'Uses lazy loading for AppNavigator' },
      { pattern: '<Suspense fallback', description: 'Has Suspense wrapper' },
      { pattern: 'PerformanceMeasurement', description: 'Uses performance measurement' },
      { pattern: 'Promise.resolve().then(', description: 'Uses microtasks for async operations' }
    ]
  }
];

let allTestsPassed = true;
let totalImprovements = 0;

for (const fileTest of filesToCheck) {
  console.log(`📋 Testing: ${fileTest.description}`);
  
  const fullPath = path.join(__dirname, '..', fileTest.path);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${fileTest.path}`);
    allTestsPassed = false;
    continue;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Check for anti-patterns (things that should be removed)
  let fileHasIssues = false;
  for (const antiPattern of fileTest.antiPatterns) {
    if (content.includes(antiPattern.pattern)) {
      console.log(`❌ Anti-pattern found: ${antiPattern.description}`);
      console.log(`   Pattern: "${antiPattern.pattern}"`);
      fileHasIssues = true;
      allTestsPassed = false;
    } else {
      console.log(`✅ ${antiPattern.description}`);
      totalImprovements++;
    }
  }
  
  // Check for good patterns (things that should be present)
  for (const goodPattern of fileTest.goodPatterns) {
    if (content.includes(goodPattern.pattern)) {
      console.log(`✅ ${goodPattern.description}`);
      totalImprovements++;
    } else {
      console.log(`❌ Missing improvement: ${goodPattern.description}`);
      console.log(`   Expected pattern: "${goodPattern.pattern}"`);
      fileHasIssues = true;
      allTestsPassed = false;
    }
  }
  
  if (!fileHasIssues) {
    console.log(`   🎉 All checks passed for ${fileTest.path}`);
  }
  
  console.log('');
}

// Check if performance measurement utility was created
const perfMeasurementPath = path.join(__dirname, '..', 'src/utils/PerformanceMeasurement.ts');
if (fs.existsSync(perfMeasurementPath)) {
  console.log('✅ PerformanceMeasurement utility created');
  totalImprovements++;
} else {
  console.log('❌ PerformanceMeasurement utility missing');
  allTestsPassed = false;
}

console.log('\n📊 Performance Optimization Summary:');
console.log(`Total improvements implemented: ${totalImprovements}`);
console.log(`Overall status: ${allTestsPassed ? '✅ PASS' : '❌ FAIL'}`);

if (allTestsPassed) {
  console.log('\n🎉 All performance optimizations successfully implemented!');
  console.log('Expected improvements:');
  console.log('• App launch time reduced from 3706ms to under 2000ms');
  console.log('• Analytics race condition fixed');
  console.log('• PerformanceMonitor and CrashReporter flush errors resolved');
  console.log('• Lazy loading implemented for faster startup');
  console.log('• Async initialization optimized with microtasks');
} else {
  console.log('\n🔧 Some optimizations still need attention. Please review the failed checks above.');
  process.exit(1);
}

console.log('\n🏃‍♂️ To test the actual performance, run: npm start');
console.log('📱 Watch the console for performance measurements during app launch.');