/**
 * Preset animations for common UI patterns
 */

import { Animated } from 'react-native';
import { animationController } from './AnimationController';
import { DURATIONS, SPRING_CONFIGS } from './index';

export class PresetAnimations {
  // Entry animations
  static fadeInUp(
    opacity: Animated.Value,
    translateY: Animated.Value,
    config?: { duration?: number; delay?: number }
  ): Animated.CompositeAnimation {
    opacity.setValue(0);
    translateY.setValue(20);

    return Animated.parallel([
      animationController.createTiming(opacity, 1, {
        duration: config?.duration || DURATIONS.NORMAL,
        delay: config?.delay || 0,
      }),
      animationController.createSpring(translateY, 0, SPRING_CONFIGS.GENTLE),
    ]);
  }

  static fadeInDown(
    opacity: Animated.Value,
    translateY: Animated.Value,
    config?: { duration?: number; delay?: number }
  ): Animated.CompositeAnimation {
    opacity.setValue(0);
    translateY.setValue(-20);

    return Animated.parallel([
      animationController.createTiming(opacity, 1, {
        duration: config?.duration || DURATIONS.NORMAL,
        delay: config?.delay || 0,
      }),
      animationController.createSpring(translateY, 0, SPRING_CONFIGS.GENTLE),
    ]);
  }

  static fadeInScale(
    opacity: Animated.Value,
    scale: Animated.Value,
    config?: { duration?: number; delay?: number }
  ): Animated.CompositeAnimation {
    opacity.setValue(0);
    scale.setValue(0.8);

    return Animated.parallel([
      animationController.createTiming(opacity, 1, {
        duration: config?.duration || DURATIONS.NORMAL,
        delay: config?.delay || 0,
      }),
      animationController.createSpring(scale, 1, SPRING_CONFIGS.BOUNCY),
    ]);
  }

  // Exit animations
  static fadeOutUp(
    opacity: Animated.Value,
    translateY: Animated.Value,
    config?: { duration?: number }
  ): Animated.CompositeAnimation {
    return Animated.parallel([
      animationController.createTiming(opacity, 0, {
        duration: config?.duration || DURATIONS.FAST,
      }),
      animationController.createTiming(translateY, -20, {
        duration: config?.duration || DURATIONS.FAST,
      }),
    ]);
  }

  static fadeOutDown(
    opacity: Animated.Value,
    translateY: Animated.Value,
    config?: { duration?: number }
  ): Animated.CompositeAnimation {
    return Animated.parallel([
      animationController.createTiming(opacity, 0, {
        duration: config?.duration || DURATIONS.FAST,
      }),
      animationController.createTiming(translateY, 20, {
        duration: config?.duration || DURATIONS.FAST,
      }),
    ]);
  }

  static fadeOutScale(
    opacity: Animated.Value,
    scale: Animated.Value,
    config?: { duration?: number }
  ): Animated.CompositeAnimation {
    return Animated.parallel([
      animationController.createTiming(opacity, 0, {
        duration: config?.duration || DURATIONS.FAST,
      }),
      animationController.createTiming(scale, 0.8, {
        duration: config?.duration || DURATIONS.FAST,
      }),
    ]);
  }

  // Attention animations
  static pulse(
    scale: Animated.Value,
    config?: { intensity?: number; duration?: number }
  ): Animated.CompositeAnimation {
    const intensity = config?.intensity || 1.05;
    const duration = config?.duration || DURATIONS.NORMAL;

    return Animated.sequence([
      animationController.createTiming(scale, intensity, { duration: duration / 2 }),
      animationController.createTiming(scale, 1, { duration: duration / 2 }),
    ]);
  }

  static shake(
    translateX: Animated.Value,
    config?: { intensity?: number; duration?: number }
  ): Animated.CompositeAnimation {
    const intensity = config?.intensity || 10;
    const duration = config?.duration || DURATIONS.NORMAL;

    return Animated.sequence([
      animationController.createTiming(translateX, intensity, { duration: duration / 6 }),
      animationController.createTiming(translateX, -intensity, { duration: duration / 6 }),
      animationController.createTiming(translateX, intensity * 0.5, { duration: duration / 6 }),
      animationController.createTiming(translateX, -intensity * 0.5, { duration: duration / 6 }),
      animationController.createTiming(translateX, intensity * 0.25, { duration: duration / 6 }),
      animationController.createTiming(translateX, 0, { duration: duration / 6 }),
    ]);
  }

  static bounce(
    translateY: Animated.Value,
    config?: { height?: number; duration?: number }
  ): Animated.CompositeAnimation {
    const height = config?.height || 20;
    const duration = config?.duration || DURATIONS.NORMAL;

    return Animated.sequence([
      animationController.createTiming(translateY, -height, { duration: duration / 4 }),
      animationController.createSpring(translateY, 0, SPRING_CONFIGS.BOUNCY),
    ]);
  }

