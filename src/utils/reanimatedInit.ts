// Reanimated initialization and polyfill
// This file ensures Reanimated is properly initialized before use

// Import Reanimated first
import 'react-native-reanimated';

// Ensure global is available
if (typeof global === 'undefined') {
  (window as any).global = window;
}

// Initialize Reanimated with error handling
try {
  const Reanimated = require('react-native-reanimated');
  
  // Check if Reanimated exports are available
  if (Reanimated) {
    // Ensure critical functions exist
    const requiredFunctions = [
      'useSharedValue',
      'useAnimatedStyle',
      'withTiming',
      'withSpring',
      'runOnJS',
      'runOnUI'
    ];
    
    let missingFunctions = [];
    for (const func of requiredFunctions) {
      if (!Reanimated[func]) {
        missingFunctions.push(func);
      }
    }
    
    if (missingFunctions.length > 0) {
      console.warn('⚠️ Reanimated missing functions:', missingFunctions);
      
      // Provide basic polyfills for missing functions
      if (!Reanimated.makeMutable) {
        Reanimated.makeMutable = (value: any) => ({ value });
      }
      
      if (!Reanimated.useSharedValue) {
        Reanimated.useSharedValue = (value: any) => ({ value });
      }
      
      if (!Reanimated.useAnimatedStyle) {
        Reanimated.useAnimatedStyle = (fn: any) => fn();
      }
      
      if (!Reanimated.withTiming) {
        Reanimated.withTiming = (value: any) => value;
      }
      
      if (!Reanimated.withSpring) {
        Reanimated.withSpring = (value: any) => value;
      }
      
      if (!Reanimated.runOnJS) {
        Reanimated.runOnJS = (fn: any) => fn;
      }
      
      if (!Reanimated.runOnUI) {
        Reanimated.runOnUI = (fn: any) => fn;
      }
    } else {
      console.log('✅ Reanimated initialized with all required functions');
    }
    
    // Check for makeMutable specifically (often missing)
    if (!Reanimated.makeMutable && Reanimated.useSharedValue) {
      Reanimated.makeMutable = (value: any) => {
        // Use a ref-like object that mimics shared value behavior
        return { value };
      };
      console.log('✅ Added makeMutable polyfill');
    }
  }
} catch (error) {
  console.error('❌ Failed to initialize Reanimated:', error);
  
  // Provide minimal fallback to prevent crashes
  const Reanimated = require('react-native-reanimated');
  if (Reanimated) {
    // Emergency fallbacks
    Reanimated.default = Reanimated.default || {};
    const fallback = Reanimated.default;
    
    fallback.View = require('react-native').View;
    fallback.Text = require('react-native').Text;
    fallback.ScrollView = require('react-native').ScrollView;
    
    // Basic function fallbacks
    Reanimated.useSharedValue = Reanimated.useSharedValue || ((v: any) => ({ value: v }));
    Reanimated.useAnimatedStyle = Reanimated.useAnimatedStyle || ((fn: any) => ({}));
    Reanimated.withTiming = Reanimated.withTiming || ((v: any) => v);
    Reanimated.withSpring = Reanimated.withSpring || ((v: any) => v);
  }
}

export default true;