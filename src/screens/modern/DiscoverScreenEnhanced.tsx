import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
  { id: 'all', name: 'All', icon: 'view-grid', gradientKey: 'primary' as keyof typeof gradients },
  { id: 'popular', name: 'Popular', icon: 'trending-up', gradientKey: 'fire' as keyof typeof gradients },
  { id: 'new', name: 'New', icon: 'star', gradientKey: 'aurora' as keyof typeof gradients },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase', gradientKey: 'ocean' as keyof typeof gradients },
  { id: 'smart-home', name: 'Smart Home', icon: 'home-automation', gradientKey: 'forest' as keyof typeof gradients },
  { id: 'entertainment', name: 'Entertainment', icon: 'gamepad', gradientKey: 'sunset' as keyof typeof gradients },
  { id: 'health', name: 'Health', icon: 'heart', gradientKey: 'success' as keyof typeof gradients },
  { id: 'social', name: 'Social', icon: 'account-group', gradientKey: 'secondary' as keyof typeof gradients },
];

// Sample data for enhanced features
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
    color: '#FF9500',
    gradientKey: 'sunset',
    rating: 4.8,
    installs: '10K+',
    image: 'morning-routine',
    tags: ['morning', 'routine', 'smart-home'],
  },
  {
    id: '2',
    title: 'Focus Mode Pro',
    description: 'Block distractions and boost productivity instantly',
    author: 'Sarah Kim',
    authorAvatar: '👩‍🎨',
    likes: 189,
    uses: 890,
    category: 'productivity',
    icon: 'target',
    color: '#007AFF',
    gradientKey: 'ocean',
    rating: 4.6,
    installs: '5K+',
    image: 'focus-mode',
    tags: ['focus', 'productivity', 'block'],
  },
  {
    id: '3',
    title: 'Smart Home Evening',
    description: 'Automatically prepare your home for a relaxing evening',
    author: 'Mike Johnson',
    authorAvatar: '🏠',
    likes: 156,
    uses: 670,
    category: 'smart-home',
    icon: 'home-heart',
    color: '#34C759',
    gradientKey: 'forest',
    rating: 4.7,
    installs: '3K+',
    image: 'evening-routine',
    tags: ['evening', 'smart-home', 'relax'],
  },
];

const topCreators: Creator[] = [
  { id: '1', name: 'Alex Chen', avatar: '👨‍💻', automations: 45, followers: '12K', verified: true },
  { id: '2', name: 'Sarah Kim', avatar: '👩‍🎨', automations: 32, followers: '8.5K', verified: true },
  { id: '3', name: 'Mike Johnson', avatar: '🏠', automations: 28, followers: '6.2K', verified: false },
  { id: '4', name: 'Emma Wilson', avatar: '🎵', automations: 19, followers: '4.8K', verified: true },
];

