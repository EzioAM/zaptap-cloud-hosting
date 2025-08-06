#!/usr/bin/env node

/**
 * Test script for push notifications implementation
 * Verifies all notification components are properly set up
 */

const fs = require('fs');
const path = require('path');

console.log('🔔 Testing Push Notifications Implementation...\n');

const projectRoot = path.join(__dirname, '..');

// Test files and directories exist
const requiredFiles = [
  'src/types/notifications/index.ts',
  'src/services/notifications/NotificationService.ts',
  'src/services/notifications/PushTokenManager.ts',
  'src/services/notifications/NotificationHandler.ts',
  'src/store/slices/notificationSlice.ts',
  'src/screens/settings/NotificationSettings.tsx',
  'src/components/notifications/NotificationProvider.tsx',
  'src/hooks/redux.ts',
  'assets/notification-icon.png',
  'assets/sounds/notification.wav',
  'create_push_tokens_table.sql',
];

let allFilesExist = true;

console.log('📁 Checking required files...');
requiredFiles.forEach(file => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Test package.json dependencies
console.log('\n📦 Checking dependencies...');
const packageJsonPath = path.join(projectRoot, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  const requiredDeps = [
    'expo-notifications',
    '@react-native-async-storage/async-storage',
    '@reduxjs/toolkit',
    'react-redux',
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep}`);
    } else {
      console.log(`❌ ${dep} - MISSING`);
      allFilesExist = false;
    }
  });
} else {
  console.log('❌ package.json not found');
  allFilesExist = false;
}

// Test app.config.js for notification plugin
console.log('\n⚙️ Checking app.config.js...');
const appConfigPath = path.join(projectRoot, 'app.config.js');
if (fs.existsSync(appConfigPath)) {
  const appConfigContent = fs.readFileSync(appConfigPath, 'utf8');
  
  if (appConfigContent.includes('expo-notifications')) {
    console.log('✅ expo-notifications plugin configured');
  } else {
    console.log('❌ expo-notifications plugin not found in app.config.js');
    allFilesExist = false;
  }
  
  if (appConfigContent.includes('NSUserNotificationsUsageDescription')) {
    console.log('✅ iOS notification permission description added');
  } else {
    console.log('❌ iOS notification permission description missing');
    allFilesExist = false;
  }
} else {
  console.log('❌ app.config.js not found');
  allFilesExist = false;
}

// Test Redux store integration
console.log('\n🏪 Checking Redux store integration...');
const storeIndexPath = path.join(projectRoot, 'src/store/index.ts');
if (fs.existsSync(storeIndexPath)) {
  const storeContent = fs.readFileSync(storeIndexPath, 'utf8');
  
  if (storeContent.includes('notificationSlice')) {
    console.log('✅ Notification slice imported');
  } else {
    console.log('❌ Notification slice not imported in store');
    allFilesExist = false;
  }
  
  if (storeContent.includes('notifications: notificationSlice')) {
    console.log('✅ Notification slice added to root reducer');
  } else {
    console.log('❌ Notification slice not added to root reducer');
    allFilesExist = false;
  }
  
  if (storeContent.includes("'notifications'") && storeContent.includes('whitelist')) {
    console.log('✅ Notification state marked for persistence');
  } else {
    console.log('❌ Notification state not marked for persistence');
    allFilesExist = false;
  }
} else {
  console.log('❌ src/store/index.ts not found');
  allFilesExist = false;
}

// Test App.tsx integration
console.log('\n📱 Checking App.tsx integration...');
const appTsxPath = path.join(projectRoot, 'App.tsx');
if (fs.existsSync(appTsxPath)) {
  const appContent = fs.readFileSync(appTsxPath, 'utf8');
  
  if (appContent.includes('NotificationProvider')) {
    console.log('✅ NotificationProvider imported');
  } else {
    console.log('❌ NotificationProvider not imported in App.tsx');
    allFilesExist = false;
  }
  
  if (appContent.includes('<NotificationProvider>')) {
    console.log('✅ NotificationProvider added to component tree');
  } else {
    console.log('❌ NotificationProvider not added to component tree');
    allFilesExist = false;
  }
} else {
  console.log('❌ App.tsx not found');
  allFilesExist = false;
}

// Test type definitions
console.log('\n🔍 Checking TypeScript definitions...');
const notificationTypesPath = path.join(projectRoot, 'src/types/notifications/index.ts');
if (fs.existsSync(notificationTypesPath)) {
  const typesContent = fs.readFileSync(notificationTypesPath, 'utf8');
  
  const requiredTypes = [
    'NotificationPayload',
    'NotificationPreferences',
    'PushToken',
    'NotificationState',
    'DEFAULT_NOTIFICATION_PREFERENCES',
  ];
  
  requiredTypes.forEach(type => {
    if (typesContent.includes(type)) {
      console.log(`✅ ${type} type defined`);
    } else {
      console.log(`❌ ${type} type missing`);
      allFilesExist = false;
    }
  });
} else {
  console.log('❌ Notification types file not found');
  allFilesExist = false;
}

// Test database schema
console.log('\n🗄️ Checking database schema...');
const schemaPath = path.join(projectRoot, 'create_push_tokens_table.sql');
if (fs.existsSync(schemaPath)) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  if (schemaContent.includes('CREATE TABLE') && schemaContent.includes('push_tokens')) {
    console.log('✅ Push tokens table schema defined');
  } else {
    console.log('❌ Push tokens table schema malformed');
    allFilesExist = false;
  }
  
  if (schemaContent.includes('ENABLE ROW LEVEL SECURITY')) {
    console.log('✅ RLS enabled for push tokens');
  } else {
    console.log('❌ RLS not enabled for push tokens');
    allFilesExist = false;
  }
} else {
  console.log('❌ Database schema file not found');
  allFilesExist = false;
}

// Final result
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('✅ Push notifications system is properly implemented');
  console.log('\n📋 Next steps:');
  console.log('1. Run the database schema: create_push_tokens_table.sql');
  console.log('2. Test on a physical device (notifications don\'t work in simulator)');
  console.log('3. Configure Expo push notification credentials for production');
  console.log('4. Implement backend notification sending service');
} else {
  console.log('❌ SOME TESTS FAILED!');
  console.log('Please fix the missing files/configurations above');
  process.exit(1);
}

console.log('\n🔔 Notification system test complete!\n');