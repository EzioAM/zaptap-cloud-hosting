/**
 * Animation constants and configurations
 * Shared across all animation modules
 */

import { Easing } from 'react-native';

// Performance targets
export const PERFORMANCE_TARGETS = {
  FLAGSHIP: { fps: 60, maxFrameTime: 16.67 },
  MIDRANGE: { fps: 45, maxFrameTime: 22.22 },
  LOWEND: { fps: 30, maxFrameTime: 33.33 },
} as const;

// Animation durations
export const DURATIONS = {
  INSTANT: 0,
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

// Spring configurations
export const SPRING_CONFIGS = {
  TIGHT: { tension: 400, friction: 30 },
  GENTLE: { tension: 120, friction: 14 },
  BOUNCY: { tension: 180, friction: 12 },
  SLOW: { tension: 80, friction: 20 },
  WOBBLY: { tension: 180, friction: 8 },
} as const;

// Easing curves
export const Easings = {
  linear: Easing.linear,
  ease: Easing.ease,
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  
  // Quad
  easeInQuad: Easing.in(Easing.quad),
  easeOutQuad: Easing.out(Easing.quad),
  easeInOutQuad: Easing.inOut(Easing.quad),
  
  // Cubic
  easeInCubic: Easing.in(Easing.cubic),
  easeOutCubic: Easing.out(Easing.cubic),
  easeInOutCubic: Easing.inOut(Easing.cubic),
  
  // Expo
  easeInExpo: Easing.in(Easing.exp),
  easeOutExpo: Easing.out(Easing.exp),
  easeInOutExpo: Easing.inOut(Easing.exp),
  
  // Back
  easeInBack: Easing.in(Easing.back(1.7)),
  easeOutBack: Easing.out(Easing.back(1.7)),
  easeInOutBack: Easing.inOut(Easing.back(1.7)),
  
  // Elastic
  easeInElastic: Easing.in(Easing.elastic(1)),
  easeOutElastic: Easing.out(Easing.elastic(1)),
  easeInOutElastic: Easing.inOut(Easing.elastic(1)),
  
  // Bounce
  easeInBounce: Easing.in(Easing.bounce),
  easeOutBounce: Easing.out(Easing.bounce),
  easeInOutBounce: Easing.inOut(Easing.bounce),
};