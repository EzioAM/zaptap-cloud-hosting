/**
 * Shadow/Elevation System for ZapTap
 */

import { Platform } from 'react-native';
import { tokens } from './tokens';

export type ShadowLevel = keyof typeof tokens.shadows;

// Platform-specific shadow implementations
export const shadows = {
  none: tokens.shadows.none,
  
  sm: Platform.select({
    ios: tokens.shadows.sm,
    android: {
      elevation: tokens.shadows.sm.elevation,
    },
  }),
  
  md: Platform.select({
    ios: tokens.shadows.md,
    android: {
      elevation: tokens.shadows.md.elevation,
    },
  }),
  
  lg: Platform.select({
    ios: tokens.shadows.lg,
    android: {
      elevation: tokens.shadows.lg.elevation,
    },
  }),
  
  xl: Platform.select({
    ios: tokens.shadows.xl,
    android: {
      elevation: tokens.shadows.xl.elevation,
    },
  }),
  
  '2xl': Platform.select({
    ios: tokens.shadows['2xl'],
    android: {
      elevation: tokens.shadows['2xl'].elevation,
    },
  }),
} as const;

// Colored shadows for special effects
export const coloredShadows = {
  primary: (opacity: number = 0.3) => Platform.select({
    ios: {
      shadowColor: tokens.colors.brand[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: opacity,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
  
  secondary: (opacity: number = 0.3) => Platform.select({
    ios: {
      shadowColor: tokens.colors.secondary[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: opacity,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
  
  accent: (opacity: number = 0.3) => Platform.select({
    ios: {
      shadowColor: tokens.colors.accent[500],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: opacity,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
  
  success: (opacity: number = 0.25) => Platform.select({
    ios: {
      shadowColor: tokens.colors.success.main,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: opacity,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
  }),
  
  error: (opacity: number = 0.25) => Platform.select({
    ios: {
      shadowColor: tokens.colors.error.main,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: opacity,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
  }),
};

// Dynamic shadow based on scroll position or elevation
export const dynamicShadow = (elevation: number) => {
  const maxElevation = 24;
  const normalizedElevation = Math.min(elevation, maxElevation);
  
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: normalizedElevation / 2,
      },
      shadowOpacity: 0.05 + (normalizedElevation / maxElevation) * 0.15,
      shadowRadius: normalizedElevation,
    },
    android: {
      elevation: normalizedElevation,
    },
  });
};

// Helper function to get shadow by name
export const getShadow = (level: ShadowLevel) => {
  return shadows[level];
};