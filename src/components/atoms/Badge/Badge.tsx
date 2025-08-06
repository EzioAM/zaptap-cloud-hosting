import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
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
  const theme = useSafeTheme();
  const colors = theme.colors;
  
  const variantColors = {
    default: {
      background: colors?.surface?.tertiary || colors?.surface || '#f5f5f5',
      text: colors?.text?.secondary || colors?.onSurfaceVariant || '#666666',
    },
    success: {
      background: `${colors?.semantic?.success || '#4CAF50'}15`,
      text: colors?.semantic?.success || '#4CAF50',
    },
    error: {
      background: `${colors?.semantic?.error || colors?.error || '#F44336'}15`,
      text: colors?.semantic?.error || colors?.error || '#F44336',
    },
    warning: {
      background: `${colors?.semantic?.warning || '#FF9800'}15`,
      text: colors?.semantic?.warning || '#FF9800',
    },
    info: {
      background: `${colors?.semantic?.info || '#2196F3'}15`,
      text: colors?.semantic?.info || '#2196F3',
    },
  };
  
  const sizeStyles = {
    small: {
      paddingHorizontal: theme.spacing?.xs || 4,
      paddingVertical: 2,
      fontSize: theme.typography?.caption?.fontSize || 12,
    },
    medium: {
      paddingHorizontal: theme.spacing?.sm || 8,
      paddingVertical: 4,
      fontSize: theme.typography?.bodySmall?.fontSize || 14,
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