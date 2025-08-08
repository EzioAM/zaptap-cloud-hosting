import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  colors?: string[];
  style?: ViewStyle;
  rightComponent?: React.ReactNode;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  colors,
  style,
  rightComponent
}) => {
  const theme = useSafeTheme();
  // Ensure we always have valid gradient colors
  const gradientColors = (colors && colors.length >= 2) 
    ? colors 
    : ['#6366F1', '#8B5CF6', '#EC4899'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightComponent && (
          <View style={styles.rightComponentContainer}>
            {rightComponent}
          </View>
        )}
      </View>
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
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  rightComponentContainer: {
    marginLeft: 16,
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