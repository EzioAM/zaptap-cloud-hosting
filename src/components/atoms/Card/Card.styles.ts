import { StyleSheet } from 'react-native';
import { ColorScheme } from '../../../theme/colors';

// Safe fallback values
const FALLBACK_VALUES = {
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  constants: {
    borderWidth: 1,
    disabledOpacity: 0.5,
  },
};

export const styles = (colors: ColorScheme) => {
  // Use safe color access with fallbacks
  const surfaceElevated = colors?.surface?.elevated || colors?.surface || '#ffffff';
  const surfacePrimary = colors?.surface?.primary || colors?.surface || '#ffffff';
  const surfaceSecondary = colors?.surface?.secondary || colors?.surface || '#f5f5f5';
  const borderLight = colors?.border?.light || colors?.border || '#e0e0e0';

  return StyleSheet.create({
    base: {
      borderRadius: FALLBACK_VALUES.borderRadius.lg,
      overflow: 'hidden',
      position: 'relative',
    },
    
    disabled: {
      opacity: FALLBACK_VALUES.constants.disabledOpacity,
    },
    
    gradientOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.1,
    },
    
    // Size variants
    sizes: {
      small: {
        padding: FALLBACK_VALUES.spacing.sm,
        minHeight: 60,
      },
      medium: {
        padding: FALLBACK_VALUES.spacing.md,
        minHeight: 80,
      },
      large: {
        padding: FALLBACK_VALUES.spacing.lg,
        minHeight: 120,
      },
    },
    
    // Style variants
    variants: {
      elevated: {
        backgroundColor: surfaceElevated,
        borderWidth: 0,
      },
      outlined: {
        backgroundColor: surfacePrimary,
        borderWidth: FALLBACK_VALUES.constants.borderWidth,
        borderColor: borderLight,
      },
      filled: {
        backgroundColor: surfaceSecondary,
        borderWidth: 0,
      },
      gradient: {
        backgroundColor: surfacePrimary,
        borderWidth: 0,
      },
    },
  });
};