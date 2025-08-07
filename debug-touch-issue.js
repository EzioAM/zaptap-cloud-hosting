// Quick diagnostic script to check touch functionality
// Run this in the React Native debugger console

console.log('🔍 Starting touch diagnostics...');

// Check if we're in the right environment
console.log('📱 Environment check:');
console.log('- React Native version:', require('react-native').version);
console.log('- Platform:', require('react-native').Platform.OS);
console.log('- Device dimensions:', require('react-native').Dimensions.get('window'));

// Test basic touch event creation
try {
  const testTouchEvent = {
    nativeEvent: {
      locationX: 100,
      locationY: 100,
      timestamp: Date.now()
    }
  };
  console.log('✅ Touch event structure test passed:', testTouchEvent);
} catch (error) {
  console.error('❌ Touch event structure test failed:', error);
}

// Check if TouchableOpacity is available
try {
  const TouchableOpacity = require('react-native').TouchableOpacity;
  console.log('✅ TouchableOpacity is available:', TouchableOpacity != null);
} catch (error) {
  console.error('❌ TouchableOpacity import failed:', error);
}

// Check if Pressable is available
try {
  const Pressable = require('react-native').Pressable;
  console.log('✅ Pressable is available:', Pressable != null);
} catch (error) {
  console.error('❌ Pressable import failed:', error);
}

// Check if gesture handling is available
try {
  const GestureHandlerRootView = require('react-native-gesture-handler').GestureHandlerRootView;
  console.log('✅ GestureHandler is available:', GestureHandlerRootView != null);
} catch (error) {
  console.log('⚠️ GestureHandler not available (this may be normal):', error.message);
}

// Test if we can access the document/window (shouldn't be available in RN)
console.log('📋 Web API availability check:');
console.log('- document available:', typeof document !== 'undefined');
console.log('- window available:', typeof window !== 'undefined');
console.log('- EventTarget available:', typeof EventTarget !== 'undefined');

// Check for common React Native debugging tools
console.log('🛠 Debugging tools check:');
console.log('- __DEV__ flag:', __DEV__);
console.log('- Remote debugging:', typeof DedicatedWorkerGlobalScope !== 'undefined');

console.log('🔍 Touch diagnostics complete!');
console.log('📱 If touches aren\'t working, look for errors above or check the simulator.');