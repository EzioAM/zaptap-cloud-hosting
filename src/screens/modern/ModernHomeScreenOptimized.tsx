import React, { useCallback, useState, useMemo, useEffect, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Animated,
  Pressable,
  Dimensions,
  StatusBar,
  InteractionManager,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useNavigation } from '@react-navigation/native';
import { useRefreshDashboardMutation } from '../../store/api/dashboardApi';
import { useConnection } from '../../contexts/ConnectionContext';

// Optimized Animation System
import {
  useOptimizedAnimatedValue,
  useOptimizedScrollAnimation,
  useDelayedAnimation,
  useBatchAnimations,
  useReducedMotion,
  useFPSMonitor,
  useSpringAnimation,
  PresetAnimations,
  animationController,
  PlatformOptimizer,
  DURATIONS,
  SPRING_CONFIGS,
  PERFORMANCE_TARGETS,
} from '../../utils/animations';

// Components
import { SkeletonWidget } from '../../components/common/SkeletonWidget';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';
import { ParallaxScrollView } from '../../components/common/ParallaxScrollView';

// Optimized Dashboard widgets
import QuickStatsWidgetOptimized from '../../components/organisms/DashboardWidgets/QuickStatsWidgetOptimized';

// Enhanced components
import { GradientHeader } from '../../components/shared/GradientHeader';
import { GradientCard } from '../../components/shared/GradientCard';
import { GradientButton } from '../../components/shared/GradientButton';

// Theme imports
import { gradients, getGlassStyle } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Feature flags with performance awareness
const getFeatureFlags = (performance: 'high' | 'medium' | 'low') => ({
  ENHANCED_ANIMATIONS: performance !== 'low' && Platform.OS !== 'web',
  HAPTIC_FEEDBACK: Platform.OS !== 'web',
  BLUR_EFFECTS: performance === 'high' && Platform.OS !== 'web',
  PARALLAX_SCROLLING: performance !== 'low' && Platform.OS !== 'web',
  GRADIENT_HEADERS: true,
  STAGGERED_ANIMATIONS: performance !== 'low' && Platform.OS !== 'web',
  ENHANCED_WIDGETS: true,
  STATUS_BAR_ANIMATION: performance !== 'low' && Platform.OS !== 'web',
});

// Memoized components for better performance
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Optimized Header Component
const OptimizedHeader = memo(({ 
  scrollY, 
  theme, 
  user, 
  onNotificationPress 
}: any) => {
  const reducedMotion = useReducedMotion();
  
  const headerOpacity = useMemo(() => {
    if (reducedMotion) return new Animated.Value(1);
    
    return animationController.createScrollAnimation(scrollY, {
      inputRange: [0, 100],
      outputRange: [1, 0.9],
    });
  }, [scrollY, reducedMotion]);

  const headerScale = useMemo(() => {
    if (reducedMotion) return new Animated.Value(1);
    
    return animationController.createScrollAnimation(scrollY, {
      inputRange: [-50, 0, 50],
      outputRange: [1.05, 1, 0.98],
    });
  }, [scrollY, reducedMotion]);

  return (
    <Animated.View 
      style={[
        styles.header,
        PlatformOptimizer.optimizeStyle({
          opacity: headerOpacity,
          transform: [{ scale: headerScale }],
        }),
      ]}
    >
      <LinearGradient
        colors={gradients.primary.colors}
        start={gradients.primary.start}
        end={gradients.primary.end}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, { color: '#fff' }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: '#fff' }]}>
              {user?.name || 'User'}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={onNotificationPress}
            style={styles.notificationButton}
          >
            <MaterialCommunityIcons 
              name="bell-outline" 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );
});

// Optimized Widget Container
const OptimizedWidgetContainer = memo(({ 
  children, 
  delay = 0,
  style 
}: any) => {
  const { value: scale, animate } = useSpringAnimation(0.95);
  const opacity = useOptimizedAnimatedValue(0);
  const translateY = useOptimizedAnimatedValue(30);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        PresetAnimations.fadeInUp(opacity, translateY, {
          duration: DURATIONS.NORMAL,
        }).start();
        animate(1);
      }, delay);
    });
  }, [delay, reducedMotion]);

  return (
    <Animated.View 
      style={[
        style,
        PlatformOptimizer.optimizeStyle({
          opacity,
          transform: [{ scale }, { translateY }],
        }),
      ]}
    >
      {children}
    </Animated.View>
  );
});

