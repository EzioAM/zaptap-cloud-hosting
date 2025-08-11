/**
 * NotificationService.ts
 * Core notification service handling Expo notifications
 * Features: permissions, push tokens, local notifications, badge management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventLogger } from '../../utils/EventLogger';
import { 
  NotificationPayload, 
  NotificationPreferences, 
  LocalNotificationRequest,
  NotificationPermissions,
  NotificationChannels,
  DEFAULT_NOTIFICATION_PREFERENCES,
  PushToken,
  NotificationResponse
} from '../../types/notifications';

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  
  // Storage keys
  private static readonly STORAGE_KEYS = {
    PREFERENCES: '@zaptap_notification_preferences',
    PUSH_TOKEN: '@zaptap_push_token',
    LAST_TOKEN_SYNC: '@zaptap_token_sync',
    BADGE_COUNT: '@zaptap_badge_count',
  };

  private constructor() {
    this.setupNotificationHandler();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  public async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // Set up notification categories
      await this.setupNotificationCategories();

      // Setup listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      EventLogger.debug('Notification', '[NotificationService] Initialized successfully');
      return true;

    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Initialization failed:', error as Error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  public async requestPermissions(): Promise<NotificationPermissions> {
    try {
      if (!Device.isDevice) {
        // Silently handle simulator - this is expected during development
        return { status: 'denied' };
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowAnnouncements: true,
            allowCriticalAlerts: false,
          },
        });
        finalStatus = status;
      }

      // Get detailed permissions for iOS
      let iosPermissions;
      if (Platform.OS === 'ios' && finalStatus === 'granted') {
        const permissions = await Notifications.getPermissionsAsync();
        iosPermissions = {
          allowsAlert: permissions.ios?.allowsAlert ?? false,
          allowsBadge: permissions.ios?.allowsBadge ?? false,
          allowsSound: permissions.ios?.allowsSound ?? false,
          allowsCriticalAlerts: permissions.ios?.allowsCriticalAlerts ?? false,
          allowsAnnouncements: permissions.ios?.allowsAnnouncements ?? false,
          allowsDisplayInNotificationCenter: permissions.ios?.allowsDisplayInNotificationCenter ?? false,
          allowsDisplayInCarPlay: permissions.ios?.allowsDisplayInCarPlay ?? false,
          allowsDisplayOnLockScreen: permissions.ios?.allowsDisplayOnLockScreen ?? false,
        };
      }

      const result: NotificationPermissions = {
        status: finalStatus as 'granted' | 'denied' | 'undetermined',
        ios: iosPermissions,
      };

      // Only log in development if not on simulator
      if (__DEV__ && Device.isDevice) {
        EventLogger.debug('Notification', '[NotificationService] Permission status:', result);
      }
      return result;

    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Permission request failed:', error as Error);
      return { status: 'denied' };
    }
  }

  /**
   * Get push notification token
   */
  public async getPushToken(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        // Silently handle simulator - this is expected during development
        return null;
      }

      const permissions = await this.requestPermissions();
      if (permissions.status !== 'granted') {
        // Silently handle denied permissions - user choice
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'c9104518-2191-4a5a-aa20-76cebb5193cd', // From app.config.js
      });

      const token = tokenData.data;
      
      // Store token locally
      await AsyncStorage.setItem(NotificationService.STORAGE_KEYS.PUSH_TOKEN, token);
      
      // Only log in development if not on simulator
      if (__DEV__ && Device.isDevice) {
        EventLogger.debug('Notification', '[NotificationService] Push token obtained:', token.substring(0, 20) + '...');
      }
      return token;

    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to get push token:', error as Error);
      return null;
    }
  }

  /**
   * Schedule a local notification
   */
  public async scheduleLocalNotification(request: LocalNotificationRequest): Promise<string | null> {
    try {
      const permissions = await this.requestPermissions();
      if (permissions.status !== 'granted') {
        EventLogger.warn('Notification', '[NotificationService] Cannot schedule notification without permission');
        return null;
      }

      const notificationRequest: Notifications.NotificationRequestInput = {
        content: {
          title: request.content.title,
          body: request.content.body,
          data: request.content.data || {},
          sound: request.content.sound || 'default',
          badge: request.content.badge,
          categoryIdentifier: request.content.categoryIdentifier,
        },
        trigger: null, // Will be set based on trigger type
      };

      // Set trigger based on type
      if (request.trigger.type === 'time' && request.trigger.date) {
        notificationRequest.trigger = {
          date: request.trigger.date,
          repeats: request.trigger.repeats || false,
          channelId: request.trigger.channelId || NotificationChannels.DEFAULT.id,
        };
      }

      const identifier = await Notifications.scheduleNotificationAsync(notificationRequest);
      EventLogger.debug('Notification', '[NotificationService] Local notification scheduled:', identifier);
      return identifier;

    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to schedule local notification:', error as Error);
      return null;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  public async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      EventLogger.debug('Notification', '[NotificationService] Notification cancelled:', identifier);
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to cancel notification:', error as Error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      EventLogger.debug('Notification', '[NotificationService] All notifications cancelled');
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to cancel all notifications:', error as Error);
    }
  }

  /**
   * Set app badge number
   */
  public async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      await AsyncStorage.setItem(NotificationService.STORAGE_KEYS.BADGE_COUNT, count.toString());
      EventLogger.debug('Notification', '[NotificationService] Badge count set to:', count);
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to set badge count:', error as Error);
    }
  }

  /**
   * Get current badge count
   */
  public async getBadgeCount(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(NotificationService.STORAGE_KEYS.BADGE_COUNT);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to get badge count:', error as Error);
      return 0;
    }
  }

  /**
   * Clear app badge
   */
  public async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Get notification preferences
   */
  public async getPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(NotificationService.STORAGE_KEYS.PREFERENCES);
      if (stored) {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(stored) };
      }
      return DEFAULT_NOTIFICATION_PREFERENCES;
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to get preferences:', error as Error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Save notification preferences
   */
  public async savePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await AsyncStorage.setItem(
        NotificationService.STORAGE_KEYS.PREFERENCES,
        JSON.stringify(preferences)
      );
      EventLogger.debug('Notification', '[NotificationService] Preferences saved');
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to save preferences:', error as Error);
    }
  }

  /**
   * Check if notifications should be shown based on quiet hours
   */
  public async shouldShowNotification(type: NotificationPayload['type']): Promise<boolean> {
    try {
      const preferences = await this.getPreferences();
      
      if (!preferences.enabled) {
        return false;
      }

      // Check category preferences
      switch (type) {
        case 'automation':
          if (!preferences.categories.automations) return false;
          break;
        case 'share':
          if (!preferences.categories.shares) return false;
          break;
        case 'social':
          if (!preferences.categories.social) return false;
          break;
        case 'system':
          if (!preferences.categories.system) return false;
          break;
      }

      // Check quiet hours
      if (preferences.quietHours.enabled) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
        const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
        
        const quietStart = startHour * 60 + startMin;
        const quietEnd = endHour * 60 + endMin;
        
        // Handle quiet hours spanning midnight
        if (quietStart > quietEnd) {
          if (currentTime >= quietStart || currentTime <= quietEnd) {
            return false;
          }
        } else {
          if (currentTime >= quietStart && currentTime <= quietEnd) {
            return false;
          }
        }
      }

      return true;

    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Error checking notification permission:', error as Error);
      return true; // Default to showing notifications
    }
  }

  /**
   * Set up notification handler for background/foreground behavior
   */
  private setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const type = notification.request.content.data?.type as NotificationPayload['type'];
        const shouldShow = await this.shouldShowNotification(type || 'system');
        
        return {
          shouldShowAlert: shouldShow,
          shouldPlaySound: shouldShow,
          shouldSetBadge: shouldShow,
        };
      },
    });
  }

  /**
   * Set up Android notification channels
   */
  private async setupAndroidChannels(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const channels = Object.values(NotificationChannels);
      
      for (const channel of channels) {
        await Notifications.setNotificationChannelAsync(channel.id, {
          name: channel.name,
          description: channel.description,
          importance: Notifications.AndroidImportance[channel.importance.toUpperCase() as keyof typeof Notifications.AndroidImportance],
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8B5CF6',
          sound: 'default',
          enableVibrate: true,
        });
      }

      EventLogger.debug('Notification', '[NotificationService] Android channels configured');
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to setup Android channels:', error as Error);
    }
  }

  /**
   * Set up notification categories for actions
   */
  private async setupNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('automation', [
        {
          identifier: 'view',
          buttonTitle: 'View',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Dismiss',
          options: { opensAppToForeground: false },
        },
      ]);

      await Notifications.setNotificationCategoryAsync('share', [
        {
          identifier: 'open',
          buttonTitle: 'Open',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'later',
          buttonTitle: 'Later',
          options: { opensAppToForeground: false },
        },
      ]);

      EventLogger.debug('Notification', '[NotificationService] Notification categories configured');
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to setup notification categories:', error as Error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Clean up existing listeners
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }

    // Listener for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Listener for user tapping notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    EventLogger.debug('Notification', '[NotificationService] Notification listeners configured');
  }

  /**
   * Handle notification received while app is running
   */
  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    try {
      EventLogger.debug('Notification', '[NotificationService] Notification received:', notification);
      
      // Update badge count
      const currentBadge = await this.getBadgeCount();
      await this.setBadgeCount(currentBadge + 1);

      // Store notification for later reference
      // This would typically be handled by the NotificationHandler
      
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Error handling received notification:', error as Error);
    }
  }

  /**
   * Handle notification response (user tapped notification)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      EventLogger.debug('Notification', '[NotificationService] Notification response:', response);
      
      // Clear badge when user interacts with notification
      await this.clearBadge();

      // This would typically be handled by the NotificationHandler
      // for deep linking and app navigation
      
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Error handling notification response:', error as Error);
    }
  }

  /**
   * Clean up listeners
   */
  public cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    
    this.isInitialized = false;
    EventLogger.debug('Notification', '[NotificationService] Cleaned up');
  }

  /**
   * Get stored push token
   */
  public async getStoredPushToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(NotificationService.STORAGE_KEYS.PUSH_TOKEN);
    } catch (error) {
      EventLogger.error('Notification', '[NotificationService] Failed to get stored push token:', error as Error);
      return null;
    }
  }

  /**
   * Test notification (for debugging)
   */
  public async sendTestNotification(): Promise<void> {
    await this.scheduleLocalNotification({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification from Zaptap',
        data: { type: 'system' },
        categoryIdentifier: 'automation',
      },
      trigger: {
        type: 'time',
        date: new Date(Date.now() + 2000), // 2 seconds from now
      },
    });
  }
}

export default NotificationService.getInstance();