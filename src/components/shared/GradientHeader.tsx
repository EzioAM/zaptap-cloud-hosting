import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  colors?: string[];
  style?: ViewStyle;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  colors,
  style
}) => {
  const theme = useSafeTheme();
  const gradientColors = colors || ['#6366F1', '#8B5CF6', '#EC4899'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default GradientHeader;