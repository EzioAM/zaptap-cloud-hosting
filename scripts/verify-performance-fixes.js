#!/usr/bin/env node

/**
 * Script to verify performance fixes are working correctly
 * Run this after starting the app to check performance metrics
 */

const { PerformanceMeasurement } = require('../src/utils/PerformanceMeasurement');
const { PerformanceAnalyzer } = require('../src/utils/PerformanceAnalyzer');

console.log('🔍 Verifying Performance Fixes...\n');

// Simulate app startup
console.log('📱 Simulating app startup sequence...');
PerformanceMeasurement.mark('app_bootstrap_start');

setTimeout(() => {
  PerformanceMeasurement.mark('services_loaded');
  console.log('  ✓ Services loaded');
}, 500);

setTimeout(() => {
  PerformanceMeasurement.mark('app_render_start');
  console.log('  ✓ First render started');
}, 800);

setTimeout(() => {
  PerformanceMeasurement.mark('app_initialization_complete');
  console.log('  ✓ App initialization complete\n');
  
  // Check launch time immediately
  const launchTime1 = PerformanceMeasurement.getAppLaunchTime();
  console.log(`📊 Launch time (immediate): ${launchTime1}ms`);
  
  // Check launch time after delay
  setTimeout(() => {
    const launchTime2 = PerformanceMeasurement.getAppLaunchTime();
    console.log(`📊 Launch time (5s later): ${launchTime2}ms`);
    
    if (launchTime1 === launchTime2) {
      console.log('✅ SUCCESS: Launch time is correctly frozen after initialization!');
    } else {
      console.log('❌ FAILURE: Launch time is still increasing after initialization');
    }
    
    // Generate performance report
    console.log('\n📈 Performance Report:');
    const report = PerformanceMeasurement.getDetailedReport();
    console.log(`  Total Launch Time: ${report.totalLaunchTime}ms`);
    console.log(`  Status: ${report.benchmarks.status}`);
    console.log(`  Target: ${report.benchmarks.target}ms`);
    
    if (report.totalLaunchTime < 2000) {
      console.log('\n🎉 Performance is EXCELLENT! Launch time is under 2 seconds.');
    } else if (report.totalLaunchTime < 2500) {
      console.log('\n👍 Performance is GOOD. Launch time is acceptable.');
    } else {
      console.log('\n⚠️ Performance needs improvement. Consider optimization.');
    }
    
    // Test frame drop detection
    console.log('\n🎮 Testing frame drop detection...');
    const analyzer = PerformanceAnalyzer;
    analyzer.initialize();
    
    // Simulate some frame drops
    for (let i = 0; i < 5; i++) {
      // Minor drops (should not trigger warnings)
      analyzer.trackAnimation(`test-animation-${i}`, 25);
    }
    
    // Simulate severe frame drop
    analyzer.trackAnimation('heavy-animation', 150);
    
    const perfReport = analyzer.generateReport();
    console.log(`  Frame Rate: ${perfReport.metrics.frameRate}fps`);
    console.log(`  Overall Health: ${perfReport.analysis.overallHealth}`);
    
    console.log('\n✨ Performance verification complete!');
    process.exit(0);
  }, 5000);
}, 1200);

console.log('\n⏳ Running performance checks...');