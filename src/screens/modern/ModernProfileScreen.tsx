import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from 'react';
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
  Animated,
  Platform,
  Dimensions,
  InteractionManager,
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { signOut } from '../../store/slices/authSlice';
import { useGetMyAutomationsQuery, useGetPublicAutomationsQuery } from '../../store/api/automationApi';
import { useUserRole } from '../../hooks/useUserRole';
import { useConnection } from '../../contexts/ConnectionContext';
import * as Haptics from 'expo-haptics';
import { NavigationHelper } from '../../services/navigation/NavigationHelper';

// Components
import { DeveloperSection } from '../../components/developer/DeveloperSection';
import { AnimatedStatsGrid } from '../../components/profile/AnimatedStatsGrid';
import { AchievementSystem } from '../../components/profile/AchievementSystem';
import { ActivityTimeline } from '../../components/profile/ActivityTimeline';
import { SafeAnimatedMenuSection } from '../../components/profile/SafeAnimatedMenuItem';
import { PressableAnimated, FeedbackAnimation } from '../../components/automation/AnimationHelpers';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';

// Enhanced components
import { GradientHeader } from '../../components/shared/GradientHeader';
import { EmptyStateIllustration } from '../../components/shared/EmptyStateIllustration';

// Theme imports
import { gradients, glassEffects, getGlassStyle } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';
import { ANIMATION_CONFIG } from '../../constants/animations';
import { EventLogger } from '../../utils/EventLogger';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Feature flags for progressive enhancement
const FEATURE_FLAGS = {
  ENHANCED_ANIMATIONS: Platform.OS !== 'web',
  HAPTIC_FEEDBACK: Platform.OS !== 'web',
  BLUR_EFFECTS: Platform.OS !== 'web',
  GRADIENT_HEADERS: true,
  STAGGERED_ANIMATIONS: Platform.OS !== 'web',
  ACHIEVEMENT_SYSTEM: true,
  ACTIVITY_TIMELINE: true,
  SHARING: Platform.OS !== 'web',
  DEVELOPER_MODE: true,
};

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  gradientKey: keyof typeof gradients;
}

interface ActivityItem {
  id: string;
  type: 'created' | 'shared' | 'earned' | 'review';
  title: string;
  timestamp: Date;
  icon: string;
}

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  gradientKey?: keyof typeof gradients;
  items: string[];
}

