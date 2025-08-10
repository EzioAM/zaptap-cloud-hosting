import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Animated,
  Dimensions,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

// Components
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';
import { EventLogger } from '../../utils/EventLogger';

const { width: screenWidth } = Dimensions.get('window');

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
  tags?: string[];
  rating?: number;
  installs?: string;
  featured?: boolean;
  isPopular?: boolean;
  isNew?: boolean;
}

const categories = [
  { id: 'all', name: 'All', icon: 'view-grid', gradient: ['#667eea', '#764ba2'] },
  { id: 'popular', name: 'Popular', icon: 'trending-up', gradient: ['#ff9a9e', '#fecfef'] },
  { id: 'new', name: 'New', icon: 'star', gradient: ['#a8edea', '#fed6e3'] },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase', gradient: ['#f093fb', '#f5576c'] },
  { id: 'smart-home', name: 'Smart Home', icon: 'home-automation', gradient: ['#4facfe', '#00f2fe'] },
  { id: 'health', name: 'Health', icon: 'heart', gradient: ['#43e97b', '#38f9d7'] },
  { id: 'finance', name: 'Finance', icon: 'cash', gradient: ['#fa709a', '#fee140'] },
  { id: 'social', name: 'Social', icon: 'account-group', gradient: ['#a8edea', '#fed6e3'] },
  { id: 'entertainment', name: 'Entertainment', icon: 'gamepad', gradient: ['#ff9a9e', '#fecfef'] },
  { id: 'travel', name: 'Travel', icon: 'airplane', gradient: ['#ffecd2', '#fcb69f'] },
];

// Sample featured automations for fallback
const sampleAutomations: Automation[] = [
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
    tags: ['morning', 'smart-home', 'routine'],
    rating: 4.8,
    installs: '1.2k',
    featured: true,
    isPopular: true,
  },
  {
    id: '2',
    title: 'Focus Mode Ultra',
    description: 'Block distractions and boost productivity',
    author: 'Sarah Kim',
    authorAvatar: '👩‍💼',
    likes: 189,
    uses: 890,
    category: 'productivity',
    icon: 'brain',
    color: '#9C27B0',
    tags: ['focus', 'productivity'],
    rating: 4.9,
    installs: '890',
    featured: true,
    isPopular: true,
  },
  // Add more sample automations as needed
];

