// CRITICAL: Install ErrorUtils polyfill IMMEDIATELY - before ANY imports
// This fixes "Cannot read property 'setGlobalHandler' of undefined" in RN 0.79.5 + Expo SDK 53
if (typeof global.ErrorUtils === 'undefined') {
  global.ErrorUtils = {
    setGlobalHandler: (handler) => {
      global.__globalErrorHandler = handler;
    },
    getGlobalHandler: () => global.__globalErrorHandler || (() => {}),
    reportFatalError: (error) => {
      if (global.__globalErrorHandler) {
        global.__globalErrorHandler(error, true);
      } else {
        console.error('[FATAL ERROR]', error);
      }
    },
    reportError: (error) => {
      if (global.__globalErrorHandler) {
        global.__globalErrorHandler(error, false);
      } else {
        console.error('[ERROR]', error);
      }
    }
  };
  console.log('[ErrorUtils] Early polyfill installed for Expo SDK 53 compatibility');
}

// Load additional polyfill for comprehensive coverage
// require('./ErrorUtils.polyfill.js'); // Disabled - using inline polyfill above

// Initialize Reanimated with explicit configuration
import { LogBox } from 'react-native';

// Import and configure Reanimated FIRST
import 'react-native-reanimated';

// Then import gesture handler
import 'react-native-gesture-handler';

// Suppress Reanimated warnings during initialization
LogBox.ignoreLogs(['Reanimated']);

// Temporarily disable expo-dev-client to avoid ErrorUtils issues
// import 'expo-dev-client';
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);