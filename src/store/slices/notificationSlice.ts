/**
 * notificationSlice.ts
 * Redux slice for managing notification state
 * Features: push token, permissions, preferences, unread count, recent notifications
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  NotificationState,
  NotificationPreferences,
  StoredNotification,
  NotificationPermissions,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../types/notifications';
import NotificationService from '../../services/notifications/NotificationService';
import PushTokenManager from '../../services/notifications/PushTokenManager';
import NotificationHandler from '../../services/notifications/NotificationHandler';
import { EventLogger } from '../../utils/EventLogger';

// Initial state
const initialState: NotificationState = {
  pushToken: null,
  permissionStatus: 'undetermined',
  preferences: DEFAULT_NOTIFICATION_PREFERENCES,
  unreadCount: 0,
  recentNotifications: [],
  isInitialized: false,
  lastTokenSync: null,
};

// Async thunks

/**
 * Initialize notification system
 */
export const initializeNotifications = createAsyncThunk(
  'notifications/initialize',
  async (_, { rejectWithValue }) => {
    try {
      // Initialize notification service
      const serviceInitialized = await NotificationService.initialize();
      if (!serviceInitialized) {
        throw new Error('Failed to initialize notification service');
      }

      // Initialize notification handler
      await NotificationHandler.initialize();

      // Request permissions
      const permissions = await NotificationService.requestPermissions();
      
      // Get push token if permissions granted
      let pushToken = null;
      if (permissions.status === 'granted') {
        pushToken = await NotificationService.getPushToken();
      }

      // Load preferences
      const preferences = await NotificationService.getPreferences();
      
      // Load unread count
      const unreadCount = await NotificationHandler.getUnreadCount();
      
      // Load recent notifications
      const recentNotifications = await NotificationHandler.getStoredNotifications();

      return {
        pushToken,
        permissionStatus: permissions.status,
        preferences,
        unreadCount,
        recentNotifications: recentNotifications.slice(0, 10), // Keep only 10 most recent
        isInitialized: true,
      };

    } catch (error) {
      EventLogger.error('notificationSlice', '[notificationSlice] Initialize failed:', error as Error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = createAsyncThunk(
  'notifications/requestPermissions',
  async (_, { rejectWithValue }) => {
    try {
      const permissions = await NotificationService.requestPermissions();
      
      // If permissions granted, get push token
      let pushToken = null;
      if (permissions.status === 'granted') {
        pushToken = await NotificationService.getPushToken();
      }

      return {
        permissions,
        pushToken,
      };

    } catch (error) {
      EventLogger.error('notificationSlice', '[notificationSlice] Request permissions failed:', error as Error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Register push token with backend
 */
export const registerPushToken = createAsyncThunk(
  'notifications/registerToken',
  async (userId: string | undefined, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { notifications: NotificationState };
      
      if (!state.notifications.pushToken) {
        throw new Error('No push token available');
      }

      const success = await PushTokenManager.registerToken(userId);
      if (!success) {
        throw new Error('Failed to register push token');
      }

      const syncStatus = await PushTokenManager.getSyncStatus();
      
      return {
        lastTokenSync: syncStatus.lastSyncTime,
      };

    } catch (error) {
      EventLogger.error('notificationSlice', '[notificationSlice] Register token failed:', error as Error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Update notification preferences
 */
export const updateNotificationPreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async (preferences: NotificationPreferences, { rejectWithValue }) => {
    try {
      await NotificationService.savePreferences(preferences);
      return preferences;

    } catch (error) {
      EventLogger.error('notificationSlice', '[notificationSlice] Update preferences failed:', error as Error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Refresh notifications
 */
export const refreshNotifications = createAsyncThunk(
  'notifications/refresh',
  async (_, { rejectWithValue }) => {
    try {
      const unreadCount = await NotificationHandler.getUnreadCount();
      const recentNotifications = await NotificationHandler.getStoredNotifications();

      return {
        unreadCount,
        recentNotifications: recentNotifications.slice(0, 10),
      };

    } catch (error) {
      EventLogger.error('notificationSlice', '[notificationSlice] Refresh failed:', error as Error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await NotificationHandler.markAllAsRead();
      
      const recentNotifications = await NotificationHandler.getStoredNotifications();
      
      return {
        unreadCount: 0,
        recentNotifications: recentNotifications.slice(0, 10),
      };

    } catch (error) {
      EventLogger.error('notificationSlice', '[notificationSlice] Mark all as read failed:', error as Error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Clear all notifications
 */
export const clearAllNotifications = createAsyncThunk(
  'notifications/clearAll',
  async (_, { rejectWithValue }) => {
    try {
      await NotificationHandler.clearAllNotifications();
      
      return {
        unreadCount: 0,
        recentNotifications: [],
      };

    } catch (error) {
      EventLogger.error('notificationSlice', '[notificationSlice] Clear all failed:', error as Error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

/**
 * Send test notification
 */
export const sendTestNotification = createAsyncThunk(
  'notifications/sendTest',
  async (_, { rejectWithValue }) => {
    try {
      await NotificationService.sendTestNotification();
      return true;

    } catch (error) {
      EventLogger.error('notificationSlice', '[notificationSlice] Send test notification failed:', error as Error);
      return rejectWithValue(error instanceof Error ? error.message : 'Unknown error');
    }
  }
);

// Notification slice
const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Synchronous actions
    
    setPushToken: (state, action: PayloadAction<string | null>) => {
      state.pushToken = action.payload;
    },
    
    setPermissionStatus: (state, action: PayloadAction<NotificationPermissions['status']>) => {
      state.permissionStatus = action.payload;
    },
    
    updateUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    
    addNotification: (state, action: PayloadAction<StoredNotification>) => {
      // Add new notification to the beginning
      state.recentNotifications.unshift(action.payload);
      
      // Keep only 10 most recent
      state.recentNotifications = state.recentNotifications.slice(0, 10);
      
      // Update unread count if notification is unread
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const notification = state.recentNotifications.find(n => n.id === notificationId);
      
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const index = state.recentNotifications.findIndex(n => n.id === notificationId);
      
      if (index !== -1) {
        const notification = state.recentNotifications[index];
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.recentNotifications.splice(index, 1);
      }
    },
    
    updatePreferences: (state, action: PayloadAction<Partial<NotificationPreferences>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },
    
    resetNotificationState: () => {
      return initialState;
    },
  },
  
  extraReducers: (builder) => {
    // Initialize notifications
    builder
      .addCase(initializeNotifications.pending, (state) => {
        state.isInitialized = false;
      })
      .addCase(initializeNotifications.fulfilled, (state, action) => {
        return { ...state, ...action.payload };
      })
      .addCase(initializeNotifications.rejected, (state, action) => {
        state.isInitialized = false;
        EventLogger.error('notificationSlice', 'Initialize notifications failed:', action.payload as Error);
      });

    // Request permissions
    builder
      .addCase(requestNotificationPermissions.fulfilled, (state, action) => {
        state.permissionStatus = action.payload.permissions.status;
        if (action.payload.pushToken) {
          state.pushToken = action.payload.pushToken;
        }
      })
      .addCase(requestNotificationPermissions.rejected, (state, action) => {
        EventLogger.error('notificationSlice', 'Request permissions failed:', action.payload as Error);
      });

    // Register push token
    builder
      .addCase(registerPushToken.fulfilled, (state, action) => {
        state.lastTokenSync = action.payload.lastTokenSync;
      })
      .addCase(registerPushToken.rejected, (state, action) => {
        EventLogger.error('notificationSlice', 'Register push token failed:', action.payload as Error);
      });

    // Update preferences
    builder
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        state.preferences = action.payload;
      })
      .addCase(updateNotificationPreferences.rejected, (state, action) => {
        EventLogger.error('notificationSlice', 'Update preferences failed:', action.payload as Error);
      });

    // Refresh notifications
    builder
      .addCase(refreshNotifications.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount;
        state.recentNotifications = action.payload.recentNotifications;
      })
      .addCase(refreshNotifications.rejected, (state, action) => {
        EventLogger.error('notificationSlice', 'Refresh notifications failed:', action.payload as Error);
      });

    // Mark all as read
    builder
      .addCase(markAllNotificationsAsRead.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount;
        state.recentNotifications = action.payload.recentNotifications;
      })
      .addCase(markAllNotificationsAsRead.rejected, (state, action) => {
        EventLogger.error('notificationSlice', 'Mark all as read failed:', action.payload as Error);
      });

    // Clear all notifications
    builder
      .addCase(clearAllNotifications.fulfilled, (state, action) => {
        state.unreadCount = action.payload.unreadCount;
        state.recentNotifications = action.payload.recentNotifications;
      })
      .addCase(clearAllNotifications.rejected, (state, action) => {
        EventLogger.error('notificationSlice', 'Clear all notifications failed:', action.payload as Error);
      });

    // Send test notification
    builder
      .addCase(sendTestNotification.rejected, (state, action) => {
        EventLogger.error('notificationSlice', 'Send test notification failed:', action.payload as Error);
      });
  },
});

// Export actions
export const {
  setPushToken,
  setPermissionStatus,
  updateUnreadCount,
  addNotification,
  markNotificationAsRead,
  removeNotification,
  updatePreferences,
  resetNotificationState,
} = notificationSlice.actions;

// Selectors
export const selectNotificationState = (state: { notifications: NotificationState }) => state.notifications;
export const selectPushToken = (state: { notifications: NotificationState }) => state.notifications.pushToken;
export const selectPermissionStatus = (state: { notifications: NotificationState }) => state.notifications.permissionStatus;
export const selectNotificationPreferences = (state: { notifications: NotificationState }) => state.notifications.preferences;
export const selectUnreadCount = (state: { notifications: NotificationState }) => state.notifications.unreadCount;
export const selectRecentNotifications = (state: { notifications: NotificationState }) => state.notifications.recentNotifications;
export const selectIsNotificationInitialized = (state: { notifications: NotificationState }) => state.notifications.isInitialized;

// Export reducer
export default notificationSlice.reducer;