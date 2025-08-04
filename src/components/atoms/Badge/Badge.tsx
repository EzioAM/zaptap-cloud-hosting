import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { theme } from '../../../theme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  size?: 'small' | 'medium';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  style,
}) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  
  const variantColors = {
    default: {
      background: colors.surface.tertiary,
      text: colors.text.secondary,
    },
    success: {
      background: `${colors.semantic.success}15`,
      text: colors.semantic.success,
    },
    error: {
      background: `${colors.semantic.error}15`,
      text: colors.semantic.error,
    },
    warning: {
      background: `${colors.semantic.warning}15`,
      text: colors.semantic.warning,
    },
    info: {
      background: `${colors.semantic.info}15`,
      text: colors.semantic.info,
    },
  };
  
  const sizeStyles = {
    small: {
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      fontSize: theme.typography.caption.fontSize,
    },
    medium: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      fontSize: theme.typography.bodySmall.fontSize,
    },
  };
  
  const variantStyle = variantColors[variant];
  const sizeStyle = sizeStyles[size];
  
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantStyle.background,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: variantStyle.text,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.tokens.borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});