export default function DiscoverScreenEnhanced() {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { connectionState } = useConnection();
  const { isConnected } = connectionState;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Carousel animation
  const featuredScrollX = useRef(new Animated.Value(0)).current;
  
  // API queries
  const { 
    data: publicAutomations = [], 
    isLoading: isLoadingPublic,
    error: publicError,
    refetch: refetchPublic 
  } = useGetPublicAutomationsQuery({ limit: 50 });
  
  const { 
    data: trendingAutomations = [],
    isLoading: isLoadingTrending,
    refetch: refetchTrending 
  } = useGetTrendingAutomationsQuery({ limit: 10, timeWindow: '7 days' });

  const [likeAutomation] = useLikeAutomationMutation();
  const [unlikeAutomation] = useUnlikeAutomationMutation();

  const isLoading = isLoadingPublic || isLoadingTrending;

  // Entry animation
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: ANIMATION_CONFIG.SPRING_TENSION,
          friction: ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  // Featured carousel auto-scroll
  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredAutomations.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchPublic(), refetchTrending()]);
    setRefreshing(false);
  }, [refetchPublic, refetchTrending]);

  const handleLike = useCallback(async (automation: Automation) => {
    if (!user) {
      navigation.navigate('SignIn' as never);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      if (automation.hasLiked) {
        await unlikeAutomation(automation.id);
      } else {
        await likeAutomation(automation.id);
      }
    } catch (error) {
      console.error('Failed to like/unlike automation:', error);
    }
  }, [user, navigation, likeAutomation, unlikeAutomation]);

  const handleAutomationPress = useCallback((automation: Automation) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('AutomationDetails' as never, { 
      automationId: automation.id,
      fromGallery: true 
    } as never);
  }, [navigation]);

  const handleCategoryPress = useCallback((categoryId: string) => {
    Haptics.selectionAsync();
    setSelectedCategory(categoryId);
  }, []);

  const handleSearchFocus = useCallback(() => {
    Animated.timing(searchFocusAnim, {
      toValue: 1,
      duration: ANIMATION_CONFIG.FOCUS_ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, []);

  const handleSearchBlur = useCallback(() => {
    Animated.timing(searchFocusAnim, {
      toValue: 0,
      duration: ANIMATION_CONFIG.FOCUS_ANIMATION_DURATION,
      useNativeDriver: false,
    }).start();
  }, []);

  // Map API data to the expected format
  const mappedPublicAutomations = useMemo(() => {
    return publicAutomations?.map((automation, index) => ({
      ...automation,
      icon: automation.icon || 'robot',
      color: automation.color || '#2196F3',
      likes: automation.likes_count || automation.rating_count || 0,
      uses: automation.execution_count || automation.downloads_count || 0,
      author: automation.created_by_name || 'Unknown Author',
      hasLiked: automation.has_liked || false,
      gradientKey: Object.keys(gradients)[index % Object.keys(gradients).length] as keyof typeof gradients,
    })) || [];
  }, [publicAutomations]);

  const mappedTrendingAutomations = useMemo(() => {
    return trendingAutomations?.map((automation, index) => ({
      ...automation,
      icon: automation.icon || 'robot',
      color: automation.color || '#FF6B6B',
      likes: automation.likes_count || automation.rating_count || 0,
      uses: automation.execution_count || automation.downloads_count || 0,
      author: automation.created_by_name || 'Unknown Author',
      trending: true,
      gradientKey: ['fire', 'sunset', 'aurora', 'cosmic', 'rainbow'][index % 5] as keyof typeof gradients,
    })) || [];
  }, [trendingAutomations]);

  const filteredAutomations = useMemo(() => {
    return mappedPublicAutomations?.filter(automation => {
      const matchesCategory = selectedCategory === 'all' || automation.category === selectedCategory;
      const matchesSearch = automation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           automation.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }) || [];
  }, [mappedPublicAutomations, selectedCategory, searchQuery]);

  const renderFeaturedItem = useCallback(({ item, index }: { item: Automation; index: number }) => (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={() => handleAutomationPress(item)}
      activeOpacity={0.9}
    >
      <GradientCard
        gradientKey={item.gradientKey || 'primary'}
        style={styles.featuredCardContent}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.featuredOverlay}
        >
          <View style={styles.featuredInfo}>
            <View style={styles.featuredHeader}>
              <View style={[styles.featuredIcon, { backgroundColor: item.color }]}>
                <MaterialCommunityIcons name={item.icon as any} size={28} color="white" />
              </View>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            </View>
            
            <Text style={[styles.featuredTitle, textShadows.medium]}>
              {item.title}
            </Text>
            <Text style={[styles.featuredDescription, textShadows.subtle]}>
              {item.description}
            </Text>
            
            <View style={styles.featuredFooter}>
              <View style={styles.featuredStats}>
                <View style={styles.featuredStat}>
                  <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                  <Text style={styles.featuredStatText}>{item.rating}</Text>
                </View>
                <View style={styles.featuredStat}>
                  <MaterialCommunityIcons name="download" size={16} color="white" />
                  <Text style={styles.featuredStatText}>{item.installs}</Text>
                </View>
              </View>
              <Text style={styles.featuredAuthor}>by {item.author}</Text>
            </View>
          </View>
        </LinearGradient>
      </GradientCard>
    </TouchableOpacity>
  ), [handleAutomationPress]);

  const renderCategoryChip = useCallback(({ item }: { item: typeof categories[0] }) => (
    <TouchableOpacity
      onPress={() => handleCategoryPress(item.id)}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.categoryChip,
          selectedCategory === item.id && styles.categoryChipActive,
        ]}
      >
        {selectedCategory === item.id ? (
          <LinearGradient
            colors={gradients[item.gradientKey].colors}
            start={gradients[item.gradientKey].start}
            end={gradients[item.gradientKey].end}
            style={styles.categoryChipGradient}
          >
            <MaterialCommunityIcons 
              name={item.icon as any} 
              size={20} 
              color="white" 
            />
            <Text style={[styles.categoryChipText, { color: 'white' }]}>
              {item.name}
            </Text>
          </LinearGradient>
        ) : (
          <View style={[styles.categoryChipContent, getGlassStyle('light')]}>
            <MaterialCommunityIcons 
              name={item.icon as any} 
              size={20} 
              color={theme.colors?.text || '#000'} 
            />
            <Text style={[styles.categoryChipText, { color: theme.colors?.text || '#000' }]}>
              {item.name}
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  ), [selectedCategory, theme.colors, handleCategoryPress]);

  const renderTrendingCard = useCallback(({ item, index }: { item: Automation; index: number }) => (
    <Animated.View
      style={[
        styles.trendingCardContainer,
        {
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 50],
              outputRange: [0, 50],
            }),
          }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => handleAutomationPress(item)}
        activeOpacity={0.9}
      >
        <GradientCard
          gradientKey={item.gradientKey || 'primary'}
          style={styles.trendingCard}
        >
          <View style={styles.trendingContent}>
            <View style={[styles.trendingIcon, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons name={item.icon as any} size={32} color="white" />
            </View>
            <View style={styles.trendingBadge}>
              <MaterialCommunityIcons name="trending-up" size={12} color="#FF6B6B" />
            </View>
          </View>
          
          <Text style={[styles.trendingTitle, textShadows.subtle]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.trendingStats}>
            <Text style={styles.trendingStatText}>
              {item.likes} likes · {item.uses} uses
            </Text>
          </View>
        </GradientCard>
      </TouchableOpacity>
    </Animated.View>
  ), [handleAutomationPress, slideAnim, fadeAnim]);

  const renderAutomationCard = useCallback(({ item, index }: { item: Automation; index: number }) => (
    <Animated.View
      style={[
        styles.automationCardContainer,
        {
          transform: [{
            translateY: slideAnim.interpolate({
              inputRange: [0, 50],
              outputRange: [0, 50],
            }),
          }],
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => handleAutomationPress(item)}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          // Could show preview modal here
        }}
        activeOpacity={0.9}
      >
        <GradientCard
          gradientKey={item.gradientKey || 'primary'}
          style={styles.automationCard}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
              <MaterialCommunityIcons name={item.icon as any} size={24} color="white" />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, textShadows.subtle]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardAuthor}>
                by {item.author}
              </Text>
            </View>
            {item.trending && (
              <View style={styles.trendingBadgeSmall}>
                <MaterialCommunityIcons name="trending-up" size={16} color="#FF6B6B" />
              </View>
            )}
          </View>
          
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => handleLike(item)}
            >
              <MaterialCommunityIcons 
                name={item.hasLiked ? "heart" : "heart-outline"} 
                size={20} 
                color={item.hasLiked ? "#FF6B6B" : "rgba(255,255,255,0.7)"} 
              />
              <Text style={styles.statText}>
                {item.likes}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons 
                name="download" 
                size={20} 
                color="rgba(255,255,255,0.7)" 
              />
              <Text style={styles.statText}>
                {item.uses}
              </Text>
            </View>
            
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {item.category}
              </Text>
            </View>
          </View>
          
          {item.tags && (
            <View style={styles.cardTags}>
              {item.tags.slice(0, 3).map((tag, tagIndex) => (
                <View key={tagIndex} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </GradientCard>
      </TouchableOpacity>
    </Animated.View>
  ), [handleAutomationPress, handleLike, slideAnim, fadeAnim]);

  const renderCreatorCard = useCallback(({ item }: { item: Creator }) => (
    <TouchableOpacity
      style={styles.creatorCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Navigate to creator profile
      }}
      activeOpacity={0.9}
    >
      <View style={[styles.creatorCardContent, getGlassStyle('medium')]}>
        <View style={styles.creatorHeader}>
          <View style={styles.creatorAvatarContainer}>
            <LinearGradient
              colors={gradients.primary.colors}
              style={styles.creatorAvatarGradient}
            >
              <View style={styles.creatorAvatar}>
                <Text style={styles.creatorAvatarText}>{item.avatar}</Text>
              </View>
            </LinearGradient>
            {item.verified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#007AFF" />
              </View>
            )}
          </View>
        </View>
        
        <Text style={[styles.creatorName, textShadows.subtle]} numberOfLines={1}>
          {item.name}
        </Text>
        
        <View style={styles.creatorStats}>
          <View style={styles.creatorStat}>
            <Text style={styles.creatorStatNumber}>{item.automations}</Text>
            <Text style={styles.creatorStatLabel}>Automations</Text>
          </View>
          <View style={styles.creatorStat}>
            <Text style={styles.creatorStatNumber}>{item.followers}</Text>
            <Text style={styles.creatorStatLabel}>Followers</Text>
          </View>
        </View>
        
        <GradientButton
          title="Follow"
          gradientKey="primary"
          size="small"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            // Handle follow
          }}
          style={styles.followButton}
        />
      </View>
    </TouchableOpacity>
  ), []);

  const animatedSearchStyle = {
    borderColor: searchFocusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255,255,255,0.3)', gradients.primary.colors[0]],
    }),
    borderWidth: searchFocusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    }),
    shadowOpacity: searchFocusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.1, 0.3],
    }),
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <GradientHeader
          title="Discover"
          subtitle="Explore amazing automations"
          scrollY={scrollY}
        />
        <EmptyStateIllustration
          icon="wifi-off"
          title="No Internet Connection"
          description="Please check your connection and try again"
          actionTitle="Retry"
          onAction={handleRefresh}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <GradientHeader
          title="Discover"
          subtitle="Loading amazing automations..."
          scrollY={scrollY}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={gradients.primary.colors[0]} />
          <Text style={[styles.loadingText, { color: theme.colors?.text || '#000' }]}>
            Discovering automations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <GradientHeader
        title="Discover"
        subtitle="Explore amazing automations from the community"
        scrollY={scrollY}
        rightComponent={
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Open search filters
            }}
          >
            <MaterialCommunityIcons name="tune" size={24} color="white" />
          </TouchableOpacity>
        }
      />
      
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={ANIMATION_CONFIG.SCROLL_THROTTLE}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[gradients.primary.colors[0]]}
            tintColor={gradients.primary.colors[0]}
          />
        }
      >
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Animated.View style={[styles.searchContainer, animatedSearchStyle, getGlassStyle('medium')]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={24} 
              color="rgba(255,255,255,0.7)" 
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search automations..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
          </Animated.View>
        </View>

        {/* Category Section */}
        <View style={styles.categorySection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            renderItem={renderCategoryChip}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Featured Section */}
        <View style={styles.featuredSection}>
          <Text style={[styles.sectionTitle, textShadows.medium]}>
            ✨ Featured This Week
          </Text>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={featuredAutomations}
            renderItem={renderFeaturedItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.featuredList}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: featuredScrollX } } }],
              { useNativeDriver: false }
            )}
          />
          
          {/* Featured Indicators */}
          <View style={styles.featuredIndicators}>
            {featuredAutomations.map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.indicator,
                  {
                    opacity: featuredScrollX.interpolate({
                      inputRange: [
                        (index - 1) * screenWidth,
                        index * screenWidth,
                        (index + 1) * screenWidth,
                      ],
                      outputRange: [0.3, 1, 0.3],
                      extrapolate: 'clamp',
                    }),
                    transform: [{
                      scale: featuredScrollX.interpolate({
                        inputRange: [
                          (index - 1) * screenWidth,
                          index * screenWidth,
                          (index + 1) * screenWidth,
                        ],
                        outputRange: [0.8, 1.2, 0.8],
                        extrapolate: 'clamp',
                      }),
                    }],
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Trending Section */}
        {mappedTrendingAutomations.length > 0 && (
          <View style={styles.trendingSection}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="trending-up" size={24} color="#FF6B6B" />
              <Text style={[styles.sectionTitle, textShadows.medium]}>
                Trending Now
              </Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={mappedTrendingAutomations}
              renderItem={renderTrendingCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.trendingList}
            />
          </View>
        )}

        {/* Creator Spotlight */}
        <View style={styles.creatorSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-star" size={24} color="#FFD700" />
            <Text style={[styles.sectionTitle, textShadows.medium]}>
              Top Creators
            </Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={topCreators}
            renderItem={renderCreatorCard}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.creatorsList}
          />
        </View>

        {/* All Automations */}
        <View style={styles.automationsSection}>
          <Text style={[styles.sectionTitle, textShadows.medium]}>
            {selectedCategory === 'all' ? 'All Automations' : categories.find(c => c.id === selectedCategory)?.name}
          </Text>
          {filteredAutomations.length === 0 ? (
            <EmptyStateIllustration
              icon="magnify"
              title="No automations found"
              description="Try adjusting your filters or search"
            />
          ) : (
            <FlatList
              data={filteredAutomations}
              renderItem={renderAutomationCard}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.automationsList}
              numColumns={2}
              columnWrapperStyle={styles.automationsRow}
            />
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    ...typography.bodyLarge,
    marginTop: 16,
    opacity: 0.7,
  },

  // Search Section
  searchSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyLarge,
    color: 'white',
    marginLeft: 12,
  },

  // Category Section
  categorySection: {
    marginTop: 8,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryChip: {
    marginRight: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryChipActive: {
    // Additional active state styles handled by gradient
  },
  categoryChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipText: {
    ...typography.labelMedium,
    fontWeight: fontWeights.semibold,
    marginLeft: 6,
  },

  // Featured Section
  featuredSection: {
    marginTop: 32,
  },
  featuredList: {
    paddingHorizontal: 20,
  },
  featuredCard: {
    width: screenWidth - 40,
    height: 220,
    marginRight: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  featuredCardContent: {
    flex: 1,
  },
  featuredOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredInfo: {
    padding: 20,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featuredIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  featuredBadgeText: {
    ...typography.labelSmall,
    color: 'white',
    fontWeight: fontWeights.semibold,
  },
  featuredTitle: {
    ...typography.headlineMedium,
    color: 'white',
    fontWeight: fontWeights.bold,
    marginBottom: 8,
  },
  featuredDescription: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredStats: {
    flexDirection: 'row',
  },
  featuredStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  featuredStatText: {
    ...typography.labelMedium,
    color: 'white',
    marginLeft: 4,
    fontWeight: fontWeights.semibold,
  },
  featuredAuthor: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  featuredIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 4,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    ...typography.headlineSmall,
    color: 'white',
    fontWeight: fontWeights.bold,
    marginLeft: 8,
  },

  // Trending Section
  trendingSection: {
    marginTop: 32,
  },
  trendingList: {
    paddingHorizontal: 20,
  },
  trendingCardContainer: {
    marginRight: 16,
  },
  trendingCard: {
    width: 160,
    height: 180,
    padding: 16,
  },
  trendingContent: {
    alignItems: 'center',
    position: 'relative',
  },
  trendingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendingBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  trendingTitle: {
    ...typography.titleMedium,
    color: 'white',
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
    marginBottom: 8,
  },
  trendingStats: {
    marginTop: 'auto',
  },
  trendingStatText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  // Creator Section
  creatorSection: {
    marginTop: 32,
  },
  creatorsList: {
    paddingHorizontal: 20,
  },
  creatorCard: {
    width: 140,
    marginRight: 16,
  },
  creatorCardContent: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  creatorHeader: {
    marginBottom: 12,
  },
  creatorAvatarContainer: {
    position: 'relative',
  },
  creatorAvatarGradient: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 3,
  },
  creatorAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorAvatarText: {
    fontSize: 24,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 2,
  },
  creatorName: {
    ...typography.titleSmall,
    color: 'white',
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
    marginBottom: 8,
  },
  creatorStats: {
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorStat: {
    alignItems: 'center',
    marginBottom: 4,
  },
  creatorStatNumber: {
    ...typography.labelLarge,
    color: 'white',
    fontWeight: fontWeights.bold,
  },
  creatorStatLabel: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
  followButton: {
    minWidth: 80,
  },

  // Automations Section
  automationsSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  automationsList: {
    marginTop: 16,
  },
  automationsRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  automationCardContainer: {
    width: (screenWidth - 56) / 2, // Account for padding and gap
  },
  automationCard: {
    padding: 16,
    minHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    ...typography.titleMedium,
    color: 'white',
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  cardAuthor: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  trendingBadgeSmall: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  cardDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  categoryBadge: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  categoryBadgeText: {
    ...typography.labelSmall,
    color: 'white',
    fontWeight: fontWeights.semibold,
  },
  cardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    ...typography.labelSmall,
    color: 'rgba(255,255,255,0.9)',
  },
});