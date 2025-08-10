/**
 * TrendingCard component for displaying trending automations
 * 
 * Features:
 * - Glass morphism card design
 * - Trending indicator with growth rate
 * - Creator information and avatar
 * - Rating display with stars
 * - Execution count and engagement metrics
 * - Share button with URL generation
 * - Smooth animations and press feedback
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Share,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { getExtendedColors, getGlassStyle } from '../../theme/colors';
import { TrendingAutomation, createShareUrl, createDeepLink } from '../../store/api/searchApi';
import { EventLogger } from '../../utils/EventLogger';
import ShareHelper from '../../utils/ShareHelper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.85;

interface TrendingCardProps {
  automation: TrendingAutomation;
  onPress?: (automation: TrendingAutomation) => void;
  onSharePress?: (automation: TrendingAutomation) => void;
  onCreatorPress?: (creatorId: string) => void;
  style?: any;
  theme?: 'light' | 'dark';
  showGrowthRate?: boolean;
}

export const TrendingCard: React.FC<TrendingCardProps> = ({
  automation,
  onPress,
  onSharePress,
  onCreatorPress,
  style,
  theme = 'light',
  showGrowthRate = true,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const colors = getExtendedColors(theme);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnimation, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnimation, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    onPress?.(automation);
  };

  const handleShare = async () => {
    if (onSharePress) {
      onSharePress(automation);
    } else {
      // Use centralized ShareHelper for consistent sharing
      const success = await ShareHelper.shareAutomation(automation);
      if (success) {
        EventLogger.debug('TrendingCard', 'Automation shared successfully');
      }
      }
    } catch (error) {
      EventLogger.error('TrendingCard', 'Error sharing automation:', error as Error);
      Alert.alert(
        'Share Error',
        'Unable to share this automation. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleCreatorPress = () => {
    onCreatorPress?.(automation.createdBy.id);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={`star-${i}`} name="star" size={12} color="#F59E0B" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half-star" name="star-half" size={12} color="#F59E0B" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={12} color="#9CA3AF" />
      );
    }
    
    return stars;
  };

  const glassStyle = getGlassStyle('medium', theme === 'dark');
  const trendingColor = automation.growthRate > 50 ? '#EF4444' : 
                      automation.growthRate > 20 ? '#F59E0B' : '#10B981';

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel={`Trending automation: ${automation.title}`}
    >
      <Animated.View
        style={[
          styles.card,
          {
            width: CARD_WIDTH,
            transform: [{ scale: scaleAnimation }],
          }
        ]}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint={theme} style={styles.blurContainer}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.1)', 'rgba(124, 58, 237, 0.05)']}
              style={styles.gradient}
            />
          </BlurView>
        ) : (
          <View style={[StyleSheet.absoluteFillObject, glassStyle]} />
        )}

        {/* Trending Badge */}
        {showGrowthRate && (
          <View style={[styles.trendingBadge, { backgroundColor: trendingColor }]}>
            <Ionicons name="trending-up" size={12} color="white" />
            <Text style={styles.trendingText}>
              +{automation.growthRate.toFixed(0)}%
            </Text>
          </View>
        )}

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.shareButtonGradient}
          >
            <Ionicons name="share" size={16} color="white" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Thumbnail */}
        {automation.thumbnail && (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: automation.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.3)']}
              style={styles.thumbnailOverlay}
            />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text 
                style={[styles.title, { color: colors.text.primary }]}
                numberOfLines={2}
              >
                {automation.title}
              </Text>
              <Text 
                style={[styles.category, { color: colors.brand.primary }]}
                numberOfLines={1}
              >
                {automation.category}
              </Text>
            </View>
            
            {/* Rating */}
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>
                {renderStars(automation.rating)}
              </View>
              <Text style={[styles.ratingText, { color: colors.text.secondary }]}>
                {automation.rating.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text 
            style={[styles.description, { color: colors.text.secondary }]}
            numberOfLines={2}
          >
            {automation.description}
          </Text>

          {/* Tags */}
          {automation.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {automation.tags.slice(0, 3).map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tag, { backgroundColor: colors.brand.primary + '20' }]}
                >
                  <Text style={[styles.tagText, { color: colors.brand.primary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
              {automation.tags.length > 3 && (
                <Text style={[styles.moreTagsText, { color: colors.text.tertiary }]}>
                  +{automation.tags.length - 3} more
                </Text>
              )}
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            {/* Creator */}
            <TouchableOpacity 
              style={styles.creator}
              onPress={handleCreatorPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={`View creator: ${automation.createdBy.username}`}
            >
              <View style={styles.creatorAvatar}>
                {automation.createdBy.avatar ? (
                  <Image
                    source={{ uri: automation.createdBy.avatar }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <LinearGradient
                    colors={['#8B5CF6', '#7C3AED']}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {automation.createdBy.username.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <Text style={[styles.creatorName, { color: colors.text.secondary }]}>
                {automation.createdBy.username}
              </Text>
            </TouchableOpacity>

            {/* Stats */}
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Ionicons name="play" size={14} color={colors.text.tertiary} />
                <Text style={[styles.statText, { color: colors.text.tertiary }]}>
                  {formatNumber(automation.executionCount)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color={colors.text.tertiary} />
                <Text style={[styles.statText, { color: colors.text.tertiary }]}>
                  {formatNumber(automation.reviewCount)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  trendingBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
    gap: 4,
  },
  trendingText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  shareButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  shareButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  thumbnailContainer: {
    height: 120,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  titleContainer: {
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  category: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  moreTagsText: {
    fontSize: 10,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TrendingCard;