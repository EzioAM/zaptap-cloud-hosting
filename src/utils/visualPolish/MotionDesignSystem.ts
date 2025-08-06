/**
 * Motion Design System
 * Provides consistent easing functions, timing constants, gesture velocity matching,
 * interruptible animations, and physics-based scrolling enhancements
 */

import { Animated, Easing, PanResponder, Dimensions } from 'react-native';
import { AnimationSystem } from './AnimationSystem';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Motion Design Tokens
export const MotionTokens = {
  // Duration tokens (in milliseconds)
  duration: {
    instant: 0,
    fast: 150,
    medium: 250,
    slow: 400,
    slower: 600,
    slowest: 800,
  },

  // Easing curve tokens
  easing: {
    // Material Design curves
    standard: Easing.bezier(0.4, 0.0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0.0, 1, 1),
    decelerate: Easing.bezier(0.0, 0.0, 0.2, 1),
    sharp: Easing.bezier(0.4, 0.0, 0.6, 1),

    // Custom branded curves
    gentle: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    bouncy: Easing.bezier(0.68, -0.55, 0.265, 1.55),
    elastic: Easing.bezier(0.175, 0.885, 0.32, 1.275),
    
    // Apple-inspired curves
    appleStandard: Easing.bezier(0.4, 0.0, 0.2, 1),
    appleGentle: Easing.bezier(0.16, 1, 0.3, 1),
    appleSharp: Easing.bezier(0.32, 0, 0.67, 0),

    // Web-inspired curves
    ease: Easing.bezier(0.25, 0.1, 0.25, 1),
    easeIn: Easing.bezier(0.42, 0, 1, 1),
    easeOut: Easing.bezier(0, 0, 0.58, 1),
    easeInOut: Easing.bezier(0.42, 0, 0.58, 1),

    // Physics-based curves
    spring: (tension = 300, friction = 30) => 
      Easing.bezier(0.175, 0.885, 0.32, 1.275),
    
    // Custom utility curves
    overshoot: Easing.bezier(0.175, 0.885, 0.32, 1.275),
    anticipate: Easing.bezier(0.68, -0.55, 0.265, 1.55),
    smooth: Easing.bezier(0.645, 0.045, 0.355, 1),
  },

  // Stagger timing
  stagger: {
    tight: 50,
    normal: 100,
    loose: 200,
    relaxed: 300,
  },

  // Velocity matching constants
  velocity: {
    slow: 0.5,
    medium: 1.0,
    fast: 2.0,
    veryFast: 3.0,
  },

  // Physics constants
  physics: {
    gravity: 0.98,
    friction: 0.8,
    bounciness: 0.4,
    tension: 300,
    mass: 1,
  },
};

// Motion Categories for different interaction types
export const MotionCategories = {
  // UI transitions (page changes, modal presentations)
  transitions: {
    duration: MotionTokens.duration.medium,
    easing: MotionTokens.easing.standard,
    stagger: MotionTokens.stagger.normal,
  },

  // User interactions (button presses, toggles)
  interactions: {
    duration: MotionTokens.duration.fast,
    easing: MotionTokens.easing.sharp,
    stagger: MotionTokens.stagger.tight,
  },

  // Content animations (list items, cards appearing)
  content: {
    duration: MotionTokens.duration.slow,
    easing: MotionTokens.easing.decelerate,
    stagger: MotionTokens.stagger.loose,
  },

  // Attention-grabbing animations (success, errors, notifications)
  attention: {
    duration: MotionTokens.duration.slower,
    easing: MotionTokens.easing.bouncy,
    stagger: MotionTokens.stagger.normal,
  },

  // Background effects (ambient animations, decorative)
  ambient: {
    duration: MotionTokens.duration.slowest,
    easing: MotionTokens.easing.gentle,
    stagger: MotionTokens.stagger.relaxed,
  },

  // Gesture-driven animations
  gestures: {
    duration: MotionTokens.duration.fast,
    easing: MotionTokens.easing.appleGentle,
    stagger: MotionTokens.stagger.tight,
  },
};

// Gesture Velocity Matcher
export class GestureVelocityMatcher {
  private currentVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private velocityHistory: Array<{ timestamp: number; velocity: { x: number; y: number } }> = [];
  private readonly historySize = 5;

