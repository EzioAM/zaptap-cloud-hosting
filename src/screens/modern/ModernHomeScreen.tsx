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
  Easing,
  Pressable,
  Dimensions,
  StatusBar,
  InteractionManager,
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

// Error Boundaries and Recovery
import { ScreenErrorBoundary, WidgetErrorBoundary } from '../../components/ErrorBoundaries';
import { ErrorFallback } from '../../components/Fallbacks';
import { useErrorHandler } from '../../utils/errorRecovery';
import { EventLogger } from '../../utils/EventLogger';

// Components
import { SkeletonWidget, StatsSkeletonWidget, ActionsSkeletonWidget, FeaturedSkeletonWidget, ActivitySkeletonWidget } from '../../components/common/SkeletonWidget';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';
import { ParallaxScrollView } from '../../components/common/ParallaxScrollView';

// Dashboard widgets - import both regular and enhanced versions
import {
  QuickStatsWidget,
  QuickStatsWidgetEnhanced,
  QuickStatsWidgetEnhanced2,
  QuickStatsWidgetSimple,
  QuickActionsWidget,
  QuickActionsWidgetEnhanced,
  RecentActivityWidget,
  RecentActivityWidgetEnhanced,
  FeaturedAutomationWidget,
  FeaturedAutomationWidgetEnhanced,
} from '../../components/organisms/DashboardWidgets';

// Enhanced components
import { GradientHeader } from '../../components/shared/GradientHeader';
import { GradientCard } from '../../components/shared/GradientCard';
import { GradientButton } from '../../components/shared/GradientButton';

// Theme imports
import { gradients, getGlassStyle } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';

// Constants
import { ANIMATION_CONFIG } from '../../constants/animations';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Feature flags for progressive enhancement
// PERFORMANCE FIX: Disabled performance-heavy features to restore touch responsiveness
const FEATURE_FLAGS = {
  ENHANCED_ANIMATIONS: false, // DISABLED - was blocking main thread
  HAPTIC_FEEDBACK: Platform.OS !== 'web',
  BLUR_EFFECTS: false, // DISABLED - major performance impact on touch events
  PARALLAX_SCROLLING: false, // DISABLED - use regular ScrollView for better performance
  GRADIENT_HEADERS: true,
  STAGGERED_ANIMATIONS: false, // DISABLED - was creating animation cascade
  ENHANCED_WIDGETS: true,
  STATUS_BAR_ANIMATION: Platform.OS !== 'web',
};

