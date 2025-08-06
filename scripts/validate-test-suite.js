#!/usr/bin/env node

/**
 * Test Suite Validation Script
 * Validates the comprehensive test suite setup and runs a subset of tests
 * to ensure everything is working correctly.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Validating ShortcutsLike Test Suite...\n');

// Test suite validation results
const results = {
  infrastructure: [],
  utilities: [],
  tests: [],
  coverage: [],
  performance: [],
  accessibility: [],
  overall: 'PENDING'
};

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Run a command and return the result
 */
function runCommand(command, description) {
  try {
    console.log(`⏳ ${description}...`);
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000 // 30 second timeout
    });
    console.log(`✅ ${description} - SUCCESS`);
    return { success: true, output };
  } catch (error) {
    console.log(`❌ ${description} - FAILED`);
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Validate test infrastructure
 */
function validateInfrastructure() {
  console.log('\n📁 Validating Test Infrastructure...\n');

  const requiredFiles = [
    '__tests__/utils/setupTests.ts',
    '__tests__/utils/testHelpers.ts',
    '__tests__/utils/renderWithProviders.tsx',
    '__tests__/utils/performanceHelpers.ts',
    '__tests__/utils/accessibilityHelpers.ts',
    '__tests__/utils/testConfig.ts',
  ];

  const requiredDirectories = [
    '__tests__/components',
    '__tests__/hooks',
    '__tests__/services',
    '__tests__/integration',
    '__tests__/snapshots',
    '__tests__/performance',
    '__tests__/accessibility',
  ];

  // Check required files
  requiredFiles.forEach(file => {
    const exists = fileExists(file);
    results.infrastructure.push({
      item: `File: ${file}`,
      status: exists ? 'PASS' : 'FAIL'
    });
    console.log(`${exists ? '✅' : '❌'} ${file}`);
  });

  // Check required directories
  requiredDirectories.forEach(dir => {
    const exists = fileExists(dir);
    results.infrastructure.push({
      item: `Directory: ${dir}`,
      status: exists ? 'PASS' : 'FAIL'
    });
    console.log(`${exists ? '✅' : '❌'} ${dir}/`);
  });
}

/**
 * Validate test utilities
 */
function validateUtilities() {
  console.log('\n🛠️ Validating Test Utilities...\n');

  // Check if Jest is configured correctly
  const jestConfig = runCommand('npx jest --showConfig', 'Jest configuration');
  results.utilities.push({
    item: 'Jest Configuration',
    status: jestConfig.success ? 'PASS' : 'FAIL'
  });

  // Check if testing libraries are installed
  const dependencies = [
    '@testing-library/react-native',
    '@testing-library/jest-native',
    'react-test-renderer',
    'jest'
  ];

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  dependencies.forEach(dep => {
    const installed = dep in allDeps;
    results.utilities.push({
      item: `Dependency: ${dep}`,
      status: installed ? 'PASS' : 'FAIL'
    });
    console.log(`${installed ? '✅' : '❌'} ${dep} ${installed ? `(${allDeps[dep]})` : '(missing)'}`);
  });
}

/**
 * Run sample tests
 */
function runSampleTests() {
  console.log('\n🎯 Running Sample Tests...\n');

  const testCommands = [
    {
      command: 'npm test -- __tests__/utils/testHelpers.ts --passWithNoTests',
      description: 'Test Helpers'
    },
    {
      command: 'npm test -- __tests__/components/organisms/QuickStatsWidget.test.tsx --passWithNoTests',
      description: 'QuickStatsWidget Component'
    },
    {
      command: 'npm test -- __tests__/hooks/useHaptic.test.ts --passWithNoTests',
      description: 'useHaptic Hook'
    }
  ];

  testCommands.forEach(({ command, description }) => {
    const result = runCommand(command, `Testing ${description}`);
    results.tests.push({
      item: description,
      status: result.success ? 'PASS' : 'FAIL'
    });
  });
}

/**
 * Validate coverage setup
 */
function validateCoverage() {
  console.log('\n📊 Validating Coverage Setup...\n');

  const coverageResult = runCommand('npm run test:coverage -- --passWithNoTests', 'Coverage generation');
  results.coverage.push({
    item: 'Coverage Generation',
    status: coverageResult.success ? 'PASS' : 'FAIL'
  });

  // Check if coverage files are generated
  const coverageFiles = [
    'coverage/lcov-report/index.html',
    'coverage/coverage-final.json',
    'coverage/lcov.info'
  ];

  coverageFiles.forEach(file => {
    const exists = fileExists(file);
    results.coverage.push({
      item: `Coverage File: ${file}`,
      status: exists ? 'PASS' : 'FAIL'
    });
    console.log(`${exists ? '✅' : '❌'} ${file}`);
  });
}

/**
 * Validate performance testing setup
 */
function validatePerformance() {
  console.log('\n⚡ Validating Performance Testing...\n');

  // Check if performance test utilities work
  try {
    const performanceTest = `
      const { PerformanceTestUtils } = require('./__tests__/utils/performanceHelpers.ts');
      const { renderTime } = PerformanceTestUtils.measureRenderTime(() => 'test');
      console.log('Performance utilities working');
    `;
    
    const result = runCommand(`node -e "${performanceTest}"`, 'Performance Utilities');
    results.performance.push({
      item: 'Performance Utilities',
      status: result.success ? 'PASS' : 'FAIL'
    });
  } catch (error) {
    results.performance.push({
      item: 'Performance Utilities',
      status: 'FAIL'
    });
    console.log('❌ Performance utilities validation failed');
  }

  // Check if performance thresholds are configured
  const configExists = fileExists('__tests__/utils/testConfig.ts');
  results.performance.push({
    item: 'Performance Configuration',
    status: configExists ? 'PASS' : 'FAIL'
  });
  console.log(`${configExists ? '✅' : '❌'} Performance Configuration`);
}

/**
 * Validate accessibility testing setup
 */
function validateAccessibility() {
  console.log('\n♿ Validating Accessibility Testing...\n');

  // Check if accessibility test utilities exist
  const a11yUtilsExist = fileExists('__tests__/utils/accessibilityHelpers.ts');
  results.accessibility.push({
    item: 'Accessibility Utilities',
    status: a11yUtilsExist ? 'PASS' : 'FAIL'
  });
  console.log(`${a11yUtilsExist ? '✅' : '❌'} Accessibility Utilities`);

  // Check if accessibility tests exist
  const a11yTestsExist = fileExists('__tests__/accessibility/ComponentAccessibility.test.tsx');
  results.accessibility.push({
    item: 'Accessibility Tests',
    status: a11yTestsExist ? 'PASS' : 'FAIL'
  });
  console.log(`${a11yTestsExist ? '✅' : '❌'} Accessibility Tests`);
}

/**
 * Generate validation report
 */
function generateReport() {
  console.log('\n📋 Validation Report\n');

  const categories = [
    { name: 'Infrastructure', data: results.infrastructure },
    { name: 'Utilities', data: results.utilities },
    { name: 'Tests', data: results.tests },
    { name: 'Coverage', data: results.coverage },
    { name: 'Performance', data: results.performance },
    { name: 'Accessibility', data: results.accessibility }
  ];

  let totalItems = 0;
  let passedItems = 0;

  categories.forEach(category => {
    const passed = category.data.filter(item => item.status === 'PASS').length;
    const total = category.data.length;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    console.log(`${category.name}: ${passed}/${total} (${percentage}%)`);
    
    totalItems += total;
    passedItems += passed;

    if (percentage < 100) {
      const failed = category.data.filter(item => item.status === 'FAIL');
      failed.forEach(item => {
        console.log(`  ❌ ${item.item}`);
      });
    }
  });

  const overallPercentage = totalItems > 0 ? Math.round((passedItems / totalItems) * 100) : 0;
  
  console.log(`\n🎯 Overall: ${passedItems}/${totalItems} (${overallPercentage}%)`);

  if (overallPercentage >= 90) {
    results.overall = 'EXCELLENT';
    console.log('🎉 Test suite validation: EXCELLENT!');
  } else if (overallPercentage >= 75) {
    results.overall = 'GOOD';
    console.log('✅ Test suite validation: GOOD');
  } else if (overallPercentage >= 50) {
    results.overall = 'NEEDS_IMPROVEMENT';
    console.log('⚠️ Test suite validation: NEEDS IMPROVEMENT');
  } else {
    results.overall = 'POOR';
    console.log('❌ Test suite validation: POOR');
  }

  return overallPercentage >= 75;
}

/**
 * Provide recommendations
 */
function provideRecommendations() {
  console.log('\n💡 Recommendations\n');

  const failedInfrastructure = results.infrastructure.filter(item => item.status === 'FAIL');
  if (failedInfrastructure.length > 0) {
    console.log('📁 Infrastructure Issues:');
    failedInfrastructure.forEach(item => {
      console.log(`   • ${item.item}`);
    });
    console.log('   → Ensure all test utility files and directories are created\n');
  }

  const failedUtilities = results.utilities.filter(item => item.status === 'FAIL');
  if (failedUtilities.length > 0) {
    console.log('🛠️ Utility Issues:');
    failedUtilities.forEach(item => {
      console.log(`   • ${item.item}`);
    });
    console.log('   → Run: npm install to install missing dependencies\n');
  }

  const failedTests = results.tests.filter(item => item.status === 'FAIL');
  if (failedTests.length > 0) {
    console.log('🎯 Test Issues:');
    failedTests.forEach(item => {
      console.log(`   • ${item.item}`);
    });
    console.log('   → Check test files for syntax errors and missing dependencies\n');
  }

  console.log('🚀 Next Steps:');
  console.log('   1. Fix any failing infrastructure components');
  console.log('   2. Run full test suite: npm test');
  console.log('   3. Generate coverage report: npm run test:coverage');
  console.log('   4. Run performance tests: npm run test:performance');
  console.log('   5. Run accessibility tests: npm run test:accessibility');
  console.log('   6. Add tests for remaining components');
}

/**
 * Main validation function
 */
function main() {
  try {
    validateInfrastructure();
    validateUtilities();
    runSampleTests();
    validateCoverage();
    validatePerformance();
    validateAccessibility();
    
    const success = generateReport();
    provideRecommendations();

    console.log(`\n${'='.repeat(50)}`);
    console.log('🧪 ShortcutsLike Test Suite Validation Complete');
    console.log(`${'='.repeat(50)}\n`);

    // Exit with appropriate code
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Validation script error:', error.message);
    process.exit(1);
  }
}

// Run the validation
main();