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
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { useConnection } from '../../contexts/ConnectionContext';
import { StarRating } from '../../components/reviews/StarRating';
import { supabase } from '../../services/supabase/client';

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

const ModernReviewsScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { connectionState, checkConnection } = useConnection();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const styles = createStyles(theme);

  React.useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    if (!connectionState.isConnected) {
      setIsLoading(false);
      return;
    }

    try {
      // Load all reviews for all automations
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          users:user_id (
            name,
            avatar_url
          ),
          automations:automation_id (
            title
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map the data to our Review interface
      const mappedReviews: Review[] = (data || []).map(review => ({
        id: review.id,
        user_id: review.user_id,
        user_name: review.users?.name || 'Anonymous',
        user_avatar: review.users?.avatar_url,
        rating: review.rating,
        title: review.title || '',
        comment: review.comment,
        helpful_count: review.helpful_count || 0,
        created_at: review.created_at,
        updated_at: review.updated_at,
        automation_id: review.automation_id,
        automation_title: review.automations?.title || 'Unknown Automation',
        user_has_voted: false, // Will be updated separately
      }));

      setReviews(mappedReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkConnection();
    
    if (connectionState.isConnected) {
      await loadReviews();
    }
    
    setRefreshing(false);
  };

  const handleVoteHelpful = async (reviewId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Sign In Required', 'Please sign in to vote on reviews');
        return;
      }

      // Toggle vote
      const review = reviews.find(r => r.id === reviewId);
      if (review?.user_has_voted) {
        // Remove vote
        await supabase
          .from('review_votes')
          .delete()
          .match({ review_id: reviewId, user_id: user.id });
      } else {
        // Add vote
        await supabase
          .from('review_votes')
          .insert({ review_id: reviewId, user_id: user.id });
      }

      // Update local state
      setReviews(prev => prev.map(r => 
        r.id === reviewId 
          ? { 
              ...r, 
              helpful_count: r.user_has_voted ? r.helpful_count - 1 : r.helpful_count + 1,
              user_has_voted: !r.user_has_voted 
            }
          : r
      ));
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
      style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}
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
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>
              {item.user_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {item.user_name}
            </Text>
            <Text style={[styles.reviewDate, { color: theme.colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <StarRating rating={item.rating} size={16} />
      </View>

      {item.title && (
        <Text style={[styles.reviewTitle, { color: theme.colors.text }]}>
          {item.title}
        </Text>
      )}

      <Text style={[styles.reviewComment, { color: theme.colors.textSecondary }]}>
        {item.comment}
      </Text>

      <Text style={[styles.automationName, { color: theme.colors.primary }]}>
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
            color={item.user_has_voted ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[
            styles.helpfulText, 
            { color: item.user_has_voted ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Helpful ({item.helpful_count})
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="loading"
            size={48}
            color={theme.colors.primary}
          />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading reviews...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
            color={theme.colors.text} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          All Reviews
        </Text>
        <View style={{ width: 44 }} />
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
            placeholder="Search reviews..."
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
                ? theme.colors.primary 
                : theme.colors.surface 
            }
          ]}
          onPress={() => setFilterRating(null)}
        >
          <Text style={[
            styles.filterChipText,
            { color: filterRating === null ? '#FFFFFF' : theme.colors.text }
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
                  ? theme.colors.primary 
                  : theme.colors.surface 
              }
            ]}
            onPress={() => setFilterRating(rating)}
          >
            <MaterialCommunityIcons
              name="star"
              size={16}
              color={filterRating === rating ? '#FFFFFF' : theme.colors.warning}
            />
            <Text style={[
              styles.filterChipText,
              { color: filterRating === rating ? '#FFFFFF' : theme.colors.text }
            ]}>
              {rating}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={[styles.sortLabel, { color: theme.colors.textSecondary }]}>
          Sort by:
        </Text>
        {(['recent', 'helpful', 'rating'] as const).map(option => (
          <TouchableOpacity
            key={option}
            style={[
              styles.sortOption,
              {
                backgroundColor: sortBy === option
                  ? theme.colors.primary + '20'
                  : 'transparent'
              }
            ]}
            onPress={() => setSortBy(option)}
          >
            <Text style={[
              styles.sortOptionText,
              { 
                color: sortBy === option 
                  ? theme.colors.primary 
                  : theme.colors.textSecondary 
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
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.reviewsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="comment-off"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Reviews Found
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
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
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    backButton: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight,
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
    filtersContainer: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.round,
      marginRight: theme.spacing.sm,
    },
    filterChipText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: theme.spacing.xs,
    },
    sortContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    sortLabel: {
      fontSize: 14,
      marginRight: theme.spacing.md,
    },
    sortOption: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      marginRight: theme.spacing.sm,
    },
    sortOptionText: {
      fontSize: 14,
      fontWeight: '500',
    },
    reviewsList: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    reviewCard: {
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    userInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: theme.spacing.sm,
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    userDetails: {
      marginRight: theme.spacing.md,
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
      marginBottom: theme.spacing.sm,
    },
    reviewComment: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: theme.spacing.md,
    },
    automationName: {
      fontSize: 13,
      fontWeight: '500',
      marginBottom: theme.spacing.md,
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
      marginLeft: theme.spacing.xs,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      marginTop: theme.spacing.md,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    emptyDescription: {
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
  });

export default ModernReviewsScreen;