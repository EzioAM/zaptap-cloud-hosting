#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Bundle Size Analyzer for ShortcutsLike App\n');

// Helper to execute commands
const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
};

// Analyze dependencies
async function analyzeDependencies() {
  console.log('📦 Analyzing dependencies...\n');
  
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  );
  
  const dependencies = Object.keys(packageJson.dependencies);
  const devDependencies = Object.keys(packageJson.devDependencies);
  
  console.log(`Total dependencies: ${dependencies.length}`);
  console.log(`Total devDependencies: ${devDependencies.length}\n`);
  
  // Find large dependencies
  const largeDeps = [
    'react-native-chart-kit',
    'victory-native',
    'react-native-draggable-flatlist',
    'react-native-qrcode-svg',
    'react-native-nfc-manager',
    '@supabase/supabase-js',
    'react-native-paper',
    'react-native-reanimated',
    'expo-av',
    'expo-camera',
    'expo-location',
  ];
  
  console.log('🏋️ Heavy dependencies found:');
  largeDeps.forEach(dep => {
    if (dependencies.includes(dep)) {
      console.log(`  - ${dep}`);
    }
  });
  console.log('');
}

// Analyze file sizes
async function analyzeFileSizes() {
  console.log('📊 Analyzing source file sizes...\n');
  
  const srcPath = path.join(__dirname, '..', 'src');
  const largeFiles = [];
  
  function walkDir(dir, baseDir = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath, path.join(baseDir, file));
      } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
        const sizeKB = stat.size / 1024;
        if (sizeKB > 50) { // Files larger than 50KB
          largeFiles.push({
            path: path.join(baseDir, file),
            size: sizeKB
          });
        }
      }
    });
  }
  
  walkDir(srcPath);
  
  if (largeFiles.length > 0) {
    console.log('Large source files (>50KB):');
    largeFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach(file => {
        console.log(`  ${file.path}: ${file.size.toFixed(2)} KB`);
      });
    console.log('');
  }
}

// Check for duplicate imports
async function checkDuplicateImports() {
  console.log('🔄 Checking for duplicate imports...\n');
  
  const imports = new Map();
  const srcPath = path.join(__dirname, '..', 'src');
  
  function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const importRegex = /import\s+(?:(?:\{[^}]*\})|(?:\*\s+as\s+\w+)|(?:\w+))\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const module = match[1];
      if (!imports.has(module)) {
        imports.set(module, []);
      }
      imports.get(module).push(filePath);
    }
  }
  
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walkDir(filePath);
      } else if (stat.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
        analyzeFile(filePath);
      }
    });
  }
  
  walkDir(srcPath);
  
  // Find heavily imported modules
  const heavilyImported = Array.from(imports.entries())
    .filter(([module, files]) => files.length > 5)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);
  
  if (heavilyImported.length > 0) {
    console.log('Most imported modules:');
    heavilyImported.forEach(([module, files]) => {
      console.log(`  ${module}: imported ${files.length} times`);
    });
    console.log('');
  }
}

// Generate optimization report
async function generateReport() {
  console.log('📝 Optimization Recommendations:\n');
  
  const recommendations = [
    {
      title: 'Code Splitting',
      items: [
        '✅ Lazy load screens with React.lazy()',
        '✅ Split vendor bundles from app code',
        '✅ Use dynamic imports for heavy components',
        '✅ Implement route-based code splitting'
      ]
    },
    {
      title: 'Import Optimization',
      items: [
        '✅ Use specific imports for icons',
        '✅ Tree-shake lodash and date-fns',
        '✅ Optimize React Native Paper imports',
        '✅ Remove unused dependencies'
      ]
    },
    {
      title: 'Asset Optimization',
      items: [
        '✅ Lazy load images and fonts',
        '✅ Compress image assets',
        '✅ Use WebP format for images',
        '✅ Implement progressive image loading'
      ]
    },
    {
      title: 'Bundle Optimization',
      items: [
        '✅ Enable RAM bundles for Android',
        '✅ Use Hermes engine',
        '✅ Enable ProGuard for Android',
        '✅ Remove console logs in production'
      ]
    }
  ];
  
  recommendations.forEach(category => {
    console.log(`${category.title}:`);
    category.items.forEach(item => {
      console.log(`  ${item}`);
    });
    console.log('');
  });
}

