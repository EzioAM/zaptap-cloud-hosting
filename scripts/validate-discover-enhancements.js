#!/usr/bin/env node

/**
 * Validation script for Discover Screen enhancements
 * Checks for common issues in the newly created components
 */

const fs = require('fs');
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '..', 'src', 'components', 'discover');
const COMMON_DIR = path.join(__dirname, '..', 'src', 'components', 'common');
const SCREENS_DIR = path.join(__dirname, '..', 'src', 'screens', 'modern');

const requiredComponents = [
  'TrendingCarousel.tsx',
  'FeaturedCard.tsx', 
  'AnimatedCategoryChips.tsx',
  'AnimatedAutomationCard.tsx',
  'AnimatedSearchBar.tsx'
];

const requiredCommonComponents = [
  'ParallaxScrollView.tsx'
];

const requiredScreens = [
  'DiscoverScreenSafe.tsx'
];

function checkFileExists(filePath, fileName) {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${fileName}`);
  return exists;
}

function checkFileContent(filePath, fileName, patterns) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ ${fileName} - File not found`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let allFound = true;

  patterns.forEach(pattern => {
    const found = pattern.test(content);
    if (!found) {
      console.log(`  ⚠️  Missing pattern in ${fileName}: ${pattern}`);
      allFound = false;
    }
  });

  if (allFound) {
    console.log(`✅ ${fileName} - All patterns found`);
  }

  return allFound;
}

console.log('🔍 Validating Discover Screen Enhancements...\n');

// Check if all component files exist
console.log('📁 Checking Component Files:');
let allComponentsExist = true;

requiredComponents.forEach(component => {
  const filePath = path.join(COMPONENTS_DIR, component);
  if (!checkFileExists(filePath, component)) {
    allComponentsExist = false;
  }
});

console.log('\n📁 Checking Common Components:');
requiredCommonComponents.forEach(component => {
  const filePath = path.join(COMMON_DIR, component);
  if (!checkFileExists(filePath, component)) {
    allComponentsExist = false;
  }
});

console.log('\n📁 Checking Screen Files:');
requiredScreens.forEach(screen => {
  const filePath = path.join(SCREENS_DIR, screen);
  if (!checkFileExists(filePath, screen)) {
    allComponentsExist = false;
  }
});

// Check for essential imports and exports
console.log('\n🔍 Checking Component Content:');

const contentChecks = [
  {
    file: path.join(COMPONENTS_DIR, 'TrendingCarousel.tsx'),
    name: 'TrendingCarousel',
    patterns: [
      /export.*TrendingCarousel/,
      /FlatList/,
      /Animated/,
      /LinearGradient/
    ]
  },
  {
    file: path.join(COMPONENTS_DIR, 'FeaturedCard.tsx'), 
    name: 'FeaturedCard',
    patterns: [
      /export.*FeaturedCard/,
      /Animated/,
      /LinearGradient/,
      /MaterialCommunityIcons/
    ]
  },
  {
    file: path.join(COMPONENTS_DIR, 'AnimatedCategoryChips.tsx'),
    name: 'AnimatedCategoryChips',
    patterns: [
      /export.*AnimatedCategoryChips/,
      /ScrollView/,
      /Animated/,
      /LinearGradient/
    ]
  },
  {
    file: path.join(COMMON_DIR, 'ParallaxScrollView.tsx'),
    name: 'ParallaxScrollView', 
    patterns: [
      /export.*ParallaxScrollView/,
      /Animated/,
      /ScrollView/,
      /interpolate/
    ]
  },
  {
    file: path.join(SCREENS_DIR, 'DiscoverScreenSafe.tsx'),
    name: 'DiscoverScreenSafe',
    patterns: [
      /export default.*DiscoverScreenSafe/,
      /ParallaxScrollView/,
      /TrendingCarousel/,
      /FeaturedCard/,
      /AnimatedCategoryChips/
    ]
  }
];

let allContentValid = true;
contentChecks.forEach(check => {
  if (!checkFileContent(check.file, check.name, check.patterns)) {
    allContentValid = false;
  }
});

// Check for potential issues
console.log('\n⚠️  Checking for Potential Issues:');

const potentialIssues = [];

// Check if backup file exists
const backupPath = path.join(SCREENS_DIR, 'DiscoverScreenSafe.backup.tsx');
if (!fs.existsSync(backupPath)) {
  potentialIssues.push('Original DiscoverScreenSafe backup not found');
}

// Check index file
const indexPath = path.join(COMPONENTS_DIR, 'index.ts');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  requiredComponents.forEach(component => {
    const componentName = component.replace('.tsx', '');
    if (!indexContent.includes(componentName)) {
      potentialIssues.push(`${componentName} not exported in index.ts`);
    }
  });
}

if (potentialIssues.length === 0) {
  console.log('✅ No potential issues found');
} else {
  potentialIssues.forEach(issue => {
    console.log(`⚠️  ${issue}`);
  });
}

// Summary
console.log('\n📊 Validation Summary:');
console.log(`Components Exist: ${allComponentsExist ? '✅' : '❌'}`);
console.log(`Content Valid: ${allContentValid ? '✅' : '❌'}`);
console.log(`Issues Found: ${potentialIssues.length}`);

if (allComponentsExist && allContentValid && potentialIssues.length === 0) {
  console.log('\n🎉 All validations passed! Discover Screen enhancements are ready.');
  process.exit(0);
} else {
  console.log('\n❌ Some validations failed. Please check the issues above.');
  process.exit(1);
}