const DiscoverScreen: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { isOnline, isBackendConnected } = useConnection();
  const isConnected = isOnline && isBackendConnected;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // API queries
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
      // Haptics not supported
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      Alert.alert('No Internet', 'Please check your connection');
      return;
    }

    setRefreshing(true);
    triggerHaptic('medium');
    
    try {
      await Promise.all([
        refetchPublic(),
        refetchTrending(),
      ]);
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Refresh failed', error as Error);
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, refetchPublic, refetchTrending, triggerHaptic]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    if (selectedCategory === categoryId) return;
    
    setSelectedCategory(categoryId);
    triggerHaptic('medium');
  }, [selectedCategory, triggerHaptic]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    triggerHaptic('light');
    
    if (query.length > 0 && selectedCategory !== 'all') {
      setSelectedCategory('all');
    }
  }, [selectedCategory, triggerHaptic]);

  const handleLike = useCallback(async (automationId: string, isLiked: boolean) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to like automations');
      return;
    }

    if (!isConnected) {
      Alert.alert('No Internet', 'Please check your connection');
      return;
    }

    try {
      triggerHaptic('medium');
      
      if (isLiked) {
        await unlikeAutomation(automationId).unwrap();
      } else {
        await likeAutomation(automationId).unwrap();
      }
    } catch (error) {
      EventLogger.error('DiscoverScreen', 'Like toggle failed', error as Error);
    }
  }, [user, isConnected, likeAutomation, unlikeAutomation, triggerHaptic]);

  const handleAutomationPress = useCallback((automation: Automation) => {
    triggerHaptic('light');
    navigation.navigate('AutomationDetails' as never, { automation } as never);
  }, [navigation, triggerHaptic]);

  // Filter automations based on search and category
  const filteredAutomations = useMemo(() => {
    const automationsToFilter = publicAutomations.length > 0 ? publicAutomations : sampleAutomations;
    
    return automationsToFilter.filter((automation: any) => {
      const matchesSearch = !searchQuery || 
        automation.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        automation.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        automation.author?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        automation.tags?.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
                             selectedCategory === 'popular' && (automation.featured || automation.isPopular) ||
                             selectedCategory === 'new' && automation.isNew ||
                             automation.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [publicAutomations, searchQuery, selectedCategory]);

  // Prepare sections for FlatList
  const sections = useMemo(() => {
    const items: any[] = [];
    
    // Header section
    items.push({ 
      type: 'header', 
      key: 'header',
      data: { searchQuery, categories, selectedCategory }
    });
    
    // Quick Actions (only on 'all' category and no search)
    if (selectedCategory === 'all' && !searchQuery) {
      items.push({ 
        type: 'quickActions', 
        key: 'quickActions',
        data: {}
      });
    }
    
    // Featured (only on 'all' category and no search)
    if (selectedCategory === 'all' && !searchQuery && filteredAutomations.length > 0) {
      const featured = filteredAutomations.find(a => a.featured);
      if (featured) {
        items.push({ 
          type: 'featured', 
          key: 'featured',
          data: featured
        });
      }
    }
    
    // Trending (only on 'all' category and no search)
    if (selectedCategory === 'all' && !searchQuery) {
      const trending = trendingAutomations.length > 0 ? trendingAutomations : 
                      filteredAutomations.filter(a => a.isPopular).slice(0, 5);
      if (trending.length > 0) {
        items.push({ 
          type: 'trending', 
          key: 'trending',
          data: trending
        });
      }
    }
    
    // All Automations section title
    items.push({ 
      type: 'sectionTitle', 
      key: 'sectionTitle',
      data: {
        title: searchQuery ? `Search Results for "${searchQuery}"` :
               selectedCategory === 'all' ? 'All Automations' : 
               categories.find(c => c.id === selectedCategory)?.name || 'Automations',
        count: filteredAutomations.length
      }
    });
    
    // Automation items
    filteredAutomations.forEach((automation, index) => {
      items.push({
        type: 'automation',
        key: `automation-${automation.id}`,
        data: automation,
        index
      });
    });
    
    // Empty state if no automations
    if (filteredAutomations.length === 0) {
      items.push({
        type: 'empty',
        key: 'empty',
        data: { searchQuery, selectedCategory }
      });
    }
    
    return items;
  }, [filteredAutomations, trendingAutomations, searchQuery, selectedCategory, categories]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    switch (item.type) {
      case 'header':
        return (
          <View style={styles.headerSection}>
            {/* Search Bar - Navigate to dedicated Search screen */}
            <TouchableOpacity 
              style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}
              onPress={() => navigation.navigate('Search' as never, { query: searchQuery } as never)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.onSurface }]}
                placeholder="Search automations..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                value={searchQuery}
                onChangeText={handleSearch}
                onFocus={() => navigation.navigate('Search' as never, { query: searchQuery } as never)}
                editable={false} // Make it non-editable as it navigates to Search screen
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
            
            {/* Categories */}
            <View style={styles.categoriesSection}>
              <Text style={[styles.categoryTitle, { color: theme.colors.onSurface }]}>
                Categories
              </Text>
              <FlatList
                horizontal
                data={item.data.categories}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(cat) => cat.id}
                renderItem={({ item: category }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryChip,
                      item.data.selectedCategory === category.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => handleCategorySelect(category.id)}
                  >
                    <LinearGradient
                      colors={item.data.selectedCategory === category.id && category.gradient && category.gradient.length >= 2 ? category.gradient : ['transparent', 'transparent']}
                      style={[
                        styles.categoryChipGradient,
                        item.data.selectedCategory !== category.id && { backgroundColor: theme.colors.surfaceVariant }
                      ]}
                    >
                      <MaterialCommunityIcons 
                        name={category.icon as any} 
                        size={16} 
                        color={item.data.selectedCategory === category.id ? 'white' : theme.colors.onSurfaceVariant} 
                      />
                      <Text style={[
                        styles.categoryChipText,
                        { color: item.data.selectedCategory === category.id ? 'white' : theme.colors.onSurfaceVariant }
                      ]}>
                        {category.name}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        );
        
      case 'quickActions':
        return (
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
              </TouchableOpacity>
            </View>
          </View>
        );
        
      case 'featured':
        return (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Featured
            </Text>
            <TouchableOpacity
              style={[styles.featuredCard, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleAutomationPress(item.data)}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.featuredGradient}
              >
                <Text style={styles.featuredTitle}>{item.data.title}</Text>
                <Text style={styles.featuredDescription}>{item.data.description}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        );
        
      case 'trending':
        return (
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
            <FlatList
              horizontal
              data={item.data}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(trending) => trending.id}
              renderItem={({ item: trendingItem }) => (
                <TouchableOpacity
                  style={[styles.trendingCard, { backgroundColor: theme.colors.surface }]}
                  onPress={() => handleAutomationPress(trendingItem)}
                >
                  <Text style={[styles.trendingTitle, { color: theme.colors.onSurface }]}>
                    {trendingItem.title}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        );
        
      case 'sectionTitle':
        return (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {item.data.title}
            </Text>
            <Text style={[styles.resultCount, { color: theme.colors.onSurfaceVariant }]}>
              {item.data.count} result{item.data.count !== 1 ? 's' : ''}
            </Text>
          </View>
        );
        
      case 'automation':
        return (
          <TouchableOpacity
            style={[styles.automationCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleAutomationPress(item.data)}
          >
            <View style={styles.automationHeader}>
              <View style={[styles.automationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <MaterialCommunityIcons 
                  name={item.data.icon || 'robot'} 
                  size={24} 
                  color={theme.colors.primary} 
                />
              </View>
              <View style={styles.automationInfo}>
                <Text style={[styles.automationTitle, { color: theme.colors.onSurface }]}>
                  {item.data.title}
                </Text>
                <Text style={[styles.automationAuthor, { color: theme.colors.onSurfaceVariant }]}>
                  by {item.data.author}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleLike(item.data.id, item.data.hasLiked)}
              >
                <MaterialCommunityIcons 
                  name={item.data.hasLiked ? 'heart' : 'heart-outline'} 
                  size={24} 
                  color={item.data.hasLiked ? '#FF4444' : theme.colors.onSurfaceVariant} 
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.automationDescription, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
              {item.data.description}
            </Text>
            <View style={styles.automationFooter}>
              <View style={styles.automationStat}>
                <MaterialCommunityIcons name="heart" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.automationStatText, { color: theme.colors.onSurfaceVariant }]}>
                  {item.data.likes}
                </Text>
              </View>
              <View style={styles.automationStat}>
                <MaterialCommunityIcons name="play-circle" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.automationStatText, { color: theme.colors.onSurfaceVariant }]}>
                  {item.data.uses}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
        
      case 'empty':
        return (
          <EmptyState
            icon={item.data.searchQuery ? "magnify-scan" : "robot-confused"}
            title={item.data.searchQuery ? "No Results Found" : "No Automations Yet"}
            description={
              item.data.searchQuery
                ? `No automations found for "${item.data.searchQuery}"`
                : "No automations available in this category"
            }
            action={
              item.data.searchQuery
                ? {
                    label: "Clear Search",
                    onPress: () => setSearchQuery(''),
                  }
                : item.data.selectedCategory !== 'all'
                ? {
                    label: "Browse All Categories",
                    onPress: () => handleCategorySelect('all'),
                  }
                : undefined
            }
          />
        );
        
      default:
        return null;
    }
  }, [theme, searchQuery, handleSearch, handleCategorySelect, handleAutomationPress, handleLike, navigation]);

  if (isLoadingPublic && publicAutomations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading automations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if ((publicError || trendingError) && !isConnected) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <ErrorState
          title="No Internet Connection"
          description="Please check your connection and try again"
          action={{
            label: "Retry",
            onPress: handleRefresh,
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Discover
        </Text>
      </View>
      
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={10}
        initialNumToRender={10}
        getItemLayout={(data, index) => {
          // Estimate item heights for better performance
          let height = 100; // Default automation card height
          if (index < 3) height = 200; // Header sections are taller
          return { length: height, offset: height * index, index };
        }}
      />
    </SafeAreaView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  headerSection: {
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesSection: {
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoryChip: {
    marginLeft: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryChipSelected: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
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
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
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
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
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
  },
  featuredCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  featuredGradient: {
    padding: 20,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  trendingCard: {
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    minWidth: 150,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  automationCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  automationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  automationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  automationInfo: {
    flex: 1,
  },
  automationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  automationAuthor: {
    fontSize: 14,
  },
  automationDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  automationFooter: {
    flexDirection: 'row',
    gap: 16,
  },
  automationStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  automationStatText: {
    fontSize: 14,
  },
});

export default DiscoverScreen;