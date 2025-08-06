#!/usr/bin/env node

/**
 * Test script to verify all onScroll and related fixes
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing all fixes...\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test 1: Check ParallaxScrollView.tsx doesn't have animatedEvent(event) pattern
console.log('1️⃣ Checking ParallaxScrollView.tsx...');
const parallaxPath = path.join(__dirname, '..', 'src', 'components', 'common', 'ParallaxScrollView.tsx');
if (fs.existsSync(parallaxPath)) {
  const content = fs.readFileSync(parallaxPath, 'utf8');
  if (content.includes('animatedEvent(event)')) {
    results.failed.push('ParallaxScrollView.tsx still has animatedEvent(event) pattern');
  } else if (content.includes('const handleScroll = Animated.event')) {
    results.passed.push('ParallaxScrollView.tsx correctly uses Animated.event directly');
  } else {
    results.warnings.push('ParallaxScrollView.tsx has unexpected onScroll pattern');
  }
} else {
  results.failed.push('ParallaxScrollView.tsx not found');
}

// Test 2: Check ModernHomeScreenOptimized.tsx
console.log('2️⃣ Checking ModernHomeScreenOptimized.tsx...');
const optimizedPath = path.join(__dirname, '..', 'src', 'screens', 'modern', 'ModernHomeScreenOptimized.tsx');
if (fs.existsSync(optimizedPath)) {
  const content = fs.readFileSync(optimizedPath, 'utf8');
  if (content.includes('animatedEvent(event)')) {
    results.failed.push('ModernHomeScreenOptimized.tsx still has animatedEvent(event) pattern');
  } else if (content.includes('return Animated.event')) {
    results.passed.push('ModernHomeScreenOptimized.tsx correctly returns Animated.event');
  } else {
    results.warnings.push('ModernHomeScreenOptimized.tsx has unexpected onScroll pattern');
  }
} else {
  results.failed.push('ModernHomeScreenOptimized.tsx not found');
}

// Test 3: Check for UUID polyfill in App.tsx
console.log('3️⃣ Checking UUID polyfill...');
const appPath = path.join(__dirname, '..', 'App.tsx');
if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf8');
  const lines = content.split('\n');
  const firstImports = lines.slice(0, 10).join('\n');
  
  if (firstImports.includes("import 'react-native-get-random-values'")) {
    results.passed.push('UUID polyfill correctly imported at top of App.tsx');
  } else {
    results.failed.push('UUID polyfill not found at top of App.tsx');
  }
} else {
  results.failed.push('App.tsx not found');
}

// Test 4: Check package.json for react-native-get-random-values
console.log('4️⃣ Checking package.json...');
const packagePath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packagePath)) {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (packageJson.dependencies && packageJson.dependencies['react-native-get-random-values']) {
    results.passed.push('react-native-get-random-values is in dependencies');
  } else {
    results.failed.push('react-native-get-random-values not found in dependencies');
  }
} else {
  results.failed.push('package.json not found');
}

// Test 5: Search for any remaining animatedEvent(event) patterns
console.log('5️⃣ Searching for problematic patterns...');
const srcPath = path.join(__dirname, '..', 'src');
function searchForPattern(dir, pattern) {
  const files = [];
  
  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    
    const items = fs.readdirSync(currentPath);
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !item.includes('node_modules')) {
        walk(itemPath);
      } else if (stat.isFile() && (item.endsWith('.tsx') || item.endsWith('.ts'))) {
        const content = fs.readFileSync(itemPath, 'utf8');
        if (content.includes(pattern)) {
          files.push(itemPath.replace(srcPath, 'src'));
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

const problematicFiles = searchForPattern(srcPath, 'animatedEvent(');
if (problematicFiles.length > 0) {
  results.failed.push(`Found animatedEvent() calls in: ${problematicFiles.join(', ')}`);
} else {
  results.passed.push('No problematic animatedEvent() calls found');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 TEST RESULTS SUMMARY');
console.log('='.repeat(50));

if (results.passed.length > 0) {
  console.log('\n✅ PASSED (' + results.passed.length + '):');
  results.passed.forEach(msg => console.log('  • ' + msg));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  WARNINGS (' + results.warnings.length + '):');
  results.warnings.forEach(msg => console.log('  • ' + msg));
}

if (results.failed.length > 0) {
  console.log('\n❌ FAILED (' + results.failed.length + '):');
  results.failed.forEach(msg => console.log('  • ' + msg));
}

const totalTests = results.passed.length + results.failed.length + results.warnings.length;
const passRate = ((results.passed.length / totalTests) * 100).toFixed(1);

console.log('\n' + '='.repeat(50));
console.log(`OVERALL: ${results.passed.length}/${totalTests} tests passed (${passRate}%)`);

if (results.failed.length === 0 && results.warnings.length === 0) {
  console.log('🎉 All tests passed! Your app should work without scroll errors.');
} else if (results.failed.length === 0) {
  console.log('✅ Critical issues fixed, but review warnings.');
} else {
  console.log('❌ Some issues remain. Please review failed tests.');
}

console.log('='.repeat(50) + '\n');

process.exit(results.failed.length > 0 ? 1 : 0);