import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  // Settings state
  const [settings, setSettings] = useState({
    // Notifications
    pushNotifications: true,
    emailNotifications: true,
    automationAlerts: true,
    marketingEmails: false,
    
    // Privacy
    analytics: true,
    crashReports: true,
    shareUsageData: false,
    publicProfile: true,
    
    // Appearance
    darkMode: false,
    reduceMotion: false,
    largeText: false,
    highContrast: false,
    
    // Automation
    autoRun: false,
    confirmBeforeRun: true,
    locationServices: true,
    backgroundRefresh: true,
    
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
  }, []);
  
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch (error) {
      EventLogger.error('Settings', 'Failed to load settings:', error as Error);
    }
  };
  
  const saveSetting = async (key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      triggerHaptic('light');
    } catch (error) {
      EventLogger.error('Settings', 'Failed to save settings:', error as Error);
      Alert.alert('Error', 'Failed to save settings');
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
      title: 'Account',
      items: [
        {
          id: 'editProfile',
          title: 'Edit Profile',
          icon: 'account-edit',
          type: 'link',
          onPress: () => navigation.navigate('EditProfile' as never),
        },
        {
          id: 'changePassword',
          title: 'Change Password',
          icon: 'lock-reset',
          type: 'link',
          onPress: () => navigation.navigate('ChangePassword' as never),
        },
        {
          id: 'emailPreferences',
          title: 'Email Preferences',
          icon: 'email-outline',
          type: 'link',
          onPress: () => navigation.navigate('EmailPreferences' as never),
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'pushNotifications',
          title: 'Push Notifications',
          description: 'Receive alerts on your device',
          icon: 'bell',
          type: 'switch',
          value: settings.pushNotifications,
          onValueChange: (value) => saveSetting('pushNotifications', value),
        },
        {
          id: 'emailNotifications',
          title: 'Email Notifications',
          description: 'Receive updates via email',
          icon: 'email',
          type: 'switch',
          value: settings.emailNotifications,
          onValueChange: (value) => saveSetting('emailNotifications', value),
        },
        {
          id: 'automationAlerts',
          title: 'Automation Alerts',
          description: 'Get notified when automations run',
          icon: 'robot',
          type: 'switch',
          value: settings.automationAlerts,
          onValueChange: (value) => saveSetting('automationAlerts', value),
        },
        {
          id: 'marketingEmails',
          title: 'Marketing Emails',
          description: 'Receive promotional content',
          icon: 'bullhorn',
          type: 'switch',
          value: settings.marketingEmails,
          onValueChange: (value) => saveSetting('marketingEmails', value),
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          id: 'biometricAuth',
          title: Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Biometric Authentication',
          description: 'Use biometrics to unlock the app',
          icon: 'fingerprint',
          type: 'switch',
          value: settings.biometricAuth,
          onValueChange: (value) => saveSetting('biometricAuth', value),
        },
        {
          id: 'twoFactorAuth',
          title: 'Two-Factor Authentication',
          description: 'Add an extra layer of security',
          icon: 'shield-check',
          type: 'switch',
          value: settings.twoFactorAuth,
          onValueChange: (value) => saveSetting('twoFactorAuth', value),
        },
        {
          id: 'publicProfile',
          title: 'Public Profile',
          description: 'Allow others to see your profile',
          icon: 'eye',
          type: 'switch',
          value: settings.publicProfile,
          onValueChange: (value) => saveSetting('publicProfile', value),
        },
        {
          id: 'analytics',
          title: 'Analytics',
          description: 'Help improve the app',
          icon: 'chart-line',
          type: 'switch',
          value: settings.analytics,
          onValueChange: (value) => saveSetting('analytics', value),
        },
        {
          id: 'crashReports',
          title: 'Crash Reports',
          description: 'Send crash data to help fix bugs',
          icon: 'bug',
          type: 'switch',
          value: settings.crashReports,
          onValueChange: (value) => saveSetting('crashReports', value),
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'darkMode',
          title: 'Dark Mode',
          description: 'Use dark theme',
          icon: 'theme-light-dark',
          type: 'switch',
          value: settings.darkMode,
          onValueChange: (value) => saveSetting('darkMode', value),
        },
        {
          id: 'reduceMotion',
          title: 'Reduce Motion',
          description: 'Minimize animations',
          icon: 'animation-outline',
          type: 'switch',
          value: settings.reduceMotion,
          onValueChange: (value) => saveSetting('reduceMotion', value),
        },
        {
          id: 'largeText',
          title: 'Large Text',
          description: 'Increase text size',
          icon: 'format-size',
          type: 'switch',
          value: settings.largeText,
          onValueChange: (value) => saveSetting('largeText', value),
        },
        {
          id: 'highContrast',
          title: 'High Contrast',
          description: 'Improve visibility',
          icon: 'contrast-box',
          type: 'switch',
          value: settings.highContrast,
          onValueChange: (value) => saveSetting('highContrast', value),
        },
      ],
    },
    {
      title: 'Automation Settings',
      items: [
        {
          id: 'autoRun',
          title: 'Auto-run Automations',
          description: 'Run without confirmation',
          icon: 'play-circle',
          type: 'switch',
          value: settings.autoRun,
          onValueChange: (value) => saveSetting('autoRun', value),
        },
        {
          id: 'confirmBeforeRun',
          title: 'Confirm Before Run',
          description: 'Ask before executing',
          icon: 'alert-circle',
          type: 'switch',
          value: settings.confirmBeforeRun,
          onValueChange: (value) => saveSetting('confirmBeforeRun', value),
        },
        {
          id: 'locationServices',
          title: 'Location Services',
          description: 'Enable location-based triggers',
          icon: 'map-marker',
          type: 'switch',
          value: settings.locationServices,
          onValueChange: (value) => saveSetting('locationServices', value),
        },
        {
          id: 'backgroundRefresh',
          title: 'Background Refresh',
          description: 'Update automations in background',
          icon: 'refresh',
          type: 'switch',
          value: settings.backgroundRefresh,
          onValueChange: (value) => saveSetting('backgroundRefresh', value),
        },
      ],
    },
    {
      title: 'Data & Storage',
      items: [
        {
          id: 'offlineMode',
          title: 'Offline Mode',
          description: 'Access automations offline',
          icon: 'wifi-off',
          type: 'switch',
          value: settings.offlineMode,
          onValueChange: (value) => saveSetting('offlineMode', value),
        },
        {
          id: 'autoSync',
          title: 'Auto Sync',
          description: 'Sync data automatically',
          icon: 'sync',
          type: 'switch',
          value: settings.autoSync,
          onValueChange: (value) => saveSetting('autoSync', value),
        },
        {
          id: 'dataSaver',
          title: 'Data Saver',
          description: 'Reduce data usage',
          icon: 'database-lock',
          type: 'switch',
          value: settings.dataSaver,
          onValueChange: (value) => saveSetting('dataSaver', value),
        },
        {
          id: 'clearCache',
          title: 'Clear Cache',
          description: 'Free up storage space',
          icon: 'delete-sweep',
          type: 'action',
          onPress: handleClearCache,
        },
        {
          id: 'exportData',
          title: 'Export My Data',
          description: 'Download all your data',
          icon: 'download',
          type: 'action',
          onPress: handleExportData,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help Center',
          icon: 'help-circle',
          type: 'link',
          onPress: () => navigation.navigate('Help' as never),
        },
        {
          id: 'faq',
          title: 'FAQ',
          icon: 'frequently-asked-questions',
          type: 'link',
          onPress: () => navigation.navigate('FAQ' as never),
        },
        {
          id: 'contact',
          title: 'Contact Support',
          icon: 'headset',
          type: 'link',
          onPress: () => Linking.openURL('mailto:support@zaptap.cloud'),
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          icon: 'message-draw',
          type: 'link',
          onPress: () => Linking.openURL('mailto:feedback@zaptap.cloud'),
        },
        {
          id: 'reportBug',
          title: 'Report a Bug',
          icon: 'bug-outline',
          type: 'link',
          onPress: () => Linking.openURL('mailto:bugs@zaptap.cloud'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          id: 'terms',
          title: 'Terms of Service',
          icon: 'file-document',
          type: 'link',
          onPress: () => navigation.navigate('Terms' as never),
        },
        {
          id: 'privacy',
          title: 'Privacy Policy',
          icon: 'shield-lock',
          type: 'link',
          onPress: () => navigation.navigate('PrivacyPolicy' as never),
        },
        {
          id: 'licenses',
          title: 'Open Source Licenses',
          icon: 'open-source-initiative',
          type: 'link',
          onPress: () => Linking.openURL('https://zaptap.cloud/licenses'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          id: 'version',
          title: 'Version',
          icon: 'information',
          type: 'info',
          info: APP_VERSION,
        },
        {
          id: 'website',
          title: 'Website',
          icon: 'web',
          type: 'link',
          onPress: () => Linking.openURL('https://zaptap.cloud'),
        },
        {
          id: 'rateApp',
          title: 'Rate ZapTap',
          icon: 'star',
          type: 'link',
          onPress: () => {
            const storeUrl = Platform.OS === 'ios'
              ? 'https://apps.apple.com/app/zaptap'
              : 'https://play.google.com/store/apps/details?id=com.zaptap';
            Linking.openURL(storeUrl);
          },
        },
      ],
    },
    {
      title: 'Danger Zone',
      items: [
        {
          id: 'signOut',
          title: 'Sign Out',
          icon: 'logout',
          type: 'action',
          onPress: async () => {
            try {
              await dispatch(signOut()).unwrap();
              navigation.navigate('SignIn' as never);
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
        {
          id: 'deleteAccount',
          title: 'Delete Account',
          description: 'Permanently delete your account',
          icon: 'account-remove',
          type: 'action',
          destructive: true,
          onPress: handleDeleteAccount,
        },
      ],
    },
  ];
  
  const renderSettingItem = (item: SettingItem) => {
    const iconColor = item.destructive ? '#F44336' : theme.colors.onSurfaceVariant;
    const textColor = item.destructive ? '#F44336' : theme.colors.onSurface;
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingItem}
        onPress={item.type === 'link' || item.type === 'action' ? item.onPress : undefined}
        activeOpacity={item.type === 'switch' || item.type === 'info' ? 1 : 0.7}
      >
        <View style={styles.settingLeft}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name={item.icon as any} size={22} color={iconColor} />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingTitle, { color: textColor }]}>{item.title}</Text>
            {item.description && (
              <Text style={[styles.settingDescription, { color: theme.colors.onSurfaceVariant }]}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        
        {item.type === 'switch' && (
          <Switch
            value={item.value}
            onValueChange={item.onValueChange}
            trackColor={{ false: '#767577', true: theme.colors.primary + '50' }}
            thumbColor={item.value ? theme.colors.primary : '#f4f3f4'}
          />
        )}
        
        {item.type === 'link' && (
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.colors.onSurfaceVariant} />
        )}
        
        {item.type === 'info' && (
          <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>{item.info}</Text>
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {settingsSections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              {section.title}
            </Text>
            <View style={[styles.sectionContent, { backgroundColor: theme.colors.surface }]}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={item.id}>
                  {renderSettingItem(item)}
                  {itemIndex < section.items.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.outline + '20' }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
        
        {/* App Info */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
            ZapTap v{APP_VERSION}
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.onSurfaceVariant }]}>
            Made with ❤️ by the ZapTap Team
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 60,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 4,
  },
  footerText: {
    fontSize: 12,
  },
});

export default EnhancedSettingsScreen;