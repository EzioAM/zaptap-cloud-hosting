import React, { useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  Easing,
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

// Gradients definition (fallback if not available from theme)
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

// Animated Counter Component
const AnimatedCounter: React.FC<AnimatedCounterProps> = memo(({ value, suffix = '', color }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = React.useState(0);

  useEffect(() => {
    const listener = animatedValue.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });

    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value]);

  return (
    <Text style={[styles.statValue, { color }]}>
      {displayValue}{suffix}
    </Text>
  );
});

// Progress Ring Component
const ProgressRing: React.FC<ProgressRingProps> = memo(({ progress, color, size = 48 }) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const circumference = (size - 8) * Math.PI;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // Changed to false for web compatibility
    }).start();
  }, [progress]);

  // For web, use a simpler approach
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.progressRingContainer, { width: size, height: size }]}>
        <View
          style={{
            width: size - 8,
            height: size - 8,
            borderRadius: (size - 8) / 2,
            borderWidth: 4,
            borderColor: color + '20',
            borderTopColor: color,
            position: 'absolute',
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.progressRingContainer, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          stroke={color + '20'}
          strokeWidth={4}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={(size - 8) / 2}
          stroke={color}
          strokeWidth={4}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={animatedProgress.interpolate({
            inputRange: [0, 100],
            outputRange: [circumference, 0],
          })}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
});

// Enhanced Stat Item Component
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
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        delay,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // Continuous pulse animation for the icon (only on native)
    if (Platform.OS !== 'web') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, []);

  const isPercentage = typeof value === 'string' && value.includes('%');
  const numericValue = isPercentage ? parseInt(value.replace('%', '')) : Number(value);
  const textColor = theme.colors?.text || '#000';
  const secondaryTextColor = theme.colors?.textSecondary || '#666';

  const animatedStyle = Platform.OS === 'web' 
    ? styles.statItem 
    : [
        styles.statItem,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ];

  return (
    <Animated.View style={animatedStyle}>
      {gradientColors && gradientColors.length > 1 ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientIconContainer}
        >
          <Animated.View style={{ transform: Platform.OS === 'web' ? [] : [{ scale: pulseAnim }] }}>
            <MaterialCommunityIcons name={icon as any} size={24} color="#FFFFFF" />
          </Animated.View>
        </LinearGradient>
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <Animated.View style={{ transform: Platform.OS === 'web' ? [] : [{ scale: pulseAnim }] }}>
            <MaterialCommunityIcons name={icon as any} size={24} color={color} />
          </Animated.View>
        </View>
      )}
      
      {showProgressRing && isPercentage && Platform.OS !== 'web' && (
        <View style={styles.progressWrapper}>
          <ProgressRing progress={numericValue} color={color} />
          <View style={StyleSheet.absoluteFillObject} justifyContent="center" alignItems="center">
            <Text style={[styles.percentageText, { color: textColor }]}>
              {numericValue}%
            </Text>
          </View>
        </View>
      )}
      
      {!showProgressRing && (
        typeof value === 'number' ? (
          <AnimatedCounter 
            value={value} 
            suffix={label.includes('ms') ? 'ms' : label.includes('s') ? 's' : ''} 
            color={textColor}
          />
        ) : (
          <Text style={[styles.statValue, { color: textColor }]}>
            {value}
          </Text>
        )
      )}
      
      <Text style={[styles.statLabel, { color: secondaryTextColor }]}>
        {label}
      </Text>
    </Animated.View>
  );
});

