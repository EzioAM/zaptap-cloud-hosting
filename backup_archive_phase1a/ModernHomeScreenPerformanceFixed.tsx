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
import * as Haptics from 'expo-haptics';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useNavigation } from '@react-navigation/native';
import { useRefreshDashboardMutation } from '../../store/api/dashboardApi';
import { useConnection } from '../../contexts/ConnectionContext';

// Error Boundaries and Recovery
import { ScreenErrorBoundary, WidgetErrorBoundary } from '../../components/ErrorBoundaries';
import { ErrorFallback, NetworkErrorFallback } from '../../components/Fallbacks';
import { useErrorHandler } from '../../utils/errorRecovery';
import { EventLogger } from '../../utils/EventLogger';

// Components
import { SkeletonWidget, StatsSkeletonWidget, ActionsSkeletonWidget, FeaturedSkeletonWidget, ActivitySkeletonWidget } from '../../components/common/SkeletonWidget';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';

// Dashboard widgets - import both regular and enhanced versions
import {
  QuickStatsWidget,
  QuickStatsWidgetEnhanced,
  QuickActionsWidget,
  QuickActionsWidgetEnhanced,
  RecentActivityWidget,
  RecentActivityWidgetEnhanced,
  FeaturedAutomationWidget,
  FeaturedAutomationWidgetEnhanced,
} from '../../components/organisms/DashboardWidgets';

// Enhanced components
import { GradientHeader } from '../../components/shared/GradientHeader';

// Theme imports
import { gradients, getGlassStyle } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';

// Constants
import { ANIMATION_CONFIG } from '../../constants/animations';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// PERFORMANCE FIX: Reduced feature flags for better performance
const FEATURE_FLAGS = {
  ENHANCED_ANIMATIONS: false, // DISABLED for performance
  HAPTIC_FEEDBACK: Platform.OS !== 'web',
  BLUR_EFFECTS: false, // DISABLED - major performance impact
  PARALLAX_SCROLLING: false, // DISABLED - use regular ScrollView
  GRADIENT_HEADERS: true,
  STAGGERED_ANIMATIONS: false, // DISABLED for performance
  ENHANCED_WIDGETS: true,
  STATUS_BAR_ANIMATION: Platform.OS !== 'web',
};