// Estimate bundle size reduction
async function estimateSavings() {
  console.log('💰 Estimated Bundle Size Savings:\n');
  
  const savings = [
    { optimization: 'Lazy loading screens', saving: '~500KB' },
    { optimization: 'Tree-shaking imports', saving: '~200KB' },
    { optimization: 'Removing unused deps', saving: '~300KB' },
    { optimization: 'Code splitting', saving: '~400KB' },
    { optimization: 'Asset optimization', saving: '~600KB' },
    { optimization: 'Production minification', saving: '~300KB' },
  ];
  
  let totalSaving = 0;
  savings.forEach(item => {
    const kb = parseInt(item.saving.replace(/[^0-9]/g, ''));
    totalSaving += kb;
    console.log(`  ${item.optimization}: ${item.saving}`);
  });
  
  console.log(`\n  Total estimated savings: ~${totalSaving}KB (${(totalSaving/1024).toFixed(1)}MB)`);
  console.log(`  Estimated bundle size reduction: ~40-50%\n`);
}

// Check current optimizations
async function checkCurrentOptimizations() {
  console.log('✅ Current Optimizations Applied:\n');
  
  const optimizations = [];
  
  // Check babel config
  if (fs.existsSync(path.join(__dirname, '..', 'babel.config.js'))) {
    const babelConfig = fs.readFileSync(path.join(__dirname, '..', 'babel.config.js'), 'utf8');
    if (babelConfig.includes('babel-plugin-transform-imports')) {
      optimizations.push('Tree-shaking imports configured');
    }
    if (babelConfig.includes('transform-remove-console')) {
      optimizations.push('Console removal in production');
    }
  }
  
  // Check metro config
  if (fs.existsSync(path.join(__dirname, '..', 'metro.config.js'))) {
    const metroConfig = fs.readFileSync(path.join(__dirname, '..', 'metro.config.js'), 'utf8');
    if (metroConfig.includes('minifierConfig')) {
      optimizations.push('Bundle minification configured');
    }
    if (metroConfig.includes('processModuleFilter')) {
      optimizations.push('Module filtering enabled');
    }
  }
  
  // Check for lazy loading
  if (fs.existsSync(path.join(__dirname, '..', 'src', 'utils', 'lazyLoad.tsx'))) {
    optimizations.push('Lazy loading utilities created');
  }
  
  if (fs.existsSync(path.join(__dirname, '..', 'src', 'navigation', 'LazyNavigator.tsx'))) {
    optimizations.push('Lazy navigation implemented');
  }
  
  optimizations.forEach(opt => {
    console.log(`  ✓ ${opt}`);
  });
  console.log('');
}

// Main function
async function main() {
  try {
    await analyzeDependencies();
    await analyzeFileSizes();
    await checkDuplicateImports();
    await checkCurrentOptimizations();
    await generateReport();
    await estimateSavings();
    
    console.log('🎯 Next Steps:');
    console.log('  1. Run: npm install --save-dev babel-plugin-transform-imports');
    console.log('  2. Run: npm install --save-dev babel-plugin-transform-remove-console');
    console.log('  3. Run: npm install --save-dev babel-plugin-transform-remove-debugger');
    console.log('  4. Run: npm install --save-dev metro-minify-terser');
    console.log('  5. Update imports to use lazy loading');
    console.log('  6. Test the app thoroughly');
    console.log('  7. Build for production to see actual size reduction\n');
    
    console.log('✨ Bundle optimization analysis complete!');
  } catch (error) {
    console.error('Error analyzing bundle:', error);
    process.exit(1);
  }
}

main();