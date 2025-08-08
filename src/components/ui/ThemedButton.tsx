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
import { useTheme } from 'react-native-paper';

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
  const theme = useTheme();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 12,
          paddingVertical: 8,
          minHeight: 32,
        };
      case 'large':
        return {
          paddingHorizontal: 24,
          paddingVertical: 16,
          minHeight: 56,
        };
      default:
        return {
          paddingHorizontal: 16,
          paddingVertical: 12,
          minHeight: 44,
        };
    }
  };

  const getVariantStyles = () => {
    const baseStyle = {
      borderRadius: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      ...getSizeStyles(),
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#CCCCCC' : theme.colors.primary,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.18,
          shadowRadius: 1.0,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#CCCCCC' : theme.colors.secondary,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.18,
          shadowRadius: 1.0,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: disabled ? '#CCCCCC' : theme.colors.outline,
        };
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#CCCCCC' : theme.colors.error,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.18,
          shadowRadius: 1.0,
        };
      default:
        return baseStyle;
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return theme.colors.onSurfaceVariant;
    }

    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return theme.colors.onPrimary || '#FFFFFF';
      case 'outline':
      case 'text':
        return theme.colors.onSurface;
      default:
        return theme.colors.onSurface;
    }
  };

  const getTextStyles = () => {
    const fontSize = size === 'small' ? 14 : size === 'large' ? 18 : 16;
    return {
      fontSize,
      fontWeight: '600' as const,
      color: getTextColor(),
    };
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
      activeOpacity={0.7}
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