import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useConnection } from '../../contexts/ConnectionContext';
import { StarRating } from '../../components/reviews/StarRating';
import { DEFAULT_AVATAR } from '../../constants/defaults';
// import { useGetAllReviewsQuery } from '../../store/api/automationApi';

interface Review {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  title: string;
  comment: string;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  automation_id?: string;
  automation_title?: string;
  user_has_voted?: boolean;
}

const ModernReviewsScreenSafe = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { connectionState, checkConnection } = useConnection();
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const styles = createStyles(theme);

  // Mock reviews data for now
  const [isLoading, setIsLoading] = useState(false);
  const reviewsData: any[] = [];
  const error = null;
  const refetch = async () => {
    setIsLoading(true);
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  // Transform API data to Review interface
  const reviews: Review[] = reviewsData.map(review => ({
    id: review.id,
    user_id: review.user_id,
    user_name: review.users?.name || 'Anonymous',
    user_avatar: review.users?.avatar_url || DEFAULT_AVATAR,
    rating: review.rating,
    title: review.comment || '', // Use comment as title
    comment: review.comment || '',
    helpful_count: review.helpful_count || 0,
    created_at: review.created_at,
    updated_at: review.updated_at,
    automation_id: review.automation_id,
    automation_title: review.automations?.title || 'Unknown Automation',
    user_has_voted: false, // Will be updated separately
  }));

  const onRefresh = async () => {
    await checkConnection();
    refetch();
  };

  const handleVoteHelpful = async (reviewId: string) => {
    try {
      Alert.alert('Feature Coming Soon', 'Review voting will be available in the next update!');
      // TODO: Implement review voting functionality
    } catch (error) {
      console.error('Error voting on review:', error);
    }
  };

  // Filter and sort reviews
  const filteredReviews = reviews
    .filter(review => {
      const matchesSearch = searchQuery === '' || 
        review.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.automation_title?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRating = filterRating === null || review.rating === filterRating;
      
      return matchesSearch && matchesRating;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'helpful':
          return b.helpful_count - a.helpful_count;
        case 'rating':
          return b.rating - a.rating;
        case 'recent':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  const renderReview = ({ item }: { item: Review }) => (
    <TouchableOpacity
      style={[styles.reviewCard, { backgroundColor: theme.colors?.surface || '#fff' }]}
      onPress={() => {
        if (item.automation_id) {
          navigation.navigate('AutomationDetails' as never, { 
            automationId: item.automation_id 
          } as never);
        }
      }}
      activeOpacity={0.7}
    >
      <View style={styles.reviewHeader}>
        <View style={styles.userInfo}>
          <View style={[styles.avatar, { backgroundColor: theme.colors?.primary || '#6200ee' }]}>
            <Text style={styles.avatarText}>
              {item.user_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.colors?.text || '#000' }]}>
              {item.user_name}
            </Text>
            <Text style={[styles.reviewDate, { color: theme.colors?.textSecondary || '#666' }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <StarRating rating={item.rating} size={16} />
      </View>

      {item.title && (
        <Text style={[styles.reviewTitle, { color: theme.colors?.text || '#000' }]}>
          {item.title}
        </Text>
      )}

      <Text style={[styles.reviewComment, { color: theme.colors?.textSecondary || '#666' }]}>
        {item.comment}
      </Text>

      <Text style={[styles.automationName, { color: theme.colors?.primary || '#6200ee' }]}>
        <MaterialCommunityIcons name="robot" size={14} /> {item.automation_title}
      </Text>

      <View style={styles.reviewFooter}>
        <TouchableOpacity 
          style={styles.helpfulButton}
          onPress={() => handleVoteHelpful(item.id)}
        >
          <MaterialCommunityIcons
            name={item.user_has_voted ? "thumb-up" : "thumb-up-outline"}
            size={18}
            color={item.user_has_voted ? (theme.colors?.primary || '#6200ee') : (theme.colors?.textSecondary || '#666')}
          />
          <Text style={[
            styles.helpfulText, 
            { color: item.user_has_voted ? (theme.colors?.primary || '#6200ee') : (theme.colors?.textSecondary || '#666') }
          ]}>
            Helpful ({item.helpful_count})
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="loading"
            size={48}
            color={theme.colors?.primary || '#6200ee'}
          />
          <Text style={[styles.loadingText, { color: theme.colors?.textSecondary || '#666' }]}>
            Loading reviews...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const showConnectionBanner = !connectionState.isConnected || connectionState.error;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
      {/* Connection Status Banner */}
      {showConnectionBanner && (
        <TouchableOpacity 
          style={[styles.connectionBanner, { backgroundColor: theme.colors?.error || '#B00020' }]}
          onPress={checkConnection}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="wifi-off" size={20} color="#FFFFFF" />
          <Text style={styles.connectionBannerText}>
            {connectionState.error || 'No connection'}
          </Text>
          <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={24} 
            color={theme.colors?.text || '#000'} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors?.text || '#000' }]}>
          All Reviews
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors?.surface || '#fff' }]}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color={theme.colors?.textSecondary || '#666'}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.colors?.text || '#000' }]}
            placeholder="Search reviews..."
            placeholderTextColor={theme.colors?.textSecondary || '#666'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={theme.colors?.textSecondary || '#666'}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            { 
              backgroundColor: filterRating === null 
                ? (theme.colors?.primary || '#6200ee')
                : (theme.colors?.surface || '#fff')
            }
          ]}
          onPress={() => setFilterRating(null)}
        >
          <Text style={[
            styles.filterChipText,
            { color: filterRating === null ? '#FFFFFF' : (theme.colors?.text || '#000') }
          ]}>
            All Ratings
          </Text>
        </TouchableOpacity>

        {[5, 4, 3, 2, 1].map(rating => (
          <TouchableOpacity
            key={rating}
            style={[
              styles.filterChip,
              { 
                backgroundColor: filterRating === rating 
                  ? (theme.colors?.primary || '#6200ee')
                  : (theme.colors?.surface || '#fff')
              }
            ]}
            onPress={() => setFilterRating(rating)}
          >
            <MaterialCommunityIcons
              name="star"
              size={16}
              color={filterRating === rating ? '#FFFFFF' : (theme.colors?.warning || '#FFC107')}
            />
            <Text style={[
              styles.filterChipText,
              { color: filterRating === rating ? '#FFFFFF' : (theme.colors?.text || '#000') }
            ]}>
              {rating}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: theme.colors?.textSecondary || '#666' }]}>
          Sort by:
        </Text>
        {(['recent', 'helpful', 'rating'] as const).map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.sortOption,
              {
                backgroundColor: sortBy === option
                  ? (theme.colors?.primary || '#6200ee') + '20'
                  : 'transparent'
              }
            ]}
            onPress={() => setSortBy(option)}
          >
            <Text style={[
              styles.sortOptionText,
              { 
                color: sortBy === option 
                  ? (theme.colors?.primary || '#6200ee')
                  : (theme.colors?.textSecondary || '#666')
              }
            ]}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Reviews List */}
      <FlatList
        data={filteredReviews}
        renderItem={renderReview}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={theme.colors?.primary || '#6200ee'}
          />
        }
        contentContainerStyle={styles.reviewsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="comment-off"
              size={64}
              color={theme.colors?.textSecondary || '#666'}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors?.text || '#000' }]}>
              No Reviews Found
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors?.textSecondary || '#666' }]}>
              {!connectionState.isConnected 
                ? 'Please check your internet connection' 
                : 'Be the first to review an automation!'}
            </Text>
          </View>
        }
      />
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
      paddingVertical: theme?.spacing?.sm || 8,
      paddingHorizontal: theme?.spacing?.md || 16,
      gap: theme?.spacing?.sm || 8,
    },
    connectionBannerText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme?.spacing?.lg || 24,
      paddingVertical: theme?.spacing?.md || 16,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme?.typography?.h2?.fontSize || 28,
      fontWeight: theme?.typography?.h2?.fontWeight || 'bold',
    },
    searchContainer: {
      paddingHorizontal: theme?.spacing?.lg || 24,
      marginBottom: theme?.spacing?.md || 16,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme?.spacing?.md || 16,
      height: 48,
      borderRadius: theme?.borderRadius?.lg || 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      marginLeft: theme?.spacing?.sm || 8,
    },
    filtersContainer: {
      paddingHorizontal: theme?.spacing?.lg || 24,
      marginBottom: theme?.spacing?.md || 16,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme?.spacing?.md || 16,
      paddingVertical: theme?.spacing?.sm || 8,
      borderRadius: theme?.borderRadius?.round || 20,
      marginRight: theme?.spacing?.sm || 8,
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: theme?.spacing?.xs || 4,
    },
    sortContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme?.spacing?.lg || 24,
      marginBottom: theme?.spacing?.md || 16,
    },
    sortLabel: {
      fontSize: 14,
      marginRight: theme?.spacing?.md || 16,
    },
    sortOption: {
      paddingHorizontal: theme?.spacing?.md || 16,
      paddingVertical: theme?.spacing?.xs || 4,
      borderRadius: theme?.borderRadius?.sm || 8,
      marginRight: theme?.spacing?.sm || 8,
    },
    sortOptionText: {
      fontSize: 14,
      fontWeight: '500',
    },
    reviewsList: {
      paddingHorizontal: theme?.spacing?.lg || 24,
      paddingBottom: theme?.spacing?.xl || 32,
    },
    reviewCard: {
      padding: theme?.spacing?.lg || 24,
      borderRadius: theme?.borderRadius?.lg || 12,
      marginBottom: theme?.spacing?.md || 16,
      shadowColor: theme?.colors?.cardShadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme?.spacing?.md || 16,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: theme?.borderRadius?.round || 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme?.spacing?.sm || 8,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    userDetails: {
      marginRight: theme?.spacing?.md || 16,
    },
    userName: {
      fontSize: 14,
      fontWeight: '600',
    },
    reviewDate: {
      fontSize: 12,
      marginTop: 2,
    },
    reviewTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: theme?.spacing?.sm || 8,
    },
    reviewComment: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: theme?.spacing?.md || 16,
    },
    automationName: {
      fontSize: 13,
      fontWeight: '500',
      marginBottom: theme?.spacing?.md || 16,
    },
    reviewFooter: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    helpfulButton: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    helpfulText: {
      fontSize: 13,
      marginLeft: theme?.spacing?.xs || 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      marginTop: theme?.spacing?.md || 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme?.spacing?.xxl || 48,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: theme?.spacing?.lg || 24,
      marginBottom: theme?.spacing?.sm || 8,
    },
    emptyDescription: {
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: theme?.spacing?.xl || 32,
    },
  });

export default ModernReviewsScreenSafe;