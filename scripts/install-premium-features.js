#!/usr/bin/env node

/**
 * Premium Features Installation Script
 * Sets up React Native Skia and IoT Integration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command, options = {}) {
  try {
    log(`Running: ${command}`, 'cyan');
    execSync(command, { stdio: 'inherit', ...options });
    return true;
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('\n🚀 Premium Features Installation', 'bright');
  log('================================\n', 'bright');

  // Step 1: Install npm dependencies
  log('📦 Installing NPM dependencies...', 'blue');
  // Try with legacy peer deps first to handle React 19 compatibility
  if (!exec('npm install --legacy-peer-deps')) {
    log('Trying with force flag...', 'yellow');
    if (!exec('npm install --force')) {
      log('Failed to install npm dependencies', 'red');
      log('Please run: npm install --legacy-peer-deps', 'yellow');
      process.exit(1);
    }
  }

  // Step 2: iOS Setup
  const isIOS = fs.existsSync(path.join(process.cwd(), 'ios'));
  if (isIOS) {
    log('\n🍎 Setting up iOS...', 'blue');
    
    // Update Info.plist
    const infoPlistPath = path.join(process.cwd(), 'ios/Zaptap/Info.plist');
    if (fs.existsSync(infoPlistPath)) {
      let infoPlist = fs.readFileSync(infoPlistPath, 'utf8');
      
      // Add HomeKit permission if not present
      if (!infoPlist.includes('NSHomeKitUsageDescription')) {
        const permissionEntry = `
  <key>NSHomeKitUsageDescription</key>
  <string>Control your smart home devices directly from the app</string>`;
        
        // Insert before closing </dict>
        infoPlist = infoPlist.replace(/<\/dict>\s*<\/plist>/, `${permissionEntry}\n</dict>\n</plist>`);
        fs.writeFileSync(infoPlistPath, infoPlist);
        log('✅ Added HomeKit permissions to Info.plist', 'green');
      }
    }

    // Add native modules to Xcode project
    const bridgingHeaderPath = path.join(process.cwd(), 'ios/Zaptap/Zaptap-Bridging-Header.h');
    if (!fs.existsSync(bridgingHeaderPath)) {
      const bridgingHeader = `//
//  Use this file to import your target's public headers that you would like to expose to Swift.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>
`;
      fs.writeFileSync(bridgingHeaderPath, bridgingHeader);
      log('✅ Created bridging header', 'green');
    }

    // Install pods
    log('\n📱 Installing CocoaPods...', 'blue');
    exec('cd ios && pod install');
  }

  // Step 3: Android Setup (placeholder for future)
  const isAndroid = fs.existsSync(path.join(process.cwd(), 'android'));
  if (isAndroid) {
    log('\n🤖 Android setup...', 'blue');
    log('⚠️  Android native modules coming soon', 'yellow');
    
    // Add permissions to AndroidManifest.xml
    const manifestPath = path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
    if (fs.existsSync(manifestPath)) {
      let manifest = fs.readFileSync(manifestPath, 'utf8');
      
      // Add required permissions
      const permissions = [
        '<uses-permission android:name="android.permission.BLUETOOTH" />',
        '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />',
        '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
        '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
      ];
      
      permissions.forEach(permission => {
        if (!manifest.includes(permission)) {
          manifest = manifest.replace(
            '<application',
            `${permission}\n    <application`
          );
        }
      });
      
      fs.writeFileSync(manifestPath, manifest);
      log('✅ Added Android permissions', 'green');
    }
  }

  // Step 4: Verify configuration
  log('\n🔍 Verifying configuration...', 'blue');
  
  const configPath = path.join(process.cwd(), 'src/config/PremiumConfig.ts');
  if (fs.existsSync(configPath)) {
    log('✅ PremiumConfig.ts found', 'green');
  } else {
    log('⚠️  PremiumConfig.ts not found - premium features may not work', 'yellow');
  }

  const weatherEffectsPath = path.join(process.cwd(), 'src/components/weather/PremiumWeatherEffects.tsx');
  if (fs.existsSync(weatherEffectsPath)) {
    log('✅ PremiumWeatherEffects.tsx found', 'green');
  } else {
    log('⚠️  PremiumWeatherEffects.tsx not found', 'yellow');
  }

  const iotServicePath = path.join(process.cwd(), 'src/services/iot/IoTIntegrationService.ts');
  if (fs.existsSync(iotServicePath)) {
    log('✅ IoTIntegrationService.ts found', 'green');
  } else {
    log('⚠️  IoTIntegrationService.ts not found', 'yellow');
  }

  // Step 5: Create test automation
  log('\n🧪 Creating test automation...', 'blue');
  
  const testAutomation = {
    id: 'test-premium-features',
    title: 'Premium Features Test',
    description: 'Test automation to verify premium weather and IoT features',
    category: 'Smart Home',
    triggers: [
      {
        type: 'manual',
        name: 'Manual Trigger'
      }
    ],
    actions: [
      {
        type: 'weather',
        name: 'Check Weather',
        config: {
          effect: 'premium',
          condition: 'rain'
        }
      },
      {
        type: 'iot',
        name: 'Control Device',
        config: {
          protocol: 'matter',
          action: 'discover'
        }
      }
    ],
    enabled: true,
    createdAt: new Date().toISOString()
  };

  const automationsDir = path.join(process.cwd(), 'src/data/automations');
  if (!fs.existsSync(automationsDir)) {
    fs.mkdirSync(automationsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(automationsDir, 'test-premium.json'),
    JSON.stringify(testAutomation, null, 2)
  );
  log('✅ Created test automation', 'green');

  // Step 6: Environment setup
  log('\n⚙️  Setting up environment...', 'blue');
  
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, 'utf8');
    
    // Add premium feature flags if not present
    const flags = [
      'ENABLE_PREMIUM_WEATHER=true',
      'ENABLE_IOT_INTEGRATION=true',
      'SKIA_GPU_BACKEND=webgpu',
      'IOT_DISCOVERY_INTERVAL=30000',
      'WEATHER_QUALITY=high'
    ];
    
    flags.forEach(flag => {
      if (!env.includes(flag.split('=')[0])) {
        env += `\n${flag}`;
      }
    });
    
    fs.writeFileSync(envPath, env);
    log('✅ Updated .env file', 'green');
  }

  // Step 7: Final summary
  log('\n✨ Installation Complete!', 'bright');
  log('========================\n', 'bright');
  
  log('📋 Next Steps:', 'blue');
  log('1. Run the app:', 'cyan');
  log('   iOS:     npm run ios', 'reset');
  log('   Android: npm run android', 'reset');
  log('');
  log('2. Test premium features:', 'cyan');
  log('   - Open the app and check weather widget', 'reset');
  log('   - Navigate to IoT Dashboard', 'reset');
  log('   - Try device discovery', 'reset');
  log('');
  log('3. Configure settings in:', 'cyan');
  log('   src/config/PremiumConfig.ts', 'reset');
  log('');
  log('4. Read documentation:', 'cyan');
  log('   PREMIUM_FEATURES_README.md', 'reset');
  log('');
  
  log('🎉 Enjoy your premium features!', 'green');
}

// Run the installation
main().catch(error => {
  log(`\n❌ Installation failed: ${error.message}`, 'red');
  process.exit(1);
});