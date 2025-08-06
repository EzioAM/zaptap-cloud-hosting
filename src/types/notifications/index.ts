/**
 * Notification Types and Interfaces
 * Defines the structure for push notifications in the Zaptap app
 */

export type NotificationType = 'automation' | 'share' | 'social' | 'system';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data: {
    automationId?: string;
    shareUrl?: string; // https://www.zaptap.cloud/share/{publicId}
    userId?: string;
    action?: string;
    timestamp?: string;
    priority?: 'high' | 'normal' | 'low';
  };
}

export interface NotificationPreferences {
  enabled: boolean;
  categories: {
    automations: boolean;
    shares: boolean;
    social: boolean;
    system: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
  };
  sound: boolean;
  vibration: boolean;
  preview: boolean; // Show notification content in lock screen
}

export interface PushToken {
  token: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationState {
  pushToken: string | null;
  permissionStatus: 'granted' | 'denied' | 'undetermined';
  preferences: NotificationPreferences;
  unreadCount: number;
  recentNotifications: StoredNotification[];
  isInitialized: boolean;
  lastTokenSync: string | null;
}

export interface StoredNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationPayload['data'];
  read: boolean;
  createdAt: string;
  receivedAt: string;
}

export interface NotificationAction {
  identifier: string;
  title: string;
  options?: {
    opensAppToForeground?: boolean;
    isAuthenticationRequired?: boolean;
    isDestructive?: boolean;
  };
}

export interface NotificationCategory {
  identifier: string;
  actions: NotificationAction[];
  options?: {
    customDismissAction?: boolean;
    allowInCarPlay?: boolean;
    allowAnnouncement?: boolean;
    intentIdentifiers?: string[];
  };
}

export interface LocalNotificationRequest {
  content: {
    title: string;
    body: string;
    data?: Record<string, any>;
    sound?: string;
    badge?: number;
    categoryIdentifier?: string;
  };
  trigger: {
    type: 'time' | 'calendar' | 'location';
    date?: Date;
    repeats?: boolean;
    channelId?: string; // Android specific
  };
}

export interface NotificationResponse {
  notification: NotificationPayload;
  actionIdentifier: string;
  userText?: string;
}

export interface NotificationPermissions {
  status: 'granted' | 'denied' | 'undetermined';
  ios?: {
    allowsAlert: boolean;
    allowsBadge: boolean;
    allowsSound: boolean;
    allowsCriticalAlerts: boolean;
    allowsAnnouncements: boolean;
    allowsDisplayInNotificationCenter: boolean;
    allowsDisplayInCarPlay: boolean;
    allowsDisplayOnLockScreen: boolean;
  };
}

// Notification templates for consistent messaging
export const NotificationTemplates = {
  AUTOMATION_EXECUTED: (automationName: string) => ({
    title: 'Automation Executed',
    body: `"${automationName}" has been triggered successfully`,
  }),
  
  AUTOMATION_SHARED: (automationName: string, senderName: string) => ({
    title: 'Automation Shared',
    body: `${senderName} shared "${automationName}" with you`,
  }),
  
  NEW_FOLLOWER: (followerName: string) => ({
    title: 'New Follower',
    body: `${followerName} started following you`,
  }),
  
  AUTOMATION_REVIEWED: (automationName: string, rating: number) => ({
    title: 'New Review',
    body: `Someone gave "${automationName}" ${rating} stars`,
  }),
  
  TRENDING_AUTOMATION: (automationName: string) => ({
    title: 'Trending Now',
    body: `"${automationName}" is trending in your interests`,
  }),
  
  SYSTEM_ANNOUNCEMENT: (message: string) => ({
    title: 'Zaptap Update',
    body: message,
  }),
};

// Default notification preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  categories: {
    automations: true,
    shares: true,
    social: true,
    system: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  sound: true,
  vibration: true,
  preview: true,
};

// Notification channels for Android
export const NotificationChannels = {
  DEFAULT: {
    id: 'default',
    name: 'General',
    description: 'General notifications',
    importance: 'normal' as const,
  },
  AUTOMATIONS: {
    id: 'automations',
    name: 'Automations',
    description: 'Automation execution and updates',
    importance: 'high' as const,
  },
  SOCIAL: {
    id: 'social',
    name: 'Social',
    description: 'Follows, shares, and reviews',
    importance: 'normal' as const,
  },
  SYSTEM: {
    id: 'system',
    name: 'System',
    description: 'App updates and announcements',
    importance: 'low' as const,
  },
};