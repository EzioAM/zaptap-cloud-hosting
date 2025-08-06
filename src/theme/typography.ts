/**
 * Typography System for ZapTap
 */

import { Platform, TextStyle } from 'react-native';
import { tokens } from './tokens';
import { gradients, getGradientStyle } from './gradients';

export interface TypographyScale {
  // Hero styles - extra large for landing pages
  heroXLarge: TextStyle;
  heroLarge: TextStyle;
  heroMedium: TextStyle;
  
  // Display styles
  displayLarge: TextStyle;
  displayMedium: TextStyle;
  displaySmall: TextStyle;
  
  // Headline styles
  headlineLarge: TextStyle;
  headlineMedium: TextStyle;
  headlineSmall: TextStyle;
  
  // Title styles
  titleLarge: TextStyle;
  titleMedium: TextStyle;
  titleSmall: TextStyle;
  
  // Body styles
  bodyLarge: TextStyle;
  bodyMedium: TextStyle;
  bodySmall: TextStyle;
  
  // Label styles
  labelLarge: TextStyle;
  labelMedium: TextStyle;
  labelSmall: TextStyle;
  
  // Special styles
  caption: TextStyle;
  overline: TextStyle;
  code: TextStyle;
  quote: TextStyle;
  emphasis: TextStyle;
}

// Platform-specific font families
const getFontFamily = (weight: keyof typeof tokens.typography.fontWeight = 'regular') => {
  if (Platform.OS === 'ios') {
    switch (weight) {
      case 'thin': return 'System';
      case 'light': return 'System';
      case 'regular': return 'System';
      case 'medium': return 'System';
      case 'semibold': return 'System';
      case 'bold': return 'System';
      case 'extrabold': return 'System';
      case 'black': return 'System';
      default: return 'System';
    }
  } else {
    // Android
    switch (weight) {
      case 'thin': return 'sans-serif-thin';
      case 'light': return 'sans-serif-light';
      case 'regular': return 'sans-serif';
      case 'medium': return 'sans-serif-medium';
      case 'semibold': return 'sans-serif-medium';
      case 'bold': return 'sans-serif';
      case 'extrabold': return 'sans-serif';
      case 'black': return 'sans-serif-black';
      default: return 'sans-serif';
    }
  }
};

