import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useNavigation } from '@react-navigation/native';
import { useRefreshDashboardMutation } from '../../store/api/dashboardApi';

// Import dashboard widgets
import {
  QuickStatsWidget,
  QuickActionsWidget,
  RecentActivityWidget,
  FeaturedAutomationWidget,
} from '../../components/organisms/DashboardWidgets';

const ModernHomeScreenSafe = React.memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDashboard] = useRefreshDashboardMutation();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshDashboard().unwrap();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };


  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={[styles.greeting, { color: theme.colors?.textSecondary || '#666' }]}>
          {getGreeting()},
        </Text>
        <Text style={[styles.userName, { color: theme.colors?.text || '#000' }]}>
          {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Friend'}
        </Text>
        <Text style={[styles.date, { color: theme.colors?.textSecondary || '#999' }]}>
          {formatDate()}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.notificationButton, { backgroundColor: theme.colors?.surface || '#f5f5f5' }]}
        onPress={() => navigation.navigate('Settings' as never)}
      >
        <MaterialCommunityIcons 
          name="cog-outline" 
          size={24} 
          color={theme.colors?.text || '#000'} 
        />
      </TouchableOpacity>
    </View>
  );


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f8f9fa' }]} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors?.primary || '#6200ee'}
            colors={[theme.colors?.primary || '#6200ee']}
          />
        }
      >
        {renderHeader()}
        
        <QuickStatsWidget />
        <QuickActionsWidget />
        <FeaturedAutomationWidget />
        <RecentActivityWidget />
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 100 : 90, // Account for bottom tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '400',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  date: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bottomSpacer: {
    height: 20,
  },
});

export default ModernHomeScreenSafe;