import React from 'react';
import {
  View,
  ViewStyle,
  Pressable,
  PressableProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../../contexts/ThemeContext';
import { theme } from '../../../theme';
import { useHaptic } from '../../../hooks/useHaptic';
import { styles } from './Card.styles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'gradient';
export type CardSize = 'small' | 'medium' | 'large';

export interface CardProps extends Omit<PressableProps, 'style'> {
  variant?: CardVariant;
  size?: CardSize;
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  haptic?: boolean;
  gradient?: string[];
  elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  size = 'medium',
  children,
  style,
  onPress,
  disabled = false,
  haptic = true,
  gradient,
  elevation = 'md',
  ...pressableProps
}) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const { trigger } = useHaptic();
  const scale = useSharedValue(1);
  const shadowScale = useSharedValue(1);

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(0.98, {
      damping: 15,
      stiffness: 400,
    });
    shadowScale.value = withSpring(0.9, {
      damping: 15,
      stiffness: 400,
    });
  };

  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
    shadowScale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
  };

  const handlePress = () => {
    if (!onPress) return;
    if (haptic && !disabled) {
      trigger('light');
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const animatedShadowStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      shadowScale.value,
      [0.9, 1],
      [0.05, 0.15]
    );
    
    return {
      shadowOpacity,
    };
  });

  const cardStyles = styles(colors);
  const sizeStyles = cardStyles.sizes[size];
  const variantStyles = cardStyles.variants[variant];
  const elevationStyles = variant === 'elevated' ? theme.shadows[elevation] : {};

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          animatedStyle,
          animatedShadowStyle,
          cardStyles.base,
          variantStyles,
          sizeStyles,
          elevationStyles,
          disabled && cardStyles.disabled,
          style,
        ]}
        {...pressableProps}
      >
        {gradient && variant === 'gradient' && (
          <View style={[cardStyles.gradientOverlay, { backgroundColor: gradient[0] }]} />
        )}
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <View
      style={[
        cardStyles.base,
        variantStyles,
        sizeStyles,
        elevationStyles,
        disabled && cardStyles.disabled,
        style,
      ]}
    >
      {gradient && variant === 'gradient' && (
        <View style={[cardStyles.gradientOverlay, { backgroundColor: gradient[0] }]} />
      )}
      {children}
    </View>
  );
};