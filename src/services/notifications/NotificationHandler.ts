/**
 * NotificationHandler.ts
 * Handles different notification types, deep linking, and notification actions
 * Features: deep linking, automation execution, analytics tracking, error handling
 */

import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  NotificationPayload, 
  StoredNotification, 
  NotificationResponse,
  NotificationTemplates
} from '../../types/notifications';
import NotificationService from './NotificationService';
import { EventLogger } from '../../utils/EventLogger';

interface NavigationRef {
  current: any;
}

interface DeepLinkAction {
  screen: string;
  params?: Record<string, any>;
}

class NotificationHandler {
  private static instance: NotificationHandler;
  private navigationRef: NavigationRef | null = null;
  private notificationQueue: StoredNotification[] = [];
  
  // Storage keys
  private static readonly STORAGE_KEYS = {
    NOTIFICATION_HISTORY: '@zaptap_notification_history',
    UNREAD_COUNT: '@zaptap_unread_count',
    LAST_NOTIFICATION_ID: '@zaptap_last_notification_id',
  };

  // Maximum notifications to store locally
  private static readonly MAX_STORED_NOTIFICATIONS = 50;

  private constructor() {}

  public static getInstance(): NotificationHandler {
    if (!NotificationHandler.instance) {
      NotificationHandler.instance = new NotificationHandler();
    }
    return NotificationHandler.instance;
  }

  /**
   * Set navigation reference for deep linking
   */
  public setNavigationRef(navigationRef: NavigationRef): void {
    this.navigationRef = navigationRef;
    EventLogger.debug('NotificationHandler', '[NotificationHandler] Navigation reference set');
  }

  /**
   * Check if navigation is ready
   */
  private isNavigationReady(): boolean {
    return this.navigationRef?.current?.isReady?.() === true;
  }

  /**
   * Initialize notification handler
   */
  public async initialize(): Promise<void> {
    try {
      // Process any queued notifications
      await this.processNotificationQueue();
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      EventLogger.debug('NotificationHandler', '[NotificationHandler] Initialized successfully');
    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Initialization failed:', error as Error);
    }
  }

  /**
   * Handle incoming notification
   */
  public async handleNotification(notification: Notifications.Notification): Promise<void> {
    try {
      const payload = this.parseNotificationPayload(notification);
      if (!payload) {
        EventLogger.warn('NotificationHandler', '[NotificationHandler] Invalid notification payload');
        return;
      }

      // Store notification
      const storedNotification = await this.storeNotification(payload);
      
      // Update unread count
      await this.incrementUnreadCount();
      
      // Track analytics
      await this.trackNotificationReceived(payload);
      
      // Handle specific notification types
      await this.handleNotificationType(payload);
      
      EventLogger.debug('NotificationHandler', '[NotificationHandler] Notification handled:', payload.type);

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to handle notification:', error as Error);
    }
  }

  /**
   * Handle notification response (user tapped notification)
   */
  public async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const payload = this.parseNotificationPayload(response.notification);
      if (!payload) {
        EventLogger.warn('NotificationHandler', '[NotificationHandler] Invalid notification response payload');
        return;
      }

      // Mark notification as read
      await this.markNotificationAsRead(payload);
      
      // Handle deep linking
      await this.handleDeepLink(payload, response.actionIdentifier);
      
      // Track analytics
      await this.trackNotificationOpened(payload, response.actionIdentifier);
      
