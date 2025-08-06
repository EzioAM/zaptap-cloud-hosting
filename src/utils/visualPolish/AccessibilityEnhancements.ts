/**
 * Accessibility Enhancements for Visual Polish System
 * Ensures all animations and effects respect user preferences and accessibility needs
 */

import { Animated, AccessibilityInfo, Platform } from 'react-native';
import { MotionDesignSystem, MotionTokens } from './MotionDesignSystem';
import { AnimationSystem } from './AnimationSystem';
import { EventLogger } from '../EventLogger';

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  reduceTransparency: boolean;
  increasedTextSize: boolean;
  preferredColorScheme: 'light' | 'dark' | 'auto';
  screenReader: boolean;
}

// Accessibility-aware animation configurations
export const AccessibleMotionConfigs = {
  // Reduced motion variants
  reduceMotion: {
    duration: MotionTokens.duration.fast,
    easing: MotionTokens.easing.standard,
    scale: 1, // No scale animations
    rotation: 0, // No rotation animations
    stagger: 0, // No staggered animations
  },

  // High contrast variants
  highContrast: {
    borderWidth: 2,
    shadowOpacity: 0.8,
    contrastRatio: 7, // WCAG AAA compliance
  },

  // Screen reader optimized
  screenReader: {
    duration: 0, // Instant transitions
    announcements: true,
    skipDecorative: true,
  },
};

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private preferences: AccessibilityPreferences = {
    reduceMotion: false,
    highContrast: false,
    reduceTransparency: false,
    increasedTextSize: false,
    preferredColorScheme: 'auto',
    screenReader: false,
  };
  private listeners: Array<(preferences: AccessibilityPreferences) => void> = [];
  private motionSystem = MotionDesignSystem.getInstance();

  public static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  constructor() {
    this.initializeAccessibilityListeners();
  }

  private async initializeAccessibilityListeners(): Promise<void> {
    try {
      // Check initial accessibility states
      const [
        reduceMotion,
        screenReader,
        highContrast,
        reduceTransparency,
      ] = await Promise.all([
        this.isReduceMotionEnabled(),
        AccessibilityInfo.isScreenReaderEnabled(),
        this.isHighContrastEnabled(),
        this.isReduceTransparencyEnabled(),
      ]);

      this.preferences = {
        ...this.preferences,
        reduceMotion,
        screenReader,
        highContrast,
        reduceTransparency,
      };

      // Set up listeners for changes
      AccessibilityInfo.addEventListener('reduceMotionChanged', this.handleReduceMotionChange);
      AccessibilityInfo.addEventListener('screenReaderChanged', this.handleScreenReaderChange);
      
      if (Platform.OS === 'ios') {
        // iOS-specific accessibility listeners
        AccessibilityInfo.addEventListener('boldTextChanged', this.handleBoldTextChange);
        AccessibilityInfo.addEventListener('grayscaleChanged', this.handleGrayscaleChange);
        AccessibilityInfo.addEventListener('invertColorsChanged', this.handleInvertColorsChange);
        AccessibilityInfo.addEventListener('reduceTransparencyChanged', this.handleReduceTransparencyChange);
      }

      // Configure motion system based on preferences
      this.motionSystem.setReducedMotionPreference(this.preferences.reduceMotion);

      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      EventLogger.warn('AccessibilityEnhancements', '[AccessibilityManager] Failed to initialize:', error);
    }
  }

  private async isReduceMotionEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isReduceMotionEnabled();
    } catch {
      return false;
    }
  }

  private async isHighContrastEnabled(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS doesn't have a direct API, but we can infer from other settings
        const [grayscale, invertColors] = await Promise.all([
          AccessibilityInfo.isGrayscaleEnabled?.() ?? false,
          AccessibilityInfo.isInvertColorsEnabled?.() ?? false,
        ]);
        return grayscale || invertColors;
      }
      return false;
    } catch {
      return false;
    }
  }

  private async isReduceTransparencyEnabled(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        return await AccessibilityInfo.isReduceTransparencyEnabled?.() ?? false;
      }
      return false;
    } catch {
      return false;
    }
  }

  private handleReduceMotionChange = (isEnabled: boolean) => {
    this.preferences.reduceMotion = isEnabled;
    this.motionSystem.setReducedMotionPreference(isEnabled);
    this.notifyListeners();
  };

  private handleScreenReaderChange = (isEnabled: boolean) => {
    this.preferences.screenReader = isEnabled;
    this.notifyListeners();
  };

  private handleBoldTextChange = (isEnabled: boolean) => {
    this.preferences.increasedTextSize = isEnabled;
    this.notifyListeners();
  };

  private handleGrayscaleChange = (isEnabled: boolean) => {
    this.preferences.highContrast = isEnabled;
    this.notifyListeners();
  };

  private handleInvertColorsChange = (isEnabled: boolean) => {
    this.preferences.highContrast = isEnabled;
    this.notifyListeners();
  };

  private handleReduceTransparencyChange = (isEnabled: boolean) => {
    this.preferences.reduceTransparency = isEnabled;
    this.notifyListeners();
  };

  // Public API
  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences };
  }

  addListener(listener: (preferences: AccessibilityPreferences) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.preferences);
      } catch (error) {
        EventLogger.warn('AccessibilityEnhancements', '[AccessibilityManager] Error in listener:', error);
      }
    });
  }

  // Animation helpers that respect accessibility preferences
  createAccessibleAnimation(
    value: Animated.Value,
    toValue: number,
    config: {
      duration?: number;
      easing?: (value: number) => number;
      useNativeDriver?: boolean;
    } = {}
  ): Animated.CompositeAnimation {
    if (this.preferences.reduceMotion) {
      // Use instant or very quick animations
      return AnimationSystem.createTiming(value, toValue, {
        duration: this.preferences.screenReader ? 0 : AccessibleMotionConfigs.reduceMotion.duration,
        easing: AccessibleMotionConfigs.reduceMotion.easing,
        useNativeDriver: config.useNativeDriver !== false,
      });
    }

    return AnimationSystem.createTiming(value, toValue, config);
  }

  createAccessibleSpringAnimation(
    value: Animated.Value,
    toValue: number,
    config: any = {}
  ): Animated.CompositeAnimation {
    if (this.preferences.reduceMotion) {
      // Convert spring to timing for reduced motion
      return this.createAccessibleAnimation(value, toValue, {
        duration: AccessibleMotionConfigs.reduceMotion.duration,
        easing: AccessibleMotionConfigs.reduceMotion.easing,
      });
    }

    return AnimationSystem.createSpring(value, toValue, config);
  }

  getAccessibleStyles(baseStyles: any): any {
    let styles = { ...baseStyles };

    if (this.preferences.highContrast) {
      styles = {
        ...styles,
        borderWidth: Math.max(styles.borderWidth || 0, AccessibleMotionConfigs.highContrast.borderWidth),
        shadowOpacity: AccessibleMotionConfigs.highContrast.shadowOpacity,
      };
    }

    if (this.preferences.reduceTransparency) {
      styles = {
        ...styles,
        backgroundColor: this.makeOpaque(styles.backgroundColor),
        opacity: 1,
      };
    }

    return styles;
  }

  private makeOpaque(color: string): string {
    if (!color) return color;
    
    // Simple opacity removal for common formats
    if (color.includes('rgba')) {
      return color.replace(/rgba\(([^)]+)\)/, (match, values) => {
        const [r, g, b] = values.split(',').slice(0, 3);
        return `rgb(${r.trim()},${g.trim()},${b.trim()})`;
      });
    }
    
    return color;
  }

  // Screen reader announcements
  announceForAccessibility(message: string, priority: 'low' | 'high' = 'low'): void {
    if (this.preferences.screenReader) {
      AccessibilityInfo.announceForAccessibility(message);
      
      // Log for debugging
      EventLogger.debug('AccessibilityEnhancements', '[A11Y Announcement ${priority}]: ${message}');
    }
  }

  // Focus management
  setAccessibilityFocus(ref: any): void {
    if (this.preferences.screenReader && ref?.current) {
      AccessibilityInfo.setAccessibilityFocus(ref.current);
    }
  }

  // Accessible animation shortcuts
  fadeIn(
    value: Animated.Value,
    duration?: number,
    onComplete?: () => void
  ): void {
    const animation = this.createAccessibleAnimation(value, 1, {
      duration: duration || MotionTokens.duration.medium,
    });

    animation.start(() => {
      onComplete?.();
      if (this.preferences.screenReader) {
        this.announceForAccessibility('Content appeared');
      }
    });
  }

  fadeOut(
    value: Animated.Value,
    duration?: number,
    onComplete?: () => void
  ): void {
    const animation = this.createAccessibleAnimation(value, 0, {
      duration: duration || MotionTokens.duration.medium,
    });

    animation.start(() => {
      onComplete?.();
      if (this.preferences.screenReader) {
        this.announceForAccessibility('Content hidden');
      }
    });
  }

  slideIn(
    value: Animated.Value,
    direction: 'up' | 'down' | 'left' | 'right' = 'up',
    onComplete?: () => void
  ): void {
    const animation = this.createAccessibleSpringAnimation(value, 0);

    animation.start(() => {
      onComplete?.();
      if (this.preferences.screenReader) {
        this.announceForAccessibility(`Content slid in from ${direction}`);
      }
    });
  }

  // Validate color contrast
  checkColorContrast(
    foregroundColor: string,
    backgroundColor: string
  ): {
    ratio: number;
    passAA: boolean;
    passAAA: boolean;
  } {
    // Simplified contrast calculation
    const getLuminance = (color: string): number => {
      // This is a simplified version - in production, use a proper color library
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16) / 255;
      const g = parseInt(hex.substr(2, 2), 16) / 255;
      const b = parseInt(hex.substr(4, 2), 16) / 255;

      const getLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      
      return 0.2126 * getLinear(r) + 0.7152 * getLinear(g) + 0.0722 * getLinear(b);
    };

    const l1 = getLuminance(foregroundColor);
    const l2 = getLuminance(backgroundColor);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
      ratio,
      passAA: ratio >= 4.5,
      passAAA: ratio >= 7,
    };
  }

  // Get accessible text size multiplier
  getTextSizeMultiplier(): number {
    if (this.preferences.increasedTextSize) {
      return 1.2; // 20% larger text
    }
    return 1;
  }

  // Clean up
  dispose(): void {
    AccessibilityInfo.removeEventListener?.('reduceMotionChanged', this.handleReduceMotionChange);
    AccessibilityInfo.removeEventListener?.('screenReaderChanged', this.handleScreenReaderChange);
    
    if (Platform.OS === 'ios') {
      AccessibilityInfo.removeEventListener?.('boldTextChanged', this.handleBoldTextChange);
      AccessibilityInfo.removeEventListener?.('grayscaleChanged', this.handleGrayscaleChange);
      AccessibilityInfo.removeEventListener?.('invertColorsChanged', this.handleInvertColorsChange);
      AccessibilityInfo.removeEventListener?.('reduceTransparencyChanged', this.handleReduceTransparencyChange);
    }
    
    this.listeners.length = 0;
  }
}

// Helper hook for React components
export const useAccessibility = () => {
  const [preferences, setPreferences] = React.useState<AccessibilityPreferences>(
    AccessibilityManager.getInstance().getPreferences()
  );

  React.useEffect(() => {
    const manager = AccessibilityManager.getInstance();
    const unsubscribe = manager.addListener(setPreferences);
    
    return unsubscribe;
  }, []);

  return {
    preferences,
    manager: AccessibilityManager.getInstance(),
    
    // Convenience methods
    shouldReduceMotion: preferences.reduceMotion,
    shouldUseHighContrast: preferences.highContrast,
    shouldReduceTransparency: preferences.reduceTransparency,
    isScreenReaderActive: preferences.screenReader,
    textSizeMultiplier: preferences.increasedTextSize ? 1.2 : 1,
  };
};

export default AccessibilityManager;