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
import SafeCategoryChips from '../../components/discover/SafeCategoryChips';
import AnimatedAutomationCard from '../../components/discover/AnimatedAutomationCard';
import AnimatedSearchBar from '../../components/discover/AnimatedSearchBar';

// Hooks for real data
import { useRealCategoryCounts } from '../../hooks/useRealCategoryCounts';

// Enhanced gradient components
import { GradientHeader } from '../../components/shared/GradientHeader';
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
  CATEGORY_ANIMATIONS: Platform.OS !== 'web',
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
  isPopular?: boolean;
  isNew?: boolean;
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
  { id: 'all', name: 'All', icon: 'view-grid', gradient: ['#667eea', '#764ba2'], gradientKey: 'primary' as keyof typeof gradients },
  { id: 'popular', name: 'Popular', icon: 'trending-up', gradient: ['#ff9a9e', '#fecfef'], gradientKey: 'fire' as keyof typeof gradients },
  { id: 'new', name: 'New', icon: 'star', gradient: ['#a8edea', '#fed6e3'], gradientKey: 'aurora' as keyof typeof gradients },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase', gradient: ['#f093fb', '#f5576c'], gradientKey: 'ocean' as keyof typeof gradients },
  { id: 'smart-home', name: 'Smart Home', icon: 'home-automation', gradient: ['#4facfe', '#00f2fe'], gradientKey: 'forest' as keyof typeof gradients },
  { id: 'health', name: 'Health', icon: 'heart', gradient: ['#43e97b', '#38f9d7'], gradientKey: 'success' as keyof typeof gradients },
  { id: 'finance', name: 'Finance', icon: 'cash', gradient: ['#fa709a', '#fee140'] },
  { id: 'social', name: 'Social', icon: 'account-group', gradient: ['#a8edea', '#fed6e3'], gradientKey: 'secondary' as keyof typeof gradients },
  { id: 'entertainment', name: 'Entertainment', icon: 'gamepad', gradient: ['#ff9a9e', '#fecfef'], gradientKey: 'sunset' as keyof typeof gradients },
  { id: 'travel', name: 'Travel', icon: 'airplane', gradient: ['#ffecd2', '#fcb69f'] },
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