      EventLogger.debug('NotificationHandler', '[NotificationHandler] Notification response handled:', payload.type, response.actionIdentifier);

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to handle notification response:', error as Error);
    }
  }

  /**
   * Parse notification payload
   */
  private parseNotificationPayload(notification: Notifications.Notification): NotificationPayload | null {
    try {
      const { title, body, data } = notification.request.content;
      
      if (!title || !body || !data?.type) {
        return null;
      }

      return {
        type: data.type as NotificationPayload['type'],
        title,
        body,
        data: data as NotificationPayload['data'],
      };

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to parse notification payload:', error as Error);
      return null;
    }
  }

  /**
   * Store notification locally
   */
  private async storeNotification(payload: NotificationPayload): Promise<StoredNotification> {
    try {
      const notification: StoredNotification = {
        id: await this.generateNotificationId(),
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        read: false,
        createdAt: payload.data.timestamp || new Date().toISOString(),
        receivedAt: new Date().toISOString(),
      };

      // Get existing notifications
      const existing = await this.getStoredNotifications();
      
      // Add new notification at the beginning
      const updated = [notification, ...existing];
      
      // Limit to maximum stored notifications
      const limited = updated.slice(0, NotificationHandler.MAX_STORED_NOTIFICATIONS);
      
      // Store updated list
      await AsyncStorage.setItem(
        NotificationHandler.STORAGE_KEYS.NOTIFICATION_HISTORY,
        JSON.stringify(limited)
      );

      return notification;

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to store notification:', error as Error);
      throw error;
    }
  }

  /**
   * Get stored notifications
   */
  public async getStoredNotifications(): Promise<StoredNotification[]> {
    try {
      const stored = await AsyncStorage.getItem(NotificationHandler.STORAGE_KEYS.NOTIFICATION_HISTORY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to get stored notifications:', error as Error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  public async markNotificationAsRead(payload: NotificationPayload): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      
      const updated = notifications.map(notification => {
        if (notification.title === payload.title && 
            notification.body === payload.body && 
            !notification.read) {
          return { ...notification, read: true };
        }
        return notification;
      });

      await AsyncStorage.setItem(
        NotificationHandler.STORAGE_KEYS.NOTIFICATION_HISTORY,
        JSON.stringify(updated)
      );

      // Update unread count
      await this.updateUnreadCount();

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to mark notification as read:', error as Error);
    }
  }

  /**
   * Handle specific notification types
   */
  private async handleNotificationType(payload: NotificationPayload): Promise<void> {
    try {
      switch (payload.type) {
        case 'automation':
          await this.handleAutomationNotification(payload);
          break;
        case 'share':
          await this.handleShareNotification(payload);
          break;
        case 'social':
          await this.handleSocialNotification(payload);
          break;
        case 'system':
          await this.handleSystemNotification(payload);
          break;
        default:
          EventLogger.warn('NotificationHandler', '[NotificationHandler] Unknown notification type:', payload.type);
      }
    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to handle notification type:', error as Error);
    }
  }

  /**
   * Handle automation notifications
   */
  private async handleAutomationNotification(payload: NotificationPayload): Promise<void> {
    const { automationId, action } = payload.data;
    
    if (action === 'execute' && automationId) {
      // Could trigger automation execution here
      EventLogger.debug('NotificationHandler', '[NotificationHandler] Automation execution notification:', automationId);
    }
  }

  /**
   * Handle share notifications
   */
  private async handleShareNotification(payload: NotificationPayload): Promise<void> {
    const { shareUrl, automationId } = payload.data;
    
    if (shareUrl) {
      // Store share URL for later access
      EventLogger.debug('NotificationHandler', '[NotificationHandler] Share notification:', shareUrl);
    }
  }

  /**
   * Handle social notifications
   */
  private async handleSocialNotification(payload: NotificationPayload): Promise<void> {
    const { userId, action } = payload.data;
    
    EventLogger.debug('NotificationHandler', '[NotificationHandler] Social notification:', action, userId);
  }

  /**
   * Handle system notifications
   */
  private async handleSystemNotification(payload: NotificationPayload): Promise<void> {
    const { action } = payload.data;
    
    EventLogger.debug('NotificationHandler', '[NotificationHandler] System notification:', action);
  }

  /**
   * Handle deep linking from notifications
   */
  private async handleDeepLink(payload: NotificationPayload, actionIdentifier: string): Promise<void> {
    try {
      const deepLinkAction = this.getDeepLinkAction(payload, actionIdentifier);
      
      if (!deepLinkAction) {
        EventLogger.debug('NotificationHandler', '[NotificationHandler] No deep link action for notification');
        return;
      }

      // Check if navigation is ready
      if (this.isNavigationReady()) {
        this.navigationRef!.current.navigate(deepLinkAction.screen, deepLinkAction.params);
        EventLogger.debug('NotificationHandler', '[NotificationHandler] Navigated to:', deepLinkAction.screen);
      } else if (this.navigationRef?.current) {
        // Navigation ref exists but not ready, retry after delay
        EventLogger.warn('NotificationHandler', '[NotificationHandler] Navigation not ready, retrying in 500ms');
        setTimeout(() => {
          if (this.isNavigationReady()) {
            this.navigationRef!.current.navigate(deepLinkAction.screen, deepLinkAction.params);
            EventLogger.debug('NotificationHandler', '[NotificationHandler] Navigated to (on retry):', deepLinkAction.screen);
          } else {
            // Still not ready, queue it
            this.queueNavigationAction(payload, deepLinkAction);
          }
        }, 500);
      } else {
        // No navigation ref at all, queue for later
        this.queueNavigationAction(payload, deepLinkAction);
        EventLogger.debug('NotificationHandler', '[NotificationHandler] Queued navigation for later:', deepLinkAction.screen);
      }

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to handle deep link:', error as Error);
    }
  }

  /**
   * Queue navigation action for later
   */
  private async queueNavigationAction(payload: NotificationPayload, deepLinkAction: DeepLinkAction): Promise<void> {
    this.notificationQueue.push({
      id: await this.generateNotificationId(),
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: { ...payload.data, deepLinkAction },
      read: false,
      createdAt: new Date().toISOString(),
      receivedAt: new Date().toISOString(),
    });
  }

  /**
   * Get deep link action for notification
   */
  private getDeepLinkAction(payload: NotificationPayload, actionIdentifier: string): DeepLinkAction | null {
    const { type, data } = payload;

    switch (type) {
      case 'automation':
        if (actionIdentifier === 'view' && data.automationId) {
          return {
            screen: 'AutomationDetails',
            params: { automationId: data.automationId },
          };
        }
        break;

      case 'share':
        if (actionIdentifier === 'open' && data.shareUrl) {
          // Parse share URL to get automation ID
          const shareMatch = data.shareUrl.match(/\/share\/([^\/]+)/);
          if (shareMatch) {
            return {
              screen: 'SharedAutomation',
              params: { publicId: shareMatch[1] },
            };
          }
        }
        break;

      case 'social':
        if (actionIdentifier === 'view' && data.userId) {
          return {
            screen: 'Profile',
            params: { userId: data.userId },
          };
        }
        break;

      case 'system':
        if (actionIdentifier === 'view') {
          return {
            screen: 'Settings',
            params: {},
          };
        }
        break;
    }

    return null;
  }

  /**
   * Process queued notifications (when navigation becomes available)
   */
  private async processNotificationQueue(): Promise<void> {
    try {
      if (this.notificationQueue.length === 0 || !this.isNavigationReady()) {
        return;
      }

      for (const notification of this.notificationQueue) {
        const deepLinkAction = notification.data.deepLinkAction as DeepLinkAction;
        if (deepLinkAction) {
          this.navigationRef!.current.navigate(deepLinkAction.screen, deepLinkAction.params);
          EventLogger.debug('NotificationHandler', '[NotificationHandler] Processed queued navigation:', deepLinkAction.screen);
        }
      }

      this.notificationQueue = [];

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to process notification queue:', error as Error);
    }
  }

  /**
   * Set up notification listeners
   */
  private setupNotificationListeners(): void {
    // Listener for notifications received while app is running
    Notifications.addNotificationReceivedListener(
      this.handleNotification.bind(this)
    );

    // Listener for user tapping notification
    Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    EventLogger.debug('NotificationHandler', '[NotificationHandler] Notification listeners set up');
  }

  /**
   * Generate unique notification ID
   */
  private async generateNotificationId(): Promise<string> {
    try {
      const lastId = await AsyncStorage.getItem(NotificationHandler.STORAGE_KEYS.LAST_NOTIFICATION_ID);
      const newId = lastId ? parseInt(lastId, 10) + 1 : 1;
      
      await AsyncStorage.setItem(
        NotificationHandler.STORAGE_KEYS.LAST_NOTIFICATION_ID,
        newId.toString()
      );

      return `notification_${newId}_${Date.now()}`;

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to generate notification ID:', error as Error);
      return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Increment unread count
   */
  private async incrementUnreadCount(): Promise<void> {
    try {
      const current = await this.getUnreadCount();
      const newCount = current + 1;
      
      await AsyncStorage.setItem(
        NotificationHandler.STORAGE_KEYS.UNREAD_COUNT,
        newCount.toString()
      );

      // Update app badge
      await NotificationService.setBadgeCount(newCount);

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to increment unread count:', error as Error);
    }
  }

  /**
   * Update unread count based on stored notifications
   */
  private async updateUnreadCount(): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const unreadCount = notifications.filter(n => !n.read).length;
      
      await AsyncStorage.setItem(
        NotificationHandler.STORAGE_KEYS.UNREAD_COUNT,
        unreadCount.toString()
      );

      // Update app badge
      await NotificationService.setBadgeCount(unreadCount);

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to update unread count:', error as Error);
    }
  }

  /**
   * Get unread count
   */
  public async getUnreadCount(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(NotificationHandler.STORAGE_KEYS.UNREAD_COUNT);
      return stored ? parseInt(stored, 10) : 0;
    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to get unread count:', error as Error);
      return 0;
    }
  }

  /**
   * Clear all notifications
   */
  public async clearAllNotifications(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        NotificationHandler.STORAGE_KEYS.NOTIFICATION_HISTORY,
        NotificationHandler.STORAGE_KEYS.UNREAD_COUNT,
      ]);

      await NotificationService.clearBadge();
      
      EventLogger.debug('NotificationHandler', '[NotificationHandler] All notifications cleared');

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to clear notifications:', error as Error);
    }
  }

  /**
   * Mark all notifications as read
   */
  public async markAllAsRead(): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updated = notifications.map(n => ({ ...n, read: true }));
      
      await AsyncStorage.setItem(
        NotificationHandler.STORAGE_KEYS.NOTIFICATION_HISTORY,
        JSON.stringify(updated)
      );

      await AsyncStorage.setItem(
        NotificationHandler.STORAGE_KEYS.UNREAD_COUNT,
        '0'
      );

      await NotificationService.clearBadge();
      
      EventLogger.debug('NotificationHandler', '[NotificationHandler] All notifications marked as read');

    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to mark all as read:', error as Error);
    }
  }

  /**
   * Track notification received analytics
   */
  private async trackNotificationReceived(payload: NotificationPayload): Promise<void> {
    try {
      // Analytics tracking would go here
      EventLogger.debug('NotificationHandler', '[NotificationHandler] Analytics: notification received', payload.type);
    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to track notification received:', error as Error);
    }
  }

  /**
   * Track notification opened analytics
   */
  private async trackNotificationOpened(payload: NotificationPayload, actionIdentifier: string): Promise<void> {
    try {
      // Analytics tracking would go here
      EventLogger.debug('NotificationHandler', '[NotificationHandler] Analytics: notification opened', payload.type, actionIdentifier);
    } catch (error) {
      EventLogger.error('NotificationHandler', '[NotificationHandler] Failed to track notification opened:', error as Error);
    }
  }

  /**
   * Send test notification
   */
  public async sendTestNotification(): Promise<void> {
    const testPayload: NotificationPayload = {
      type: 'system',
      title: 'Test Notification',
      body: 'This is a test notification from Zaptap',
      data: {
        action: 'test',
        timestamp: new Date().toISOString(),
      },
    };

    await this.handleNotification({
      date: Date.now(),
      request: {
        identifier: 'test',
        content: {
          title: testPayload.title,
          body: testPayload.body,
          data: testPayload.data,
        },
        trigger: null,
      },
    } as Notifications.Notification);
  }
}

export default NotificationHandler.getInstance();