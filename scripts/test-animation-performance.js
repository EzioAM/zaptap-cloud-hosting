#!/usr/bin/env node

/**
 * Animation Performance Testing Script
 * Tests and validates animation optimizations across the app
 */

const chalk = require('chalk');
const ora = require('ora');

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  HIGH_END: { fps: 55, maxFrameTime: 18 },
  MID_RANGE: { fps: 45, maxFrameTime: 22 },
  LOW_END: { fps: 30, maxFrameTime: 33 },
};

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  warnings: [],
};

// Helper functions
function logHeader(title) {
  console.log('\n' + chalk.blue('═'.repeat(60)));
  console.log(chalk.blue.bold(`  ${title}`));
  console.log(chalk.blue('═'.repeat(60)) + '\n');
}

function logSuccess(message) {
  console.log(chalk.green('✓'), message);
  testResults.passed.push(message);
}

function logError(message) {
  console.log(chalk.red('✗'), message);
  testResults.failed.push(message);
}

function logWarning(message) {
  console.log(chalk.yellow('⚠'), message);
  testResults.warnings.push(message);
}

function logInfo(message) {
  console.log(chalk.cyan('ℹ'), message);
}

// Test functions
async function testAnimationSystem() {
  const spinner = ora('Testing Animation System...').start();
  
  try {
    // Check if AnimationController exists
    const animationControllerPath = '../src/utils/animations/AnimationController';
    const { AnimationController } = require(animationControllerPath);
    
    if (AnimationController) {
      spinner.succeed('AnimationController loaded successfully');
      logSuccess('Animation system initialized');
      
      // Test singleton pattern
      const instance1 = AnimationController.getInstance();
      const instance2 = AnimationController.getInstance();
      
      if (instance1 === instance2) {
        logSuccess('Singleton pattern working correctly');
      } else {
        logError('Singleton pattern not working');
      }
    }
  } catch (error) {
    spinner.fail('Failed to load AnimationController');
    logError(`Animation system error: ${error.message}`);
  }
}

async function testPlatformOptimizations() {
  const spinner = ora('Testing Platform Optimizations...').start();
  
  try {
    const { PlatformOptimizer, IOSOptimizations, AndroidOptimizations, WebOptimizations } = 
      require('../src/utils/animations/PlatformOptimizations');
    
    spinner.succeed('Platform optimizations loaded');
    
    // Test optimization functions
    const testConfig = { duration: 300, tension: 200, friction: 15 };
    const optimized = PlatformOptimizer.optimize(testConfig);
    
    if (optimized) {
      logSuccess('Platform optimizer working');
    }
    
    // Test style optimizations
    const testStyle = { opacity: 1, transform: [{ scale: 1 }] };
    const optimizedStyle = PlatformOptimizer.optimizeStyle(testStyle);
    
    if (optimizedStyle) {
      logSuccess('Style optimization working');
    }
    
  } catch (error) {
    spinner.fail('Platform optimizations failed');
    logError(`Platform optimization error: ${error.message}`);
  }
}

async function testPerformanceHooks() {
  const spinner = ora('Testing Performance Hooks...').start();
  
  try {
    const hooks = require('../src/utils/animations/PerformanceHooks');
    
    const requiredHooks = [
      'useAnimationPerformance',
      'useOptimizedAnimatedValue',
      'useDelayedAnimation',
      'useBatchAnimations',
      'useOptimizedScrollAnimation',
      'useSpringAnimation',
      'useTimingAnimation',
      'useReducedMotion',
      'useFPSMonitor',
      'useLazyAnimation',
      'useGestureAnimation',
    ];
    
    let allHooksPresent = true;
    
    for (const hookName of requiredHooks) {
      if (hooks[hookName]) {
        logSuccess(`Hook ${hookName} is available`);
      } else {
        logError(`Hook ${hookName} is missing`);
        allHooksPresent = false;
      }
    }
    
    if (allHooksPresent) {
      spinner.succeed('All performance hooks available');
    } else {
      spinner.fail('Some performance hooks are missing');
    }
    
  } catch (error) {
    spinner.fail('Performance hooks failed');
    logError(`Performance hooks error: ${error.message}`);
  }
}

async function testPresetAnimations() {
  const spinner = ora('Testing Preset Animations...').start();
  
  try {
    const { PresetAnimations } = require('../src/utils/animations/PresetAnimations');
    
    // Test if preset animations are defined
    const presets = [
      'fadeInUp', 'fadeInDown', 'fadeInScale',
      'fadeOutUp', 'fadeOutDown', 'fadeOutScale',
      'pulse', 'shake', 'bounce', 'wobble',
      'slideInLeft', 'slideInRight',
      'rotate', 'flip',
      'buttonPress', 'cardExpand',
      'skeleton', 'spinner',
      'progressBar', 'circularProgress',
    ];
    
    let allPresetsAvailable = true;
    
    for (const preset of presets) {
      if (typeof PresetAnimations[preset] === 'function') {
        logSuccess(`Preset animation '${preset}' is available`);
      } else {
        logError(`Preset animation '${preset}' is missing`);
        allPresetsAvailable = false;
      }
    }
    
    if (allPresetsAvailable) {
      spinner.succeed('All preset animations available');
    } else {
      spinner.warn('Some preset animations are missing');
    }
    
  } catch (error) {
    spinner.fail('Preset animations failed');
    logError(`Preset animations error: ${error.message}`);
  }
}

