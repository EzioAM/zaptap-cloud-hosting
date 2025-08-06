import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PressableAnimated } from '../automation/AnimationHelpers';
import { ANIMATION_CONFIG } from '../../constants/animations';

const { width: screenWidth } = Dimensions.get('window');

interface StatData {
  icon: string;
  label: string;
  value: number;
  color: string;
  percentage?: number;
  trend?: 'up' | 'down' | 'stable';
  subValue?: string;
}

interface AnimatedStatsGridProps {
  stats: StatData[];
  onStatPress?: (stat: StatData, index: number) => void;
}

const AnimatedStatCard: React.FC<{
  stat: StatData;
  index: number;
  onPress?: () => void;
}> = ({ stat, index, onPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // Staggered entry animation
    const delay = index * ANIMATION_CONFIG.STAGGERED_ENTRY_DELAY;
    
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: ANIMATION_CONFIG.SPRING_TENSION,
          friction: ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: stat.percentage || 0,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION * 1.5,
          delay: 200,
          useNativeDriver: false,
        }),
      ]).start();

      // Counter animation
      const duration = ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION;
      const steps = 30;
      const increment = stat.value / steps;
      let currentStep = 0;

      const timer = setInterval(() => {
        currentStep++;
        setDisplayValue(Math.min(Math.floor(increment * currentStep), stat.value));
        
        if (currentStep >= steps) {
          clearInterval(timer);
          setDisplayValue(stat.value);
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, delay);
  }, [stat.value, stat.percentage, index]);

  const progressValue = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
  });

  return (
    <PressableAnimated
      onPress={onPress}
      style={styles.statCardContainer}
      hapticType="light"
    >
      <Animated.View
        style={[
          styles.statCard,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={[`${stat.color}15`, `${stat.color}05`]}
          style={styles.statCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statCardContent}>
            {/* Icon with circular progress */}
            <View style={styles.statIconContainer}>
              {stat.percentage !== undefined && (
                <Animated.View style={styles.progressRing}>
                  <Animated.View
                    style={[
                      styles.progressRingFill,
                      {
                        borderColor: stat.color,
                        transform: [
                          {
                            rotate: progressValue.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg'],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                </Animated.View>
              )}
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                <MaterialCommunityIcons 
                  name={stat.icon as any} 
                  size={28} 
                  color={stat.color} 
                />
              </View>
            </View>

            {/* Value with counter animation */}
            <View style={styles.statValueContainer}>
              <Text style={[styles.statValue, { color: stat.color }]}>
                {displayValue.toLocaleString()}
              </Text>
              {stat.subValue && (
                <Text style={styles.statSubValue}>
                  {stat.subValue}
                </Text>
              )}
            </View>

            {/* Trend indicator */}
            {stat.trend && (
              <View style={styles.trendContainer}>
                <MaterialCommunityIcons
                  name={
                    stat.trend === 'up' ? 'trending-up' :
                    stat.trend === 'down' ? 'trending-down' : 'trending-neutral'
                  }
                  size={16}
                  color={
                    stat.trend === 'up' ? '#4CAF50' :
                    stat.trend === 'down' ? '#F44336' : '#9E9E9E'
                  }
                />
              </View>
            )}

            {/* Label */}
            <Text style={styles.statLabel} numberOfLines={2}>
              {stat.label}
            </Text>

            {/* Progress bar for percentage */}
            {stat.percentage !== undefined && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarTrack, { backgroundColor: `${stat.color}20` }]}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        backgroundColor: stat.color,
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <Animated.Text style={[styles.percentageText, { color: stat.color }]}>
                  {progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: [0, stat.percentage],
                  }).interpolate({
                    inputRange: [0, stat.percentage],
                    outputRange: ['0%', `${Math.round(stat.percentage)}%`],
                  })}
                </Animated.Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </PressableAnimated>
  );
};

export const AnimatedStatsGrid: React.FC<AnimatedStatsGridProps> = ({
  stats,
  onStatPress,
}) => {
  return (
    <View style={styles.statsGrid}>
      {stats.map((stat, index) => (
        <AnimatedStatCard
          key={`${stat.label}-${index}`}
          stat={stat}
          index={index}
          onPress={() => onStatPress?.(stat, index)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    marginTop: -20,
  },
  statCardContainer: {
    width: screenWidth > 400 ? '47%' : '100%',
    margin: '1.5%',
  },
  statCard: {
    borderRadius: 16,
    overflow: 'hidden',
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
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  statCardGradient: {
    padding: 20,
  },
  statCardContent: {
    alignItems: 'center',
    minHeight: 140,
  },
  statIconContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  progressRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    top: -6,
    left: -6,
  },
  progressRingFill: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#4CAF50',
    borderRightColor: '#4CAF50',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValueContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statSubValue: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  trendContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
  },
});