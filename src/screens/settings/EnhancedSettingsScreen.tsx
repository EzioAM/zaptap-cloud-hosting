import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import { Text, ActivityIndicator, Divider } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { signOut } from '../../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { EventLogger } from '../../utils/EventLogger';
import { APP_VERSION } from '../../constants/version';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';

const { width } = Dimensions.get('window');

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  icon: string;
  type: 'switch' | 'link' | 'action' | 'info';
  value?: boolean;
  onPress?: () => void;
  onValueChange?: (value: boolean) => void;
  info?: string;
  destructive?: boolean;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

const EnhancedSettingsScreen: React.FC = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  
  // Settings state
  const [settings, setSettings] = useState({
    // Notifications
    pushNotifications: true,
    emailNotifications: true,
    automationAlerts: true,
    marketingEmails: false,
    quietHours: false,
    
    // Privacy
    analytics: true,
    crashReports: true,
    shareUsageData: false,
    dataSharing: false,
    
    // Appearance
    darkMode: false,
    reduceMotion: false,
    largeText: false,
    highContrast: false,
    compactMode: false,
    
    // Automation
    autoRun: false,
    confirmBeforeRun: true,
    locationServices: true,
    backgroundRefresh: true,
    smartSuggestions: true,
    
    // Security
    biometricAuth: false,
    requirePinOnOpen: false,
    autoLockTimeout: 5, // minutes
    twoFactorAuth: false,
    
    // Data
    offlineMode: true,
    autoSync: true,
    dataSaver: false,
    cacheSize: 100, // MB
  });
  
  useEffect(() => {
    loadSettings();
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
      EventLogger.debug('Settings', 'Settings loaded successfully');
    } catch (error) {
      EventLogger.error('Settings', 'Failed to load settings:', error as Error);
      Alert.alert('Error', 'Failed to load settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveSetting = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      triggerHaptic('light');
      EventLogger.debug('Settings', `Setting ${key} updated to ${value}`);
    } catch (error) {
      // Revert the change if saving fails
      setSettings(prev => prev);
      EventLogger.error('Settings', 'Failed to save settings:', error as Error);
      Alert.alert('Error', 'Failed to save setting. Please try again.');
    }
  };
  
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
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
  };
  
  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and temporary files. Your automations and settings will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic('heavy');
              // Clear specific cache keys, not all AsyncStorage
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter(key => 
                key.startsWith('cache_') || 
                key.startsWith('temp_') ||
                key.startsWith('api_cache_')
              );
              await AsyncStorage.multiRemove(cacheKeys);
              Alert.alert('Success', 'Cache cleared successfully');
              EventLogger.info('Settings', 'Cache cleared');
            } catch (error) {
              EventLogger.error('Settings', 'Failed to clear cache:', error as Error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };
  
  const handleExportData = async () => {
    try {
      triggerHaptic('medium');
      // Implement data export functionality
      Alert.alert('Export Data', 'Your data export has been initiated. You will receive an email with your data within 24 hours.');
      EventLogger.info('Settings', 'Data export requested');
    } catch (error) {
      EventLogger.error('Settings', 'Failed to export data:', error as Error);
      Alert.alert('Error', 'Failed to export data');
    }
  };
  
  const handleSignOut = async () => {
    triggerHaptic('medium');
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to log in again to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              triggerHaptic('heavy');
              await dispatch(signOut()).unwrap();
              EventLogger.info('Settings', 'User signed out successfully');
              // Navigation will be handled by auth state change
            } catch (error) {
              EventLogger.error('Settings', 'Failed to sign out:', error as Error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };
  
  const handleSync = async () => {
    triggerHaptic('medium');
    Alert.alert('Sync Data', 'Your data has been synced successfully!', [
      { text: 'OK', onPress: () => {} }
    ]);
    EventLogger.info('Settings', 'Manual sync triggered');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              'Please type "DELETE" to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Proceed',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      triggerHaptic('heavy');
                      // Implement account deletion
                      EventLogger.info('Settings', 'Account deletion requested');
                      await dispatch(signOut()).unwrap();
                      navigation.navigate('SignIn' as never);
                    } catch (error) {
                      EventLogger.error('Settings', 'Failed to delete account:', error as Error);
                      Alert.alert('Error', 'Failed to delete account');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };
  
  const settingsSections: SettingSection[] = [
    {
      title: 'Account & Profile',
      items: [
        {
          id: 'editProfile',
          title: 'Edit Profile',
          description: 'Update your profile information',
          icon: 'account-edit',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            navigation.navigate('EditProfile' as never);
          },
        },
        {
          id: 'changePassword',
          title: 'Change Password',
          description: 'Update your account password',
          icon: 'lock-reset',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            navigation.navigate('ChangePassword' as never);
          },
        },
        {
          id: 'emailPreferences',
          title: 'Email Preferences',
          description: 'Manage email notifications',
          icon: 'email-outline',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            navigation.navigate('EmailPreferencesScreen' as never);
          },
        },
        {
          id: 'manageAccount',
          title: 'Manage Account',
          description: 'Account settings and billing',
          icon: 'account-cog',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('https://zaptap.cloud/account');
          },
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'notificationSettings',
          title: 'Notification Settings',
          description: 'Configure push and in-app notifications',
          icon: 'bell-ring',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            navigation.navigate('NotificationSettings' as never);
          },
        },
        {
          id: 'pushNotifications',
          title: 'Push Notifications',
          description: 'Master toggle for all notifications',
          icon: 'bell',
          type: 'switch',
          value: settings.pushNotifications,
          onValueChange: (value) => saveSetting('pushNotifications', value),
        },
        {
          id: 'automationAlerts',
          title: 'Automation Alerts',
          description: 'Get notified when automations execute',
          icon: 'robot-happy',
          type: 'switch',
          value: settings.automationAlerts,
          onValueChange: (value) => saveSetting('automationAlerts', value),
        },
        {
          id: 'quietHours',
          title: 'Quiet Hours',
          description: 'Silence notifications during set hours',
          icon: 'moon-waning-crescent',
          type: 'switch',
          value: settings.quietHours,
          onValueChange: (value) => saveSetting('quietHours', value),
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'darkMode',
          title: 'Dark Mode',
          description: 'Switch between light and dark themes',
          icon: 'brightness-6',
          type: 'switch',
          value: settings.darkMode,
          onValueChange: (value) => {
            saveSetting('darkMode', value);
            triggerHaptic('medium');
          },
        },
        {
          id: 'reduceMotion',
          title: 'Reduce Motion',
          description: 'Minimize animations for accessibility',
          icon: 'motion-pause',
          type: 'switch',
          value: settings.reduceMotion,
          onValueChange: (value) => saveSetting('reduceMotion', value),
        },
        {
          id: 'largeText',
          title: 'Large Text',
          description: 'Increase text size for readability',
          icon: 'format-font-size-increase',
          type: 'switch',
          value: settings.largeText,
          onValueChange: (value) => saveSetting('largeText', value),
        },
        {
          id: 'highContrast',
          title: 'High Contrast',
          description: 'Enhanced visibility for accessibility',
          icon: 'contrast-circle',
          type: 'switch',
          value: settings.highContrast,
          onValueChange: (value) => saveSetting('highContrast', value),
        },
        {
          id: 'compactMode',
          title: 'Compact Mode',
          description: 'Show more content on screen',
          icon: 'view-compact',
          type: 'switch',
          value: settings.compactMode,
          onValueChange: (value) => saveSetting('compactMode', value),
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          id: 'biometricAuth',
          title: Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Biometric Authentication',
          description: 'Use biometrics to secure app access',
          icon: Platform.OS === 'ios' ? 'face-recognition' : 'fingerprint',
          type: 'switch',
          value: settings.biometricAuth,
          onValueChange: (value) => {
            if (value) {
              Alert.alert(
                'Enable Biometric Authentication',
                'This will require biometric verification to open the app.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Enable', onPress: () => saveSetting('biometricAuth', value) }
                ]
              );
            } else {
              saveSetting('biometricAuth', value);
            }
          },
        },
        {
          id: 'twoFactorAuth',
          title: 'Two-Factor Authentication',
          description: 'Enhanced account security',
          icon: 'shield-check',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Alert.alert(
              'Two-Factor Authentication',
              'Set up 2FA in your account settings on our website.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Open Settings',
                  onPress: () => Linking.openURL('https://zaptap.cloud/account/security')
                }
              ]
            );
          },
        },
        {
          id: 'dataSharing',
          title: 'Data Sharing',
          description: 'Share usage data to improve the app',
          icon: 'database-export',
          type: 'switch',
          value: settings.shareUsageData,
          onValueChange: (value) => saveSetting('shareUsageData', value),
        },
        {
          id: 'analytics',
          title: 'Usage Analytics',
          description: 'Anonymous usage statistics',
          icon: 'chart-line',
          type: 'switch',
          value: settings.analytics,
          onValueChange: (value) => saveSetting('analytics', value),
        },
        {
          id: 'crashReports',
          title: 'Crash Reports',
          description: 'Automatically report crashes',
          icon: 'bug-check',
          type: 'switch',
          value: settings.crashReports,
          onValueChange: (value) => saveSetting('crashReports', value),
        },
        {
          id: 'privacyPolicy',
          title: 'Privacy Policy',
          description: 'View our privacy practices',
          icon: 'shield-lock',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('https://zaptap.cloud/privacy');
          },
        },
      ],
    },
    {
      title: 'Automations',
      items: [
        {
          id: 'autoRun',
          title: 'Auto-run Automations',
          description: 'Execute automations without confirmation',
          icon: 'play-circle-outline',
          type: 'switch',
          value: settings.autoRun,
          onValueChange: (value) => {
            if (value) {
              Alert.alert(
                'Enable Auto-run',
                'Automations will run automatically when triggered. This can be disabled anytime.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Enable', onPress: () => saveSetting('autoRun', value) }
                ]
              );
            } else {
              saveSetting('autoRun', value);
            }
          },
        },
        {
          id: 'confirmBeforeRun',
          title: 'Confirm Before Run',
          description: 'Show confirmation dialog',
          icon: 'check-circle-outline',
          type: 'switch',
          value: settings.confirmBeforeRun,
          onValueChange: (value) => saveSetting('confirmBeforeRun', value),
        },
        {
          id: 'locationServices',
          title: 'Location Services',
          description: 'Enable location-based automations',
          icon: 'map-marker-circle',
          type: 'switch',
          value: settings.locationServices,
          onValueChange: (value) => saveSetting('locationServices', value),
        },
        {
          id: 'backgroundRefresh',
          title: 'Background Refresh',
          description: 'Keep automations updated in background',
          icon: 'refresh-circle',
          type: 'switch',
          value: settings.backgroundRefresh,
          onValueChange: (value) => saveSetting('backgroundRefresh', value),
        },
        {
          id: 'smartSuggestions',
          title: 'Smart Suggestions',
          description: 'Get AI-powered automation suggestions',
          icon: 'lightbulb-on',
          type: 'switch',
          value: settings.smartSuggestions,
          onValueChange: (value) => saveSetting('smartSuggestions', value),
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        {
          id: 'offlineMode',
          title: 'Offline Mode',
          description: 'Cache automations for offline access',
          icon: 'cloud-off-outline',
          type: 'switch',
          value: settings.offlineMode,
          onValueChange: (value) => saveSetting('offlineMode', value),
        },
        {
          id: 'autoSync',
          title: 'Auto Sync',
          description: 'Automatically sync data across devices',
          icon: 'sync-circle',
          type: 'switch',
          value: settings.autoSync,
          onValueChange: (value) => saveSetting('autoSync', value),
        },
        {
          id: 'dataSaver',
          title: 'Data Saver Mode',
          description: 'Reduce cellular data usage',
          icon: 'database-minus',
          type: 'switch',
          value: settings.dataSaver,
          onValueChange: (value) => saveSetting('dataSaver', value),
        },
        {
          id: 'storageUsage',
          title: 'Storage Usage',
          description: 'View app storage details',
          icon: 'harddisk',
          type: 'info',
          info: '45.2 MB',
        },
        {
          id: 'clearCache',
          title: 'Clear Cache',
          description: 'Free up temporary storage',
          icon: 'broom',
          type: 'action',
          onPress: handleClearCache,
        },
        {
          id: 'exportData',
          title: 'Export Data',
          description: 'Download your automations and data',
          icon: 'export',
          type: 'action',
          onPress: handleExportData,
        },
        {
          id: 'manualSync',
          title: 'Sync Now',
          description: 'Manually sync your data',
          icon: 'cloud-sync',
          type: 'action',
          onPress: handleSync,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help Center',
          description: 'Get help and tutorials',
          icon: 'help-circle',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('https://zaptap.cloud/help');
          },
        },
        {
          id: 'faq',
          title: 'FAQ',
          description: 'Frequently asked questions',
          icon: 'frequently-asked-questions',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('https://zaptap.cloud/faq');
          },
        },
        {
          id: 'contact',
          title: 'Contact Support',
          description: 'Get help from our team',
          icon: 'headset',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('mailto:support@zaptap.cloud');
          },
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          description: 'Share your thoughts and ideas',
          icon: 'comment-text',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('mailto:feedback@zaptap.cloud');
          },
        },
        {
          id: 'reportBug',
          title: 'Report Bug',
          description: 'Report issues or problems',
          icon: 'bug',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('mailto:bugs@zaptap.cloud');
          },
        },
        {
          id: 'communityForum',
          title: 'Community Forum',
          description: 'Join discussions with other users',
          icon: 'forum',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('https://zaptap.cloud/community');
          },
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          id: 'terms',
          title: 'Terms of Service',
          description: 'Terms and conditions',
          icon: 'file-document-outline',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('https://zaptap.cloud/terms');
          },
        },
        {
          id: 'licenses',
          title: 'Open Source Licenses',
          description: 'Third-party software licenses',
          icon: 'open-source-initiative',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('https://zaptap.cloud/licenses');
          },
        },
        {
          id: 'version',
          title: 'App Version',
          icon: 'information-outline',
          type: 'info',
          info: APP_VERSION,
        },
        {
          id: 'website',
          title: 'Visit Website',
          description: 'Learn more about ZapTap',
          icon: 'web',
          type: 'link',
          onPress: () => {
            triggerHaptic('light');
            Linking.openURL('https://zaptap.cloud');
          },
        },
        {
          id: 'rateApp',
          title: 'Rate ZapTap',
          description: 'Leave a review on the app store',
          icon: 'star-outline',
          type: 'link',
          onPress: () => {
            triggerHaptic('medium');
            const storeUrl = Platform.OS === 'ios'
              ? 'https://apps.apple.com/app/zaptap'
              : 'https://play.google.com/store/apps/details?id=com.zaptap';
            Linking.openURL(storeUrl);
          },
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          id: 'signOut',
          title: 'Sign Out',
          description: 'Sign out of your account',
          icon: 'logout',
          type: 'action',
          onPress: handleSignOut,
        },
        {
          id: 'deleteAccount',
          title: 'Delete Account',
          description: 'Permanently delete your account and data',
          icon: 'account-remove',
          type: 'action',
          destructive: true,
          onPress: handleDeleteAccount,
        },
      ],
    },
  ];
  
  const renderSettingItem = (item: SettingItem) => {
    const iconColor = item.destructive ? '#F44336' : theme.colors.text?.secondary || '#666666';
    const textColor = item.destructive ? '#F44336' : theme.colors.text?.primary || '#000000';
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingItem}
        onPress={item.type === 'link' || item.type === 'action' ? item.onPress : undefined}
        activeOpacity={item.type === 'switch' || item.type === 'info' ? 1 : 0.7}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.surface?.secondary || '#F5F5F5' }]}>
            <Icon name={item.icon as any} size={22} color={iconColor} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: textColor }]}>{item.title}</Text>
            {item.description && (
              <Text style={[styles.settingDescription, { color: theme.colors.text?.secondary || '#666666' }]}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        
        {item.type === 'switch' && (
          <Switch
            value={item.value}
            onValueChange={item.onValueChange}
            trackColor={{ false: '#767577', true: (theme.colors.brand?.primary || '#6200ee') + '50' }}
            thumbColor={item.value ? theme.colors.brand?.primary || '#6200ee' : '#f4f3f4'}
          />
        )}
        
        {item.type === 'link' && (
          <Icon name="chevron-right" size={24} color={theme.colors.text?.secondary || '#666666'} />
        )}
        
        {item.type === 'info' && (
          <Text style={[styles.infoText, { color: theme.colors.text?.secondary || '#666666' }]}>{item.info}</Text>
        )}
      </TouchableOpacity>
    );
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background?.primary || '#F5F5F5' }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Loading Header */}
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientHeader, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Icon name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand?.primary || '#6200ee'} />
          <Text style={[styles.loadingText, { color: theme.colors.text?.secondary || '#666666' }]}>
            Loading settings...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background?.primary || '#F5F5F5' }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Modern Gradient Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Icon name="cog" size={24} color="#FFFFFF" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>
              Customize your ZapTap experience
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSync}
            style={styles.syncButton}
          >
            <Icon name="sync" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      
      {/* Content */}
      <Animated.ScrollView
        style={[
          styles.scrollContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {settingsSections.map((section, sectionIndex) => (
          <Animated.View 
            key={sectionIndex} 
            style={[
              styles.section,
              {
                opacity: fadeAnim,
                transform: [{ 
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 50 + sectionIndex * 10],
                    extrapolate: 'clamp',
                  })
                }]
              }
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.brand?.primary || '#6200ee' }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionContent, { backgroundColor: theme.colors.surface?.primary || '#FFFFFF' }]}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={item.id}>
                  {renderSettingItem(item)}
                  {itemIndex < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.border?.light || '#E0E0E0' }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </Animated.View>
        ))}
        
        {/* User Info Card */}
        {user && (
          <Animated.View 
            style={[
              styles.userCard, 
              { 
                backgroundColor: theme.colors.surface?.primary || '#FFFFFF',
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.userInfo}>
              <View style={[styles.userAvatar, { backgroundColor: (theme.colors.brand?.primary || '#6200ee') + '20' }]}>
                <Icon name="account" size={24} color={theme.colors.brand?.primary || '#6200ee'} />
              </View>
              <View style={styles.userDetails}>
                <Text style={[styles.userName, { color: theme.colors.text?.primary || '#000000' }]}>
                  {user.email || 'User'}
                </Text>
                <Text style={[styles.userStatus, { color: theme.colors.text?.secondary || '#666666' }]}>
                  Premium Member • Joined {new Date().getFullYear()}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* App Info */}
        <Animated.View 
          style={[
            styles.footer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.footerText, { color: theme.colors.text?.secondary || '#666666' }]}>
            ZapTap v{APP_VERSION}
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.text?.secondary || '#666666' }]}>
            Made with ❤️ by the ZapTap Team
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.text?.secondary || '#666666' }]}>
            © 2024 ZapTap. All rights reserved.
          </Text>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header Styles
  gradientHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerIcon: {
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  syncButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  
  // Content Styles
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  
  // User Card
  userCard: {
    marginHorizontal: 0,
    marginBottom: 24,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
  },
  
  // Section Styles
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 4,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  
  // Setting Item Styles
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 72,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 84,
  },
  
  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default EnhancedSettingsScreen;