  updateVelocity(gestureState: any): void {
    const now = Date.now();
    const velocity = {
      x: gestureState.vx || 0,
      y: gestureState.vy || 0,
    };

    this.currentVelocity = velocity;
    
    // Keep velocity history for smoothing
    this.velocityHistory.unshift({ timestamp: now, velocity });
    
    if (this.velocityHistory.length > this.historySize) {
      this.velocityHistory.pop();
    }
  }

  getSmoothedVelocity(): { x: number; y: number } {
    if (this.velocityHistory.length === 0) {
      return { x: 0, y: 0 };
    }

    const sum = this.velocityHistory.reduce(
      (acc, entry) => ({
        x: acc.x + entry.velocity.x,
        y: acc.y + entry.velocity.y,
      }),
      { x: 0, y: 0 }
    );

    return {
      x: sum.x / this.velocityHistory.length,
      y: sum.y / this.velocityHistory.length,
    };
  }

  getMatchingDuration(baseDistance: number = 100): number {
    const smoothedVelocity = this.getSmoothedVelocity();
    const speed = Math.sqrt(smoothedVelocity.x ** 2 + smoothedVelocity.y ** 2);
    
    // Calculate duration based on velocity
    if (speed < MotionTokens.velocity.slow) {
      return MotionTokens.duration.slow;
    } else if (speed < MotionTokens.velocity.medium) {
      return MotionTokens.duration.medium;
    } else if (speed < MotionTokens.velocity.fast) {
      return MotionTokens.duration.fast;
    } else {
      return Math.max(MotionTokens.duration.fast * 0.5, 100);
    }
  }

  getMatchingEasing(): (value: number) => number {
    const smoothedVelocity = this.getSmoothedVelocity();
    const speed = Math.sqrt(smoothedVelocity.x ** 2 + smoothedVelocity.y ** 2);

    if (speed < MotionTokens.velocity.slow) {
      return MotionTokens.easing.decelerate;
    } else if (speed < MotionTokens.velocity.fast) {
      return MotionTokens.easing.standard;
    } else {
      return MotionTokens.easing.sharp;
    }
  }

  reset(): void {
    this.currentVelocity = { x: 0, y: 0 };
    this.velocityHistory = [];
  }
}

// Interruptible Animation Manager
export class InterruptibleAnimationManager {
  private activeAnimations: Map<string, Animated.CompositeAnimation> = new Map();
  private animationStates: Map<string, {
    currentValue: number;
    targetValue: number;
    startTime: number;
    duration: number;
  }> = new Map();

  startAnimation(
    key: string,
    animatedValue: Animated.Value,
    toValue: number,
    config: {
      duration?: number;
      easing?: (value: number) => number;
      useNativeDriver?: boolean;
    } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop any existing animation for this key
      this.stopAnimation(key);

      const startTime = Date.now();
      const currentValue = (animatedValue as any)._value || 0;
      
      // Store animation state
      this.animationStates.set(key, {
        currentValue,
        targetValue: toValue,
        startTime,
        duration: config.duration || MotionTokens.duration.medium,
      });

      const animation = Animated.timing(animatedValue, {
        toValue,
        duration: config.duration || MotionTokens.duration.medium,
        easing: config.easing || MotionTokens.easing.standard,
        useNativeDriver: config.useNativeDriver !== false,
      });

      this.activeAnimations.set(key, animation);

      animation.start((finished) => {
        this.activeAnimations.delete(key);
        this.animationStates.delete(key);
        
        if (finished) {
          resolve();
        } else {
          reject(new Error('Animation was interrupted'));
        }
      });
    });
  }

  interruptAndContinue(
    key: string,
    animatedValue: Animated.Value,
    newToValue: number,
    seamless: boolean = true
  ): Promise<void> {
    const state = this.animationStates.get(key);
    const currentAnimation = this.activeAnimations.get(key);

    if (!state || !currentAnimation) {
      // No animation to interrupt, start fresh
      return this.startAnimation(key, animatedValue, newToValue);
    }

    // Stop current animation
    currentAnimation.stop();

    if (seamless) {
      // Calculate current progress and adjust timing
      const elapsed = Date.now() - state.startTime;
      const progress = Math.min(elapsed / state.duration, 1);
      const currentValue = state.currentValue + 
        (state.targetValue - state.currentValue) * progress;

      // Start new animation from current position
      return this.startAnimation(key, animatedValue, newToValue, {
        duration: MotionTokens.duration.medium,
        easing: MotionTokens.easing.gentle,
      });
    } else {
      // Start fresh animation
      return this.startAnimation(key, animatedValue, newToValue);
    }
  }

  stopAnimation(key: string): void {
    const animation = this.activeAnimations.get(key);
    if (animation) {
      animation.stop();
      this.activeAnimations.delete(key);
      this.animationStates.delete(key);
    }
  }

  stopAllAnimations(): void {
    this.activeAnimations.forEach((animation) => {
      animation.stop();
    });
    this.activeAnimations.clear();
    this.animationStates.clear();
  }

  isAnimating(key: string): boolean {
    return this.activeAnimations.has(key);
  }

  getActiveAnimations(): string[] {
    return Array.from(this.activeAnimations.keys());
  }
}

