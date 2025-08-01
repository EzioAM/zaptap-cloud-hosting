import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  IconButton,
  Divider,
  Surface,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AutomationReview, RatingStats } from '../../types';

interface ReviewDisplayProps {
  reviews: AutomationReview[];
  ratingStats: RatingStats;
  onHelpfulPress?: (reviewId: string) => void;
  onEditReview?: (review: AutomationReview) => void;
  onDeleteReview?: (reviewId: string) => void;
  currentUserId?: string;
  showUserActions?: boolean;
}

const ReviewDisplay: React.FC<ReviewDisplayProps> = ({
  reviews,
  ratingStats,
  onHelpfulPress,
  onEditReview,
  onDeleteReview,
  currentUserId,
  showUserActions = true,
}) => {
  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color={i <= rating ? '#FFD700' : '#ddd'}
        />
      );
    }
    return <View style={styles.starsRow}>{stars}</View>;
  };

  const renderRatingBreakdown = () => {
    const { rating_breakdown, total_reviews } = ratingStats;
    
    return (
      <View style={styles.breakdownContainer}>
        {[5, 4, 3, 2, 1].map(star => {
          const count = rating_breakdown[star as keyof typeof rating_breakdown];
          const percentage = total_reviews > 0 ? (count / total_reviews) * 100 : 0;
          
          return (
            <View key={star} style={styles.breakdownRow}>
              <Text style={styles.breakdownStar}>{star}</Text>
              <Icon name="star" size={12} color="#FFD700" />
              <View style={styles.breakdownBar}>
                <View 
                  style={[
                    styles.breakdownFill, 
                    { width: `${percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.breakdownCount}>{count}</Text>
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
    return email.split('@')[0]; // Show part before @ symbol
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Rating Summary */}
      <Surface style={styles.summaryCard} elevation={1}>
        <View style={styles.summaryHeader}>
          <View style={styles.averageRating}>
            <Text style={styles.averageNumber}>
              {ratingStats.average_rating.toFixed(1)}
            </Text>
            {renderStars(Math.round(ratingStats.average_rating), 20)}
          </View>
          <View style={styles.summaryStats}>
            <Text style={styles.totalReviews}>
              {ratingStats.total_reviews} review{ratingStats.total_reviews !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        
        {ratingStats.total_reviews > 0 && (
          <>
            <Divider style={styles.divider} />
            {renderRatingBreakdown()}
          </>
        )}
      </Surface>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <View style={styles.reviewsList}>
          <Text style={styles.reviewsTitle}>Reviews</Text>
          {reviews.map((review, index) => (
            <Card key={review.id} style={styles.reviewCard}>
              <Card.Content>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerDetails}>
                      <Text style={styles.reviewerName}>
                        {getUserDisplayName(review.user_email)}
                      </Text>
                      <View style={styles.reviewMeta}>
                        {renderStars(review.rating, 14)}
                        <Text style={styles.reviewDate}>
                          {formatDate(review.created_at)}
                        </Text>
                        {review.is_verified && (
                          <Chip icon="check-circle" compact style={styles.verifiedChip}>
                            Verified
                          </Chip>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  {/* User Actions */}
                  {showUserActions && currentUserId === review.user_id && (
                    <View style={styles.userActions}>
                      <IconButton
                        icon="pencil"
                        size={16}
                        onPress={() => onEditReview?.(review)}
                      />
                      <IconButton
                        icon="delete"
                        size={16}
                        onPress={() => onDeleteReview?.(review.id)}
                      />
                    </View>
                  )}
                </View>

                {/* Review Text */}
                {review.review_text && (
                  <Text style={styles.reviewText}>
                    {review.review_text}
                  </Text>
                )}

                {/* Review Actions */}
                <View style={styles.reviewActions}>
                  <View style={styles.helpfulSection}>
                    <IconButton
                      icon="thumb-up-outline"
                      size={16}
                      onPress={() => onHelpfulPress?.(review.id)}
                    />
                    <Text style={styles.helpfulCount}>
                      {review.helpful_count > 0 && `${review.helpful_count} helpful`}
                    </Text>
                  </View>
                  
                  {review.updated_at !== review.created_at && (
                    <Text style={styles.editedText}>Edited</Text>
                  )}
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      ) : (
        <View style={styles.noReviews}>
          <Icon name="comment-outline" size={48} color="#ccc" />
          <Text style={styles.noReviewsTitle}>No Reviews Yet</Text>
          <Text style={styles.noReviewsText}>
            Be the first to review this automation!
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  averageRating: {
    alignItems: 'center',
  },
  averageNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryStats: {
    alignItems: 'flex-end',
  },
  totalReviews: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    marginHorizontal: 16,
  },
  breakdownContainer: {
    padding: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownStar: {
    fontSize: 12,
    color: '#333',
    width: 12,
    textAlign: 'right',
  },
  breakdownBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  breakdownFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  breakdownCount: {
    fontSize: 12,
    color: '#666',
    width: 20,
  },
  starsRow: {
    flexDirection: 'row',
  },
  reviewsList: {
    paddingHorizontal: 16,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  reviewCard: {
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerDetails: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  verifiedChip: {
    backgroundColor: '#e8f5e8',
  },
  userActions: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpfulSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpfulCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: -8,
  },
  editedText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  noReviews: {
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  noReviewsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noReviewsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ReviewDisplay;