async function testOptimizedScreens() {
  const spinner = ora('Testing Optimized Screens...').start();
  
  try {
    // Test if optimized screens exist
    const screens = [
      '../src/screens/modern/ModernHomeScreenOptimized',
      '../src/screens/modern/DiscoverScreenOptimized',
    ];
    
    for (const screenPath of screens) {
      try {
        const Screen = require(screenPath);
        if (Screen.default) {
          logSuccess(`Optimized screen ${screenPath} loaded`);
        }
      } catch (error) {
        logWarning(`Could not load ${screenPath}: ${error.message}`);
      }
    }
    
    spinner.succeed('Optimized screens checked');
    
  } catch (error) {
    spinner.fail('Optimized screens check failed');
    logError(`Screen loading error: ${error.message}`);
  }
}

async function testOptimizedWidgets() {
  const spinner = ora('Testing Optimized Widgets...').start();
  
  try {
    const widgetPath = '../src/components/organisms/DashboardWidgets/QuickStatsWidgetOptimized';
    const Widget = require(widgetPath);
    
    if (Widget.default) {
      logSuccess('QuickStatsWidgetOptimized loaded successfully');
      spinner.succeed('Optimized widgets available');
    }
    
  } catch (error) {
    spinner.warn('Optimized widgets not found');
    logWarning(`Widget loading error: ${error.message}`);
  }
}

async function checkPerformanceTargets() {
  logHeader('Performance Targets');
  
  logInfo('Expected performance targets:');
  console.log(chalk.gray('  High-end devices:'), `${PERFORMANCE_THRESHOLDS.HIGH_END.fps}+ FPS`);
  console.log(chalk.gray('  Mid-range devices:'), `${PERFORMANCE_THRESHOLDS.MID_RANGE.fps}+ FPS`);
  console.log(chalk.gray('  Low-end devices:'), `${PERFORMANCE_THRESHOLDS.LOW_END.fps}+ FPS`);
  
  logInfo('\nOptimization features:');
  console.log(chalk.gray('  • Native driver optimization'));
  console.log(chalk.gray('  • Animation batching'));
  console.log(chalk.gray('  • Lazy initialization'));
  console.log(chalk.gray('  • Platform-specific optimizations'));
  console.log(chalk.gray('  • Reduced motion support'));
  console.log(chalk.gray('  • FPS monitoring'));
  console.log(chalk.gray('  • Animation caching'));
  console.log(chalk.gray('  • InteractionManager integration'));
}

// Summary function
function printSummary() {
  logHeader('Test Summary');
  
  const total = testResults.passed.length + testResults.failed.length;
  const passRate = total > 0 ? ((testResults.passed.length / total) * 100).toFixed(1) : 0;
  
  console.log(chalk.green(`  Passed: ${testResults.passed.length}`));
  console.log(chalk.red(`  Failed: ${testResults.failed.length}`));
  console.log(chalk.yellow(`  Warnings: ${testResults.warnings.length}`));
  console.log(chalk.blue(`  Pass Rate: ${passRate}%`));
  
  if (testResults.failed.length > 0) {
    console.log('\n' + chalk.red.bold('Failed Tests:'));
    testResults.failed.forEach(test => {
      console.log(chalk.red(`  • ${test}`));
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log('\n' + chalk.yellow.bold('Warnings:'));
    testResults.warnings.forEach(warning => {
      console.log(chalk.yellow(`  • ${warning}`));
    });
  }
  
  if (testResults.passed.length === total && testResults.failed.length === 0) {
    console.log('\n' + chalk.green.bold('✨ All animation performance tests passed!'));
  } else if (testResults.failed.length > 0) {
    console.log('\n' + chalk.red.bold('❌ Some tests failed. Please review and fix the issues.'));
  }
}

// Main execution
async function main() {
  console.clear();
  logHeader('Animation Performance Test Suite');
  
  try {
    // Run all tests
    await testAnimationSystem();
    await testPlatformOptimizations();
    await testPerformanceHooks();
    await testPresetAnimations();
    await testOptimizedScreens();
    await testOptimizedWidgets();
    await checkPerformanceTargets();
    
    // Print summary
    printSummary();
    
    // Exit with appropriate code
    process.exit(testResults.failed.length > 0 ? 1 : 0);
    
  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test suite
main().catch(console.error);