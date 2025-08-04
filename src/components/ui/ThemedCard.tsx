/**
 * Themed Card Component
 * Material Design 3 compliant card with elevation and proper theming
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  GestureResponderEvent,
} from 'react-native';
import { useUnifiedTheme } from '../../contexts/UnifiedThemeProvider';
import { createCardStyle } from '../../utils/ThemeUtils';

export interface ThemedCardProps {
  children: React.ReactNode;
  elevated?: boolean;
  interactive?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: any;
  contentStyle?: any;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  elevated = true,
  interactive = false,
  onPress,
  style,
  contentStyle,
  testID,
  accessibilityLabel,
  accessibilityHint,
  padding = 'medium',
}) => {
  const { theme } = useUnifiedTheme();

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'small':
        return { padding: theme.spacing.sm };
      case 'large':
        return { padding: theme.spacing.xl };
      default:
        return { padding: theme.spacing.md };
    }
  };

  const cardStyles = [
    createCardStyle(theme, elevated),
    getPaddingStyles(),
    style,
  ];

  const contentStyles = [
    styles.content,
    contentStyle,
  ];

  if (interactive && onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={theme.constants.activeOpacity}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <View style={contentStyles}>
          {children}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={cardStyles}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      <View style={contentStyles}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});