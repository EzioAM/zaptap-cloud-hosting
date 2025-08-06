#!/usr/bin/env node

/**
 * Simple File Verification Script
 * Verifies that all component files exist
 */

const path = require('path');
const fs = require('fs');

console.log('🔍 Verifying component files exist...');

const verifyFiles = () => {
  const results = {
    success: [],
    failed: [],
    total: 0
  };

  const basePath = path.join(__dirname, '..');
  
  const filesToCheck = [
    // Dashboard Widgets
    'src/components/organisms/DashboardWidgets/index.ts',
    'src/components/organisms/DashboardWidgets/QuickStatsWidget.tsx',
    'src/components/organisms/DashboardWidgets/QuickActionsWidget.tsx',
    'src/components/organisms/DashboardWidgets/RecentActivityWidget.tsx',
    'src/components/organisms/DashboardWidgets/FeaturedAutomationWidget.tsx',
    
    // Lazy Widgets
    'src/components/organisms/LazyDashboardWidgets.tsx',
    
    // Error Boundaries
    'src/components/ErrorBoundaries/index.ts',
    'src/components/ErrorBoundaries/ScreenErrorBoundary.tsx',
    'src/components/ErrorBoundaries/WidgetErrorBoundary.tsx',
    
    // Fallbacks
    'src/components/Fallbacks/index.ts',
    'src/components/Fallbacks/ErrorFallback.tsx',
    'src/components/Fallbacks/NetworkErrorFallback.tsx',
    
    // Shared Components
    'src/components/shared/GradientHeader.tsx',
    'src/components/shared/GradientCard.tsx',
    'src/components/shared/GradientButton.tsx',
    
    // Automation Service
    'src/services/automation/AutomationEngine.ts',
    'src/services/automation/executors/index.ts',
    'src/store/api/automationApi.ts',
  ];

  for (const file of filesToCheck) {
    results.total++;
    const fullPath = path.join(basePath, file);
    
    if (fs.existsSync(fullPath)) {
      results.success.push(file);
      console.log(`✅ ${file}`);
    } else {
      results.failed.push(file);
      console.log(`❌ ${file} - File not found`);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`Total files checked: ${results.total}`);
  console.log(`✅ Existing: ${results.success.length}`);
  console.log(`❌ Missing: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Missing files:');
    results.failed.forEach(file => console.log(`   - ${file}`));
    process.exit(1);
  } else {
    console.log('\n🎉 All files verified successfully!');
    process.exit(0);
  }
};

verifyFiles();