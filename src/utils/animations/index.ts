/**
 * Animation System Export Hub
 * Central export point for all animation utilities
 */

// Core exports
export {
  AnimationController,
  animationController,
  useAnimationController,
  AnimationPresets,
  DevicePerformance,
} from './AnimationController';

// Platform optimizations
export {
  IOSOptimizations,
  AndroidOptimizations,
  WebOptimizations,
  PlatformOptimizer,
  AnimationPool,
  animationPool,
} from './PlatformOptimizations';

// Performance hooks
export {
  useAnimationPerformance,
  useOptimizedAnimatedValue,
  useDelayedAnimation,
  useBatchAnimations,
  useOptimizedScrollAnimation,
  useSpringAnimation,
  useTimingAnimation,
  useReducedMotion,
  useFPSMonitor,
  useLazyAnimation,
  useGestureAnimation,
} from './PerformanceHooks';

// Preset animations
export { PresetAnimations } from './PresetAnimations';

// Constants and configurations
export { PERFORMANCE_TARGETS, DURATIONS, SPRING_CONFIGS, Easings } from './constants';

// Animation helpers
import { Animated } from 'react-native';
import { animationController } from './AnimationController';

// Quick animation creators
export const fadeIn = (value: Animated.Value, duration: number = 300) => {
  return animationController.createTiming(value, 1, { duration });
};

export const fadeOut = (value: Animated.Value, duration: number = 300) => {
  return animationController.createTiming(value, 0, { duration });
};

export const slideIn = (value: Animated.Value, from: number = 100, duration: number = 300) => {
  value.setValue(from);
  return animationController.createSpring(value, 0);
};

export const slideOut = (value: Animated.Value, to: number = 100, duration: number = 300) => {
  return animationController.createSpring(value, to);
};

export const scaleIn = (value: Animated.Value, duration: number = 300) => {
  value.setValue(0);
  return animationController.createSpring(value, 1);
};

export const scaleOut = (value: Animated.Value, duration: number = 300) => {
  return animationController.createSpring(value, 0);
};