const ModernHomeScreen: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { isOnline, isBackendConnected } = useConnection();
  const isConnected = isOnline && isBackendConnected;
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; visible: boolean }>({ 
    type: 'success', 
    message: '', 
    visible: false 
  });
  
  const [refreshDashboard] = useRefreshDashboardMutation();

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const refreshIndicatorRotation = useRef(new Animated.Value(0)).current;
  const widgetAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const headerBlur = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Haptic feedback helper
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (FEATURE_FLAGS.HAPTIC_FEEDBACK) {
      try {
        switch (type) {
          case 'light':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'heavy':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        }
      } catch (error) {
        // Haptics not supported
      }
    }
  }, []);

  const showFeedback = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setFeedback({ type, message, visible: true });
    setTimeout(() => setFeedback(prev => ({ ...prev, visible: false })), 3000);
  }, []);

  // Initial loading and staggered widget animations
  useEffect(() => {
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
      setError(null);
      
      if (FEATURE_FLAGS.STAGGERED_ANIMATIONS) {
        // Staggered entry animations for widgets
        const staggerDelay = 150;
        widgetAnimations.forEach((anim, index) => {
          Animated.spring(anim, {
            toValue: 1,
            tension: ANIMATION_CONFIG.SPRING_TENSION,
            friction: ANIMATION_CONFIG.SPRING_FRICTION,
            delay: index * staggerDelay,
            useNativeDriver: true,
          }).start();
        });
      } else {
        // Set all animations to complete state immediately
        widgetAnimations.forEach(anim => anim.setValue(1));
      }
    }, isConnected ? 800 : 1500); // Faster loading when connected

    return () => clearTimeout(loadingTimer);
  }, [isConnected, widgetAnimations]);

  // Scroll-based animations
  const handleScroll = useCallback(
    FEATURE_FLAGS.ENHANCED_ANIMATIONS
      ? (event: { nativeEvent: { contentOffset: { y: number } } }) => {
          try {
            const offsetY = event.nativeEvent.contentOffset.y;
            
            // Update scroll Y for animations
            scrollY.setValue(offsetY);
            
            // Header blur effect
            const blurValue = Math.min(offsetY / 100, 1);
            headerBlur.setValue(blurValue);
            
            // Header opacity
            const opacityValue = Math.max(0, Math.min(1, 1 - offsetY / 200));
            headerOpacity.setValue(opacityValue);
            
            // FAB scale based on scroll
            const fabScaleValue = offsetY > 200 ? 0 : 1;
            Animated.spring(fabScale, {
              toValue: fabScaleValue,
              tension: ANIMATION_CONFIG.SPRING_TENSION,
              friction: ANIMATION_CONFIG.SPRING_FRICTION,
              useNativeDriver: true,
            }).start();
          } catch (error) {
            console.warn('ModernHomeScreen: handleScroll error:', error);
          }
        }
      : undefined,
    [scrollY, headerBlur, headerOpacity, fabScale]
  );

  // Refresh with enhanced animations
  const onRefresh = useCallback(async () => {
    if (!isConnected) {
      showFeedback('warning', 'No internet connection');
      return;
    }

    try {
      setRefreshing(true);
      triggerHaptic('medium');
      
      if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
        // Rotation animation for refresh indicator
        Animated.loop(
          Animated.timing(refreshIndicatorRotation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      }

      await refreshDashboard().unwrap();
      showFeedback('success', 'Dashboard refreshed');
    } catch (error) {
      EventLogger.error('ModernHomeScreen', 'Dashboard refresh failed', error as Error, {
        isConnected,
        userId: user?.id,
      });
      showFeedback('error', 'Failed to refresh dashboard');
      setError('Failed to refresh dashboard. Please try again.');
    } finally {
      setRefreshing(false);
      if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
        refreshIndicatorRotation.setValue(0);
      }
    }
  }, [refreshDashboard, isConnected, refreshIndicatorRotation, triggerHaptic, showFeedback]);

  // Get greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const greeting = useMemo(() => getGreeting(), [getGreeting]);

  // Enhanced widget selection based on feature flags
  const QuickStatsComponent = FEATURE_FLAGS.ENHANCED_WIDGETS ? QuickStatsWidgetSimple : QuickStatsWidget;
  const QuickActionsComponent = FEATURE_FLAGS.ENHANCED_WIDGETS ? QuickActionsWidgetEnhanced : QuickActionsWidget;
  const RecentActivityComponent = FEATURE_FLAGS.ENHANCED_WIDGETS ? RecentActivityWidgetEnhanced : RecentActivityWidget;
  const FeaturedAutomationComponent = FEATURE_FLAGS.ENHANCED_WIDGETS ? FeaturedAutomationWidgetEnhanced : FeaturedAutomationWidget;

  // Navigation handlers with haptic feedback
  const handleNavigateToBuilder = useCallback(() => {
    try {
      console.log('DEBUG: handleNavigateToBuilder called');
      triggerHaptic('light');
      EventLogger.userAction('navigate_to_builder', 'ModernHomeScreen');
      navigation.navigate('BuildTab' as never);
    } catch (error) {
      EventLogger.error('ModernHomeScreen', 'Navigation to builder failed', error as Error);
      showFeedback('error', 'Failed to navigate to builder');
    }
  }, [navigation, triggerHaptic, showFeedback]);

  const handleNavigateToDiscover = useCallback(() => {
    try {
      console.log('DEBUG: handleNavigateToDiscover called');
      triggerHaptic('light');
      EventLogger.userAction('navigate_to_discover', 'ModernHomeScreen');
      navigation.navigate('DiscoverTab' as never);
    } catch (error) {
      EventLogger.error('ModernHomeScreen', 'Navigation to discover failed', error as Error);
      showFeedback('error', 'Failed to navigate to discover');
    }
  }, [navigation, triggerHaptic, showFeedback]);

  const handleNavigateToLibrary = useCallback(() => {
    try {
      console.log('DEBUG: handleNavigateToLibrary called');
      triggerHaptic('light');
      EventLogger.userAction('navigate_to_library', 'ModernHomeScreen');
      navigation.navigate('LibraryTab' as never);
    } catch (error) {
      EventLogger.error('ModernHomeScreen', 'Navigation to library failed', error as Error);
      showFeedback('error', 'Failed to navigate to library');
    }
  }, [navigation, triggerHaptic, showFeedback]);

  // Enhanced pulse animation for loading states
  useEffect(() => {
    if (FEATURE_FLAGS.ENHANCED_ANIMATIONS && isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isLoading, pulseAnim]);

  // Authentication check - disabled for demo
  // if (!user) {
  //   return (
  //     <ErrorState
  //       title="Authentication Required"
  //       description="Please sign in to access your dashboard"
  //       action={{
  //         label: "Sign In",
  //         onPress: () => navigation.navigate('Auth' as never),
  //       }}
  //     />
  //   );
  // }

  // Error state for connection issues
  if (error && !isConnected) {
    return (
      <ErrorState
        title="Connection Error"
        description={error}
        action={{
          label: "Retry",
          onPress: onRefresh,
        }}
      />
    );
  }

  const ScrollComponent = FEATURE_FLAGS.PARALLAX_SCROLLING ? ParallaxScrollView : ScrollView;

  return (
    <ScreenErrorBoundary 
      screenName="Home Dashboard"
      onError={(error, errorInfo) => {
        EventLogger.error('ModernHomeScreen', 'Screen-level error caught', error, {
          componentStack: errorInfo.componentStack,
          userId: user?.id,
          isConnected,
        });
      }}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Status Bar Configuration */}
      {FEATURE_FLAGS.STATUS_BAR_ANIMATION && (
        <StatusBar
          barStyle={theme.dark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />
      )}

      {/* Enhanced Header */}
      {FEATURE_FLAGS.GRADIENT_HEADERS ? (
        <Animated.View style={{ opacity: headerOpacity }}>
          <GradientHeader 
            title={`${greeting}, ${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}!`}
            subtitle="What would you like to automate today?"
            rightComponent={
              <TouchableOpacity
                onPress={() => {
                  console.log('DEBUG: Profile button pressed (GradientHeader)');
                  triggerHaptic('light');
                  navigation.navigate('Profile' as never);
                }}
                style={styles.profileButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons 
                  name="account-circle" 
                  size={32} 
                  color="white" 
                />
              </TouchableOpacity>
            }
          />
        </Animated.View>
      ) : (
        <Animated.View 
          style={[
            styles.header,
            { 
              backgroundColor: theme.colors.surface,
              opacity: headerOpacity,
            }
          ]}
        >
          <View>
            <Text style={[styles.greeting, { color: theme.colors.onSurface }]}>
              {greeting}
            </Text>
            <Text style={[styles.userName, { color: theme.colors.primary }]}>
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              console.log('DEBUG: Profile button pressed (regular header)');
              triggerHaptic('light');
              navigation.navigate('Profile' as never);
            }}
            style={styles.profileButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name="account-circle" 
              size={32} 
              color={theme.colors.onSurface} 
            />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Blur overlay for header when scrolling (iOS only) */}
      {/* Temporarily disabled blur overlay to fix touch issues
      {FEATURE_FLAGS.BLUR_EFFECTS && Platform.OS === 'ios' && (
        <Animated.View
          style={[
            styles.blurOverlay,
            {
              opacity: headerBlur,
            }
          ]}
          pointerEvents="none"
        >
          <BlurView intensity={20} tint={theme.dark ? 'dark' : 'light'} />
        </Animated.View>
      )}
      */}

      {/* Main Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollComponent
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={100} // PERFORMANCE FIX: Reduced from 16 to prevent event flooding
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              title="Pull to refresh"
              titleColor={theme.colors.onSurface}
            />
          }
        >
          {/* Quick Stats Widget */}
          <Animated.View
            style={[
              styles.widgetContainer,
              FEATURE_FLAGS.STAGGERED_ANIMATIONS && {
                opacity: widgetAnimations[0],
                transform: [
                  {
                    translateY: widgetAnimations[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                  { scale: pulseAnim },
                ],
              }
            ]}
            pointerEvents="box-none" // PERFORMANCE FIX: Allow touch events to pass through
          >
            {isLoading ? (
              <StatsSkeletonWidget />
            ) : (
              <WidgetErrorBoundary 
                widgetName="Quick Stats"
                minimal={true}
                onError={(error) => {
                  EventLogger.error('ModernHomeScreen', 'QuickStats widget error', error, {
                    widgetType: 'QuickStats',
                    userId: user?.id,
                  });
                }}
              >
                <QuickStatsComponent theme={theme} />
              </WidgetErrorBoundary>
            )}
          </Animated.View>

          {/* Quick Actions Widget */}
          <Animated.View
            style={[
              styles.widgetContainer,
              FEATURE_FLAGS.STAGGERED_ANIMATIONS && {
                opacity: widgetAnimations[1],
                transform: [
                  {
                    translateY: widgetAnimations[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              }
            ]}
            pointerEvents="box-none" // PERFORMANCE FIX: Allow touch events to pass through
          >
            {isLoading ? (
              <ActionsSkeletonWidget />
            ) : (
              <WidgetErrorBoundary 
                widgetName="Quick Actions"
                minimal={true}
                onError={(error) => {
                  EventLogger.error('ModernHomeScreen', 'QuickActions widget error', error, {
                    widgetType: 'QuickActions',
                    userId: user?.id,
                  });
                }}
              >
                <QuickActionsComponent
                  theme={theme}
                  onCreateAutomation={handleNavigateToBuilder}
                  onBrowseAutomations={handleNavigateToDiscover}
                  onViewLibrary={handleNavigateToLibrary}
                />
              </WidgetErrorBoundary>
            )}
          </Animated.View>

          {/* Featured Automation Widget */}
          <Animated.View
            style={[
              styles.widgetContainer,
              FEATURE_FLAGS.STAGGERED_ANIMATIONS && {
                opacity: widgetAnimations[2],
                transform: [
                  {
                    translateY: widgetAnimations[2].interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              }
            ]}
            pointerEvents="box-none" // PERFORMANCE FIX: Allow touch events to pass through
          >
            {isLoading ? (
              <FeaturedSkeletonWidget />
            ) : (
              <WidgetErrorBoundary 
                widgetName="Featured Automation"
                minimal={true}
                onError={(error) => {
                  EventLogger.error('ModernHomeScreen', 'FeaturedAutomation widget error', error, {
                    widgetType: 'FeaturedAutomation',
                    userId: user?.id,
                  });
                }}
              >
                <FeaturedAutomationComponent
                  theme={theme}
                  onViewDetails={(automation) => {
                    triggerHaptic('light');
                    EventLogger.userAction('view_automation_details', 'ModernHomeScreen', {
                      automationId: automation?.id,
                    });
                    navigation.navigate('AutomationDetails' as never, { automation } as never);
                  }}
                />
              </WidgetErrorBoundary>
            )}
          </Animated.View>

          {/* Recent Activity Widget */}
          <Animated.View
            style={[
              styles.widgetContainer,
              FEATURE_FLAGS.STAGGERED_ANIMATIONS && {
                opacity: widgetAnimations[3],
                transform: [
                  {
                    translateY: widgetAnimations[3].interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              }
            ]}
            pointerEvents="box-none" // PERFORMANCE FIX: Allow touch events to pass through
          >
            {isLoading ? (
              <ActivitySkeletonWidget />
            ) : (
              <WidgetErrorBoundary 
                widgetName="Recent Activity"
                minimal={true}
                onError={(error) => {
                  EventLogger.error('ModernHomeScreen', 'RecentActivity widget error', error, {
                    widgetType: 'RecentActivity',
                    userId: user?.id,
                  });
                }}
              >
                <RecentActivityComponent
                  theme={theme}
                  onViewAll={() => {
                    triggerHaptic('light');
                    EventLogger.userAction('view_all_activity', 'ModernHomeScreen');
                    navigation.navigate('ActivityScreen' as never);
                  }}
                />
              </WidgetErrorBoundary>
            )}
          </Animated.View>

          {/* Connection Status Indicator */}
          {!isConnected && (
            <View style={[styles.connectionIndicator, { backgroundColor: theme.colors.errorContainer }]}>
              <MaterialCommunityIcons 
                name="wifi-off" 
                size={20} 
                color={theme.colors.onErrorContainer} 
              />
              <Text style={[styles.connectionText, { color: theme.colors.onErrorContainer }]}>
                You're offline. Some features may be limited.
              </Text>
            </View>
          )}

        </ScrollComponent>
      </Animated.View>

      {/* Enhanced FAB */}
      <Animated.View
        style={[
          styles.fabContainer,
          FEATURE_FLAGS.ENHANCED_ANIMATIONS && {
            transform: [{ scale: fabScale }],
          }
        ]}
      >
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          onPress={() => {
            console.log('DEBUG: FAB button pressed');
            handleNavigateToBuilder();
          }}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryContainer]}
            style={styles.fabGradient}
          >
            <MaterialCommunityIcons
              name="plus"
              size={28}
              color={theme.colors.onPrimary}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Enhanced Feedback Toast */}
      {feedback.visible && (
        <Animated.View 
          pointerEvents="box-none" // Allow touch pass-through to elements below
          style={[
            styles.feedbackToast,
            {
              backgroundColor: feedback.type === 'success' ? 'rgba(76, 175, 80, 0.95)' :
                              feedback.type === 'error' ? 'rgba(244, 67, 54, 0.95)' :
                              'rgba(255, 152, 0, 0.95)',
            },
            FEATURE_FLAGS.ENHANCED_ANIMATIONS && {
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }) }]
            }
          ]}
        >
          <View style={styles.feedbackIconContainer}>
            <MaterialCommunityIcons 
              name={feedback.type === 'success' ? 'check-circle' :
                    feedback.type === 'error' ? 'alert-circle' : 'alert'}
              size={22}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.feedbackText}>
            {feedback.message}
          </Text>
        </Animated.View>
      )}
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
});

ModernHomeScreen.displayName = 'ModernHomeScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  greeting: {
    fontSize: 16,
    opacity: 0.8,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 2,
  },
  profileButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  widgetContainer: {
    marginBottom: 20,
  },
  connectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100, // Increased from 20 to avoid navigation bar overlap
    right: 20,
    zIndex: 999, // Ensure FAB is below navigation bar (zIndex: 1000)
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
    minWidth: 44, // Ensure minimum touch target
    minHeight: 44,
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackToast: {
    position: 'absolute',
    top: 100, // Position at top of screen below header
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
    zIndex: 1000, // Ensure it appears above other content
  },
  feedbackIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
});

export default ModernHomeScreen;