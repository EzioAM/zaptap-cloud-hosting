import { StyleSheet } from 'react-native';
import { ColorScheme } from '../../../theme/colors';
import { theme } from '../../../theme';

export const styles = (colors: ColorScheme) => StyleSheet.create({
  base: {
    borderRadius: theme.tokens?.borderRadius?.lg || 12,
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
    ...(theme.typography?.labelLarge || { fontSize: 16, fontWeight: '600' }),
  },
  
  fullWidth: {
    width: '100%',
  },
  
  disabled: {
    opacity: theme.constants?.disabledOpacity || 0.5,
  },
  
  disabledText: {
    opacity: 0.7,
  },
  
  // Size variants
  sizes: {
    small: {
      container: {
        paddingHorizontal: (theme.spacing?.padding?.button?.horizontal || 16) * 0.75,
        paddingVertical: (theme.spacing?.padding?.button?.vertical || 12) * 0.75,
        minHeight: 32,
      },
      text: {
        ...(theme.typography?.labelMedium || { fontSize: 14, fontWeight: '500' }),
      },
    },
    medium: {
      container: {
        paddingHorizontal: theme.spacing?.padding?.button?.horizontal || 16,
        paddingVertical: theme.spacing?.padding?.button?.vertical || 12,
        minHeight: 44,
      },
      text: {
        ...(theme.typography?.labelLarge || { fontSize: 16, fontWeight: '600' }),
      },
    },
    large: {
      container: {
        paddingHorizontal: (theme.spacing?.padding?.button?.horizontal || 16) * 1.5,
        paddingVertical: (theme.spacing?.padding?.button?.vertical || 12) * 1.5,
        minHeight: 56,
      },
      text: {
        ...(theme.typography?.titleMedium || { fontSize: 18, fontWeight: '600' }),
      },
    },
  },
  
  // Style variants
  variants: {
    primary: {
      container: {
        backgroundColor: colors.brand?.primary || colors.primary || '#6200ee',
        ...(theme.shadows?.md || {}),
      },
      text: {
        color: colors.text?.inverse || '#FFFFFF',
        fontWeight: theme.tokens?.typography?.fontWeight?.semibold || '600',
      },
    },
    secondary: {
      container: {
        backgroundColor: colors.brand?.secondary || colors.secondary || '#03DAC6',
        ...(theme.shadows?.md || {}),
      },
      text: {
        color: colors.text?.inverse || '#FFFFFF',
        fontWeight: theme.tokens?.typography?.fontWeight?.semibold || '600',
      },
    },
    accent: {
      container: {
        backgroundColor: colors.brand?.accent || colors.tertiary || '#FF5722',
        ...(theme.shadows?.md || {}),
      },
      text: {
        color: colors.text?.inverse || '#FFFFFF',
        fontWeight: theme.tokens?.typography?.fontWeight?.semibold || '600',
      },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
      },
      text: {
        color: colors.brand?.primary || colors.primary || '#6200ee',
        fontWeight: theme.tokens?.typography?.fontWeight?.medium || '500',
      },
    },
    outline: {
      container: {
        backgroundColor: 'transparent',
        borderWidth: theme.constants?.borderWidth || 1,
        borderColor: colors.border?.medium || '#D1D5DB',
      },
      text: {
        color: colors.text?.primary || colors.onBackground || '#000000',
        fontWeight: theme.tokens?.typography?.fontWeight?.medium || '500',
      },
    },
    danger: {
      container: {
        backgroundColor: colors.semantic?.error || colors.error || '#B00020',
        ...(theme.shadows?.md || {}),
      },
      text: {
        color: colors.text?.inverse || '#FFFFFF',
        fontWeight: theme.tokens?.typography?.fontWeight?.semibold || '600',
      },
    },
  },
});