import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Animated,
  Dimensions,
  InteractionManager,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  useGetPublicAutomationsQuery, 
  useGetTrendingAutomationsQuery,
  useLikeAutomationMutation,
  useUnlikeAutomationMutation
} from '../../store/api/automationApi';
import { useConnection } from '../../contexts/ConnectionContext';
import * as Haptics from 'expo-haptics';

// Error Boundaries and Recovery
import { ScreenErrorBoundary, WidgetErrorBoundary, NetworkErrorBoundary } from '../../components/ErrorBoundaries';
import { ErrorFallback, NetworkErrorFallback, EmptyStateFallback } from '../../components/Fallbacks';
import { useErrorHandler } from '../../utils/errorRecovery';
import { EventLogger } from '../../utils/EventLogger';

// Components
import { DiscoverScreenSkeleton } from '../../components/loading/SkeletonLoading';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';
import { ParallaxScrollView } from '../../components/common/ParallaxScrollView';
import TrendingCarousel from '../../components/discover/TrendingCarousel';
import FeaturedCard from '../../components/discover/FeaturedCard';
import AnimatedCategoryChips from '../../components/discover/AnimatedCategoryChips';
import AnimatedAutomationCard from '../../components/discover/AnimatedAutomationCard';
import AnimatedSearchBar from '../../components/discover/AnimatedSearchBar';

// Enhanced gradient components
import { GradientHeader } from '../../components/shared/GradientHeader';
import { GradientCard } from '../../components/shared/GradientCard';
import { GradientButton } from '../../components/shared/GradientButton';
import { EmptyStateIllustration } from '../../components/shared/EmptyStateIllustration';

// Enhanced theme imports
import { gradients, glassEffects, getGlassStyle } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';

// Animation constants
import { ANIMATION_CONFIG } from '../../constants/animations';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Feature flags for progressive enhancement
const FEATURE_FLAGS = {
  ENHANCED_ANIMATIONS: Platform.OS !== 'web',
  HAPTIC_FEEDBACK: Platform.OS !== 'web',
  BLUR_EFFECTS: Platform.OS !== 'web',
  PARALLAX_SCROLLING: Platform.OS !== 'web',
  GRADIENT_HEADERS: true,
  STAGGERED_ANIMATIONS: Platform.OS !== 'web',
  TRENDING_CAROUSEL: true,
  SEARCH_SUGGESTIONS: true,
};

interface Automation {
  id: string;
  title: string;
  description: string;
  author: string;
  authorAvatar?: string;
  likes: number;
  uses: number;
  category: string;
  icon: string;
  color: string;
  trending?: boolean;
  hasLiked?: boolean;
  image?: string;
  gradientKey?: keyof typeof gradients;
  tags?: string[];
  rating?: number;
  installs?: string;
  featured?: boolean;
}

interface Creator {
  id: string;
  name: string;
  avatar: string;
  automations: number;
  followers: string;
  verified: boolean;
}

const categories = [
  { id: 'all', name: 'All', icon: 'view-grid', gradient: ['#667eea', '#764ba2'], gradientKey: 'primary' as keyof typeof gradients, count: 150 },
  { id: 'popular', name: 'Popular', icon: 'trending-up', gradient: ['#ff9a9e', '#fecfef'], gradientKey: 'fire' as keyof typeof gradients, count: 89 },
  { id: 'new', name: 'New', icon: 'star', gradient: ['#a8edea', '#fed6e3'], gradientKey: 'aurora' as keyof typeof gradients, count: 32 },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase', gradient: ['#f093fb', '#f5576c'], gradientKey: 'ocean' as keyof typeof gradients, count: 45 },
  { id: 'smart-home', name: 'Smart Home', icon: 'home-automation', gradient: ['#4facfe', '#00f2fe'], gradientKey: 'forest' as keyof typeof gradients, count: 32 },
  { id: 'health', name: 'Health', icon: 'heart', gradient: ['#43e97b', '#38f9d7'], gradientKey: 'success' as keyof typeof gradients, count: 28 },
  { id: 'finance', name: 'Finance', icon: 'cash', gradient: ['#fa709a', '#fee140'], count: 19 },
  { id: 'social', name: 'Social', icon: 'account-group', gradient: ['#a8edea', '#fed6e3'], gradientKey: 'secondary' as keyof typeof gradients, count: 23 },
  { id: 'entertainment', name: 'Entertainment', icon: 'gamepad', gradient: ['#ff9a9e', '#fecfef'], gradientKey: 'sunset' as keyof typeof gradients, count: 37 },
  { id: 'travel', name: 'Travel', icon: 'airplane', gradient: ['#ffecd2', '#fcb69f'], count: 15 },
];

