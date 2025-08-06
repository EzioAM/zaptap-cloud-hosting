#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SOURCE_DIR = path.join(__dirname, '../src');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Console replacement patterns
const CONSOLE_REPLACEMENTS = {
  'console.error': 'EventLogger.error',
  'console.warn': 'EventLogger.warn', 
  'console.info': 'EventLogger.info',
  'console.log': 'EventLogger.debug',
  'console.debug': 'EventLogger.debug',
};

// Files that should be skipped
const SKIP_FILES = [
  'EventLogger.ts', // The logger itself
  'Logger.ts', // Legacy logger
  'replace-console-statements.js', // This script
];

// Common error context patterns
const ERROR_CONTEXTS = {
  'Navigation': 'Navigation',
  'API': 'API',
  'Database': 'Database', 
  'Auth': 'Authentication',
  'Network': 'Network',
  'Storage': 'Storage',
  'Analytics': 'Analytics',
  'NFC': 'NFC',
  'QR': 'QRCode',
  'Automation': 'Automation',
  'UI': 'UI',
};

/**
 * Add EventLogger import if not present
 */
function addEventLoggerImport(content, filePath) {
  // Check if EventLogger is already imported
  if (content.includes("from '../../utils/EventLogger'") || 
      content.includes("from '../utils/EventLogger'") ||
      content.includes("from './utils/EventLogger'")) {
    return content;
  }

  // Determine relative path to EventLogger
  const relativePath = getRelativePathToEventLogger(filePath);
  
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^import\s+.*from\s+['"].*['"];?\s*$/)) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    // No imports found, add at the beginning after any comments
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('//') && !lines[i].startsWith('/*') && lines[i].trim()) {
        insertIndex = i;
        break;
      }
    }
    lines.splice(insertIndex, 0, `import { EventLogger } from '${relativePath}';`);
  } else {
    // Add after the last import
    lines.splice(lastImportIndex + 1, 0, `import { EventLogger } from '${relativePath}';`);
  }

  return lines.join('\n');
}

/**
 * Get relative path to EventLogger based on file location
 */
function getRelativePathToEventLogger(filePath) {
  const relativePath = path.relative(path.dirname(filePath), path.join(SOURCE_DIR, 'utils'));
  return relativePath.startsWith('.') ? `${relativePath}/EventLogger` : `./${relativePath}/EventLogger`;
}

/**
 * Generate context name from file path
 */
function getContextFromFilePath(filePath) {
  const fileName = path.basename(filePath, path.extname(filePath));
  const dirName = path.basename(path.dirname(filePath));
  
  // Check for known patterns
  for (const [pattern, context] of Object.entries(ERROR_CONTEXTS)) {
    if (fileName.toLowerCase().includes(pattern.toLowerCase()) ||
        dirName.toLowerCase().includes(pattern.toLowerCase())) {
      return context;
    }
  }
  
  // Default context based on file/directory name
  return fileName.replace(/Screen|Component|Service|Manager|Provider/g, '');
}

/**
 * Replace console statements with EventLogger calls
 */
