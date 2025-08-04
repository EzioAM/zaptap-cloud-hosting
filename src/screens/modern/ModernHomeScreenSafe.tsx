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
import { useSafeTheme, useThemedStylesSafe } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useGetMyAutomationsQuery, useGetUserStatsQuery, useGetRecentExecutionsQuery } from '../../store/api/automationApi';
import ComponentErrorBoundary from '../../components/common/ComponentErrorBoundary';
import EnhancedLoadingSkeleton from '../../components/common/EnhancedLoadingSkeleton';
import { useCleanup } from '../../hooks/useCleanup';

const { width } = Dimensions.get('window');

const ModernHomeScreenSafe = React.memo(() => {
  const theme = useSafeTheme();
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

  const styles = useThemedStylesSafe(createStyles);

  // Memoized icon mappings to prevent recreation on every render
  const categoryIcons = useMemo(() => ({
    'Productivity': 'briefcase',
    'Smart Home': 'home-automation',
    'Social': 'share-variant',
    'Health': 'heart-pulse',
  }), []);

  const statusColors = useMemo(() => ({
    'success': '#4CAF50',
    'error': '#F44336',
    'running': '#FF9800',
  }), []);

  const statusIcons = useMemo(() => ({
    'success': 'check-circle',
    'error': 'alert-circle',
    'running': 'clock-outline',
  }), []);

  const navigateToAutomation = useCallback((automationId: string) => {
    navigation.navigate('AutomationDetails', { automationId });
  }, [navigation]);

  const shareAutomation = useCallback(async (automation: any) => {
    try {
      await Share.share({
        message: `Check out my automation: ${automation.name}`,
        title: automation.name,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share automation');
    }
  }, []);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={[styles.welcomeText, { color: theme.colors.text.secondary }]}>
          Welcome back,
        </Text>
        <Text style={[styles.userName, { color: theme.colors.text.primary }]}>
          {user?.user_metadata?.display_name || 'Friend'}
        </Text>
      </View>
      <TouchableOpacity style={styles.notificationButton}>
        <MaterialCommunityIcons 
          name="bell-outline" 
          size={24} 
          color={theme.colors.text.primary} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderCTACard = () => (
    <TouchableOpacity 
      style={[styles.ctaCard, { backgroundColor: theme.colors.brand.primary }]}
      onPress={() => navigation.navigate('BuildTab')}
      activeOpacity={0.9}
    >
      <View style={styles.ctaContent}>
        <MaterialCommunityIcons 
          name="lightning-bolt" 
          size={32} 
          color="#FFFFFF" 
        />
        <View style={styles.ctaTextContainer}>
          <Text style={[styles.ctaTitle, { color: '#FFFFFF' }]}>
            Create Your First Automation
          </Text>
          <Text style={[styles.ctaSubtitle, { color: 'rgba(255, 255, 255, 0.8)' }]}>
            Start saving time today
          </Text>
        </View>
      </View>
      <MaterialCommunityIcons 
        name="chevron-right" 
        size={24} 
        color="rgba(255, 255, 255, 0.8)" 
      />
    </TouchableOpacity>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <MaterialCommunityIcons 
          name="lightning-bolt" 
          size={24} 
          color={theme.colors.brand.primary} 
        />
        <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
          {stats.automations}
        </Text>
        <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
          Automations
        </Text>
      </View>
      
      <View style={styles.statCard}>
        <MaterialCommunityIcons 
          name="play-circle" 
          size={24} 
          color={theme.colors.semantic.success} 
        />
        <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
          {stats.totalRuns}
        </Text>
        <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
          Total Runs
        </Text>
      </View>
      
      <View style={styles.statCard}>
        <MaterialCommunityIcons 
          name="clock-fast" 
          size={24} 
          color={theme.colors.semantic.info} 
        />
        <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
          {stats.timeSaved}m
        </Text>
        <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
          Time Saved
        </Text>
      </View>
    </View>
  );

  const renderFeaturedCategories = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Explore by Category
      </Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {featuredCategories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryCard,
              { backgroundColor: theme.colors.surface.elevated }
            ]}
            onPress={() => navigation.navigate('DiscoverTab', { category: category.name })}
            activeOpacity={0.7}
          >
            <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
              <MaterialCommunityIcons 
                name={category.icon} 
                size={28} 
                color={category.color} 
              />
            </View>
            <Text style={[styles.categoryName, { color: theme.colors.text.primary }]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderRecentAutomations = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Recent Automations
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('LibraryTab')}>
          <Text style={[styles.seeAllText, { color: theme.colors.brand.primary }]}>
            See All
          </Text>
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <EnhancedLoadingSkeleton />
      ) : recentAutomations.length > 0 ? (
        recentAutomations.map((automation) => (
          <TouchableOpacity
            key={automation.id}
            style={[
              styles.automationCard,
              { backgroundColor: theme.colors.surface.primary }
            ]}
            onPress={() => navigateToAutomation(automation.id)}
            activeOpacity={0.7}
          >
            <View style={styles.automationIcon}>
              <MaterialCommunityIcons 
                name={categoryIcons[automation.category] || 'lightning-bolt'} 
                size={24} 
                color={theme.colors.brand.primary} 
              />
            </View>
            
            <View style={styles.automationInfo}>
              <Text style={[styles.automationName, { color: theme.colors.text.primary }]}>
                {automation.name}
              </Text>
              <Text style={[styles.automationCategory, { color: theme.colors.text.secondary }]}>
                {automation.category} • {automation.triggers?.length || 0} triggers
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => shareAutomation(automation)}
              style={styles.shareButton}
            >
              <MaterialCommunityIcons 
                name="share-variant" 
                size={20} 
                color={theme.colors.text.secondary} 
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
            No automations yet
          </Text>
        </View>
      )}
    </View>
  );

  const renderRecentActivity = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
        Recent Activity
      </Text>
      
      {executionsLoading ? (
        <EnhancedLoadingSkeleton count={2} height={60} />
      ) : recentActivity.length > 0 ? (
        recentActivity.map((item) => (
          <View 
            key={item.id} 
            style={[
              styles.activityItem,
              { backgroundColor: theme.colors.surface.primary }
            ]}
          >
            <View style={[
              styles.activityIndicator,
              { backgroundColor: statusColors[item.status] + '20' }
            ]}>
              <MaterialCommunityIcons 
                name={statusIcons[item.status]} 
                size={20} 
                color={statusColors[item.status]} 
              />
            </View>
            
            <View style={styles.activityInfo}>
              <Text style={[styles.activityName, { color: theme.colors.text.primary }]}>
                {item.automation?.name || 'Unknown Automation'}
              </Text>
              <Text style={[styles.activityTime, { color: theme.colors.text.secondary }]}>
                {getRelativeTime(item.execution.created_at)}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
            No recent activity
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <ComponentErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.colors.brand.primary}
            />
          }
        >
          {renderHeader()}
          {myAutomations.length === 0 && renderCTACard()}
          {renderStats()}
          {renderFeaturedCategories()}
          {renderRecentAutomations()}
          {renderRecentActivity()}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </ComponentErrorBoundary>
  );
});

