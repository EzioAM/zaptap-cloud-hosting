import React, { useEffect, useState } from 'react';
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
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { signOut } from '../../store/slices/authSlice';
import { useGetMyAutomationsQuery, useGetPublicAutomationsQuery } from '../../store/api/automationApi';
import { useUserRole } from '../../hooks/useUserRole';
import { DeveloperSection } from '../../components/developer/DeveloperSection';

const ModernProfileScreenSafe = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isDeveloper } = useUserRole();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load notification settings on mount
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMyAutomations(), refetchPublicAutomations()]);
    setRefreshing(false);
  };

  const handleNotificationToggle = async (value: boolean) => {
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
              // Auth navigation will be handled by navigator after sign out
              Alert.alert('Success', 'You have been signed out successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
        <View style={styles.authPrompt}>
          <MaterialCommunityIcons name="account-circle" size={80} color={theme.colors?.textSecondary || '#666'} />
          <Text style={[styles.authTitle, { color: theme.colors?.text || '#000' }]}>
            Sign in to your account
          </Text>
          <Text style={[styles.authDescription, { color: theme.colors?.textSecondary || '#666' }]}>
            Access your profile and manage your automations
          </Text>
          <TouchableOpacity
            style={[styles.authButton, { backgroundColor: theme.colors?.primary || '#2196F3' }]}
            onPress={() => navigation.navigate('SignIn' as never)}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stats = [
    { 
      icon: 'puzzle', 
      label: 'My Automations', 
      value: myAutomations?.length || 0,
      color: '#2196F3'
    },
    { 
      icon: 'share-variant', 
      label: 'Shared', 
      value: myPublicAutomations.length,
      color: '#4CAF50'
    },
    { 
      icon: 'heart', 
      label: 'Total Likes', 
      value: myPublicAutomations.reduce((sum, auto) => sum + (auto.likes || 0), 0),
      color: '#FF6B6B'
    },
    { 
      icon: 'download', 
      label: 'Total Uses', 
      value: myPublicAutomations.reduce((sum, auto) => sum + (auto.uses || 0), 0),
      color: '#9C27B0'
    },
  ];

  const menuItems = [
    {
      title: 'Account',
      items: [
        { icon: 'account-edit', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile' as never) },
        { icon: 'lock-reset', label: 'Change Password', onPress: () => navigation.navigate('ChangePassword' as never) },
        { icon: 'email', label: 'Email Preferences', onPress: () => navigation.navigate('EmailPreferences' as never) },
      ]
    },
    {
      title: 'Settings',
      items: [
        { 
          icon: 'bell', 
          label: 'Notifications', 
          value: notificationsEnabled,
          onValueChange: handleNotificationToggle,
          type: 'switch' 
        },
        { 
          icon: 'theme-light-dark', 
          label: 'Dark Mode', 
          value: darkMode,
          onValueChange: handleThemeToggle,
          type: 'switch' 
        },
        { icon: 'shield-check', label: 'Privacy', onPress: () => navigation.navigate('Privacy' as never) },
      ]
    },
    {
      title: 'Resources',
      items: [
        { icon: 'help-circle', label: 'Help Center', onPress: () => navigation.navigate('Help' as never) },
        { icon: 'book-open-variant', label: 'Documentation', onPress: () => navigation.navigate('Docs' as never) },
        { icon: 'comment-question', label: 'FAQ', onPress: () => navigation.navigate('FAQ' as never) },
      ]
    },
    {
      title: 'Legal',
      items: [
        { icon: 'file-document', label: 'Terms of Service', onPress: () => navigation.navigate('Terms' as never) },
        { icon: 'shield-lock', label: 'Privacy Policy', onPress: () => navigation.navigate('PrivacyPolicy' as never) },
      ]
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors?.background || '#f5f5f5' }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors?.primary || '#2196F3']}
          />
        }
      >
        {/* Profile Header */}
        <View style={[styles.header, { backgroundColor: theme.colors?.primary || '#2196F3' }]}>
          <View style={styles.profileInfo}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors?.primaryDark || '#1976D2' }]}>
                <Text style={styles.avatarText}>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {isDeveloper && (
                <View style={styles.developerBadge}>
                  <MaterialCommunityIcons name="code-tags" size={16} color="white" />
                  <Text style={styles.developerText}>Developer</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: theme.colors?.surface || '#fff' }]}>
              <MaterialCommunityIcons name={stat.icon as any} size={28} color={stat.color} />
              <Text style={[styles.statValue, { color: theme.colors?.text || '#000' }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors?.textSecondary || '#666' }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Menu Sections */}
        {menuItems.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors?.textSecondary || '#666' }]}>
              {section.title}
            </Text>
            <View style={[styles.menuCard, { backgroundColor: theme.colors?.surface || '#fff' }]}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    index < section.items.length - 1 && styles.menuItemBorder
                  ]}
                  onPress={item.onPress}
                  disabled={item.type === 'switch'}
                >
                  <View style={styles.menuItemLeft}>
                    <MaterialCommunityIcons 
                      name={item.icon as any} 
                      size={24} 
                      color={theme.colors?.text || '#000'} 
                    />
                    <Text style={[styles.menuItemLabel, { color: theme.colors?.text || '#000' }]}>
                      {item.label}
                    </Text>
                  </View>
                  {item.type === 'switch' ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onValueChange}
                      trackColor={{ false: "#767577", true: theme.colors?.primary || '#2196F3' }}
                      thumbColor={item.value ? 'white' : '#f4f3f4'}
                    />
                  ) : (
                    <MaterialCommunityIcons 
                      name="chevron-right" 
                      size={24} 
                      color={theme.colors?.textSecondary || '#666'} 
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Developer Section */}
        {isDeveloper && <DeveloperSection navigation={navigation} theme={theme} />}

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: theme.colors?.surface || '#fff' }]}
          onPress={handleSignOut}
        >
          <MaterialCommunityIcons name="logout" size={24} color="#ff4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors?.textSecondary || '#666' }]}>
            ZapTap v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ModernProfileScreenSafe;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  profileInfo: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  developerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  developerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    marginTop: -20,
  },
  statCard: {
    width: '47%',
    margin: '1.5%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuCard: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemLabel: {
    fontSize: 16,
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
  },
  authDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  authButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});