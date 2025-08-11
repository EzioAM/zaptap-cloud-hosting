import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase/client';
import * as Haptics from 'expo-haptics';

interface Review {
  id: string;
  automation_id: string;
  automation_title?: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at?: string;
  helpful_count?: number;
  is_verified?: boolean;
}

// Helper function to generate color from string
const getAvatarColor = (name: string = '') => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FECA57', // Yellow
    '#9B59B6', // Purple
    '#3498DB', // Sky Blue
    '#E74C3C', // Crimson
    '#1ABC9C', // Turquoise
    '#F39C12', // Orange
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

const ModernReviewsScreen: React.FC = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'helpful'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Load reviews from Supabase
  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterRating) {
        query = query.eq('rating', filterRating);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // For demo purposes, create sample data if none exists
      const sampleReviews: Review[] = data?.length ? data : [
        {
          id: '1',
          automation_id: 'auto-1',
          automation_title: 'Smart Morning Routine',
          user_id: 'user-1',
          user_name: 'John Doe',
          rating: 5,
          comment: 'Excellent automation! Works perfectly every morning.',
          created_at: new Date().toISOString(),
          helpful_count: 12,
          is_verified: true,
        },
        {
          id: '2',
          automation_id: 'auto-2',
          automation_title: 'Focus Mode Ultra',
          user_id: 'user-2',
          user_name: 'Jane Smith',
          rating: 4,
          comment: 'Good automation but could use more customization options.',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          helpful_count: 8,
        },
        {
          id: '3',
          automation_id: 'auto-3',
          automation_title: 'Smart Home Control',
          user_id: 'user-3',
          user_name: 'Mike Wilson',
          rating: 5,
          comment: 'Perfect for controlling all my smart devices!',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          helpful_count: 15,
          is_verified: true,
        },
      ];
      
      setReviews(sampleReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterRating]);
  
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);
  
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadReviews();
  }, [loadReviews]);
  
  const handleMarkHelpful = useCallback(async (reviewId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Update helpful count in Supabase
      const review = reviews.find(r => r.id === reviewId);
      if (review) {
        const newCount = (review.helpful_count || 0) + 1;
        
        const { error } = await supabase
          .from('reviews')
          .update({ helpful_count: newCount })
          .eq('id', reviewId);
        
        if (!error) {
          setReviews(prev => prev.map(r => 
            r.id === reviewId 
              ? { ...r, helpful_count: newCount }
              : r
          ));
        }
      }
    } catch (error) {
      console.error('Error marking review as helpful:', error);
    }
  }, [reviews]);
  
  const deleteReview = async (reviewId: string) => {
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);
      
      if (!error) {
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        Alert.alert('Success', 'Review deleted');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      Alert.alert('Error', 'Failed to delete review');
    }
  };

  const handleDeleteReview = useCallback((reviewId: string) => {
    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete this review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteReview(reviewId);
          },
        },
      ]
    );
  }, []);
  
  const handleSortToggle = () => {
    let nextSort: 'recent' | 'rating' | 'helpful';
    
    if (sortBy === 'recent') {
      nextSort = 'rating';
    } else if (sortBy === 'rating') {
      nextSort = 'helpful';
    } else {
      nextSort = 'recent';
    }
    
    setSortBy(nextSort);
  };
  
  const getSortDisplayText = () => {
    switch (sortBy) {
      case 'recent': return 'Recent';
      case 'rating': return 'Rating';
      case 'helpful': return 'Most Helpful';
      default: return 'Recent';
    }
  };
  
  const filteredReviews = reviews.filter(review => {
    const matchesSearch = !searchQuery || 
      review.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.automation_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRating = !filterRating || review.rating === filterRating;
    
    return matchesSearch && matchesRating;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'helpful':
        return (b.helpful_count || 0) - (a.helpful_count || 0);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });
  
  const renderStarRating = (rating: number) => (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map(star => (
        <MaterialCommunityIcons
          key={star}
          name={star <= rating ? 'star' : 'star-outline'}
          size={20}
          color="#FFB800"
        />
      ))}
      <Text style={[styles.ratingText, { color: theme.colors.onSurfaceVariant }]}>
        {rating}.0
      </Text>
    </View>
  );

  const renderUserAvatar = (userName?: string, isVerified?: boolean) => (
    <View style={styles.reviewUser}>
      <LinearGradient
        colors={[getAvatarColor(userName), getAvatarColor((userName || '') + '1')]}
        style={styles.avatar}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.avatarText}>
          {userName?.charAt(0)?.toUpperCase() || 'U'}
        </Text>
      </LinearGradient>
      <View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
            {userName || 'Anonymous'}
          </Text>
          {isVerified && (
            <MaterialCommunityIcons 
              name="check-decagram" 
              size={16} 
              color="#4CAF50" 
            />
          )}
        </View>
      </View>
    </View>
  );

  const renderReview = ({ item }: { item: Review }) => (
    <View style={[styles.reviewCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.reviewHeader}>
        {renderUserAvatar(item.user_name, item.is_verified)}
        <Text style={[styles.automationTitle, { color: theme.colors.onSurfaceVariant }]}>
          {item.automation_title || 'Unknown Automation'}
        </Text>
        <View style={styles.reviewActions}>
          <TouchableOpacity onPress={() => handleDeleteReview(item.id)}>
            <MaterialCommunityIcons 
              name="delete" 
              size={20} 
              color="#F44336" 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {renderStarRating(item.rating)}
      
      <Text style={[styles.reviewComment, { color: theme.colors.onSurface }]}>
        {item.comment}
      </Text>
      
      <View style={styles.reviewFooter}>
        <Text style={[styles.reviewDate, { color: theme.colors.onSurfaceVariant }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        
        <TouchableOpacity 
          style={styles.helpfulButton}
          onPress={() => handleMarkHelpful(item.id)}
        >
          <MaterialCommunityIcons 
            name="thumb-up" 
            size={16} 
            color={theme.colors.onSurfaceVariant} 
          />
          <Text style={[styles.helpfulText, { color: theme.colors.onSurfaceVariant }]}>
            Helpful ({item.helpful_count || 0})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderFilterChip = (rating: number | null, label: string, hasIcon: boolean = false) => {
    const isActive = filterRating === rating;
    return (
      <TouchableOpacity
        key={rating || 'all'}
        style={[
          styles.filterChip,
          isActive && styles.filterChipActive,
          { 
            backgroundColor: isActive ? theme.colors.primary : theme.colors.surfaceVariant 
          }
        ]}
        onPress={() => setFilterRating(rating)}
      >
        {hasIcon && (
          <MaterialCommunityIcons 
            name="star" 
            size={16} 
            color={isActive ? 'white' : theme.colors.onSurfaceVariant} 
          />
        )}
        <Text style={[
          styles.filterChipText,
          { color: isActive ? 'white' : theme.colors.onSurfaceVariant }
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRatingFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {renderFilterChip(null, 'All')}
      {[5, 4, 3, 2, 1].map(rating => 
        renderFilterChip(rating, rating.toString(), true)
      )}
    </ScrollView>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={24} 
            color={theme.colors.onSurface} 
          />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Reviews & Ratings
        </Text>
        
        <TouchableOpacity onPress={handleSortToggle}>
          <MaterialCommunityIcons 
            name="sort" 
            size={24} 
            color={theme.colors.onSurface} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceVariant }]}>
        <MaterialCommunityIcons 
          name="magnify" 
          size={20} 
          color={theme.colors.onSurfaceVariant} 
        />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.onSurface }]}
          placeholder="Search reviews..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {renderRatingFilter()}
      
      <View style={[styles.statsBar, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.statsText, { color: theme.colors.onSurface }]}>
          {filteredReviews.length} Reviews
        </Text>
        <Text style={[styles.statsText, { color: theme.colors.onSurfaceVariant }]}>
          Sorted by: {getSortDisplayText()}
        </Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredReviews}
          renderItem={renderReview}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="comment-remove" 
                size={64} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
                No reviews found
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  filterContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 4,
  },
  filterChipActive: {
    // Styles applied dynamically
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  automationTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 12,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  helpfulText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default ModernReviewsScreen;