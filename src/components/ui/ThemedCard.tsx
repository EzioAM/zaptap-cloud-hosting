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
import { useTheme } from 'react-native-paper';

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
  const theme = useTheme();

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'small':
        return { padding: 8 };
      case 'large':
        return { padding: 24 };
      default:
        return { padding: 16 };
    }
  };

  const cardStyles = [
    {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      overflow: 'hidden' as const,
      ...(elevated ? {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      } : {}),
    },
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
        activeOpacity={0.7}
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