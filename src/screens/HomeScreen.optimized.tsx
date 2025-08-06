import React, { Suspense, useCallback, useMemo, memo } from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { RootState } from '../store';
import { preloadNextScreens } from '../navigation/LazyNavigator';
import { EventLogger } from '../utils/EventLogger';

// Lazy load dashboard widgets
import {
  LazyQuickStatsWidget,
  LazyFeaturedAutomationWidget,
  LazyQuickActionsWidget,
  LazyRecentActivityWidget,
  DashboardWidgetLoader,
} from '../components/organisms/LazyDashboardWidgets';

// Widget loading placeholder
const WidgetPlaceholder: React.FC<{ height?: number }> = memo(({ height = 150 }) => (
  <View style={[styles.widgetPlaceholder, { height }]}>
    <ActivityIndicator size="small" color="#8B5CF6" />
  </View>
));

// Optimized Header Component
const HomeHeader = memo(() => {
  const user = useSelector((state: RootState) => state.auth.user);
  
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);
  
  return (
    <View style={styles.header}>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.userName}>{user?.name || 'User'}</Text>
    </View>
  );
});

HomeHeader.displayName = 'HomeHeader';

// Main Home Screen Component
const OptimizedHomeScreen: React.FC = () => {
  // Use selectors efficiently
  const automationStats = useSelector((state: RootState) => ({
    total: state.automation?.automations?.length || 0,
    active: state.automation?.automations?.filter(a => a.isActive).length || 0,
    recent: state.automation?.recentExecutions?.length || 0,
  }), (prev, next) => 
    prev.total === next.total && 
    prev.active === next.active && 
    prev.recent === next.recent
  );
  
  // Preload next screens when this screen is focused
  useFocusEffect(
    useCallback(() => {
      EventLogger.debug('HomeScreen', 'Screen focused, preloading next screens');
      preloadNextScreens('Home');
      
      // Preload widgets after a short delay
      const timer = setTimeout(() => {
        DashboardWidgetLoader.preloadCriticalWidgets();
      }, 500);
      
      return () => clearTimeout(timer);
    }, [])
  );
  
  // Memoized callbacks
  const handleQuickAction = useCallback((action: string) => {
    EventLogger.debug('HomeScreen', `Quick action triggered: ${action}`);
    // Handle quick actions
  }, []);
  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      // Optimize scroll performance
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={50}
      windowSize={10}
    >
      <HomeHeader />
      
      {/* Quick Stats Widget */}
      <Suspense fallback={<WidgetPlaceholder height={120} />}>
        <LazyQuickStatsWidget stats={automationStats} />
      </Suspense>
      
      {/* Featured Automation Widget */}
      <Suspense fallback={<WidgetPlaceholder height={200} />}>
        <LazyFeaturedAutomationWidget />
      </Suspense>
      
      {/* Quick Actions Widget */}
      <Suspense fallback={<WidgetPlaceholder height={100} />}>
        <LazyQuickActionsWidget onAction={handleQuickAction} />
      </Suspense>
      
      {/* Recent Activity Widget */}
      <Suspense fallback={<WidgetPlaceholder height={250} />}>
        <LazyRecentActivityWidget />
      </Suspense>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#8B5CF6',
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  widgetPlaceholder: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default memo(OptimizedHomeScreen);