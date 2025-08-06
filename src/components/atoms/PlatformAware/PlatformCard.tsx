import React, { useMemo } from 'react';
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
  withTiming,
} from 'react-native-reanimated';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { usePlatform } from '../../../hooks/usePlatform';
import { useHaptic } from '../../../hooks/useHaptic';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PlatformCardVariant = 'elevated' | 'outlined' | 'filled' | 'ghost';
export type PlatformCardElevation = 'none' | 'low' | 'medium' | 'high';

export interface PlatformCardProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  variant?: PlatformCardVariant;
  elevation?: PlatformCardElevation;
  padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
  margin?: number | { top?: number; bottom?: number; left?: number; right?: number };
  backgroundColor?: string;
  borderRadius?: number | 'small' | 'medium' | 'large' | 'full';
  interactive?: boolean;
  pressable?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

const getPaddingStyle = (
  padding: number | { top?: number; bottom?: number; left?: number; right?: number } | undefined
) => {
  if (typeof padding === 'number') {
    return { padding };
  }
  if (padding) {
    return {
      paddingTop: padding.top,
      paddingBottom: padding.bottom,
      paddingLeft: padding.left,
      paddingRight: padding.right,
    };
  }
  return {};
};

const getMarginStyle = (
  margin: number | { top?: number; bottom?: number; left?: number; right?: number } | undefined
) => {
  if (typeof margin === 'number') {
    return { margin };
  }
  if (margin) {
    return {
      marginTop: margin.top,
      marginBottom: margin.bottom,
      marginLeft: margin.left,
      marginRight: margin.right,
    };
  }
  return {};
};

