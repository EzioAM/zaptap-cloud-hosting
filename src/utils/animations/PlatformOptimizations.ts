/**
 * Platform-specific animation optimizations
 */

import { Platform, NativeModules, Animated } from 'react-native';
import { EventLogger } from '../EventLogger';

// iOS-specific optimizations
export class IOSOptimizations {
  static enableCADisplayLink(): void {
    if (Platform.OS !== 'ios') return;
    
    // Enable CADisplayLink for 60fps animations
    try {
      const { UIManager } = NativeModules;
      if (UIManager?.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    } catch (error) {
      EventLogger.warn('PlatformOptimizations', 'Failed to enable CADisplayLink:', error);
    }
  }

  static configureSpringAnimation(config: any): any {
    return {
      ...config,
      // iOS-specific spring parameters
      stiffness: config.tension || 100,
      damping: config.friction || 10,
      mass: config.mass || 1,
      initialVelocity: config.velocity || 0,
      overshootClamping: false,
      restDisplacementThreshold: 0.001,
      restSpeedThreshold: 0.001,
    };
  }

  static enableRasterization(style: any): any {
    return {
      ...style,
      // Enable rasterization for complex views
      shouldRasterizeIOS: true,
      // Render off-screen for better performance
      renderToHardwareTextureAndroid: false,
    };
  }

  static optimizeForProMotion(): any {
    // Optimize for 120Hz ProMotion displays
    return {
      preferredFramesPerSecond: 120,
      useNativeDriver: true,
      // Use higher precision timing
      precision: 0.001,
    };
  }
}

// Android-specific optimizations
export class AndroidOptimizations {
  static enableHardwareAcceleration(): void {
    if (Platform.OS !== 'android') return;
    
    try {
      const { UIManager } = NativeModules;
      if (UIManager?.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    } catch (error) {
      EventLogger.warn('PlatformOptimizations', 'Failed to enable hardware acceleration:', error);
    }
  }

  static optimizeForLowEndDevices(config: any): any {
    const apiLevel = Platform.Version;
    
    if (apiLevel < 21) {
      // Older devices: reduce animation complexity
      return {
        ...config,
        duration: config.duration * 0.6,
        useNativeDriver: true,
        // Disable complex effects
        elevation: 0,
        shadowOpacity: 0,
      };
    } else if (apiLevel < 26) {
      // Mid-range devices: moderate optimizations
      return {
        ...config,
        duration: config.duration * 0.8,
        useNativeDriver: true,
        renderToHardwareTextureAndroid: true,
      };
    }
    
    // Modern devices: full animations
    return {
      ...config,
      useNativeDriver: true,
      renderToHardwareTextureAndroid: true,
      collapsable: false,
    };
  }

  static enableRenderAhead(style: any): any {
    return {
      ...style,
      // Render to hardware texture for better performance
      renderToHardwareTextureAndroid: true,
      // Remove clipped subviews for better memory usage
      removeClippedSubviews: true,
      // Disable collapsing for consistent rendering
      collapsable: false,
    };
  }

  static optimizeListPerformance(): any {
    return {
      // Optimize FlatList/ScrollView performance
      removeClippedSubviews: true,
      maxToRenderPerBatch: 10,
      initialNumToRender: 10,
      windowSize: 10,
      updateCellsBatchingPeriod: 50,
      // Enable memory optimizations
      legacyImplementation: false,
      // Use native driver for scroll events
      scrollEventThrottle: 16,
      directionalLockEnabled: true,
    };
  }
}

// Web-specific optimizations
export class WebOptimizations {
  static useCSSTransitions(
    property: string,
    duration: number,
    easing: string = 'ease-out'
  ): any {
    if (Platform.OS !== 'web') return {};
    
    return {
      transition: `${property} ${duration}ms ${easing}`,
      // Enable GPU acceleration
      transform: 'translateZ(0)',
      willChange: property,
    };
  }

  static enableGPUAcceleration(style: any): any {
    if (Platform.OS !== 'web') return style;
    
    return {
      ...style,
      // Force GPU acceleration
      transform: style.transform ? [...style.transform, { translateZ: 0 }] : [{ translateZ: 0 }],
      backfaceVisibility: 'hidden',
      perspective: 1000,
      // Optimize compositing
      willChange: 'transform, opacity',
    };
  }

  static useRequestAnimationFrame(callback: () => void): number | null {
    if (Platform.OS !== 'web') return null;
    
    return requestAnimationFrame(callback);
  }

  static optimizeForTouch(style: any): any {
    if (Platform.OS !== 'web') return style;
    
    return {
      ...style,
      // Optimize for touch interactions
      touchAction: 'manipulation',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent',
      // Prevent layout thrashing
      contain: 'layout style paint',
    };
  }

  static createCSSKeyframes(name: string, keyframes: any): void {
    if (Platform.OS !== 'web') return;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ${name} {
        ${Object.entries(keyframes).map(([key, value]: [string, any]) => `
          ${key} {
            ${Object.entries(value).map(([prop, val]) => `${prop}: ${val};`).join('\n')}
          }
        `).join('\n')}
      }
    `;
    document.head.appendChild(style);
  }
}

// Unified platform optimizer
export class PlatformOptimizer {
  static optimize(config: any): any {
    switch (Platform.OS) {
      case 'ios':
        return IOSOptimizations.configureSpringAnimation(config);
      case 'android':
        return AndroidOptimizations.optimizeForLowEndDevices(config);
      case 'web':
        return {
          ...config,
          ...WebOptimizations.useCSSTransitions('all', config.duration || 300),
        };
      default:
        return config;
    }
  }

  static optimizeStyle(style: any): any {
    switch (Platform.OS) {
      case 'ios':
        return IOSOptimizations.enableRasterization(style);
      case 'android':
        return AndroidOptimizations.enableRenderAhead(style);
      case 'web':
        return WebOptimizations.enableGPUAcceleration(style);
      default:
        return style;
    }
  }

  static initialize(): void {
    switch (Platform.OS) {
      case 'ios':
        IOSOptimizations.enableCADisplayLink();
        break;
      case 'android':
        AndroidOptimizations.enableHardwareAcceleration();
        break;
      case 'web':
        // Web-specific initialization
        WebOptimizations.createCSSKeyframes('fadeIn', {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        });
        WebOptimizations.createCSSKeyframes('slideIn', {
          '0%': { transform: 'translateY(20px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        });
        break;
    }
  }
}

// Memory-efficient animation pool
export class AnimationPool {
  private pool: Map<string, Animated.Value> = new Map();
  private maxSize: number = 100;

  getValue(key: string, initialValue: number = 0): Animated.Value {
    if (!this.pool.has(key)) {
      if (this.pool.size >= this.maxSize) {
        // Remove oldest entry
        const firstKey = this.pool.keys().next().value;
        this.pool.delete(firstKey);
      }
      this.pool.set(key, new Animated.Value(initialValue));
    }
    return this.pool.get(key)!;
  }

  reset(key: string, value: number = 0): void {
    const animValue = this.pool.get(key);
    if (animValue) {
      animValue.setValue(value);
    }
  }

  clear(): void {
    this.pool.clear();
  }
}

// Export singleton instances
export const animationPool = new AnimationPool();

// Initialize platform optimizations
PlatformOptimizer.initialize();