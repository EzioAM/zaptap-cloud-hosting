/**
 * Spacing System for ZapTap
 * Based on 8-point grid system
 */

import { tokens } from './tokens';

export const spacing = {
  // Base spacing values
  ...tokens.spacing,
  
  // Component-specific spacing
  padding: {
    button: {
      horizontal: tokens.spacing.md,
      vertical: tokens.spacing.sm,
    },
    card: {
      all: tokens.spacing.md,
      horizontal: tokens.spacing.md,
      vertical: tokens.spacing.md,
    },
    screen: {
      horizontal: tokens.spacing.md,
      vertical: tokens.spacing.lg,
    },
    input: {
      horizontal: tokens.spacing.md,
      vertical: tokens.spacing.sm,
    },
  },
  
  margin: {
    section: tokens.spacing.xl,
    element: tokens.spacing.md,
    text: tokens.spacing.sm,
  },
  
  gap: {
    xs: tokens.spacing.xs,
    sm: tokens.spacing.sm,
    md: tokens.spacing.md,
    lg: tokens.spacing.lg,
    xl: tokens.spacing.xl,
  },
  
  // Layout helpers
  layout: {
    screenPadding: tokens.spacing.md,
    containerMaxWidth: 600,
    gridGap: tokens.spacing.md,
  },
} as const;

// Helper functions for spacing
export const getSpacing = (...values: (keyof typeof tokens.spacing)[]) => {
  return values.map(value => tokens.spacing[value]).join(' ');
};

export const multiplySpacing = (value: keyof typeof tokens.spacing, multiplier: number) => {
  return tokens.spacing[value] * multiplier;
};