const ModernProfileScreen: React.FC = memo(() => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isOnline, isBackendConnected } = useConnection();
  const isConnected = isOnline && isBackendConnected;
  const { isDeveloper } = useUserRole();
  
  // State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | 'warning'>('success');
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'activity'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const profileCompletion = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const tabSwitchAnim = useRef(new Animated.Value(0)).current;

  // API queries
  const {
    data: myAutomations = [],
    isLoading: isLoadingMyAutomations,
    refetch: refetchMyAutomations,
    error: myAutomationsError,
    isUninitialized: myAutomationsUninitialized,
  } = useGetMyAutomationsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const {
    data: publicAutomations = [],
    refetch: refetchPublicAutomations,
    error: publicAutomationsError,
    isUninitialized: publicAutomationsUninitialized,
  } = useGetPublicAutomationsQuery({}, {
    skip: false, // Allow public endpoints to work without authentication
  });

  // Filter my public automations
  const myPublicAutomations = useMemo(() => {
    return publicAutomations.filter(
      automation => automation.author === user?.email
    ) || [];
  }, [publicAutomations, user?.email]);

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

  const showFeedbackMessage = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    setFeedbackType(type);
    setFeedbackMessage(message);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
  }, []);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('app_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setNotificationsEnabled(settings.notifications ?? true);
          setDarkMode(settings.darkMode ?? false);
        }
      } catch (error) {
        EventLogger.error('ModernProfile', 'Failed to load settings:', error as Error);
        showFeedbackMessage('error', 'Failed to load settings');
      }
    };
    loadSettings();
  }, [showFeedbackMessage]);

  // Profile completion calculation and animation
  useEffect(() => {
    const calculateCompletion = () => {
      let completedFields = 0;
      const totalFields = 5;
      
      if (user?.email) completedFields++;
      if (user?.user_metadata?.full_name) completedFields++;
      if (user?.user_metadata?.avatar_url) completedFields++;
      if (myAutomations.length > 0) completedFields++;
      if (myPublicAutomations.length > 0) completedFields++;
      
      const completionPercentage = completedFields / totalFields;
      
      if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
        Animated.timing(profileCompletion, {
          toValue: completionPercentage,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      } else {
        profileCompletion.setValue(completionPercentage);
      }
      
      return completionPercentage;
    };

    if (user) {
      calculateCompletion();
    }
  }, [user, myAutomations, myPublicAutomations, profileCompletion]);

  // Tab switch animation
  const handleTabSwitch = useCallback((tab: typeof activeTab) => {
    if (tab === activeTab) return;
    
    triggerHaptic('light');
    
    if (FEATURE_FLAGS.ENHANCED_ANIMATIONS) {
      Animated.sequence([
        Animated.timing(tabSwitchAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(tabSwitchAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    setActiveTab(tab);
  }, [activeTab, triggerHaptic, tabSwitchAnim]);

  // Scroll animation handler
  const handleScroll = useCallback(
    FEATURE_FLAGS.ENHANCED_ANIMATIONS
      ? (event: any) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          
          // Update scroll Y for animations
          scrollY.setValue(offsetY);
          
          // Update header opacity
          const opacity = Math.max(0, Math.min(1, 1 - offsetY / 200));
          headerOpacity.setValue(opacity);
        }
      : undefined,
    [scrollY, headerOpacity]
  );

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (!isConnected) {
      showFeedbackMessage('warning', 'No internet connection');
      return;
    }

    try {
      setRefreshing(true);
      triggerHaptic('medium');
      
      // Only refetch queries that have been initialized
      const refetchPromises: Promise<any>[] = [];
      
      if (!myAutomationsUninitialized && isAuthenticated) {
        refetchPromises.push(refetchMyAutomations());
      }
      
      if (!publicAutomationsUninitialized) {
        refetchPromises.push(refetchPublicAutomations());
      }
      
      if (refetchPromises.length > 0) {
        await Promise.all(refetchPromises);
      }
      
      showFeedbackMessage('success', 'Profile refreshed');
    } catch (error) {
      EventLogger.error('ModernProfile', 'Refresh failed:', error as Error);
      showFeedbackMessage('error', 'Failed to refresh profile');
      setError('Failed to refresh profile');
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, refetchMyAutomations, refetchPublicAutomations, myAutomationsUninitialized, publicAutomationsUninitialized, isAuthenticated, triggerHaptic, showFeedbackMessage]);

  // Settings handlers
  const handleNotificationToggle = useCallback(async (value: boolean) => {
    try {
      triggerHaptic('light');
      setNotificationsEnabled(value);
      
      const settings = {
        notifications: value,
        darkMode,
      };
      
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
      showFeedbackMessage('success', `Notifications ${value ? 'enabled' : 'disabled'}`);
    } catch (error) {
      EventLogger.error('ModernProfile', 'Failed to save notification setting:', error as Error);
      showFeedbackMessage('error', 'Failed to save setting');
      setNotificationsEnabled(!value); // Revert on error
    }
  }, [darkMode, triggerHaptic, showFeedbackMessage]);

  const handleDarkModeToggle = useCallback(async (value: boolean) => {
    try {
      triggerHaptic('light');
      setDarkMode(value);
      
      const settings = {
        notifications: notificationsEnabled,
        darkMode: value,
      };
      
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
      showFeedbackMessage('success', `${value ? 'Dark' : 'Light'} mode enabled`);
    } catch (error) {
      EventLogger.error('ModernProfile', 'Failed to save dark mode setting:', error as Error);
      showFeedbackMessage('error', 'Failed to save setting');
      setDarkMode(!value); // Revert on error
    }
  }, [notificationsEnabled, triggerHaptic, showFeedbackMessage]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic('heavy');
              await dispatch(signOut()).unwrap();
              NavigationHelper.reset([{ name: 'MainTabs' }]);
              showFeedbackMessage('success', 'Signed out successfully');
            } catch (error) {
              EventLogger.error('ModernProfile', 'Sign out error:', error as Error);
              showFeedbackMessage('error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  }, [dispatch, navigation, triggerHaptic, showFeedbackMessage]);

  const handleShareProfile = useCallback(async () => {
    if (!FEATURE_FLAGS.SHARING) {
      showFeedbackMessage('warning', 'Sharing not available on this platform');
      return;
    }

    try {
      triggerHaptic('light');
      
      const shareContent = {
        title: `${user?.user_metadata?.full_name || user?.email}'s Profile`,
        message: `Check out my automation profile on ShortcutsLike!`,
        url: `https://shortcutslike.app/profile/${user?.id}`, // Replace with actual URL
      };

      await Share.share(shareContent);
    } catch (error) {
      EventLogger.error('ModernProfile', 'Error sharing profile:', error as Error);
      showFeedbackMessage('error', 'Failed to share profile');
    }
  }, [user, triggerHaptic, showFeedbackMessage]);

  // Calculate profile stats
  const profileStats = useMemo(() => {
    // If not authenticated, return empty stats
    if (!isAuthenticated || !user) {
      return {
        automations: 0,
        publicAutomations: 0,
        totalRuns: 0,
        totalLikes: 0,
        avgRating: 0,
        completionPercentage: 0,
      };
    }
    
    const totalRuns = myAutomations.reduce((sum, automation) => sum + (automation.totalRuns || 0), 0);
    const totalLikes = myPublicAutomations.reduce((sum, automation) => sum + (automation.likes || 0), 0);
    const avgRating = myPublicAutomations.length > 0 
      ? myPublicAutomations.reduce((sum, automation) => sum + (automation.rating || 0), 0) / myPublicAutomations.length
      : 0;

    return {
      automations: myAutomations.length,
      publicAutomations: myPublicAutomations.length,
      totalRuns,
      totalLikes,
      avgRating,
      completionPercentage: Math.round((profileCompletion as any)._value * 100),
    };
  }, [myAutomations, myPublicAutomations, profileCompletion, isAuthenticated, user]);

  // Authentication check - disabled for demo
  // if (!isAuthenticated || !user) {
  //   return (
  //     <ErrorState
  //       title="Authentication Required"
  //       description="Please sign in to access your profile"
  //       action={{
  //         label: "Sign In",
  //         onPress: () => navigation.navigate('Auth' as never),
  //       }}
  //     />
  //   );
  // }

  // Error state
  if ((myAutomationsError || publicAutomationsError) && !isConnected) {
    return (
      <ErrorState
        title="Connection Error"
        description="Unable to load profile data. Please check your connection."
        action={{
          label: "Retry",
          onPress: handleRefresh,
        }}
      />
    );
  }

  // Loading state
  if (isLoadingMyAutomations && myAutomations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        {FEATURE_FLAGS.GRADIENT_HEADERS ? (
          <GradientHeader title="Profile" />
        ) : (
          <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              Profile
            </Text>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      {FEATURE_FLAGS.GRADIENT_HEADERS ? (
        <Animated.View style={{ opacity: headerOpacity }}>
          <GradientHeader 
            title="Profile" 
            rightComponent={
              FEATURE_FLAGS.SHARING ? (
                <TouchableOpacity onPress={handleShareProfile}>
                  <MaterialCommunityIcons name="share" size={24} color="white" />
                </TouchableOpacity>
              ) : undefined
            }
          />
        </Animated.View>
      ) : (
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Profile
          </Text>
          {FEATURE_FLAGS.SHARING && (
            <TouchableOpacity onPress={handleShareProfile}>
              <MaterialCommunityIcons 
                name="share" 
                size={24} 
                color={theme.colors.onSurface} 
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
        >
          {/* Profile Header Card */}
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {user?.user_metadata?.avatar_url ? (
                  <Image
                    source={{ uri: user.user_metadata.avatar_url }}
                    style={styles.avatar}
                  />
                ) : (
                  <LinearGradient
                    colors={['#FF6B6B', '#FF8E53']}
                    style={[styles.avatar, styles.avatarPlaceholder]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.avatarInitial}>
                      {user?.email?.charAt(0)?.toUpperCase() || user?.user_metadata?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </LinearGradient>
                )}
                <View style={styles.completionBadge}>
                  <Animated.View
                    style={[
                      styles.completionBar,
                      {
                        width: profileCompletion.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {isAuthenticated && user?.user_metadata?.full_name 
                    ? user.user_metadata.full_name
                    : isAuthenticated && user?.email
                    ? user.email.split('@')[0]
                    : 'Guest User'
                  }
                </Text>
                <Text style={styles.profileEmail}>
                  {isAuthenticated && user?.email ? user.email : 'Not signed in'}
                </Text>
                <Text style={styles.profileCompletion}>
                  {profileStats.completionPercentage}% Complete
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* Guest User Message */}
          {!isAuthenticated && (
            <View style={[styles.guestMessage, { backgroundColor: theme.colors.surfaceVariant }]}>
              <MaterialCommunityIcons 
                name="account-plus" 
                size={32} 
                color={theme.colors.primary}
              />
              <Text style={[styles.guestMessageTitle, { color: theme.colors.onSurface }]}>
                Sign in to unlock features
              </Text>
              <Text style={[styles.guestMessageText, { color: theme.colors.onSurfaceVariant }]}>
                Create automations, share with others, and track your progress
              </Text>
            </View>
          )}
          
          {/* Stats Grid */}
          {FEATURE_FLAGS.STAGGERED_ANIMATIONS ? (
            <AnimatedStatsGrid
              stats={[
                { label: 'Automations', value: profileStats.automations, icon: 'robot' },
                { label: 'Public', value: profileStats.publicAutomations, icon: 'earth' },
                { label: 'Total Runs', value: profileStats.totalRuns, icon: 'play' },
                { label: 'Likes', value: profileStats.totalLikes, icon: 'heart' },
              ]}
              theme={theme}
            />
          ) : (
            <View style={styles.statsGrid}>
              {[
                { label: 'Automations', value: profileStats.automations, icon: 'robot' },
                { label: 'Public', value: profileStats.publicAutomations, icon: 'earth' },
                { label: 'Total Runs', value: profileStats.totalRuns, icon: 'play' },
                { label: 'Likes', value: profileStats.totalLikes, icon: 'heart' },
              ].map((stat, index) => (
                <View key={index} style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                  <MaterialCommunityIcons 
                    name={stat.icon as any} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                  <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                    {stat.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Tab Navigation */}
          <View style={[styles.tabContainer, { backgroundColor: theme.colors.surface }]}>
            {(['overview', 'achievements', 'activity'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => handleTabSwitch(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: activeTab === tab 
                        ? theme.colors.onPrimary 
                        : theme.colors.onSurfaceVariant
                    },
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <Animated.View 
            style={[
              styles.tabContent,
              FEATURE_FLAGS.ENHANCED_ANIMATIONS && {
                opacity: tabSwitchAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.5],
                }),
              }
            ]}
          >
            {activeTab === 'overview' && (
              <View>
                <SafeAnimatedMenuSection
                  section={{
                    title: "Account",
                    items: [
                      {
                        icon: 'account-edit',
                        label: 'Edit Profile',
                        onPress: () => navigation.navigate('EditProfile' as never),
                      },
                      {
                        icon: 'cog',
                        label: 'Settings',
                        onPress: () => navigation.navigate('Settings' as never),
                      },
                    ],
                    collapsible: false,
                    initiallyExpanded: true,
                  }}
                  sectionIndex={0}
                  theme={theme}
                />
                
                {/* Settings Section */}
                <SafeAnimatedMenuSection
                  section={{
                    title: "Preferences",
                    items: [
                      {
                        icon: 'bell',
                        label: 'Notifications',
                        type: 'switch' as const,
                        value: notificationsEnabled,
                        onValueChange: handleNotificationToggle,
                      },
                      {
                        icon: 'theme-light-dark',
                        label: 'Dark Mode',
                        type: 'switch' as const,
                        value: darkMode,
                        onValueChange: handleDarkModeToggle,
                      },
                      {
                        icon: 'shield-account',
                        label: 'Privacy & Security',
                        onPress: () => navigation.navigate('Privacy' as never),
                      },
                      {
                        icon: 'help-circle',
                        label: 'Help & Support',
                        onPress: () => navigation.navigate('Help' as never),
                      },
                    ],
                    collapsible: false,
                    initiallyExpanded: true,
                  }}
                  sectionIndex={0}
                  theme={theme}
                />

                {/* Developer Section */}
                {FEATURE_FLAGS.DEVELOPER_MODE && isDeveloper && (
                  <DeveloperSection navigation={navigation} theme={theme} />
                )}

                {/* Sign Out Button - Only show if authenticated */}
                {isAuthenticated && user && (
                  <View style={styles.signOutContainer}>
                    <TouchableOpacity
                      style={[styles.signOutButton, { backgroundColor: '#F44336' }]}
                      onPress={handleSignOut}
                    >
                      <Text style={[styles.signOutButtonText, { color: 'white' }]}>
                        Sign Out
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                {/* Sign In Button - Show if not authenticated */}
                {!isAuthenticated && (
                  <View style={styles.signOutContainer}>
                    <TouchableOpacity
                      style={[styles.signOutButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => navigation.navigate('SignIn' as never)}
                    >
                      <Text style={[styles.signOutButtonText, { color: 'white' }]}>
                        Sign In
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'achievements' && FEATURE_FLAGS.ACHIEVEMENT_SYSTEM && (
              <AchievementSystem 
                theme={theme}
                userStats={profileStats}
              />
            )}

            {activeTab === 'activity' && FEATURE_FLAGS.ACTIVITY_TIMELINE && (
              <ActivityTimeline
                activities={[]} // Pass empty array to prevent undefined error
                onActivityPress={(activity) => {
                  // Handle activity press
                  console.log('Activity pressed:', activity);
                }}
              />
            )}
          </Animated.View>

          {/* Connection Status */}
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
      </Animated.View>

      {/* Feedback */}
      {showFeedback && (
        <FeedbackAnimation
          type={feedbackType}
          message={feedbackMessage}
          visible={showFeedback}
        />
      )}
    </SafeAreaView>
  );
});

ModernProfileScreen.displayName = 'ModernProfileScreen';

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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  profileCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  completionBadge: {
    position: 'absolute',
    bottom: 0,
    right: 16,
    width: 30,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  completionBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  profileCompletion: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: (screenWidth - 64) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  signOutContainer: {
    marginTop: 40,
    marginBottom: 20,
  },
  signOutButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
  guestMessage: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  guestMessageTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  guestMessageText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ModernProfileScreen;