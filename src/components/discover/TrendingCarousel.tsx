import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = 180;
const SPACING = 10;

interface TrendingItem {
  id: string;
  title: string;
  description: string;
  author: string;
  likes: number;
  uses: number;
  icon: string;
  color: string;
  category: string;
}

interface TrendingCarouselProps {
  data: TrendingItem[];
  onItemPress: (item: TrendingItem) => void;
  onLike?: (item: TrendingItem) => void;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export const TrendingCarousel: React.FC<TrendingCarouselProps> = ({
  data = [],
  onItemPress,
  onLike,
  autoPlay = true,
  autoPlayInterval = 4000,
}) => {
  const theme = useSafeTheme();
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(autoPlay);
  const autoPlayRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isAutoPlaying && data && data.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % data.length;
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, autoPlayInterval);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, data.length, autoPlayInterval]);

  const pauseAutoPlay = () => {
    setIsAutoPlaying(false);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
  };

  const resumeAutoPlay = () => {
    setIsAutoPlaying(true);
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    scrollX.setValue(contentOffsetX);
    const index = Math.round(contentOffsetX / (CARD_WIDTH + SPACING));
    setCurrentIndex(index);
  };

  // Helper function to determine if a color is light or dark for text contrast
  const isLightColor = (color: string) => {
    // Safety check for undefined/null colors
    if (!color || typeof color !== 'string') {
      return false; // Default to dark text on light background
    }
    
    try {
      const hex = color.replace('#', '');
      
      // Ensure we have a valid hex color (6 characters)
      if (hex.length !== 6) {
        return false;
      }
      
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // Check for invalid color values
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return false;
      }
      
      const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return brightness > 155;
    } catch (error) {
      // If any error occurs, default to dark text
      return false;
    }
  };

  const renderCard = ({ item, index }: { item: TrendingItem; index: number }) => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + SPACING),
      index * (CARD_WIDTH + SPACING),
      (index + 1) * (CARD_WIDTH + SPACING),
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.85, 1, 0.85],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [20, 0, 20],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1, 0.6],
      extrapolate: 'clamp',
    });

    const rotateY = scrollX.interpolate({
      inputRange,
      outputRange: ['15deg', '0deg', '-15deg'],
      extrapolate: 'clamp',
    });

    // Determine text colors based on background for better contrast
    const safeColor = item.color || '#6366F1'; // Fallback color
    const isLight = isLightColor(safeColor);
    const primaryTextColor = isLight ? '#1a1a1a' : '#ffffff';
    const secondaryTextColor = isLight ? 'rgba(26,26,26,0.8)' : 'rgba(255,255,255,0.9)';
    const iconColor = isLight ? '#1a1a1a' : '#ffffff';

    return (
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [
              { scale },
              { translateY },
              { perspective: 800 },
              { rotateY },
            ],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => onItemPress(item)}
          onPressIn={pauseAutoPlay}
          onPressOut={() => setTimeout(resumeAutoPlay, 2000)}
          activeOpacity={0.9}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Trending automation: ${item.title}`}
        >
          <LinearGradient
            colors={[safeColor, `${safeColor}E6`, `${safeColor}CC`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardBackground}
          >
            {/* Dark overlay for better text contrast */}
            <View style={[styles.overlay, { backgroundColor: isLight ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.2)' }]} />
            
            {/* Trending Badge */}
            <View style={styles.trendingBadge}>
              <MaterialCommunityIcons name="trending-up" size={12} color="#FF4444" />
              <Text style={styles.trendingBadgeText}>Trending</Text>
            </View>

            {/* Card Content */}
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={[
                  styles.iconContainer, 
                  { backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }
                ]}>
                  <MaterialCommunityIcons name={item.icon as any} size={28} color={iconColor} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: primaryTextColor }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.cardAuthor, { color: secondaryTextColor }]} numberOfLines={1}>
                    by {item.author}
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardDescription, { color: secondaryTextColor }]} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.cardFooter}>
                <View style={styles.statsContainer}>
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() => onLike?.(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Like ${item.title}`}
                  >
                    <Animated.View
                      style={{
                        transform: [{ scale: new Animated.Value(1) }],
                      }}
                    >
                      <MaterialCommunityIcons
                        name="heart"
                        size={16}
                        color={iconColor}
                      />
                    </Animated.View>
                    <Text style={[styles.statText, { color: secondaryTextColor }]}>{item.likes}</Text>
                  </TouchableOpacity>

                  <View style={styles.statItem}>
                    <MaterialCommunityIcons
                      name="download"
                      size={16}
                      color={iconColor}
                    />
                    <Text style={[styles.statText, { color: secondaryTextColor }]}>{item.uses}</Text>
                  </View>
                </View>

                <View style={[
                  styles.categoryPill,
                  { backgroundColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }
                ]}>
                  <Text style={[styles.categoryText, { color: primaryTextColor }]}>{item.category}</Text>
                </View>
              </View>
            </View>

            {/* Enhanced Decorative Elements */}
            <View style={[
              styles.decorativeCircle1,
              { backgroundColor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)' }
            ]} />
            <View style={[
              styles.decorativeCircle2,
              { backgroundColor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)' }
            ]} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderIndicators = () => (
    <View style={styles.indicatorContainer}>
      {data && data.map((_, index) => {
        const inputRange = [
          (index - 1) * (CARD_WIDTH + SPACING),
          index * (CARD_WIDTH + SPACING),
          (index + 1) * (CARD_WIDTH + SPACING),
        ];

        const scale = scrollX.interpolate({
          inputRange,
          outputRange: [0.8, 1.2, 0.8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.4, 1, 0.4],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.indicator,
              {
                backgroundColor: theme.colors?.brand?.primary || '#6366F1',
                transform: [{ scale }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );

  if (!data || !data.length) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderCard}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + SPACING}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollBegin={pauseAutoPlay}
        onMomentumScrollEnd={() => setTimeout(resumeAutoPlay, 2000)}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + SPACING,
          offset: (CARD_WIDTH + SPACING) * index,
          index,
        })}
      />
      {renderIndicators()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  flatListContent: {
    paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginHorizontal: SPACING / 2,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardBackground: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  trendingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  trendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF4444',
    marginLeft: 2,
  },
  cardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    zIndex: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardAuthor: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default TrendingCarousel;