// Sample featured automations for enhanced features - expanded with all categories
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
    tags: ['morning', 'smart-home', 'routine', 'productivity'],
    rating: 4.8,
    installs: '1.2k',
    featured: true,
    isPopular: true,
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
    isPopular: true,
  },
  {
    id: '3',
    title: 'Smart Home Control',
    description: 'Control all your smart devices with one tap',
    author: 'Mike Johnson',
    authorAvatar: '🧑‍💻',
    likes: 312,
    uses: 1500,
    category: 'smart-home',
    icon: 'home-automation',
    color: '#4CAF50',
    gradientKey: 'forest',
    tags: ['smart-home', 'automation', 'iot'],
    rating: 4.7,
    installs: '1.5k',
    isPopular: true,
  },
  {
    id: '4',
    title: 'Fitness Tracker Pro',
    description: 'Track workouts, calories, and progress automatically',
    author: 'Emma Wilson',
    authorAvatar: '🏋️‍♀️',
    likes: 156,
    uses: 670,
    category: 'health',
    icon: 'run',
    color: '#FF5722',
    gradientKey: 'fire',
    tags: ['health', 'fitness', 'tracking'],
    rating: 4.6,
    installs: '670',
    isPopular: true,
  },
  {
    id: '5',
    title: 'Budget Manager',
    description: 'Automated expense tracking and budget alerts',
    author: 'David Park',
    authorAvatar: '💰',
    likes: 98,
    uses: 450,
    category: 'finance',
    icon: 'cash',
    color: '#4CAF50',
    gradientKey: 'success',
    tags: ['finance', 'budget', 'money'],
    rating: 4.5,
    installs: '450',
  },
  {
    id: '6',
    title: 'Social Media Scheduler',
    description: 'Post to all platforms at optimal times',
    author: 'Lisa Chen',
    authorAvatar: '📱',
    likes: 210,
    uses: 920,
    category: 'social',
    icon: 'share-variant',
    color: '#E91E63',
    gradientKey: 'secondary',
    tags: ['social', 'media', 'scheduling'],
    rating: 4.4,
    installs: '920',
    isPopular: true,
  },
  {
    id: '7',
    title: 'Gaming Mode',
    description: 'Optimize device for gaming performance',
    author: 'Tom Gaming',
    authorAvatar: '🎮',
    likes: 367,
    uses: 1800,
    category: 'entertainment',
    icon: 'gamepad-variant',
    color: '#FF9800',
    gradientKey: 'sunset',
    tags: ['entertainment', 'gaming', 'performance'],
    rating: 4.9,
    installs: '1.8k',
    isPopular: true,
  },
  {
    id: '8',
    title: 'Travel Planner',
    description: 'Automated itinerary and booking management',
    author: 'Global Nomad',
    authorAvatar: '✈️',
    likes: 134,
    uses: 560,
    category: 'travel',
    icon: 'airplane',
    color: '#00BCD4',
    gradientKey: 'aurora',
    tags: ['travel', 'planning', 'booking'],
    rating: 4.7,
    installs: '560',
  },
  {
    id: '9',
    title: 'Movie Night Setup',
    description: 'Perfect ambiance for movie watching',
    author: 'Cinema Buff',
    authorAvatar: '🎬',
    likes: 89,
    uses: 340,
    category: 'entertainment',
    icon: 'movie',
    color: '#673AB7',
    gradientKey: 'primary',
    tags: ['entertainment', 'movies', 'ambiance'],
    rating: 4.3,
    installs: '340',
    isNew: true,
  },
  {
    id: '10',
    title: 'Study Mode',
    description: 'Optimal environment for focused studying',
    author: 'Student Helper',
    authorAvatar: '📚',
    likes: 276,
    uses: 1100,
    category: 'productivity',
    icon: 'school',
    color: '#2196F3',
    gradientKey: 'ocean',
    tags: ['productivity', 'study', 'focus'],
    rating: 4.8,
    installs: '1.1k',
    isNew: true,
  },
];

