import React, { useCallback, useMemo } from 'react';
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
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { usePlatform } from '../../../hooks/usePlatform';
import { useHaptic } from '../../../hooks/useHaptic';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PlatformButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'danger' | 'system';
export type PlatformButtonSize = 'small' | 'medium' | 'large';

export interface PlatformButtonProps extends Omit<PressableProps, 'style'> {
  variant?: PlatformButtonVariant;
  size?: PlatformButtonSize;
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

export const PlatformButton: React.FC<PlatformButtonProps> = ({
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
  const theme = useSafeTheme();
  const platform = usePlatform();
  const { trigger: triggerHaptic } = useHaptic({ enabled: haptic });
  
  const colors = theme.colors;
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Platform-specific animation configs
  const animationConfig = useMemo(() => {
    return platform.select({
      ios: {
        scale: { damping: 20, stiffness: 300 },
        opacity: { duration: 100 },
        pressScale: 0.97,
      },
      android: {
        scale: { damping: 15, stiffness: 400 },
        opacity: { duration: 150 },
        pressScale: 0.95,
      },
      web: {
        scale: { damping: 25, stiffness: 500 },
        opacity: { duration: 80 },
        pressScale: 0.98,
      },
      default: {
        scale: { damping: 15, stiffness: 400 },
        opacity: { duration: 150 },
        pressScale: 0.95,
      },
    });
  }, [platform]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(animationConfig.pressScale, animationConfig.scale);
    
    // Platform-specific press feedback
    if (platform.isAndroid) {
      // Android uses ripple effect handled by Pressable
      opacity.value = withTiming(0.9, animationConfig.opacity);
    } else if (platform.isIOS) {
      // iOS uses scale animation primarily
      opacity.value = withTiming(0.85, animationConfig.opacity);
    } else {
      // Web uses subtle opacity change
      opacity.value = withTiming(0.95, animationConfig.opacity);
    }
  }, [scale, opacity, animationConfig, platform]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animationConfig.scale);
    opacity.value = withTiming(1, animationConfig.opacity);
  }, [scale, opacity, animationConfig]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    
    if (haptic) {
      triggerHaptic('light');
    }
    onPress();
  }, [onPress, haptic, disabled, loading, triggerHaptic]);

  // Platform-specific styles
  const platformStyles = useMemo(() => {
    const baseHeight = {
      small: 32,
      medium: 44,
      large: 52,
    }[size];

    const basePadding = {
      small: { horizontal: 12, vertical: 6 },
      medium: { horizontal: 16, vertical: 12 },
      large: { horizontal: 20, vertical: 16 },
    }[size];

    const fontSize = {
      small: 14,
      medium: 16,
      large: 18,
    }[size];

    // Get platform-appropriate shadow
    const shadowStyle = platform.getShadowStyle('medium');

    return platform.select({
      ios: {
        container: {
          borderRadius: platform.constants.borderRadius.medium,
          minHeight: baseHeight,
          paddingHorizontal: basePadding.horizontal,
          paddingVertical: basePadding.vertical,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          flexDirection: 'row' as const,
          ...shadowStyle,
        },
        text: {
          fontSize,
          fontWeight: '600' as const,
          textAlign: 'center' as const,
        },
      },
      android: {
        container: {
          borderRadius: platform.constants.borderRadius.small,
          minHeight: baseHeight,
          paddingHorizontal: basePadding.horizontal,
          paddingVertical: basePadding.vertical,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          flexDirection: 'row' as const,
          ...shadowStyle,
        },
        text: {
          fontSize,
          fontWeight: '500' as const,
          textAlign: 'center' as const,
          textTransform: 'uppercase' as const,
        },
      },
      web: {
        container: {
          borderRadius: platform.constants.borderRadius.medium,
          minHeight: baseHeight,
          paddingHorizontal: basePadding.horizontal,
          paddingVertical: basePadding.vertical,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          flexDirection: 'row' as const,
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none' as const,
          ...shadowStyle,
        },
        text: {
          fontSize,
          fontWeight: '500' as const,
          textAlign: 'center' as const,
        },
      },
      default: {
        container: {
          borderRadius: platform.constants.borderRadius.medium,
          minHeight: baseHeight,
          paddingHorizontal: basePadding.horizontal,
          paddingVertical: basePadding.vertical,
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          flexDirection: 'row' as const,
        },
        text: {
          fontSize,
          fontWeight: '500' as const,
          textAlign: 'center' as const,
        },
      },
    });
  }, [size, platform, disabled]);

  // Variant-specific styles
  const variantStyles = useMemo(() => {
    const variants = {
      primary: {
        backgroundColor: colors.brand.primary,
        color: colors.text.inverse,
      },
      secondary: {
        backgroundColor: colors.surface.secondary,
        color: colors.text.primary,
        borderWidth: 1,
        borderColor: colors.border.medium,
      },
      accent: {
        backgroundColor: colors.brand.accent,
        color: colors.text.inverse,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: colors.brand.primary,
      },
      outline: {
        backgroundColor: 'transparent',
        color: colors.brand.primary,
        borderWidth: 1,
        borderColor: colors.brand.primary,
      },
      danger: {
        backgroundColor: colors.semantic.error,
        color: colors.text.inverse,
      },
      system: platform.select({
        ios: {
          backgroundColor: colors.brand.primary,
          color: colors.text.inverse,
        },
        android: {
          backgroundColor: colors.brand.primary,
          color: colors.text.inverse,
        },
        default: {
          backgroundColor: colors.surface.primary,
          color: colors.text.primary,
          borderWidth: 1,
          borderColor: colors.border.medium,
        },
      }),
    };

    return variants[variant] || variants.primary;
  }, [variant, colors, platform]);

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
          color={variantStyles.color}
          style={iconPosition === 'left' ? { marginRight: 8 } : { marginLeft: 8 }}
        />
      );
    }

    return (
      <MaterialCommunityIcons
        name={icon}
        size={iconSize}
        color={variantStyles.color}
        style={iconPosition === 'left' ? { marginRight: 8 } : { marginLeft: 8 }}
      />
    );
  };

  // Platform-specific pressable props
  const pressableProps_ = useMemo(() => {
    const baseProps = {
      onPress: handlePress,
      onPressIn: handlePressIn,
      onPressOut: handlePressOut,
      disabled: isDisabled,
      ...pressableProps,
    };

    return platform.select({
      android: {
        ...baseProps,
        android_ripple: {
          color: colors.states.pressed,
          borderless: false,
        },
      },
      ios: baseProps,
      web: {
        ...baseProps,
        style: ({ pressed }: { pressed: boolean }) => [
          platformStyles.container,
          variantStyles,
          fullWidth && { alignSelf: 'stretch' as const },
          isDisabled && { opacity: 0.5 },
          pressed && { opacity: 0.8 },
          style,
        ],
      },
      default: baseProps,
    });
  }, [
    handlePress,
    handlePressIn,
    handlePressOut,
    isDisabled,
    pressableProps,
    platform,
    colors,
    platformStyles,
    variantStyles,
    fullWidth,
    style,
  ]);

  return (
    <AnimatedPressable
      {...pressableProps_}
      style={[
        animatedStyle,
        platformStyles.container,
        variantStyles,
        fullWidth && { alignSelf: 'stretch' },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
      hitSlop={platform.getHitSlop('medium')}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {iconPosition === 'left' && renderIcon()}
        <Text
          style={[
            platformStyles.text,
            { color: variantStyles.color },
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