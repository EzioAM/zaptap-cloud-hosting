/**
 * Performance-Optimized Animation Controller
 * Central animation management with platform-specific optimizations
 */

import {
  Animated,
  Platform,
  InteractionManager,
  AccessibilityInfo,
  NativeModules,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSharedValue, withSpring, withTiming, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';
import { EventLogger } from '../EventLogger';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  HIGH_END: { fps: 55, memory: 80 },
  MID_RANGE: { fps: 45, memory: 60 },
  LOW_END: { fps: 30, memory: 40 },
};

// Animation presets with performance variants
export const AnimationPresets = {
  fast: {
    duration: 200,
    tension: 400,
    friction: 20,
    useNativeDriver: true,
  },
  normal: {
    duration: 300,
    tension: 200,
    friction: 15,
    useNativeDriver: true,
  },
  slow: {
    duration: 500,
    tension: 100,
    friction: 10,
    useNativeDriver: true,
  },
  smooth: {
    duration: 400,
    tension: 150,
    friction: 12,
    useNativeDriver: true,
  },
};

// Platform-specific configurations
const PLATFORM_CONFIG = {
  ios: {
    useCADisplayLink: true,
    preferNativeDriver: true,
    springDamping: 0.8,
    springVelocity: 0.5,
    allowsHitTesting: true,
  },
  android: {
    useNativeDriver: true,
    renderToHardwareTextureAndroid: true,
    collapsable: false,
    removeClippedSubviews: true,
  },
  web: {
    useCSSTransitions: true,
    useRequestAnimationFrame: true,
    preferTransform3d: true,
  },
};

// Device performance classification
export enum DevicePerformance {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

// Animation metrics tracking
interface AnimationMetrics {
  fps: number;
  frameDrops: number;
  averageFrameTime: number;
  jankFrames: number;
  totalAnimations: number;
}

// Animation cache for repeated animations
class AnimationCache {
  private cache: Map<string, Animated.CompositeAnimation> = new Map();
  private maxSize: number = 50;

  get(key: string): Animated.CompositeAnimation | undefined {
    return this.cache.get(key);
  }

  set(key: string, animation: Animated.CompositeAnimation): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, animation);
  }

  clear(): void {
    this.cache.clear();
  }
}

// FPS Monitor for performance tracking
class FPSMonitor {
  private frameCount: number = 0;
  private lastTime: number = Date.now();
  private fps: number = 60;
  private frameDrops: number = 0;
  private jankFrames: number = 0;
  private rafId: number | null = null;
  private isMonitoring: boolean = false;

  start(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.frameCount = 0;
    this.frameDrops = 0;
    this.jankFrames = 0;
    this.lastTime = Date.now();
    this.monitor();
  }

  stop(): void {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private monitor = (): void => {
    if (!this.isMonitoring) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastTime;
    
    this.frameCount++;

    // Check for frame drops (> 16.67ms for 60fps)
    if (deltaTime > 16.67) {
      this.frameDrops++;
      
      // Check for jank (> 50ms)
      if (deltaTime > 50) {
        this.jankFrames++;
      }
    }

    // Calculate FPS every second
    if (this.frameCount >= 60) {
      const elapsedTime = (currentTime - this.lastTime) / 1000;
      this.fps = Math.round(this.frameCount / elapsedTime);
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    this.rafId = requestAnimationFrame(this.monitor);
  };

  getMetrics(): { fps: number; frameDrops: number; jankFrames: number } {
    return {
      fps: this.fps,
      frameDrops: this.frameDrops,
      jankFrames: this.jankFrames,
    };
  }
}

// Main Animation Controller
export class AnimationController {
  private static instance: AnimationController;
  private devicePerformance: DevicePerformance = DevicePerformance.MEDIUM;
  private reducedMotion: boolean = false;
  private animationCache: AnimationCache = new AnimationCache();
  private fpsMonitor: FPSMonitor = new FPSMonitor();
  private metrics: AnimationMetrics = {
    fps: 60,
    frameDrops: 0,
    averageFrameTime: 16.67,
    jankFrames: 0,
    totalAnimations: 0,
  };
  private batchedAnimations: Animated.CompositeAnimation[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): AnimationController {
    if (!AnimationController.instance) {
      AnimationController.instance = new AnimationController();
    }
    return AnimationController.instance;
  }

  private async initialize(): Promise<void> {
    // Check for reduced motion preference
    try {
      this.reducedMotion = await AccessibilityInfo.isReduceMotionEnabled();
      
      // Listen for reduced motion changes
      AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled) => {
        this.reducedMotion = isEnabled;
      });
    } catch (error) {
      EventLogger.warn('AnimationController', 'Failed to check reduced motion preference:', error);
    }

    // Detect device performance
    this.detectDevicePerformance();

    // Start FPS monitoring in development
    if (__DEV__) {
      this.fpsMonitor.start();
      this.startMetricsCollection();
    }
  }

