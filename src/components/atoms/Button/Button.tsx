import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  PressableProps,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../contexts/ThemeContext';
import { theme } from '../../../theme';
import { styles } from './Button.styles';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  haptic = true,
  style,
  textStyle,
  ...pressableProps
}) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 400,
    });
    opacity.value = withTiming(0.8, { duration: 100 });
  }, [scale, opacity]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
    opacity.value = withTiming(1, { duration: 100 });
  }, [scale, opacity]);

  const handlePress = useCallback(() => {
    if (haptic && !disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [onPress, haptic, disabled, loading]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: interpolate(
        opacity.value,
        [0.8, 1],
        [disabled ? 0.5 : 0.8, disabled ? 0.5 : 1]
      ),
    };
  });

  const buttonStyles = styles(colors);
  const sizeStyles = buttonStyles.sizes[size];
  const variantStyles = buttonStyles.variants[variant];
  const isDisabled = disabled || loading;

  const iconSize = {
    small: 16,
    medium: 20,
    large: 24,
  }[size];

  const renderIcon = () => {
    if (!icon && !loading) return null;

    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={variantStyles.text.color}
          style={iconPosition === 'left' ? { marginRight: 8 } : { marginLeft: 8 }}
        />
      );
    }

    return (
      <MaterialCommunityIcons
        name={icon}
        size={iconSize}
        color={variantStyles.text.color}
        style={iconPosition === 'left' ? { marginRight: 8 } : { marginLeft: 8 }}
      />
    );
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        animatedStyle,
        buttonStyles.base,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && buttonStyles.fullWidth,
        isDisabled && buttonStyles.disabled,
        style,
      ]}
      {...pressableProps}
    >
      <View style={buttonStyles.content}>
        {iconPosition === 'left' && renderIcon()}
        <Text
          style={[
            buttonStyles.text,
            variantStyles.text,
            sizeStyles.text,
            isDisabled && buttonStyles.disabledText,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {iconPosition === 'right' && renderIcon()}
      </View>
    </AnimatedPressable>
  );
};