// Physics-Based Scrolling Enhancer
export class PhysicsScrollEnhancer {
  private momentum: { x: number; y: number } = { x: 0, y: 0 };
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };
  private lastTimestamp: number = 0;
  private decayAnimations: Map<string, Animated.CompositeAnimation> = new Map();

  updateScrollPosition(position: { x: number; y: number }): void {
    const now = Date.now();
    const dt = Math.max(now - this.lastTimestamp, 1);
    
    this.momentum = {
      x: (position.x - this.lastPosition.x) / dt,
      y: (position.y - this.lastPosition.y) / dt,
    };

    this.lastPosition = position;
    this.lastTimestamp = now;
  }

  createMomentumScroll(
    scrollValue: Animated.Value,
    direction: 'x' | 'y' = 'y',
    bounds?: { min: number; max: number }
  ): Animated.CompositeAnimation {
    const currentMomentum = this.momentum[direction];
    const deceleration = 0.997; // Material Design standard
    
    // Stop any existing decay animation
    const existingAnimation = this.decayAnimations.get(`momentum_${direction}`);
    if (existingAnimation) {
      existingAnimation.stop();
    }

    const animation = Animated.decay(scrollValue, {
      velocity: currentMomentum,
      deceleration,
      useNativeDriver: true,
    });

    this.decayAnimations.set(`momentum_${direction}`, animation);
    
    return animation;
  }

  createSpringScroll(
    scrollValue: Animated.Value,
    targetValue: number,
    velocity?: number
  ): Animated.CompositeAnimation {
    return Animated.spring(scrollValue, {
      toValue: targetValue,
      velocity: velocity || 0,
      tension: MotionTokens.physics.tension,
      friction: MotionTokens.physics.friction * 100, // React Native spring friction scale
      mass: MotionTokens.physics.mass,
      useNativeDriver: true,
    });
  }

  createRubberBandEffect(
    value: Animated.Value,
    bounds: { min: number; max: number },
    resistance: number = 0.3
  ): {
    transform: any[];
    onScroll: (event: any) => void;
  } {
    const clampedValue = value.interpolate({
      inputRange: [bounds.min - 100, bounds.min, bounds.max, bounds.max + 100],
      outputRange: [
        bounds.min - 100 * resistance,
        bounds.min,
        bounds.max,
        bounds.max + 100 * resistance,
      ],
      extrapolate: 'clamp',
    });

    const onScroll = (event: any) => {
      const { contentOffset } = event.nativeEvent;
      this.updateScrollPosition(contentOffset);
    };

    return {
      transform: [{ translateY: clampedValue }],
      onScroll,
    };
  }

  createParallaxEffect(
    scrollValue: Animated.Value,
    intensity: number = 0.5
  ): Animated.AnimatedInterpolation {
    return scrollValue.interpolate({
      inputRange: [0, screenHeight],
      outputRange: [0, screenHeight * intensity],
      extrapolate: 'extend',
    });
  }

  reset(): void {
    this.momentum = { x: 0, y: 0 };
    this.lastPosition = { x: 0, y: 0 };
    this.lastTimestamp = 0;
    
    this.decayAnimations.forEach(animation => animation.stop());
    this.decayAnimations.clear();
  }
}

