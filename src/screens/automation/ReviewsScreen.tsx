import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Appbar,
  FAB,
  ActivityIndicator,
  Text,
  Snackbar,
} from 'react-native-paper';
import { AutomationData, AutomationReview, RatingStats } from '../../types';
import { reviewService } from '../../services/reviews/ReviewService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import RatingInput from '../../components/reviews/RatingInput';
import ReviewDisplay from '../../components/reviews/ReviewDisplay';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { EventLogger } from '../../utils/EventLogger';

type Props = NativeStackScreenProps<RootStackParamList, 'Reviews'>;

const ReviewsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { automation } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
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

  useEffect(() => {
    loadReviews();
    if (user) {
      loadUserReview();
    }
  }, [automation.id, user]);

  const loadReviews = async () => {
    try {
      const [reviewsResult, statsResult] = await Promise.all([
        reviewService.getAutomationReviews(automation.id, 50, 0),
        reviewService.getRatingStats(automation.id)
      ]);

      setReviews(reviewsResult.reviews);
      setRatingStats(statsResult);
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
        
        // Refresh reviews and stats
        await loadReviews();
      } else {
        showMessage(result.error || 'Failed to submit review');
      }
    } catch (error: any) {
      showMessage('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReview = (review: AutomationReview) => {
    if (user && review.user_id === user.id) {
      setShowRatingInput(true);
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    if (!user) return;

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
              await loadReviews();
            } else {
              showMessage(result.error || 'Failed to delete review');
            }
          }
        }
      ]
    );
  };

  const handleHelpfulPress = async (reviewId: string) => {
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

  const canWriteReview = user && automation.created_by !== user.id;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title="Reviews" />
        </Appbar.Header>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Reviews" subtitle={automation.title} />
        <Appbar.Action
          icon="information"
          onPress={() => Alert.alert(
            'Reviews & Ratings',
            'Reviews help other users discover great automations. Share your experience to help the community!'
          )}
        />
      </Appbar.Header>

      <ReviewDisplay
        reviews={reviews}
        ratingStats={ratingStats}
        onHelpfulPress={handleHelpfulPress}
        onEditReview={handleEditReview}
        onDeleteReview={handleDeleteReview}
        currentUserId={user?.id}
        showUserActions={true}
      />

      {/* Add/Edit Review FAB */}
      {canWriteReview && (
        <FAB
          icon={userReview ? 'pencil' : 'plus'}
          label={userReview ? 'Edit Review' : 'Add Review'}
          onPress={() => setShowRatingInput(true)}
          style={styles.fab}
        />
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
        action={{
          label: 'OK',
          onPress: () => setShowSnackbar(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default ReviewsScreen;