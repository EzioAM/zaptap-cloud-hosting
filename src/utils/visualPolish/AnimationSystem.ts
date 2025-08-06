/**
 * Advanced Animation System for ShortcutsLike
 * Provides spring physics, gesture-responsive animations, and performance monitoring
 */

import { Animated, Easing, Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { EventLogger } from '../EventLogger';

// Animation Configuration Types
export interface SpringConfig {
  tension?: number;
  friction?: number;
  mass?: number;
  velocity?: number;
  bounciness?: number;
  speed?: number;
}

export interface TimingConfig {
  duration?: number;
  easing?: (value: number) => number;
  delay?: number;
}

export interface GestureAnimationConfig extends SpringConfig {
  enablePanGesture?: boolean;
  enablePinchGesture?: boolean;
  enableRotationGesture?: boolean;
  resistanceFactors?: {
    horizontal?: number;
    vertical?: number;
  };
}

// Predefined Spring Configurations
export const SpringPresets = {
  // Gentle and smooth
  gentle: {
    tension: 120,
    friction: 14,
    mass: 1,
  } as SpringConfig,

  // Bouncy and playful
  bouncy: {
    tension: 180,
    friction: 12,
    mass: 1,
    bounciness: 8,
  } as SpringConfig,

  // Quick and responsive
  snappy: {
    tension: 300,
    friction: 30,
    mass: 1,
  } as SpringConfig,

  // Slow and deliberate
  slow: {
    tension: 80,
    friction: 20,
    mass: 2,
  } as SpringConfig,

  // Wobbly and attention-grabbing
  wobbly: {
    tension: 180,
    friction: 8,
    mass: 1,
  } as SpringConfig,
};

// Easing Functions
export const CustomEasing = {
  // Material Design standard curve
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  
  // Accelerate curve for exit transitions
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),
  
  // Decelerate curve for enter transitions
  decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
  
  // Sharp curve for temporary effects
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1),
  
  // Bounce easing
  bounce: Easing.bounce,
  
  // Elastic easing
  elastic: Easing.elastic(4),
  
  // Custom smooth curve
  smooth: Easing.bezier(0.25, 0.46, 0.45, 0.94),
};

// Animation Performance Monitor
class AnimationPerformanceMonitor {
  private static instance: AnimationPerformanceMonitor;
  private frameDrops: number = 0;
  private totalFrames: number = 0;
  private isMonitoring: boolean = false;

  public static getInstance(): AnimationPerformanceMonitor {
    if (!AnimationPerformanceMonitor.instance) {
      AnimationPerformanceMonitor.instance = new AnimationPerformanceMonitor();
    }
    return AnimationPerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.frameDrops = 0;
    this.totalFrames = 0;
    
    EventLogger.debug('AnimationSystem', '[AnimationSystem] Performance monitoring started');
  }

  stopMonitoring(): { fps: number; frameDrops: number; efficiency: number } {
    if (!this.isMonitoring) {
      return { fps: 60, frameDrops: 0, efficiency: 100 };
    }
    
    this.isMonitoring = false;
    const fps = this.totalFrames > 0 ? (this.totalFrames - this.frameDrops) / this.totalFrames * 60 : 60;
    const efficiency = this.totalFrames > 0 ? ((this.totalFrames - this.frameDrops) / this.totalFrames) * 100 : 100;
    
    EventLogger.debug('AnimationSystem', '[AnimationSystem] Performance: ${fps.toFixed(1)}fps, ${this.frameDrops} drops, ${efficiency.toFixed(1)}% efficiency');
    
    return {
      fps: Math.round(fps),
      frameDrops: this.frameDrops,
      efficiency: Math.round(efficiency),
    };
  }

  recordFrame(dropped: boolean = false): void {
    if (!this.isMonitoring) return;
    
    this.totalFrames++;
    if (dropped) {
      this.frameDrops++;
    }
  }
}

