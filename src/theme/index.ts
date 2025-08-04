/**
 * Unified Theme System for ZapTap
 * Material Design 3 compliant with WCAG accessibility
 */

export * from './tokens';
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';

import { tokens } from './tokens';
import { lightColors, darkColors, oledDarkColors, getColors, type ColorScheme } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

// Theme mode type
export type ThemeMode = 'light' | 'dark' | 'oled-dark' | 'system';

// Complete theme interface
export interface Theme {
  mode: ThemeMode;
  colors: ColorScheme;
  tokens: typeof tokens;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: typeof shadows;
  animation: {
    spring: { type: 'spring'; damping: number; stiffness: number; mass: number };
    smooth: { type: 'timing'; duration: number };
    quick: { type: 'timing'; duration: number };
  };
  constants: {
    borderWidth: number;
    activeOpacity: number;
    disabledOpacity: number;
    headerHeight: number;
    tabBarHeight: number;
    floatingButtonSize: number;
    minTouchTarget: number; // WCAG accessibility
  };
  accessibility: {
    minTouchTarget: number;
    focusOutlineWidth: number;
    contrastRatios: {
      normal: number;
      large: number;
      graphical: number;
    };
  };
}

// Create theme for specific mode
export const createTheme = (mode: ThemeMode = 'light'): Theme => ({
  mode,
  colors: getColors(mode),
  tokens,
  typography,
  spacing,
  shadows,
  
  // Animation presets
  animation: {
    spring: {
      type: 'spring' as const,
      damping: 15,
      stiffness: 150,
      mass: 1,
    },
    smooth: {
      type: 'timing' as const,
      duration: 300,
    },
    quick: {
      type: 'timing' as const,
      duration: 150,
    },
  },
  
  // Constants with accessibility compliance
  constants: {
    borderWidth: 1,
    activeOpacity: 0.7,
    disabledOpacity: 0.5,
    headerHeight: 56,
    tabBarHeight: 64,
    floatingButtonSize: 56,
    minTouchTarget: 44, // WCAG minimum
  },
  
  // Accessibility standards
  accessibility: {
    minTouchTarget: 44, // WCAG 2.1 AA requirement
    focusOutlineWidth: 2,
    contrastRatios: {
      normal: 4.5, // WCAG AA for normal text
      large: 3.0,  // WCAG AA for large text (18pt+)
      graphical: 3.0, // WCAG AA for UI components
    },
  },
});

// Default themes
export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');
export const oledDarkTheme = createTheme('oled-dark');

// Theme helper functions
export const getTheme = (mode: ThemeMode = 'light'): Theme => {
  switch (mode) {
    case 'dark':
      return darkTheme;
    case 'oled-dark':
      return oledDarkTheme;
    default:
      return lightTheme;
  }
};

// Export for backward compatibility
export const theme = lightTheme;