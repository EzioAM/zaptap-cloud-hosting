import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
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
  const theme = useSafeTheme();
  const colors = theme.colors;

  return (
    <View
      style={[
        styles.container,
        divider && { ...styles.divider, borderTopColor: colors?.border?.light || colors?.outline || '#e0e0e0' },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = {
  container: {
    paddingTop: theme.spacing?.md || 16,
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
    gap: theme.spacing?.sm || 8,
  },
  divider: {
    borderTopWidth: theme.constants?.borderWidth || 1,
    marginTop: theme.spacing?.sm || 8,
  },
};