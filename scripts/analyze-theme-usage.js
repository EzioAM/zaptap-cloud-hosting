#!/usr/bin/env node

/**
 * Theme Usage Analysis Script
 * Identifies components that need theme system migration
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Patterns to look for
const patterns = {
  oldThemeImport: /import.*useTheme.*from.*ThemeContext/g,
  hardcodedColors: /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g,
  rgbaColors: /rgba?\([^)]+\)/g,
  oldColorAccess: /theme\.colors\.(primary|secondary|background|surface|text)(?!\.(primary|secondary|tertiary))/g,
  missingAccessibility: /<TouchableOpacity(?![^>]*accessibilityRole)/g,
  createStylesAny: /createStyles.*:\s*any/g,
};

const results = {
  oldThemeImport: [],
  hardcodedColors: [],
  rgbaColors: [],
  oldColorAccess: [],
  missingAccessibility: [],
  createStylesAny: [],
  summary: {
    totalFiles: 0,
    filesNeedingMigration: 0,
    criticalIssues: 0,
  }
};

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(srcDir, filePath);
    
    let fileHasIssues = false;
    
    for (const [patternName, pattern] of Object.entries(patterns)) {
      const matches = content.match(pattern);
      if (matches) {
        fileHasIssues = true;
        results[patternName].push({
          file: relativePath,
          matches: matches.length,
          examples: matches.slice(0, 3), // Show first 3 examples
        });
      }
    }
    
    results.summary.totalFiles++;
    if (fileHasIssues) {
      results.summary.filesNeedingMigration++;
    }
    
    // Count critical issues (hardcoded colors and missing accessibility)
    if (content.match(patterns.hardcodedColors) || content.match(patterns.missingAccessibility)) {
      results.summary.criticalIssues++;
    }
    
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      analyzeFile(filePath);
    }
  }
}

function generateReport() {
  console.log('🎨 Theme Migration Analysis Report');
  console.log('=' .repeat(50));
  
  console.log('\n📊 Summary:');
  console.log(`Total files analyzed: ${results.summary.totalFiles}`);
  console.log(`Files needing migration: ${results.summary.filesNeedingMigration}`);
  console.log(`Files with critical issues: ${results.summary.criticalIssues}`);
  
  const migrationProgress = ((results.summary.totalFiles - results.summary.filesNeedingMigration) / results.summary.totalFiles * 100).toFixed(1);
  console.log(`Migration progress: ${migrationProgress}%`);
  
  // Priority issues
  console.log('\n🚨 Critical Issues (High Priority):');
  
  if (results.hardcodedColors.length > 0) {
    console.log('\n❌ Hardcoded Colors:');
    results.hardcodedColors.slice(0, 10).forEach(item => {
      console.log(`  ${item.file} (${item.matches} instances)`);
      item.examples.forEach(example => console.log(`    Example: ${example}`));
    });
    if (results.hardcodedColors.length > 10) {
      console.log(`  ... and ${results.hardcodedColors.length - 10} more files`);
    }
  }
  
  if (results.missingAccessibility.length > 0) {
    console.log('\n♿ Missing Accessibility:');
    results.missingAccessibility.slice(0, 10).forEach(item => {
      console.log(`  ${item.file} (${item.matches} TouchableOpacity without accessibilityRole)`);
    });
    if (results.missingAccessibility.length > 10) {
      console.log(`  ... and ${results.missingAccessibility.length - 10} more files`);
    }
  }
  
  // Medium priority issues
  console.log('\n⚠️  Medium Priority Issues:');
  
  if (results.oldThemeImport.length > 0) {
    console.log('\n🔄 Old Theme Import:');
    results.oldThemeImport.forEach(item => {
      console.log(`  ${item.file}`);
    });
  }
  
  if (results.oldColorAccess.length > 0) {
    console.log('\n🎨 Old Color Access Pattern:');
    results.oldColorAccess.slice(0, 5).forEach(item => {
      console.log(`  ${item.file} (${item.matches} instances)`);
    });
    if (results.oldColorAccess.length > 5) {
      console.log(`  ... and ${results.oldColorAccess.length - 5} more files`);
    }
  }
  
  if (results.createStylesAny.length > 0) {
    console.log('\n📝 Untyped Style Functions:');
    results.createStylesAny.forEach(item => {
      console.log(`  ${item.file}`);
    });
  }
  
  // Migration recommendations
  console.log('\n📋 Next Steps:');
  console.log('1. Prioritize files with hardcoded colors and missing accessibility');
  console.log('2. Update theme imports in screens and major components');
  console.log('3. Add TypeScript types to createStyles functions');
  console.log('4. Test theme switching after each migration');
  
  // Top priority files
  const priorityFiles = new Set();
  results.hardcodedColors.forEach(item => priorityFiles.add(item.file));
  results.missingAccessibility.forEach(item => priorityFiles.add(item.file));
  results.oldThemeImport.forEach(item => priorityFiles.add(item.file));
  
  if (priorityFiles.size > 0) {
    console.log('\n🎯 High Priority Files to Migrate:');
    const sortedPriority = Array.from(priorityFiles).sort();
    sortedPriority.slice(0, 15).forEach(file => {
      console.log(`  📄 ${file}`);
    });
    if (sortedPriority.length > 15) {
      console.log(`  ... and ${sortedPriority.length - 15} more files`);
    }
  }
  
  console.log('\n✅ Migration completed for:');
  console.log('  📄 screens/modern/ModernProfileScreen.tsx');
  console.log('  📄 contexts/UnifiedThemeProvider.tsx (new)');
  console.log('  📄 utils/ThemeUtils.ts (new)');
  console.log('  📄 components/ui/* (new themed components)');
}

// Run analysis
console.log('Analyzing theme usage...');
walkDirectory(srcDir);
generateReport();

// Write detailed results to file
const reportPath = path.join(__dirname, '../theme-analysis-report.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`\n📊 Detailed report saved to: ${reportPath}`);