export const PlatformCard: React.FC<PlatformCardProps> = ({
  children,
  variant = 'elevated',
  elevation = 'medium',
  padding = 16,
  margin,
  backgroundColor,
  borderRadius = 'medium',
  interactive = false,
  pressable = false,
  haptic = true,
  style,
  contentStyle,
  onPress,
  onPressIn,
  onPressOut,
  ...pressableProps
}) => {
  const theme = useSafeTheme();
  const platform = usePlatform();
  const { trigger: triggerHaptic } = useHaptic({ enabled: haptic });
  
  const colors = theme.colors;
  const scale = useSharedValue(1);
  const elevationValue = useSharedValue(1);

  // Determine if the card should be pressable
  const shouldBePressable = pressable || interactive || !!onPress;

  // Platform-specific card styles
  const cardStyles = useMemo(() => {
    const radiusValue = typeof borderRadius === 'number' 
      ? borderRadius 
      : platform.constants.borderRadius[borderRadius as keyof typeof platform.constants.borderRadius];

    // Get background color based on variant
    const getBackgroundColor = () => {
      if (backgroundColor) return backgroundColor;
      
      switch (variant) {
        case 'elevated':
          return colors.surface.elevated;
        case 'outlined':
          return colors.surface.primary;
        case 'filled':
          return colors.surface.secondary;
        case 'ghost':
          return 'transparent';
        default:
          return colors.surface.primary;
      }
    };

    // Get border styles based on variant
    const getBorderStyles = () => {
      switch (variant) {
        case 'outlined':
          return {
            borderWidth: 1,
            borderColor: colors.border.medium,
          };
        case 'ghost':
          return {};
        default:
          return {};
      }
    };

    // Get shadow/elevation styles based on platform
    const getElevationStyles = () => {
      if (elevation === 'none' || variant === 'ghost') {
        return {};
      }

      return platform.getShadowStyle(elevation);
    };

    return platform.select({
      ios: {
        borderRadius: radiusValue,
        backgroundColor: getBackgroundColor(),
        ...getBorderStyles(),
        ...getElevationStyles(),
        // iOS specific styling
        ...(variant === 'elevated' && {
          borderWidth: 0,
        }),
      },
      android: {
        borderRadius: radiusValue,
        backgroundColor: getBackgroundColor(),
        ...getBorderStyles(),
        ...getElevationStyles(),
        // Android specific styling
        overflow: 'hidden' as const, // For ripple effect
      },
      web: {
        borderRadius: radiusValue,
        backgroundColor: getBackgroundColor(),
        ...getBorderStyles(),
        ...getElevationStyles(),
        // Web specific styling
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        ...(shouldBePressable && {
          cursor: 'pointer',
          userSelect: 'none' as const,
        }),
      },
      default: {
        borderRadius: radiusValue,
        backgroundColor: getBackgroundColor(),
        ...getBorderStyles(),
        ...getElevationStyles(),
      },
    });
  }, [variant, elevation, borderRadius, backgroundColor, colors, platform, shouldBePressable]);

  // Animation handlers
  const handlePressIn = React.useCallback((event: any) => {
    if (!shouldBePressable) return;

    // Platform-specific press animations
    if (platform.isIOS) {
      scale.value = withSpring(0.98, { damping: 20, stiffness: 300 });
    } else if (platform.isAndroid) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
      elevationValue.value = withTiming(1.2, { duration: 150 });
    } else {
      scale.value = withSpring(0.99, { damping: 25, stiffness: 500 });
    }

    onPressIn?.(event);
  }, [shouldBePressable, platform, scale, elevationValue, onPressIn]);

  const handlePressOut = React.useCallback((event: any) => {
    if (!shouldBePressable) return;

    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    elevationValue.value = withTiming(1, { duration: 150 });

    onPressOut?.(event);
  }, [shouldBePressable, scale, elevationValue, onPressOut]);

  const handlePress = React.useCallback((event: any) => {
    if (haptic) {
      triggerHaptic('light');
    }
    onPress?.(event);
  }, [onPress, haptic, triggerHaptic]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      ...(platform.isAndroid && elevation !== 'none' && {
        elevation: platform.constants.elevation[elevation] * elevationValue.value,
      }),
    };
  });

  const paddingStyle = getPaddingStyle(padding);
  const marginStyle = getMarginStyle(margin);

  // Render as pressable if interactive
  if (shouldBePressable) {
    const pressablePropsWithPlatform = platform.select({
      android: {
        ...pressableProps,
        android_ripple: {
          color: colors.states.pressed,
          borderless: false,
        },
      },
      ios: pressableProps,
      web: {
        ...pressableProps,
        style: ({ pressed }: { pressed: boolean }) => [
          animatedStyle,
          cardStyles,
          paddingStyle,
          marginStyle,
          pressed && {
            transform: [{ scale: 0.99 }],
            ...(elevation !== 'none' && {
              boxShadow: platform.getShadowStyle('low').boxShadow,
            }),
          },
          style,
        ],
      },
      default: pressableProps,
    });

    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...pressablePropsWithPlatform}
        style={[
          animatedStyle,
          cardStyles,
          paddingStyle,
          marginStyle,
          style,
        ]}
        hitSlop={interactive ? platform.getHitSlop('small') : undefined}
      >
        <View style={contentStyle}>
          {children}
        </View>
      </AnimatedPressable>
    );
  }

  // Render as static view
  return (
    <AnimatedView
      style={[
        cardStyles,
        paddingStyle,
        marginStyle,
        style,
      ]}
    >
      <View style={contentStyle}>
        {children}
      </View>
    </AnimatedView>
  );
};

// Pre-configured card variants for common use cases
export const ElevatedCard: React.FC<Omit<PlatformCardProps, 'variant'>> = (props) => (
  <PlatformCard variant="elevated" {...props} />
);

export const OutlinedCard: React.FC<Omit<PlatformCardProps, 'variant'>> = (props) => (
  <PlatformCard variant="outlined" {...props} />
);

export const FilledCard: React.FC<Omit<PlatformCardProps, 'variant'>> = (props) => (
  <PlatformCard variant="filled" {...props} />
);

export const GhostCard: React.FC<Omit<PlatformCardProps, 'variant'>> = (props) => (
  <PlatformCard variant="ghost" elevation="none" {...props} />
);