// Motion Design System Controller
export class MotionDesignSystem {
  private static instance: MotionDesignSystem;
  private velocityMatcher = new GestureVelocityMatcher();
  private animationManager = new InterruptibleAnimationManager();
  private scrollEnhancer = new PhysicsScrollEnhancer();
  private reducedMotionPreference = false;

  public static getInstance(): MotionDesignSystem {
    if (!MotionDesignSystem.instance) {
      MotionDesignSystem.instance = new MotionDesignSystem();
    }
    return MotionDesignSystem.instance;
  }

  // Set reduced motion preference
  setReducedMotionPreference(reduced: boolean): void {
    this.reducedMotionPreference = reduced;
  }

  // Get appropriate motion config based on preference
  getMotionConfig(category: keyof typeof MotionCategories): {
    duration: number;
    easing: (value: number) => number;
    stagger: number;
  } {
    const config = MotionCategories[category];
    
    if (this.reducedMotionPreference) {
      return {
        duration: Math.min(config.duration, MotionTokens.duration.fast),
        easing: MotionTokens.easing.standard,
        stagger: 0,
      };
    }

    return config;
  }

  // Create adaptive animation based on context
  createAdaptiveAnimation(
    value: Animated.Value,
    toValue: number,
    category: keyof typeof MotionCategories,
    gestureState?: any
  ): Animated.CompositeAnimation {
    let config = this.getMotionConfig(category);

    // Adapt based on gesture if provided
    if (gestureState && category === 'gestures') {
      this.velocityMatcher.updateVelocity(gestureState);
      config = {
        duration: this.velocityMatcher.getMatchingDuration(),
        easing: this.velocityMatcher.getMatchingEasing(),
        stagger: config.stagger,
      };
    }

    return AnimationSystem.createTiming(value, toValue, {
      duration: config.duration,
      easing: config.easing,
    });
  }

  // Create staggered animations
  createStaggeredAnimations(
    animations: Array<{ value: Animated.Value; toValue: number }>,
    category: keyof typeof MotionCategories
  ): Animated.CompositeAnimation {
    const config = this.getMotionConfig(category);
    
    const animationSequence = animations.map((anim, index) =>
      AnimationSystem.createTiming(anim.value, anim.toValue, {
        duration: config.duration,
        easing: config.easing,
        delay: index * config.stagger,
      })
    );

    return Animated.parallel(animationSequence);
  }

  // Get system instances
  getVelocityMatcher(): GestureVelocityMatcher {
    return this.velocityMatcher;
  }

  getAnimationManager(): InterruptibleAnimationManager {
    return this.animationManager;
  }

  getScrollEnhancer(): PhysicsScrollEnhancer {
    return this.scrollEnhancer;
  }

  // Utility method for common UI patterns
  createButtonPressAnimation(
    scale: Animated.Value,
    opacity: Animated.Value
  ): {
    pressIn: () => void;
    pressOut: () => void;
  } {
    const config = this.getMotionConfig('interactions');

    const pressIn = () => {
      Animated.parallel([
        AnimationSystem.createTiming(scale, 0.95, {
          duration: config.duration * 0.6,
          easing: config.easing,
        }),
        AnimationSystem.createTiming(opacity, 0.8, {
          duration: config.duration * 0.6,
          easing: config.easing,
        }),
      ]).start();
    };

    const pressOut = () => {
      Animated.parallel([
        AnimationSystem.createSpring(scale, 1, {
          tension: MotionTokens.physics.tension,
          friction: MotionTokens.physics.friction * 20,
        }),
        AnimationSystem.createTiming(opacity, 1, {
          duration: config.duration,
          easing: MotionTokens.easing.decelerate,
        }),
      ]).start();
    };

    return { pressIn, pressOut };
  }

  // Clean up resources
  dispose(): void {
    this.animationManager.stopAllAnimations();
    this.scrollEnhancer.reset();
    this.velocityMatcher.reset();
  }
}

export default MotionDesignSystem;