const searchSuggestions = [
  { id: '1', text: 'Smart Home Controls', type: 'trending' as const },
  { id: '2', text: 'Morning Routine', type: 'recent' as const },
  { id: '3', text: 'Productivity', type: 'category' as const },
  { id: '4', text: 'Workout Tracker', type: 'suggestion' as const },
  { id: '5', text: 'Email Automation', type: 'trending' as const },
  { id: '6', text: 'Bedtime Routine', type: 'recent' as const },
  { id: '7', text: 'Focus Mode', type: 'suggestion' as const },
  { id: '8', text: 'Travel Assistant', type: 'category' as const },
];

// Sample featured automations for enhanced features
const featuredAutomations: Automation[] = [
  {
    id: '1',
    title: 'Smart Morning Routine',
    description: 'Start your day perfectly with automated lights, music, and weather',
    author: 'Alex Chen',
    authorAvatar: '👨‍💻',
    likes: 245,
    uses: 1200,
    category: 'productivity',
    icon: 'weather-sunny',
    color: '#FFC107',
    gradientKey: 'sunrise',
    tags: ['morning', 'smart-home', 'routine'],
    rating: 4.8,
    installs: '1.2k',
    featured: true,
  },
  {
    id: '2',
    title: 'Focus Mode Ultra',
    description: 'Block distractions and boost productivity with smart notifications',
    author: 'Sarah Kim',
    authorAvatar: '👩‍💼',
    likes: 189,
    uses: 890,
    category: 'productivity',
    icon: 'brain',
    color: '#9C27B0',
    gradientKey: 'ocean',
    tags: ['focus', 'productivity', 'notifications'],
    rating: 4.9,
    installs: '890',
    featured: true,
  },
];

