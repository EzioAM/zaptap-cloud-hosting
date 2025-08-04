// Emergency debug script - run this if app still hangs
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearAllStorage = async () => {
  try {
    console.log('Clearing all AsyncStorage...');
    await AsyncStorage.clear();
    console.log('✅ Storage cleared');
  } catch (error) {
    console.error('❌ Failed to clear storage:', error);
  }
};

// Run this in your app's console or add it to App.tsx temporarily
clearAllStorage();