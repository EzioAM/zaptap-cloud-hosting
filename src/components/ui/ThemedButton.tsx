/**
 * Themed Button Component
 * Material Design 3 compliant with full accessibility support
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  AccessibilityRole,
  GestureResponderEvent,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUnifiedTheme } from '../../contexts/UnifiedThemeProvider';
import { createButtonStyle, createTextStyle, ensureMinTouchTarget } from '../../utils/ThemeUtils';

export interface ThemedButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: any;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const ThemedButton: React.FC<ThemedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { theme } = useUnifiedTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          minHeight: ensureMinTouchTarget(32, theme),
        };
      case 'large':
        return {
          paddingHorizontal: theme.spacing.xl,
          paddingVertical: theme.spacing.lg,
          minHeight: ensureMinTouchTarget(56, theme),
        };
      default:
        return {
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          minHeight: theme.accessibility.minTouchTarget,
        };
    }
  };

  const getVariantStyles = () => {
    const baseStyle = {
      borderRadius: theme.tokens.borderRadius.lg,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      ...getSizeStyles(),
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.states.disabled : theme.colors.brand.primary,
          ...theme.shadows.sm,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.states.disabled : theme.colors.brand.secondary,
          ...theme.shadows.sm,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: theme.constants.borderWidth,
          borderColor: disabled ? theme.colors.states.disabled : theme.colors.border.medium,
        };
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: disabled ? theme.colors.states.disabled : theme.colors.semantic.error,
          ...theme.shadows.sm,
        };
      default:
        return baseStyle;
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return theme.colors.text.tertiary;
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return theme.colors.text.inverse;
      case 'outline':
      case 'text':
        return theme.colors.text.primary;
      default:
        return theme.colors.text.primary;
    }
  };

  const getTextStyles = () => {
    const fontSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'base';
    return createTextStyle(theme, fontSize, 'semibold', getTextColor());
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size={size === 'small' ? 'small' : 'small'}
            color={getTextColor()}
            style={styles.loadingIndicator}
          />
          <Text style={getTextStyles()}>Loading...</Text>
        </View>
      );
    }

    const textElement = <Text style={getTextStyles()}>{title}</Text>;
    
    if (!icon) {
      return textElement;
    }

    const iconElement = (
      <MaterialCommunityIcons
        name={icon as any}
        size={getIconSize()}
        color={getTextColor()}
        style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
      />
    );

    return (
      <View style={styles.contentContainer}>
        {iconPosition === 'left' && iconElement}
        {textElement}
        {iconPosition === 'right' && iconElement}
      </View>
    );
  };

  const buttonStyles = [
    getVariantStyles(),
    fullWidth && styles.fullWidth,
    style,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={theme.constants.activeOpacity}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  fullWidth: {
    width: '100%',
  },
});