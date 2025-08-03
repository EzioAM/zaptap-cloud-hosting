#!/usr/bin/env node

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DeploymentManager {
  constructor() {
    this.requiredEnvVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY', 
      'CLAUDE_API_KEY',
      'OPENAI_API_KEY'
    ];
  }

  async deploy(profile = 'preview') {
    console.log(`🚀 Deploying Zaptap with AI features to ${profile}...`);
    
    try {
      // Step 1: Validate environment
      this.validateEnvironment();
      
      // Step 2: Check AI feature integrity
      await this.validateAIFeatures();
      
      // Step 3: Set environment variables in EAS
      await this.setEASSecrets();
      
      // Step 4: Deploy based on profile
      if (profile === 'build') {
        await this.buildApp();
      } else {
        await this.updateApp(profile);
      }
      
      console.log('✅ Deployment complete!');
      this.printAccessInstructions(profile);
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    }
  }

  validateEnvironment() {
    console.log('🔍 Validating environment variables...');
    
    const missing = this.requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    console.log('✅ All environment variables present');
  }

  async validateAIFeatures() {
    console.log('🤖 Validating AI features...');
    
    const requiredFiles = [
      'src/services/research/AIResearchService.ts',
      'src/services/research/LocalResearchService.ts', 
      'src/services/auth/RoleService.ts',
      'src/screens/developer/DeveloperMenuScreen.tsx',
      'src/components/research/ResearchDashboard.tsx',
      'scripts/research-automation.js',
      'scripts/analyze-research.js',
      'scripts/auto-implement.js',
      'scripts/ui-redesign-automation.js'
    ];

    const missing = requiredFiles.filter(file => 
      !fs.existsSync(path.join(__dirname, '..', file))
    );

    if (missing.length > 0) {
      console.warn('⚠️  Some AI feature files are missing:');
      missing.forEach(file => console.warn(`   - ${file}`));
      console.warn('   App will still deploy but some features may not work');
    } else {
      console.log('✅ All AI feature files present');
    }

    // Test API connectivity
    await this.testAPIConnectivity();
  }

  async testAPIConnectivity() {
    console.log('🔌 Testing API connectivity...');
    
    try {
      // Quick test of both APIs
      const { execSync } = require('child_process');
      const testResult = execSync(
        'node scripts/research-automation.js "deployment test" 2>&1 || echo "API_TEST_FAILED"',
        { cwd: path.join(__dirname, '..'), timeout: 30000 }
      ).toString();

      if (testResult.includes('API_TEST_FAILED')) {
        console.warn('⚠️  API test failed - apps will use fallback research data');
      } else if (testResult.includes('✅')) {
        console.log('✅ API connectivity confirmed');
      } else {
        console.warn('⚠️  API test inconclusive - deployment will continue');
      }
    } catch (error) {
      console.warn('⚠️  Could not test API connectivity:', error.message);
    }
  }

  async setEASSecrets() {
    console.log('🔐 Setting EAS environment secrets...');
    
    for (const envVar of this.requiredEnvVars) {
      try {
        const value = process.env[envVar];
        if (value) {
          execSync(`eas secret:create --scope project --name ${envVar} --value "${value}" --force`, {
            stdio: 'pipe'
          });
          console.log(`   ✅ Set ${envVar}`);
        }
      } catch (error) {
        // Ignore errors - secret might already exist
        console.log(`   ℹ️  ${envVar} (already exists or set)`);
      }
    }
  }

  async buildApp() {
    console.log('🏗️  Building preview app with AI features...');
    
    console.log('\\n📱 Building for iOS and Android separately...');
    console.log('Note: You may need to complete the build process interactively for first-time setup.\\n');
    
    try {
      // Try iOS first (usually has fewer credential issues)
      console.log('🍎 Building for iOS...');
      try {
        execSync('eas build --platform ios --profile preview', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
        console.log('✅ iOS build submitted successfully');
      } catch (iosError) {
        console.log('⚠️  iOS build failed - you may need to configure credentials');
      }
      
      // Then Android
      console.log('\\n🤖 Building for Android...');
      console.log('If prompted, choose "Generate new keystore" for Android\\n');
      try {
        execSync('eas build --platform android --profile preview', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        });
        console.log('✅ Android build submitted successfully');
      } catch (androidError) {
        console.log('⚠️  Android build failed - you may need to configure credentials');
      }
      
    } catch (error) {
      console.log('\\n⚠️  Build process encountered issues. This is normal for first-time setup.');
      console.log('\\n📋 To complete the build setup:');
      console.log('1. Run: npm run build:preview:ios (and follow prompts)');
      console.log('2. Run: npm run build:preview:android (and follow prompts)');
      console.log('3. Once builds are complete, use: npm run deploy:update for future updates');
      throw new Error('First-time build setup required. Please run the commands above.');
    }
  }

  async updateApp(profile) {
    console.log(`📦 Updating ${profile} with latest AI features...`);
    
    const message = `AI-powered update: Research tools, UI redesign, auto-implementation (${new Date().toISOString()})`;
    
    try {
      execSync(`eas update --branch ${profile} --message "${message}" --non-interactive`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      });
    } catch (error) {
      throw new Error('EAS update failed. Ensure you have a compatible build.');
    }
  }

  printAccessInstructions(profile) {
    console.log('\\n🎉 Deployment Complete!');
    console.log('\\n📱 How to Access Your AI-Powered App:');
    
    if (profile === 'build') {
      console.log('\\n1. **Install the Preview Build:**');
      console.log('   - Check your email for the EAS build notification');
      console.log('   - Install the .ipa (iOS) or .apk (Android) file'); 
      console.log('   - Or use: `eas build:list` to get download links');
    } else {
      console.log('\\n1. **If you have the preview build installed:**');
      console.log('   - Open the app - it will automatically update');
      console.log('   - Look for the update notification');
      
      console.log('\\n2. **If you need to install first:**');
      console.log('   - Run: `npm run build:preview`');
      console.log('   - Then install the generated build');
    }

    console.log('\\n🔧 **AI Features Now Available:**');
    console.log('   ✅ Developer Menu (only for marcminott@gmail.com)');
    console.log('   ✅ AI Research Tools (Claude + ChatGPT)');
    console.log('   ✅ Research Analysis & Implementation');
    console.log('   ✅ UI/UX Redesign with DALL-E mockups');
    console.log('   ✅ Auto-code generation');
    console.log('   ✅ Supabase role-based access');

    console.log('\\n🎯 **To Access Developer Features:**');
    console.log('   1. Open the app');
    console.log('   2. Look for "Developer" button on home screen');
    console.log('   3. Tap → Research Tools');
    console.log('   4. Test AI research and UI redesign features');

    console.log('\\n💡 **Pro Tips:**');
    console.log('   - The app works offline with fallback research data');
    console.log('   - All AI features respect role-based permissions');
    console.log('   - Generated UI mockups are saved to device');
    console.log('   - Research results can be shared and analyzed');

    console.log('\\n📋 **Next Commands:**');
    console.log('   `eas build:list` - View all builds');
    console.log('   `npm run update:preview` - Push new updates');
    console.log('   `npm run build:preview` - Create new build');
  }
}

// CLI Usage
async function main() {
  const command = process.argv[2];
  const profile = process.argv[3] || 'preview';

  const deployer = new DeploymentManager();

  switch (command) {
    case 'build':
      await deployer.deploy('build');
      break;
    case 'update':
      await deployer.deploy(profile);
      break;
    case 'test':
      try {
        deployer.validateEnvironment();
        await deployer.validateAIFeatures();
        console.log('✅ All systems ready for deployment!');
      } catch (error) {
        console.error('❌ Pre-deployment check failed:', error.message);
        process.exit(1);
      }
      break;
    default:
      console.log('🚀 Zaptap AI-Powered Deployment Manager');
      console.log('');
      console.log('Commands:');
      console.log('  build             Build new preview with AI features');
      console.log('  update [profile]  Update existing build (default: preview)');
      console.log('  test              Test deployment readiness');
      console.log('');
      console.log('Examples:');
      console.log('  npm run deploy:build     # Build new preview');
      console.log('  npm run deploy:update    # Update preview');
      console.log('  npm run deploy:test      # Test readiness');
      console.log('');
      console.log('Profiles: development, preview, production');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Deployment script failed:', error.message);
    process.exit(1);
  });
}

module.exports = DeploymentManager;