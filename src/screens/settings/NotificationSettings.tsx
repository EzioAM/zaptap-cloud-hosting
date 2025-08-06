/**
 * NotificationSettings.tsx
 * Notification settings screen with glass morphism design
 * Features: master toggle, category toggles, sound/vibration preferences, quiet hours, preview
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
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
  icon: keyof typeof Ionicons.glyphMap;
}

const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  value,
  onValueChange,
  disabled = false,
  icon,
}) => (
  <BlurView intensity={20} tint="light" style={styles.settingItem}>
    <View style={styles.settingContent}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={24} color="#8B5CF6" />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.settingDescription, disabled && styles.disabledText]}>
              {description}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
        thumbColor={value ? '#FFFFFF' : '#9CA3AF'}
        ios_backgroundColor="#E5E7EB"
      />
    </View>
  </BlurView>
);

interface TimePickerProps {
  label: string;
  time: string;
  onTimeChange: (time: string) => void;
  disabled?: boolean;
}

const TimePicker: React.FC<TimePickerProps> = ({ label, time, onTimeChange, disabled }) => {
  const handleTimePress = () => {
    if (disabled) return;
    
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
                  onTimeChange(value);
                } else {
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
    <TouchableOpacity onPress={handleTimePress} disabled={disabled}>
      <BlurView intensity={15} tint="light" style={styles.timePicker}>
        <Text style={[styles.timeLabel, disabled && styles.disabledText]}>{label}</Text>
        <Text style={[styles.timeValue, disabled && styles.disabledText]}>{time}</Text>
      </BlurView>
    </TouchableOpacity>
  );
};

const NotificationSettings: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const preferences = useAppSelector(selectNotificationPreferences);
  const permissionStatus = useAppSelector(selectPermissionStatus);
  const isInitialized = useAppSelector(selectIsNotificationInitialized);
  
  const [localPreferences, setLocalPreferences] = useState<NotificationPreferences>(preferences);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const hasChanged = JSON.stringify(localPreferences) !== JSON.stringify(preferences);
    setHasChanges(hasChanged);
  }, [localPreferences, preferences]);

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
    try {
      await dispatch(updateNotificationPreferences(localPreferences)).unwrap();
      Alert.alert('Settings Saved', 'Your notification preferences have been updated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
      EventLogger.error('NotificationSettings', 'Failed to save notification preferences:', error as Error);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      await dispatch(requestNotificationPermissions()).unwrap();
    } catch (error) {
      Alert.alert('Permission Error', 'Failed to request notification permissions.');
      EventLogger.error('NotificationSettings', 'Failed to request permissions:', error as Error);
    }
  };

  const handleTestNotification = async () => {
    try {
      await dispatch(sendTestNotification()).unwrap();
      Alert.alert('Test Sent', 'A test notification has been sent.');
    } catch (error) {
      Alert.alert('Error', 'Failed to send test notification.');
      EventLogger.error('NotificationSettings', 'Failed to send test notification:', error as Error);
    }
  };

  const isNotificationsDisabled = !isInitialized || permissionStatus !== 'granted' || !localPreferences.enabled;

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#8B5CF6', '#3B82F6']}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading notification settings...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#8B5CF6', '#3B82F6']}
        style={styles.gradient}
      >
        {/* Header */}
        <BlurView intensity={30} tint="light" style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          {hasChanges && (
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          )}
        </BlurView>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Permission Status */}
          {permissionStatus !== 'granted' && (
            <BlurView intensity={20} tint="light" style={styles.permissionBanner}>
              <Ionicons name="warning" size={24} color="#F59E0B" />
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>Notifications Disabled</Text>
                <Text style={styles.permissionDescription}>
                  Enable notifications to receive updates about your automations
                </Text>
              </View>
              <TouchableOpacity onPress={handleRequestPermissions} style={styles.enableButton}>
                <Text style={styles.enableButtonText}>Enable</Text>
              </TouchableOpacity>
            </BlurView>
          )}

          {/* Master Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            
            <SettingItem
              title="Enable Notifications"
              description="Receive push notifications from Zaptap"
              value={localPreferences.enabled}
              onValueChange={(value) => updateLocalPreference({ enabled: value })}
              disabled={permissionStatus !== 'granted'}
              icon="notifications"
            />
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notification Types</Text>
            
            <SettingItem
              title="Automations"
              description="Execution status and updates"
              value={localPreferences.categories.automations}
              onValueChange={(value) => updateCategoryPreference('automations', value)}
              disabled={isNotificationsDisabled}
              icon="cog"
            />
            
            <SettingItem
              title="Shares"
              description="When someone shares an automation with you"
              value={localPreferences.categories.shares}
              onValueChange={(value) => updateCategoryPreference('shares', value)}
              disabled={isNotificationsDisabled}
              icon="share"
            />
            
            <SettingItem
              title="Social"
              description="Follows, reviews, and comments"
              value={localPreferences.categories.social}
              onValueChange={(value) => updateCategoryPreference('social', value)}
              disabled={isNotificationsDisabled}
              icon="people"
            />
            
            <SettingItem
              title="System"
              description="App updates and announcements"
              value={localPreferences.categories.system}
              onValueChange={(value) => updateCategoryPreference('system', value)}
              disabled={isNotificationsDisabled}
              icon="information-circle"
            />
          </View>

          {/* Sound & Vibration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sound & Vibration</Text>
            
            <SettingItem
              title="Sound"
              description="Play sound for notifications"
              value={localPreferences.sound}
              onValueChange={(value) => updateLocalPreference({ sound: value })}
              disabled={isNotificationsDisabled}
              icon="volume-high"
            />
            
            {Platform.OS === 'ios' && (
              <SettingItem
                title="Vibration"
                description="Vibrate for notifications"
                value={localPreferences.vibration}
                onValueChange={(value) => updateLocalPreference({ vibration: value })}
                disabled={isNotificationsDisabled}
                icon="phone-portrait"
              />
            )}
            
            <SettingItem
              title="Lock Screen Preview"
              description="Show notification content on lock screen"
              value={localPreferences.preview}
              onValueChange={(value) => updateLocalPreference({ preview: value })}
              disabled={isNotificationsDisabled}
              icon="eye"
            />
          </View>

          {/* Quiet Hours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quiet Hours</Text>
            
            <SettingItem
              title="Enable Quiet Hours"
              description="Silence notifications during specified hours"
              value={localPreferences.quietHours.enabled}
              onValueChange={(value) => updateQuietHoursPreference({ enabled: value })}
              disabled={isNotificationsDisabled}
              icon="moon"
            />
            
            {localPreferences.quietHours.enabled && !isNotificationsDisabled && (
              <View style={styles.quietHoursContainer}>
                <TimePicker
                  label="Start Time"
                  time={localPreferences.quietHours.start}
                  onTimeChange={(time) => updateQuietHoursPreference({ start: time })}
                  disabled={!localPreferences.quietHours.enabled || isNotificationsDisabled}
                />
                <TimePicker
                  label="End Time"
                  time={localPreferences.quietHours.end}
                  onTimeChange={(time) => updateQuietHoursPreference({ end: time })}
                  disabled={!localPreferences.quietHours.enabled || isNotificationsDisabled}
                />
              </View>
            )}
          </View>

          {/* Test */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test</Text>
            
            <TouchableOpacity
              onPress={handleTestNotification}
              disabled={isNotificationsDisabled}
              style={styles.testButton}
            >
              <BlurView intensity={20} tint="light" style={styles.testButtonContent}>
                <Ionicons 
                  name="send" 
                  size={24} 
                  color={isNotificationsDisabled ? '#9CA3AF' : '#8B5CF6'} 
                />
                <Text style={[
                  styles.testButtonText,
                  isNotificationsDisabled && styles.disabledText
                ]}>
                  Send Test Notification
                </Text>
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Bottom spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  permissionContent: {
    flex: 1,
    marginLeft: 12,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  enableButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  settingItem: {
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  disabledText: {
    opacity: 0.4,
  },
  quietHoursContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  timePicker: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testButton: {
    borderRadius: 12,
  },
  testButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  bottomSpacing: {
    height: 32,
  },
});

export default NotificationSettings;