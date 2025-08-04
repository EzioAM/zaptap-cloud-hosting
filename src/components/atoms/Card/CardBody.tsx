import React from 'react';
import { View, ViewStyle } from 'react-native';
import { theme } from '../../../theme';

export interface CardBodyProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  style,
  noPadding = false,
}) => {
  return (
    <View
      style={[
        !noPadding && styles.container,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = {
  container: {
    paddingVertical: theme.spacing.sm,
  },
};