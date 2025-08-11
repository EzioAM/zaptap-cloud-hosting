import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { useGetFeaturedAutomationQuery } from '../../../store/api/dashboardApi';
import EnhancedLoadingSkeleton from '../../common/EnhancedLoadingSkeleton';
// Safe imports with fallbacks
let gradients: any = {};
let subtleGradients: any = {};
let typography: any = {};
let fontWeights: any = {};
let textShadows: any = {};

try {
  const gradientsModule = require('../../../theme/gradients');
  gradients = gradientsModule.gradients || {
    ocean: { colors: ['#0EA5E9', '#38BDF8'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    success: { colors: ['#10B981', '#34D399'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    secondary: { colors: ['#EC4899', '#F472B6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    warning: { colors: ['#F59E0B', '#FBBF24'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    error: { colors: ['#EF4444', '#F87171'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    cosmic: { colors: ['#7C3AED', '#A855F7'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    primary: { colors: ['#6366F1', '#8B5CF6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    premium: { colors: ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  };
  subtleGradients = gradientsModule.subtleGradients || {
    lightPurple: { colors: ['#F3E8FF', '#E9D5FF', '#D8B4FE'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  };
} catch (error) {
  console.warn('Gradients theme not found, using defaults');
  gradients = {
    ocean: { colors: ['#0EA5E9', '#38BDF8'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    success: { colors: ['#10B981', '#34D399'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    secondary: { colors: ['#EC4899', '#F472B6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    warning: { colors: ['#F59E0B', '#FBBF24'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    error: { colors: ['#EF4444', '#F87171'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    cosmic: { colors: ['#7C3AED', '#A855F7'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    primary: { colors: ['#6366F1', '#8B5CF6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    premium: { colors: ['#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  };
  subtleGradients = {
    lightPurple: { colors: ['#F3E8FF', '#E9D5FF', '#D8B4FE'], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  };
}

try {
  const typographyModule = require('../../../theme/typography');
  typography = typographyModule.typography || {
    titleMedium: { fontSize: 16, fontWeight: '500' },
    bodyLarge: { fontSize: 16, fontWeight: '400' },
    labelSmall: { fontSize: 11, fontWeight: '500' },
    labelMedium: { fontSize: 14, fontWeight: '500' },
    heroMedium: { fontSize: 48, fontWeight: 'bold' },
  };
  fontWeights = typographyModule.fontWeights || {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  textShadows = typographyModule.textShadows || {
    strong: {
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 4 },
      textShadowRadius: 8,
    },
    medium: {
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
  };
} catch (error) {
  console.warn('Typography theme not found, using defaults');
  typography = {
    titleMedium: { fontSize: 16, fontWeight: '500' },
    bodyLarge: { fontSize: 16, fontWeight: '400' },
    labelSmall: { fontSize: 11, fontWeight: '500' },
    labelMedium: { fontSize: 14, fontWeight: '500' },
    heroMedium: { fontSize: 48, fontWeight: 'bold' },
  };
  fontWeights = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  textShadows = {
    strong: {
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 4 },
      textShadowRadius: 8,
    },
    medium: {
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
  };
}
import * as Haptics from 'expo-haptics';
import { EventLogger } from '../../../utils/EventLogger';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CategoryChipProps {
  category: string;
  delay?: number;
}

const CategoryChip: React.FC<CategoryChipProps> = ({ category, delay = 0 }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 20,
      friction: 7,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  const getCategoryGradient = (cat: string): keyof typeof gradients => {
    const categoryMap: Record<string, keyof typeof gradients> = {
      'productivity': 'ocean',
      'smart-home': 'success',
      'social': 'secondary',
      'finance': 'warning',
      'health': 'error',
      'entertainment': 'cosmic',
      'developer': 'primary',
    };
    const gradientKey = categoryMap[cat.toLowerCase()] || 'primary';
    // Validate gradient exists and has colors
    if (!gradients[gradientKey] || !gradients[gradientKey].colors || gradients[gradientKey].colors.length < 2) {
      return 'primary'; // Fallback to primary which we know is valid
    }
    return gradientKey;
  };

  const gradientKey = getCategoryGradient(category);
  const gradient = gradients[gradientKey];
  
  // Ensure we have valid gradient data
  const colors = (gradient && gradient.colors && gradient.colors.length >= 2) 
    ? gradient.colors 
    : ['#6366F1', '#8B5CF6']; // Fallback colors
  const start = gradient?.start || { x: 0, y: 0 };
  const end = gradient?.end || { x: 1, y: 1 };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <LinearGradient
        colors={colors}
        start={start}
        end={end}
        style={styles.categoryChip}
      >
        <Text style={styles.categoryText}>{category}</Text>
      </LinearGradient>
    </Animated.View>
  );
};

interface AnimatedStarProps {
  filled: boolean;
  delay: number;
}

const AnimatedStar: React.FC<AnimatedStarProps> = ({ filled, delay }) => {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (filled) {
      Animated.timing(fillAnim, {
        toValue: 1,
        duration: 300,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [filled, delay]);

  return (
    <View style={styles.starContainer}>
      <MaterialCommunityIcons
        name="star-outline"
        size={20}
        color="#FFD700"
        style={StyleSheet.absoluteFillObject}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            opacity: fillAnim,
            transform: [{ scale: fillAnim }],
          },
        ]}
      >
        <MaterialCommunityIcons
          name="star"
          size={20}
          color="#FFD700"
        />
      </Animated.View>
    </View>
  );
};

export const FeaturedAutomationWidgetEnhanced: React.FC = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { data: featured, isLoading, error } = useGetFeaturedAutomationQuery();
  const containerScale = useRef(new Animated.Value(0.95)).current;
  const parallaxValue = useRef(new Animated.Value(0)).current;
  const ctaGlow = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    // Container entrance
    Animated.spring(containerScale, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // CTA button glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(ctaGlow, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ctaGlow, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect for loading
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleScroll = (event: any) => {
    const offset = event.nativeEvent.contentOffset.y;
    setScrollOffset(offset);
    parallaxValue.setValue(offset * 0.5);
  };

  const handleTryNow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (featured?.id) {
      navigation.navigate('AutomationDetails' as never, { automationId: featured.id } as never);
    } else {
      EventLogger.error('Automation', 'Missing automation ID for featured automation navigation');
    }
  };

  if (isLoading) {
    return (
      <LinearGradient
        colors={subtleGradients.lightPurple.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [
                  {
                    translateX: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-screenWidth, screenWidth],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <EnhancedLoadingSkeleton 
            variant="card" 
            count={1} 
            showAnimation={true}
          />
        </View>
      </LinearGradient>
    );
  }

  if (error || !featured) {
    return (
      <View style={[styles.container, styles.errorContainer, { backgroundColor: theme.colors?.surface || '#fff' }]}>
        <MaterialCommunityIcons 
          name="robot-confused" 
          size={48} 
          color={theme.colors?.textSecondary || '#999'} 
        />
        <Text style={[styles.errorText, { color: theme.colors?.textSecondary || '#666' }]}>
          No featured automation available
        </Text>
      </View>
    );
  }

  const rating = featured.rating || 4.5;
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  return (
    <Animated.View style={{ transform: [{ scale: containerScale }] }}>
      <View style={styles.heroContainer}>
        {/* Hero Image with Parallax */}
        <Animated.View
          style={[
            styles.heroImageContainer,
            {
              transform: [
                {
                  translateY: parallaxValue,
                },
              ],
            },
          ]}
        >
          <ImageBackground
            source={{ uri: featured.imageUrl || 'https://picsum.photos/400/300' }}
            style={styles.heroImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
              style={styles.imageOverlay}
            />
          </ImageBackground>
        </Animated.View>

        {/* Content */}
        <View style={styles.contentContainer}>
          {/* Categories */}
          <View style={styles.categoriesRow}>
            {featured.categories?.slice(0, 3).map((category, index) => (
              <CategoryChip 
                key={category} 
                category={category} 
                delay={index * 100}
              />
            ))}
            <View style={styles.featuredBadge}>
              <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
              <Text style={styles.featuredText}>FEATURED</Text>
            </View>
          </View>

          {/* Title and Description */}
          <Text style={styles.heroTitle}>{featured.name}</Text>
          <Text style={styles.heroDescription}>
            {featured.description || ''}
          </Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {/* Rating */}
            <View style={styles.ratingContainer}>
              <View style={styles.stars}>
                {[...Array(5)].map((_, index) => (
                  <AnimatedStar
                    key={index}
                    filled={index < fullStars || (index === fullStars && hasHalfStar)}
                    delay={index * 100}
                  />
                ))}
              </View>
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>

            {/* Uses count */}
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-multiple" size={16} color="#FFFFFF" />
              <Text style={styles.statText}>{featured.uses || '1.2k'} uses</Text>
            </View>

            {/* Author */}
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account" size={16} color="#FFFFFF" />
              <Text style={styles.statText}>by {featured.author || 'ZapTap'}</Text>
            </View>
          </View>

          {/* CTA Button with Glow */}
          <TouchableOpacity onPress={handleTryNow} activeOpacity={0.9}>
            <View style={styles.ctaContainer}>
              <Animated.View
                style={[
                  styles.ctaGlow,
                  {
                    opacity: ctaGlow.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 0.8],
                    }),
                    transform: [
                      {
                        scale: ctaGlow.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.1],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <LinearGradient
                colors={gradients.premium.colors}
                start={gradients.premium.start}
                end={gradients.premium.end}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaText}>Try Now</Text>
                <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
              </LinearGradient>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  heroImageContainer: {
    height: 200,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  loadingContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  container: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    ...typography.titleMedium,
    marginTop: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  featuredText: {
    ...typography.labelSmall,
    color: '#FFD700',
    fontWeight: fontWeights.bold,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...typography.heroMedium,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    marginBottom: 8,
    ...textShadows.strong,
  },
  heroDescription: {
    ...typography.bodyLarge,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  starContainer: {
    width: 20,
    height: 20,
    marginRight: 2,
  },
  ratingText: {
    ...typography.labelMedium,
    color: '#FFD700',
    fontWeight: fontWeights.bold,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    ...typography.labelSmall,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  ctaContainer: {
    position: 'relative',
    alignItems: 'center',
    alignSelf: 'center', // Center the container
    width: 180, // Fixed width to constrain the glow effect
  },
  ctaGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    backgroundColor: '#EC4899',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
    }),
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 160, // Ensure button has consistent size
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  ctaText: {
    ...typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    marginRight: 8,
    letterSpacing: 0.5,
    ...textShadows.medium,
  },
});

export default FeaturedAutomationWidgetEnhanced;