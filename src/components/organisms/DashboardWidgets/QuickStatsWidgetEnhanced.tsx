import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  Pressable,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle } from 'react-native-svg';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { useGetTodayStatsQuery } from '../../../store/api/dashboardApi';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Safe imports with fallbacks
let gradients: any = {};
let subtleGradients: any = {};
let typography: any = {};
let fontWeights: any = {};
let textShadows: any = {};

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

try {
  const typographyModule = require('../../../theme/typography');
  typography = typographyModule.typography || {};
  fontWeights = typographyModule.fontWeights || {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  textShadows = typographyModule.textShadows || {
    subtle: {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }
  };
} catch (error) {
  console.warn('Typography theme not found, using defaults');
  typography = {
    overline: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
    headlineMedium: { fontSize: 20, fontWeight: '600' },
    labelLarge: { fontSize: 14, fontWeight: '500' },
    caption: { fontSize: 12, fontWeight: '400' },
  };
  fontWeights = {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };
  textShadows = {
    subtle: {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
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
  pulseIntensity?: number;
}

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  style?: any;
}

interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor?: string;
  animated?: boolean;
}

// Enhanced Animated Counter with realistic counting animation
const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  value, 
  duration = 2000, 
  suffix = '', 
  style 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    const startValue = displayValue;
    const startTime = Date.now();
    
    animationRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(startValue + (value - startValue) * easeOutQuart);
      
      setDisplayValue(currentValue);
      
      if (progress >= 1) {
        clearInterval(animationRef.current);
      }
    }, 16); // ~60fps

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [value, duration]);

  return (
    <Text style={style}>
      {displayValue}{suffix}
    </Text>
  );
};

// Enhanced Progress Ring with smooth animation
const ProgressRing: React.FC<ProgressRingProps> = ({ 
  progress, 
  size, 
  strokeWidth, 
  color, 
  backgroundColor = 'rgba(255,255,255,0.3)',
  animated = true 
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (!animated) {
      setAnimatedProgress(progress);
      return;
    }

    if (animationRef.current) {
      clearInterval(animationRef.current);
    }

    const startProgress = animatedProgress;
    const startTime = Date.now();
    const duration = 1500;
    
    animationRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const animProgress = Math.min(elapsed / duration, 1);
      
      // Smooth easing
      const easeOutCubic = 1 - Math.pow(1 - animProgress, 3);
      const currentProgress = startProgress + (progress - startProgress) * easeOutCubic;
      
      setAnimatedProgress(currentProgress);
      
      if (animProgress >= 1) {
        clearInterval(animationRef.current);
      }
    }, 16);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [progress, animated]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Circle
        stroke={backgroundColor}
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
};