// Main Animation System Class
export class AnimationSystem {
  private static monitor = AnimationPerformanceMonitor.getInstance();
  
  /**
   * Create a spring animation with advanced configuration
   */
  static createSpring(
    value: Animated.Value,
    toValue: number,
    config: SpringConfig = SpringPresets.gentle
  ): Animated.CompositeAnimation {
    this.monitor.startMonitoring();
    
    const animation = Animated.spring(value, {
      toValue,
      ...config,
      useNativeDriver: true,
    });

    // Add performance monitoring
    animation.addListener(() => {
      this.monitor.recordFrame();
    });

    return animation;
  }

  /**
   * Create a timing animation with custom easing
   */
  static createTiming(
    value: Animated.Value,
    toValue: number,
    config: TimingConfig = {}
  ): Animated.CompositeAnimation {
    this.monitor.startMonitoring();
    
    const defaultConfig: TimingConfig = {
      duration: 300,
      easing: CustomEasing.standard,
      delay: 0,
    };

    const animation = Animated.timing(value, {
      toValue,
      ...defaultConfig,
      ...config,
      useNativeDriver: true,
    });

    animation.addListener(() => {
      this.monitor.recordFrame();
    });

    return animation;
  }

  /**
   * Create a sequence of animations
   */
  static createSequence(animations: Animated.CompositeAnimation[]): Animated.CompositeAnimation {
    return Animated.sequence(animations);
  }

  /**
   * Create parallel animations
   */
  static createParallel(animations: Animated.CompositeAnimation[]): Animated.CompositeAnimation {
    return Animated.parallel(animations);
  }

  /**
   * Create a stagger animation (delayed sequence)
   */
  static createStagger(
    delay: number,
    animations: Animated.CompositeAnimation[]
  ): Animated.CompositeAnimation {
    return Animated.stagger(delay, animations);
  }

  /**
   * Create a loop animation
   */
  static createLoop(
    animation: Animated.CompositeAnimation,
    iterations: number = -1
  ): Animated.CompositeAnimation {
    return Animated.loop(animation, { iterations });
  }

