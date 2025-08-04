import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, CardBody, Button } from '../../atoms';
import { useTheme } from '../../../contexts/ThemeContext';
import { theme } from '../../../theme';
import { useHaptic } from '../../../hooks/useHaptic';
import { useGetTrendingAutomationsQuery } from '../../../store/api/automationApi';
import Animated, { 
  FadeInDown, 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolate
} from 'react-native-reanimated';

export const FeaturedAutomationWidget: React.FC = () => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const { trigger } = useHaptic();
  const scale = useSharedValue(1);
  
  const { data: trending = [] } = useGetTrendingAutomationsQuery({ limit: 1 });
  const featured = trending[0] || {
    id: '1',
    title: 'Morning Routine',
    description: 'Start your day right with automated tasks',
    category: 'Productivity',
    created_by: 'ZapTap Team',
    likes_count: 234,
    downloads_count: 567,
  };

  const categoryColors: Record<string, string[]> = {
    'Productivity': [colors.brand.primary, colors.brand.primaryLight],
    'Smart Home': [colors.brand.accent, '#34D399'],
    'Social': [colors.brand.secondary, '#FF6B9D'],
    'Health': ['#F59E0B', '#FCD34D'],
  };

  const gradient = categoryColors[featured.category] || [colors.brand.primary, colors.brand.primaryLight];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handlePress = () => {
    trigger('medium');
    // Navigate to automation details
  };

  return (
    <Animated.View 
      entering={FadeInDown.delay(400).springify()}
      style={styles.container}
    >
      <LinearGradient
        colors={gradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressable}
        >
          <Animated.View style={[styles.content, animatedStyle]}>
            <View style={styles.header}>
              <View style={styles.badge}>
                <MaterialCommunityIcons 
                  name="star" 
                  size={16} 
                  color={gradient[0]} 
                />
                <Text style={styles.badgeText}>Featured</Text>
              </View>
              <MaterialCommunityIcons 
                name="trending-up" 
                size={20} 
                color="rgba(255, 255, 255, 0.8)" 
              />
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {featured.title}
            </Text>
            <Text style={styles.description} numberOfLines={2}>
              {featured.description}
            </Text>

            <View style={styles.footer}>
              <View style={styles.stats}>
                <View style={styles.stat}>
                  <MaterialCommunityIcons 
                    name="heart" 
                    size={16} 
                    color="rgba(255, 255, 255, 0.9)" 
                  />
                  <Text style={styles.statText}>{featured.likes_count}</Text>
                </View>
                <View style={styles.stat}>
                  <MaterialCommunityIcons 
                    name="download" 
                    size={16} 
                    color="rgba(255, 255, 255, 0.9)" 
                  />
                  <Text style={styles.statText}>{featured.downloads_count}</Text>
                </View>
              </View>
              <Button
                variant="ghost"
                size="small"
                label="Try it"
                onPress={handlePress}
                style={styles.tryButton}
                textStyle={styles.tryButtonText}
              />
            </View>
          </Animated.View>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderRadius: theme.tokens.borderRadius.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  gradient: {
    borderRadius: theme.tokens.borderRadius.xl,
  },
  pressable: {
    width: '100%',
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.tokens.borderRadius.full,
  },
  badgeText: {
    ...theme.typography.labelSmall,
    color: theme.tokens.colors.gray[800],
    marginLeft: theme.spacing.xs,
    fontWeight: theme.tokens.typography.fontWeight.semibold,
  },
  title: {
    ...theme.typography.headlineMedium,
    color: '#FFFFFF',
    marginBottom: theme.spacing.sm,
  },
  description: {
    ...theme.typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    ...theme.typography.labelMedium,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: theme.spacing.md,
  },
  tryButtonText: {
    color: '#FFFFFF',
    fontWeight: theme.tokens.typography.fontWeight.semibold,
  },
});