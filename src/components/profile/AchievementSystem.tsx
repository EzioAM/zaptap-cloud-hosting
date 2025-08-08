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
import { PressableAnimated, StaggeredContainer } from '../automation/AnimationHelpers';
import { ANIMATION_CONFIG } from '../../constants/animations';

const { width: screenWidth } = Dimensions.get('window');

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
}

interface AchievementSystemProps {
  achievements: Achievement[];
  onAchievementPress?: (achievement: Achievement) => void;
  showConfetti?: (achievement: Achievement) => void;
}

const RARITY_COLORS = {
  common: '#9E9E9E',
  rare: '#2196F3',
  epic: '#9C27B0',
  legendary: '#FF6B00',
};

const RARITY_GRADIENTS = {
  common: ['#9E9E9E', '#757575'],
  rare: ['#2196F3', '#1976D2'],
  epic: ['#9C27B0', '#7B1FA2'],
  legendary: ['#FF6B00', '#E65100'],
};

const getSafeGradientColors = (rarity: string, unlocked: boolean): string[] => {
  if (!unlocked) {
    return ['#424242', '#303030'];
  }
  return RARITY_GRADIENTS[rarity as keyof typeof RARITY_GRADIENTS] || RARITY_GRADIENTS.common;
};

const AnimatedAchievement: React.FC<{
  achievement: Achievement;
  index: number;
  onPress?: () => void;
  showConfetti?: () => void;
}> = ({ achievement, index, onPress, showConfetti }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  
  const [displayProgress, setDisplayProgress] = useState(0);
  const [wasUnlocked, setWasUnlocked] = useState(achievement.unlocked);

  useEffect(() => {
    // Entry animation
    const delay = index * 100;
    
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
      ]).start();
    }, delay);

    // Progress animation
    Animated.timing(progressAnim, {
      toValue: achievement.progress,
      duration: 1000,
      delay: delay + 200,
      useNativeDriver: false,
    }).start();

    // Counter animation
    const steps = 30;
    const increment = achievement.progress / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setDisplayProgress(Math.min(Math.floor(increment * currentStep), achievement.progress));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayProgress(achievement.progress);
      }
    }, 1000 / steps);

    return () => clearInterval(timer);
  }, [achievement.progress, index]);

  // Unlock animation
  useEffect(() => {
    if (achievement.unlocked && !wasUnlocked) {
      setWasUnlocked(true);
      showConfetti?.();
      
      // Celebration animation
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1.1,
          tension: 150,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          tension: 150,
          friction: 5,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-fade glow
      setTimeout(() => {
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      }, 2000);
    }
  }, [achievement.unlocked, wasUnlocked]);

  const progressPercentage = (achievement.progress / achievement.maxProgress) * 100;
  const isComplete = achievement.progress >= achievement.maxProgress;

  return (
    <PressableAnimated onPress={onPress} style={styles.achievementContainer}>
      <Animated.View
        style={[
          styles.achievement,
          {
            opacity: fadeAnim,
            transform: [
              { translateX: slideAnim },
              { scale: scaleAnim },
              { scale: bounceAnim },
            ],
          },
        ]}
      >
        {/* Glow effect for newly unlocked */}
        <Animated.View
          style={[
            styles.achievementGlow,
            {
              opacity: glowAnim,
              shadowColor: RARITY_COLORS[achievement.rarity],
            },
          ]}
        />
        
        <LinearGradient
          colors={getSafeGradientColors(achievement.rarity, achievement.unlocked)}
          style={[styles.achievementGradient, !achievement.unlocked && styles.lockedAchievement]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.achievementContent}>
            {/* Icon */}
            <View style={[
              styles.achievementIcon,
              { backgroundColor: achievement.unlocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)' }
            ]}>
              <MaterialCommunityIcons
                name={achievement.unlocked ? achievement.icon as any : 'lock'}
                size={32}
                color={achievement.unlocked ? 'white' : '#666'}
              />
            </View>

            {/* Content */}
            <View style={styles.achievementText}>
              <Text style={[
                styles.achievementTitle,
                { color: achievement.unlocked ? 'white' : '#666' }
              ]}>
                {achievement.title}
              </Text>
              <Text style={[
                styles.achievementDescription,
                { color: achievement.unlocked ? 'rgba(255,255,255,0.8)' : '#555' }
              ]}>
                {achievement.description}
              </Text>
              
              {/* Progress */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: achievement.unlocked ? 'white' : '#666',
                          width: progressAnim.interpolate({
                            inputRange: [0, achievement.maxProgress],
                            outputRange: ['0%', '100%'],
                            extrapolate: 'clamp',
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[
                    styles.progressText,
                    { color: achievement.unlocked ? 'white' : '#666' }
                  ]}>
                    {displayProgress}/{achievement.maxProgress}
                  </Text>
                </View>
              </View>
            </View>

            {/* Rarity badge */}
            <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[achievement.rarity] }]}>
              <Text style={styles.rarityText}>
                {achievement.rarity.toUpperCase()}
              </Text>
            </View>

            {/* Points */}
            <View style={styles.pointsBadge}>
              <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
              <Text style={styles.pointsText}>{achievement.points}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    </PressableAnimated>
  );
};