const DiscoverScreen: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { isOnline, isBackendConnected } = useConnection();
  const isConnected = isOnline && isBackendConnected;
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Get real category counts from Supabase
  const { categoryCounts, isLoading: isLoadingCounts } = useRealCategoryCounts();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [featuredAutomation, setFeaturedAutomation] = useState<Automation | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categoryTransition, setCategoryTransition] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; visible: boolean }>({ 
    type: 'success', 
    message: '', 
    visible: false 
  });
  
  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const categoryFadeAnim = useRef(new Animated.Value(1)).current;
  
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

  // Merge real counts with categories
  const categoriesWithCounts = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      count: categoryCounts[cat.id] || 0,
      gradient: cat.gradient && cat.gradient.length >= 2 ? cat.gradient : ['#667eea', '#764ba2']
    }));
  }, [categoryCounts]);

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
      const selectedCat = categoriesWithCounts.find(cat => cat.id === categoryId);
      const wasSelected = selectedCategory === categoryId;
      
      // If already selected, don't change
      if (wasSelected) {
        triggerHaptic('light');
        showFeedback('success', `Already viewing ${selectedCat?.name || 'All'} automations`);
        return;
      }

      setCategoryTransition(true);
      setSelectedCategory(categoryId);
      triggerHaptic('medium');
      
      // Show feedback about category change
      showFeedback('success', `Browsing ${selectedCat?.name || 'All'} automations (${selectedCat?.count || 0} available)`);
      
      if (FEATURE_FLAGS.CATEGORY_ANIMATIONS) {
        // Animate category transition
        Animated.sequence([
          Animated.timing(categoryFadeAnim, {
            toValue: 0.3,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(categoryFadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCategoryTransition(false);
        });
      } else {
        setCategoryTransition(false);
      }
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Category selection failed', error as Error, {
        categoryId,
        userId: user?.id,
      });
      showFeedback('error', 'Failed to update category');
      setCategoryTransition(false);
    }
  }, [selectedCategory, categoriesWithCounts, triggerHaptic, showFeedback, categoryFadeAnim]);

  const handleSearch = useCallback((query: string) => {
    try {
      setSearchQuery(query);
      setShowSearchSuggestions(query.length > 0);
      triggerHaptic('light');
      
      // Clear category filter when searching to show all results
      if (query.length > 0 && selectedCategory !== 'all') {
        setSelectedCategory('all');
        showFeedback('success', `Searching all categories for "${query}"`);
      }
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Search operation failed', error as Error, {
        searchQuery: query,
        userId: user?.id,
        connectionState: isConnected,
      });
    }
  }, [selectedCategory, triggerHaptic, showFeedback]);

  const handleSearchSuggestionPress = useCallback((suggestion: any) => {
    try {
      setSearchQuery(suggestion.text);
      setShowSearchSuggestions(false);
      triggerHaptic('medium');
      
      // If it's a category suggestion, also update the category
      if (suggestion.type === 'category') {
        const categoryId = categoriesWithCounts.find(cat => 
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
  }, [categoriesWithCounts, triggerHaptic]);

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
        action: isLiked ? 'unlike' : 'like',
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
        userId: user?.id,
      });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, isConnected]);

  // Filter automations based on search and category - fixed to properly filter by category
  const filteredAutomations = useMemo(() => {
    try {
      // For demo purposes, create sample automations if API data is empty
      const automationsToFilter = publicAutomations.length > 0 ? publicAutomations : featuredAutomations;
      
      return automationsToFilter.filter((automation: any) => {
        const matchesSearch = !searchQuery || 
          automation.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          automation.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          automation.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          automation.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
        
        // Fixed category matching logic
        const matchesCategory = selectedCategory === 'all' || 
                               selectedCategory === 'popular' && (automation.featured || automation.isPopular) ||
                               selectedCategory === 'new' && automation.isNew ||
                               automation.category === selectedCategory ||
                               automation.tags?.includes(selectedCategory);
        
        return matchesSearch && matchesCategory;
      });
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Automation filtering failed', error as Error, {
        selectedCategory,
        searchQuery,
        userId: user?.id,
      });
      return [];
    }
  }, [publicAutomations, searchQuery, selectedCategory, featuredAutomations]);

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
        ]}
        onPress={() => handleCategorySelect(item.id)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isSelected ? item.gradient || [theme.colors.primary, theme.colors.primary] : ['transparent', 'transparent']}
          style={[
            styles.categoryChipGradient, 
            !isSelected && { backgroundColor: theme.colors.surfaceVariant },
            isSelected && styles.selectedChipGradient
          ]}
        >
          <MaterialCommunityIcons 
            name={item.icon as any} 
            size={16} 
            color={isSelected ? 'white' : theme.colors.onSurfaceVariant} 
          />
          <Text style={[
            styles.categoryChipText,
            { color: isSelected ? 'white' : theme.colors.onSurfaceVariant },
            isSelected && styles.selectedChipText
          ]}>
            {item.name}
          </Text>
          {item.count && (
            <View style={[
              styles.countBadge,
              { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : theme.colors.primary + '20' }
            ]}>
              <Text style={[
                styles.categoryChipCount,
                { color: isSelected ? 'white' : theme.colors.primary }
              ]}>
                {item.count}
              </Text>
            </View>
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

  // Get current category info for context
  const currentCategory = categoriesWithCounts.find(cat => cat.id === selectedCategory);

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
          <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
            Categories
          </Text>
          {FEATURE_FLAGS.STAGGERED_ANIMATIONS ? (
            <SafeCategoryChips
              categories={categoriesWithCounts}
              selectedCategory={selectedCategory}
              onCategorySelect={handleCategorySelect}
              showCounts={true}
              theme={theme}
            />
          ) : (
            <FlatList
              data={categoriesWithCounts}
              renderItem={renderCategoryChip}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesList}
            />
          )}
          
          {/* Category Context Banner - Enhanced and Fixed */}
          {currentCategory && selectedCategory !== 'all' && (
            <Animated.View
              style={[
                styles.categoryBanner,
                {
                  backgroundColor: currentCategory.gradient?.[0] ? `${currentCategory.gradient[0]}15` : `${theme.colors.primary}15`,
                  borderColor: currentCategory.gradient?.[0] || theme.colors.primary,
                },
                FEATURE_FLAGS.ENHANCED_ANIMATIONS && {
                  opacity: categoryFadeAnim,
                  transform: [{
                    translateY: categoryFadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    })
                  }]
                }
              ]}
            >
              <LinearGradient
                colors={[
                  currentCategory.gradient?.[0] ? `${currentCategory.gradient[0]}08` : `${theme.colors.primary}08`,
                  'transparent'
                ]}
                style={styles.categoryBannerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <View style={styles.categoryBannerContent}>
                <View style={[
                  styles.categoryBannerIcon,
                  { backgroundColor: currentCategory.gradient?.[0] || theme.colors.primary }
                ]}>
                  <MaterialCommunityIcons 
                    name={currentCategory.icon as any} 
                    size={20} 
                    color="white"
                  />
                </View>
                <View style={styles.categoryBannerTextContainer}>
                  <Text style={[styles.categoryBannerTitle, { color: theme.colors.onSurface }]}>
                    {currentCategory.name} Automations
                  </Text>
                  <Text style={[styles.categoryBannerText, { color: theme.colors.onSurfaceVariant }]}>
                    Discover {currentCategory.count} amazing {currentCategory.name.toLowerCase()} automations
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.categoryBannerClose}
                  onPress={() => handleCategorySelect('all')}
                >
                  <MaterialCommunityIcons 
                    name="close" 
                    size={18} 
                    color={theme.colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>

        {/* Content */}
        <Animated.View style={[styles.content, { opacity: categoryTransition ? categoryFadeAnim : fadeAnim }]}>
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
            {/* Quick Actions - New Section */}
            {selectedCategory === 'all' && !searchQuery && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Quick Actions
                </Text>
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity
                    style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('BuildTab' as never)}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.quickActionIcon}
                    >
                      <MaterialCommunityIcons name="plus" size={24} color="white" />
                    </LinearGradient>
                    <Text style={[styles.quickActionTitle, { color: theme.colors.onSurface }]}>
                      Create New
                    </Text>
                    <Text style={[styles.quickActionDesc, { color: theme.colors.onSurfaceVariant }]}>
                      Build custom
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.navigate('BuildTab' as never)}
                  >
                    <LinearGradient
                      colors={['#f093fb', '#f5576c']}
                      style={styles.quickActionIcon}
                    >
                      <MaterialCommunityIcons name="view-grid" size={24} color="white" />
                    </LinearGradient>
                    <Text style={[styles.quickActionTitle, { color: theme.colors.onSurface }]}>
                      Templates
                    </Text>
                    <Text style={[styles.quickActionDesc, { color: theme.colors.onSurfaceVariant }]}>
                      Ready to use
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
                    onPress={() => handleCategorySelect('popular')}
                  >
                    <LinearGradient
                      colors={['#fa709a', '#fee140']}
                      style={styles.quickActionIcon}
                    >
                      <MaterialCommunityIcons name="trending-up" size={24} color="white" />
                    </LinearGradient>
                    <Text style={[styles.quickActionTitle, { color: theme.colors.onSurface }]}>
                      Popular
                    </Text>
                    <Text style={[styles.quickActionDesc, { color: theme.colors.onSurfaceVariant }]}>
                      Most liked
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
                    onPress={() => setShowSearchSuggestions(true)}
                  >
                    <LinearGradient
                      colors={['#4facfe', '#00f2fe']}
                      style={styles.quickActionIcon}
                    >
                      <MaterialCommunityIcons name="magnify" size={24} color="white" />
                    </LinearGradient>
                    <Text style={[styles.quickActionTitle, { color: theme.colors.onSurface }]}>
                      Search
                    </Text>
                    <Text style={[styles.quickActionDesc, { color: theme.colors.onSurfaceVariant }]}>
                      Find specific
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Featured Section */}
            {featuredAutomation && selectedCategory === 'all' && !searchQuery && (
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

            {/* Trending Section - Enhanced */}
            {FEATURE_FLAGS.TRENDING_CAROUSEL && (trendingAutomations.length > 0 || featuredAutomations.filter(a => a.isPopular).length > 0) && selectedCategory === 'all' && !searchQuery && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    🔥 Trending Now
                  </Text>
                  <TouchableOpacity onPress={() => handleCategorySelect('popular')}>
                    <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                      See All
                    </Text>
                  </TouchableOpacity>
                </View>
                <TrendingCarousel
                  data={trendingAutomations.length > 0 ? trendingAutomations : featuredAutomations.filter(a => a.isPopular)}
                  onItemPress={handleAutomationPress}
                  onLike={handleLike}
                />
              </View>
            )}

            {/* All Automations */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  {searchQuery ? `Search Results for "${searchQuery}"` :
                   selectedCategory === 'all' ? 'All Automations' : 
                   currentCategory?.name || 'Automations'}
                </Text>
                <Text style={[styles.resultCount, { color: theme.colors.onSurfaceVariant }]}>
                  {filteredAutomations.length} result{filteredAutomations.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {categoryTransition ? (
                <View style={styles.transitionLoader}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={[styles.transitionText, { color: theme.colors.onSurfaceVariant }]}>
                    Loading {currentCategory?.name?.toLowerCase() || 'automations'}...
                  </Text>
                </View>
              ) : filteredAutomations.length === 0 ? (
                <EmptyState
                  icon={searchQuery ? "magnify-scan" : selectedCategory === 'all' ? "robot-confused" : "folder-open"}
                  title={searchQuery ? "No Results Found" : "No Automations Yet"}
                  description={searchQuery ? 
                    `No automations found for "${searchQuery}"` : 
                    selectedCategory === 'all' ? 
                      "No automations available right now" :
                      `No ${currentCategory?.name?.toLowerCase()} automations available`
                  }
                  action={searchQuery ? {
                    label: "Clear Search",
                    onPress: () => {
                      setSearchQuery('');
                      setShowSearchSuggestions(false);
                    },
                  } : selectedCategory !== 'all' ? {
                    label: "Browse All Categories",
                    onPress: () => handleCategorySelect('all'),
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
            pointerEvents="box-none"
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
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryChipSelected: {
    elevation: 4,
    shadowOpacity: 0.2,
  },
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  selectedChipGradient: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedChipText: {
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryChipCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  categoryBannerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  categoryBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryBannerTextContainer: {
    flex: 1,
  },
  categoryBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  categoryBannerText: {
    fontSize: 13,
  },
  categoryBannerClose: {
    padding: 8,
    marginLeft: 8,
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
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 20,
    gap: 12,
  },
  quickActionCard: {
    width: (screenWidth - 40 - 12) / 2 - 6,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  quickActionDesc: {
    fontSize: 12,
  },
  automationsList: {
    paddingHorizontal: 20,
  },
  transitionLoader: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  transitionText: {
    fontSize: 14,
    fontWeight: '500',
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
    bottom: 120,
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
    zIndex: 998,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DiscoverScreen;
