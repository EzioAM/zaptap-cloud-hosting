import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
  PressableProps,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { theme } from '../../../theme';
import { styles } from './Button.styles';
import { MicroInteractions } from '../../../utils/animations/MicroInteractions';

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
  pressAnimation?: 'scale' | 'elevation' | 'ripple';
  enableRipple?: boolean;
  elevateOnPress?: boolean;
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
  pressAnimation = 'scale',
  enableRipple = Platform.OS === 'android',
  elevateOnPress = true,
  ...pressableProps
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const elevation = useSharedValue(2);
  const rippleOpacity = useSharedValue(0);
  const rippleScale = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;

    // Apply animation based on type
    switch (pressAnimation) {
      case 'scale':
        MicroInteractions.buttonPress.scale(scale);
        break;
      case 'elevation':
        if (elevateOnPress) {
          MicroInteractions.buttonPress.elevationPress(elevation);
        }
        break;
      case 'ripple':
        if (enableRipple) {
          rippleScale.value = 0;
          rippleOpacity.value = 0;
          MicroInteractions.material3.rippleSpread(rippleScale, rippleOpacity);
        }
        break;
    }

    // Light opacity change for all variants
    opacity.value = withTiming(0.9, { duration: 100 });
  }, [disabled, loading, pressAnimation, elevateOnPress, enableRipple, scale, elevation, rippleScale, rippleOpacity, opacity]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;

    // Reset animations
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 400,
    });
    opacity.value = withTiming(1, { duration: 150 });
    
    if (elevateOnPress) {
      elevation.value = withTiming(2, { duration: 200 });
    }
  }, [disabled, loading, scale, opacity, elevation, elevateOnPress]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    
    if (haptic) {
      const feedbackType = variant === 'danger' ? 'heavy' : 
                          variant === 'primary' ? 'medium' : 'light';
      runOnJS(MicroInteractions.haptics[feedbackType])();
    }
    
    onPress();
  }, [onPress, haptic, disabled, loading, variant]);

  const animatedStyle = useAnimatedStyle(() => {
    const finalOpacity = disabled ? 0.5 : opacity.value;
    const scaleValue = pressAnimation === 'scale' ? scale.value : 1;
    
    return {
      transform: [{ scale: scaleValue }],
      opacity: finalOpacity,
      elevation: Platform.OS === 'android' && elevateOnPress ? elevation.value : 0,
      shadowOpacity: Platform.OS === 'ios' && elevateOnPress 
        ? interpolate(elevation.value, [2, 8], [0.15, 0.35]) 
        : 0,
      shadowRadius: Platform.OS === 'ios' && elevateOnPress
        ? interpolate(elevation.value, [2, 8], [3, 8])
        : 0,
      shadowOffset: Platform.OS === 'ios' && elevateOnPress
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

  const rippleColor = colors.states.pressed;

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
      android_ripple={
        enableRipple && Platform.OS === 'android'
          ? {
              color: rippleColor,
              borderless: false,
              radius: 200,
            }
          : undefined
      }
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
              backgroundColor: rippleColor,
              borderRadius: theme.tokens.borderRadius.lg,
            },
          ]}
          pointerEvents="none"
        />
      )}
    </AnimatedPressable>
  );
};