// Enhanced 3D Stat Card with floating animations
const StatCard3D: React.FC<StatCardProps> = ({ 
  icon, 
  value, 
  label, 
  color, 
  gradientKey, 
  delay = 0, 
  isPercentage = false,
  onPress,
  pulseIntensity = 1.05
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 20,
      friction: 7,
      delay,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 3000 + Math.random() * 1000, // Randomize for organic feel
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000 + Math.random() * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();

    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: pulseIntensity,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [delay, pulseIntensity]);

  const handlePressIn = useCallback(() => {
    // Haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available
    }

    // Button press animation
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Ripple effect
    rippleAnim.setValue(0);
    rippleOpacity.setValue(1);
    Animated.parallel([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  const handlePress = useCallback(() => {
    console.log(`DEBUG: StatCard3D pressed - ${label}: ${value}`);
    if (onPress) {
      onPress();
    } else {
      // Show detail modal or navigate to stats page
      Alert.alert(
        `${label} Details`,
        `Current ${label.toLowerCase()}: ${value}${isPercentage ? '%' : ''}\n\nThis stat updates in real-time based on your automation activity.`,
        [{ text: 'OK' }]
      );
    }
  }, [label, value, isPercentage, onPress]);

  const gradient = gradients[gradientKey] || gradients.primary;
  const numericValue = typeof value === 'number' ? value : parseInt(value.toString());
  const progressValue = isPercentage ? Math.min(numericValue, 100) : Math.min((numericValue / 100) * 100, 100);

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 3],
  });

  return (
    <Animated.View
      style={[
        styles.statCardContainer,
        {
          transform: [
            { scale: scaleAnim },
            { translateY: floatAnim },
          ],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.statCard3D,
          {
            transform: [{ scale: buttonScale }],
          },
        ]}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.pressableContainer}
        >
        {/* Multiple shadow layers for 3D depth */}
        <Animated.View 
          style={[
            styles.shadowLayer1,
            {
              opacity: shadowAnim,
              transform: [
                { translateY: shadowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [2, 4],
                }) },
              ],
            },
          ]} 
        />
        <Animated.View 
          style={[
            styles.shadowLayer2,
            {
              opacity: shadowAnim.interpolate({
                inputRange: [0.5, 1],
                outputRange: [0.3, 0.6],
              }),
              transform: [
                { translateY: shadowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [4, 8],
                }) },
              ],
            },
          ]} 
        />

        <LinearGradient
          colors={gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={styles.gradientCard}
        >
          {/* Ripple effect */}
          <Animated.View
            style={[
              styles.ripple,
              {
                transform: [{ scale: rippleScale }],
                opacity: rippleOpacity,
              },
            ]}
          />

          <View style={styles.cardContent}>
            {/* Icon with progress ring for percentage values */}
            <View style={styles.iconContainer}>
              {isPercentage && (
                <ProgressRing
                  progress={progressValue}
                  size={56}
                  strokeWidth={4}
                  color="rgba(255,255,255,0.9)"
                  backgroundColor="rgba(255,255,255,0.2)"
                />
              )}
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <MaterialCommunityIcons 
                  name={icon as any} 
                  size={28} 
                  color="#FFFFFF"
                  style={styles.cardIcon}
                />
              </Animated.View>
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
    </Animated.View>
  );
};

// Main Enhanced Widget Component
interface QuickStatsWidgetEnhancedProps {
  theme?: any;
}

export const QuickStatsWidgetEnhanced: React.FC<QuickStatsWidgetEnhancedProps> = ({ theme: propTheme }) => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const containerScale = useRef(new Animated.Value(0.95)).current;
  const { data: stats, isLoading, error, refetch } = useGetTodayStatsQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds for real-time updates
  });

  useEffect(() => {
    Animated.spring(containerScale, {
      toValue: 1,
      tension: 20,
      friction: 7,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, []);

  const handleRefresh = useCallback(async () => {
    console.log('DEBUG: QuickStatsWidget refresh requested');
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Haptics not available
    }
    await refetch();
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
        console.log('DEBUG: Navigate to executions');
        // navigation.navigate('ExecutionsTab' as never);
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
      pulseIntensity: 1.08,
      onPress: () => {
        console.log('DEBUG: Navigate to success analytics');
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
        console.log('DEBUG: Navigate to performance metrics');
      },
    },
    {
      icon: 'clock-fast',
      value: stats?.timeSaved || 0,
      label: 'Time Saved (min)',
      color: '#9C27B0',
      gradientKey: 'cosmic' as keyof typeof gradients,
      delay: 300,
      pulseIntensity: 1.1,
      onPress: () => {
        console.log('DEBUG: Navigate to time savings report');
      },
    },
  ], [stats]);

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

  const containerStyle = Platform.OS === 'web' 
    ? styles.container 
    : [styles.container, { transform: [{ scale: containerScale }] }];

  const WrapperComponent = Platform.OS === 'web' ? View : Animated.View;

  return (
    <WrapperComponent style={Platform.OS === 'web' ? undefined : { transform: [{ scale: containerScale }] }}>
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
          {/* Enhanced Header */}
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
              <StatCard3D key={`stat-${index}`} {...stat} />
            ))}
          </View>

          {/* Enhanced Footer */}
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
    </WrapperComponent>
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
  statCard3D: {
    position: 'relative',
  },
  pressableContainer: {
    flex: 1,
  },
  shadowLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 16,
  },
  shadowLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 16,
  },
  gradientCard: {
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    overflow: 'hidden',
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
  ripple: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    top: '50%',
    left: '50%',
    marginLeft: -30,
    marginTop: -30,
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

export default QuickStatsWidgetEnhanced;
