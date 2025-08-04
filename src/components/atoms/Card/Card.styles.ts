import { StyleSheet } from 'react-native';
import { ColorScheme } from '../../../theme/colors';
import { theme } from '../../../theme';

export const styles = (colors: ColorScheme) => StyleSheet.create({
  base: {
    borderRadius: theme.tokens.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  
  disabled: {
    opacity: theme.constants.disabledOpacity,
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
      padding: theme.spacing.sm,
      minHeight: 60,
    },
    medium: {
      padding: theme.spacing.md,
      minHeight: 80,
    },
    large: {
      padding: theme.spacing.lg,
      minHeight: 120,
    },
  },
  
  // Style variants
  variants: {
    elevated: {
      backgroundColor: colors.surface.elevated,
      borderWidth: 0,
    },
    outlined: {
      backgroundColor: colors.surface.primary,
      borderWidth: theme.constants.borderWidth,
      borderColor: colors.border.light,
    },
    filled: {
      backgroundColor: colors.surface.secondary,
      borderWidth: 0,
    },
    gradient: {
      backgroundColor: colors.surface.primary,
      borderWidth: 0,
    },
  },
});