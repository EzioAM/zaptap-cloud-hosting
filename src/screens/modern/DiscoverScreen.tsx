import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
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
  { id: 'all', name: 'All', icon: 'view-grid', color: '#667eea' },
  { id: 'popular', name: 'Popular', icon: 'trending-up', color: '#ff9a9e' },
  { id: 'new', name: 'New', icon: 'star', color: '#a8edea' },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase', color: '#f093fb' },
  { id: 'smart-home', name: 'Smart Home', icon: 'home-automation', color: '#4facfe' },
  { id: 'health', name: 'Health', icon: 'heart', color: '#43e97b' },
  { id: 'finance', name: 'Finance', icon: 'cash', color: '#fa709a' },
  { id: 'social', name: 'Social', icon: 'account-group', color: '#a8edea' },
];

// Sample automations for fallback
const sampleAutomations: Automation[] = [
  {
    id: '1',
    title: 'Smart Morning Routine',
    description: 'Start your day perfectly with automated lights, music, and weather updates',
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
    hasLiked: false, // Add hasLiked field for like button functionality
  },
  {
    id: '2',
    title: 'Focus Mode Ultra',
    description: 'Block distractions, set focus music, and track your productivity goals',
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
    featured: false,
    isPopular: true,
    hasLiked: false, // Add hasLiked field for like button functionality
  },
  {
    id: '3',
    title: 'Home Security Alert',
    description: 'Get instant notifications when someone approaches your home',
    author: 'Mike Johnson',
    authorAvatar: '👨‍🔧',
    likes: 156,
    uses: 750,
    category: 'smart-home',
    icon: 'shield-home',
    color: '#4CAF50',
    tags: ['security', 'home', 'alerts'],
    rating: 4.7,
    installs: '750',
    featured: false,
    isPopular: false,
    hasLiked: false, // Add hasLiked field for like button functionality
  },
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
  
  // API queries - Allow queries to run even with uncertain connection status
  // since the database is working according to the performance logs
  const { 
    data: publicAutomations = [], 
    isLoading: isLoadingPublic,
    error: publicError,
    refetch: refetchPublic 
  } = useGetPublicAutomationsQuery({ 
    limit: 50,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: searchQuery || undefined
  });
  
  const { 
    data: trendingAutomations = [],
    isLoading: isLoadingTrending,
    error: trendingError,
    refetch: refetchTrending
  } = useGetTrendingAutomationsQuery({ limit: 5 });

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
    console.log('[DiscoverScreen] Like button pressed:', { automationId, isLiked, userExists: !!user });
    
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to like automations');
      return;
    }

    try {
      triggerHaptic('medium');
      console.log('[DiscoverScreen] Attempting to', isLiked ? 'unlike' : 'like', 'automation:', automationId);
      
      if (isLiked) {
        const result = await unlikeAutomation(automationId).unwrap();
        console.log('[DiscoverScreen] Unlike result:', result);
      } else {
        const result = await likeAutomation(automationId).unwrap();
        console.log('[DiscoverScreen] Like result:', result);
      }
      
      console.log('[DiscoverScreen] Like action completed successfully');
    } catch (error) {
      console.error('[DiscoverScreen] Like action failed:', error);
      EventLogger.error('DiscoverScreen', 'Like toggle failed', error as Error);
      Alert.alert('Error', 'Failed to update like status. Please try again.');
    }
  }, [user, likeAutomation, unlikeAutomation, triggerHaptic]);

  const handleAutomationPress = useCallback((automation: Automation) => {
    triggerHaptic('light');
    navigation.navigate('AutomationDetails' as never, { automation } as never);
  }, [navigation, triggerHaptic]);

  // Filter automations based on search and category
  const filteredAutomations = useMemo(() => {
    const automationsToFilter = publicAutomations.length > 0 ? publicAutomations : sampleAutomations;
    console.log('[DiscoverScreen] Filtering automations:', {
      usingRealData: publicAutomations.length > 0,
      totalAutomations: automationsToFilter.length,
      sampleFirstItem: automationsToFilter[0] ? {
        id: automationsToFilter[0].id,
        hasLiked: automationsToFilter[0].hasLiked,
        likes: automationsToFilter[0].likes
      } : null
    });
    
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

  const featuredAutomation = useMemo(() => {
    return filteredAutomations.find(a => a.featured) || filteredAutomations[0];
  }, [filteredAutomations]);

  const renderAutomationCard = useCallback(({ item }: { item: Automation }) => (
    <TouchableOpacity
      style={[styles.automationCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleAutomationPress(item)}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.automationHeader}>
        <View style={[styles.automationIcon, { backgroundColor: theme.colors.primary + '20' }]}>
          <MaterialCommunityIcons 
            name={item.icon || 'robot'} 
            size={28} 
            color={theme.colors.primary} 
          />
        </View>
        <View style={styles.automationInfo}>
          <Text style={[styles.automationTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.automationAuthor, { color: theme.colors.onSurfaceVariant }]}>
            by {item.author}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleLike(item.id, item.hasLiked)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.likeButton}
        >
          <MaterialCommunityIcons 
            name={item.hasLiked ? 'heart' : 'heart-outline'} 
            size={24} 
            color={item.hasLiked ? '#FF4444' : theme.colors.onSurfaceVariant} 
          />
        </TouchableOpacity>
      </View>
      <Text style={[styles.automationDescription, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
        {item.description}
      </Text>
      <View style={styles.automationFooter}>
        <View style={styles.automationStats}>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="heart" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
              {item.likes}
            </Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons name="play-circle" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.statText, { color: theme.colors.onSurfaceVariant }]}>
              {item.uses}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ), [theme, handleAutomationPress, handleLike]);

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
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Discover
        </Text>
      </View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.section}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.onSurfaceVariant} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.onSurface }]}
              placeholder="Search automations..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Categories
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && [styles.categoryChipSelected, { backgroundColor: category.color }]
                ]}
                onPress={() => handleCategorySelect(category.id)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <MaterialCommunityIcons 
                  name={category.icon as any} 
                  size={18} 
                  color={selectedCategory === category.id ? 'white' : theme.colors.onSurfaceVariant} 
                />
                <Text style={[
                  styles.categoryChipText,
                  { color: selectedCategory === category.id ? 'white' : theme.colors.onSurfaceVariant }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        {selectedCategory === 'all' && !searchQuery && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Quick Actions
            </Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={[styles.quickActionCard, { backgroundColor: theme.colors.surface }]}
                onPress={() => navigation.navigate('BuildTab' as never)}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
        )}

        {/* Featured */}
        {selectedCategory === 'all' && !searchQuery && featuredAutomation && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Featured
            </Text>
            <TouchableOpacity
              style={[styles.featuredCard, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleAutomationPress(featuredAutomation)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.featuredGradient}
              >
                <Text style={styles.featuredTitle}>{featuredAutomation.title}</Text>
                <Text style={styles.featuredDescription} numberOfLines={2}>
                  {featuredAutomation.description}
                </Text>
                <View style={styles.featuredAuthor}>
                  <Text style={styles.featuredAuthorText}>by {featuredAutomation.author}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Results Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {searchQuery ? `Results for "${searchQuery}"` :
               selectedCategory === 'all' ? 'All Automations' : 
               categories.find(c => c.id === selectedCategory)?.name || 'Automations'}
            </Text>
            <Text style={[styles.resultCount, { color: theme.colors.onSurfaceVariant }]}>
              {filteredAutomations.length} result{filteredAutomations.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {filteredAutomations.length > 0 ? (
            <FlatList
              data={filteredAutomations}
              renderItem={renderAutomationCard}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          ) : (
            <EmptyState
              icon={searchQuery ? "magnify-scan" : "robot-confused"}
              title={searchQuery ? "No Results Found" : "No Automations Yet"}
              description={
                searchQuery
                  ? `No automations found for "${searchQuery}"`
                  : "No automations available in this category"
              }
              action={
                searchQuery
                  ? {
                      label: "Clear Search",
                      onPress: () => setSearchQuery(''),
                    }
                  : selectedCategory !== 'all'
                  ? {
                      label: "Browse All Categories",
                      onPress: () => handleCategorySelect('all'),
                    }
                  : undefined
              }
            />
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesContainer: {
    paddingRight: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    gap: 8,
    minHeight: 44,
  },
  categoryChipSelected: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  quickActionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    minHeight: 120,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
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
    padding: 24,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    lineHeight: 22,
  },
  featuredAuthor: {
    alignSelf: 'flex-start',
  },
  featuredAuthorText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  automationCard: {
    padding: 20,
    borderRadius: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  automationInfo: {
    flex: 1,
  },
  automationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  automationAuthor: {
    fontSize: 14,
    opacity: 0.8,
  },
  likeButton: {
    padding: 8,
    marginRight: -8,
  },
  automationDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 16,
    opacity: 0.8,
  },
  automationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  automationStats: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    height: 16,
  },
});

export default DiscoverScreen;