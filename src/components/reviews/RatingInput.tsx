import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Portal,
  Modal,
  Button,
  TextInput,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

interface RatingInputProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review?: string) => Promise<void>;
  initialRating?: number;
  initialReview?: string;
  isEditing?: boolean;
  automationTitle: string;
  isLoading?: boolean;
}

const RatingInput: React.FC<RatingInputProps> = ({
  visible,
  onClose,
  onSubmit,
  initialRating = 0,
  initialReview = '',
  isEditing = false,
  automationTitle,
  isLoading = false,
}) => {
  const [rating, setRating] = useState(initialRating);
  const [review, setReview] = useState(initialReview);

  // Update state when props change (for editing existing reviews)
  useEffect(() => {
    setRating(initialRating);
    setReview(initialReview);
  }, [initialRating, initialReview]);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async () => {
    if (rating === 0) {
      return; // Don't submit without a rating
    }
    
    try {
      await onSubmit(rating, review.trim() || undefined);
    } catch (error) {
      console.error('Failed to submit review:', error);
      // Error handling is delegated to parent component
    }
  };

  const handleStarPress = (starRating: number) => {
    setRating(starRating);
  };

  const getRatingText = (currentRating: number) => {
    if (currentRating === 0) return 'Select a rating';
    const texts = [
      '', // 0 - not used
      'Poor', // 1
      'Fair', // 2
      'Good', // 3
      'Very Good', // 4
      'Excellent', // 5
    ];
    return texts[currentRating];
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= (hoverRating || rating);
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          onPressIn={() => setHoverRating(i)}
          onPressOut={() => setHoverRating(0)}
          style={styles.starButton}
          disabled={isLoading}
        >
          <Icon
            name={isFilled ? 'star' : 'star-outline'}
            size={32}
            color={isFilled ? '#FFD700' : '#ccc'}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent} elevation={4}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isEditing ? 'Update Review' : 'Rate & Review'}
            </Text>
            <Text style={styles.automationTitle} numberOfLines={2}>
              {automationTitle}
            </Text>
          </View>

          <View style={styles.content}>
            {/* Star Rating */}
            <View style={styles.ratingSection}>
              <Text style={styles.sectionTitle}>Your Rating</Text>
              <View style={styles.starsContainer}>
                {renderStars()}
              </View>
              <Text style={styles.ratingText}>
                {getRatingText(hoverRating || rating)}
              </Text>
            </View>

            {/* Review Text */}
            <View style={styles.reviewSection}>
              <Text style={styles.sectionTitle}>Review (Optional)</Text>
              <TextInput
                value={review}
                onChangeText={setReview}
                placeholder="Share your experience with this automation..."
                multiline
                numberOfLines={4}
                style={styles.reviewInput}
                disabled={isLoading}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {review.length}/500
              </Text>
            </View>

            {/* Rating Guidelines */}
            <View style={styles.guidelinesSection}>
              <Text style={styles.guidelinesTitle}>Rating Guidelines</Text>
              <View style={styles.guideline}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.guidelineText}>
                  5 stars: Excellent - Works perfectly, very useful
                </Text>
              </View>
              <View style={styles.guideline}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.guidelineText}>
                  4 stars: Very Good - Works well with minor issues
                </Text>
              </View>
              <View style={styles.guideline}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.guidelineText}>
                  3 stars: Good - Works but has some limitations
                </Text>
              </View>
              <View style={styles.guideline}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.guidelineText}>
                  2 stars: Fair - Works but needs improvement
                </Text>
              </View>
              <View style={styles.guideline}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={styles.guidelineText}>
                  1 star: Poor - Doesn't work or not useful
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              onPress={onClose}
              disabled={isLoading}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              disabled={rating === 0 || isLoading}
              style={styles.submitButton}
              loading={isLoading}
            >
              {isLoading ? 'Submitting...' : (isEditing ? 'Update' : 'Submit')}
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    maxHeight: '90%',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  automationTitle: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  ratingSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewInput: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  guidelinesSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  guideline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  guidelineText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

export default RatingInput;