import { Platform } from 'react-native';

/**
 * Platform detection utilities for handling Expo Go limitations
 */
export const PlatformUtils = {
  /**
   * Check if running in Expo Go
   */
  isExpoGo(): boolean {
    return __DEV__ && Platform.OS !== 'web';
  },

  /**
   * Check if native modules are available
   */
  areNativeModulesAvailable(): boolean {
    // In Expo Go, many native modules are not available
    // This is a simple heuristic - in production you might check specific modules
    return !this.isExpoGo();
  },

  /**
   * Check if NFC is supported
   */
  isNFCSupported(): boolean {
    try {
      // Try to access NFC manager to see if it's available
      require('react-native-nfc-manager');
      return this.areNativeModulesAvailable();
    } catch {
      return false;
    }
  },

  /**
   * Check if vector icons are supported
   */
  areVectorIconsSupported(): boolean {
    try {
      require('@expo/vector-icons/MaterialCommunityIcons');
      return this.areNativeModulesAvailable();
    } catch {
      return false;
    }
  },

  /**
   * Get platform-specific component or fallback
   */
  getComponent<T>(nativeComponent: T, fallbackComponent: T): T {
    return this.areNativeModulesAvailable() ? nativeComponent : fallbackComponent;
  }
};

