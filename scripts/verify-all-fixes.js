#!/usr/bin/env node

/**
 * Test script to verify all fixes are working correctly
 * Run with: node scripts/verify-all-fixes.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying all fixes...\n');

const tests = [
  {
    name: 'Gallery Navigation Fix',
    files: [
      'src/components/organisms/DashboardWidgets/QuickActionsWidget.tsx',
      'src/screens/automation/MyAutomationsScreen.tsx',
      'src/components/organisms/DashboardWidgets/FeaturedAutomationWidget.tsx',
      'src/screens/automation/AutomationDetailsScreen.tsx'
    ],
    check: (content) => {
      if (content.includes("navigate('Gallery'") || content.includes('navigate("Gallery"')) {
        return { pass: false, message: 'Still has Gallery navigation references' };
      }
      return { pass: true, message: 'Gallery references replaced with DiscoverTab' };
    }
  },
  {
    name: 'QuickStatsWidget Colors',
    files: ['src/components/organisms/DashboardWidgets/QuickStatsWidget.tsx'],
    check: (content) => {
      const hasDistinctColors = 
        content.includes('color="#2196F3"') && // Blue for Runs
        content.includes('color="#4CAF50"') && // Green for Success
        content.includes('color="#FF9800"') && // Orange for Avg Time
        content.includes('color="#9C27B0"');   // Purple for Time Saved
      
      if (hasDistinctColors) {
        return { pass: true, message: 'Stats have distinct colors' };
      }
      return { pass: false, message: 'Stats colors not properly set' };
    }
  },
  {
    name: 'Discover Page Data Mapping',
    files: ['src/screens/modern/DiscoverScreenSafe.tsx'],
    check: (content) => {
      const hasMapping = 
        content.includes('mappedPublicAutomations') &&
        content.includes('icon: automation.icon || \'robot\'') &&
        content.includes('likes: automation.likes_count') &&
        content.includes('uses: automation.execution_count');
      
      if (hasMapping) {
        return { pass: true, message: 'API data properly mapped with fallbacks' };
      }
      return { pass: false, message: 'Data mapping incomplete' };
    }
  },
  {
    name: 'VisualStepEditor Theme Fix',
    files: ['src/components/organisms/StepEditor/VisualStepEditor.tsx'],
    check: (content) => {
      const hasCorrectImport = content.includes("import { useSafeTheme } from '../../common/ThemeFallbackWrapper'");
      const hasCorrectUsage = content.includes('const currentTheme = useSafeTheme()');
      const noGetColors = !content.includes('theme.getColors');
      
      if (hasCorrectImport && hasCorrectUsage && noGetColors) {
        return { pass: true, message: 'Theme properly configured with ThemeFallbackWrapper' };
      }
      return { pass: false, message: 'Theme configuration incorrect' };
    }
  },
  {
    name: 'Library FAB Navigation',
    files: ['src/screens/modern/LibraryScreenSafe.tsx'],
    check: (content) => {
      const hasFAB = content.includes('fab') && content.includes("navigate('AutomationBuilder'");
      const hasThemeFallback = content.includes('theme.colors?.primary || \'#2196F3\'');
      
      if (hasFAB && hasThemeFallback) {
        return { pass: true, message: 'FAB properly configured with theme fallbacks' };
      }
      return { pass: false, message: 'FAB configuration issues' };
    }
  }
];

let allPassed = true;

tests.forEach(test => {
  console.log(`\n📋 Testing: ${test.name}`);
  console.log('─'.repeat(50));
  
  test.files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const result = test.check(content);
      
      if (result.pass) {
        console.log(`✅ ${file}`);
        console.log(`   ${result.message}`);
      } else {
        console.log(`❌ ${file}`);
        console.log(`   ${result.message}`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`⚠️  ${file} - File not found or error reading`);
      allPassed = false;
    }
  });
});

console.log('\n' + '='.repeat(60));
if (allPassed) {
  console.log('✅ All fixes verified successfully!');
  console.log('\nYour app should now run without the reported errors:');
  console.log('• Gallery navigation → Fixed to DiscoverTab');
  console.log('• QuickStats colors → Each stat has distinct color');
  console.log('• Discover page data → Icons and counts properly mapped');
  console.log('• VisualStepEditor → Theme provider error resolved');
  console.log('• Library FAB → Navigation properly configured');
} else {
  console.log('❌ Some fixes need attention');
  console.log('\nPlease review the failed tests above.');
}
console.log('='.repeat(60));
console.log('\nNext steps:');
console.log('1. Run: npm start');
console.log('2. Test the app thoroughly');
console.log('3. If any issues persist, check the error logs');