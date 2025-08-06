/**
 * Comprehensive Micro-Interactions System
 * Platform-aware animations for premium feel
 */

import { Platform } from 'react-native';
import {
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  runOnJS,
  SharedValue,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Animation presets for consistent micro-interactions
export const ANIMATION_PRESETS = {
  // Spring animations - iOS style
  spring: {
    gentle: { damping: 20, stiffness: 300, mass: 0.9 },
    bouncy: { damping: 12, stiffness: 400, mass: 0.8 },
    snappy: { damping: 18, stiffness: 500, mass: 0.7 },
    wobbly: { damping: 10, stiffness: 200, mass: 1.2 },
  },
  // Timing animations - Material Design style
  timing: {
    quick: { duration: 150, easing: Easing.out(Easing.cubic) },
    smooth: { duration: 250, easing: Easing.out(Easing.quad) },
    gentle: { duration: 350, easing: Easing.out(Easing.sine) },
    dramatic: { duration: 500, easing: Easing.out(Easing.back(1.5)) },
  },
};

// Platform-specific animation preferences
const getPreferredAnimation = () => {
  return Platform.OS === 'ios' ? 'spring' : 'timing';
};

export class MicroInteractions {
  // Button press animations
  static buttonPress = {
    scale: (scale: SharedValue<number>) => {
      'worklet';
      const animType = getPreferredAnimation();
      
      if (animType === 'spring') {
        scale.value = withSequence(
          withSpring(0.95, ANIMATION_PRESETS.spring.snappy),
          withSpring(1, ANIMATION_PRESETS.spring.gentle)
        );
      } else {
        scale.value = withSequence(
          withTiming(0.95, ANIMATION_PRESETS.timing.quick),
          withTiming(1, ANIMATION_PRESETS.timing.smooth)
        );
      }
    },

    ripple: (opacity: SharedValue<number>) => {
      'worklet';
      opacity.value = withSequence(
        withTiming(0.12, { duration: 150 }),
        withTiming(0, { duration: 300 })
      );
    },

    elevationPress: (elevation: SharedValue<number>) => {
      'worklet';
      elevation.value = withSequence(
        withTiming(2, ANIMATION_PRESETS.timing.quick),
        withTiming(Platform.OS === 'android' ? 4 : 8, ANIMATION_PRESETS.timing.smooth)
      );
    },
  };

  // Card interactions
  static cardHover = {
    elevate: (elevation: SharedValue<number>, scale: SharedValue<number>) => {
      'worklet';
      if (Platform.OS === 'ios') {
        scale.value = withSpring(1.02, ANIMATION_PRESETS.spring.gentle);
        elevation.value = withTiming(12, ANIMATION_PRESETS.timing.smooth);
      } else {
        elevation.value = withTiming(8, ANIMATION_PRESETS.timing.smooth);
      }
    },

    settle: (elevation: SharedValue<number>, scale: SharedValue<number>) => {
      'worklet';
      scale.value = withSpring(1, ANIMATION_PRESETS.spring.gentle);
      elevation.value = withTiming(2, ANIMATION_PRESETS.timing.smooth);
    },

    press: (scale: SharedValue<number>) => {
      'worklet';
      scale.value = withSequence(
        withTiming(0.98, { duration: 100 }),
        withSpring(1, ANIMATION_PRESETS.spring.gentle)
      );
    },
  };

  // Toggle switches and checkboxes
  static toggle = {
    switch: (position: SharedValue<number>, scale: SharedValue<number>) => {
      'worklet';
      position.value = withSpring(position.value === 0 ? 1 : 0, ANIMATION_PRESETS.spring.bouncy);
      scale.value = withSequence(
        withSpring(1.2, { damping: 15, stiffness: 600 }),
        withSpring(1, ANIMATION_PRESETS.spring.gentle)
      );
    },

    checkbox: (scale: SharedValue<number>, rotation: SharedValue<number>) => {
      'worklet';
      scale.value = withSequence(
        withSpring(0.8, { damping: 12, stiffness: 400 }),
        withSpring(1, ANIMATION_PRESETS.spring.bouncy)
      );
      rotation.value = withSpring(rotation.value + 360, ANIMATION_PRESETS.spring.gentle);
    },
  };

  // Loading states
  static loading = {
    pulse: (scale: SharedValue<number>) => {
      'worklet';
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.sine) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sine) })
        ),
        -1,
        false
      );
    },

    shimmer: (translateX: SharedValue<number>, width: number) => {
      'worklet';
      translateX.value = withRepeat(
        withSequence(
          withTiming(-width, { duration: 0 }),
          withTiming(width * 2, { duration: 1200, easing: Easing.inOut(Easing.sine) })
        ),
        -1,
        false
      );
    },

    breathe: (opacity: SharedValue<number>) => {
      'worklet';
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.sine) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sine) })
        ),
        -1,
        false
      );
    },

    rotate: (rotation: SharedValue<number>) => {
      'worklet';
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    },
  };

  // Entry animations
  static entrance = {
    fadeInUp: (
      translateY: SharedValue<number>,
      opacity: SharedValue<number>,
      delay: number = 0
    ) => {
      'worklet';
      return withDelay(
        delay,
        withSequence(
          withTiming(0, { duration: 0 }), // Reset
          withSpring(0, ANIMATION_PRESETS.spring.gentle),
          runOnJS(() => {
            translateY.value = 30;
            opacity.value = 0;
          })(),
          withTiming(
            0,
            { duration: 400, easing: Easing.out(Easing.cubic) },
            () => {
              opacity.value = withTiming(1, { duration: 300 });
            }
          )
        )
      );
    },

    scaleIn: (scale: SharedValue<number>, delay: number = 0) => {
      'worklet';
      return withDelay(
        delay,
        withSequence(
          withTiming(0.8, { duration: 0 }),
          withSpring(1, ANIMATION_PRESETS.spring.bouncy)
        )
      );
    },

    slideInFromRight: (
      translateX: SharedValue<number>,
      delay: number = 0,
      distance: number = 100
    ) => {
      'worklet';
      return withDelay(
        delay,
        withSequence(
          withTiming(distance, { duration: 0 }),
          withSpring(0, ANIMATION_PRESETS.spring.gentle)
        )
      );
    },
  };

  // Exit animations
  static exit = {
    fadeOutDown: (translateY: SharedValue<number>, opacity: SharedValue<number>) => {
      'worklet';
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(30, { duration: 300, easing: Easing.in(Easing.cubic) });
    },

    scaleOut: (scale: SharedValue<number>) => {
      'worklet';
      scale.value = withTiming(0.8, { duration: 200, easing: Easing.in(Easing.cubic) });
    },
  };

  // Attention-seeking animations
  static attention = {
    shake: (translateX: SharedValue<number>) => {
      'worklet';
      translateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withRepeat(
          withSequence(
            withTiming(10, { duration: 100 }),
            withTiming(-10, { duration: 100 })
          ),
          2,
          false
        ),
        withTiming(0, { duration: 50 })
      );
    },

    bounce: (scale: SharedValue<number>) => {
      'worklet';
      scale.value = withSequence(
        withSpring(1.1, { damping: 8, stiffness: 400 }),
        withSpring(0.95, { damping: 8, stiffness: 400 }),
        withSpring(1, ANIMATION_PRESETS.spring.gentle)
      );
    },

    jello: (skewX: SharedValue<number>, skewY: SharedValue<number>) => {
      'worklet';
      const sequence = [
        { x: 0, y: 0 },
        { x: -12.5, y: -6.25 },
        { x: 6.25, y: 3.125 },
        { x: -3.125, y: -1.5625 },
        { x: 1.5625, y: 0.78125 },
        { x: 0, y: 0 },
      ];

      sequence.forEach((transform, index) => {
        skewX.value = withDelay(
          index * 111,
          withTiming(transform.x, { duration: 111 })
        );
        skewY.value = withDelay(
          index * 111,
          withTiming(transform.y, { duration: 111 })
        );
      });
    },
  };

  // Gesture feedback
  static gesture = {
    swipeHint: (translateX: SharedValue<number>) => {
      'worklet';
      translateX.value = withSequence(
        withTiming(10, { duration: 300 }),
        withTiming(0, { duration: 300 })
      );
    },

    pullToRefresh: (translateY: SharedValue<number>, progress: number) => {
      'worklet';
      const maxPull = 120;
      const resistance = 2.5;
      translateY.value = Math.min(progress / resistance, maxPull);
    },
  };

  // Haptic feedback helpers
  static haptics = {
    light: () => {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },

    medium: () => {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },

    heavy: () => {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    },

    success: () => {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },

    warning: () => {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    },

    error: () => {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },

    selection: () => {
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
    },
  };

  // Interpolation helpers
  static interpolations = {
    scale: (value: SharedValue<number>, inputRange: number[], outputRange: number[]) => {
      'worklet';
      return interpolate(value.value, inputRange, outputRange, Extrapolation.CLAMP);
    },

    opacity: (value: SharedValue<number>, inputRange: number[], outputRange: number[]) => {
      'worklet';
      return interpolate(value.value, inputRange, outputRange, Extrapolation.CLAMP);
    },

    rotate: (value: SharedValue<number>) => {
      'worklet';
      return `${value.value}deg`;
    },

    translateWithResistance: (value: SharedValue<number>, resistance: number = 2) => {
      'worklet';
      return value.value / resistance;
    },
  };

  // Staggered animations for lists
  static stagger = {
    list: (items: SharedValue<number>[], delay: number = 50) => {
      'worklet';
      items.forEach((item, index) => {
        item.value = withDelay(
          index * delay,
          withSpring(1, ANIMATION_PRESETS.spring.gentle)
        );
      });
    },

    grid: (items: SharedValue<number>[][], delay: number = 30) => {
      'worklet';
      items.forEach((row, rowIndex) => {
        row.forEach((item, colIndex) => {
          item.value = withDelay(
            (rowIndex * row.length + colIndex) * delay,
            withSpring(1, ANIMATION_PRESETS.spring.gentle)
          );
        });
      });
    },
  };

  // Material Design 3 specific animations
  static material3 = {
    fabExpand: (scale: SharedValue<number>, width: SharedValue<number>) => {
      'worklet';
      scale.value = withTiming(1.1, { duration: 150 });
      width.value = withTiming(200, { duration: 300, easing: Easing.out(Easing.cubic) });
    },

    cardPress: (elevation: SharedValue<number>) => {
      'worklet';
      elevation.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(3, { duration: 200 })
      );
    },

    rippleSpread: (scale: SharedValue<number>, opacity: SharedValue<number>) => {
      'worklet';
      scale.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      opacity.value = withSequence(
        withTiming(0.12, { duration: 150 }),
        withDelay(150, withTiming(0, { duration: 300 }))
      );
    },
  };

  // iOS specific animations
  static ios = {
    modalPresent: (translateY: SharedValue<number>) => {
      'worklet';
      translateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
        mass: 1,
      });
    },

    modalDismiss: (translateY: SharedValue<number>, screenHeight: number) => {
      'worklet';
      translateY.value = withTiming(screenHeight, {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      });
    },

    tabBarPress: (scale: SharedValue<number>) => {
      'worklet';
      scale.value = withSequence(
        withSpring(0.85, { damping: 15, stiffness: 500 }),
        withSpring(1, { damping: 15, stiffness: 300 })
      );
    },
  };
}

// Animation timing constants
export const TIMING = {
  immediate: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  slowest: 750,
} as const;

// Easing presets
export const EASING = {
  // iOS-like springs
  springGentle: { damping: 20, stiffness: 300 },
  springBouncy: { damping: 12, stiffness: 400 },
  springSnappy: { damping: 18, stiffness: 500 },
  
  // Material Design curves
  standard: Easing.cubic,
  decelerate: Easing.out(Easing.cubic),
  accelerate: Easing.in(Easing.cubic),
  accelerateDecelerate: Easing.inOut(Easing.cubic),
  
  // Custom curves
  bouncy: Easing.out(Easing.back(1.2)),
  dramatic: Easing.out(Easing.back(1.8)),
  elastic: Easing.elastic(2),
} as const;

export default MicroInteractions;