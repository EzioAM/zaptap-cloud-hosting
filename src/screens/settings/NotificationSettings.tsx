/**
 * NotificationSettings.tsx
 * Modern notification settings screen with enhanced UI/UX
 * Features: master toggle, category toggles, sound/vibration preferences, quiet hours, preview
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Text, ActivityIndicator, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeTheme } from '../../components/common/ThemeFallbackWrapper';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  selectNotificationPreferences,
  selectPermissionStatus,
  selectIsNotificationInitialized,
  updateNotificationPreferences,
  requestNotificationPermissions,
  sendTestNotification,
} from '../../store/slices/notificationSlice';
import { NotificationPreferences } from '../../types/notifications';
import { EventLogger } from '../../utils/EventLogger';

interface SettingItemProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  icon: string;
  iconColor: string;
  theme: any;
}

const { width } = Dimensions.get('window');

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
  icon,
  iconColor,
  theme,
}) => {
  const handleToggle = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.settingItem,
        { backgroundColor: theme.colors.surface.primary }
      ]}
      onPress={handleToggle}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.settingContent}>
        <View style={styles.settingLeft}>
          <View style={[
            styles.iconContainer, 
            { backgroundColor: `${iconColor}15` }
          ]}>
            <Icon name={icon} size={24} color={disabled ? theme.colors.text.tertiary : iconColor} />
          </View>
          <View style={styles.settingText}>
            <Text style={[
              styles.settingTitle,
              { color: disabled ? theme.colors.text.tertiary : theme.colors.text.primary }
            ]}>
              {title}
            </Text>
            {description && (
              <Text style={[
                styles.settingDescription,
                { color: disabled ? theme.colors.text.tertiary : theme.colors.text.secondary }
              ]}>
                {description}
              </Text>
            )}
          </View>
        </View>
        <Switch
          value={value}
          onValueChange={handleToggle}
          disabled={disabled}
          trackColor={{ 
            false: theme.colors.border.light, 
            true: `${iconColor}40` 
          }}
          thumbColor={value ? iconColor : theme.colors.text.tertiary}
        />
      </View>
    </TouchableOpacity>
  );
};

interface TimePickerProps {
  label: string;
  time: string;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
  theme: any;
}

const TimePicker: React.FC<TimePickerProps> = ({ label, time, onTimeChange, disabled, theme }) => {
  const handleTimePress = () => {
    if (disabled) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Alert.alert(
      `Set ${label}`,
      'Select time',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Set Time',
          onPress: () => {
            // This would open a proper time picker in a real implementation
            // For now, we'll use a simple input approach
            Alert.prompt(
              `Set ${label}`,
              'Enter time in 24-hour format (e.g., 22:00)',
              (value) => {
                if (value && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onTimeChange(value);
                } else {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert('Invalid Time', 'Please enter time in HH:MM format (24-hour)');
                }
              },
              'plain-text',
              time
            );
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity 
      onPress={handleTimePress} 
      disabled={disabled}
      style={[
        styles.timePicker,
        { backgroundColor: theme.colors.surface.primary }
      ]}
      activeOpacity={0.7}
    >
      <Icon 
        name="clock-outline" 
        size={20} 
        color={disabled ? theme.colors.text.tertiary : theme.colors.brand.primary}
        style={styles.clockIcon}
      />
      <Text style={[
        styles.timeLabel,
        { color: disabled ? theme.colors.text.tertiary : theme.colors.text.secondary }
      ]}>
        {label}
      </Text>
      <Text style={[
        styles.timeValue,
        { color: disabled ? theme.colors.text.tertiary : theme.colors.text.primary }
      ]}>
        {time}
      </Text>
    </TouchableOpacity>
  );
};

const NotificationSettings: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useSafeTheme();
  const insets = useSafeAreaInsets();
  
  const preferences = useAppSelector(selectNotificationPreferences);
  const permissionStatus = useAppSelector(selectPermissionStatus);
  const isInitialized = useAppSelector(selectIsNotificationInitialized);
  
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const hasChanged = JSON.stringify(localPreferences) !== JSON.stringify(preferences);
    setHasChanges(hasChanged);
  }, [localPreferences, preferences]);

  // Start animations when loading is complete
  useEffect(() => {
    if (isInitialized) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isInitialized, fadeAnim, slideAnim]);

  const updateLocalPreference = (updates: Partial<NotificationPreferences>) => {
    setLocalPreferences(prev => ({ ...prev, ...updates }));
  };

  const updateCategoryPreference = (category: keyof NotificationPreferences['categories'], value: boolean) => {
    setLocalPreferences(prev => ({
      ...prev,
      categories: { ...prev.categories, [category]: value },
    }));
  };

  const updateQuietHoursPreference = (updates: Partial<NotificationPreferences['quietHours']>) => {
    setLocalPreferences(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, ...updates },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await dispatch(updateNotificationPreferences(localPreferences)).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Settings Saved', 
        'Your notification preferences have been updated.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
      EventLogger.info('NotificationSettings', 'Notification preferences saved successfully');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
      EventLogger.error('NotificationSettings', 'Failed to save notification preferences:', error as Error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestPermissions = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await dispatch(requestNotificationPermissions()).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      EventLogger.info('NotificationSettings', 'Notification permissions granted');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Permission Error', 'Failed to request notification permissions.');
      EventLogger.error('NotificationSettings', 'Failed to request permissions:', error as Error);
    }
  };

  const handleTestNotification = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      await dispatch(sendTestNotification()).unwrap();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Test Sent', 'A test notification has been sent.');
      EventLogger.info('NotificationSettings', 'Test notification sent successfully');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to send test notification.');
      EventLogger.error('NotificationSettings', 'Failed to send test notification:', error as Error);
    }
  };

  const isNotificationsDisabled = !isInitialized || permissionStatus !== 'granted' || !localPreferences.enabled;

  // Notification categories with icons and colors
  const notificationCategories = [
    {
      key: 'enabled' as keyof NotificationPreferences,
      title: 'Enable Notifications',
      description: 'Master toggle for all push notifications',
      icon: 'bell',
      color: theme.colors.brand.primary,
      isEnabled: true, // Always enabled regardless of other settings
    },
    {
      key: 'categories.automations' as any,
      title: 'Automation Alerts',
      description: 'Execution status and automation updates',
      icon: 'robot',
      color: theme.colors.brand.secondary,
      value: localPreferences.categories.automations,
      onChange: (value: boolean) => updateCategoryPreference('automations', value),
    },
    {
      key: 'categories.shares' as any,
      title: 'Sharing Notifications',
      description: 'When someone shares content with you',
      icon: 'share-variant',
      color: theme.colors.semantic.info,
      value: localPreferences.categories.shares,
      onChange: (value: boolean) => updateCategoryPreference('shares', value),
    },
    {
      key: 'categories.social' as any,
      title: 'Social Updates',
      description: 'Follows, reviews, and community activity',
      icon: 'account-group',
      color: theme.colors.brand.accent,
      value: localPreferences.categories.social,
      onChange: (value: boolean) => updateCategoryPreference('social', value),
    },
    {
      key: 'categories.system' as any,
      title: 'System Notifications',
      description: 'App updates and important announcements',
      icon: 'information',
      color: theme.colors.semantic.warning,
      value: localPreferences.categories.system,
      onChange: (value: boolean) => updateCategoryPreference('system', value),
    },
  ];

  const soundCategories = [
    {
      key: 'sound' as keyof NotificationPreferences,
      title: 'Sound',
      description: 'Play notification sounds',
      icon: 'volume-high',
      color: theme.colors.semantic.success,
      value: localPreferences.sound,
      onChange: (value: boolean) => updateLocalPreference({ sound: value }),
    },
    {
      key: 'vibration' as keyof NotificationPreferences,
      title: 'Vibration',
      description: 'Vibrate for notifications',
      icon: 'vibrate',
      color: theme.colors.brand.primary,
      value: localPreferences.vibration,
      onChange: (value: boolean) => updateLocalPreference({ vibration: value }),
      showOnIOS: true,
    },
    {
      key: 'preview' as keyof NotificationPreferences,
      title: 'Lock Screen Preview',
      description: 'Show content on lock screen',
      icon: 'eye',
      color: theme.colors.semantic.info,
      value: localPreferences.preview,
      onChange: (value: boolean) => updateLocalPreference({ preview: value }),
    },
  ];

  if (!isInitialized) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
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
              <Text style={styles.headerTitle}>Notification Settings</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
            Loading notification settings...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Icon name="bell" size={24} color="#FFFFFF" style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Notification Settings</Text>
            <Text style={styles.headerSubtitle}>
              Manage your notification preferences
            </Text>
          </View>

          {hasChanges && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleSave();
              }}
              style={[styles.saveHeaderButton, { opacity: isSaving ? 0.6 : 1 }]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size={20} color="#FFFFFF" />
              ) : (
                <Icon name="content-save" size={24} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <Animated.ScrollView 
        style={[styles.scrollContainer, { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
          {/* Permission Status Banner */}
        {permissionStatus !== 'granted' && (
          <Animated.View
            style={[
              styles.permissionBanner,
              { 
                backgroundColor: theme.colors.surface.primary,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Icon name="alert-circle" size={24} color={theme.colors.semantic.warning} />
            <View style={styles.permissionContent}>
              <Text style={[styles.permissionTitle, { color: theme.colors.text.primary }]}>
                Notifications Disabled
              </Text>
              <Text style={[styles.permissionDescription, { color: theme.colors.text.secondary }]}>
                Enable notifications to receive updates about your automations and important alerts
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleRequestPermissions} 
              style={[styles.enableButton, { backgroundColor: theme.colors.semantic.warning }]}
            >
              <Text style={styles.enableButtonText}>Enable</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Introduction Card */}
        <Animated.View
          style={[
            styles.introCard,
            { 
              backgroundColor: theme.colors.surface.primary,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.introContent}>
            <Icon name="bell-outline" size={32} color={theme.colors.brand.primary} />
            <Text style={[styles.introTitle, { color: theme.colors.text.primary }]}>
              Notification Preferences
            </Text>
            <Text style={[styles.introSubtitle, { color: theme.colors.text.secondary }]}>
              Customize when and how you receive notifications. You can enable or disable specific types of alerts.
            </Text>
          </View>
        </Animated.View>

        {/* Master Toggle Section */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            General Settings
          </Text>
          
          <SettingItem
            title="Enable Notifications"
            description="Master toggle for all push notifications"
            value={localPreferences.enabled}
            onValueChange={(value) => updateLocalPreference({ enabled: value })}
            disabled={permissionStatus !== 'granted'}
            icon="bell"
            iconColor={theme.colors.brand.primary}
            theme={theme}
          />
        </Animated.View>

        {/* Notification Categories */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Notification Types
          </Text>
          
          {notificationCategories.slice(1).map((category, index) => (
            <Animated.View
              key={category.key}
              style={{
                opacity: fadeAnim,
                transform: [{ 
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, 50 + index * 5],
                    extrapolate: 'clamp',
                  })
                }]
              }}
            >
              <SettingItem
                title={category.title}
                description={category.description}
                value={category.value}
                onValueChange={category.onChange}
                disabled={isNotificationsDisabled}
                icon={category.icon}
                iconColor={category.color}
                theme={theme}
              />
            </Animated.View>
          ))}
        </Animated.View>

        {/* Sound & Vibration Section */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Sound & Haptics
          </Text>
          
          {soundCategories.map((category, index) => {
            // Skip vibration on Android
            if (category.showOnIOS && Platform.OS !== 'ios') {
              return null;
            }
            
            return (
              <Animated.View
                key={category.key}
                style={{
                  opacity: fadeAnim,
                  transform: [{ 
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 50],
                      outputRange: [0, 50 + index * 5],
                      extrapolate: 'clamp',
                    })
                  }]
                }}
              >
                <SettingItem
                  title={category.title}
                  description={category.description}
                  value={category.value}
                  onValueChange={category.onChange}
                  disabled={isNotificationsDisabled}
                  icon={category.icon}
                  iconColor={category.color}
                  theme={theme}
                />
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Quiet Hours Section */}
        <Animated.View
          style={[
            styles.sectionContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Quiet Hours
          </Text>
          
          <SettingItem
            title="Enable Quiet Hours"
            description="Silence notifications during specified hours"
            value={localPreferences.quietHours.enabled}
            onValueChange={(value) => updateQuietHoursPreference({ enabled: value })}
            disabled={isNotificationsDisabled}
            icon="moon"
            iconColor={theme.colors.semantic.info}
            theme={theme}
          />
          
          {localPreferences.quietHours.enabled && !isNotificationsDisabled && (
            <Animated.View 
              style={[
                styles.quietHoursContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }]
                }
              ]}
            >
              <TimePicker
                label="Start Time"
                time={localPreferences.quietHours.start}
                onTimeChange={(time) => updateQuietHoursPreference({ start: time })}
                disabled={!localPreferences.quietHours.enabled || isNotificationsDisabled}
                theme={theme}
              />
              <TimePicker
                label="End Time"
                time={localPreferences.quietHours.end}
                onTimeChange={(time) => updateQuietHoursPreference({ end: time })}
                disabled={!localPreferences.quietHours.enabled || isNotificationsDisabled}
                theme={theme}
              />
            </Animated.View>
          )}
        </Animated.View>

        {/* Action Buttons Section */}
        <Animated.View
          style={[
            styles.buttonSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { 
                backgroundColor: theme.colors.brand.primary,
                opacity: isSaving || hasChanges ? (isSaving ? 0.7 : 1) : 0.5
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleSave();
            }}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <ActivityIndicator size={20} color="#FFFFFF" />
            ) : (
              <Icon name="content-save" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.primaryButtonText}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.testButton,
              { 
                backgroundColor: theme.colors.surface.primary,
                borderColor: isNotificationsDisabled ? theme.colors.border.light : theme.colors.brand.secondary,
                opacity: isNotificationsDisabled ? 0.5 : 1 
              }
            ]}
            onPress={handleTestNotification}
            disabled={isNotificationsDisabled}
          >
            <Icon 
              name="send" 
              size={20} 
              color={isNotificationsDisabled ? theme.colors.text.tertiary : theme.colors.brand.secondary}
            />
            <Text style={[
              styles.testButtonText,
              { color: isNotificationsDisabled ? theme.colors.text.tertiary : theme.colors.brand.secondary }
            ]}>
              Send Test Notification
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Footer Note */}
        <Animated.View
          style={[
            styles.footerNote,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Icon name="information" size={16} color={theme.colors.text.tertiary} />
          <Text style={[styles.noteText, { color: theme.colors.text.tertiary }]}>
            Note: Permission status and system-level notification settings may override these preferences. Check your device settings if notifications aren't working as expected.
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
  saveHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  
  // Permission Banner
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  permissionContent: {
    flex: 1,
    marginLeft: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  // Introduction Card
  introCard: {
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  introContent: {
    padding: 20,
    alignItems: 'center',
  },
  introTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Section Styles
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  
  // Setting Item Styles
  settingItem: {
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Quiet Hours
  quietHoursContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  timePicker: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  clockIcon: {
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Button Section
  buttonSection: {
    marginTop: 32,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Footer
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
    flex: 1,
  },
});

export default NotificationSettings;