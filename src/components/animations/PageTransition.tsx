/**
 * Enhanced Page Transition Components
 * Smooth, platform-aware screen transitions with staggered animations
 */

import React, { useEffect } from 'react';
import {
  View,
  ViewStyle,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  Extrapolation,
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { MicroInteractions, ANIMATION_PRESETS } from '../../utils/animations/MicroInteractions';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export type TransitionDirection = 'left' | 'right' | 'up' | 'down' | 'fade' | 'scale';
export type TransitionDuration = 'fast' | 'normal' | 'slow';

const DURATION_VALUES = {
  fast: 250,
  normal: 350,
  slow: 500,
} as const;

export interface PageTransitionProps {
  children: React.ReactNode;
  direction?: TransitionDirection;
  duration?: TransitionDuration;
  delay?: number;
  style?: ViewStyle;
  onEnterComplete?: () => void;
  onExitComplete?: () => void;
}

// Main page transition wrapper
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  direction = 'right',
  duration = 'normal',
  delay = 0,
  style,
  onEnterComplete,
  onExitComplete,
}) => {
  const theme = useSafeTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const durationMs = DURATION_VALUES[duration];

  useEffect(() => {
    const enterAnimation = () => {
      switch (direction) {
        case 'right':
          translateX.value = SCREEN_WIDTH;
          translateX.value = withSpring(0, ANIMATION_PRESETS.spring.gentle, (finished) => {
            if (finished && onEnterComplete) {
              runOnJS(onEnterComplete)();
            }
          });
          break;
        case 'left':
          translateX.value = -SCREEN_WIDTH;
          translateX.value = withSpring(0, ANIMATION_PRESETS.spring.gentle, (finished) => {
            if (finished && onEnterComplete) {
              runOnJS(onEnterComplete)();
            }
          });
          break;
        case 'up':
          translateY.value = SCREEN_HEIGHT;
          translateY.value = withSpring(0, ANIMATION_PRESETS.spring.gentle, (finished) => {
            if (finished && onEnterComplete) {
              runOnJS(onEnterComplete)();
            }
          });
          break;
        case 'down':
          translateY.value = -SCREEN_HEIGHT;
          translateY.value = withSpring(0, ANIMATION_PRESETS.spring.gentle, (finished) => {
            if (finished && onEnterComplete) {
              runOnJS(onEnterComplete)();
            }
          });
          break;
        case 'scale':
          scale.value = 0.8;
          opacity.value = 0;
          scale.value = withSpring(1, ANIMATION_PRESETS.spring.bouncy);
          opacity.value = withTiming(1, { duration: durationMs }, (finished) => {
            if (finished && onEnterComplete) {
              runOnJS(onEnterComplete)();
            }
          });
          break;
        case 'fade':
        default:
          opacity.value = 0;
          opacity.value = withTiming(1, { duration: durationMs }, (finished) => {
            if (finished && onEnterComplete) {
              runOnJS(onEnterComplete)();
            }
          });
          break;
      }
    };

    const timeoutId = setTimeout(enterAnimation, delay);
    return () => clearTimeout(timeoutId);
  }, [direction, duration, delay, onEnterComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

// Staggered list animations
export interface StaggeredListProps {
  children: React.ReactElement[];
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  style?: ViewStyle;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 100,
  direction = 'up',
  duration = 400,
  style,
}) => {
  return (
    <View style={style}>
      {children.map((child, index) => {
        let entering;
        
        switch (direction) {
          case 'right':
            entering = SlideInRight.delay(index * staggerDelay).duration(duration);
            break;
          case 'left':
            entering = SlideInLeft.delay(index * staggerDelay).duration(duration);
            break;
          case 'down':
            entering = FadeIn.delay(index * staggerDelay).duration(duration);
            break;
          case 'up':
          default:
            entering = FadeIn.delay(index * staggerDelay).duration(duration);
            break;
        }

        return (
          <Animated.View key={index} entering={entering}>
            {child}
          </Animated.View>
        );
      })}
    </View>
  );
};

// Card stack transition
export interface CardStackTransitionProps {
  children: React.ReactNode;
  index: number;
  total: number;
  style?: ViewStyle;
}

export const CardStackTransition: React.FC<CardStackTransitionProps> = ({
  children,
  index,
  total,
  style,
}) => {
  const translateY = useSharedValue(100);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * 150;
    
    translateY.value = withDelay(
      delay,
      withSpring(0, ANIMATION_PRESETS.spring.gentle)
    );
    
    scale.value = withDelay(
      delay,
      withSpring(1, ANIMATION_PRESETS.spring.bouncy)
    );
    
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300 })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
    zIndex: total - index,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

// Modal transition
export interface ModalTransitionProps {
  children: React.ReactNode;
  isVisible: boolean;
  onAnimationComplete?: () => void;
  backdropOpacity?: number;
  style?: ViewStyle;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  children,
  isVisible,
  onAnimationComplete,
  backdropOpacity = 0.5,
  style,
}) => {
  const theme = useSafeTheme();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacityValue = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (isVisible) {
      // Show animation
      if (Platform.OS === 'ios') {
        // iOS modal style
        MicroInteractions.ios.modalPresent(translateY);
        scale.value = withSpring(1, ANIMATION_PRESETS.spring.gentle);
      } else {
        // Android modal style
        translateY.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.cubic),
        });
        scale.value = withTiming(1, { duration: 250 });
      }
      
      backdropOpacityValue.value = withTiming(backdropOpacity, { duration: 250 });
    } else {
      // Hide animation
      if (Platform.OS === 'ios') {
        MicroInteractions.ios.modalDismiss(translateY, SCREEN_HEIGHT);
      } else {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: 250,
          easing: Easing.in(Easing.cubic),
        });
      }
      
      scale.value = withTiming(0.9, { duration: 200 });
      backdropOpacityValue.value = withTiming(0, { duration: 200 }, (finished) => {
        if (finished && onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      });
    }
  }, [isVisible, onAnimationComplete, backdropOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacityValue.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!isVisible && backdropOpacityValue.value === 0) {
    return null;
  }

  return (
    <View style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 1000,
    }}>
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: theme.colors.overlay.dark,
          },
          backdropStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.surface.primary,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: SCREEN_HEIGHT * 0.9,
          },
          modalStyle,
          style,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
};

