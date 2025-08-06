/**
 * Enhanced Interactive Element with Premium Feedback
 * Provides consistent micro-interactions across the app
 */

import React, { useCallback } from 'react';
import {
  View,
  Pressable,
  ViewStyle,
  Platform,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { MicroInteractions } from '../../../utils/animations/MicroInteractions';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface InteractiveElementProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'selection' | 'none';
  pressAnimation?: 'scale' | 'opacity' | 'elevation' | 'ripple' | 'none';
  pressScale?: number;
  style?: ViewStyle;
  rippleColor?: string;
  enableRipple?: boolean;
  borderRadius?: number;
  delayLongPress?: number;
}

export const InteractiveElement: React.FC<InteractiveElementProps> = ({
  children,
  onPress,
  onLongPress,
  disabled = false,
  hapticFeedback = 'light',
  pressAnimation = 'scale',
  pressScale = 0.95,
  style,
  rippleColor,
  enableRipple = Platform.OS === 'android',
  borderRadius = 8,
  delayLongPress = 500,
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const elevation = useSharedValue(2);
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);

  // Handle press events with haptic feedback
  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;

    // Apply animation based on type
    switch (pressAnimation) {
      case 'scale':
        MicroInteractions.buttonPress.scale(scale);
        break;
      case 'opacity':
        opacity.value = 0.7;
        break;
      case 'elevation':
        MicroInteractions.buttonPress.elevationPress(elevation);
        break;
      case 'ripple':
        if (enableRipple) {
          rippleScale.value = 0;
          rippleOpacity.value = 0;
          MicroInteractions.material3.rippleSpread(rippleScale, rippleOpacity);
        }
        break;
    }

    // Haptic feedback
    if (hapticFeedback !== 'none') {
      runOnJS(MicroInteractions.haptics[hapticFeedback])();
    }
  }, [
    disabled,
    pressAnimation,
    hapticFeedback,
    enableRipple,
    scale,
    opacity,
    elevation,
    rippleScale,
    rippleOpacity,
    pressScale,
  ]);

  const handlePressOut = useCallback(() => {
    if (disabled) return;

    // Reset animations
    if (pressAnimation === 'scale') {
      scale.value = 1;
    } else if (pressAnimation === 'opacity') {
      opacity.value = 1;
    } else if (pressAnimation === 'elevation') {
      elevation.value = 2;
    }
  }, [disabled, pressAnimation, scale, opacity, elevation]);

  const handlePress = useCallback(() => {
    if (disabled || !onPress) return;
    onPress();
  }, [disabled, onPress]);

  const handleLongPress = useCallback(() => {
    if (disabled || !onLongPress) return;
    
    // Heavy haptic feedback for long press
    if (hapticFeedback !== 'none') {
      runOnJS(MicroInteractions.haptics.heavy)();
    }
    
    onLongPress();
  }, [disabled, onLongPress, hapticFeedback]);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    const scaleValue = pressAnimation === 'scale' ? scale.value : 1;
    const opacityValue = pressAnimation === 'opacity' ? opacity.value : (disabled ? 0.5 : 1);
    
    return {
      transform: [{ scale: scaleValue }],
      opacity: opacityValue,
      elevation: Platform.OS === 'android' && pressAnimation === 'elevation' ? elevation.value : 0,
      shadowOpacity: Platform.OS === 'ios' && pressAnimation === 'elevation' 
        ? interpolate(elevation.value, [2, 8], [0.1, 0.3]) 
        : 0,
      shadowRadius: Platform.OS === 'ios' && pressAnimation === 'elevation'
        ? interpolate(elevation.value, [2, 8], [2, 8])
        : 0,
      shadowOffset: Platform.OS === 'ios' && pressAnimation === 'elevation'
        ? {
            width: 0,
            height: interpolate(elevation.value, [2, 8], [1, 4]),
          }
        : { width: 0, height: 0 },
    };
  });

  const rippleAnimatedStyle = useAnimatedStyle(() => {
    if (!enableRipple || pressAnimation !== 'ripple') {
      return { opacity: 0 };
    }

    return {
      opacity: rippleOpacity.value,
      transform: [{ scale: rippleScale.value }],
    };
  });

  const rippleColorValue = rippleColor || colors.states.pressed;

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      delayLongPress={delayLongPress}
      disabled={disabled}
      style={[
        animatedStyle,
        style,
        {
          overflow: 'hidden',
          borderRadius,
        },
      ]}
      android_ripple={
        enableRipple && Platform.OS === 'android'
          ? {
              color: rippleColorValue,
              borderless: false,
              radius: 200,
            }
          : undefined
      }
    >
      <View style={{ flex: 1 }}>
        {children}
        
        {/* Custom ripple effect for iOS and consistent cross-platform behavior */}
        {enableRipple && pressAnimation === 'ripple' && Platform.OS === 'ios' && (
          <Animated.View
            style={[
              rippleAnimatedStyle,
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: rippleColorValue,
                borderRadius,
              },
            ]}
            pointerEvents="none"
          />
        )}
      </View>
    </AnimatedPressable>
  );
};

// Preset interactive components
export const PressableCard: React.FC<InteractiveElementProps & { elevation?: number }> = ({
  elevation = 2,
  borderRadius = 12,
  pressAnimation = 'elevation',
  hapticFeedback = 'light',
  ...props
}) => (
  <InteractiveElement
    borderRadius={borderRadius}
    pressAnimation={pressAnimation}
    hapticFeedback={hapticFeedback}
    style={[
      {
        backgroundColor: 'white',
        borderRadius,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: elevation / 2 },
        shadowOpacity: 0.1,
        shadowRadius: elevation,
        elevation,
      },
      props.style,
    ]}
    {...props}
  />
);

export const PressableButton: React.FC<InteractiveElementProps> = ({
  pressAnimation = 'scale',
  hapticFeedback = 'medium',
  borderRadius = 8,
  ...props
}) => (
  <InteractiveElement
    borderRadius={borderRadius}
    pressAnimation={pressAnimation}
    hapticFeedback={hapticFeedback}
    {...props}
  />
);

export const PressableIconButton: React.FC<InteractiveElementProps> = ({
  pressAnimation = 'scale',
  hapticFeedback = 'selection',
  borderRadius = 24,
  pressScale = 0.9,
  ...props
}) => (
  <InteractiveElement
    borderRadius={borderRadius}
    pressAnimation={pressAnimation}
    hapticFeedback={hapticFeedback}
    pressScale={pressScale}
    {...props}
  />
);

export default InteractiveElement;