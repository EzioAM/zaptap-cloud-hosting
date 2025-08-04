import { StyleSheet } from 'react-native';
import { ColorScheme } from '../../../theme/colors';
import { theme } from '../../../theme';

export const styles = (colors: ColorScheme) => StyleSheet.create({
  base: {
    borderRadius: theme.tokens.borderRadius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  text: {
    textAlign: 'center',
    ...theme.typography.labelLarge,
  },
  
  fullWidth: {
    width: '100%',
  },
  
  disabled: {
    opacity: theme.constants.disabledOpacity,
  },
  
  disabledText: {
    opacity: 0.7,
  },
  
  // Size variants
  sizes: {
    small: {
      container: {
        paddingHorizontal: theme.spacing.padding.button.horizontal * 0.75,
        paddingVertical: theme.spacing.padding.button.vertical * 0.75,
        minHeight: 32,
      },
      text: {
        ...theme.typography.labelMedium,
      },
    },
    medium: {
      container: {
        paddingHorizontal: theme.spacing.padding.button.horizontal,
        paddingVertical: theme.spacing.padding.button.vertical,
        minHeight: 44,
      },
      text: {
        ...theme.typography.labelLarge,
      },
    },
    large: {
      container: {
        paddingHorizontal: theme.spacing.padding.button.horizontal * 1.5,
        paddingVertical: theme.spacing.padding.button.vertical * 1.5,
        minHeight: 56,
      },
      text: {
        ...theme.typography.titleMedium,
      },
    },
  },
  
  // Style variants
  variants: {
    primary: {
      container: {
        backgroundColor: colors.brand.primary,
        ...theme.shadows.md,
      },
      text: {
        color: colors.text.inverse,
        fontWeight: theme.tokens.typography.fontWeight.semibold,
      },
    },
    secondary: {
      container: {
        backgroundColor: colors.brand.secondary,
        ...theme.shadows.md,
      },
      text: {
        color: colors.text.inverse,
        fontWeight: theme.tokens.typography.fontWeight.semibold,
      },
    },
    accent: {
      container: {
        backgroundColor: colors.brand.accent,
        ...theme.shadows.md,
      },
      text: {
        color: colors.text.inverse,
        fontWeight: theme.tokens.typography.fontWeight.semibold,
      },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
      },
      text: {
        color: colors.brand.primary,
        fontWeight: theme.tokens.typography.fontWeight.medium,
      },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: theme.constants.borderWidth,
        borderColor: colors.border.medium,
      },
      text: {
        color: colors.text.primary,
        fontWeight: theme.tokens.typography.fontWeight.medium,
      },
    },
    danger: {
      container: {
        backgroundColor: colors.semantic.error,
        ...theme.shadows.md,
      },
      text: {
        color: colors.text.inverse,
        fontWeight: theme.tokens.typography.fontWeight.semibold,
      },
    },
  },
});