// Parallax scroll transition
export interface ParallaxViewProps {
  children: React.ReactNode;
  translateY: Animated.SharedValue<number>;
  scale?: number;
  opacity?: number;
  style?: ViewStyle;
}

export const ParallaxView: React.FC<ParallaxViewProps> = ({
  children,
  translateY,
  scale = 0.5,
  opacity = 0.8,
  style,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const parallaxTranslateY = translateY.value * scale;
    const parallaxOpacity = interpolate(
      Math.abs(translateY.value),
      [0, 200],
      [1, opacity],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY: parallaxTranslateY }],
      opacity: parallaxOpacity,
    };
  });

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

// Tab transition
export interface TabTransitionProps {
  children: React.ReactNode;
  activeIndex: number;
  index: number;
  style?: ViewStyle;
}

export const TabTransition: React.FC<TabTransitionProps> = ({
  children,
  activeIndex,
  index,
  style,
}) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const isActive = activeIndex === index;
    
    if (isActive) {
      scale.value = withSpring(1, ANIMATION_PRESETS.spring.gentle);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(0.95, ANIMATION_PRESETS.spring.gentle);
      opacity.value = withTiming(0.7, { duration: 200 });
    }
  }, [activeIndex, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

// Floating action button transition
export const FABTransition: React.FC<{
  children: React.ReactNode;
  isExpanded: boolean;
  style?: ViewStyle;
}> = ({ children, isExpanded, style }) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (isExpanded) {
      scale.value = withSpring(1.1, ANIMATION_PRESETS.spring.bouncy);
      rotation.value = withSpring(45, ANIMATION_PRESETS.spring.gentle);
    } else {
      scale.value = withSpring(1, ANIMATION_PRESETS.spring.gentle);
      rotation.value = withSpring(0, ANIMATION_PRESETS.spring.gentle);
    }
  }, [isExpanded]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

export default PageTransition;