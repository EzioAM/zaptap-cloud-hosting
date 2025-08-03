import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;
  size?: number;
  showRating?: boolean;
  showCount?: boolean;
  reviewCount?: number;
  style?: any;
  color?: string;
  emptyColor?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  showRating = false,
  showCount = false,
  reviewCount = 0,
  style,
  color = '#FFD700',
  emptyColor = '#ddd',
}) => {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    // Full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Icon
          key={`full-${i}`}
          name="star"
          size={size}
          color={color}
        />
      );
    }

    // Half star
    if (hasHalfStar) {
      stars.push(
        <Icon
          key="half"
          name="star-half-full"
          size={size}
          color={color}
        />
      );
    }

    // Empty stars
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Icon
          key={`empty-${i}`}
          name="star-outline"
          size={size}
          color={emptyColor}
        />
      );
    }

    return stars;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {renderStars()}
      </View>
      
      {(showRating || showCount) && (
        <View style={styles.textContainer}>
          {showRating && (
            <Text style={[styles.ratingText, { fontSize: size * 0.8 }]}>
              {rating.toFixed(1)}
            </Text>
          )}
          {showCount && reviewCount > 0 && (
            <Text style={[styles.countText, { fontSize: size * 0.7 }]}>
              ({reviewCount})
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
  },
  textContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  ratingText: {
    color: '#333',
    fontWeight: '500',
  },
  countText: {
    color: '#666',
    marginLeft: 2,
  },
});

export default StarRating;