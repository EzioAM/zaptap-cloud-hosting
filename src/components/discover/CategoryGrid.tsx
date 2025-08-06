/**
 * CategoryGrid component for displaying automation categories
 * 
 * Features:
 * - Grid layout with category cards
 * - Glass morphism design with custom gradients
 * - Category icons and automation counts
 * - Trending indicators
 * - Smooth animations and press feedback
 * - Responsive grid layout
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getExtendedColors, getGlassStyle } from '../../theme/colors';
import { CategoryInfo, useGetCategoriesQuery } from '../../store/api/searchApi';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 8;
const CARDS_PER_ROW = 2;
const CARD_WIDTH = (SCREEN_WIDTH - (CARD_MARGIN * (CARDS_PER_ROW + 1))) / CARDS_PER_ROW;

interface CategoryGridProps {
  onCategoryPress?: (category: CategoryInfo) => void;
  style?: any;
  theme?: 'light' | 'dark';
  showCounts?: boolean;
  columns?: number;
}

interface CategoryCardProps {
  category: CategoryInfo;
  onPress: (category: CategoryInfo) => void;
  theme?: 'light' | 'dark';
  showCount?: boolean;
  width: number;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
  theme = 'light',
  showCount = true,
  width,
}) => {
  const [scaleValue] = useState(new Animated.Value(1));
  const colors = getExtendedColors(theme);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    onPress(category);
  };

  const formatCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const glassStyle = getGlassStyle('medium', theme === 'dark');

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.categoryCard,
          {
            width,
            transform: [{ scale: scaleValue }],
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={70} tint={theme} style={styles.cardBlur}>
            <LinearGradient
              colors={[
                category.gradient[0] + '15',
                category.gradient[1] + '08',
              ]}
              style={styles.cardGradient}
            />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, glassStyle]} />
        )}

        {/* Gradient Overlay */}
        <LinearGradient
          colors={[
            category.gradient[0] + '20',
            category.gradient[1] + '10',
            'transparent'
          ]}
          style={styles.gradientOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Trending Badge */}
        {category.trending && (
          <View style={styles.trendingBadge}>
            <Ionicons name="trending-up" size={10} color="#EF4444" />
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        )}

        {/* Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={category.gradient}
            style={styles.iconBackground}
          >
            <Ionicons
              name={category.icon as any}
              size={28}
              color="white"
            />
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={[styles.categoryName, { color: colors.text.primary }]}>
            {category.name}
          </Text>
          
          <Text 
            style={[styles.categoryDescription, { color: colors.text.secondary }]}
            numberOfLines={2}
          >
            {category.description}
          </Text>

          {/* Count */}
          {showCount && (
            <View style={styles.countContainer}>
              <Text style={[styles.countText, { color: category.color }]}>
                {formatCount(category.automationCount)} automations
              </Text>
            </View>
          )}
        </View>

        {/* Decorative Elements */}
        <View style={[styles.decorativeCircle1, { backgroundColor: category.color + '10' }]} />
        <View style={[styles.decorativeCircle2, { backgroundColor: category.gradient[1] + '08' }]} />
      </Animated.View>
    </TouchableOpacity>
  );
};

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  onCategoryPress,
  style,
  theme = 'light',
  showCounts = true,
  columns = 2,
}) => {
  const colors = getExtendedColors(theme);
  
  // Use default categories if API data is not available
  const { data: apiCategories, isLoading, error } = useGetCategoriesQuery();
  
  // Default categories for fallback
  const defaultCategories: CategoryInfo[] = [
    {
      id: 'productivity',
      name: 'Productivity',
      icon: 'briefcase',
      color: '#8B5CF6',
      gradient: ['#8B5CF6', '#7C3AED'],
      description: 'Streamline your workflow and boost efficiency',
      automationCount: 1247,
      trending: true,
    },
    {
      id: 'smart-home',
      name: 'Smart Home',
      icon: 'home',
      color: '#06B6D4',
      gradient: ['#06B6D4', '#0891B2'],
      description: 'Automate your living space',
      automationCount: 892,
      trending: false,
    },
    {
      id: 'communication',
      name: 'Communication',
      icon: 'chatbubble-ellipses',
      color: '#10B981',
      gradient: ['#10B981', '#059669'],
      description: 'Enhance your messaging and notifications',
      automationCount: 634,
      trending: true,
    },
    {
      id: 'lifestyle',
      name: 'Lifestyle',
      icon: 'heart',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#D97706'],
      description: 'Personal and lifestyle automations',
      automationCount: 456,
      trending: false,
    },
    {
      id: 'emergency',
      name: 'Emergency',
      icon: 'alert-triangle',
      color: '#EF4444',
      gradient: ['#EF4444', '#DC2626'],
      description: 'Critical safety and emergency automations',
      automationCount: 123,
      trending: false,
    },
    {
      id: 'developer',
      name: 'Developer',
      icon: 'code-slash',
      color: '#6366F1',
      gradient: ['#6366F1', '#4F46E5'],
      description: 'Developer tools and workflows',
      automationCount: 387,
      trending: true,
    },
  ];

  const categories = apiCategories || defaultCategories;
  const cardWidth = (SCREEN_WIDTH - (CARD_MARGIN * (columns + 1))) / columns;

  const handleCategoryPress = (category: CategoryInfo) => {
    onCategoryPress?.(category);
  };

  const renderCategoryItem = ({ item }: { item: CategoryInfo }) => (
    <CategoryCard
      category={item}
      onPress={handleCategoryPress}
      theme={theme}
      showCount={showCounts}
      width={cardWidth}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.loadingContainer}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.skeletonCard,
                {
                  width: cardWidth,
                  backgroundColor: colors.surface.secondary,
                }
              ]}
            />
          ))}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={32} color={colors.semantic.error} />
          <Text style={[styles.errorText, { color: colors.text.secondary }]}>
            Unable to load categories
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: CARD_MARGIN * 2 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    padding: CARD_MARGIN,
  },
  row: {
    justifyContent: 'space-between',
  },
  categoryCard: {
    aspectRatio: 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: CARD_MARGIN,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  cardBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.6,
  },
  trendingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
    zIndex: 10,
  },
  trendingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  iconBackground: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  categoryDescription: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    flex: 1,
  },
  countContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.3,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.2,
  },
  loadingContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: CARD_MARGIN,
  },
  skeletonCard: {
    aspectRatio: 0.85,
    borderRadius: 20,
    marginBottom: CARD_MARGIN * 2,
    opacity: 0.5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
});

export default CategoryGrid;