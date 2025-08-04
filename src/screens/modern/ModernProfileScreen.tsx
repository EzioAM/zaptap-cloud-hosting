import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUnifiedTheme, useThemedStyles } from '../../contexts/UnifiedThemeProvider';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { signOut } from '../../store/slices/authSlice';
import { useGetMyAutomationsQuery, useGetPublicAutomationsQuery } from '../../store/api/automationApi';
import { useUserRole } from '../../hooks/useUserRole';
import { DeveloperSection } from '../../components/developer/DeveloperSection';
import { Theme } from '../../theme';
import { commonStyles, createTextStyle } from '../../utils/ThemeUtils';

const ModernProfileScreen = () => {
  const { theme, themeMode, setThemeMode } = useUnifiedTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isDeveloper } = useUserRole();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);

  const styles = useThemedStyles(createStyles);

  // Load notification settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Use the same settings storage as SettingsScreen
        const savedSettings = await AsyncStorage.getItem('app_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setNotificationsEnabled(settings.notifications ?? true);
        }
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Save notification settings when changed
  const handleNotificationChange = async (value: boolean) => {
    setNotificationsEnabled(value);
    try {
      // Load current settings and update only notifications
      const savedSettings = await AsyncStorage.getItem('app_settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.notifications = value;
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };
  
  // Fetch user's automations to calculate stats
  const { 
    data: myAutomations = [], 
    isLoading: isLoadingMy, 
    refetch: refetchMyAutomations 
  } = useGetMyAutomationsQuery();
  const { 
    data: publicAutomations = [], 
    isLoading: isLoadingPublic, 
    refetch: refetchPublicAutomations 
  } = useGetPublicAutomationsQuery();

  // Add refresh functionality
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchMyAutomations(),
        refetchPublicAutomations()
      ]);
    } catch (error) {
      console.error('Failed to refresh profile data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Calculate real stats from user's data
  const userPublicAutomations = React.useMemo(() => 
    publicAutomations.filter(automation => automation.created_by === user?.id),
    [publicAutomations, user?.id]
  );
  
  // Calculate rank based on activity
  const getRank = (automationCount: number, sharedCount: number) => {
    if (automationCount >= 50 || sharedCount >= 20) return 'Expert';
    if (automationCount >= 20 || sharedCount >= 10) return 'Power User';
    if (automationCount >= 10 || sharedCount >= 5) return 'Contributor';
    if (automationCount >= 5) return 'Active User';
    return 'Beginner';
  };
  
  // Format join date
  const formatJoinDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };
  
  // Calculate estimated downloads and votes
  const totalEstimatedDownloads = userPublicAutomations.reduce((sum, automation) => {
    const daysOld = Math.floor((new Date().getTime() - new Date(automation.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return sum + Math.max(10, daysOld * 3); // Estimate 3 downloads per day
  }, 0);
  
  const totalEstimatedVotes = userPublicAutomations.reduce((sum, automation) => {
    const daysOld = Math.floor((new Date().getTime() - new Date(automation.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return sum + Math.max(5, daysOld * 2); // Estimate 2 votes per day
  }, 0);

  const contributionStats = React.useMemo(() => ({
    automationsCreated: myAutomations.length,
    automationsShared: userPublicAutomations.length,
    totalDownloads: totalEstimatedDownloads,
    helpfulVotes: totalEstimatedVotes,
    rank: getRank(myAutomations.length, userPublicAutomations.length),
    joinDate: formatJoinDate(user?.created_at),
  }), [myAutomations.length, userPublicAutomations.length, totalEstimatedDownloads, totalEstimatedVotes, user?.created_at]);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => dispatch(signOut()),
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => console.log('Delete account'),
        },
      ],
    );
  };

  const menuItems = [
    {
      id: 'edit-profile',
      title: 'Edit Profile',
      icon: 'account-edit',
      onPress: () => navigation.navigate('EditProfile' as never),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'bell',
      rightElement: (
        <Switch
          value={notificationsEnabled}
          onValueChange={handleNotificationChange}
          trackColor={{ 
            false: theme.colors.surface.secondary, 
            true: theme.colors.brand.primary 
          }}
          thumbColor={notificationsEnabled ? theme.colors.text.inverse : theme.colors.surface.elevated}
          accessibilityLabel="Toggle notifications"
          accessibilityHint="Enables or disables push notifications for this app"
        />
      ),
    },
    {
      id: 'theme',
      title: 'Theme',
      icon: 'theme-light-dark',
      rightElement: (
        <View style={styles.themeSelector}>
          {['light', 'dark', 'system'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.themeOption,
                {
                  backgroundColor: themeMode === mode
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                },
              ]}
              onPress={() => setThemeMode(mode as any)}
            accessibilityRole="button"
            accessibilityLabel={`Set theme to ${mode}`}
            accessibilityState={{ selected: themeMode === mode }}
            >
              <Text
                style={[
                  styles.themeOptionText,
                  { color: themeMode === mode ? '#FFFFFF' : theme.colors.text },
                ]}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      icon: 'shield-lock',
      onPress: () => navigation.navigate('Privacy' as never),
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'help-circle',
      onPress: () => navigation.navigate('Help' as never),
    },
    {
      id: 'feedback',
      title: 'Send Feedback',
      icon: 'message-draw',
      onPress: () => navigation.navigate('Feedback' as never),
    },
    {
      id: 'rate',
      title: 'Rate ZapTap',
      icon: 'star',
      onPress: () => console.log('Rate app'),
    },
    {
      id: 'about',
      title: 'About',
      icon: 'information',
      onPress: () => navigation.navigate('About' as never),
    },
  ];

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.signInPrompt}>
          <MaterialCommunityIcons
            name="account-circle"
            size={80}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.signInTitle, { color: theme.colors.text }]}>
            Sign in to ZapTap
          </Text>
          <Text style={[styles.signInDescription, { color: theme.colors.textSecondary }]}>
            Create an account to save your automations and share with the community
          </Text>
          <TouchableOpacity
            style={[styles.signInButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('SignIn' as never)}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Profile
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings' as never)}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            accessibilityHint="Navigate to app settings screen"
          >
            <MaterialCommunityIcons
              name="cog"
              size={24}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.name || 'User'}
          </Text>
          <Text style={[styles.userEmail, { color: theme.colors.text.secondary }]}>
            {user?.email || 'email@example.com'}
          </Text>
          <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary + '20' }]}>
            <MaterialCommunityIcons
              name="crown"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={[styles.rankText, { color: theme.colors.primary }]}>
              {contributionStats.rank}
            </Text>
          </View>
        </View>

        {/* Contribution Stats */}
        <View style={styles.statsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Contribution Stats
            </Text>
            {(isLoadingMy || isLoadingPublic) && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons
                name="robot"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {contributionStats.automationsCreated}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Created
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons
                name="share-variant"
                size={24}
                color={theme.colors.success}
              />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {contributionStats.automationsShared}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Shared
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons
                name="download"
                size={24}
                color={theme.colors.info}
              />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {contributionStats.totalDownloads}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Downloads
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <MaterialCommunityIcons
                name="thumb-up"
                size={24}
                color={theme.colors.warning}
              />
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                {contributionStats.helpfulVotes}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Helpful
              </Text>
            </View>
          </View>
          <Text style={[styles.joinDate, { color: theme.colors.textSecondary }]}>
            Member since {contributionStats.joinDate}
          </Text>
        </View>

        {/* Developer Section - Only for developers */}
        {isDeveloper && (
          <DeveloperSection navigation={navigation} theme={theme} />
        )}

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, { backgroundColor: theme.colors.surface.primary }]}
              onPress={item.onPress}
              activeOpacity={theme.constants.activeOpacity}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityHint={`Open ${item.title.toLowerCase()} screen`}
            >
              <View style={styles.menuItemLeft}>
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color={theme.colors.text}
                />
                <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>
                  {item.title}
                </Text>
              </View>
              {item.rightElement || (
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out & Delete Account */}
        <View style={styles.dangerSection}>
          <TouchableOpacity
            style={[styles.dangerButton, { borderColor: theme.colors.semantic.error }]}
            onPress={handleSignOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityHint="Sign out of your account"
          >
            <MaterialCommunityIcons
              name="logout"
              size={20}
              color={theme.colors.error}
            />
            <Text style={[styles.dangerButtonText, { color: theme.colors.error }]}>
              Sign Out
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccount}
          >
            <Text style={[styles.deleteAccountText, { color: theme.colors.textSecondary }]}>
              Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.footer}>
          <Text style={[styles.appVersion, { color: theme.colors.textSecondary }]}>
            ZapTap v2.3.1
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: Theme) =>
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
    headerTitle: {
      ...createTextStyle(theme, '3xl', 'bold'),
    },
    settingsButton: {
      width: theme.accessibility.minTouchTarget,
      height: theme.accessibility.minTouchTarget,
      borderRadius: theme.tokens.borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface.primary,
    },
    profileSection: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: theme.borderRadius.round,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    avatarText: {
      ...createTextStyle(theme, '3xl', 'semibold', theme.colors.text.inverse),
    },
    userName: {
      ...createTextStyle(theme, 'xl', 'semibold'),
      marginBottom: theme.spacing.xs,
    },
    userEmail: {
      fontSize: 16,
      marginBottom: theme.spacing.md,
    },
    rankBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.round,
    },
    rankText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: theme.spacing.xs,
    },
    statsSection: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
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
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    statCard: {
      flex: 1,
      minWidth: '48%',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1,
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
    joinDate: {
      fontSize: 14,
      textAlign: 'center',
    },
    menuSection: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuItemTitle: {
      fontSize: 16,
      marginLeft: theme.spacing.md,
    },
    themeSelector: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    themeOption: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    themeOptionText: {
      fontSize: 12,
      fontWeight: '600',
    },
    dangerSection: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1.5,
      marginBottom: theme.spacing.md,
    },
    dangerButtonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: theme.spacing.sm,
    },
    deleteAccountButton: {
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    deleteAccountText: {
      fontSize: 14,
      textDecorationLine: 'underline',
    },
    footer: {
      alignItems: 'center',
      paddingBottom: theme.spacing.xl,
    },
    appVersion: {
      fontSize: 12,
    },
    signInPrompt: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    signInTitle: {
      fontSize: 24,
      fontWeight: '600',
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    signInDescription: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    signInButton: {
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.round,
    },
    signInButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });

export default ModernProfileScreen;