  private detectDevicePerformance(): void {
    // Simple heuristic based on platform and available memory
    if (Platform.OS === 'ios') {
      // iOS devices generally have good performance
      this.devicePerformance = DevicePerformance.HIGH;
    } else if (Platform.OS === 'android') {
      // Check Android API level and RAM
      const apiLevel = Platform.Version;
      if (apiLevel >= 28) {
        this.devicePerformance = DevicePerformance.HIGH;
      } else if (apiLevel >= 23) {
        this.devicePerformance = DevicePerformance.MEDIUM;
      } else {
        this.devicePerformance = DevicePerformance.LOW;
      }
    } else {
      // Web platform
      this.devicePerformance = DevicePerformance.HIGH;
    }
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      const fpsMetrics = this.fpsMonitor.getMetrics();
      this.metrics = {
        ...this.metrics,
        fps: fpsMetrics.fps,
        frameDrops: fpsMetrics.frameDrops,
        jankFrames: fpsMetrics.jankFrames,
        averageFrameTime: 1000 / fpsMetrics.fps,
      };

      // Adjust performance level based on metrics
      if (fpsMetrics.fps < 30) {
        this.devicePerformance = DevicePerformance.LOW;
      } else if (fpsMetrics.fps < 50) {
        this.devicePerformance = DevicePerformance.MEDIUM;
      }
    }, 1000);
  }

  // Get adjusted animation config based on device performance
  private getAdjustedConfig(baseConfig: any): any {
    if (this.reducedMotion) {
      return {
        ...baseConfig,
        duration: 0,
        delay: 0,
        useNativeDriver: true,
      };
    }

    switch (this.devicePerformance) {
      case DevicePerformance.LOW:
        return {
          ...baseConfig,
          duration: baseConfig.duration * 0.7,
          useNativeDriver: true,
          // Disable complex animations
          tension: baseConfig.tension * 1.5,
          friction: baseConfig.friction * 1.5,
        };
      case DevicePerformance.MEDIUM:
        return {
          ...baseConfig,
          duration: baseConfig.duration * 0.9,
          useNativeDriver: true,
        };
      case DevicePerformance.HIGH:
      default:
        return baseConfig;
    }
  }

  // Create optimized spring animation
  createSpring(
    value: Animated.Value,
    toValue: number,
    config: any = AnimationPresets.normal
  ): Animated.CompositeAnimation {
    const adjustedConfig = this.getAdjustedConfig(config);
    
    // Check cache
    const cacheKey = `spring_${toValue}_${JSON.stringify(adjustedConfig)}`;
    const cached = this.animationCache.get(cacheKey);
    if (cached) return cached;

    const animation = Animated.spring(value, {
      toValue,
      ...adjustedConfig,
      useNativeDriver: adjustedConfig.useNativeDriver ?? true,
      // Platform-specific optimizations
      ...(Platform.OS === 'ios' && {
        stiffness: adjustedConfig.tension,
        damping: adjustedConfig.friction,
        mass: 1,
      }),
    });

    this.animationCache.set(cacheKey, animation);
    this.metrics.totalAnimations++;

    return animation;
  }

  // Create optimized timing animation
  createTiming(
    value: Animated.Value,
    toValue: number,
    config: any = {}
  ): Animated.CompositeAnimation {
    const adjustedConfig = this.getAdjustedConfig({
      ...AnimationPresets.normal,
      ...config,
    });

    // Use CSS transitions on web when possible
    if (Platform.OS === 'web' && PLATFORM_CONFIG.web.useCSSTransitions) {
      // Web-specific optimization
      return Animated.timing(value, {
        toValue,
        duration: adjustedConfig.duration,
        useNativeDriver: false, // CSS transitions don't use native driver
        easing: adjustedConfig.easing,
      });
    }

    return Animated.timing(value, {
      toValue,
      ...adjustedConfig,
      useNativeDriver: adjustedConfig.useNativeDriver ?? true,
    });
  }

  // Batch multiple animations for better performance
  batchAnimations(animations: Animated.CompositeAnimation[]): void {
    this.batchedAnimations.push(...animations);
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.executeBatchedAnimations();
    }, 16); // Next frame
  }

  private executeBatchedAnimations(): void {
    if (this.batchedAnimations.length === 0) return;

    InteractionManager.runAfterInteractions(() => {
      Animated.parallel(this.batchedAnimations).start();
      this.batchedAnimations = [];
    });
  }

  // Create stagger animation with performance optimization
  createStagger(
    delay: number,
    animations: Animated.CompositeAnimation[]
  ): Animated.CompositeAnimation {
    // Reduce stagger delay on low-end devices
    const adjustedDelay = this.devicePerformance === DevicePerformance.LOW 
      ? delay * 0.5 
      : delay;

    return Animated.stagger(adjustedDelay, animations);
  }

  // Platform-specific optimization for scroll animations
  createScrollAnimation(
    scrollY: Animated.Value,
    config: {
      inputRange: number[];
      outputRange: number[] | string[];
      extrapolate?: 'clamp' | 'extend' | 'identity';
    }
  ): Animated.AnimatedInterpolation {
    // Use native driver for scroll animations
    const interpolation = scrollY.interpolate({
      ...config,
      extrapolate: config.extrapolate || 'clamp',
    });

    // iOS-specific optimization
    if (Platform.OS === 'ios' && PLATFORM_CONFIG.ios.useCADisplayLink) {
      // Enable CADisplayLink for smoother scrolling
      (interpolation as any).__makeNative?.();
    }

    return interpolation;
  }

  // Layout animation with platform optimization
  configureLayoutAnimation(
    duration: number = 300,
    type: 'spring' | 'linear' | 'easeInEaseOut' = 'spring'
  ): void {
    if (this.reducedMotion) return;

    const config = this.devicePerformance === DevicePerformance.LOW
      ? LayoutAnimation.Presets.linear
      : type === 'spring' 
        ? LayoutAnimation.Presets.spring
        : type === 'linear'
        ? LayoutAnimation.Presets.linear
        : LayoutAnimation.Presets.easeInEaseOut;

    LayoutAnimation.configureNext(config);
  }

  // Run heavy operation after animations
  runAfterAnimations(callback: () => void): void {
    InteractionManager.runAfterInteractions(callback);
  }

  // Get current performance metrics
  getMetrics(): AnimationMetrics {
    return this.metrics;
  }

  // Check if should use reduced animations
  shouldReduceAnimations(): boolean {
    return this.reducedMotion || this.devicePerformance === DevicePerformance.LOW;
  }

  // Clean up resources
  cleanup(): void {
    this.fpsMonitor.stop();
    this.animationCache.clear();
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
  }
}

// Export singleton instance
export const animationController = AnimationController.getInstance();

// Hook for using animation controller in components
export const useAnimationController = () => {
  return animationController;
};