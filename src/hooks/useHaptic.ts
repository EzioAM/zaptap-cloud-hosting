import { useCallback } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePlatform } from './usePlatform';
import { EventLogger } from '../utils/EventLogger';

export type HapticFeedbackType = 
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

export type HapticIntensity = 'light' | 'medium' | 'heavy';

interface HapticConfig {
  enabled?: boolean;
  intensity?: HapticIntensity;
  webFallback?: 'visual' | 'audio' | 'none';
}

// Web fallback functions
const webVibrate = (pattern: number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

const webVisualFeedback = () => {
  // Could implement visual feedback like a brief opacity change or scale
  // For now, we'll just trigger a subtle vibration if available
  webVibrate([10]);
};

const webAudioFeedback = (type: HapticFeedbackType) => {
  // Could play system sounds or create audio context beeps
  // For now, use vibration as fallback
  const patterns = {
    light: [5],
    medium: [10],
    heavy: [15],
    success: [10, 50, 10],
    warning: [20, 50, 20, 50, 20],
    error: [50, 50, 50],
    selection: [3],
  };
  webVibrate(patterns[type] || [5]);
};

export const useHaptic = (config: HapticConfig = {}) => {
  const platform = usePlatform();
  const {
    enabled = true,
    intensity = 'medium',
    webFallback = 'visual',
  } = config;

  const trigger = useCallback(async (type: HapticFeedbackType = 'light') => {
    if (!enabled) return;

    // Native mobile haptics
    if (platform.supportsHaptics) {
      try {
        switch (type) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
          case 'success':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'warning':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          case 'error':
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'selection':
            await Haptics.selectionAsync();
            break;
          default:
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch (error) {
        // Silently fail if haptics are not available
        EventLogger.warn('useHaptic', 'Haptic feedback failed:', error);
      }
    }
    // Web fallbacks
    else if (platform.isWeb && webFallback !== 'none') {
      if (webFallback === 'visual') {
        webVisualFeedback();
      } else if (webFallback === 'audio') {
        webAudioFeedback(type);
      }
    }
  }, [enabled, platform, webFallback]);

  const isAvailable = platform.supportsHaptics || (platform.isWeb && webFallback !== 'none');

  // Convenience methods for common patterns
  const impact = useCallback((intensity: HapticIntensity = 'medium') => {
    trigger(intensity);
  }, [trigger]);

  const notification = useCallback((type: 'success' | 'warning' | 'error') => {
    trigger(type);
  }, [trigger]);

  const selection = useCallback(() => {
    trigger('selection');
  }, [trigger]);

  return {
    trigger,
    impact,
    notification,
    selection,
    isAvailable,
    config: {
      enabled,
      intensity,
      webFallback,
      platform: platform.isIOS ? 'ios' : platform.isAndroid ? 'android' : 'web',
    },
  };
};