  static wobble(
    rotation: Animated.Value,
    config?: { intensity?: number; duration?: number }
  ): Animated.CompositeAnimation {
    const intensity = config?.intensity || 5;
    const duration = config?.duration || DURATIONS.NORMAL;

    return Animated.sequence([
      animationController.createTiming(rotation, intensity, { duration: duration / 4 }),
      animationController.createTiming(rotation, -intensity, { duration: duration / 4 }),
      animationController.createTiming(rotation, intensity * 0.5, { duration: duration / 4 }),
      animationController.createTiming(rotation, 0, { duration: duration / 4 }),
    ]);
  }

  // Slide animations
  static slideInLeft(
    translateX: Animated.Value,
    opacity: Animated.Value,
    config?: { distance?: number; duration?: number }
  ): Animated.CompositeAnimation {
    const distance = config?.distance || -100;
    translateX.setValue(distance);
    opacity.setValue(0);

    return Animated.parallel([
      animationController.createSpring(translateX, 0, SPRING_CONFIGS.GENTLE),
      animationController.createTiming(opacity, 1, {
        duration: config?.duration || DURATIONS.NORMAL,
      }),
    ]);
  }

  static slideInRight(
    translateX: Animated.Value,
    opacity: Animated.Value,
    config?: { distance?: number; duration?: number }
  ): Animated.CompositeAnimation {
    const distance = config?.distance || 100;
    translateX.setValue(distance);
    opacity.setValue(0);

    return Animated.parallel([
      animationController.createSpring(translateX, 0, SPRING_CONFIGS.GENTLE),
      animationController.createTiming(opacity, 1, {
        duration: config?.duration || DURATIONS.NORMAL,
      }),
    ]);
  }

  // Rotation animations
  static rotate(
    rotation: Animated.Value,
    config?: { degrees?: number; duration?: number }
  ): Animated.CompositeAnimation {
    const degrees = config?.degrees || 360;
    return animationController.createTiming(rotation, degrees, {
      duration: config?.duration || DURATIONS.NORMAL,
    });
  }

  static flip(
    rotateY: Animated.Value,
    config?: { duration?: number }
  ): Animated.CompositeAnimation {
    return animationController.createTiming(rotateY, 180, {
      duration: config?.duration || DURATIONS.NORMAL,
    });
  }

  // Complex animations
  static staggeredEntry(
    animations: Animated.Value[],
    config?: { staggerDelay?: number; duration?: number }
  ): Animated.CompositeAnimation {
    const staggerDelay = config?.staggerDelay || 50;
    const duration = config?.duration || DURATIONS.NORMAL;

    return animationController.createStagger(
      staggerDelay,
      animations.map((value) =>
        animationController.createTiming(value, 1, { duration })
      )
    );
  }

  static parallaxScroll(
    scrollY: Animated.Value,
    outputRange: number[],
    inputRange?: number[]
  ): Animated.AnimatedInterpolation {
    return animationController.createScrollAnimation(
      scrollY,
      inputRange || [0, 100, 200],
      outputRange,
      'clamp'
    );
  }

  // Micro-interactions
  static buttonPress(
    scale: Animated.Value,
    config?: { intensity?: number }
  ): Animated.CompositeAnimation {
    const intensity = config?.intensity || 0.95;
    return Animated.sequence([
      animationController.createTiming(scale, intensity, { duration: 50 }),
      animationController.createSpring(scale, 1, SPRING_CONFIGS.TIGHT),
    ]);
  }

  static cardExpand(
    scale: Animated.Value,
    opacity: Animated.Value,
    config?: { maxScale?: number; duration?: number }
  ): Animated.CompositeAnimation {
    const maxScale = config?.maxScale || 1.02;
    return Animated.parallel([
      animationController.createSpring(scale, maxScale, SPRING_CONFIGS.GENTLE),
      animationController.createTiming(opacity, 1, {
        duration: config?.duration || DURATIONS.FAST,
      }),
    ]);
  }

  // Loading animations
  static skeleton(
    shimmer: Animated.Value,
    config?: { duration?: number }
  ): Animated.CompositeAnimation {
    return Animated.loop(
      Animated.sequence([
        animationController.createTiming(shimmer, 1, {
          duration: config?.duration || 1000,
        }),
        animationController.createTiming(shimmer, 0, {
          duration: config?.duration || 1000,
        }),
      ])
    );
  }

  static spinner(
    rotation: Animated.Value,
    config?: { duration?: number }
  ): Animated.CompositeAnimation {
    return Animated.loop(
      animationController.createTiming(rotation, 360, {
        duration: config?.duration || 1000,
      })
    );
  }

  // Progress animations
  static progressBar(
    width: Animated.Value,
    toValue: number,
    config?: { duration?: number }
  ): Animated.CompositeAnimation {
    return animationController.createTiming(width, toValue, {
      duration: config?.duration || DURATIONS.NORMAL,
    });
  }

  static circularProgress(
    rotation: Animated.Value,
    toValue: number,
    config?: { duration?: number }
  ): Animated.CompositeAnimation {
    return animationController.createTiming(rotation, toValue, {
      duration: config?.duration || DURATIONS.NORMAL,
    });
  }
}