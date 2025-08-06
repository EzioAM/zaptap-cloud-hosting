#!/usr/bin/env node

/**
 * Verify ScrollView components are using the correct variant
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying ScrollView components...\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Check ParallaxScrollView.tsx
console.log('1️⃣ Checking ParallaxScrollView.tsx...');
const parallaxPath = path.join(__dirname, '..', 'src', 'components', 'common', 'ParallaxScrollView.tsx');
if (fs.existsSync(parallaxPath)) {
  const content = fs.readFileSync(parallaxPath, 'utf8');
  
  // Check for correct Animated.ScrollView usage
  if (content.includes('<Animated.ScrollView')) {
    results.passed.push('ParallaxScrollView uses Animated.ScrollView ✓');
  } else if (content.includes('<ScrollView')) {
    results.failed.push('ParallaxScrollView uses regular ScrollView with Animated.event');
  }
  
  // Check for Animated.event usage
  if (content.includes('Animated.event')) {
    if (content.includes('<Animated.ScrollView')) {
      results.passed.push('Animated.event correctly paired with Animated.ScrollView ✓');
    } else {
      results.failed.push('Animated.event used without Animated.ScrollView');
    }
  }
  
  // Check imports
  if (!content.includes("import.*ScrollView.*from 'react-native'") || 
      !content.match(/import\s+{\s*[^}]*ScrollView[^}]*}\s*from\s+['"]react-native['"]/)) {
    results.passed.push('No regular ScrollView imported ✓');
  } else {
    results.warnings.push('Regular ScrollView is imported but might not be used');
  }
}

// Search for any ScrollView with Animated.event pattern
console.log('2️⃣ Searching for problematic patterns...');
const srcPath = path.join(__dirname, '..', 'src');

function searchForProblematicPatterns(dir) {
  const issues = [];
  
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
        
        // Check for ScrollView with Animated.event
        if (content.includes('<ScrollView') && content.includes('Animated.event')) {
          const relativePath = itemPath.replace(srcPath, 'src');
          issues.push(`${relativePath} has ScrollView with Animated.event`);
        }
        
        // Check for FlatList with Animated.event (should be Animated.FlatList)
        if (content.includes('<FlatList') && 
            !content.includes('<Animated.FlatList') && 
            content.includes('Animated.event')) {
          const relativePath = itemPath.replace(srcPath, 'src');
          issues.push(`${relativePath} has FlatList with Animated.event (should be Animated.FlatList)`);
        }
      }
    }
  }
  
  walk(dir);
  return issues;
}

const issues = searchForProblematicPatterns(srcPath);
if (issues.length > 0) {
  issues.forEach(issue => results.failed.push(issue));
} else {
  results.passed.push('No ScrollView/FlatList with Animated.event patterns found ✓');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VERIFICATION RESULTS');
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

console.log('\n' + '='.repeat(50));

if (results.failed.length === 0) {
  console.log('✅ All ScrollView components are correctly configured!');
  console.log('The onScroll error should be resolved now.');
} else {
  console.log('❌ Some issues remain. Please review the failed checks.');
}

console.log('='.repeat(50) + '\n');

process.exit(results.failed.length > 0 ? 1 : 0);