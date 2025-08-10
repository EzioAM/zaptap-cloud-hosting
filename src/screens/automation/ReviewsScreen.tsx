import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import {
  ActivityIndicator,
  Text,
  Snackbar,
  IconButton,
} from 'react-native-paper';
import LinearGradient from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AutomationData, AutomationReview, RatingStats } from '../../types';
import { reviewService } from '../../services/reviews/ReviewService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import RatingInput from '../../components/reviews/RatingInput';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { EventLogger } from '../../utils/EventLogger';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';

const { width: screenWidth } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Reviews'>;

const ReviewsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { automation } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  const theme = useSafeTheme();
  
  const [reviews, setReviews] = useState<AutomationReview[]>([]);
  const [ratingStats, setRatingStats] = useState<RatingStats>({
    average_rating: 0,
    total_reviews: 0,
    rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [userReview, setUserReview] = useState<AutomationReview | null>(null);
  const [showRatingInput, setShowRatingInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnimations = useRef<{ [key: number]: Animated.Value }>({}).current;

  useEffect(() => {
    loadReviews();
    if (user) {
      loadUserReview();
    }
  }, [automation.id, user]);

  useEffect(() => {
    if (!isLoading) {
      // Animate content in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  const loadReviews = async () => {
    try {
      const [reviewsResult, statsResult] = await Promise.all([
        reviewService.getAutomationReviews(automation.id, 50, 0),
        reviewService.getRatingStats(automation.id)
      ]);

      setReviews(reviewsResult.reviews);
      setRatingStats(statsResult);

      // Initialize progress bar animations
      if (statsResult.rating_breakdown) {
        Object.keys(statsResult.rating_breakdown).forEach(rating => {
          const ratingNum = parseInt(rating);
          if (!progressAnimations[ratingNum]) {
            progressAnimations[ratingNum] = new Animated.Value(0);
          }
        });
      }
    } catch (error: any) {
      EventLogger.error('Automation', 'Failed to load reviews:', error as Error);
      showMessage('Failed to load reviews');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserReview = async () => {
    if (!user) return;
    
    try {
      const review = await reviewService.getUserReview(automation.id, user.id);
      setUserReview(review);
    } catch (error: any) {
      EventLogger.error('Automation', 'Failed to load user review:', error as Error);
    }
  };

  const onRefresh = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRefreshing(true);
    loadReviews();
  };

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setShowSnackbar(true);
  };

  const handleSubmitReview = async (rating: number, reviewText?: string) => {
    if (!user) {
      navigation.navigate('SignIn');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setIsSubmitting(true);
    try {
      const result = await reviewService.submitReview(
        automation.id,
        user.id,
        rating,
        reviewText
      );

      if (result.success && result.review) {
        setUserReview(result.review);
        setShowRatingInput(false);
        showMessage(userReview ? 'Review updated successfully!' : 'Review submitted successfully!');
        
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Refresh reviews and stats
        await loadReviews();
      } else {
        showMessage(result.error || 'Failed to submit review');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch (error: any) {
      showMessage('Failed to submit review');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReview = (review: AutomationReview) => {
    if (user && review.user_id === user.id) {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setShowRatingInput(true);
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    if (!user) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Delete Review',
      'Are you sure you want to delete your review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await reviewService.deleteReview(reviewId, user.id);
            if (result.success) {
              setUserReview(null);
              showMessage('Review deleted successfully');
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              await loadReviews();
            } else {
              showMessage(result.error || 'Failed to delete review');
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
            }
          }
        }
      ]
    );
  };

  const handleHelpfulPress = async (reviewId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const result = await reviewService.markReviewHelpful(reviewId);
    if (result.success) {
      // Update the helpful count locally
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === reviewId
            ? { ...review, helpful_count: review.helpful_count + 1 }
            : review
        )
      );
      showMessage('Marked as helpful');
    } else {
      showMessage('Failed to mark as helpful');
    }
  };

  const renderStars = (rating: number, size: number = 16, animated: boolean = false) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const StarComponent = animated ? Animated.View : View;
      stars.push(
        <StarComponent key={i}>
          <Icon
            name={i <= rating ? 'star' : 'star-outline'}
            size={size}
            color={i <= rating ? '#FFD700' : theme.colors.border.light}
          />
        </StarComponent>
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  const renderRatingBreakdown = () => {
    const { rating_breakdown, total_reviews } = ratingStats;
    
    if (!rating_breakdown || total_reviews === 0) {
      return null;
    }
    
    return (
      <View style={styles.breakdownContainer}>
        {[5, 4, 3, 2, 1].map(star => {
          const count = rating_breakdown[star as keyof typeof rating_breakdown] || 0;
          const percentage = total_reviews > 0 ? (count / total_reviews) * 100 : 0;
          
          // Animate progress bar
          if (progressAnimations[star] && !isLoading) {
            Animated.timing(progressAnimations[star], {
              toValue: percentage,
              duration: 800,
              delay: star * 100,
              useNativeDriver: false,
            }).start();
          }
          
          return (
            <View key={star} style={styles.breakdownRow}>
              <Text style={[styles.breakdownStar, { color: theme.colors.text.primary }]}>
                {star}
              </Text>
              <Icon name="star" size={12} color="#FFD700" />
              <View style={[styles.breakdownBar, { backgroundColor: theme.colors.surface.secondary }]}>
                <Animated.View 
                  style={[
                    styles.breakdownFill,
                    {
                      width: progressAnimations[star] 
                        ? progressAnimations[star].interpolate({
                            inputRange: [0, 100],
                            outputRange: ['0%', '100%'],
                            extrapolate: 'clamp',
                          })
                        : `${percentage}%`,
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.breakdownCount, { color: theme.colors.text.secondary }]}>
                {count}
              </Text>
            </View>
          );
        })}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUserDisplayName = (email?: string) => {
    if (!email || email === 'Anonymous') return 'Anonymous';
    return email.split('@')[0];
  };

  const renderEmptyState = () => (
    <Animated.View 
      style={[
        styles.noReviews,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
      >
        <LinearGradient
          colors={['#F0F4FF', '#E8F2FF']}
          style={styles.emptyStateIconContainer}
        >
          <Icon name="comment-outline" size={48} color={theme.colors.brand.primary} />
        </LinearGradient>
      </Animated.View>
      <Text style={[styles.noReviewsTitle, { color: theme.colors.text.primary }]}>
        No Reviews Yet
      </Text>
      <Text style={[styles.noReviewsText, { color: theme.colors.text.secondary }]}>
        Be the first to review this automation!
      </Text>
    </Animated.View>
  );

  const canWriteReview = user && automation.created_by !== user.id;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                navigation.goBack();
              }}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={24} color="white" />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Reviews</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading reviews...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="white" />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Reviews</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {automation.title}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              Alert.alert(
                'Reviews & Ratings',
                'Reviews help other users discover great automations. Share your experience to help the community!'
              );
            }}
            style={styles.infoButton}
          >
            <Icon name="information" size={24} color="white" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.brand.primary}
            colors={[theme.colors.brand.primary]}
          />
        }
      >
        {/* Rating Summary Card */}
        <Animated.View
          style={[
            styles.summaryCard,
            {
              backgroundColor: theme.colors.surface.primary,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
            theme.shadows.md,
          ]}
        >
          <View style={styles.summaryHeader}>
            <View style={styles.averageRating}>
              <Text style={[styles.averageNumber, { color: theme.colors.text.primary }]}>
                {ratingStats.average_rating.toFixed(1)}
              </Text>
              {renderStars(Math.round(ratingStats.average_rating), 20)}
            </View>
            <View style={styles.summaryStats}>
              <Text style={[styles.totalReviews, { color: theme.colors.text.secondary }]}>
                {ratingStats.total_reviews} review{ratingStats.total_reviews !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          
          {ratingStats.total_reviews > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.colors.border.light }]} />
              {renderRatingBreakdown()}
            </>
          )}
        </Animated.View>

        {/* Reviews List or Empty State */}
        {reviews.length > 0 ? (
          <Animated.View
            style={[
              styles.reviewsList,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={[styles.reviewsTitle, { color: theme.colors.text.primary }]}>
              Reviews
            </Text>
            {reviews.map((review, index) => (
              <Animated.View
                key={review.id}
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: theme.colors.surface.primary,
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, 50 + index * 10],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                  theme.shadows.sm,
                ]}
              >
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerDetails}>
                      <Text style={[styles.reviewerName, { color: theme.colors.text.primary }]}>
                        {getUserDisplayName(review.user_email)}
                      </Text>
                      <View style={styles.reviewMeta}>
                        {renderStars(review.rating, 14)}
                        <Text style={[styles.reviewDate, { color: theme.colors.text.tertiary }]}>
                          {formatDate(review.created_at)}
                        </Text>
                        {review.is_verified && (
                          <View style={[styles.verifiedChip, { backgroundColor: theme.colors.semantic.successBackground }]}>
                            <Icon name="check-circle" size={12} color={theme.colors.semantic.success} />
                            <Text style={[styles.verifiedText, { color: theme.colors.semantic.success }]}>
                              Verified
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  {/* User Actions */}
                  {user && review.user_id === user.id && (
                    <View style={styles.userActions}>
                      <TouchableOpacity
                        onPress={() => handleEditReview(review)}
                        style={styles.actionButton}
                      >
                        <Icon name="pencil" size={16} color={theme.colors.brand.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteReview(review.id)}
                        style={styles.actionButton}
                      >
                        <Icon name="delete" size={16} color={theme.colors.semantic.error} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Review Text */}
                {review.review_text && (
                  <Text style={[styles.reviewText, { color: theme.colors.text.primary }]}>
                    {review.review_text}
                  </Text>
                )}

                {/* Review Actions */}
                <View style={styles.reviewActions}>
                  <TouchableOpacity
                    onPress={() => handleHelpfulPress(review.id)}
                    style={styles.helpfulButton}
                  >
                    <Icon name="thumb-up-outline" size={16} color={theme.colors.text.secondary} />
                    {review.helpful_count > 0 && (
                      <Text style={[styles.helpfulCount, { color: theme.colors.text.secondary }]}>
                        {review.helpful_count} helpful
                      </Text>
                    )}
                  </TouchableOpacity>
                  
                  {review.updated_at !== review.created_at && (
                    <Text style={[styles.editedText, { color: theme.colors.text.tertiary }]}>
                      Edited
                    </Text>
                  )}
                </View>
              </Animated.View>
            ))}
          </Animated.View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {canWriteReview && (
        <Animated.View
          style={[
            styles.fabContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              setShowRatingInput(true);
            }}
            style={({ pressed }) => [
              styles.fab,
              {
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              }
            ]}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fabGradient}
            >
              <Icon 
                name={userReview ? 'pencil' : 'plus'} 
                size={24} 
                color="white" 
              />
            </LinearGradient>
          </Pressable>
          <Text style={[styles.fabLabel, { color: theme.colors.text.primary }]}>
            {userReview ? 'Edit Review' : 'Add Review'}
          </Text>
        </Animated.View>
      )}

      {/* Rating Input Modal */}
      <RatingInput
        visible={showRatingInput}
        onClose={() => setShowRatingInput(false)}
        onSubmit={handleSubmitReview}
        initialRating={userReview?.rating || 0}
        initialReview={userReview?.review_text || ''}
        isEditing={!!userReview}
        automationTitle={automation.title}
        isLoading={isSubmitting}
      />

      {/* Snackbar for messages */}
      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={3000}
        style={{ backgroundColor: theme.colors.surface.elevated }}
        action={{
          label: 'OK',
          onPress: () => setShowSnackbar(false),
          textColor: theme.colors.brand.primary,
        }}
      >
        <Text style={{ color: theme.colors.text.primary }}>
          {snackbarMessage}
        </Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  averageRating: {
    alignItems: 'center',
  },
  averageNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryStats: {
    alignItems: 'flex-end',
  },
  totalReviews: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
  breakdownContainer: {
    padding: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownStar: {
    fontSize: 14,
    fontWeight: '500',
    width: 16,
    textAlign: 'center',
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 12,
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  breakdownCount: {
    fontSize: 14,
    fontWeight: '500',
    width: 24,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewsList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  reviewsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  reviewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  reviewText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: -8,
    gap: 6,
  },
  helpfulCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  editedText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  noReviews: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noReviewsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noReviewsText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'center',
  },
  fab: {
    borderRadius: 28,
    marginBottom: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default ReviewsScreen;