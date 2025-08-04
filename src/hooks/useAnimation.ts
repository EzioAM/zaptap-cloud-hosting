import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  SharedValue,
} from 'react-native-reanimated';

// Common animation configurations
export const animationConfigs = {
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  timing: {
    duration: 300,
    easing: Easing.inOut(Easing.ease),
  },
  quick: {
    duration: 150,
    easing: Easing.out(Easing.ease),
  },
};

// Hook for press animations
export const usePressAnimation = (scaleTo: number = 0.95) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const onPressIn = useCallback(() => {
    scale.value = withSpring(scaleTo, animationConfigs.spring);
    opacity.value = withTiming(0.8, { duration: 100 });
  }, [scale, opacity, scaleTo]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, animationConfigs.spring);
    opacity.value = withTiming(1, { duration: 100 });
  }, [scale, opacity]);

  return {
    animatedStyle,
    onPressIn,
    onPressOut,
  };
};

// Hook for fade in/out animations
export const useFadeAnimation = (initialOpacity: number = 0) => {
  const opacity = useSharedValue(initialOpacity);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const fadeIn = useCallback(
    (duration: number = 300) => {
      opacity.value = withTiming(1, { duration });
    },
    [opacity]
  );

  const fadeOut = useCallback(
    (duration: number = 300) => {
      opacity.value = withTiming(0, { duration });
    },
    [opacity]
  );

  return {
    animatedStyle,
    fadeIn,
    fadeOut,
    opacity,
  };
};

// Hook for slide animations
export const useSlideAnimation = (
  direction: 'left' | 'right' | 'up' | 'down' = 'up',
  distance: number = 100
) => {
  const translateX = useSharedValue(
    direction === 'left' ? -distance : direction === 'right' ? distance : 0
  );
  const translateY = useSharedValue(
    direction === 'up' ? distance : direction === 'down' ? -distance : 0
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  const slideIn = useCallback(
    (duration: number = 300) => {
      translateX.value = withTiming(0, { duration });
      translateY.value = withTiming(0, { duration });
    },
    [translateX, translateY]
  );

  const slideOut = useCallback(
    (duration: number = 300) => {
      if (direction === 'left') {
        translateX.value = withTiming(-distance, { duration });
      } else if (direction === 'right') {
        translateX.value = withTiming(distance, { duration });
      } else if (direction === 'up') {
        translateY.value = withTiming(distance, { duration });
      } else if (direction === 'down') {
        translateY.value = withTiming(-distance, { duration });
      }
    },
    [translateX, translateY, direction, distance]
  );

  return {
    animatedStyle,
    slideIn,
    slideOut,
  };
};

// Hook for bounce animation
export const useBounceAnimation = () => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const bounce = useCallback(() => {
    scale.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withSpring(1, animationConfigs.spring)
    );
  }, [scale]);

  return {
    animatedStyle,
    bounce,
  };
};

// Hook for shake animation
export const useShakeAnimation = () => {
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const shake = useCallback(() => {
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [translateX]);

  return {
    animatedStyle,
    shake,
  };
};

// Hook for rotation animation
export const useRotationAnimation = (initialRotation: number = 0) => {
  const rotation = useSharedValue(initialRotation);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const rotate = useCallback(
    (degrees: number, duration: number = 300) => {
      rotation.value = withTiming(degrees, { duration });
    },
    [rotation]
  );

  const spin = useCallback(
    (duration: number = 1000) => {
      rotation.value = withTiming(rotation.value + 360, {
        duration,
        easing: Easing.linear,
      });
    },
    [rotation]
  );

  return {
    animatedStyle,
    rotate,
    spin,
    rotation,
  };
};