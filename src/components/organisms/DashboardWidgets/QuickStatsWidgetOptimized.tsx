import React, { useEffect, useRef, memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  InteractionManager,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { useGetTodayStatsQuery } from '../../../store/api/dashboardApi';
import EnhancedLoadingSkeleton from '../../common/EnhancedLoadingSkeleton';
import { Card } from '../../atoms';
import { Shimmer } from '../../atoms';
import { EventLogger } from '../../../utils/EventLogger';
import {
  useOptimizedAnimatedValue,
  useSpringAnimation,
  useDelayedAnimation,
  useBatchAnimations,
  useReducedMotion,
  useFPSMonitor,
  PresetAnimations,
  animationController,
  PlatformOptimizer,
  DURATIONS,
  SPRING_CONFIGS,
} from '../../../utils/animations';

interface StatItemProps {
  icon: string;
  value: string | number;
  label: string;
  color: string;
  gradientColors?: string[];
  delay?: number;
  showProgressRing?: boolean;
}

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  color: string;
}

interface ProgressRingProps {
  progress: number;
  color: string;
  size?: number;
}

// Gradients definition
const defaultGradients = {
  primary: {
    colors: ['#6366F1', '#8B5CF6', '#EC4899'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  success: {
    colors: ['#10B981', '#34D399', '#6EE7B7'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  warning: {
    colors: ['#F59E0B', '#FBBF24', '#FCD34D'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  ocean: {
    colors: ['#0EA5E9', '#38BDF8', '#7DD3FC'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  cosmic: {
    colors: ['#7C3AED', '#A855F7', '#C084FC'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  subtle: {
    colors: ['#f8f9fa', '#e9ecef', '#dee2e6'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};

// Optimized Animated Counter Component
const AnimatedCounter: React.FC<AnimatedCounterProps> = memo(({ value, suffix = '', color }) => {
  const reducedMotion = useReducedMotion();
  const animatedValue = useOptimizedAnimatedValue(0, `counter_${value}`);
  const [displayValue, setDisplayValue] = React.useState(0);
  const listenerRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip animation if reduced motion is enabled
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    // Clean up previous listener
    if (listenerRef.current) {
      animatedValue.removeListener(listenerRef.current);
    }

    // Add optimized listener
    listenerRef.current = animatedValue.addListener(({ value }) => {
      // Throttle updates to reduce re-renders
      requestAnimationFrame(() => {
        setDisplayValue(Math.round(value));
      });
    });

    // Use optimized timing animation
    animationController.createTiming(animatedValue, value, {
      duration: DURATIONS.SLOW * 1.5,
      useNativeDriver: false, // Can't use native driver for value updates
    }).start();

    return () => {
      if (listenerRef.current) {
        animatedValue.removeListener(listenerRef.current);
      }
    };
  }, [value, reducedMotion]);

  return (
    <Text style={[styles.statValue, { color }]}>
      {displayValue}{suffix}
    </Text>
  );
});

// Optimized Progress Ring Component
const ProgressRing: React.FC<ProgressRingProps> = memo(({ progress, color, size = 60 }) => {
  const reducedMotion = useReducedMotion();
  const animatedProgress = useOptimizedAnimatedValue(0, `progress_${progress}`);
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const [strokeDashoffset, setStrokeDashoffset] = React.useState(circumference);

  useEffect(() => {
    if (reducedMotion) {
      setStrokeDashoffset(circumference - (progress / 100) * circumference);
      return;
    }

    const listener = animatedProgress.addListener(({ value }) => {
      const offset = circumference - (value / 100) * circumference;
      setStrokeDashoffset(offset);
    });

    // Use spring animation for smoother progress
    animationController.createSpring(animatedProgress, progress, SPRING_CONFIGS.GENTLE).start();

    return () => {
      animatedProgress.removeListener(listener);
    };
  }, [progress, circumference, reducedMotion]);

  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Circle
        stroke={color}
        strokeOpacity={0.2}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <Circle
        stroke={color}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90, ${size / 2}, ${size / 2})`}
      />
    </Svg>
  );
});

// Optimized Stat Item Component
const StatItem: React.FC<StatItemProps> = memo(({ 
  icon, 
  value, 
  label, 
  color, 
  gradientColors,
  delay = 0,
  showProgressRing = false 
}) => {
  const theme = useSafeTheme();
  const { value: scale, animate: animateScale } = useSpringAnimation(0.8);
  const opacity = useOptimizedAnimatedValue(0);
  const translateY = useOptimizedAnimatedValue(20);
  const { batchAnimations } = useBatchAnimations();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    // Batch entrance animations for better performance
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        PresetAnimations.fadeInUp(opacity, translateY, {
          duration: DURATIONS.NORMAL,
          delay: 0,
        }).start();
        animateScale(1);
      }, delay);
    });
  }, [delay, reducedMotion]);

  const optimizedStyle = useMemo(() => 
    PlatformOptimizer.optimizeStyle({
      transform: [{ scale }, { translateY }],
      opacity,
    }), []);

  const gradient = gradientColors || defaultGradients.subtle.colors;

  return (
    <Animated.View style={[styles.statItem, optimizedStyle]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statGradient}
      >
        <View style={styles.statContent}>
          <View style={styles.iconContainer}>
            {showProgressRing && (
              <ProgressRing 
                progress={typeof value === 'number' ? Math.min(value, 100) : 50} 
                color={color} 
              />
            )}
            <MaterialCommunityIcons 
              name={icon as any} 
              size={24} 
              color={color} 
              style={showProgressRing ? styles.iconWithRing : undefined}
            />
          </View>
          {typeof value === 'number' ? (
            <AnimatedCounter value={value} color={theme.colors.text} />
          ) : (
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
          )}
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// Main Optimized Widget Component
const QuickStatsWidgetOptimized: React.FC = memo(() => {
  const theme = useSafeTheme();
  const { data, isLoading, error } = useGetTodayStatsQuery(undefined, {
    pollingInterval: 60000, // Poll every minute
  });
  const { isLowFPS, currentFPS } = useFPSMonitor();
  const reducedMotion = useReducedMotion();

  // Adjust animation quality based on FPS
  useEffect(() => {
    if (isLowFPS && __DEV__) {
      EventLogger.warn('UI', 'Low FPS detected: ${currentFPS}fps');
    }
  }, [isLowFPS, currentFPS]);

  const stats = useMemo(() => [
    {
      icon: 'robot',
      value: data?.activeAutomations || 0,
      label: 'Active',
      color: theme.colors.primary,
      gradientColors: defaultGradients.primary.colors,
      delay: reducedMotion ? 0 : 100,
      showProgressRing: true,
    },
    {
      icon: 'play-circle',
      value: data?.todayExecutions || 0,
      label: 'Today',
      color: '#10B981',
      gradientColors: defaultGradients.success.colors,
      delay: reducedMotion ? 0 : 200,
    },
    {
      icon: 'trending-up',
      value: data?.weeklyGrowth ? `+${data.weeklyGrowth}%` : '0%',
      label: 'Growth',
      color: '#F59E0B',
      gradientColors: defaultGradients.warning.colors,
      delay: reducedMotion ? 0 : 300,
    },
    {
      icon: 'star',
      value: data?.averageRating?.toFixed(1) || '0.0',
      label: 'Rating',
      color: '#EC4899',
      gradientColors: defaultGradients.cosmic.colors,
      delay: reducedMotion ? 0 : 400,
    },
  ], [data, theme.colors.primary, reducedMotion]);

  if (isLoading) {
    return (
      <Card style={styles.container}>
        <EnhancedLoadingSkeleton type="stats" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={24} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
            Unable to load stats
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={[styles.container, PlatformOptimizer.optimizeStyle({})]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="chart-line" size={20} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Quick Stats</Text>
      </View>
      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <StatItem key={`stat-${index}`} {...stat} />
        ))}
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statItem: {
    width: '50%',
    padding: 6,
  },
  statGradient: {
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
  },
  statContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconWithRing: {
    position: 'absolute',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
  },
});

export default QuickStatsWidgetOptimized;