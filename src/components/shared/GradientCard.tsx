import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  children: React.ReactNode;
  colors?: string[];
  style?: ViewStyle;
}

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  colors,
  style
}) => {
  // Ensure we always have valid gradient colors
  const gradientColors = (colors && colors.length >= 2) 
    ? colors 
    : ['#6366F1', '#8B5CF6'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    margin: 8,
  },
});

export default GradientCard;