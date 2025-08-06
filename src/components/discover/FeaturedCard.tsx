import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeaturedAutomation {
  id: string;
  title: string;
  description: string;
  author: string;
  likes: number;
  uses: number;
  icon: string;
  color: string;
  category: string;
  rating?: number;
  featured?: boolean;
}

interface FeaturedCardProps {
  automation: FeaturedAutomation;
  onPress: (automation: FeaturedAutomation) => void;
  onLike?: (automation: FeaturedAutomation) => void;
  style?: any;
}

export const FeaturedCard: React.FC<FeaturedCardProps> = ({
  automation,
  onPress,
  onLike,
  style,
}) => {
  const theme = useSafeTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const likeScaleAnim = useRef(new Animated.Value(1)).current;
  const statsCountAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing animation for featured badge
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    // Shimmer effect for background
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    // Gentle rotation for icon
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    );

    // Animated counter for stats
    Animated.timing(statsCountAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    pulseAnimation.start();
    shimmerAnimation.start();
    rotateAnimation.start();

    return () => {
      pulseAnimation.stop();
      shimmerAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onPress(automation);
    });
  };

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(likeScaleAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(likeScaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onLike?.(automation);
    });
  };

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  const iconRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const animatedLikes = statsCountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, automation.likes],
  });

  const animatedUses = statsCountAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, automation.uses],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[
            automation.color,
            `${automation.color}CC`,
            `${automation.color}80`,
            automation.color,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.3, 0.7, 1]}
          style={styles.cardBackground}
        >
          {/* Shimmer Effect */}
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX: shimmerTranslateX }],
              },
            ]}
          />

          {/* Featured Badge */}
          <Animated.View
            style={[
              styles.featuredBadge,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.featuredBadgeText}>Featured</Text>
          </Animated.View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [{ rotate: iconRotate }],
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={automation.icon as any}
                  size={36}
                  color="white"
                />
              </Animated.View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {automation.title}
                </Text>
                <Text style={styles.cardAuthor}>by {automation.author}</Text>
                {automation.rating && (
                  <View style={styles.ratingContainer}>
                    {[...Array(5)].map((_, i) => (
                      <MaterialCommunityIcons
                        key={i}
                        name={i < Math.floor(automation.rating!) ? 'star' : 'star-outline'}
                        size={12}
                        color="#FFD700"
                      />
                    ))}
                    <Text style={styles.ratingText}>
                      {automation.rating.toFixed(1)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.cardDescription} numberOfLines={3}>
              {automation.description}
            </Text>

            <View style={styles.cardFooter}>
              <View style={styles.statsContainer}>
                <TouchableOpacity
                  style={styles.statItem}
                  onPress={handleLike}
                >
                  <Animated.View
                    style={[
                      styles.likeButton,
                      {
                        transform: [{ scale: likeScaleAnim }],
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="heart"
                      size={20}
                      color="#FF6B6B"
                    />
                  </Animated.View>
                  <Animated.Text style={styles.statText}>
                    {Math.round(animatedLikes.__getValue())}
                  </Animated.Text>
                </TouchableOpacity>

                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="download"
                    size={20}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Animated.Text style={styles.statText}>
                    {Math.round(animatedUses.__getValue())}
                  </Animated.Text>
                </View>
              </View>

              <TouchableOpacity style={styles.ctaButton} onPress={handlePress}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>Try Now</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={16}
                    color="white"
                    style={styles.ctaIcon}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Decorative Elements */}
          <View style={styles.decorativeElement1} />
          <View style={styles.decorativeElement2} />
          <View style={styles.decorativeElement3} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  card: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardBackground: {
    flex: 1,
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  featuredBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 2,
  },
  featuredBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 4,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 24,
  },
  cardAuthor: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 6,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  likeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 4,
  },
  statText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginLeft: 8,
  },
  ctaButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  ctaIcon: {
    marginLeft: 6,
  },
  decorativeElement1: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  decorativeElement2: {
    position: 'absolute',
    bottom: -60,
    right: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  decorativeElement3: {
    position: 'absolute',
    top: 60,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

export default FeaturedCard;