/**
 * Typography System for ZapTap
 */

import { Platform, TextStyle } from 'react-native';
import { tokens } from './tokens';

export interface TypographyScale {
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
};

// Helper function to create responsive typography
export const responsiveTypography = (
  scale: keyof TypographyScale,
  options?: {
    color?: string;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  }
): TextStyle => {
  return {
    ...typography[scale],
    ...options,
  };
};