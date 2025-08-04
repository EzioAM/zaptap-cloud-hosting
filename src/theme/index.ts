/**
 * Central theme export for ZapTap design system
 */

export * from './tokens';
export * from './colors';
export * from './typography';
export * from './spacing';
export * from './shadows';

import { tokens } from './tokens';
import { lightColors, darkColors, oledDarkColors, getColors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

// Complete theme object
export const theme = {
  tokens,
  colors: {
    light: lightColors,
    dark: darkColors,
    oledDark: oledDarkColors,
  },
  typography,
  spacing,
  shadows,
  
  // Helper methods
  getColors,
  
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
  
  // Commonly used values
  constants: {
    borderWidth: 1,
    activeOpacity: 0.7,
    disabledOpacity: 0.5,
    headerHeight: 56,
    tabBarHeight: 64,
    floatingButtonSize: 56,
  },
} as const;

export type Theme = typeof theme;

// Type for theme mode
export type ThemeMode = 'light' | 'dark' | 'oled-dark' | 'system';