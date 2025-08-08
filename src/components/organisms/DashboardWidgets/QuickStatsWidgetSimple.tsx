import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { useGetTodayStatsQuery } from '../../../store/api/dashboardApi';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Safe imports with fallbacks
let gradients: any = {};
let subtleGradients: any = {};

try {
  const gradientsModule = require('../../../theme/gradients');
  gradients = gradientsModule.gradients || {};
  subtleGradients = gradientsModule.subtleGradients || {
    lightGray: {
      colors: ['#f8f9fa', '#e9ecef', '#dee2e6'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    }
  };
} catch (error) {
  console.warn('Gradients theme not found, using defaults');
  gradients = {
    primary: { colors: ['#6366F1', '#8B5CF6'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    success: { colors: ['#10B981', '#34D399'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    warning: { colors: ['#F59E0B', '#FBBF24'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    ocean: { colors: ['#0EA5E9', '#38BDF8'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
    cosmic: { colors: ['#7C3AED', '#A855F7'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  };
  subtleGradients = {
    lightGray: {
      colors: ['#f8f9fa', '#e9ecef', '#dee2e6'],
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
    }
  };
}

const { width: screenWidth } = Dimensions.get('window');

interface StatCardProps {
  icon: string;
  value: number | string;
  label: string;
  color: string;
  gradientKey: keyof typeof gradients;
  delay?: number;
  isPercentage?: boolean;
  onPress?: () => void;
}

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  style?: any;
}

// Simple Animated Counter with number animation
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  value, 
  duration = 1500, 
  suffix = '', 
  style 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }

    const startValue = displayValue;
    const startTime = Date.now();
    
    const updateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Simple easing
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.round(startValue + (value - startValue) * easeOut);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = setTimeout(updateValue, 16);
      }
    };
    
    updateValue();

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <Text style={style}>
      {displayValue}{suffix}
    </Text>
  );
};

// Simple Stat Card with minimal animations
const StatCardSimple: React.FC<StatCardProps> = ({ 
  icon, 
  value, 
  label, 
  color, 
  gradientKey, 
  delay = 0, 
  isPercentage = false,
  onPress
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    // Simple entry animation
    const timer = setTimeout(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: false, // Safer for transform
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const handlePressIn = useCallback(() => {
    setPressed(true);
    // Add haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available
    }
  }, []);

  const handlePressOut = useCallback(() => {
    setPressed(false);
  }, []);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else {
      Alert.alert(
        `${label} Details`,
        `Current ${label.toLowerCase()}: ${value}${isPercentage ? '%' : ''}\n\nThis stat updates in real-time based on your automation activity.`,
        [{ text: 'OK' }]
      );
    }
  }, [label, value, isPercentage, onPress]);

  const gradient = gradients[gradientKey] || gradients.primary;
  const cardScale = pressed ? 0.95 : 1;

  return (
    <Animated.View
      style={[
        styles.statCardContainer,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.pressableCard,
          {
            transform: [{ scale: cardScale }],
          },
        ]}
      >
        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={styles.gradientCard}
        >
          <View style={styles.cardContent}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={icon as any} 
                size={28} 
                color="#FFFFFF"
                style={styles.cardIcon}
              />
            </View>

            {/* Animated value */}
            <View style={styles.valueContainer}>
              {typeof value === 'number' ? (
                <AnimatedCounter
                  value={value}
                  suffix={isPercentage ? '%' : ''}
                  style={styles.statValue}
                />
              ) : (
                <Text style={styles.statValue}>{value}</Text>
              )}
            </View>

            {/* Label */}
            <Text style={styles.statLabel}>{label}</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

// Main Simple Widget Component
interface QuickStatsWidgetSimpleProps {
  theme?: any;
}

export const QuickStatsWidgetSimple: React.FC<QuickStatsWidgetSimpleProps> = ({ theme: propTheme }) => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { data: stats, isLoading, error, refetch } = useGetTodayStatsQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds for real-time updates
  });

  const handleRefresh = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics not available
    }
    
    try {
      await refetch();
      // Show success feedback
      Alert.alert(
        'Stats Refreshed',
        'Your statistics have been updated with the latest data.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      // Show error feedback
      Alert.alert(
        'Refresh Failed', 
        'Unable to refresh statistics. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    }
  }, [refetch]);

  const statCards = useMemo(() => [
    {
      icon: 'play-circle',
      value: stats?.totalExecutions || 0,
      label: 'Runs Today',
      color: '#2196F3',
      gradientKey: 'ocean' as keyof typeof gradients,
      delay: 0,
      onPress: () => {
        Alert.alert(
          '📊 Today\'s Executions',
          `You've run ${stats?.totalExecutions || 0} automations today!\n\n` +
          `Success rate: ${stats?.successRate || 0}%\n` +
          `Average execution time: ${stats?.averageTime || 0}ms\n\n` +
          `Keep up the great work automating your tasks! 🚀`,
          [
            { text: 'View Library', onPress: () => {
              try {
                // @ts-ignore
                navigation.navigate('LibraryTab');
              } catch (e) {
                console.warn('Navigation to LibraryTab failed:', e);
              }
            }},
            { text: 'OK', style: 'default' }
          ]
        );
      },
    },
    {
      icon: 'check-circle',
      value: stats?.successRate || 0,
      label: 'Success Rate',
      color: '#4CAF50',
      gradientKey: 'success' as keyof typeof gradients,
      delay: 100,
      isPercentage: true,
      onPress: () => {
        const successRate = stats?.successRate || 0;
        const totalRuns = stats?.totalExecutions || 0;
        const successfulRuns = Math.round((successRate / 100) * totalRuns);
        const failedRuns = totalRuns - successfulRuns;
        
        Alert.alert(
          '✅ Success Rate Analysis',
          `Your current success rate is ${successRate}%\n\n` +
          `📊 Breakdown:\n` +
          `• Successful runs: ${successfulRuns}\n` +
          `• Failed runs: ${failedRuns}\n` +
          `• Total runs today: ${totalRuns}\n\n` +
          (successRate >= 90 ? '🎉 Excellent performance!' : 
           successRate >= 70 ? '👍 Good job! Room for improvement.' :
           '💡 Check failed automations for issues.'),
          [
            { text: 'View Stats', onPress: () => {
              // Analytics screen doesn't exist, just close the alert
              // In a real app, you might navigate to a stats/analytics section
            }},
            { text: 'OK' }
          ]
        );
      },
    },
    {
      icon: 'timer',
      value: stats?.averageTime || 0,
      label: 'Avg Time (ms)',
      color: '#FF9800',
      gradientKey: 'warning' as keyof typeof gradients,
      delay: 200,
      onPress: () => {
        const avgTime = stats?.averageTime || 0;
        const avgSeconds = (avgTime / 1000).toFixed(2);
        
        Alert.alert(
          '⚡ Performance Metrics',
          `Average execution time: ${avgTime}ms (${avgSeconds}s)\n\n` +
          `📈 Performance Analysis:\n` +
          (avgTime < 500 ? '• Lightning fast! ⚡ Excellent performance\n' :
           avgTime < 1000 ? '• Good speed! Most automations run quickly\n' :
           avgTime < 3000 ? '• Moderate speed. Consider optimizing complex automations\n' :
           '• Slower performance. Review your automations for optimization\n') +
          `\n💡 Tips for faster execution:\n` +
          `• Reduce unnecessary delays\n` +
          `• Optimize webhook calls\n` +
          `• Simplify complex conditions`,
          [{ text: 'Got it!' }]
        );
      },
    },
    {
      icon: 'clock-fast',
      value: stats?.timeSaved || 0,
      label: 'Time Saved (min)',
      color: '#9C27B0',
      gradientKey: 'cosmic' as keyof typeof gradients,
      delay: 300,
      onPress: () => {
        const timeSaved = stats?.timeSaved || 0;
        const hours = Math.floor(timeSaved / 60);
        const minutes = timeSaved % 60;
        const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`;
        
        Alert.alert(
          '⏰ Time Savings Report',
          `You've saved ${timeStr} today with automation!\n\n` +
          `🎯 Impact Analysis:\n` +
          `• ${stats?.totalExecutions || 0} tasks automated\n` +
          `• ${(timeSaved * 5).toFixed(0)} manual clicks saved\n` +
          `• More time for important work\n\n` +
          `📊 This Month: ~${(timeSaved * 30).toFixed(0)} minutes saved\n` +
          `📊 This Year: ~${(timeSaved * 365 / 60).toFixed(0)} hours saved\n\n` +
          `Keep automating to save even more time! 🚀`,
          [
            { text: 'Create New Automation', onPress: () => {
              try {
                // @ts-ignore
                navigation.navigate('BuildTab');
              } catch (e) {}
            }},
            { text: 'Awesome!' }
          ]
        );
      },
    },
  ], [stats, navigation]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={subtleGradients.lightGray.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.loadingContainer}
        >
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading your stats...
          </Text>
          <View style={styles.loadingGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.loadingSkeleton} />
            ))}
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#FEF2F2', '#FEE2E2']}
          style={styles.errorContainer}
        >
          <MaterialCommunityIcons name="alert-circle" size={32} color="#EF4444" />
          <Text style={styles.errorText}>Unable to load stats</Text>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View>
      <LinearGradient
        colors={subtleGradients.lightGray.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        {Platform.OS === 'ios' && (
          <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFillObject} />
        )}
        
        <View style={[styles.content, styles.glassContent]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.overline, { color: theme.colors?.primary || '#6366F1' }]}>
                TODAY'S ACTIVITY
              </Text>
              <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
                Your Statistics
              </Text>
            </View>
            <Pressable onPress={handleRefresh} style={styles.refreshButton}>
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.refreshGradient}
              >
                <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {statCards.map((stat, index) => (
              <StatCardSimple key={`stat-${index}`} {...stat} />
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.statusIndicator}>
              <View style={styles.liveDot} />
              <Text style={[styles.footerText, { color: theme.colors?.textSecondary || '#666' }]}>
                Live data • Updates every 30s
              </Text>
            </View>
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.footerAccent}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  glassContent: {
    backgroundColor: Platform.select({
      ios: 'rgba(255, 255, 255, 0.3)',
      android: 'rgba(255, 255, 255, 0.9)',
      web: 'rgba(255, 255, 255, 0.9)',
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  overline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  refreshButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  refreshGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 20,
  },
  statCardContainer: {
    width: '50%',
    padding: 8,
  },
  pressableCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientCard: {
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  valueContainer: {
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  footer: {
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footerAccent: {
    width: 50,
    height: 3,
    borderRadius: 1.5,
  },
  // Loading states
  loadingContainer: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  loadingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  loadingSkeleton: {
    width: '45%',
    height: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    margin: '2.5%',
  },
  // Error states
  errorContainer: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#7F1D1D',
    marginVertical: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QuickStatsWidgetSimple;