const DiscoverScreen: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { connectionState } = useConnection();
  const { isConnected } = connectionState;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [featuredAutomation, setFeaturedAutomation] = useState<Automation | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; visible: boolean }>({ 
    type: 'success', 
    message: '', 
    visible: false 
  });
  
  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // API queries with error handling
  const { 
    data: publicAutomations = [], 
    isLoading: isLoadingPublic,
    error: publicError,
    refetch: refetchPublic 
  } = useGetPublicAutomationsQuery({ 
    limit: 50,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: searchQuery || undefined
  }, {
    skip: !isConnected,
  });
  
  const { 
    data: trendingAutomations = [],
    isLoading: isLoadingTrending,
    error: trendingError,
    refetch: refetchTrending
  } = useGetTrendingAutomationsQuery({ limit: 10 }, {
    skip: !isConnected,
  });

  const [likeAutomation] = useLikeAutomationMutation();
  const [unlikeAutomation] = useUnlikeAutomationMutation();

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (FEATURE_FLAGS.HAPTIC_FEEDBACK) {
      try {
        switch (type) {
          case 'light':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        }
      } catch (error) {
        // Haptics not supported, continue silently
      }
    }
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setFeedback({ type, message, visible: true });
    setTimeout(() => setFeedback(prev => ({ ...prev, visible: false })), 3000);
  }, []);

  // Initialize featured automation
  useEffect(() => {
    if (featuredAutomations.length > 0 && !featuredAutomation) {
      setFeaturedAutomation(featuredAutomations[0]);
    }
  }, [featuredAutomation]);

  // Header animation based on scroll
  useEffect(() => {
    if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
      const listener = scrollY.addListener(({ value }) => {
        const opacity = Math.max(0, Math.min(1, 1 - value / 200));
        headerOpacity.setValue(opacity);
      });

      return () => scrollY.removeListener(listener);
    }
  }, [scrollY, headerOpacity]);

  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      showFeedback('warning', 'No internet connection');
      return;
    }

    try {
      setRefreshing(true);
      triggerHaptic('medium');
      
      await Promise.all([
        refetchPublic(),
        refetchTrending(),
      ]);
      
      showFeedback('success', 'Content updated');
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Refresh operation failed', error as Error, {
        userId: user?.id,
        connectionState: isConnected,
      });
      showFeedback('error', 'Failed to refresh content');
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, refetchPublic, refetchTrending, triggerHaptic, showFeedback]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    try {
      setSelectedCategory(categoryId);
      triggerHaptic('light');
      
      if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0.5,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Category selection failed', error as Error, {
        category,
        userId: user?.id,
      });
      showFeedback('error', 'Failed to update category');
    }
  }, [triggerHaptic, showFeedback, fadeAnim]);

  const handleSearch = useCallback((query: string) => {
    try {
      setSearchQuery(query);
      setShowSearchSuggestions(query.length > 0);
      triggerHaptic('light');
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Search operation failed', error as Error, {
        searchQuery: newQuery,
        userId: user?.id,
        connectionState: isConnected,
      });
    }
  }, [triggerHaptic]);

  const handleSearchSuggestionPress = useCallback((suggestion: any) => {
    try {
      setSearchQuery(suggestion.text);
      setShowSearchSuggestions(false);
      triggerHaptic('medium');
      
      // If it's a category suggestion, also update the category
      if (suggestion.type === 'category') {
        const categoryId = categories.find(cat => 
          cat.name.toLowerCase() === suggestion.text.toLowerCase()
        )?.id;
        if (categoryId) {
          setSelectedCategory(categoryId);
        }
      }
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Search suggestion failed', error as Error, {
        suggestion,
        userId: user?.id,
      });
    }
  }, [triggerHaptic]);

  const handleLike = useCallback(async (automationId: string, isLiked: boolean) => {
    if (!user) {
      showFeedback('warning', 'Please sign in to like automations');
      return;
    }

    if (!isConnected) {
      showFeedback('warning', 'No internet connection');
      return;
    }

    try {
      triggerHaptic('medium');
      
      if (isLiked) {
        await unlikeAutomation(automationId).unwrap();
        showFeedback('success', 'Removed from favorites');
      } else {
        await likeAutomation(automationId).unwrap();
        showFeedback('success', 'Added to favorites');
      }
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Like toggle operation failed', error as Error, {
        automationId,
        action: automation.hasLiked ? 'unlike' : 'like',
        userId: user?.id,
      });
      showFeedback('error', 'Failed to update favorites');
    }
  }, [user, isConnected, likeAutomation, unlikeAutomation, triggerHaptic, showFeedback]);

  const handleAutomationPress = useCallback((automation: Automation) => {
    try {
      triggerHaptic('light');
      navigation.navigate('AutomationDetails' as never, { automation } as never);
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Navigation to automation details failed', error as Error, {
        automationId: automation.id,
        userId: user?.id,
      });
      showFeedback('error', 'Failed to open automation details');
    }
  }, [navigation, triggerHaptic, showFeedback]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !isConnected) return;
    
    try {
      setLoadingMore(true);
      // In a real implementation, you would load more data here
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Load more operation failed', error as Error, {
        currentPage: page,
        userId: user?.id,
      });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, isConnected]);

  // Filter automations based on search and category
  const filteredAutomations = useMemo(() => {
    try {
      return publicAutomations.filter((automation: any) => {
        const matchesSearch = !searchQuery || 
          automation.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          automation.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          automation.author?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = selectedCategory === 'all' || automation.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
      });
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Automation filtering failed', error as Error, {
        selectedCategory,
        searchQuery: query,
        userId: user?.id,
      });
      return [];
    }
  }, [publicAutomations, searchQuery, selectedCategory]);

  const renderAutomationCard = useCallback(({ item, index }: { item: Automation; index: number }) => {
    return (
      <AnimatedAutomationCard
        automation={item}
        index={index}
        onPress={() => handleAutomationPress(item)}
        onLike={() => handleLike(item.id, item.hasLiked || false)}
        theme={theme}
        delayMs={FEATURE_FLAGS.STAGGERED_ANIMATIONS ? index * 100 : 0}
      />
    );
  }, [handleAutomationPress, handleLike, theme]);

  const renderCategoryChip = useCallback(({ item, index }: { item: any; index: number }) => {
    const isSelected = selectedCategory === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryChip,
          isSelected && styles.categoryChipSelected,
          { backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant }
        ]}
        onPress={() => handleCategorySelect(item.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isSelected ? item.gradient || [theme.colors.primary, theme.colors.primary] : ['transparent', 'transparent']}
          style={[styles.categoryChipGradient, !isSelected && { backgroundColor: theme.colors.surfaceVariant }]}
        >
          <MaterialCommunityIcons 
            name={item.icon as any} 
            size={16} 
            color={isSelected ? 'white' : theme.colors.onSurfaceVariant} 
          />
          <Text style={[
            styles.categoryChipText,
            { color: isSelected ? 'white' : theme.colors.onSurfaceVariant }
          ]}>
            {item.name}
          </Text>
          {item.count && (
            <Text style={[
              styles.categoryChipCount,
              { color: isSelected ? 'rgba(255,255,255,0.8)' : theme.colors.onSurfaceVariant }
            ]}>
              {item.count}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }, [selectedCategory, theme, handleCategorySelect]);

  const renderSearchSuggestion = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleSearchSuggestionPress(item)}
    >
      <MaterialCommunityIcons 
        name={item.type === 'trending' ? 'trending-up' : 
              item.type === 'recent' ? 'history' :
              item.type === 'category' ? 'folder' : 'magnify'} 
        size={16} 
        color={theme.colors.onSurfaceVariant} 
      />
      <Text style={[styles.suggestionText, { color: theme.colors.onSurface }]}>
        {item.text}
      </Text>
      <Text style={[styles.suggestionType, { color: theme.colors.onSurfaceVariant }]}>
        {item.type}
      </Text>
    </TouchableOpacity>
  ), [theme, handleSearchSuggestionPress]);

  // Loading state
  if (isLoadingPublic && publicAutomations.length === 0) {
    return <DiscoverScreenSkeleton />;
  }

  // Error state
  if ((publicError || trendingError) && !isConnected) {
    return (
      <ErrorState
        title="No Internet Connection"
        description="Please check your connection and try again"
        action={{
          label: "Retry",
          onPress: handleRefresh,
        }}
      />
    );
  }

  // Render main content
  const ScrollComponent = FEATURE_FLAGS.PARALLAX_SCROLLING ? ParallaxScrollView : ScrollView;

  return (
    <ScreenErrorBoundary 
      screenName="Discover"
      onError={(error, errorInfo) => {
        EventLogger.error('DiscoverScreen', 'Screen-level error caught', error, {
          componentStack: errorInfo.componentStack,
          userId: user?.id,
          searchQuery,
          selectedCategory,
          isConnected,
        });
      }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      {FEATURE_FLAGS.GRADIENT_HEADERS ? (
        <Animated.View style={{ opacity: headerOpacity }}>
          <GradientHeader title="Discover" />
        </Animated.View>
      ) : (
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Discover
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchSection}>
        {FEATURE_FLAGS.SEARCH_SUGGESTIONS ? (
          <AnimatedSearchBar
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setShowSearchSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
            placeholder="Search automations..."
            theme={theme}
          />
        ) : (
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={20} 
              color={theme.colors.onSurfaceVariant} 
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.onSurface }]}
              placeholder="Search automations..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
        )}

        {/* Search Suggestions */}
        {FEATURE_FLAGS.SEARCH_SUGGESTIONS && showSearchSuggestions && searchQuery.length > 0 && (
          <View style={[styles.suggestionsContainer, { backgroundColor: theme.colors.surface }]}>
            <FlatList
              data={searchSuggestions.filter(s => 
                s.text.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              renderItem={renderSearchSuggestion}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoriesSection}>
        {FEATURE_FLAGS.STAGGERED_ANIMATIONS ? (
          <AnimatedCategoryChips
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={handleCategorySelect}
            theme={theme}
          />
        ) : (
          <FlatList
            data={categories}
            renderItem={renderCategoryChip}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        )}
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollComponent
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          onScroll={FEATURE_FLAGS.ENHANCED_ANIMATIONS ? (event: any) => {
            scrollY.setValue(event.nativeEvent.contentOffset.y);
          } : undefined}
          onMomentumScrollEnd={handleLoadMore}
        >
          {/* Featured Section */}
          {featuredAutomation && selectedCategory === 'all' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Featured
              </Text>
              <FeaturedCard
                automation={featuredAutomation}
                onPress={() => handleAutomationPress(featuredAutomation)}
                onLike={() => handleLike(featuredAutomation.id, featuredAutomation.hasLiked || false)}
                theme={theme}
              />
            </View>
          )}

          {/* Trending Section */}
          {FEATURE_FLAGS.TRENDING_CAROUSEL && trendingAutomations.length > 0 && selectedCategory === 'all' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                Trending Now
              </Text>
              <TrendingCarousel
                data={trendingAutomations}
                onItemPress={handleAutomationPress}
                onLike={handleLike}
              />
            </View>
          )}

          {/* All Automations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                {selectedCategory === 'all' ? 'All Automations' : 
                 categories.find(c => c.id === selectedCategory)?.name || 'Automations'}
              </Text>
              <Text style={[styles.resultCount, { color: theme.colors.onSurfaceVariant }]}>
                {filteredAutomations.length} results
              </Text>
            </View>

            {filteredAutomations.length === 0 ? (
              <EmptyState
                icon="magnify-scan"
                title="No Results Found"
                description={searchQuery ? 
                  `No automations found for "${searchQuery}"` : 
                  "No automations in this category"
                }
                action={searchQuery ? {
                  label: "Clear Search",
                  onPress: () => {
                    setSearchQuery('');
                    setShowSearchSuggestions(false);
                  },
                } : undefined}
              />
            ) : (
              <FlatList
                data={filteredAutomations}
                renderItem={renderAutomationCard}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
                contentContainerStyle={styles.automationsList}
              />
            )}
          </View>

          {/* Load More */}
          {loadingMore && (
            <View style={styles.loadMoreContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadMoreText, { color: theme.colors.onSurfaceVariant }]}>
                Loading more...
              </Text>
            </View>
          )}
        </ScrollComponent>
      </Animated.View>

      {/* Feedback Toast */}
      {feedback.visible && (
        <Animated.View 
          style={[
            styles.feedbackToast,
            { backgroundColor: theme.colors.surface },
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.multiply(fadeAnim, -50) }]
            }
          ]}
        >
          <MaterialCommunityIcons 
            name={feedback.type === 'success' ? 'check-circle' :
                  feedback.type === 'error' ? 'alert-circle' : 'alert'}
            size={20}
            color={feedback.type === 'success' ? '#4CAF50' :
                  feedback.type === 'error' ? '#F44336' : '#FF9800'}
          />
          <Text style={[styles.feedbackText, { color: theme.colors.onSurface }]}>
            {feedback.message}
          </Text>
        </Animated.View>
      )}
    </SafeAreaView>
    </ScreenErrorBoundary>
  );
});

DiscoverScreen.displayName = 'DiscoverScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 16,
  },
  suggestionType: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  categoriesSection: {
    paddingVertical: 12,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryChipSelected: {},
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  categoryChipCount: {
    fontSize: 12,
    opacity: 0.8,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  resultCount: {
    fontSize: 14,
  },
  automationsList: {
    paddingHorizontal: 20,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
  },
  feedbackToast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DiscoverScreen;