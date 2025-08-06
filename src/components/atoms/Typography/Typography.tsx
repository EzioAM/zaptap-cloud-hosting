/**
 * Enhanced Typography Component with Dynamic Scaling and Accessibility
 * Supports responsive text, accessibility features, and premium styling
 */

import React from 'react';
import {
  Text,
  TextProps,
  Platform,
  AccessibilityInfo,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import {
  typography,
  responsiveTypography,
  scaledFontSize,
  gradientTextStyle,
  TypographyScale,
} from '../../../theme/typography';

const AnimatedText = Animated.createAnimatedComponent(Text);

export type TypographyVariant = keyof TypographyScale;
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type TextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export interface TypographyProps extends Omit<TextProps, 'style'> {
  variant?: TypographyVariant;
  color?: string;
  textAlign?: TextAlign;
  textTransform?: TextTransform;
  gradient?: string;
  animated?: boolean;
  responsive?: boolean;
  scaleFactor?: number;
  maxFontSizeMultiplier?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  style?: TextStyle;
  children: React.ReactNode;
  
  // Accessibility enhancements
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'header' | 'text' | 'summary' | 'button';
  importanceLevel?: 1 | 2 | 3; // For semantic heading levels
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'bodyMedium',
  color,
  textAlign = 'left',
  textTransform = 'none',
  gradient,
  animated = false,
  responsive = true,
  scaleFactor = 1,
  maxFontSizeMultiplier = 2,
  adjustsFontSizeToFit = false,
  minimumFontScale = 0.85,
  style,
  children,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'text',
  importanceLevel,
  ...textProps
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  
  // Animation values for enhanced interactions
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Get base typography style
  const baseTypography = typography[variant];
  
  // Apply responsive scaling if enabled
  const fontSize = responsive && baseTypography.fontSize
    ? scaledFontSize(baseTypography.fontSize, scaleFactor)
    : baseTypography.fontSize;

  // Enhanced typography style
  const enhancedStyle = responsiveTypography(variant, {
    color: color || colors.text.primary,
    textAlign,
    textTransform,
    fontSize,
    // Enhanced text shadows for better readability
    ...(variant.includes('hero') && {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    }),
    // Better line height for readability
    lineHeight: baseTypography.lineHeight 
      ? baseTypography.lineHeight * (responsive ? scaleFactor : 1)
      : undefined,
  });

  // Gradient text style (web only)
  const gradientStyle = gradient 
    ? gradientTextStyle(gradient as any, color || colors.text.primary)
    : {};

  // Animation style
  const animatedStyle = useAnimatedStyle(() => {
    if (!animated) return {};
    
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // Accessibility enhancements
  const accessibilityProps = {
    accessibilityLabel: accessibilityLabel || (typeof children === 'string' ? children : undefined),
    accessibilityHint,
    accessibilityRole: importanceLevel ? 'header' : accessibilityRole,
    ...(Platform.OS === 'ios' && importanceLevel && {
      accessibilityTraits: ['header'],
    }),
    ...(Platform.OS === 'android' && importanceLevel && {
      importantForAccessibility: 'yes' as const,
    }),
  };

  // Font weight adjustments for better rendering
  const platformStyle = {
    // iOS font weight adjustments
    ...(Platform.OS === 'ios' && {
      fontWeight: baseTypography.fontWeight,
    }),
    // Android font family adjustments for better weight support
    ...(Platform.OS === 'android' && {
      fontFamily: baseTypography.fontFamily,
      fontWeight: baseTypography.fontWeight,
    }),
    // Web specific adjustments
    ...(Platform.OS === 'web' && {
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      textRendering: 'optimizeLegibility',
    }),
  };

  const finalStyle = [
    enhancedStyle,
    platformStyle,
    gradientStyle,
    style,
  ];

  if (animated) {
    return (
      <AnimatedText
        style={[finalStyle, animatedStyle]}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        adjustsFontSizeToFit={adjustsFontSizeToFit}
        minimumFontScale={minimumFontScale}
        {...accessibilityProps}
        {...textProps}
      >
        {children}
      </AnimatedText>
    );
  }

  return (
    <Text
      style={finalStyle}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale}
      {...accessibilityProps}
      {...textProps}
    >
      {children}
    </Text>
  );
};

// Convenience components for common use cases
export const Heading1: React.FC<Omit<TypographyProps, 'variant' | 'importanceLevel'>> = (props) => (
  <Typography variant="heroLarge" importanceLevel={1} accessibilityRole="header" {...props} />
);

export const Heading2: React.FC<Omit<TypographyProps, 'variant' | 'importanceLevel'>> = (props) => (
  <Typography variant="displayLarge" importanceLevel={2} accessibilityRole="header" {...props} />
);

export const Heading3: React.FC<Omit<TypographyProps, 'variant' | 'importanceLevel'>> = (props) => (
  <Typography variant="headlineLarge" importanceLevel={3} accessibilityRole="header" {...props} />
);

export const Heading4: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="headlineMedium" {...props} />
);

export const Heading5: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="headlineSmall" {...props} />
);

export const Heading6: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="titleLarge" {...props} />
);

export const Body: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="bodyLarge" {...props} />
);

export const BodySmall: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="bodyMedium" {...props} />
);

export const Caption: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="caption" {...props} />
);

export const Label: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="labelLarge" {...props} />
);

export const Code: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="code" {...props} />
);

export const Quote: React.FC<Omit<TypographyProps, 'variant'>> = (props) => (
  <Typography variant="quote" {...props} />
);

// Specialized components
export const LinkText: React.FC<TypographyProps & { onPress?: () => void }> = ({
  color,
  onPress,
  ...props
}) => {
  const theme = useSafeTheme();
  return (
    <Typography
      color={color || theme.colors.text.link}
      style={[
        {
          textDecorationLine: 'underline',
          textDecorationColor: color || theme.colors.text.link,
        },
        props.style,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      {...props}
    />
  );
};

export const ErrorText: React.FC<Omit<TypographyProps, 'color'>> = (props) => {
  const theme = useSafeTheme();
  return (
    <Typography
      color={theme.colors.semantic.error}
      variant="bodySmall"
      accessibilityRole="text"
      {...props}
    />
  );
};

export const SuccessText: React.FC<Omit<TypographyProps, 'color'>> = (props) => {
  const theme = useSafeTheme();
  return (
    <Typography
      color={theme.colors.semantic.success}
      variant="bodySmall"
      accessibilityRole="text"
      {...props}
    />
  );
};

export const WarningText: React.FC<Omit<TypographyProps, 'color'>> = (props) => {
  const theme = useSafeTheme();
  return (
    <Typography
      color={theme.colors.semantic.warning}
      variant="bodySmall"
      accessibilityRole="text"
      {...props}
    />
  );
};

// Animated typography for enhanced interactions
export const AnimatedHeading: React.FC<TypographyProps> = (props) => (
  <Typography animated variant="headlineLarge" {...props} />
);

export const AnimatedBody: React.FC<TypographyProps> = (props) => (
  <Typography animated variant="bodyLarge" {...props} />
);

// Gradient text components
export const GradientHeading: React.FC<TypographyProps & { gradient: string }> = ({
  gradient,
  ...props
}) => (
  <Typography
    variant="heroLarge"
    gradient={gradient}
    style={[
      Platform.OS === 'web' && {
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
      props.style,
    ]}
    {...props}
  />
);

export default Typography;