const ModernHomeScreenPerformanceFixed: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const { connectionState } = useConnection();
  const { isConnected } = connectionState;
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; visible: boolean }>({ 
    type: 'success', 
    message: '', 
    visible: false 
  });
  
  const [refreshDashboard] = useRefreshDashboardMutation();

  // PERFORMANCE FIX: Reduced number of animated values
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // PERFORMANCE FIX: Memoized interpolations
  const headerOpacity = useMemo(() => 
    scrollY.interpolate({
      inputRange: [0, 200],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }), [scrollY]);

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

  // PERFORMANCE FIX: Simplified loading with InteractionManager
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setIsLoading(false);
      setError(null);
    });
  }, []);

  // PERFORMANCE FIX: Throttled scroll handler using Animated.event
  const handleScroll = useMemo(() => 
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      {
        useNativeDriver: true,
        // No listener to avoid performance impact
      }
    ), [scrollY]);

  // Refresh with simplified animations
  const onRefresh = useCallback(async () => {
    if (!isConnected) {
      showFeedback('warning', 'No internet connection');
      return;
    }

    try {
      setRefreshing(true);
      triggerHaptic('medium');
      
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
    }
  }, [refreshDashboard, isConnected, triggerHaptic, showFeedback, user?.id]);

  // Get greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const greeting = useMemo(() => getGreeting(), [getGreeting]);

  // Enhanced widget selection based on feature flags
  const QuickStatsComponent = FEATURE_FLAGS.ENHANCED_WIDGETS ? QuickStatsWidgetEnhanced : QuickStatsWidget;
  const QuickActionsComponent = FEATURE_FLAGS.ENHANCED_WIDGETS ? QuickActionsWidgetEnhanced : QuickActionsWidget;
  const RecentActivityComponent = FEATURE_FLAGS.ENHANCED_WIDGETS ? RecentActivityWidgetEnhanced : RecentActivityWidget;
  const FeaturedAutomationComponent = FEATURE_FLAGS.ENHANCED_WIDGETS ? FeaturedAutomationWidgetEnhanced : FeaturedAutomationWidget;

  // PERFORMANCE FIX: Simplified navigation handlers
  const handleNavigateToBuilder = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      triggerHaptic('light');
      EventLogger.userAction('navigate_to_builder', 'ModernHomeScreen');
      navigation.navigate('BuildTab' as never);
    });
  }, [navigation, triggerHaptic]);

  const handleNavigateToDiscover = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      triggerHaptic('light');
      EventLogger.userAction('navigate_to_discover', 'ModernHomeScreen');
      navigation.navigate('DiscoverTab' as never);
    });
  }, [navigation, triggerHaptic]);

  const handleNavigateToLibrary = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      triggerHaptic('light');
      EventLogger.userAction('navigate_to_library', 'ModernHomeScreen');
      navigation.navigate('LibraryTab' as never);
    });
  }, [navigation, triggerHaptic]);

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
          <Animated.View style={{ opacity: headerOpacity }} pointerEvents="box-none">
            <GradientHeader 
              title={`${greeting}, ${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}!`}
              subtitle="What would you like to automate today?"
              rightComponent={
                <Pressable
                  onPress={() => {
                    console.log('DEBUG: Profile button pressed (GradientHeader)');
                    triggerHaptic('light');
                    navigation.navigate('Profile' as never);
                  }}
                  style={styles.profileButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialCommunityIcons 
                    name="account-circle" 
                    size={32} 
                    color="white" 
                  />
                </Pressable>
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
            pointerEvents="box-none"
          >
            <View>
              <Text style={[styles.greeting, { color: theme.colors.onSurface }]}>
                {greeting}
              </Text>
              <Text style={[styles.userName, { color: theme.colors.primary }]}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                console.log('DEBUG: Profile button pressed (regular header)');
                triggerHaptic('light');
                navigation.navigate('Profile' as never);
              }}
              style={styles.profileButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons 
                name="account-circle" 
                size={32} 
                color={theme.colors.onSurface} 
              />
            </Pressable>
          </Animated.View>
        )}

        {/* Main Content - PERFORMANCE FIX: Regular ScrollView */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={100} // PERFORMANCE FIX: Increased throttle
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              title="Pull to refresh"
              titleColor={theme.colors.onSurface}
            />
          }
          // PERFORMANCE FIX: Remove scroll to end momentum
          decelerationRate="fast"
          overScrollMode="never"
        >
          {/* Quick Stats Widget - No animation wrapper */}
          <View style={styles.widgetContainer}>
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
          </View>

          {/* Quick Actions Widget */}
          <View style={styles.widgetContainer}>
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
          </View>

          {/* Featured Automation Widget */}
          <View style={styles.widgetContainer}>
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
                    InteractionManager.runAfterInteractions(() => {
                      triggerHaptic('light');
                      EventLogger.userAction('view_automation_details', 'ModernHomeScreen', {
                        automationId: automation?.id,
                      });
                      navigation.navigate('AutomationDetails' as never, { automation } as never);
                    });
                  }}
                />
              </WidgetErrorBoundary>
            )}
          </View>

          {/* Recent Activity Widget */}
          <View style={styles.widgetContainer}>
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
                    InteractionManager.runAfterInteractions(() => {
                      triggerHaptic('light');
                      EventLogger.userAction('view_all_activity', 'ModernHomeScreen');
                      navigation.navigate('ActivityScreen' as never);
                    });
                  }}
                />
              </WidgetErrorBoundary>
            )}
          </View>

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

        </ScrollView>

        {/* PERFORMANCE FIX: Simplified FAB without scale animation */}
        <View style={styles.fabContainer}>
          <Pressable
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              console.log('DEBUG: FAB button pressed');
              handleNavigateToBuilder();
            }}
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
          </Pressable>
        </View>

        {/* Feedback Toast */}
        {feedback.visible && (
          <View 
            style={[
              styles.feedbackToast,
              { backgroundColor: theme.colors.surface }
            ]}
          >
            <MaterialCommunityIcons 
              name={feedback.type === 'success' ? 'check-circle' :
                    feedback.type === 'error' ? 'alert-circle' : 'alert'}
              size={20}
              color={feedback.type === 'success' ? '#4CAF50' :
                    feedback.type === 'error' ? '#F44336' : '#FF9800'}
            />
            <Text style={[styles.feedbackText, { color: theme.colors.onSurface }]}>
              {feedback.message}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </ScreenErrorBoundary>
  );
});

ModernHomeScreenPerformanceFixed.displayName = 'ModernHomeScreenPerformanceFixed';

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
    bottom: 20,
    right: 20,
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
    minWidth: 44,
    minHeight: 44,
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackToast: {
    position: 'absolute',
    bottom: 100,
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
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ModernHomeScreenPerformanceFixed;