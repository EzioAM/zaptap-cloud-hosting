import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { 
  useGetPublicAutomationsQuery, 
  useGetTrendingAutomationsQuery,
  useGetAutomationEngagementQuery,
  useLikeAutomationMutation,
  useUnlikeAutomationMutation,
  useTrackAutomationDownloadMutation,
  useTrackAutomationViewMutation
} from '../../store/api/automationApi';
import { RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useConnection } from '../../contexts/ConnectionContext';

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
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

const DiscoverScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { connectionState, checkConnection } = useConnection();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  const styles = createStyles(theme);
  
  const { data: publicAutomations = [], isLoading, error, refetch, isFetching } = useGetPublicAutomationsQuery(undefined, {
    // Enable fetching on mount and background refetch
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
  });
  const { data: trendingData = [], error: trendingError } = useGetTrendingAutomationsQuery({ limit: 6 }, {
    // Cache trending data for 5 minutes
    pollingInterval: 300000,
    refetchOnMountOrArgChange: true,
  });
  const [likeAutomation] = useLikeAutomationMutation();
  const [unlikeAutomation] = useUnlikeAutomationMutation();
  const [trackDownload] = useTrackAutomationDownloadMutation();
  const [trackView] = useTrackAutomationViewMutation();
  const [engagementData, setEngagementData] = useState<Record<string, any>>({});
  const [displayedAutomations, setDisplayedAutomations] = useState<any[]>([]);
  
  const ITEMS_PER_PAGE = 10;

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    
    // Check connection first
    await checkConnection();
    
    if (connectionState.isConnected) {
      await refetch();
    }
    
    setRefreshing(false);
  };
  
  // Component to fetch engagement data for a single automation
  const AutomationEngagement = ({ automationId, onDataFetched }: { automationId: string; onDataFetched: (id: string, data: any) => void }) => {
    const { data } = useGetAutomationEngagementQuery(automationId);
    
    React.useEffect(() => {
      if (data) {
        onDataFetched(automationId, data);
      }
    }, [data, automationId, onDataFetched]);
    
    return null;
  };
  
  const handleEngagementData = React.useCallback((automationId: string, data: any) => {
    setEngagementData(prev => ({ ...prev, [automationId]: data }));
  }, []);

  // Map real automations to the expected format
  const mappedAutomations: Automation[] = publicAutomations.map((automation) => {
    const categoryIcons: Record<string, string> = {
      'Productivity': 'briefcase',
      'Smart Home': 'home-automation',
      'Social': 'share-variant',
      'Health': 'heart-pulse',
      'Communication': 'message',
      'Entertainment': 'movie',
      'Business': 'message-reply-text',
      'Finance': 'cash-multiple',
    };
    
    const categoryColors: Record<string, string> = {
      'Productivity': '#FF6B6B',
      'Smart Home': '#4ECDC4',
      'Social': '#95E1D3',
      'Health': '#F38181',
      'Communication': '#6750A4',
      'Entertainment': '#625B71',
      'Business': '#4ECDC4',
      'Finance': '#FFD93D',
    };
    
    // Calculate popularity based on creation date (newer = more trending)
    const daysOld = Math.floor((new Date().getTime() - new Date(automation.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const estimatedLikes = Math.max(50, 500 - (daysOld * 10));
    const estimatedUses = Math.max(100, 1500 - (daysOld * 20));
    
    return {
      id: automation.id,
      title: automation.title,
      description: automation.description || 'No description',
      author: automation.author?.name || 'Unknown',
      likes: estimatedLikes,
      uses: estimatedUses,
      category: automation.category,
      icon: categoryIcons[automation.category] || 'robot',
      color: categoryColors[automation.category] || '#6750A4',
      trending: daysOld < 7, // Trending if created in last 7 days
    };
  });

  // Filter by search query and category
  const filteredAutomations = mappedAutomations.filter((automation) => {
    const matchesSearch = searchQuery === '' || 
      automation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      automation.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      automation.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || 
      selectedCategory === 'All' || 
      automation.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Map trending automations with real engagement data
  const trendingAutomations = trendingData.map((automation) => {
    const categoryIcons: Record<string, string> = {
      'Productivity': 'briefcase',
      'Smart Home': 'home-automation',
      'Social': 'share-variant',
      'Health': 'heart-pulse',
      'Communication': 'message',
      'Entertainment': 'movie',
      'Business': 'message-reply-text',
      'Finance': 'cash-multiple',
    };
    
    const categoryColors: Record<string, string> = {
      'Productivity': '#FF6B6B',
      'Smart Home': '#4ECDC4',
      'Social': '#95E1D3',
      'Health': '#F38181',
      'Communication': '#6750A4',
      'Entertainment': '#625B71',
      'Business': '#4ECDC4',
      'Finance': '#FFD93D',
    };
    
    const engagement = engagementData[automation.id];
    
    return {
      id: automation.id,
      title: automation.title,
      description: automation.description || 'No description',
      author: automation.created_by || 'Unknown',
      likes: engagement?.likes_count ?? automation.likes_count ?? 0,
      uses: engagement?.downloads_count ?? automation.downloads_count ?? 0,
      category: automation.category,
      icon: categoryIcons[automation.category] || 'robot',
      color: categoryColors[automation.category] || '#6750A4',
      trending: true,
      hasLiked: engagement?.user_has_liked ?? false,
    };
  });

  // Implement pagination
  React.useEffect(() => {
    const startIndex = 0;
    const endIndex = page * ITEMS_PER_PAGE;
    const paginatedAutomations = filteredAutomations.slice(startIndex, endIndex);
    setDisplayedAutomations(paginatedAutomations);
    setHasMore(endIndex < filteredAutomations.length);
  }, [filteredAutomations, page]);
  
  const loadMore = () => {
    if (!isLoadingMore && hasMore && !isFetching) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setPage(prev => prev + 1);
        setIsLoadingMore(false);
      }, 300);
    }
  };
  
  const handleEndReached = () => {
    if (hasMore && !isLoadingMore) {
      loadMore();
    }
  };

  // Calculate categories dynamically from available automations
  const categoryMap = new Map<string, number>();
  mappedAutomations.forEach(automation => {
    const count = categoryMap.get(automation.category) || 0;
    categoryMap.set(automation.category, count + 1);
  });

  const categoryIcons: Record<string, string> = {
    'Productivity': 'rocket-launch',
    'Smart Home': 'home-automation',
    'Social': 'share-variant',
    'Health': 'heart-pulse',
    'Business': 'briefcase',
    'Entertainment': 'movie-open',
    'Finance': 'cash-multiple',
    'Communication': 'message',
  };

  const categoryColors: Record<string, string> = {
    'Productivity': '#FF6B6B',
    'Smart Home': '#4ECDC4',
    'Social': '#95E1D3',
    'Health': '#F38181',
    'Business': '#FFD93D',
    'Entertainment': '#6BCF7F',
    'Finance': '#FFD93D',
    'Communication': '#6750A4',
  };

  const categories: Category[] = [
    { id: '1', name: 'All', icon: 'apps', color: '#6750A4', count: mappedAutomations.length },
    ...Array.from(categoryMap.entries()).map((entry, index) => ({
      id: (index + 2).toString(),
      name: entry[0],
      icon: categoryIcons[entry[0]] || 'folder',
      color: categoryColors[entry[0]] || '#6750A4',
      count: entry[1],
    })),
  ];

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        {
          backgroundColor: item.name === (selectedCategory || 'All') 
            ? theme.colors.primary 
            : theme.colors.surface,
        },
      ]}
      onPress={() => setSelectedCategory(item.name)}
      activeOpacity={0.7}
    >
      <MaterialCommunityIcons
        name={item.icon as any}
        size={18}
        color={item.name === (selectedCategory || 'All') ? '#FFFFFF' : theme.colors.text}
      />
      <Text
        style={[
          styles.categoryChipText,
          {
            color: item.name === (selectedCategory || 'All') ? '#FFFFFF' : theme.colors.text,
          },
        ]}
      >
        {item.name}
      </Text>
      <Text
        style={[
          styles.categoryCount,
          {
            color: item.name === (selectedCategory || 'All')
              ? '#FFFFFF'
              : theme.colors.textSecondary,
          },
        ]}
      >
        {item.count}
      </Text>
    </TouchableOpacity>
  );

  const renderTrendingCard = ({ item, index }: { item: Automation; index: number }) => (
    <TouchableOpacity
      style={[styles.trendingCard, { backgroundColor: theme.colors.surface }]}
      activeOpacity={0.7}
      onPress={async () => {
        // Track view when opening automation
        await trackView(item.id);
        navigation.navigate('AutomationDetails', { 
          automationId: item.id,
          fromGallery: true 
        });
      }}
    >
      <View style={styles.trendingRank}>
        <Text style={styles.trendingRankText}>#{index + 1}</Text>
      </View>
      <View
        style={[
          styles.automationIcon,
          { backgroundColor: `${item.color}20` },
        ]}
      >
        <MaterialCommunityIcons
          name={item.icon as any}
          size={24}
          color={item.color}
        />
      </View>
      <View style={[styles.automationInfo, { flex: 1 }]}>
        <Text style={[styles.automationTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.trendingMeta}>
          <TouchableOpacity 
            style={styles.stat}
            onPress={async () => {
              if (item.hasLiked) {
                await unlikeAutomation(item.id);
                // Update local state
                setEngagementData(prev => ({
                  ...prev,
                  [item.id]: {
                    ...prev[item.id],
                    user_has_liked: false,
                    likes_count: (prev[item.id]?.likes_count || item.likes) - 1
                  }
                }));
              } else {
                await likeAutomation(item.id);
                // Update local state
                setEngagementData(prev => ({
                  ...prev,
                  [item.id]: {
                    ...prev[item.id],
                    user_has_liked: true,
                    likes_count: (prev[item.id]?.likes_count || item.likes) + 1
                  }
                }));
              }
            }}
          >
            <MaterialCommunityIcons
              name={item.hasLiked ? "heart" : "heart-outline"}
              size={14}
              color={theme.colors.error}
            />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {item.likes}
            </Text>
          </TouchableOpacity>
          <View style={[styles.stat, { marginLeft: theme.spacing.md }]}>
            <MaterialCommunityIcons
              name="download"
              size={14}
              color={theme.colors.success}
            />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {item.uses}
            </Text>
          </View>
          <View style={[styles.stat, { marginLeft: theme.spacing.md }]}>
            <MaterialCommunityIcons
              name="trending-up"
              size={14}
              color={theme.colors.primary}
            />
            <Text style={[styles.statText, { color: theme.colors.primary, fontWeight: '600' }]}>
              Trending
            </Text>
          </View>
        </View>
      </View>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const renderAutomation = ({ item, index }: { item: Automation; index: number }) => (
    <TouchableOpacity
      style={[styles.automationCard, { backgroundColor: theme.colors.surface }]}
      activeOpacity={0.7}
      onPress={async () => {
        // Track view when opening automation
        await trackView(item.id);
        navigation.navigate('AutomationDetails', { 
          automationId: item.id,
          fromGallery: true 
        });
      }}
    >
      {item.trending && (
        <View style={styles.trendingBadge}>
          <MaterialCommunityIcons name="trending-up" size={14} color="#FFFFFF" />
          <Text style={styles.trendingText}>Trending</Text>
        </View>
      )}
      <View style={styles.automationHeader}>
        <View
          style={[
            styles.automationIcon,
            { backgroundColor: `${item.color}20` },
          ]}
        >
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color={item.color}
          />
        </View>
        <View style={styles.automationInfo}>
          <Text style={[styles.automationTitle, { color: theme.colors.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.automationDescription, { color: theme.colors.textSecondary }]}>
            {item.description}
          </Text>
        </View>
      </View>
      <View style={styles.automationMeta}>
        <View style={styles.authorInfo}>
          <View style={[styles.authorAvatar, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.authorInitial, { color: theme.colors.text }]}>
              {item.author.charAt(0)}
            </Text>
          </View>
          <Text style={[styles.authorName, { color: theme.colors.textSecondary }]}>
            {item.author}
          </Text>
        </View>
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.stat}
            onPress={async () => {
              if (item.hasLiked) {
                await unlikeAutomation(item.id);
                // Update local state
                setEngagementData(prev => ({
                  ...prev,
                  [item.id]: {
                    ...prev[item.id],
                    user_has_liked: false,
                    likes_count: (prev[item.id]?.likes_count || item.likes) - 1
                  }
                }));
              } else {
                await likeAutomation(item.id);
                // Update local state
                setEngagementData(prev => ({
                  ...prev,
                  [item.id]: {
                    ...prev[item.id],
                    user_has_liked: true,
                    likes_count: (prev[item.id]?.likes_count || item.likes) + 1
                  }
                }));
              }
            }}
          >
            <MaterialCommunityIcons
              name={item.hasLiked ? "heart" : "heart-outline"}
              size={16}
              color={theme.colors.error}
            />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {item.likes}
            </Text>
          </TouchableOpacity>
          <View style={styles.stat}>
            <MaterialCommunityIcons
              name="download"
              size={16}
              color={theme.colors.success}
            />
            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
              {item.uses}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading timeout effect
  React.useEffect(() => {
    if (isLoading && !refreshing) {
      const timeout = setTimeout(() => {
        setLoadingTimedOut(true);
      }, 5000); // 5 second timeout
      return () => clearTimeout(timeout);
    } else {
      setLoadingTimedOut(false);
    }
  }, [isLoading, refreshing]);

  // Handle loading state - show loading only briefly
  if (isLoading && !refreshing && publicAutomations.length === 0 && !loadingTimedOut) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
            Discovering amazing automations...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle error state or timeout
  const hasError = error || trendingError || loadingTimedOut;
  if (hasError) {
    console.warn('Failed to load automations:', error || trendingError || 'Loading timeout');
  }

  // Show connection error banner if not connected
  const showConnectionBanner = !connectionState.isConnected || connectionState.error;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Connection Status Banner */}
      {showConnectionBanner && (
        <TouchableOpacity 
          style={[styles.connectionBanner, { backgroundColor: theme.colors.error }]}
          onPress={checkConnection}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="wifi-off" 
            size={20} 
            color="#FFFFFF" 
          />
          <Text style={styles.connectionBannerText}>
            {connectionState.error || 'No connection'}
          </Text>
          <MaterialCommunityIcons 
            name="refresh" 
            size={20} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      )}
      
      {/* Render engagement data fetchers for visible automations */}
      {[...new Set([...displayedAutomations, ...trendingAutomations])].map(automation => (
        <AutomationEngagement 
          key={automation.id} 
          automationId={automation.id} 
          onDataFetched={handleEngagementData}
        />
      ))}
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            handleEndReached();
          }
        }}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Discover
          </Text>
          <TouchableOpacity style={styles.filterButton}>
            <MaterialCommunityIcons
              name="filter-variant"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={theme.colors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search automations..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Trending Section - Only show if we have trending data */}
        {trendingAutomations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                🔥 Trending Now
              </Text>
              <TouchableOpacity>
                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                  See All
                </Text>
              </TouchableOpacity>
            </View>
            {trendingAutomations.map((automation, index) => (
              <View key={automation.id} style={styles.trendingCardWrapper}>
                {renderTrendingCard({ item: automation, index })}
              </View>
            ))}
          </View>
        )}

        {/* All Automations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Popular Automations
          </Text>
          {displayedAutomations.length > 0 ? (
            <>
              {displayedAutomations.map((automation) => (
                <View key={automation.id} style={styles.verticalAutomationWrapper}>
                  {renderAutomation({ item: automation, index: 0 })}
                </View>
              ))}
              
              {/* Load More Button */}
              {hasMore && (
                <View style={styles.loadMoreContainer}>
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <TouchableOpacity
                      style={[styles.loadMoreButton, { backgroundColor: theme.colors.primary }]}
                      onPress={loadMore}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.loadMoreText}>Load More</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyStateContainer}>
              <MaterialCommunityIcons
                name="robot-off"
                size={64}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                No Automations Found
              </Text>
              <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                {!connectionState.isConnected 
                  ? 'Please check your internet connection and try again.' 
                  : error 
                  ? 'Unable to load automations. Please try again later.' 
                  : loadingTimedOut
                  ? 'Loading is taking longer than expected. Please check your connection.'
                  : 'Be the first to create and share an automation!'}
              </Text>
              {(error || !connectionState.isConnected || loadingTimedOut) && (
                <TouchableOpacity
                  style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
                  onPress={async () => {
                    setLoadingTimedOut(false);
                    await checkConnection();
                    if (connectionState.isConnected) {
                      refetch();
                    }
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    connectionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    connectionBannerText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    headerTitle: {
      fontSize: theme.typography.h1.fontSize,
      fontWeight: theme.typography.h1.fontWeight,
    },
    filterButton: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    searchContainer: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      height: 48,
      borderRadius: theme.borderRadius.lg,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      marginLeft: theme.spacing.sm,
    },
    categoriesSection: {
      marginBottom: theme.spacing.lg,
    },
    categoriesList: {
      paddingHorizontal: theme.spacing.lg,
    },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.round,
      marginRight: theme.spacing.sm,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    categoryChipText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: theme.spacing.xs,
    },
    categoryCount: {
      fontSize: 12,
      marginLeft: theme.spacing.xs,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    trendingMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.h3.fontWeight,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '600',
    },
    horizontalList: {
      paddingHorizontal: theme.spacing.lg,
    },
    trendingCardWrapper: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    trendingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
    },
    trendingRank: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    trendingRankText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    automationCard: {
      width: 280,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      marginRight: theme.spacing.md,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    verticalAutomationWrapper: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    trendingBadge: {
      position: 'absolute',
      top: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.error,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.sm,
    },
    trendingText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
      marginLeft: 4,
    },
    automationHeader: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
    },
    automationIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.md,
    },
    automationInfo: {
      flex: 1,
    },
    automationTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    automationDescription: {
      fontSize: 13,
      lineHeight: 18,
    },
    automationMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    authorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    authorAvatar: {
      width: 24,
      height: 24,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.xs,
    },
    authorInitial: {
      fontSize: 12,
      fontWeight: '600',
    },
    authorName: {
      fontSize: 13,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: theme.spacing.md,
    },
    statText: {
      fontSize: 13,
      marginLeft: 4,
    },
    loadMoreContainer: {
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
    },
    loadMoreButton: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.round,
    },
    loadMoreText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    emptyText: {
      fontSize: 14,
      marginTop: theme.spacing.sm,
    },
    emptyStateContainer: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
      alignItems: 'center',
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    emptyStateText: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryButton: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.round,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
  });

export default DiscoverScreen;