export const QuickStatsWidget: React.FC = memo(() => {
  const theme = useSafeTheme();
  const { data: stats, isLoading, error } = useGetTodayStatsQuery();
  const containerScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Animated.spring(containerScale, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  const LoadingComponent = () => {
    if (Platform.OS === 'web') {
      return (
        <Card style={styles.container}>
          <View style={styles.header}>
            <Shimmer width={150} height={20} />
            <Shimmer width={20} height={20} borderRadius={10} />
          </View>
          <View style={styles.statsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.statItem}>
                <Shimmer width={56} height={56} borderRadius={16} />
                <Shimmer width={40} height={24} style={{ marginTop: 8 }} />
                <Shimmer width={50} height={16} style={{ marginTop: 4 }} />
              </View>
            ))}
          </View>
        </Card>
      );
    }

    return (
      <LinearGradient
        colors={defaultGradients.subtle.colors}
        start={defaultGradients.subtle.start}
        end={defaultGradients.subtle.end}
        style={styles.gradientContainer}
      >
        <View style={[styles.container, { backgroundColor: 'transparent' }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
              Recent Activity
            </Text>
            <MaterialCommunityIcons 
              name="chart-line" 
              size={20} 
              color={theme.colors?.primary || '#6366F1'} 
            />
          </View>
          <EnhancedLoadingSkeleton 
            variant="stats" 
            count={1} 
            showAnimation={true}
          />
        </View>
      </LinearGradient>
    );
  };

  const ErrorComponent = () => (
    <View style={[styles.container, styles.errorContainer, 
      { backgroundColor: theme.colors?.surface || '#fff' }]}>
      <MaterialCommunityIcons 
        name="alert-circle" 
        size={Platform.OS === 'web' ? 32 : 48} 
        color={theme.colors?.error || '#ff4444'} 
      />
      <Text style={[styles.errorText, { color: theme.colors?.textSecondary || '#666' }]}>
        Unable to load statistics
      </Text>
    </View>
  );
  
  if (isLoading) {
    return <LoadingComponent />;
  }
  
  if (error || !stats) {
    return <ErrorComponent />;
  }

  const ContainerComponent = Platform.OS === 'web' ? View : Animated.View;
  const containerProps = Platform.OS === 'web' 
    ? {} 
    : { style: { transform: [{ scale: containerScale }] } };

  const MainContent = () => (
    <View style={[styles.container, Platform.OS === 'web' && { backgroundColor: theme.colors?.surface || '#fff' }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.overline, { color: theme.colors?.primary || '#6366F1' }]}>
            DASHBOARD
          </Text>
          <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
            Recent Activity
          </Text>
        </View>
        <View style={styles.headerIcon}>
          {Platform.OS === 'web' ? (
            <View style={[styles.iconGradient, { backgroundColor: theme.colors?.primary || '#6366F1' }]}>
              <MaterialCommunityIcons 
                name="chart-line-variant" 
                size={24} 
                color="#FFFFFF" 
              />
            </View>
          ) : (
            <LinearGradient
              colors={defaultGradients.primary.colors}
              start={defaultGradients.primary.start}
              end={defaultGradients.primary.end}
              style={styles.iconGradient}
            >
              <MaterialCommunityIcons 
                name="chart-line-variant" 
                size={24} 
                color="#FFFFFF" 
              />
            </LinearGradient>
          )}
        </View>
      </View>
      
      <View style={styles.statsGrid}>
        <StatItem
          icon="play-circle"
          value={stats.totalExecutions || 0}
          label="Runs"
          color="#2196F3"
          gradientColors={defaultGradients.ocean.colors}
          delay={0}
        />
        <StatItem
          icon="check-circle"
          value={`${stats.successRate || 0}%`}
          label="Success"
          color="#4CAF50"
          gradientColors={defaultGradients.success.colors}
          delay={100}
          showProgressRing={Platform.OS !== 'web'}
        />
        <StatItem
          icon="clock-fast"
          value={stats.averageTime || 0}
          label="Avg Time"
          color="#FF9800"
          gradientColors={defaultGradients.warning.colors}
          delay={200}
        />
        <StatItem
          icon="timer-sand"
          value={stats.timeSaved || 0}
          label="Time Saved"
          color="#9C27B0"
          gradientColors={defaultGradients.cosmic.colors}
          delay={300}
        />
      </View>
      
      <View style={styles.footer}>
        <View style={styles.footerDot} />
        <Text style={[styles.footerText, { color: theme.colors?.textSecondary || '#666' }]}>
          Last 7 days • Live data
        </Text>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <Card style={styles.webContainer}>
        <MainContent />
      </Card>
    );
  }
  
  return (
    <ContainerComponent {...containerProps}>
      <LinearGradient
        colors={defaultGradients.subtle.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientContainer}
      >
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject} />
        )}
        
        <View style={[styles.glassContainer]}>
          <MainContent />
        </View>
      </LinearGradient>
    </ContainerComponent>
  );
});

const styles = StyleSheet.create({
  // Web-specific container
  webContainer: {
    margin: 16,
    marginBottom: 8,
  },
  
  // Gradient container for native
  gradientContainer: {
    margin: 16,
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
      web: {
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  
  // Main container
  container: {
    padding: 20,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        backgroundColor: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  
  // Glass effect for native
  glassContainer: {
    backgroundColor: Platform.select({
      ios: 'rgba(255, 255, 255, 0.3)',
      android: 'rgba(255, 255, 255, 0.9)',
      web: 'transparent',
    }),
  },
  
  // Error state
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  errorText: {
    marginTop: Platform.OS === 'web' ? 8 : 12,
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerIcon: {
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: Platform.select({ ios: 22, android: 20, web: 20 }),
    fontWeight: Platform.select({ ios: '700', android: 'bold', web: '600' }),
    lineHeight: Platform.select({ ios: 26, android: 24, web: 24 }),
  },
  
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  // Icon containers
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradientIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  
  // Progress ring
  progressWrapper: {
    width: 48,
    height: 48,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: Platform.select({ ios: 14, android: 12, web: 12 }),
    fontWeight: 'bold',
  },
  
  // Text styles
  statValue: {
    fontSize: Platform.select({ ios: 22, android: 20, web: 18 }),
    fontWeight: Platform.select({ ios: '700', android: 'bold', web: 'bold' }),
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: Platform.select({ ios: 11, android: 10, web: 11 }),
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    opacity: 0.8,
  },
  
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  footerText: {
    fontSize: Platform.select({ ios: 11, android: 10, web: 11 }),
    fontWeight: '400',
  },
});

export default QuickStatsWidget;