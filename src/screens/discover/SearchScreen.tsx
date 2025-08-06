/**
 * SearchScreen - Global search with real-time results and filters
 * 
 * Features:
 * - Real-time search with debouncing
 * - Advanced filtering with glass morphism UI
 * - Grid/list view toggle
 * - Sort options
 * - Skeleton loading states
 * - Empty states with illustrations
 * - Pull-to-refresh
 * - Infinite scrolling
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Platform,
  Animated,
  Text,
  TouchableOpacity,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getExtendedColors, getGlassStyle } from '../../theme/colors';
import { 
  useSearchAutomationsQuery,
  useLazySearchAutomationsQuery,
  SearchFilters,
  SearchResult,
} from '../../store/api/searchApi';
import SearchBar from '../../components/search/SearchBar';
import SearchFilters from '../../components/search/SearchFilters';
import AutomationPreview from '../../components/discover/AutomationPreview';
import { EmptyState } from '../../components/molecules/EmptyState';
import { EnhancedLoadingSkeleton } from '../../components/common/EnhancedLoadingSkeleton';
import TrendingCard from '../../components/discover/TrendingCard';
import { EventLogger } from '../../utils/EventLogger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RECENT_SEARCHES_KEY = '@recent_searches';
const MAX_RECENT_SEARCHES = 10;

interface SearchScreenProps {
  route?: {
    params?: {
      initialQuery?: string;
      initialCategory?: string;
    };
  };
  navigation?: any;
  theme?: 'light' | 'dark';
}

interface SearchResultCardProps {
  automation: SearchResult;
  onPress: (automation: SearchResult) => void;
  theme?: 'light' | 'dark';
  viewMode: 'grid' | 'list';
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  automation,
  onPress,
  theme = 'light',
  viewMode,
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
      stars.push(<Ionicons key={`star-${i}`} name="star" size={10} color="#F59E0B" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Ionicons key="half-star" name="star-half" size={10} color="#F59E0B" />);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={10} color="#9CA3AF" />);
    }
    
    return stars;
  };

  const cardWidth = viewMode === 'grid' ? (SCREEN_WIDTH - 48) / 2 : SCREEN_WIDTH - 32;
  const glassStyle = getGlassStyle('light', theme === 'dark');

  return (
    <TouchableOpacity
      onPress={() => onPress(automation)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[
        styles.resultCard,
        {
          width: cardWidth,
          marginBottom: viewMode === 'list' ? 16 : 12,
        }
      ]}
    >
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [{ scale: scaleAnimation }],
            height: viewMode === 'grid' ? 160 : 120,
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={60} tint={theme} style={styles.cardBlur}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.05)', 'rgba(124, 58, 237, 0.02)']}
              style={styles.cardGradient}
            />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, glassStyle]} />
        )}

        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text 
              style={[styles.cardTitle, { color: colors.text.primary }]}
              numberOfLines={viewMode === 'grid' ? 2 : 1}
            >
              {automation.title}
            </Text>
            <Text style={[styles.cardCategory, { color: colors.brand.primary }]}>
              {automation.category}
            </Text>
          </View>

          {/* Description */}
          <Text 
            style={[styles.cardDescription, { color: colors.text.secondary }]}
            numberOfLines={viewMode === 'grid' ? 2 : 1}
          >
            {automation.description}
          </Text>

          {/* Tags */}
          {automation.tags.length > 0 && (
            <View style={styles.cardTags}>
              {automation.tags.slice(0, viewMode === 'grid' ? 2 : 3).map((tag, index) => (
                <View
                  key={index}
                  style={[styles.cardTag, { backgroundColor: colors.brand.primary + '20' }]}
                >
                  <Text style={[styles.cardTagText, { color: colors.brand.primary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.cardRating}>
              <View style={styles.cardStars}>
                {renderStars(automation.rating)}
              </View>
              <Text style={[styles.cardRatingText, { color: colors.text.tertiary }]}>
                {automation.rating.toFixed(1)}
              </Text>
            </View>

            <View style={styles.cardStats}>
              <View style={styles.cardStat}>
                <Ionicons name="play" size={12} color={colors.text.tertiary} />
                <Text style={[styles.cardStatText, { color: colors.text.tertiary }]}>
                  {formatNumber(automation.executionCount)}
                </Text>
              </View>
              
              {automation.hasNFC && (
                <Ionicons name="radio" size={12} color="#10B981" />
              )}
              {automation.hasQR && (
                <Ionicons name="qr-code" size={12} color="#8B5CF6" />
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const SearchScreen: React.FC<SearchScreenProps> = ({
  route,
  navigation,
  theme = 'light',
}) => {
  const [searchQuery, setSearchQuery] = useState(route?.params?.initialQuery || '');
  const [filters, setFilters] = useState<SearchFilters>({
    category: route?.params?.initialCategory,
    sortBy: 'relevance',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [hasMore, setHasMore] = useState(true);
  
  const colors = getExtendedColors(theme);
  const insets = useSafeAreaInsets();
  const filtersAnimation = useRef(new Animated.Value(0)).current;
  
  const [searchAutomations, { data: searchData, isLoading, isFetching, error }] = 
    useLazySearchAutomationsQuery();

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Execute search when query or filters change
  useEffect(() => {
    if (searchQuery.trim() || Object.keys(filters).some(key => filters[key as keyof SearchFilters])) {
      handleSearch(true);
    }
  }, [searchQuery, filters]);

  // Update results when data changes
  useEffect(() => {
    if (searchData) {
      if (page === 1) {
        setAllResults(searchData.results);
      } else {
        setAllResults(prev => [...prev, ...searchData.results]);
      }
      setHasMore(searchData.hasMore);
    }
  }, [searchData, page]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      EventLogger.error('Search', 'Failed to load recent searches:', error as Error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const updatedSearches = [
        query.trim(),
        ...recentSearches.filter(s => s !== query.trim())
      ].slice(0, MAX_RECENT_SEARCHES);
      
      setRecentSearches(updatedSearches);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
    } catch (error) {
      EventLogger.error('Search', 'Failed to save recent search:', error as Error);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      EventLogger.error('Search', 'Failed to clear recent searches:', error as Error);
    }
  };

  const handleSearch = useCallback((resetPage = false) => {
    const searchPage = resetPage ? 1 : page;
    if (resetPage) {
      setPage(1);
      setAllResults([]);
    }

    searchAutomations({
      query: searchQuery,
      filters,
      page: searchPage,
      limit: 20,
    });
  }, [searchQuery, filters, page, searchAutomations]);

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    saveRecentSearch(query);
    setPage(1);
    handleSearch(true);
  };

  const handleRecentSearchPress = (query: string) => {
    setSearchQuery(query);
    handleSearchSubmit(query);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
    Animated.timing(filtersAnimation, {
      toValue: showFilters ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleFiltersReset = () => {
    setFilters({ sortBy: 'relevance' });
  };

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
      setPage(prev => prev + 1);
    }
  };

  const handleRefresh = () => {
    setPage(1);
    handleSearch(true);
  };

  const handleResultPress = (automation: SearchResult) => {
    setSelectedAutomation(automation.publicId || automation.id);
  };

  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <SearchResultCard
      automation={item}
      onPress={handleResultPress}
      theme={theme}
      viewMode={viewMode}
    />
  );

  const renderLoadingItem = ({ index }: { index: number }) => (
    <View
      key={index}
      style={[
        styles.skeletonCard,
        {
          width: viewMode === 'grid' ? (SCREEN_WIDTH - 48) / 2 : SCREEN_WIDTH - 32,
          height: viewMode === 'grid' ? 160 : 120,
          backgroundColor: colors.surface.secondary,
        }
      ]}
    />
  );

  const renderEmptyState = () => {
    if (isLoading) return null;
    
    if (searchQuery.trim() && allResults.length === 0) {
      return (
        <EmptyState
          title="No Results Found"
          subtitle={`No automations found for "${searchQuery}"`}
          iconName="search"
          actionText="Clear Search"
          onActionPress={() => setSearchQuery('')}
        />
      );
    }

    return (
      <EmptyState
        title="Search Automations"
        subtitle="Enter a search term to find automations or browse categories"
        iconName="search"
      />
    );
  };

  const numColumns = viewMode === 'grid' ? 2 : 1;

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
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmit={handleSearchSubmit}
          recentSearches={recentSearches}
          onRecentSearchPress={handleRecentSearchPress}
          onClearRecentSearches={clearRecentSearches}
          theme={theme}
        />

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.surface.elevated }]}
            onPress={toggleFilters}
          >
            <Ionicons 
              name="options" 
              size={18} 
              color={showFilters ? colors.brand.primary : colors.text.secondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.surface.elevated }]}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Ionicons 
              name={viewMode === 'grid' ? 'list' : 'grid'} 
              size={18} 
              color={colors.text.secondary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <Animated.View
        style={[
          styles.filtersContainer,
          {
            opacity: filtersAnimation,
            transform: [{
              translateY: filtersAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            }],
          }
        ]}
        pointerEvents={showFilters ? 'auto' : 'none'}
      >
        <SearchFilters
          filters={filters}
          onFiltersChange={setFilters}
          onReset={handleFiltersReset}
          theme={theme}
        />
      </Animated.View>

      {/* Results */}
      <View style={styles.results}>
        {isLoading && page === 1 ? (
          <FlatList
            data={Array.from({ length: 6 })}
            renderItem={renderLoadingItem}
            numColumns={numColumns}
            contentContainerStyle={styles.resultsList}
            columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={allResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            contentContainerStyle={[
              styles.resultsList,
              allResults.length === 0 && styles.emptyResultsList,
            ]}
            columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
            ListEmptyComponent={renderEmptyState}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && page === 1}
                onRefresh={handleRefresh}
                tintColor={colors.brand.primary}
                colors={[colors.brand.primary]}
              />
            }
            ListFooterComponent={
              isFetching && page > 1 ? (
                <View style={styles.loadingFooter}>
                  <EnhancedLoadingSkeleton
                    rows={2}
                    showAvatar={false}
                    theme={theme}
                  />
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

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
    padding: 16,
    paddingBottom: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  results: {
    flex: 1,
  },
  resultsList: {
    padding: 16,
  },
  emptyResultsList: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    justifyContent: 'space-between',
  },
  resultCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  cardBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cardHeader: {
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  cardTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardTagText: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardStars: {
    flexDirection: 'row',
    gap: 1,
  },
  cardRatingText: {
    fontSize: 10,
    fontWeight: '500',
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardStatText: {
    fontSize: 9,
    fontWeight: '500',
  },
  skeletonCard: {
    borderRadius: 16,
    marginBottom: 12,
    opacity: 0.3,
  },
  loadingFooter: {
    padding: 16,
  },
});

export default SearchScreen;