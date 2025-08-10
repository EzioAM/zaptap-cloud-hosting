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
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { 
  useGetPublicAutomationsQuery, 
  useGetTrendingAutomationsQuery,
  useLikeAutomationMutation,
  useUnlikeAutomationMutation
} from '../../store/api/automationApi';
import { RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useConnection } from '../../contexts/ConnectionContext';
import { DiscoverScreenSkeleton } from '../../components/loading/SkeletonLoading';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';

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

const categories = [
  { id: 'all', name: 'All', icon: 'view-grid' },
  { id: 'productivity', name: 'Productivity', icon: 'briefcase' },
  { id: 'smart-home', name: 'Smart Home', icon: 'home-automation' },
  { id: 'health', name: 'Health', icon: 'heart' },
  { id: 'finance', name: 'Finance', icon: 'cash' },
  { id: 'social', name: 'Social', icon: 'account-group' },
  { id: 'entertainment', name: 'Entertainment', icon: 'gamepad' },
  { id: 'travel', name: 'Travel', icon: 'airplane' },
];

export default function DiscoverScreenSafe() {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { connectionState } = useConnection();
  const { isConnected } = connectionState;
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchPublic(), refetchTrending()]);
    setRefreshing(false);
  };

  const handleLike = async (automation: Automation) => {
    if (!user) {
      navigation.navigate('SignIn' as never);
      return;
    }

    try {
      if (automation.hasLiked) {
        await unlikeAutomation(automation.id);
      } else {
        await likeAutomation(automation.id);
      }
    } catch (error) {
      console.error('Failed to like/unlike automation:', error);
    }
  };

  const handleAutomationPress = async (automation: Automation) => {
    // Navigate directly to automation details
    navigation.navigate('AutomationDetails' as never, { 
      automationId: automation.id,
      fromGallery: true 
    } as never);
  };

  const renderAutomationCard = ({ item }: { item: Automation }) => (
    <TouchableOpacity
      style={[styles.automationCard, { backgroundColor: theme.colors?.surface || '#fff' }]}
      onPress={() => handleAutomationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <MaterialCommunityIcons name={item.icon as any} size={24} color="white" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: theme.colors?.text || '#000' }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cardAuthor, { color: theme.colors?.textSecondary || '#666' }]}>
            by {item.author}
          </Text>
        </View>
        {item.trending && (
          <View style={styles.trendingBadge}>
            <MaterialCommunityIcons name="trending-up" size={16} color="#FF6B6B" />
          </View>
        )}
      </View>
      
      <Text style={[styles.cardDescription, { color: theme.colors?.textSecondary || '#666' }]} numberOfLines={2}>
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
            color={item.hasLiked ? "#FF6B6B" : (theme.colors?.textSecondary || '#666')} 
          />
          <Text style={[styles.statText, { color: theme.colors?.textSecondary || '#666' }]}>
            {item.likes}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.statItem}>
          <MaterialCommunityIcons 
            name="download" 
            size={20} 
            color={theme.colors?.textSecondary || '#666'} 
          />
          <Text style={[styles.statText, { color: theme.colors?.textSecondary || '#666' }]}>
            {item.uses}
          </Text>
        </View>
        
        <View style={[styles.categoryBadge, { backgroundColor: theme.colors?.primaryLight || '#E3F2FD' }]}>
          <Text style={[styles.categoryBadgeText, { color: theme.colors?.primary || '#2196F3' }]}>
            {item.category}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!isConnected) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
        <ErrorState
          icon="wifi-off"
          title="No Internet Connection"
          description="Please check your connection and try again"
          actionText="Retry"
          onAction={handleRefresh}
        />
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
        <DiscoverScreenSkeleton />
      </SafeAreaView>
    );
  }

  if (publicError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
        <ErrorState
          icon="alert-circle"
          title="Something went wrong"
          description="Failed to load automations"
          actionText="Try Again"
          onAction={handleRefresh}
        />
      </SafeAreaView>
    );
  }

  // Map API data to the expected format
  const mappedPublicAutomations = publicAutomations?.map(automation => ({
    ...automation,
    icon: automation.icon || 'robot',
    color: automation.color || '#2196F3',
    likes: automation.likes_count || automation.rating_count || 0,
    uses: automation.execution_count || automation.downloads_count || 0,
    author: automation.created_by_name || 'Unknown Author',
    hasLiked: automation.has_liked || false,
  })) || [];

  const mappedTrendingAutomations = trendingAutomations?.map(automation => ({
    ...automation,
    icon: automation.icon || 'robot',
    color: automation.color || '#FF6B6B',
    likes: automation.likes_count || automation.rating_count || 0,
    uses: automation.execution_count || automation.downloads_count || 0,
    author: automation.created_by_name || 'Unknown Author',
    trending: true,
  })) || [];

  const filteredAutomations = mappedPublicAutomations?.filter(automation => {
    const matchesCategory = selectedCategory === 'all' || automation.category === selectedCategory;
    const matchesSearch = automation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         automation.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  }) || [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors?.primary || '#2196F3']}
          />
        }
        stickyHeaderIndices={[1]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors?.text || '#000' }]}>
            Discover
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors?.textSecondary || '#666' }]}>
            Explore amazing automations from the community
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
          <View style={[styles.searchBar, { backgroundColor: theme.colors?.surface || '#fff' }]}>
            <MaterialCommunityIcons 
              name="magnify" 
              size={24} 
              color={theme.colors?.textSecondary || '#666'} 
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors?.text || '#000' }]}
              placeholder="Search automations..."
              placeholderTextColor={theme.colors?.textSecondary || '#999'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Trending Section */}
        {mappedTrendingAutomations && mappedTrendingAutomations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons 
                name="trending-up" 
                size={24} 
                color="#FF6B6B" 
              />
              <Text style={[styles.sectionTitle, { color: theme.colors?.text || '#000' }]}>
                Trending Now
              </Text>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={mappedTrendingAutomations}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.trendingCard, { backgroundColor: theme.colors?.surface || '#fff' }]}
                  onPress={() => handleAutomationPress(item)}
                >
                  <View style={[styles.trendingIcon, { backgroundColor: item.color }]}>
                    <MaterialCommunityIcons name={item.icon as any} size={32} color="white" />
                  </View>
                  <Text style={[styles.trendingTitle, { color: theme.colors?.text || '#000' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.trendingStats, { color: theme.colors?.textSecondary || '#666' }]}>
                    {item.likes} likes · {item.uses} uses
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.trendingList}
            />
          </View>
        )}

        {/* Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors?.text || '#000' }]}>
            Categories
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  { backgroundColor: selectedCategory === category.id ? theme.colors?.primary || '#2196F3' : theme.colors?.surface || '#fff' }
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <MaterialCommunityIcons 
                  name={category.icon as any} 
                  size={20} 
                  color={selectedCategory === category.id ? 'white' : (theme.colors?.text || '#000')} 
                />
                <Text style={[
                  styles.categoryChipText,
                  { color: selectedCategory === category.id ? 'white' : (theme.colors?.text || '#000') }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Automations List */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors?.text || '#000' }]}>
            {selectedCategory === 'all' ? 'All Automations' : categories.find(c => c.id === selectedCategory)?.name}
          </Text>
          {filteredAutomations.length === 0 ? (
            <EmptyState
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
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  trendingList: {
    paddingHorizontal: 20,
  },
  trendingCard: {
    width: 150,
    padding: 16,
    marginRight: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendingIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trendingStats: {
    fontSize: 12,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  automationsList: {
    paddingHorizontal: 20,
  },
  automationCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardAuthor: {
    fontSize: 14,
  },
  trendingBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    marginLeft: 4,
  },
  categoryBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});