const AchievementHeader: React.FC<{
  totalPoints: number;
  unlockedCount: number;
  totalCount: number;
}> = ({ totalPoints, unlockedCount, totalCount }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [displayPoints, setDisplayPoints] = useState(0);

  useEffect(() => {
    // Points counter animation
    Animated.timing(progressAnim, {
      toValue: totalPoints,
      duration: 1500,
      useNativeDriver: false,
    }).start();

    // Counter animation
    const steps = 30;
    const increment = totalPoints / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setDisplayPoints(Math.min(Math.floor(increment * currentStep), totalPoints));
      
      if (currentStep >= steps) {
        clearInterval(timer);
        setDisplayPoints(totalPoints);
      }
    }, 1500 / steps);

    return () => clearInterval(timer);
  }, [totalPoints]);

  return (
    <View style={styles.achievementHeader}>
      <LinearGradient
        colors={['#FF6B00', '#E65100']}
        style={styles.achievementHeaderGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.achievementHeaderContent}>
          <View style={styles.achievementStats}>
            <Text style={styles.achievementPointsLabel}>Achievement Points</Text>
            <Text style={styles.achievementPoints}>{displayPoints.toLocaleString()}</Text>
          </View>
          <View style={styles.achievementProgress}>
            <Text style={styles.achievementProgressLabel}>Unlocked</Text>
            <Text style={styles.achievementProgressText}>
              {unlockedCount}/{totalCount}
            </Text>
            <View style={styles.overallProgressBar}>
              <View style={styles.overallProgressTrack}>
                <Animated.View
                  style={[
                    styles.overallProgressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, totalPoints],
                        outputRange: ['0%', `${(unlockedCount / totalCount) * 100}%`],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export const AchievementSystem: React.FC<AchievementSystemProps> = ({
  achievements = [],
  onAchievementPress,
  showConfetti,
}) => {
  // Ensure achievements is always an array
  const safeAchievements = achievements || [];
  const totalPoints = safeAchievements.reduce((sum, a) => sum + (a.unlocked ? a.points : 0), 0);
  const unlockedCount = safeAchievements.filter(a => a.unlocked).length;

  if (safeAchievements.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="trophy-outline" size={48} color="#999" />
          <Text style={styles.emptyText}>No achievements yet</Text>
          <Text style={styles.emptySubtext}>Complete automations to unlock achievements!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AchievementHeader
        totalPoints={totalPoints}
        unlockedCount={unlockedCount}
        totalCount={safeAchievements.length}
      />
      <View style={styles.achievementsList}>
        {safeAchievements.map((achievement, index) => (
          <AnimatedAchievement
            key={achievement.id}
            achievement={achievement}
            index={index}
            onPress={() => onAchievementPress?.(achievement)}
            showConfetti={() => showConfetti?.(achievement)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  achievementHeader: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  achievementHeaderGradient: {
    padding: 20,
  },
  achievementHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementStats: {
    flex: 1,
  },
  achievementPointsLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  achievementPoints: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  achievementProgress: {
    alignItems: 'flex-end',
  },
  achievementProgressLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
  },
  achievementProgressText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  overallProgressBar: {
    width: 100,
  },
  overallProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  achievementsList: {
    paddingHorizontal: 20,
  },
  achievementContainer: {
    marginBottom: 12,
  },
  achievement: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  achievementGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  achievementGradient: {
    padding: 16,
  },
  lockedAchievement: {
    opacity: 0.6,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  achievementIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  rarityBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rarityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pointsBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});