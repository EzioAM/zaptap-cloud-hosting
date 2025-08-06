/**
 * Page Transition Orchestrator
 * Manages smooth transitions between screens with advanced animations
 */

import { Animated, Dimensions, Platform } from 'react-native';
import { AnimationSystem, SpringPresets, CustomEasing } from './AnimationSystem';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface TransitionConfig {
  type: TransitionType;
  duration?: number;
  delay?: number;
  springConfig?: any;
  customInterpolation?: {
    inputRange: number[];
    outputRange: number[] | string[];
  };
}

export type TransitionType = 
  | 'slide'
  | 'fade'
  | 'scale'
  | 'flip'
  | 'cube'
  | 'page'
  | 'modal'
  | 'push'
  | 'cover'
  | 'reveal'
  | 'dissolve'
  | 'zoom';

export interface ScreenTransition {
  entering: Animated.CompositeAnimation;
  exiting: Animated.CompositeAnimation;
  gesture?: any;
}

export class PageTransitionOrchestrator {
  private static currentTransitions: Map<string, Animated.CompositeAnimation> = new Map();
  
  /**
   * Create a complete screen transition
   */
  static createScreenTransition(
    screenId: string,
    config: TransitionConfig,
    isEntering: boolean = true
  ): {
    transform: any[];
    opacity: Animated.AnimatedInterpolation;
    animation: Animated.CompositeAnimation;
  } {
    const progress = new Animated.Value(isEntering ? 0 : 1);
    const targetValue = isEntering ? 1 : 0;

    const animation = this.createTransitionAnimation(progress, targetValue, config);
    const { transform, opacity } = this.getTransitionStyles(progress, config, isEntering);

    // Store animation for potential interruption
    this.currentTransitions.set(screenId, animation);

    return { transform, opacity, animation };
  }

  /**
   * Create the core transition animation
   */
  private static createTransitionAnimation(
    progress: Animated.Value,
    targetValue: number,
    config: TransitionConfig
  ): Animated.CompositeAnimation {
    const defaultDuration = this.getDefaultDuration(config.type);
    const duration = config.duration || defaultDuration;

    if (config.springConfig) {
      return AnimationSystem.createSpring(progress, targetValue, config.springConfig);
    }

    const easing = this.getTransitionEasing(config.type);
    return AnimationSystem.createTiming(progress, targetValue, {
      duration,
      easing,
      delay: config.delay || 0,
    });
  }

  /**
   * Get transform and opacity styles for transition
   */
  private static getTransitionStyles(
    progress: Animated.Value,
    config: TransitionConfig,
    isEntering: boolean
  ): {
    transform: any[];
    opacity: Animated.AnimatedInterpolation;
  } {
    const direction = isEntering ? 1 : -1;

    switch (config.type) {
      case 'slide':
        return this.createSlideTransition(progress, direction);
      
      case 'fade':
        return this.createFadeTransition(progress);
      
      case 'scale':
        return this.createScaleTransition(progress, direction);
      
      case 'flip':
        return this.createFlipTransition(progress, direction);
      
      case 'cube':
        return this.createCubeTransition(progress, direction);
      
      case 'page':
        return this.createPageTransition(progress, direction);
      
      case 'modal':
        return this.createModalTransition(progress, direction);
      
      case 'push':
        return this.createPushTransition(progress, direction);
      
      case 'cover':
        return this.createCoverTransition(progress, direction);
      
      case 'reveal':
        return this.createRevealTransition(progress, direction);
      
      case 'dissolve':
        return this.createDissolveTransition(progress);
      
      case 'zoom':
        return this.createZoomTransition(progress, direction);
      
      default:
        return this.createSlideTransition(progress, direction);
    }
  }

