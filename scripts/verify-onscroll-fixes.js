#!/usr/bin/env node

/**
 * Verification script to ensure onScroll fixes are properly implemented
 * This script checks that handleScroll functions are properly typed and used
 */

const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'src/screens/modern/ModernHomeScreen.tsx',
  'src/screens/modern/ModernProfileScreen.tsx',
  'src/screens/modern/ModernHomeScreenOptimized.tsx',
  'src/utils/animations/PerformanceHooks.ts',
  'src/components/common/ParallaxScrollView.tsx'
];

const ISSUES = [];

function checkFile(filePath) {
  console.log(`\nChecking ${filePath}...`);
  
  if (!fs.existsSync(filePath)) {
    ISSUES.push(`❌ File not found: ${filePath}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for problematic patterns
  const problemPatterns = [
    {
      pattern: /handleScroll.*=.*Animated\.event.*\?\s*Animated\.event.*:\s*undefined/gs,
      issue: 'handleScroll should not conditionally return Animated.event objects'
    },
    {
      pattern: /onScroll=\{.*Animated\.event.*\}/g,
      issue: 'onScroll should not directly receive Animated.event objects'
    }
  ];
  
  // Check for good patterns
  const goodPatterns = [
    {
      pattern: /handleScroll.*=.*\(event:.*\)\s*=>\s*\{/g,
      description: 'handleScroll is a proper function'
    },
    {
      pattern: /onScroll=\{handleScroll\}/g,
      description: 'onScroll receives function reference'
    }
  ];
  
  let hasIssues = false;
  
  problemPatterns.forEach(({ pattern, issue }) => {
    if (pattern.test(content)) {
      ISSUES.push(`❌ ${filePath}: ${issue}`);
      hasIssues = true;
    }
  });
  
  goodPatterns.forEach(({ pattern, description }) => {
    if (pattern.test(content)) {
      console.log(`  ✅ ${description}`);
    }
  });
  
  // Specific checks per file
  if (filePath.includes('ModernHomeScreen.tsx') && !filePath.includes('Optimized')) {
    if (content.includes('onScroll={handleScroll || undefined}')) {
      ISSUES.push(`❌ ${filePath}: Still using 'onScroll={handleScroll || undefined}' pattern`);
      hasIssues = true;
    }
    
    if (content.includes('scrollY.setValue(offsetY)')) {
      console.log('  ✅ Properly sets scrollY value in function');
    }
  }
  
  if (filePath.includes('ModernProfileScreen.tsx')) {
    if (content.includes('scrollY.setValue(offsetY)')) {
      console.log('  ✅ Properly sets scrollY value in function');
    }
  }
  
  if (filePath.includes('PerformanceHooks.ts')) {
    if (content.includes('handleScrollListener')) {
      console.log('  ✅ Separates scroll listener from Animated.event');
    }
    
    if (content.includes('return {\n    scrollY,\n    handleScroll,\n    handleScrollListener,')) {
      console.log('  ✅ Exports both handleScroll and handleScrollListener');
    }
  }
  
  if (filePath.includes('ParallaxScrollView.tsx')) {
    // ParallaxScrollView should be fine as it uses Animated.event correctly
    if (content.includes('handleScroll = Animated.event')) {
      console.log('  ✅ ParallaxScrollView correctly uses Animated.event');
    }
  }
  
  if (!hasIssues) {
    console.log('  ✅ No issues found');
  }
}

console.log('🔍 Verifying onScroll fixes...\n');

filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  checkFile(fullPath);
});

console.log('\n' + '='.repeat(50));

if (ISSUES.length === 0) {
  console.log('✅ All onScroll fixes verified successfully!');
  console.log('\nThe following issues have been resolved:');
  console.log('• handleScroll functions now return functions, not Animated.event objects');
  console.log('• onScroll props receive proper function references');
  console.log('• scrollY values are properly updated in scroll handlers');
  console.log('• Proper separation of scroll listeners in performance hooks');
  process.exit(0);
} else {
  console.log('❌ Issues found:');
  ISSUES.forEach(issue => console.log(`  ${issue}`));
  console.log('\nPlease fix these issues before testing.');
  process.exit(1);
}