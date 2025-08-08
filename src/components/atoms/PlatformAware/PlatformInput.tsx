import React, { useState, useCallback, useMemo, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { usePlatform } from '../../../hooks/usePlatform';
import { useHaptic } from '../../../hooks/useHaptic';
import { useOptimizedTextInput } from '../../../utils/textInputFixes';

const AnimatedView = Animated.createAnimatedComponent(View);

export type PlatformInputVariant = 'outlined' | 'filled' | 'underlined' | 'minimal';
export type PlatformInputSize = 'small' | 'medium' | 'large';

export interface PlatformInputProps extends Omit<TextInputProps, 'style'> {
  variant?: PlatformInputVariant;
  size?: PlatformInputSize;
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onRightIconPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  required?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  containerStyle?: ViewStyle;
}

export const PlatformInput = forwardRef<TextInput, PlatformInputProps>(({
  variant = 'outlined',
  size = 'medium',
  label,
  helperText,
  errorText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  disabled = false,
  loading = false,
  required = false,
  haptic = true,
  style,
  inputStyle,
  labelStyle,
  containerStyle,
  onFocus,
  onBlur,
  value,
  ...textInputProps
}, ref) => {
  const theme = useSafeTheme();
  const platform = usePlatform();
  const { trigger: triggerHaptic } = useHaptic({ enabled: haptic });
  
  const colors = theme.colors;
  const [isFocused, setIsFocused] = useState(false);
  const [isFloating, setIsFloating] = useState(false);
  
  const focusAnimation = useSharedValue(0);
  const labelAnimation = useSharedValue(0);

  // Platform-specific configurations
  const platformConfig = useMemo(() => {
    return platform.select({
      ios: {
        defaultVariant: 'minimal' as const,
        focusStyle: 'subtle',
        borderWidth: 1,
        selectionColor: colors.brand.primary,
      },
      android: {
        defaultVariant: 'outlined' as const,
        focusStyle: 'prominent',
        borderWidth: 2,
        selectionColor: colors.brand.primary,
      },
      web: {
        defaultVariant: 'outlined' as const,
        focusStyle: 'prominent',
        borderWidth: 1,
        selectionColor: colors.brand.primary,
      },
      default: {
        defaultVariant: 'outlined' as const,
        focusStyle: 'prominent',
        borderWidth: 1,
        selectionColor: colors.brand.primary,
      },
    });
  }, [platform, colors]);

  // Size configurations
  const sizeConfig = useMemo(() => {
    return {
      small: {
        height: 36,
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 8,
        iconSize: 16,
        labelFontSize: 12,
      },
      medium: {
        height: 44,
        fontSize: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        iconSize: 20,
        labelFontSize: 14,
      },
      large: {
        height: 52,
        fontSize: 18,
        paddingHorizontal: 20,
        paddingVertical: 16,
        iconSize: 24,
        labelFontSize: 16,
      },
    }[size];
  }, [size]);

  // Determine if label should float
  React.useEffect(() => {
    const shouldFloat = isFocused || (value && value.length > 0);
    setIsFloating(shouldFloat);
    
    labelAnimation.value = withTiming(shouldFloat ? 1 : 0, { duration: 200 });
  }, [isFocused, value, labelAnimation]);

  React.useEffect(() => {
    focusAnimation.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused, focusAnimation]);

  const handleFocus = useCallback((event: any) => {
    setIsFocused(true);
    if (haptic) {
      triggerHaptic('selection');
    }
    onFocus?.(event);
  }, [onFocus, haptic, triggerHaptic]);

  const handleBlur = useCallback((event: any) => {
    setIsFocused(false);
    onBlur?.(event);
  }, [onBlur]);

  // Apply iOS text input optimizations
  const optimizedProps = useOptimizedTextInput({
    ...textInputProps,
    value,
    onFocus: handleFocus,
    onBlur: handleBlur,
    editable: !disabled && !loading,
    selectionColor: platformConfig.selectionColor,
    placeholderTextColor: colors.text.tertiary,
  });

  // Platform-specific input styles
  const inputStyles = useMemo(() => {
    const baseStyles = {
      fontSize: sizeConfig.fontSize,
      color: disabled ? colors.text.tertiary : colors.text.primary,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      paddingVertical: sizeConfig.paddingVertical,
      minHeight: sizeConfig.height,
    };

    const variantStyles = {
      outlined: {
        borderWidth: platformConfig.borderWidth,
        borderColor: errorText 
          ? colors.semantic.error 
          : isFocused 
            ? colors.brand.primary 
            : colors.border.medium,
        borderRadius: platform.constants.borderRadius.medium,
        backgroundColor: disabled ? colors.surface.secondary : colors.surface.primary,
      },
      filled: {
        backgroundColor: disabled 
          ? colors.surface.secondary 
          : isFocused 
            ? colors.surface.primary 
            : colors.surface.secondary,
        borderRadius: platform.constants.borderRadius.medium,
        borderBottomWidth: 2,
        borderBottomColor: errorText 
          ? colors.semantic.error 
          : isFocused 
            ? colors.brand.primary 
            : 'transparent',
      },
      underlined: {
        backgroundColor: 'transparent',
        borderBottomWidth: platformConfig.borderWidth,
        borderBottomColor: errorText 
          ? colors.semantic.error 
          : isFocused 
            ? colors.brand.primary 
            : colors.border.medium,
        paddingHorizontal: 0,
      },
      minimal: platform.select({
        ios: {
          backgroundColor: 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: errorText 
            ? colors.semantic.error 
            : colors.border.light,
          borderRadius: 0,
          paddingHorizontal: 0,
        },
        default: {
          borderWidth: 1,
          borderColor: errorText 
            ? colors.semantic.error 
            : isFocused 
              ? colors.brand.primary 
              : colors.border.medium,
          borderRadius: platform.constants.borderRadius.small,
          backgroundColor: colors.surface.primary,
        },
      }),
    };

    return {
      ...baseStyles,
      ...variantStyles[variant],
    };
  }, [
    sizeConfig,
    disabled,
    colors,
    platformConfig,
    errorText,
    isFocused,
    platform,
    variant,
  ]);

  // Label styles with floating animation
  const animatedLabelStyle = useAnimatedStyle(() => {
    const shouldFloat = variant === 'outlined' || variant === 'filled';
    
    if (!shouldFloat || !label) {
      return {};
    }

    const translateY = interpolateColor(
      labelAnimation.value,
      [0, 1],
      [0, -sizeConfig.height * 0.6]
    );

    const fontSize = interpolateColor(
      labelAnimation.value,
      [0, 1],
      [sizeConfig.fontSize, sizeConfig.labelFontSize]
    );

    return {
      transform: [{ translateY: translateY as any }],
      fontSize: fontSize as any,
      color: errorText 
        ? colors.semantic.error 
        : isFocused 
          ? colors.brand.primary 
          : colors.text.secondary,
    };
  });

  // Container focus animation
  const animatedContainerStyle = useAnimatedStyle(() => {
    if (variant === 'outlined') {
      return {
        borderColor: interpolateColor(
          focusAnimation.value,
          [0, 1],
          [errorText ? colors.semantic.error : colors.border.medium, colors.brand.primary]
        ),
      };
    }
    return {};
  });

  const iconColor = errorText 
    ? colors.semantic.error 
    : isFocused 
      ? colors.brand.primary 
      : colors.text.tertiary;

  const hasError = !!errorText;
  const showHelperText = helperText && !errorText;

  return (
    <View style={[containerStyle]}>
      {/* Static label for non-floating variants */}
      {label && (variant === 'underlined' || variant === 'minimal') && (
        <Text
          style={[
            {
              fontSize: sizeConfig.labelFontSize,
              color: colors.text.secondary,
              marginBottom: 4,
              fontWeight: '500',
            },
            labelStyle,
            hasError && { color: colors.semantic.error },
            required && { fontWeight: '600' },
          ]}
        >
          {label}
          {required && <Text style={{ color: colors.semantic.error }}>*</Text>}
        </Text>
      )}

      <AnimatedView
        style={[
          {
            position: 'relative',
            flexDirection: 'row',
            alignItems: 'center',
          },
          animatedContainerStyle,
          style,
        ]}
      >
        {/* Floating label */}
        {label && (variant === 'outlined' || variant === 'filled') && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: leftIcon ? sizeConfig.paddingHorizontal + sizeConfig.iconSize + 8 : sizeConfig.paddingHorizontal,
                zIndex: 1,
                backgroundColor: variant === 'outlined' ? colors.surface.primary : 'transparent',
                paddingHorizontal: variant === 'outlined' ? 4 : 0,
              },
            ]}
            pointerEvents="none"
          >
            <Animated.Text
              style={[
                {
                  fontSize: sizeConfig.fontSize,
                  color: colors.text.secondary,
                  fontWeight: '500',
                },
                animatedLabelStyle,
                labelStyle,
              ]}
            >
              {label}
              {required && <Text style={{ color: colors.semantic.error }}>*</Text>}
            </Animated.Text>
          </Animated.View>
        )}

        {/* Left icon */}
        {leftIcon && (
          <MaterialCommunityIcons
            name={leftIcon}
            size={sizeConfig.iconSize}
            color={iconColor}
            style={{ marginLeft: sizeConfig.paddingHorizontal, marginRight: 8 }}
          />
        )}

        {/* Text input */}
        <TextInput
          ref={ref}
          style={[
            inputStyles,
            {
              flex: 1,
              paddingLeft: leftIcon ? 0 : inputStyles.paddingHorizontal,
              paddingRight: rightIcon ? 0 : inputStyles.paddingHorizontal,
            },
            inputStyle,
          ]}
          {...optimizedProps}
        />

        {/* Right icon */}
        {rightIcon && (
          <MaterialCommunityIcons
            name={rightIcon}
            size={sizeConfig.iconSize}
            color={iconColor}
            style={{ marginRight: sizeConfig.paddingHorizontal, marginLeft: 8 }}
            onPress={onRightIconPress}
          />
        )}
      </AnimatedView>

      {/* Helper text or error text */}
      {(showHelperText || hasError) && (
        <Text
          style={{
            fontSize: sizeConfig.labelFontSize - 1,
            color: hasError ? colors.semantic.error : colors.text.tertiary,
            marginTop: 4,
            marginLeft: 4,
          }}
        >
          {hasError ? errorText : helperText}
        </Text>
      )}
    </View>
  );
});