function replaceConsoleStatements(content, filePath) {
  const context = getContextFromFilePath(filePath);
  let modified = content;
  let hasChanges = false;

  // Replace console.error patterns
  modified = modified.replace(
    /console\.error\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\s*\);?/g,
    (match, message, errorVar) => {
      hasChanges = true;
      return `EventLogger.error('${context}', '${message}', ${errorVar} as Error);`;
    }
  );

  // Replace console.error with just message
  modified = modified.replace(
    /console\.error\(\s*['"`]([^'"`]+)['"`]\s*\);?/g,
    (match, message) => {
      hasChanges = true;
      return `EventLogger.error('${context}', '${message}');`;
    }
  );

  // Replace console.warn patterns  
  modified = modified.replace(
    /console\.warn\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\s*\);?/g,
    (match, message, data) => {
      hasChanges = true;
      return `EventLogger.warn('${context}', '${message}', ${data});`;
    }
  );

  modified = modified.replace(
    /console\.warn\(\s*['"`]([^'"`]+)['"`]\s*\);?/g,
    (match, message) => {
      hasChanges = true;
      return `EventLogger.warn('${context}', '${message}');`;
    }
  );

  // Replace console.log patterns (map to debug)
  modified = modified.replace(
    /console\.log\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\s*\);?/g,
    (match, message, data) => {
      hasChanges = true;
      return `EventLogger.debug('${context}', '${message}', ${data});`;
    }
  );

  modified = modified.replace(
    /console\.log\(\s*['"`]([^'"`]+)['"`]\s*\);?/g,
    (match, message) => {
      hasChanges = true;
      return `EventLogger.debug('${context}', '${message}');`;
    }
  );

  // Replace console.info patterns
  modified = modified.replace(
    /console\.info\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\s*\);?/g,
    (match, message, data) => {
      hasChanges = true;
      return `EventLogger.info('${context}', '${message}', ${data});`;
    }
  );

  modified = modified.replace(
    /console\.info\(\s*['"`]([^'"`]+)['"`]\s*\);?/g,
    (match, message) => {
      hasChanges = true;
      return `EventLogger.info('${context}', '${message}');`;
    }
  );

  // If we made changes, add the import
  if (hasChanges) {
    modified = addEventLoggerImport(modified, filePath);
  }

  return { content: modified, hasChanges };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  const fileName = path.basename(filePath);
  
  // Skip certain files
  if (SKIP_FILES.some(skip => fileName.includes(skip))) {
    if (VERBOSE) {
      console.log(`⏭️  Skipping ${filePath}`);
    }
    return { processed: false, hasChanges: false };
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const result = replaceConsoleStatements(content, filePath);
    
    if (result.hasChanges) {
      if (DRY_RUN) {
        console.log(`✏️  Would update ${filePath}`);
      } else {
        fs.writeFileSync(filePath, result.content, 'utf8');
        console.log(`✅ Updated ${filePath}`);
      }
      return { processed: true, hasChanges: true };
    } else {
      if (VERBOSE) {
        console.log(`👍 No changes needed for ${filePath}`);
      }
      return { processed: true, hasChanges: false };
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { processed: false, hasChanges: false, error: error.message };
  }
}

/**
 * Find all TypeScript/JavaScript files to process
 */
function findFilesToProcess(dir) {
  const files = [];
  
  function walk(directory) {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (!item.startsWith('.') && item !== 'node_modules') {
          walk(fullPath);
        }
      } else if (stats.isFile()) {
        // Process TypeScript and JavaScript files
        if (/\.(ts|tsx|js|jsx)$/.test(item)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Finding files with console statements...');
  
  // Find files with console statements
  const allFiles = findFilesToProcess(SOURCE_DIR);
  const filesWithConsole = [];
  
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (/console\.(log|warn|error|info|debug)/.test(content)) {
        filesWithConsole.push(file);
      }
    } catch (error) {
      console.warn(`⚠️  Could not read ${file}: ${error.message}`);
    }
  }
  
  console.log(`📊 Found ${filesWithConsole.length} files with console statements`);
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN - No files will be modified');
  }
  
  // Process each file
  let processed = 0;
  let updated = 0;
  let errors = 0;
  
  for (const file of filesWithConsole) {
    const result = processFile(file);
    
    if (result.processed) {
      processed++;
      if (result.hasChanges) {
        updated++;
      }
    }
    
    if (result.error) {
      errors++;
    }
  }
  
  // Summary
  console.log('\n📈 Summary:');
  console.log(`   📁 Files processed: ${processed}`);
  console.log(`   ✏️  Files updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  
  if (DRY_RUN && updated > 0) {
    console.log('\n🚀 Run without --dry-run to apply changes');
  }
}

// Run the script
if (require.main === module) {
  main();
}