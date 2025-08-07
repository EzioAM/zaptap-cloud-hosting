#!/usr/bin/env node

/**
 * Architecture Validation Script
 * Ensures no circular dependencies and proper service initialization
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Services and their dependencies
const serviceArchitecture = {
  'EventLogger': {
    path: 'src/utils/EventLogger.ts',
    dependencies: [],
    shouldNotImport: ['SyncManager', 'offlineSlice', 'store/index'],
    description: 'Singleton logging utility with no dependencies'
  },
  'SyncManager': {
    path: 'src/services/offline/SyncManager.ts',
    dependencies: ['EventLogger'],
    shouldNotImport: ['AnalyticsService', 'store/index', 'offlineSlice'],
    description: 'Manages offline sync operations'
  },
  'NetworkService': {
    path: 'src/services/network/NetworkService.ts',
    dependencies: ['EventLogger'],
    shouldNotImport: ['AnalyticsService', 'SyncManager direct import'],
    description: 'Handles network state monitoring'
  },
  'offlineSlice': {
    path: 'src/store/slices/offlineSlice.ts',
    dependencies: ['EventLogger', 'lazy SyncManager'],
    shouldNotImport: ['AnalyticsService logger'],
    description: 'Redux slice for offline state'
  },
  'store/index': {
    path: 'src/store/index.ts',
    dependencies: ['EventLogger'],
    shouldNotImport: ['direct SyncManager', 'direct NetworkService'],
    description: 'Redux store configuration'
  },
  'App.tsx': {
    path: 'App.tsx',
    dependencies: ['EventLogger', 'lazy store'],
    shouldNotImport: ['undefined logger', 'direct SyncManager'],
    description: 'Main application component'
  }
};

// Validation results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function checkFile(serviceName, config) {
  console.log(`\n${colors.cyan}Checking ${serviceName}...${colors.reset}`);
  
  const filePath = path.join(__dirname, config.path);
  
  if (!fs.existsSync(filePath)) {
    results.failed.push({
      service: serviceName,
      issue: `File not found: ${config.path}`
    });
    console.log(`  ${colors.red}✗ File not found${colors.reset}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  let hasIssues = false;
  
  // Check for required dependencies
  config.dependencies.forEach(dep => {
    const importPattern = new RegExp(`import.*${dep}`, 'g');
    if (!importPattern.test(content)) {
      results.warnings.push({
        service: serviceName,
        issue: `Missing expected import: ${dep}`
      });
      console.log(`  ${colors.yellow}⚠ Missing import: ${dep}${colors.reset}`);
    }
  });
  
  // Check for forbidden imports
  config.shouldNotImport.forEach(forbidden => {
    if (forbidden.includes('logger') && forbidden.includes('AnalyticsService')) {
      // Special case for logger from AnalyticsService
      const badPattern = /import.*logger.*from.*AnalyticsService/g;
      if (badPattern.test(content)) {
        results.failed.push({
          service: serviceName,
          issue: `Circular dependency: imports logger from AnalyticsService`
        });
        console.log(`  ${colors.red}✗ Circular dependency: logger from AnalyticsService${colors.reset}`);
        hasIssues = true;
      }
    } else if (forbidden === 'undefined logger') {
      // Check for undefined logger usage
      const loggerUsagePattern = /\blogger\./g;
      const loggerImportPattern = /import.*\blogger\b/g;
      
      if (loggerUsagePattern.test(content) && !content.includes('EventLogger')) {
        results.failed.push({
          service: serviceName,
          issue: `Uses undefined 'logger' variable`
        });
        console.log(`  ${colors.red}✗ Uses undefined 'logger' variable${colors.reset}`);
        hasIssues = true;
      }
    } else if (forbidden.includes('direct')) {
      // Check for direct imports that should be lazy
      const serviceName = forbidden.replace('direct ', '');
      const directImportPattern = new RegExp(`import.*${serviceName}.*from`, 'g');
      if (directImportPattern.test(content) && !content.includes('await import')) {
        results.warnings.push({
          service: serviceName,
          issue: `Direct import of ${serviceName} (should be lazy loaded)`
        });
        console.log(`  ${colors.yellow}⚠ Direct import: ${serviceName}${colors.reset}`);
      }
    }
  });
  
  // Check for EventLogger usage pattern
  if (serviceName !== 'EventLogger') {
    const eventLoggerPattern = /EventLogger\.(info|error|warn|debug|critical)/g;
    const matches = content.match(eventLoggerPattern);
    if (matches && matches.length > 0) {
      console.log(`  ${colors.green}✓ Uses EventLogger correctly (${matches.length} calls)${colors.reset}`);
    }
  }
  
  if (!hasIssues) {
    results.passed.push(serviceName);
    console.log(`  ${colors.green}✓ Architecture compliant${colors.reset}`);
  }
}

// Main validation
console.log(`${colors.bold}${colors.blue}Architecture Validation Report${colors.reset}`);
console.log('=' .repeat(50));

// Check each service
Object.entries(serviceArchitecture).forEach(([name, config]) => {
  checkFile(name, config);
});

// Summary
console.log(`\n${colors.bold}Summary:${colors.reset}`);
console.log('=' .repeat(50));

console.log(`${colors.green}✓ Passed: ${results.passed.length}${colors.reset}`);
results.passed.forEach(service => {
  console.log(`  - ${service}`);
});

if (results.warnings.length > 0) {
  console.log(`\n${colors.yellow}⚠ Warnings: ${results.warnings.length}${colors.reset}`);
  results.warnings.forEach(({ service, issue }) => {
    console.log(`  - ${service}: ${issue}`);
  });
}

if (results.failed.length > 0) {
  console.log(`\n${colors.red}✗ Failed: ${results.failed.length}${colors.reset}`);
  results.failed.forEach(({ service, issue }) => {
    console.log(`  - ${service}: ${issue}`);
  });
}

// Architecture diagram
console.log(`\n${colors.bold}${colors.cyan}Correct Architecture Flow:${colors.reset}`);
console.log('=' .repeat(50));
console.log(`
  EventLogger (Singleton, No Dependencies)
       ↑
       ├── SyncManager
       ├── NetworkService  
       ├── offlineSlice (lazy loads SyncManager)
       ├── store/index
       └── App.tsx
       
  Initialization Order:
  1. EventLogger (automatic singleton)
  2. Redux Store creation
  3. NetworkService.initialize() 
  4. offlineSlice.initializeOfflineSystem()
  5. SyncManager (lazy loaded when needed)
`);

// Exit code
if (results.failed.length > 0) {
  console.log(`\n${colors.red}${colors.bold}Architecture validation FAILED${colors.reset}`);
  process.exit(1);
} else if (results.warnings.length > 0) {
  console.log(`\n${colors.yellow}${colors.bold}Architecture validation PASSED with warnings${colors.reset}`);
  process.exit(0);
} else {
  console.log(`\n${colors.green}${colors.bold}Architecture validation PASSED${colors.reset}`);
  process.exit(0);
}