// Main Optimized Home Screen
const ModernHomeScreenOptimized: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { connectionState } = useConnection();
  const { isConnected } = connectionState;
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [refreshDashboard] = useRefreshDashboardMutation();
  
  // Performance monitoring
  const { isLowFPS, currentFPS } = useFPSMonitor();
  const reducedMotion = useReducedMotion();
  const { addAnimation, executeNow } = useBatchAnimations();
  
  // Determine device performance and feature flags
  const devicePerformance = useMemo(() => {
    if (currentFPS < PERFORMANCE_TARGETS.LOWEND.fps) return 'low';
    if (currentFPS < PERFORMANCE_TARGETS.MIDRANGE.fps) return 'medium';
    return 'high';
  }, [currentFPS]);
  
  const FEATURE_FLAGS = useMemo(() => 
    getFeatureFlags(devicePerformance), 
    [devicePerformance]
  );

  // Optimized scroll animation
  const { scrollY, handleScroll, interpolate, isScrolling } = useOptimizedScrollAnimation();
  
  // FAB animation
  const { value: fabScale, animate: animateFab } = useSpringAnimation(1);
  
  // Configure layout animation on mount
  useEffect(() => {
    if (!reducedMotion) {
      animationController.configureLayoutAnimation(DURATIONS.NORMAL, 'spring');
    }
    
    // Initialize platform optimizations
    PlatformOptimizer.initialize();
    
    // Load initial data after interactions
    InteractionManager.runAfterInteractions(() => {
      setIsLoading(false);
    });
    
    return () => {
      animationController.cleanup();
    };
  }, [reducedMotion]);

  // Handle refresh with optimized animations
  const onRefresh = useCallback(async () => {
    if (!FEATURE_FLAGS.HAPTIC_FEEDBACK) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setRefreshing(true);
    
    try {
      await refreshDashboard().unwrap();
      
      // Animate success feedback
      if (!reducedMotion) {
        animateFab(1.1);
        setTimeout(() => animateFab(1), 200);
      }
    } catch (error) {
      setError('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard, reducedMotion, animateFab]);

  // Optimize scroll event handling
  const onScroll = useMemo(() => {
    if (FEATURE_FLAGS.PARALLAX_SCROLLING) {
      return Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { 
          useNativeDriver: true,
          listener: handleScroll,
        }
      );
    }
    return undefined;
  }, [scrollY, handleScroll, FEATURE_FLAGS.PARALLAX_SCROLLING]);

  // Handle navigation with animation
  const navigateToScreen = useCallback((screenName: string) => {
    if (FEATURE_FLAGS.HAPTIC_FEEDBACK) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Delay navigation for smoother transition
    animationController.runAfterAnimations(() => {
      navigation.navigate(screenName as any);
    });
  }, [navigation, FEATURE_FLAGS.HAPTIC_FEEDBACK]);

  // Loading state with skeleton
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.skeletonContainer}>
          <SkeletonWidget type="header" />
          <SkeletonWidget type="stats" />
          <SkeletonWidget type="actions" />
          <SkeletonWidget type="featured" />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !isConnected) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ErrorState 
          message={error} 
          onRetry={onRefresh}
        />
      </SafeAreaView>
    );
  }

  return (
    <AnimatedSafeAreaView 
      style={[
        styles.container, 
        { backgroundColor: theme.colors.background },
        PlatformOptimizer.optimizeStyle({}),
      ]}
    >
      <StatusBar 
        barStyle={theme.dark ? 'light-content' : 'dark-content'}
        animated={FEATURE_FLAGS.STATUS_BAR_ANIMATION}
      />
      
      <OptimizedHeader
        scrollY={scrollY}
        theme={theme}
        user={user}
        onNotificationPress={() => navigateToScreen('Notifications')}
      />
      
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        // Platform-specific optimizations
        {...(Platform.OS === 'android' && {
          removeClippedSubviews: true,
          renderToHardwareTextureAndroid: true,
        })}
        {...(Platform.OS === 'ios' && {
          decelerationRate: 'fast',
          directionalLockEnabled: true,
        })}
      >
        {/* Quick Stats Widget */}
        <OptimizedWidgetContainer delay={0} style={styles.widgetContainer}>
          <QuickStatsWidgetOptimized />
        </OptimizedWidgetContainer>
        
        {/* Quick Actions */}
        <OptimizedWidgetContainer delay={100} style={styles.widgetContainer}>
          <View style={styles.quickActions}>
            {[
              { icon: 'plus-circle', label: 'Create', screen: 'Build' },
              { icon: 'compass', label: 'Discover', screen: 'Discover' },
              { icon: 'library', label: 'Library', screen: 'Library' },
              { icon: 'account', label: 'Profile', screen: 'Profile' },
            ].map((action, index) => (
              <AnimatedPressable
                key={action.screen}
                style={[
                  styles.actionButton,
                  PlatformOptimizer.optimizeStyle({
                    transform: [{ scale: fabScale }],
                  }),
                ]}
                onPress={() => navigateToScreen(action.screen)}
                onPressIn={() => animateFab(0.95)}
                onPressOut={() => animateFab(1)}
              >
                <LinearGradient
                  colors={gradients.primary.colors}
                  style={styles.actionGradient}
                >
                  <MaterialCommunityIcons 
                    name={action.icon as any} 
                    size={28} 
                    color="#fff" 
                  />
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </LinearGradient>
              </AnimatedPressable>
            ))}
          </View>
        </OptimizedWidgetContainer>
        
        {/* Performance Monitor (Dev Only) */}
        {__DEV__ && (
          <View style={styles.perfMonitor}>
            <Text style={styles.perfText}>
              FPS: {currentFPS} | Performance: {devicePerformance}
            </Text>
          </View>
        )}
      </Animated.ScrollView>
    </AnimatedSafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    height: 180,
    marginBottom: 16,
  },
  headerGradient: {
    flex: 1,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 16,
    opacity: 0.9,
    ...fontWeights.regular,
  },
  userName: {
    fontSize: 28,
    ...fontWeights.bold,
    ...textShadows.medium,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetContainer: {
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  skeletonContainer: {
    flex: 1,
    padding: 16,
  },
  perfMonitor: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    borderRadius: 4,
  },
  perfText: {
    color: '#fff',
    fontSize: 10,
  },
});

export default ModernHomeScreenOptimized;