  /**
   * Create a gesture-responsive animation
   */
  static createGestureAnimation(
    panGesture: Animated.Value,
    config: GestureAnimationConfig = {}
  ): {
    transform: Array<{ [key: string]: Animated.AnimatedAddition }>;
    gestureHandler: any;
  } {
    const translateX = new Animated.Value(0);
    const translateY = new Animated.Value(0);
    const scale = new Animated.Value(1);
    const rotate = new Animated.Value(0);

    const defaultConfig: GestureAnimationConfig = {
      enablePanGesture: true,
      enablePinchGesture: false,
      enableRotationGesture: false,
      resistanceFactors: {
        horizontal: 1,
        vertical: 1,
      },
      ...SpringPresets.gentle,
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Create gesture handler
    const gestureHandler = Gesture.Pan()
      .enabled(finalConfig.enablePanGesture!)
      .onChange((event) => {
        translateX.setValue(event.translationX * finalConfig.resistanceFactors!.horizontal!);
        translateY.setValue(event.translationY * finalConfig.resistanceFactors!.vertical!);
      })
      .onEnd((event) => {
        // Spring back to original position
        this.createSpring(translateX, 0, finalConfig).start();
        this.createSpring(translateY, 0, finalConfig).start();
      });

    return {
      transform: [
        { translateX },
        { translateY },
        { scale },
        { rotate: rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        }) },
      ],
      gestureHandler,
    };
  }

  /**
   * Create scroll-linked animation
   */
  static createScrollAnimation(
    scrollY: Animated.Value,
    inputRange: number[],
    outputRange: number[],
    extrapolate: 'clamp' | 'extend' | 'identity' = 'clamp'
  ): Animated.AnimatedInterpolation {
    return scrollY.interpolate({
      inputRange,
      outputRange,
      extrapolate: extrapolate === 'clamp' ? 'clamp' : 
                   extrapolate === 'extend' ? 'extend' : 'identity',
    });
  }

  /**
   * Create physics-based decay animation
   */
  static createDecay(
    value: Animated.Value,
    velocity: number,
    deceleration: number = 0.998
  ): Animated.CompositeAnimation {
    return Animated.decay(value, {
      velocity,
      deceleration,
      useNativeDriver: true,
    });
  }

  /**
   * Create value-based animation with custom interpolation
   */
  static createInterpolation(
    inputValue: Animated.Value,
    inputRange: number[],
    outputRange: number[] | string[],
    extrapolate?: 'clamp' | 'extend' | 'identity'
  ): Animated.AnimatedInterpolation {
    return inputValue.interpolate({
      inputRange,
      outputRange,
      extrapolate,
    });
  }

  /**
   * Get performance metrics
   */
  static getPerformanceMetrics(): { fps: number; frameDrops: number; efficiency: number } {
    return this.monitor.stopMonitoring();
  }

  /**
   * Create a breathe animation (subtle scaling)
   */
  static createBreatheAnimation(
    value: Animated.Value,
    minScale: number = 0.95,
    maxScale: number = 1.05,
    duration: number = 2000
  ): Animated.CompositeAnimation {
    return this.createLoop(
      Animated.sequence([
        this.createTiming(value, maxScale, { 
          duration: duration / 2, 
          easing: CustomEasing.smooth 
        }),
        this.createTiming(value, minScale, { 
          duration: duration / 2, 
          easing: CustomEasing.smooth 
        }),
      ])
    );
  }

  /**
   * Create a pulse animation
   */
  static createPulseAnimation(
    value: Animated.Value,
    pulseScale: number = 1.1,
    duration: number = 600
  ): Animated.CompositeAnimation {
    return Animated.sequence([
      this.createTiming(value, pulseScale, { 
        duration: duration / 2, 
        easing: CustomEasing.decelerate 
      }),
      this.createTiming(value, 1, { 
        duration: duration / 2, 
        easing: CustomEasing.accelerate 
      }),
    ]);
  }

  /**
   * Create a shake animation
   */
  static createShakeAnimation(
    value: Animated.Value,
    intensity: number = 10,
    duration: number = 400
  ): Animated.CompositeAnimation {
    const shake = (direction: number) => 
      this.createTiming(value, direction * intensity, { 
        duration: duration / 8, 
        easing: Easing.linear 
      });

    return Animated.sequence([
      shake(1), shake(-1), shake(1), shake(-1),
      shake(0.5), shake(-0.5), shake(0.25), shake(0),
    ]);
  }

  /**
   * Create entrance animation
   */
  static createEntranceAnimation(
    values: {
      opacity: Animated.Value;
      scale: Animated.Value;
      translateY: Animated.Value;
    },
    delay: number = 0
  ): Animated.CompositeAnimation {
    return Animated.parallel([
      this.createTiming(values.opacity, 1, { 
        duration: 300, 
        delay,
        easing: CustomEasing.decelerate 
      }),
      this.createSpring(values.scale, 1, { 
        ...SpringPresets.bouncy,
        delay,
      }),
      this.createSpring(values.translateY, 0, { 
        ...SpringPresets.gentle,
        delay,
      }),
    ]);
  }

  /**
   * Create exit animation
   */
  static createExitAnimation(
    values: {
      opacity: Animated.Value;
      scale: Animated.Value;
      translateY: Animated.Value;
    }
  ): Animated.CompositeAnimation {
    return Animated.parallel([
      this.createTiming(values.opacity, 0, { 
        duration: 200, 
        easing: CustomEasing.accelerate 
      }),
      this.createTiming(values.scale, 0.8, { 
        duration: 200, 
        easing: CustomEasing.accelerate 
      }),
      this.createTiming(values.translateY, -20, { 
        duration: 200, 
        easing: CustomEasing.accelerate 
      }),
    ]);
  }
}

export default AnimationSystem;