#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');

class RedesignImplementer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.srcPath = path.join(this.projectRoot, 'src');
  }

  async implementRedesign(redesignDir) {
    console.log('🚀 Implementing redesigned UI components...');
    
    if (!fs.existsSync(redesignDir)) {
      console.error('❌ Redesign directory not found:', redesignDir);
      process.exit(1);
    }

    try {
      // Read the generated code file
      const codeFile = path.join(redesignDir, 'component-code.md');
      if (!fs.existsSync(codeFile)) {
        console.error('❌ Component code file not found');
        process.exit(1);
      }

      const codeContent = fs.readFileSync(codeFile, 'utf8');
      const screenName = this.extractScreenName(redesignDir);
      
      // Extract and create files from the generated code
      await this.extractAndCreateFiles(codeContent, screenName);
      
      // Copy mockup images to assets
      await this.copyMockupImages(redesignDir);
      
      // Update navigation if needed
      await this.updateNavigation(screenName);
      
      // Create integration guide
      await this.createIntegrationGuide(screenName, redesignDir);
      
      console.log('✅ Redesign implementation complete!');
      this.printSummary(screenName);
      
    } catch (error) {
      console.error('❌ Implementation failed:', error.message);
      process.exit(1);
    }
  }

  extractScreenName(redesignDir) {
    const dirName = path.basename(redesignDir);
    const match = dirName.match(/^(\\w+)-redesign-\\d+$/);
    return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : 'Unknown';
  }

  async extractAndCreateFiles(codeContent, screenName) {
    console.log('📝 Extracting and creating component files...');
    
    // Extract TypeScript/TSX code blocks
    const codeBlocks = this.extractCodeBlocks(codeContent);
    
    const screenDir = path.join(this.srcPath, 'screens', 'redesigned');
    if (!fs.existsSync(screenDir)) {
      fs.mkdirSync(screenDir, { recursive: true });
    }

    // Process each code block
    for (const block of codeBlocks) {
      await this.createFileFromBlock(block, screenName, screenDir);
    }
  }

  extractCodeBlocks(content) {
    const blocks = [];
    const codeBlockRegex = /```(?:typescript|tsx?|javascript)\\n([\\s\\S]*?)\\n```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const code = match[1];
      const filename = this.extractFilename(code);
      
      blocks.push({
        filename,
        code,
        type: this.determineFileType(filename, code)
      });
    }

    return blocks;
  }

  extractFilename(code) {
    // Look for filename in comments
    const filenameMatch = code.match(/\\/\\/ (\\w+\\.(tsx?|ts|js))/);
    if (filenameMatch) {
      return filenameMatch[1];
    }

    // Try to detect from exports or imports
    if (code.includes('export const') || code.includes('export default')) {
      if (code.includes('StyleSheet')) {
        return 'styles.ts';
      } else if (code.includes('interface') && !code.includes('React')) {
        return 'types.ts';
      } else if (code.includes('useState') || code.includes('useEffect')) {
        return 'hook.ts';
      } else {
        return 'component.tsx';
      }
    }

    return 'generated.ts';
  }

  determineFileType(filename, code) {
    if (filename.endsWith('.tsx')) return 'component';
    if (filename.includes('styles')) return 'styles';
    if (filename.includes('types')) return 'types';
    if (filename.includes('hook') || code.includes('useState')) return 'hook';
    return 'utility';
  }

  async createFileFromBlock(block, screenName, outputDir) {
    let filename = block.filename;
    
    // Ensure proper naming convention
    if (filename === 'component.tsx') {
      filename = `${screenName}.tsx`;
    } else if (filename === 'styles.ts') {
      filename = `${screenName}.styles.ts`;
    } else if (filename === 'types.ts') {
      filename = `${screenName}.types.ts`;
    } else if (filename === 'hook.ts') {
      filename = `use${screenName}.ts`;
    }

    const filepath = path.join(outputDir, filename);
    
    // Don't overwrite existing files
    if (fs.existsSync(filepath)) {
      console.log(`   ⚠️  ${filename} already exists, creating backup...`);
      const backupPath = filepath + '.backup.' + Date.now();
      fs.copyFileSync(filepath, backupPath);
    }

    // Clean up and format the code
    const cleanCode = this.cleanupCode(block.code, block.type);
    
    fs.writeFileSync(filepath, cleanCode);
    console.log(`   ✅ Created: ${filename}`);
  }

  cleanupCode(code, type) {
    // Remove any markdown artifacts
    let cleanCode = code
      .replace(/^#.*$/gm, '') // Remove markdown headers
      .replace(/\\*\\*.*?\\*\\*/g, '') // Remove bold text
      .replace(/^\\s*-\\s.*$/gm, '') // Remove list items
      .trim();

    // Ensure proper imports for React Native components
    if (type === 'component' && !cleanCode.includes("import React")) {
      cleanCode = "import React from 'react';\\n" + cleanCode;
    }

    // Add proper export if missing
    if (type === 'component' && !cleanCode.includes('export')) {
      const componentName = cleanCode.match(/(?:const|function)\\s+(\\w+)/)?.[1];
      if (componentName) {
        cleanCode += `\\n\\nexport default ${componentName};`;
      }
    }

    return cleanCode;
  }

  async copyMockupImages(redesignDir) {
    console.log('🖼️ Copying mockup images to assets...');
    
    const assetsDir = path.join(this.projectRoot, 'assets', 'mockups');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const files = fs.readdirSync(redesignDir);
    const imageFiles = files.filter(file => 
      file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
    );

    imageFiles.forEach(imageFile => {
      const sourcePath = path.join(redesignDir, imageFile);
      const destPath = path.join(assetsDir, imageFile);
      
      fs.copyFileSync(sourcePath, destPath);
      console.log(`   📸 Copied: ${imageFile}`);
    });

    return imageFiles;
  }

  async updateNavigation(screenName) {
    console.log('🧭 Checking navigation integration...');
    
    const navFile = path.join(this.srcPath, 'navigation', 'AppNavigator.tsx');
    
    if (!fs.existsSync(navFile)) {
      console.log('   ⚠️  Navigation file not found, skipping auto-integration');
      return;
    }

    try {
      const navContent = fs.readFileSync(navFile, 'utf8');
      
      // Check if screen is already registered
      if (navContent.includes(screenName)) {
        console.log(`   ✅ ${screenName} already in navigation`);
        return;
      }

      // Add screen to developer menu instead of main navigation
      await this.addToDevMenu(screenName);
      
    } catch (error) {
      console.log('   ⚠️  Could not update navigation automatically:', error.message);
    }
  }

  async addToDevMenu(screenName) {
    const devMenuFile = path.join(this.srcPath, 'screens', 'developer', 'DeveloperMenuScreen.tsx');
    
    if (!fs.existsSync(devMenuFile)) {
      console.log('   ⚠️  Developer menu not found, skipping integration');
      return;
    }

    try {
      let devMenuContent = fs.readFileSync(devMenuFile, 'utf8');
      
      // Add import
      const importLine = `import { ${screenName} } from '../redesigned/${screenName}';`;
      if (!devMenuContent.includes(importLine)) {
        const importSection = devMenuContent.indexOf('import');
        const lastImport = devMenuContent.indexOf(';', importSection);
        devMenuContent = devMenuContent.slice(0, lastImport + 1) + 
                        '\\n' + importLine + 
                        devMenuContent.slice(lastImport + 1);
      }

      // Add menu item (this is a simplified approach)
      const menuItemCode = `
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('${screenName}Redesigned')}
          style={styles.menuButton}
        >
          ${screenName} (Redesigned)
        </Button>`;

      if (!devMenuContent.includes(`${screenName} (Redesigned)`)) {
        const lastButton = devMenuContent.lastIndexOf('</Button>');
        if (lastButton !== -1) {
          const insertPoint = devMenuContent.indexOf('\\n', lastButton);
          devMenuContent = devMenuContent.slice(0, insertPoint) + 
                          menuItemCode + 
                          devMenuContent.slice(insertPoint);
        }
      }

      fs.writeFileSync(devMenuFile, devMenuContent);
      console.log('   ✅ Added to developer menu');
      
    } catch (error) {
      console.log('   ⚠️  Could not update developer menu:', error.message);
    }
  }

  async createIntegrationGuide(screenName, redesignDir) {
    console.log('📋 Creating integration guide...');
    
    const guideContent = `# ${screenName} Redesign Integration Guide

*Generated on ${new Date().toLocaleString()}*

## 📁 Generated Files
- \`src/screens/redesigned/${screenName}.tsx\` - Main component
- \`src/screens/redesigned/${screenName}.styles.ts\` - Styles (if generated)
- \`src/screens/redesigned/${screenName}.types.ts\` - Types (if generated)
- \`src/hooks/use${screenName}.ts\` - Custom hook (if generated)

## 🎨 Design Assets
- Mockup images copied to \`assets/mockups/\`
- Original design files in: \`${redesignDir}\`

## 🔧 Integration Steps

### 1. Review Generated Code
\`\`\`bash
# Check the generated component
code src/screens/redesigned/${screenName}.tsx
\`\`\`

### 2. Test in Developer Menu
1. Start the app: \`npm start\`
2. Navigate to Developer Menu
3. Look for "${screenName} (Redesigned)" button
4. Test the new UI on different devices

### 3. Update Navigation (Manual)
If you want to replace the original screen:

\`\`\`typescript
// In src/navigation/AppNavigator.tsx
import { ${screenName} } from '../screens/redesigned/${screenName}';

// Replace the original screen registration
<Stack.Screen 
  name="${screenName}" 
  component={${screenName}} 
  options={{ title: "${screenName}" }}
/>
\`\`\`

### 4. Handle State Migration
If the original screen had state or data:
1. Compare the old and new component interfaces
2. Migrate any existing state management
3. Update any parent components that pass props

### 5. Update Tests
\`\`\`bash
# Create test file
touch src/screens/redesigned/__tests__/${screenName}.test.tsx
\`\`\`

## 🎯 Quality Checklist
- [ ] Component renders without errors
- [ ] All interactive elements work
- [ ] Responsive on different screen sizes
- [ ] Accessible (screen reader friendly)
- [ ] Dark/light mode support
- [ ] Performance is acceptable
- [ ] Follows app's design system

## 🐛 Troubleshooting

### Common Issues
1. **Import errors**: Check if all required dependencies are installed
2. **Style conflicts**: Ensure styles don't conflict with global styles
3. **Navigation issues**: Verify screen is properly registered
4. **Performance**: Check for unnecessary re-renders

### Dependencies to Install
Check if these are needed and install:
\`\`\`bash
npm install react-native-reanimated react-native-gesture-handler
\`\`\`

## 📱 Testing
1. **iOS Simulator**: Test on different iPhone sizes
2. **Android Emulator**: Test on different Android versions
3. **Physical Devices**: Test on real devices for performance
4. **Dark Mode**: Toggle and test appearance
5. **Accessibility**: Test with screen reader enabled

## 🔄 Iteration
To redesign again:
\`\`\`bash
node scripts/ui-redesign-automation.js ${screenName} "improved version" modern accessible
\`\`\`

---
*Generated by Redesign Implementer*`;

    const guideFile = path.join(this.srcPath, 'screens', 'redesigned', `${screenName}-integration-guide.md`);
    fs.writeFileSync(guideFile, guideContent);
    console.log(`   📄 Guide created: ${screenName}-integration-guide.md`);
  }

  printSummary(screenName) {
    console.log('\\n🎉 Implementation Summary:');
    console.log(`   📱 Screen: ${screenName}`);
    console.log(`   📁 Files: src/screens/redesigned/`);
    console.log(`   🎨 Assets: assets/mockups/`);
    console.log(`   🧭 Navigation: Added to developer menu`);
    
    console.log('\\n🚀 Next Steps:');
    console.log('   1. Review generated components');
    console.log('   2. Test in developer menu');
    console.log('   3. Customize as needed');
    console.log('   4. Replace original when ready');
    
    console.log('\\n📋 Commands:');
    console.log('   npm start  # Start app and test');
    console.log(`   code src/screens/redesigned/${screenName}.tsx  # Edit component`);
  }
}

// CLI Usage
async function main() {
  const redesignDir = process.argv[2];

  if (!redesignDir) {
    console.log('Redesign Implementation Tool');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/implement-redesign.js <redesign-directory>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/implement-redesign.js ui-redesign-results/homescreen-redesign-1754123456789');
    console.log('');
    console.log('This tool will:');
    console.log('  - Extract component code from redesign results');
    console.log('  - Create React Native component files');
    console.log('  - Copy mockup images to assets');
    console.log('  - Update navigation (developer menu)');
    console.log('  - Generate integration guide');
    process.exit(1);
  }

  try {
    const implementer = new RedesignImplementer();
    await implementer.implementRedesign(redesignDir);
  } catch (error) {
    console.error('❌ Implementation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = RedesignImplementer;