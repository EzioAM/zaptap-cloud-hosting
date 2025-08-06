import React, { useRef, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { gradients } from '../../theme/gradients';
import { typography, fontWeights } from '../../theme/typography';
import { ANIMATION_CONFIG } from '../../constants/animations';
import * as Haptics from 'expo-haptics';

interface GradientCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  gradientKey?: keyof typeof gradients;
  onPress?: () => void;
  delay?: number;
  showArrow?: boolean;
  badge?: string;
  badgeColor?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  elevated?: boolean;
  glass?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GradientCard: React.FC<GradientCardProps> = memo(({
  title,
  subtitle,
  description,
  icon,
  gradientKey = 'primary',
  onPress,
  delay = 0,
  showArrow = false,
  badge,
  badgeColor,
  style,
  contentStyle,
  elevated = true,
  glass = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: ANIMATION_CONFIG.GENTLE_SPRING_TENSION,
        friction: ANIMATION_CONFIG.GENTLE_SPRING_FRICTION,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = useCallback(() => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Animated.parallel([
        Animated.spring(pressAnim, {
          toValue: ANIMATION_CONFIG.MICRO_INTERACTION_SCALE,
          tension: ANIMATION_CONFIG.SPRING_TENSION,
          friction: ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        }),
        Animated.timing(shadowAnim, {
          toValue: 0.5,
          duration: ANIMATION_CONFIG.MICRO_INTERACTION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [onPress, pressAnim, shadowAnim]);

  const handlePressOut = useCallback(() => {
    if (onPress) {
      Animated.parallel([
        Animated.spring(pressAnim, {
          toValue: 1,
          tension: ANIMATION_CONFIG.SPRING_TENSION,
          friction: ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        }),
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.MICRO_INTERACTION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [onPress, pressAnim, shadowAnim]);

  const gradient = gradients[gradientKey] || gradients.primary; // Fallback to primary gradient

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={[
        styles.container,
        elevated && styles.elevated,
        glass && styles.glass,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { scale: pressAnim },
          ],
        },
        style,
      ]}
    >
      {/* Gradient accent bar */}
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        style={styles.accentBar}
      />

      <View style={[styles.content, contentStyle]}>
        <View style={styles.header}>
          {icon && (
            <LinearGradient
              colors={gradient.colors}
              start={gradient.start}
              end={gradient.end}
              style={styles.iconContainer}
            >
              <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color="#FFFFFF"
              />
            </LinearGradient>
          )}

          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {badge && (
                <View style={[
                  styles.badge,
                  badgeColor && { backgroundColor: badgeColor },
                ]}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </View>
            
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          {showArrow && (
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#999"
              style={styles.arrow}
            />
          )}
        </View>

        {description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>

      {/* Shadow layers for depth */}
      {elevated && (
        <>
          <Animated.View 
            style={[
              styles.shadowLayer1,
              {
                opacity: shadowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [0.1, 0.2],
                }),
              },
            ]} 
          />
          <Animated.View 
            style={[
              styles.shadowLayer2,
              {
                opacity: shadowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [0.05, 0.1],
                }),
              },
            ]} 
          />
        </>
      )}
    </AnimatedPressable>
  );
});

export const GradientCardSkeleton: React.FC = memo(() => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  return (
    <View style={[styles.container, styles.skeleton]}>
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [
              {
                translateX: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200, 400],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
      
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonText}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  glass: {
    backgroundColor: Platform.select({
      ios: 'rgba(255, 255, 255, 0.8)',
      android: 'rgba(255, 255, 255, 0.95)',
    }),
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    ...typography.titleMedium,
    fontWeight: fontWeights.semibold,
    color: '#1A1A1A',
    flex: 1,
  },
  subtitle: {
    ...typography.bodySmall,
    color: '#666666',
    marginTop: 2,
  },
  description: {
    ...typography.bodyMedium,
    color: '#666666',
    marginTop: 12,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    marginLeft: 8,
  },
  badgeText: {
    ...typography.labelSmall,
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
    fontSize: 10,
  },
  arrow: {
    marginLeft: 8,
  },
  shadowLayer1: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: -4,
    backgroundColor: '#000',
    borderRadius: 16,
    zIndex: -1,
  },
  shadowLayer2: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: -8,
    backgroundColor: '#000',
    borderRadius: 16,
    zIndex: -2,
  },
  // Skeleton styles
  skeleton: {
    backgroundColor: '#F0F0F0',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  skeletonContent: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 20,
  },
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  skeletonText: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  skeletonSubtitle: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '50%',
  },
});

export default GradientCard;