// Create styles with fallback theme structure
const createStyles = (theme: any) => {
  // Provide defaults for potentially missing properties
  const borderRadius = theme.borderRadius || {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 999,
  };
  
  // Fix typography structure to match what the styles expect
  const typography = {
    body: {
      fontSize: theme.typography?.body1?.fontSize || 16,
      fontWeight: '400',
    },
    h2: {
      fontSize: theme.typography?.h2?.fontSize || 28,
      fontWeight: '700',
    },
    h3: {
      fontSize: theme.typography?.h3?.fontSize || 24,
      fontWeight: '600',
    },
    h4: {
      fontSize: theme.typography?.h4?.fontSize || 20,
      fontWeight: '600',
    },
  };
  
  const spacing = theme.spacing || {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  };

  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    headerContent: {
      flex: 1,
    },
    welcomeText: {
      fontSize: typography.body.fontSize,
      fontWeight: typography.body.fontWeight as any,
    },
    userName: {
      fontSize: typography.h2.fontSize,
      fontWeight: typography.h2.fontWeight as any,
      marginTop: spacing.xs,
    },
    notificationButton: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface.primary,
    },
    ctaCard: {
      marginHorizontal: spacing.lg,
      padding: spacing.lg,
      borderRadius: borderRadius.xl,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
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
      marginLeft: spacing.md,
      flex: 1,
    },
    ctaTitle: {
      fontSize: typography.h4.fontSize,
      fontWeight: typography.h4.fontWeight as any,
    },
    ctaSubtitle: {
      fontSize: 14,
      marginTop: 2,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      justifyContent: 'space-between',
    },
    statCard: {
      backgroundColor: theme.colors.surface.primary,
      flex: 1,
      marginHorizontal: spacing.xs,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: spacing.sm,
    },
    statLabel: {
      fontSize: 12,
      marginTop: spacing.xs,
    },
    section: {
      marginTop: spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.h3.fontSize,
      fontWeight: typography.h3.fontWeight as any,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: '600',
    },
    categoriesContainer: {
      paddingHorizontal: spacing.lg,
    },
    categoryCard: {
      width: 100,
      marginRight: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
    },
    categoryIcon: {
      width: 56,
      height: 56,
      borderRadius: borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    categoryName: {
      fontSize: 12,
      fontWeight: '500',
      textAlign: 'center',
    },
    automationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
    },
    automationIcon: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.round,
      backgroundColor: theme.colors.brand.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    automationInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    automationName: {
      fontSize: 16,
      fontWeight: '600',
    },
    automationCategory: {
      fontSize: 14,
      marginTop: 2,
    },
    shareButton: {
      padding: spacing.sm,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
    },
    activityIndicator: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activityInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    activityName: {
      fontSize: 14,
      fontWeight: '500',
    },
    activityTime: {
      fontSize: 12,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyStateText: {
      fontSize: 14,
    },
    bottomSpacer: {
      height: spacing.xl,
    },
  });
};

export default ModernHomeScreenSafe;