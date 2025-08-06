/**
 * DiscoverScreen - Main discovery interface for automations
 * 
 * Features:
 * - Featured carousel with glass morphism cards
 * - Trending section with horizontal scroll
 * - Categories grid
 * - New arrivals section
 * - Pull-to-refresh functionality
 * - Smooth animations and transitions
 * - Search integration
 * - Glass morphism design with purple theme
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { getExtendedColors, getGlassStyle } from '../../theme/colors';
import {
  useGetFeaturedQuery,
  useGetTrendingQuery,
  useGetNewArrivalsQuery,
  useGetCategoriesQuery,
  FeaturedAutomation,
  TrendingAutomation,
  SearchResult,
  CategoryInfo,
} from '../../store/api/searchApi';

import TrendingCard from '../../components/discover/TrendingCard';
import CategoryGrid from '../../components/discover/CategoryGrid';
import AutomationPreview from '../../components/discover/AutomationPreview';
import SearchBar from '../../components/search/SearchBar';
import { EnhancedLoadingSkeleton } from '../../components/common/EnhancedLoadingSkeleton';
import { EventLogger } from '../../utils/EventLogger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DiscoverScreenProps {
  navigation?: any;
  theme?: 'light' | 'dark';
}

interface FeaturedCardProps {
  automation: FeaturedAutomation;
  onPress: (automation: FeaturedAutomation) => void;
  theme?: 'light' | 'dark';
  width: number;
}

const FeaturedCard: React.FC<FeaturedCardProps> = ({
  automation,
  onPress,
  theme = 'light',
  width,
}) => {
  const [scaleAnimation] = useState(new Animated.Value(1));
  const colors = getExtendedColors(theme);

  const handlePressIn = () => {
    Animated.spring(scaleAnimation, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`star-${i}`} name="star" size={12} color="#F59E0B" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Ionicons key="half-star" name="star-half" size={12} color="#F59E0B" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={12} color="#9CA3AF" />);
    }
    
    return stars;
  };

  const glassStyle = getGlassStyle('strong', theme === 'dark');

  return (
    <TouchableOpacity
      onPress={() => onPress(automation)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={{ marginRight: 16 }}
    >
      <Animated.View
        style={[
          styles.featuredCard,
          {
            width,
            transform: [{ scale: scaleAnimation }],
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={90} tint={theme} style={styles.featuredBlur}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.2)', 'rgba(124, 58, 237, 0.1)']}
              style={styles.featuredGradient}
            />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, glassStyle]} />
        )}

        {/* Featured Badge */}
        <View style={styles.featuredBadge}>
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.featuredBadgeGradient}
          >
            <Ionicons name="star" size={12} color="white" />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.featuredContent}>
          {/* Header */}
          <View style={styles.featuredHeader}>
            <Text style={[styles.featuredTitle, { color: colors.text.primary }]}>
              {automation.title}
            </Text>
            <Text style={[styles.featuredCategory, { color: colors.brand.primary }]}>
              {automation.category}
            </Text>
          </View>

          {/* Description */}
          <Text 
            style={[styles.featuredDescription, { color: colors.text.secondary }]}
            numberOfLines={3}
          >
            {automation.description}
          </Text>

          {/* Rating */}
          <View style={styles.featuredRating}>
            <View style={styles.featuredStars}>
              {renderStars(automation.rating)}
            </View>
            <Text style={[styles.featuredRatingText, { color: colors.text.secondary }]}>
              {automation.rating.toFixed(1)} ({formatNumber(automation.reviewCount)})
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.featuredFooter}>
            <View style={styles.featuredCreator}>
              <Ionicons name="person-circle" size={20} color={colors.text.tertiary} />
              <Text style={[styles.featuredCreatorText, { color: colors.text.secondary }]}>
                {automation.createdBy.username}
              </Text>
            </View>
            
            <View style={styles.featuredStats}>
              <Ionicons name="play" size={14} color={colors.text.tertiary} />
              <Text style={[styles.featuredStatsText, { color: colors.text.tertiary }]}>
                {formatNumber(automation.executionCount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Decorative Elements */}
        <View style={styles.featuredDecorative1} />
        <View style={styles.featuredDecorative2} />
      </Animated.View>
    </TouchableOpacity>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  theme?: 'light' | 'dark';
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionText,
  onActionPress,
  theme = 'light',
}) => {
  const colors = getExtendedColors(theme);
  
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: colors.text.secondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      
      {actionText && onActionPress && (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={[styles.sectionAction, { color: colors.brand.primary }]}>
            {actionText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  navigation,
  theme = 'light',
}) => {
  const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  const colors = getExtendedColors(theme);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // API queries
  const { 
    data: featuredAutomations = [], 
    isLoading: featuredLoading,
    refetch: refetchFeatured 
  } = useGetFeaturedQuery({ limit: 5 });
  
  const { 
    data: trendingAutomations = [], 
    isLoading: trendingLoading,
    refetch: refetchTrending 
  } = useGetTrendingQuery({ timeframe: '7d', limit: 10 });
  
  const { 
    data: newAutomations = [], 
    isLoading: newLoading,
    refetch: refetchNew 
  } = useGetNewArrivalsQuery({ limit: 8, daysBack: 7 });
  
  const { 
    data: categories = [], 
    isLoading: categoriesLoading,
    refetch: refetchCategories 
  } = useGetCategoriesQuery();

  // Refresh all data
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchFeatured(),
        refetchTrending(),
        refetchNew(),
        refetchCategories(),
      ]);
    } catch (error) {
      EventLogger.error('Discover', 'Failed to refresh data:', error as Error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchFeatured, refetchTrending, refetchNew, refetchCategories]);

  // Focus effect to refresh data when screen becomes focused
  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [handleRefresh])
  );

  const handleSearchSubmit = (query: string) => {
    navigation?.navigate('Search', { initialQuery: query });
  };

  const handleFeaturedPress = (automation: FeaturedAutomation) => {
    setSelectedAutomation(automation.publicId || automation.id);
  };

  const handleTrendingPress = (automation: TrendingAutomation) => {
    setSelectedAutomation(automation.publicId || automation.id);
  };

  const handleCategoryPress = (category: CategoryInfo) => {
    navigation?.navigate('Search', { initialCategory: category.id });
  };

  const handleViewAllTrending = () => {
    navigation?.navigate('Search', { filters: { sortBy: 'popular' } });
  };

  const handleViewAllNew = () => {
    navigation?.navigate('Search', { filters: { sortBy: 'recent' } });
  };

  const renderFeaturedItem = ({ item }: { item: FeaturedAutomation }) => (
    <FeaturedCard
      automation={item}
      onPress={handleFeaturedPress}
      theme={theme}
      width={SCREEN_WIDTH * 0.8}
    />
  );

  const renderTrendingItem = ({ item }: { item: TrendingAutomation }) => (
    <TrendingCard
      automation={item}
      onPress={handleTrendingPress}
      theme={theme}
    />
  );

  const renderNewArrivalItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={[styles.newArrivalCard, { backgroundColor: colors.surface.elevated }]}
      onPress={() => setSelectedAutomation(item.publicId || item.id)}
    >
      <Text style={[styles.newArrivalTitle, { color: colors.text.primary }]}>
        {item.title}
      </Text>
      <Text style={[styles.newArrivalCategory, { color: colors.brand.primary }]}>
        {item.category}
      </Text>
      <View style={styles.newArrivalFooter}>
        <Text style={[styles.newArrivalCreator, { color: colors.text.secondary }]}>
          {item.createdBy.username}
        </Text>
        <View style={styles.newArrivalBadge}>
          <Text style={styles.newArrivalBadgeText}>New</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const isLoading = featuredLoading || trendingLoading || newLoading || categoriesLoading;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background */}
      <LinearGradient
        colors={theme === 'dark' 
          ? ['#1A1A1A', '#2D1B69', '#1A1A1A']
          : ['#F8FAFC', '#E0E7FF', '#F8FAFC']
        }
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Discover
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.text.secondary }]}>
          Find amazing automations from the community
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearchSubmit}
          placeholder="Search automations, categories..."
          showRecentSearches={false}
          theme={theme}
        />
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
      >
        {/* Featured Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Featured"
            subtitle="Hand-picked automations from our editors"
            theme={theme}
          />
          
          {featuredLoading ? (
            <View style={styles.loadingContainer}>
              <EnhancedLoadingSkeleton rows={3} theme={theme} />
            </View>
          ) : (
            <FlatList
              data={featuredAutomations}
              renderItem={renderFeaturedItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
              snapToInterval={SCREEN_WIDTH * 0.8 + 16}
              decelerationRate="fast"
            />
          )}
        </View>

        {/* Categories Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Categories"
            subtitle="Explore automations by category"
            theme={theme}
          />
          
          <CategoryGrid
            onCategoryPress={handleCategoryPress}
            theme={theme}
            showCounts={true}
            columns={2}
          />
        </View>

        {/* Trending Section */}
        <View style={styles.section}>
          <SectionHeader
            title="Trending"
            subtitle="Popular automations this week"
            actionText="View All"
            onActionPress={handleViewAllTrending}
            theme={theme}
          />
          
          {trendingLoading ? (
            <View style={styles.loadingContainer}>
              <EnhancedLoadingSkeleton rows={2} theme={theme} />
            </View>
          ) : (
            <FlatList
              data={trendingAutomations}
              renderItem={renderTrendingItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
            />
          )}
        </View>

        {/* New Arrivals Section */}
        <View style={[styles.section, styles.lastSection]}>
          <SectionHeader
            title="New Arrivals"
            subtitle="Latest automations from the community"
            actionText="View All"
            onActionPress={handleViewAllNew}
            theme={theme}
          />
          
          {newLoading ? (
            <View style={styles.loadingContainer}>
              <EnhancedLoadingSkeleton rows={2} theme={theme} />
            </View>
          ) : (
            <FlatList
              data={newAutomations}
              renderItem={renderNewArrivalItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.newArrivalsList}
              columnWrapperStyle={styles.newArrivalsRow}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Preview Modal */}
      <AutomationPreview
        visible={!!selectedAutomation}
        publicId={selectedAutomation}
        onClose={() => setSelectedAutomation(null)}
        theme={theme}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  lastSection: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 2,
  },
  sectionAction: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingHorizontal: 20,
  },
  featuredList: {
    paddingLeft: 20,
  },
  featuredCard: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  featuredBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  featuredBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featuredBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  featuredHeader: {
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  featuredCategory: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  featuredDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  featuredStars: {
    flexDirection: 'row',
    gap: 2,
  },
  featuredRatingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  featuredCreatorText: {
    fontSize: 13,
    fontWeight: '500',
  },
  featuredStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredStatsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  featuredDecorative1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  featuredDecorative2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  trendingList: {
    paddingLeft: 20,
  },
  newArrivalsList: {
    paddingHorizontal: 20,
  },
  newArrivalsRow: {
    justifyContent: 'space-between',
  },
  newArrivalCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  newArrivalTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
  },
  newArrivalCategory: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  newArrivalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newArrivalCreator: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  newArrivalBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newArrivalBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default DiscoverScreen;