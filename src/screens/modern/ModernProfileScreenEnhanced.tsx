import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  RefreshControl,
  Platform,
  Dimensions,
  Animated,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { signOut } from '../../store/slices/authSlice';
import { useGetMyAutomationsQuery, useGetPublicAutomationsQuery } from '../../store/api/automationApi';
import { useUserRole } from '../../hooks/useUserRole';
import { DeveloperSection } from '../../components/developer/DeveloperSection';
import * as Haptics from 'expo-haptics';

// Shared Components
import { GradientHeader } from '../../components/shared/GradientHeader';
import { GradientCard } from '../../components/shared/GradientCard';
import { GradientButton } from '../../components/shared/GradientButton';
import { EmptyStateIllustration } from '../../components/shared/EmptyStateIllustration';

// Theme imports
import { gradients, glassEffects, getGlassStyle } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';
import { ANIMATION_CONFIG } from '../../constants/animations';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  gradientKey: keyof typeof gradients;
  items: string[];
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  joinedDate: string;
  stats: {
    automations: number;
    followers: number;
    following: number;
    successRate: number;
  };
  verified: boolean;
}

const ModernProfileScreenEnhanced = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isDeveloper } = useUserRole();
  
  // State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const avatarScale = useRef(new Animated.Value(1)).current;
  const statsAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // Data queries
  const {
    data: myAutomations,
    isLoading: isLoadingMyAutomations,
    refetch: refetchMyAutomations
  } = useGetMyAutomationsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const {
    data: publicAutomations,
    refetch: refetchPublicAutomations
  } = useGetPublicAutomationsQuery({}, {
    skip: !isAuthenticated,
  });

  const myPublicAutomations = publicAutomations?.filter(
    automation => automation.author === user?.email
  ) || [];

  // Sample data
  const userProfile: UserProfile = {
    id: '1',
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || 'user@example.com',
    avatar: '👤',
    bio: 'Automation enthusiast making life easier',
    joinedDate: '2024-01-15',
    stats: {
      automations: myAutomations?.length || 24,
      followers: 156,
      following: 89,
      successRate: 94,
    },
    verified: isDeveloper,
  };

  const achievements: Achievement[] = [
    {
      id: '1',
      title: 'Early Adopter',
      description: 'Joined in the first month',
      icon: '🎯',
      unlocked: true,
      progress: 100,
      gradientKey: 'aurora',
    },
    {
      id: '2',
      title: 'Power User',
      description: 'Created 25 automations',
      icon: '⚡',
      unlocked: false,
      progress: (userProfile.stats.automations / 25) * 100,
      gradientKey: 'fire',
    },
    {
      id: '3',
      title: 'Community Star',
      description: 'Received 100 likes',
      icon: '⭐',
      unlocked: false,
      progress: 75,
      gradientKey: 'sunset',
    },
    {
      id: '4',
      title: 'Innovation Master',
      description: 'Top 1% success rate',
      icon: '🚀',
      unlocked: userProfile.stats.successRate >= 95,
      progress: userProfile.stats.successRate,
      gradientKey: 'cosmic',
    },
  ];

  const recentActivity: ActivityItem[] = [
    {
      id: '1',
      type: 'created',
      title: 'Created "Morning Routine"',
      timestamp: new Date(Date.now() - 3600000),
      icon: 'plus-circle',
    },
    {
      id: '2',
      type: 'earned',
      title: 'Earned "Week Streak" badge',
      timestamp: new Date(Date.now() - 7200000),
      icon: 'trophy',
    },
    {
      id: '3',
      type: 'shared',
      title: 'Shared "Quick Tasks"',
      timestamp: new Date(Date.now() - 10800000),
      icon: 'share-variant',
    },
    {
      id: '4',
      type: 'review',
      title: 'Received 5-star review',
      timestamp: new Date(Date.now() - 14400000),
      icon: 'star',
    },
  ];

  const settingsItems: SettingsSection[] = [
    {
      id: 'account',
      title: 'Account Settings',
      icon: 'account-cog',
      gradientKey: 'primary',
      items: ['Edit Profile', 'Change Password', 'Email Preferences'],
    },
    {
      id: 'privacy',
      title: 'Privacy',
      icon: 'shield-lock',
      gradientKey: 'ocean',
      items: ['Profile Visibility', 'Data Sharing', 'Block List'],
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'bell',
      gradientKey: 'forest',
      items: ['Push Notifications', 'Email Alerts', 'Activity Updates'],
    },
    {
      id: 'support',
      title: 'Support',
      icon: 'help-circle',
      gradientKey: 'warning',
      items: ['Help Center', 'Contact Us', 'Report Issue'],
    },
  ];

  // Effects
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
        console.error('Failed to load notification settings:', error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      // Entry animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: ANIMATION_CONFIG.SPRING_TENSION,
          friction: ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        }),
        // Stagger stats animations
        Animated.stagger(200, statsAnimations.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: ANIMATION_CONFIG.SPRING_TENSION,
            friction: ANIMATION_CONFIG.SPRING_FRICTION,
            useNativeDriver: true,
          })
        )),
      ]).start();
    });
  }, []);

  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchMyAutomations(), refetchPublicAutomations()]);
    setRefreshing(false);
  };

  const handleNotificationToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationsEnabled(value);
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.notifications = value;
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const handleThemeToggle = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDarkMode(value);
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      const settings = savedSettings ? JSON.parse(savedSettings) : {};
      settings.darkMode = value;
      await AsyncStorage.setItem('app_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(avatarScale, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
    // TODO: Open image picker
  };

  const handleSignOut = () => {
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
              await dispatch(signOut()).unwrap();
              Alert.alert('Success', 'You have been signed out successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = currentTime.getTime();
    const diff = now - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const renderStatCard = (stat: any, index: number) => (
    <Animated.View
      key={index}
      style={[
        styles.statCard,
        {
          opacity: statsAnimations[index],
          transform: [
            {
              translateY: statsAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
            {
              scale: statsAnimations[index].interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
        },
      ]}
    >
      <GradientCard gradientKey={stat.gradientKey || 'primary'} style={styles.statCardInner}>
        <MaterialCommunityIcons name={stat.icon} size={24} color="#FFFFFF" />
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
        {stat.progress && (
          <View style={styles.progressRing}>
            {/* TODO: Add circular progress component */}
          </View>
        )}
      </GradientCard>
    </Animated.View>
  );

  const renderAchievement = (achievement: Achievement, index: number) => (
    <TouchableOpacity
      key={achievement.id}
      style={styles.achievementCard}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
    >
      <GradientCard
        gradientKey={achievement.gradientKey}
        style={[
          styles.achievementCardInner,
          !achievement.unlocked && styles.achievementLocked,
        ]}
      >
        <Text style={styles.achievementIcon}>{achievement.icon}</Text>
        <Text style={styles.achievementTitle}>{achievement.title}</Text>
        <Text style={styles.achievementDescription}>{achievement.description}</Text>
        
        {!achievement.unlocked && (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={gradients[achievement.gradientKey].colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  { width: `${achievement.progress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(achievement.progress)}%</Text>
          </View>
        )}
        
        {achievement.unlocked && (
          <View style={styles.unlockedBadge}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.unlockedText}>Unlocked</Text>
          </View>
        )}
      </GradientCard>
    </TouchableOpacity>
  );

  const renderActivityItem = (item: ActivityItem, index: number) => (
    <Animated.View
      key={item.id}
      style={[
        styles.activityItem,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateX: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.activityIcon}>
        <LinearGradient
          colors={gradients.primary.colors}
          style={styles.activityIconGradient}
        >
          <MaterialCommunityIcons name={item.icon as any} size={16} color="#FFFFFF" />
        </LinearGradient>
      </View>
      
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activityTime}>{formatTimeAgo(item.timestamp)}</Text>
      </View>
      
      <View style={styles.activityConnector} />
    </Animated.View>
  );

  const renderSettingsSection = (section: SettingsSection) => (
    <View key={section.id} style={styles.settingsSection}>
      <Text style={styles.settingsSectionTitle}>{section.title}</Text>
      <GradientCard gradientKey={section.gradientKey} style={styles.settingsCard}>
        {section.items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.settingsItem,
              index < section.items.length - 1 && styles.settingsItemBorder,
            ]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={styles.settingsItemLeft}>
              <MaterialCommunityIcons name={section.icon as any} size={20} color="#FFFFFF" />
              <Text style={styles.settingsItemText}>{item}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        ))}
      </GradientCard>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={gradients.primary.colors}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.authPrompt}>
          <EmptyStateIllustration type="auth" />
          <Text style={styles.authTitle}>Sign in to view your profile</Text>
          <Text style={styles.authDescription}>
            Access your automations, achievements, and settings
          </Text>
          <GradientButton
            title="Sign In"
            onPress={() => navigation.navigate('SignIn' as never)}
            style={styles.authButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const stats = [
    {
      icon: 'puzzle',
      label: 'Automations',
      value: userProfile.stats.automations,
      gradientKey: 'primary',
    },
    {
      icon: 'account-group',
      label: 'Followers',
      value: userProfile.stats.followers,
      gradientKey: 'success',
    },
    {
      icon: 'chart-line',
      label: 'Success Rate',
      value: `${userProfile.stats.successRate}%`,
      gradientKey: 'warning',
      progress: userProfile.stats.successRate,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={gradients.primary.colors}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.ScrollView
        style={styles.scrollView}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={ANIMATION_CONFIG.SCROLL_THROTTLE}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FFFFFF']}
            tintColor="#FFFFFF"
          />
        }
      >
        {/* Profile Header */}
        <Animated.View
          style={[
            styles.profileHeader,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity onPress={handleAvatarPress}>
            <Animated.View
              style={[
                styles.avatarContainer,
                { transform: [{ scale: avatarScale }] },
              ]}
            >
              <LinearGradient
                colors={gradients.aurora.colors}
                style={styles.avatarGradient}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{userProfile.avatar}</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <View style={styles.nameContainer}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              {userProfile.verified && (
                <MaterialCommunityIcons name="check-decagram" size={20} color="#4CAF50" />
              )}
            </View>
            <Text style={styles.profileEmail}>{userProfile.email}</Text>
            <Text style={styles.profileBio}>{userProfile.bio}</Text>
          </View>

          <GradientButton
            title="Edit Profile"
            onPress={() => navigation.navigate('EditProfile' as never)}
            style={styles.editButton}
            size="small"
          />
        </Animated.View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => renderStatCard(stat, index))}
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
            {achievements.map((achievement, index) => renderAchievement(achievement, index))}
          </ScrollView>
        </View>

        {/* Activity Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityTimeline}>
            {recentActivity.map((item, index) => renderActivityItem(item, index))}
          </View>
        </View>

        {/* Settings Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {settingsItems.map(renderSettingsSection)}
          
          {/* Quick Toggles */}
          <GradientCard gradientKey="dark" style={styles.togglesCard}>
            <View style={styles.toggleItem}>
              <MaterialCommunityIcons name="bell" size={20} color="#FFFFFF" />
              <Text style={styles.toggleLabel}>Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: "rgba(255,255,255,0.3)", true: gradients.success.colors[0] }}
                thumbColor="#FFFFFF"
              />
            </View>
            
            <View style={[styles.toggleItem, styles.toggleItemBorder]}>
              <MaterialCommunityIcons name="theme-light-dark" size={20} color="#FFFFFF" />
              <Text style={styles.toggleLabel}>Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={handleThemeToggle}
                trackColor={{ false: "rgba(255,255,255,0.3)", true: gradients.dark.colors[0] }}
                thumbColor="#FFFFFF"
              />
            </View>
          </GradientCard>
        </View>

        {/* Developer Section */}
        {isDeveloper && <DeveloperSection navigation={navigation} theme={theme} />}

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <View style={[styles.signOutButtonInner, getGlassStyle('light')]}>
            <MaterialCommunityIcons name="logout" size={24} color="#FF5252" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>ZapTap v1.0.0</Text>
          <Text style={styles.footerSubtext}>Made with ❤️ for automation enthusiasts</Text>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    ...textShadows.subtle,
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  profileName: {
    ...typography.headlineLarge,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    marginRight: 8,
    ...textShadows.medium,
  },
  profileEmail: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    ...textShadows.subtle,
  },
  profileBio: {
    ...typography.bodyMedium,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    ...textShadows.subtle,
  },
  editButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
  },
  statCardInner: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
    minHeight: 100,
  },
  statValue: {
    ...typography.headlineMedium,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    marginTop: 8,
    ...textShadows.medium,
  },
  statLabel: {
    ...typography.labelSmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
    ...textShadows.subtle,
  },
  progressRing: {
    marginTop: 8,
  },
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    ...typography.headlineSmall,
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
    marginBottom: 16,
    ...textShadows.medium,
  },
  achievementsScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  achievementCard: {
    width: 200,
    marginRight: 16,
  },
  achievementCardInner: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    minHeight: 140,
  },
  achievementLocked: {
    opacity: 0.7,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementTitle: {
    ...typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
    textAlign: 'center',
    marginBottom: 4,
    ...textShadows.subtle,
  },
  achievementDescription: {
    ...typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 12,
    ...textShadows.subtle,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    ...typography.labelSmall,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: fontWeights.medium,
    ...textShadows.subtle,
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76,175,80,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unlockedText: {
    ...typography.labelSmall,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: fontWeights.medium,
  },
  activityTimeline: {
    position: 'relative',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    zIndex: 2,
  },
  activityIconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    fontWeight: fontWeights.medium,
    ...textShadows.subtle,
  },
  activityTime: {
    ...typography.labelSmall,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
    ...textShadows.subtle,
  },
  activityConnector: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  settingsSection: {
    marginBottom: 16,
  },
  settingsSectionTitle: {
    ...typography.titleSmall,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: fontWeights.medium,
    marginBottom: 8,
    textTransform: 'uppercase',
    ...textShadows.subtle,
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemText: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    marginLeft: 12,
    ...textShadows.subtle,
  },
  togglesCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  toggleItemBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  toggleLabel: {
    ...typography.bodyMedium,
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
    ...textShadows.subtle,
  },
  signOutButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  signOutButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  signOutText: {
    ...typography.titleMedium,
    color: '#FF5252',
    fontWeight: fontWeights.semibold,
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    ...typography.labelMedium,
    color: 'rgba(255,255,255,0.7)',
    ...textShadows.subtle,
  },
  footerSubtext: {
    ...typography.labelSmall,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    ...textShadows.subtle,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  authTitle: {
    ...typography.headlineLarge,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
    ...textShadows.medium,
  },
  authDescription: {
    ...typography.bodyLarge,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 32,
    ...textShadows.subtle,
  },
  authButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
});

export default ModernProfileScreenEnhanced;