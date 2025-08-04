import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { theme } from '../../../theme';

export interface CardFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
  divider?: boolean;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  style,
  divider = true,
}) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);

  return (
    <View
      style={[
        styles.container,
        divider && { ...styles.divider, borderTopColor: colors.border.light },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = {
  container: {
    paddingTop: theme.spacing.md,
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },
  divider: {
    borderTopWidth: theme.constants.borderWidth,
    marginTop: theme.spacing.sm,
  },
};