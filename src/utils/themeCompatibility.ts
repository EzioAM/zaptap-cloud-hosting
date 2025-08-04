/**
 * Theme Compatibility Layer
 * Provides backward compatibility for old theme structure
 */

import { Theme } from '../theme';

export const createCompatibleTheme = (theme: Theme) => {
  return {
    ...theme,
    colors: {
      // Keep new structure
      ...theme.colors,
      
      // Add backward compatibility aliases
      primary: theme.colors.brand.primary,
      primaryVariant: theme.colors.brand.primaryDark,
      secondary: theme.colors.brand.secondary,
      background: theme.colors.background.primary,
      surface: theme.colors.surface.primary,
      surfaceVariant: theme.colors.surface.secondary,
      error: theme.colors.semantic.error,
      text: theme.colors.text.primary,
      textSecondary: theme.colors.text.secondary,
      border: theme.colors.border.medium,
      divider: theme.colors.border.light,
      success: theme.colors.semantic.success,
      warning: theme.colors.semantic.warning,
      info: theme.colors.semantic.info,
      
      // Navigation specific
      tabBarBackground: theme.colors.surface.primary,
      tabBarActive: theme.colors.brand.primary,
      tabBarInactive: theme.colors.text.tertiary,
      
      // Card specific
      cardBackground: theme.colors.surface.primary,
      cardShadow: theme.colors.overlay.light,
    },
  };
};