export const typography: TypographyScale = {
  // Hero styles - for landing pages and hero sections
  heroXLarge: {
    fontFamily: getFontFamily('black'),
    fontSize: 72,
    fontWeight: '900' as TextStyle['fontWeight'],
    lineHeight: 72 * 1.1,
    letterSpacing: -2,
  },
  heroLarge: {
    fontFamily: getFontFamily('extrabold'),
    fontSize: 56,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 56 * 1.15,
    letterSpacing: -1.5,
  },
  heroMedium: {
    fontFamily: getFontFamily('bold'),
    fontSize: 48,
    fontWeight: tokens.typography.fontWeight.bold,
    lineHeight: 48 * 1.2,
    letterSpacing: -1,
  },
  
  // Display styles - for large headings
  displayLarge: {
    fontFamily: getFontFamily('bold'),
    fontSize: tokens.typography.fontSize['5xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    lineHeight: tokens.typography.fontSize['5xl'] * tokens.typography.lineHeight.tight,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontFamily: getFontFamily('semibold'),
    fontSize: tokens.typography.fontSize['4xl'],
    fontWeight: tokens.typography.fontWeight.semibold,
    lineHeight: tokens.typography.fontSize['4xl'] * tokens.typography.lineHeight.tight,
    letterSpacing: -0.25,
  },
  displaySmall: {
    fontFamily: getFontFamily('semibold'),
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.semibold,
    lineHeight: tokens.typography.fontSize['3xl'] * tokens.typography.lineHeight.snug,
    letterSpacing: 0,
  },
  
  // Headline styles - for section headings
  headlineLarge: {
    fontFamily: getFontFamily('semibold'),
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.semibold,
    lineHeight: tokens.typography.fontSize['2xl'] * tokens.typography.lineHeight.snug,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamily: getFontFamily('medium'),
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.fontSize.xl * tokens.typography.lineHeight.normal,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamily: getFontFamily('medium'),
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.fontSize.lg * tokens.typography.lineHeight.normal,
    letterSpacing: 0,
  },
  
  // Title styles - for component titles
  titleLarge: {
    fontFamily: getFontFamily('semibold'),
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.semibold,
    lineHeight: tokens.typography.fontSize.lg * tokens.typography.lineHeight.normal,
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamily: getFontFamily('medium'),
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.fontSize.base * tokens.typography.lineHeight.normal,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamily: getFontFamily('medium'),
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.fontSize.sm * tokens.typography.lineHeight.normal,
    letterSpacing: 0.1,
  },
  
  // Body styles - for regular text
  bodyLarge: {
    fontFamily: getFontFamily('regular'),
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.regular,
    lineHeight: tokens.typography.fontSize.base * tokens.typography.lineHeight.relaxed,
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontFamily: getFontFamily('regular'),
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.regular,
    lineHeight: tokens.typography.fontSize.sm * tokens.typography.lineHeight.relaxed,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamily: getFontFamily('regular'),
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.regular,
    lineHeight: tokens.typography.fontSize.xs * tokens.typography.lineHeight.relaxed,
    letterSpacing: 0.4,
  },
  
  // Label styles - for UI labels and buttons
  labelLarge: {
    fontFamily: getFontFamily('medium'),
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.fontSize.sm * tokens.typography.lineHeight.normal,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: getFontFamily('medium'),
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: tokens.typography.fontSize.xs * tokens.typography.lineHeight.normal,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamily: getFontFamily('medium'),
    fontSize: 11,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  
  // Special styles
  caption: {
    fontFamily: getFontFamily('regular'),
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.regular,
    lineHeight: tokens.typography.fontSize.xs * tokens.typography.lineHeight.normal,
    letterSpacing: 0.4,
  },
  overline: {
    fontFamily: getFontFamily('medium'),
    fontSize: 10,
    fontWeight: tokens.typography.fontWeight.medium,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.regular,
    lineHeight: tokens.typography.fontSize.sm * tokens.typography.lineHeight.normal,
    letterSpacing: 0,
  },
  quote: {
    fontFamily: getFontFamily('light'),
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: tokens.typography.fontWeight.light,
    lineHeight: tokens.typography.fontSize.lg * tokens.typography.lineHeight.relaxed,
    letterSpacing: 0.25,
    fontStyle: 'italic',
  },
  emphasis: {
    fontFamily: getFontFamily('semibold'),
    fontSize: tokens.typography.fontSize.base,
    fontWeight: tokens.typography.fontWeight.semibold,
    lineHeight: tokens.typography.fontSize.base * tokens.typography.lineHeight.normal,
    letterSpacing: 0.75,
  },
};

// Helper function to create responsive typography
export const responsiveTypography = (
  scale: keyof TypographyScale,
  options?: {
    color?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through';
    textShadowColor?: string;
    textShadowOffset?: { width: number; height: number };
    textShadowRadius?: number;
  }
): TextStyle => {
  return {
    ...typography[scale],
    ...options,
  };
};

// Variable font weight utilities
export const fontWeights = {
  thin: '100' as TextStyle['fontWeight'],
  extralight: '200' as TextStyle['fontWeight'],
  light: '300' as TextStyle['fontWeight'],
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  extrabold: '800' as TextStyle['fontWeight'],
  black: '900' as TextStyle['fontWeight'],
};

// Letter spacing utilities
export const letterSpacing = {
  tightest: -2,
  tighter: -1.5,
  tight: -1,
  normal: 0,
  wide: 0.5,
  wider: 1,
  widest: 2,
  tracked: 3,
};

// Line height utilities
export const lineHeights = {
  compressed: 1,
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.75,
  loose: 2,
  double: 2.5,
};

// Text shadow presets
export const textShadows = {
  none: {},
  subtle: {
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  medium: {
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  strong: {
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  glow: {
    textShadowColor: 'rgba(99, 102, 241, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  neon: {
    textShadowColor: 'rgba(236, 72, 153, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
};

// Gradient text helper (for web)
export const gradientTextStyle = (gradientKey: keyof typeof gradients, fallbackColor?: string): any => {
  if (Platform.OS === 'web') {
    return {
      background: getGradientStyle(gradients[gradientKey], true),
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      color: 'transparent',
    };
  }
  // For native, return fallback color
  return {
    color: fallbackColor || gradients[gradientKey].colors[0],
  };
};

// Dynamic font scaling
export const scaledFontSize = (baseSize: number, scaleFactor: number = 1): number => {
  const minScale = 0.85;
  const maxScale = 1.5;
  const clampedScale = Math.max(minScale, Math.min(maxScale, scaleFactor));
  return Math.round(baseSize * clampedScale);
};

// Fluid typography for responsive design
export const fluidTypography = (
  minSize: number,
  maxSize: number,
  minViewport: number = 320,
  maxViewport: number = 1200
): number => {
  // This would need actual viewport dimensions in a real implementation
  // For now, return a middle value
  return Math.round((minSize + maxSize) / 2);
};