  /**
   * Slide transition (horizontal)
   */
  private static createSlideTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screenWidth * direction, 0],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });

    return {
      transform: [{ translateX }],
      opacity,
    };
  }

  /**
   * Fade transition
   */
  private static createFadeTransition(
    progress: Animated.Value
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return {
      transform: [],
      opacity,
    };
  }

  /**
   * Scale transition
   */
  private static createScaleTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: direction > 0 ? [0.8, 1] : [1, 1.2],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    return {
      transform: [{ scale }],
      opacity,
    };
  }

  /**
   * Flip transition (3D rotation)
   */
  private static createFlipTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const rotateY = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: ['90deg', '45deg', '0deg'],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 0.9, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.5, 1],
      extrapolate: 'clamp',
    });

    return {
      transform: [
        { perspective: 1000 },
        { rotateY },
        { scale },
      ],
      opacity,
    };
  }

  /**
   * Cube transition (3D cube rotation)
   */
  private static createCubeTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const rotateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [direction * 90 + 'deg', '0deg'],
      extrapolate: 'clamp',
    });

    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screenWidth * direction * 0.5, 0],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });

    return {
      transform: [
        { perspective: 1200 },
        { translateX },
        { rotateY },
      ],
      opacity,
    };
  }

  /**
   * Page transition (book-like)
   */
  private static createPageTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const rotateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [direction * 180 + 'deg', '0deg'],
      extrapolate: 'clamp',
    });

    const translateX = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, screenWidth * direction * 0.3, 0],
      extrapolate: 'clamp',
    });

    const opacity = progress;

    return {
      transform: [
        { perspective: 1000 },
        { translateX },
        { rotateY },
      ],
      opacity,
    };
  }

  /**
   * Modal transition (slide up from bottom)
   */
  private static createModalTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const translateY = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screenHeight * direction, 0],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0.9, 0.95, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  }

  /**
   * Push transition (slide with background scale)
   */
  private static createPushTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screenWidth * direction, 0],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.95, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress;

    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  }

  /**
   * Cover transition (slide over with shadow)
   */
  private static createCoverTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [screenWidth * direction, 0],
      extrapolate: 'clamp',
    });

    const shadowOpacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.3],
      extrapolate: 'clamp',
    });

    return {
      transform: [
        { translateX },
        { 
          shadowOffset: { width: -5 * direction, height: 0 },
          shadowOpacity,
          shadowRadius: 10,
          elevation: 10,
        },
      ],
      opacity: progress,
    };
  }

  /**
   * Reveal transition (uncover from behind)
   */
  private static createRevealTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-screenWidth * direction, 0],
      extrapolate: 'clamp',
    });

    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1.1, 1],
      extrapolate: 'clamp',
    });

    return {
      transform: [{ translateX }, { scale }],
      opacity: progress,
    };
  }

  /**
   * Dissolve transition (pixelated fade)
   */
  private static createDissolveTransition(
    progress: Animated.Value
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const scale = progress.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [1.05, 1.02, 1],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.1, 0.9, 1],
      outputRange: [0, 0.3, 0.8, 1],
      extrapolate: 'clamp',
    });

    return {
      transform: [{ scale }],
      opacity,
    };
  }

  /**
   * Zoom transition (scale from center)
   */
  private static createZoomTransition(
    progress: Animated.Value,
    direction: number
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: direction > 0 ? [0.5, 1] : [1, 2],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 0.2, 0.8, 1],
      outputRange: [0, 0.4, 0.8, 1],
      extrapolate: 'clamp',
    });

    return {
      transform: [{ scale }],
      opacity,
    };
  }

  /**
   * Get default duration for transition type
   */
  private static getDefaultDuration(type: TransitionType): number {
    const durations: Record<TransitionType, number> = {
      slide: 300,
      fade: 200,
      scale: 250,
      flip: 400,
      cube: 500,
      page: 600,
      modal: 300,
      push: 350,
      cover: 350,
      reveal: 350,
      dissolve: 400,
      zoom: 300,
    };

    return durations[type] || 300;
  }

  /**
   * Get easing function for transition type
   */
  private static getTransitionEasing(type: TransitionType): (value: number) => number {
    const easings: Record<TransitionType, (value: number) => number> = {
      slide: CustomEasing.standard,
      fade: CustomEasing.decelerate,
      scale: CustomEasing.smooth,
      flip: CustomEasing.sharp,
      cube: CustomEasing.standard,
      page: CustomEasing.smooth,
      modal: CustomEasing.decelerate,
      push: CustomEasing.standard,
      cover: CustomEasing.standard,
      reveal: CustomEasing.decelerate,
      dissolve: CustomEasing.smooth,
      zoom: CustomEasing.sharp,
    };

    return easings[type] || CustomEasing.standard;
  }

  /**
   * Interrupt current transition
   */
  static interruptTransition(screenId: string): void {
    const animation = this.currentTransitions.get(screenId);
    if (animation) {
      animation.stop();
      this.currentTransitions.delete(screenId);
    }
  }

  /**
   * Create gesture-driven transition
   */
  static createGestureTransition(
    gestureProgress: Animated.Value,
    config: TransitionConfig
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const { transform, opacity } = this.getTransitionStyles(gestureProgress, config, true);
    return { transform, opacity };
  }

  /**
   * Create combined transition (multiple effects)
   */
  static createCombinedTransition(
    progress: Animated.Value,
    configs: TransitionConfig[],
    isEntering: boolean = true
  ): { transform: any[]; opacity: Animated.AnimatedInterpolation } {
    const transforms: any[] = [];
    let opacity = progress;

    configs.forEach(config => {
      const { transform, opacity: configOpacity } = this.getTransitionStyles(
        progress,
        config,
        isEntering
      );
      transforms.push(...transform);
      
      // Use the most restrictive opacity
      if (configOpacity !== progress) {
        opacity = configOpacity;
      }
    });

    return { transform: transforms, opacity };
  }

  /**
   * Clear all stored animations
   */
  static clearAllTransitions(): void {
    this.currentTransitions.forEach(animation => {
      animation.stop();
    });
    this.currentTransitions.clear();
  }
}

export default PageTransitionOrchestrator;