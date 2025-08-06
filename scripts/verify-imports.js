#!/usr/bin/env node

/**
 * Import Verification Script
 * Verifies that all UI components can be imported without undefined errors
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Verifying component imports...');

const verifyImports = async () => {
  const results = {
    success: [],
    failed: [],
    total: 0
  };

  const basePath = path.join(__dirname, '..');
  
  const importTests = [
    // Dashboard Widgets
    { name: 'QuickStatsWidget', path: path.join(basePath, 'src/components/organisms/DashboardWidgets') },
    { name: 'QuickStatsWidgetEnhanced', path: path.join(basePath, 'src/components/organisms/DashboardWidgets') },
    { name: 'QuickActionsWidget', path: path.join(basePath, 'src/components/organisms/DashboardWidgets') },
    { name: 'QuickActionsWidgetEnhanced', path: path.join(basePath, 'src/components/organisms/DashboardWidgets') },
    { name: 'RecentActivityWidget', path: path.join(basePath, 'src/components/organisms/DashboardWidgets') },
    { name: 'RecentActivityWidgetEnhanced', path: path.join(basePath, 'src/components/organisms/DashboardWidgets') },
    { name: 'FeaturedAutomationWidget', path: path.join(basePath, 'src/components/organisms/DashboardWidgets') },
    { name: 'FeaturedAutomationWidgetEnhanced', path: path.join(basePath, 'src/components/organisms/DashboardWidgets') },
    
    // Lazy Widgets
    { name: 'LazyQuickStatsWidget', path: path.join(basePath, 'src/components/organisms/LazyDashboardWidgets') },
    { name: 'LazyFeaturedAutomationWidget', path: path.join(basePath, 'src/components/organisms/LazyDashboardWidgets') },
    { name: 'LazyQuickActionsWidget', path: path.join(basePath, 'src/components/organisms/LazyDashboardWidgets') },
    { name: 'LazyRecentActivityWidget', path: path.join(basePath, 'src/components/organisms/LazyDashboardWidgets') },
    
    // Error Boundaries
    { name: 'ScreenErrorBoundary', path: path.join(basePath, 'src/components/ErrorBoundaries') },
    { name: 'WidgetErrorBoundary', path: path.join(basePath, 'src/components/ErrorBoundaries') },
    
    // Fallbacks
    { name: 'ErrorFallback', path: path.join(basePath, 'src/components/Fallbacks') },
    { name: 'NetworkErrorFallback', path: path.join(basePath, 'src/components/Fallbacks') },
    
    // Shared Components
    { name: 'GradientHeader', path: path.join(basePath, 'src/components/shared/GradientHeader') },
    { name: 'GradientCard', path: path.join(basePath, 'src/components/shared/GradientCard') },
    { name: 'GradientButton', path: path.join(basePath, 'src/components/shared/GradientButton') },
  ];

  for (const test of importTests) {
    results.total++;
    try {
      const modulePath = require.resolve(test.path);
      const module = require(modulePath);
      
      if (module[test.name] || module.default) {
        results.success.push(test.name);
        console.log(`✅ ${test.name} - OK`);
      } else {
        results.failed.push(`${test.name} - Not exported`);
        console.log(`❌ ${test.name} - Not exported from ${test.path}`);
      }
    } catch (error) {
      results.failed.push(`${test.name} - ${error.message}`);
      console.log(`❌ ${test.name} - ${error.message}`);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`Total imports tested: ${results.total}`);
  console.log(`✅ Successful: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed imports:');
    results.failed.forEach(failure => console.log(`   - ${failure}`));
    process.exit(1);
  } else {
    console.log('\n🎉 All imports verified successfully!');
    process.exit(0);
  }
};

verifyImports().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});