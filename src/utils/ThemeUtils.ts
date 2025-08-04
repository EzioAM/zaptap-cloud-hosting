/**
 * Theme Utility Functions
 * Provides helper functions for consistent theme usage across components
 */

import { Theme } from '../theme';

// Color manipulation utilities
export const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const addOpacity = (color: string, opacity: number): string => {
  if (color.startsWith('#')) {
    return hexToRgba(color, opacity);
  }
  return color; // Return as-is if not hex
};

// Accessibility utilities
export const getAccessibleTextColor = (backgroundColor: string, theme: Theme): string => {
  // Simplified logic - in production, calculate actual contrast ratios
  if (theme.mode === 'dark') {
    return theme.colors.text.primary;
  }
  return theme.colors.text.primary;
};

export const ensureMinTouchTarget = (size: number, theme: Theme): number => {
  return Math.max(size, theme.accessibility.minTouchTarget);
};

// Common style patterns
export const createShadowStyle = (elevation: keyof typeof theme.shadows, theme: Theme) => {
  return theme.shadows[elevation];
};

export const createRoundedStyle = (radius: keyof typeof theme.tokens.borderRadius) => ({
  borderRadius: theme.tokens.borderRadius[radius],
});

// Interactive state styles
export const createInteractiveStyles = (theme: Theme) => ({
  pressed: {
    opacity: theme.constants.activeOpacity,
    backgroundColor: theme.colors.states.pressed,
  },
  disabled: {
    opacity: theme.constants.disabledOpacity,
    backgroundColor: theme.colors.states.disabled,
  },
  focused: {
    borderWidth: theme.accessibility.focusOutlineWidth,
    borderColor: theme.colors.states.focus,
  },
});

// Common component style factories
export const createCardStyle = (theme: Theme, elevated = true) => ({
  backgroundColor: theme.colors.surface.primary,
  borderRadius: theme.tokens.borderRadius.lg,
  padding: theme.spacing.md,
  ...(elevated ? theme.shadows.md : {}),
});

export const createButtonStyle = (
  theme: Theme, 
  variant: 'primary' | 'secondary' | 'outline' = 'primary'
) => {
  const baseStyle = {
    borderRadius: theme.tokens.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: theme.accessibility.minTouchTarget,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };

  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.brand.primary,
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: theme.colors.brand.secondary,
      };
    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: theme.constants.borderWidth,
        borderColor: theme.colors.border.medium,
      };
    default:
      return baseStyle;
  }
};

export const createInputStyle = (theme: Theme, hasError = false) => ({
  backgroundColor: theme.colors.surface.secondary,
  borderRadius: theme.tokens.borderRadius.md,
  paddingHorizontal: theme.spacing.md,
  paddingVertical: theme.spacing.sm,
  fontSize: theme.typography.fontSize.base,
  color: theme.colors.text.primary,
  borderWidth: theme.constants.borderWidth,
  borderColor: hasError ? theme.colors.semantic.error : theme.colors.border.light,
  minHeight: theme.accessibility.minTouchTarget,
});

// Typography utilities
export const createTextStyle = (
  theme: Theme,
  variant: keyof typeof theme.tokens.typography.fontSize,
  weight: keyof typeof theme.tokens.typography.fontWeight = 'regular',
  color?: string
) => ({
  fontSize: theme.tokens.typography.fontSize[variant],
  fontWeight: theme.tokens.typography.fontWeight[weight],
  color: color || theme.colors.text.primary,
  fontFamily: theme.tokens.typography.fontFamily.sans,
});

// Layout utilities
export const createFlexLayout = (
  direction: 'row' | 'column' = 'column',
  justify: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' = 'flex-start',
  align: 'flex-start' | 'center' | 'flex-end' | 'stretch' = 'flex-start'
) => ({
  flexDirection: direction,
  justifyContent: justify,
  alignItems: align,
});

// Animation utilities
export const createAnimationConfig = (
  theme: Theme, 
  type: keyof typeof theme.animation = 'smooth'
) => theme.animation[type];

// Responsive utilities (for future tablet support)
export const createResponsiveStyle = (
  theme: Theme,
  mobileStyle: object,
  tabletStyle?: object
) => {
  // For now, just return mobile style
  // In future, check screen dimensions and return appropriate style
  return mobileStyle;
};

// Theme debugging utilities (development only)
export const logThemeUsage = (componentName: string, theme: Theme) => {
  if (__DEV__) {
    console.log(`[Theme Debug] ${componentName} using theme mode: ${theme.mode}`);
  }
};

// Safe color access with fallback
export const safeColorAccess = (
  theme: Theme,
  colorPath: string,
  fallback: string = theme.colors.text.primary
): string => {
  try {
    const pathArray = colorPath.split('.');
    let current: any = theme.colors;
    
    for (const key of pathArray) {
      current = current[key];
      if (current === undefined) {
        console.warn(`[Theme] Color path ${colorPath} not found, using fallback`);
        return fallback;
      }
    }
    
    return current;
  } catch (error) {
    console.warn(`[Theme] Error accessing color path ${colorPath}, using fallback`);
    return fallback;
  }
};

// Export commonly used style combinations
export const commonStyles = (theme: Theme) => ({
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  spacedRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  paddedContainer: {
    padding: theme.spacing.lg,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border.light,
    marginVertical: theme.spacing.sm,
  },
});