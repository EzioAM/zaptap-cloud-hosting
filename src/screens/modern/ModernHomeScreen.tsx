import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUnifiedTheme as useTheme } from '../../contexts/UnifiedThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useGetMyAutomationsQuery, useGetUserStatsQuery, useGetRecentExecutionsQuery } from '../../store/api/automationApi';
import ComponentErrorBoundary from '../../components/common/ComponentErrorBoundary';
import EnhancedLoadingSkeleton from '../../components/common/EnhancedLoadingSkeleton';
import { useCleanup } from '../../hooks/useCleanup';

const { width } = Dimensions.get('window');

const ModernHomeScreen = React.memo(() => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = React.useState(false);
  const { addCleanup } = useCleanup();
  
  const { data: myAutomations = [], isLoading, refetch } = useGetMyAutomationsQuery();
  const { data: userStats, isLoading: statsLoading, refetch: refetchStats } = useGetUserStatsQuery();
  const { data: recentExecutions, isLoading: executionsLoading, refetch: refetchExecutions } = useGetRecentExecutionsQuery({ limit: 5 });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchStats(), refetchExecutions()]);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchStats, refetchExecutions]);

  const featuredCategories = useMemo(() => [
    { id: '1', name: 'Productivity', icon: 'rocket-launch', color: '#FF6B6B' },
    { id: '2', name: 'Smart Home', icon: 'home-automation', color: '#4ECDC4' },
    { id: '3', name: 'Social', icon: 'share-variant', color: '#95E1D3' },
    { id: '4', name: 'Health', icon: 'heart-pulse', color: '#F38181' },
  ], []);

  // Get recent automations (last 3) - memoized to prevent recalculation
  const recentAutomations = useMemo(
    () => myAutomations.slice(0, 3),
    [myAutomations]
  );
  
  // Helper function to get relative time - memoized
  const getRelativeTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInHours < 48) return 'Yesterday';
    const days = Math.floor(diffInHours / 24);
    return `${days} days ago`;
  }, []);
  
  // Use real stats from API - memoized to prevent recalculation
  const stats = useMemo(() => ({
    automations: userStats?.total_automations || myAutomations.length || 0,
    totalRuns: userStats?.total_runs || 0,
    timeSaved: Math.floor((userStats?.total_time_saved || 0) / 60000) // Convert ms to minutes
  }), [userStats, myAutomations.length]);

  // Calculate recent activity from executions - memoized
  const recentActivity = useMemo(() => {
    return recentExecutions?.slice(0, 3).map(execution => {
      const automation = myAutomations?.find(a => a.id === execution.automation_id);
      return {
        id: execution.id,
        automation,
        execution,
        lastRun: new Date(execution.created_at),
        status: execution.status
      };
    }) || [];
  }, [recentExecutions, myAutomations]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Memoized icon mappings to prevent recreation on every render
  const categoryIcons = useMemo(() => ({
    'Productivity': 'briefcase',
    'Smart Home': 'home-automation',
    'Social': 'share-variant',
    'Health': 'heart-pulse',
    'Communication': 'message',
    'Entertainment': 'movie',
  }), []);

  const statusIcons = useMemo(() => ({
    'success': 'check-circle',
    'failed': 'alert-circle',
    'running': 'progress-clock',
    'cancelled': 'cancel'
  }), []);

  const statusColors = useMemo(() => ({
    'success': theme.colors.success,
    'failed': theme.colors.error,
    'running': theme.colors.info,
    'cancelled': theme.colors.textSecondary
  }), [theme.colors]);

  if ((isLoading || statsLoading || executionsLoading) && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header Skeleton */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={[styles.skeletonText, { width: 100, height: 16, backgroundColor: theme.colors.surface }]} />
              <View style={[styles.skeletonText, { width: 150, height: 24, backgroundColor: theme.colors.surface, marginTop: 4 }]} />
            </View>
          </View>
          
          {/* CTA Card Skeleton */}
          <View style={[styles.ctaCard, { backgroundColor: theme.colors.surface }]} />
          
          {/* Stats Skeleton */}
          <EnhancedLoadingSkeleton variant="stats" showAnimation={true} />
          
          {/* Activity Skeleton */}
          <View style={styles.section}>
            <View style={[styles.skeletonText, { width: 120, height: 20, backgroundColor: theme.colors.surface, marginBottom: 16 }]} />
            <EnhancedLoadingSkeleton variant="automation" count={3} showAnimation={true} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <ComponentErrorBoundary componentName="ModernHomeScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {user?.name || 'Automation Master'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.notificationButton}
            accessibilityLabel="Notifications"
            accessibilityHint="Open notifications"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="bell-outline"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Create Automation CTA */}
        <TouchableOpacity
          style={[styles.ctaCard, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('BuildTab' as never)}
          activeOpacity={0.9}
          accessibilityLabel="Create New Automation"
          accessibilityHint="Navigate to the automation builder"
          accessibilityRole="button"
        >
          <View style={styles.ctaContent}>
            <MaterialCommunityIcons name="plus-circle" size={32} color="#FFFFFF" />
            <View style={styles.ctaTextContainer}>
              <Text style={styles.ctaTitle}>Create New Automation</Text>
              <Text style={styles.ctaSubtitle}>Build powerful workflows in minutes</Text>
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View 
            style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
            accessible={true}
            accessibilityLabel={`${stats.automations} Automations`}
            accessibilityRole="text"
          >
            <MaterialCommunityIcons
              name="robot"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {stats.automations}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Automations
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons
              name="play-circle"
              size={24}
              color={theme.colors.success}
            />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {stats.totalRuns}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Total Runs
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={24}
              color={theme.colors.info}
            />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {stats.timeSaved < 60 ? `${stats.timeSaved}m` : `${Math.floor(stats.timeSaved / 60)}h`}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Time Saved
            </Text>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Recent Activity
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('LibraryTab')}>
              <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          {recentActivity.length === 0 && !isLoading ? (
            <View style={[styles.activityCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.activityTitle, { color: theme.colors.textSecondary, textAlign: 'center', flex: 1 }]}>
                {myAutomations.length === 0 
                  ? "No automations yet. Create your first automation!" 
                  : "No recent activity. Run an automation to see it here!"}
              </Text>
            </View>
          ) : (
            recentActivity.map((item) => {
              const { automation, execution } = item;
              if (!automation) return null;
              
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.activityCard, { backgroundColor: theme.colors.surface }]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('AutomationDetails', { automationId: automation.id })}
                  accessibilityLabel={`Automation: ${automation.title}`}
                  accessibilityHint={`${automation.description}. Last run ${getRelativeTime(execution.created_at)}. Status: ${execution.status}. Tap to view details.`}
                  accessibilityRole="button"
                >
                  <View style={[styles.activityIcon, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <MaterialCommunityIcons
                      name={(categoryIcons[automation.category] || 'robot') as any}
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={[styles.activityTitle, { color: theme.colors.text }]}>
                      {automation.title}
                    </Text>
                    <View style={styles.activityMeta}>
                      <Text style={[styles.activityTime, { color: theme.colors.textSecondary }]}>
                        {getRelativeTime(execution.created_at)}
                      </Text>
                      <MaterialCommunityIcons
                        name={statusIcons[execution.status] as any}
                        size={16}
                        color={statusColors[execution.status]}
                        style={{ marginLeft: 8 }}
                      />
                      <Text style={[styles.activityStatus, { color: statusColors[execution.status], marginLeft: 4 }]}>
                        {execution.status}
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              );
            }).filter(Boolean)
          )}
        </View>

        {/* Featured Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Featured Categories
          </Text>
          <View style={styles.categoriesGrid}>
            {featuredCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  { backgroundColor: theme.colors.surface },
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Browse ${category.name} automations`}
                accessibilityHint={`Navigate to discover ${category.name} category automations`}
                onPress={() => {
                  // Navigate to discover tab and set category filter
                  navigation.navigate('DiscoverTab');
                  // TODO: Pass category filter to discover screen
                }}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: `${category.color}20` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={category.icon as any}
                    size={28}
                    color={category.color}
                  />
                </View>
                <Text style={[styles.categoryName, { color: theme.colors.text }]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>
    </ComponentErrorBoundary>
  );
});

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    headerContent: {
      flex: 1,
    },
    welcomeText: {
      fontSize: theme.typography.body.fontSize,
      fontWeight: theme.typography.body.fontWeight,
    },
    userName: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight,
      marginTop: theme.spacing.xs,
    },
    notificationButton: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    ctaCard: {
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
    },
    ctaContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    ctaTextContainer: {
      marginLeft: theme.spacing.md,
    },
    ctaTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    ctaSubtitle: {
      fontSize: 14,
      color: '#FFFFFF',
      opacity: 0.9,
      marginTop: 2,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.xl,
      gap: theme.spacing.sm,
    },
    statCard: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: '700',
      marginTop: theme.spacing.sm,
    },
    statLabel: {
      fontSize: 12,
      marginTop: theme.spacing.xs,
    },
    section: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.h3.fontWeight,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '600',
    },
    activityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    activityIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activityContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    activityTitle: {
      fontSize: 16,
      fontWeight: '600',
    },
    activityMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    activityTime: {
      fontSize: 13,
    },
    activityRuns: {
      fontSize: 13,
      marginLeft: theme.spacing.xs,
    },
    activityStatus: {
      fontSize: 13,
      fontWeight: '600',
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    categoryCard: {
      width: (width - theme.spacing.lg * 2 - theme.spacing.sm) / 2,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
    },
    categoryIcon: {
      width: 56,
      height: 56,
      borderRadius: theme.borderRadius.lg,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
    },
    skeletonText: {
      borderRadius: 4,
      marginBottom: 4,
    },
  });

export default ModernHomeScreen;