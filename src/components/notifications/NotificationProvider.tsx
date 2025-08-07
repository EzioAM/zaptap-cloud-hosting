/**
 * NotificationProvider.tsx
 * Provider component for initializing and managing notifications throughout the app
 * Handles initialization, navigation setup, and auth state synchronization
 */

import React, { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store';
import { 
  initializeNotifications, 
  registerPushToken,
} from '../../store/slices/notificationSlice';
import { RootState } from '../../store';
import NotificationHandler from '../../services/notifications/NotificationHandler';
import PushTokenManager from '../../services/notifications/PushTokenManager';
import { EventLogger } from '../../utils/EventLogger';

// Custom hook to safely use navigation (returns null if not available yet)
const useNavigationSafe = () => {
  try {
    return useNavigation();
  } catch (error) {
    // Navigation context not available yet
    return null;
  }
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigationSafe();
  
  const user = useAppSelector((state: RootState) => state.auth?.user);
  // Fix selectors to handle potentially undefined state
  const isInitialized = useAppSelector((state: RootState) => state.notifications?.isInitialized ?? false);
  const pushToken = useAppSelector((state: RootState) => state.notifications?.pushToken ?? null);
  
  const initializationAttempted = useRef(false);
  const tokenRegistrationAttempted = useRef(false);

  // Initialize notifications on app start
  useEffect(() => {
    const initializeNotificationSystem = async () => {
      if (initializationAttempted.current) {
        return;
      }
      
      initializationAttempted.current = true;
      
      try {
        EventLogger.debug('Notification', '[NotificationProvider] Initializing notification system...');
        
        // Initialize notifications
        await dispatch(initializeNotifications()).unwrap();
        
        EventLogger.debug('Notification', '[NotificationProvider] Notification system initialized successfully');
        
      } catch (error) {
        EventLogger.error('Notification', '[NotificationProvider] Failed to initialize notifications:', error as Error);
        // Don't throw - let the app continue without notifications
      }
    };

    initializeNotificationSystem();
  }, [dispatch]);

  // Set up navigation reference for deep linking
  useEffect(() => {
    if (isInitialized && navigation) {
      // Delay setting navigation ref to ensure it's ready
      const timer = setTimeout(() => {
        try {
          // Check if navigation is actually ready (isReady might not exist on navigation directly)
          // So we'll just set it after a delay to ensure it's initialized
          NotificationHandler.setNavigationRef({ current: navigation });
          EventLogger.debug('Notification', '[NotificationProvider] Navigation reference set for notifications');
        } catch (error) {
          EventLogger.error('Notification', '[NotificationProvider] Failed to set navigation reference:', error as Error);
          // Retry after another delay if it fails
          setTimeout(() => {
            try {
              NotificationHandler.setNavigationRef({ current: navigation });
              EventLogger.debug('Notification', '[NotificationProvider] Navigation reference set on retry');
            } catch (retryError) {
              EventLogger.error('Notification', '[NotificationProvider] Failed to set navigation on retry:', retryError as Error);
            }
          }, 1000);
        }
      }, 500); // Give navigation time to fully initialize
      
      return () => clearTimeout(timer);
    } else if (isInitialized && !navigation) {
      // Navigation not available yet, but notifications are initialized
      EventLogger.debug('Notification', '[NotificationProvider] Waiting for navigation context to become available...');
    }
  }, [isInitialized, navigation]);

  // Register push token when user signs in
  useEffect(() => {
    const registerTokenForUser = async () => {
      if (!isInitialized || !pushToken || !user?.id || tokenRegistrationAttempted.current) {
        return;
      }

      tokenRegistrationAttempted.current = true;

      try {
        EventLogger.debug('Notification', '[NotificationProvider] Registering push token for user:', user.id);
        
        await dispatch(registerPushToken(user.id)).unwrap();
        
        // Clean up old tokens for this user
        await PushTokenManager.cleanupOldTokens(user.id);
        
        EventLogger.debug('Notification', '[NotificationProvider] Push token registered successfully');
        
      } catch (error) {
        EventLogger.error('Notification', '[NotificationProvider] Failed to register push token:', error as Error);
        // Reset flag to allow retry
        tokenRegistrationAttempted.current = false;
      }
    };

    registerTokenForUser();
  }, [dispatch, isInitialized, pushToken, user?.id]);

  // Update user ID for existing token when user changes
  useEffect(() => {
    const updateTokenUserId = async () => {
      if (!isInitialized || !pushToken || !user?.id) {
        return;
      }

      try {
        // Update user ID for existing token
        await PushTokenManager.updateUserId(user.id);
        EventLogger.debug('Notification', '[NotificationProvider] Updated user ID for push token');
        
      } catch (error) {
        EventLogger.error('Notification', '[NotificationProvider] Failed to update token user ID:', error as Error);
      }
    };

    // Small delay to avoid race conditions with registration
    const timeoutId = setTimeout(updateTokenUserId, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [isInitialized, pushToken, user?.id]);

  // Refresh token periodically
  useEffect(() => {
    const refreshTokenIfNeeded = async () => {
      if (!isInitialized || !user?.id) {
        return;
      }

      try {
        const shouldRefresh = await PushTokenManager.shouldRefreshToken();
        
        if (shouldRefresh) {
          EventLogger.debug('Notification', '[NotificationProvider] Refreshing push token...');
          await PushTokenManager.refreshTokenIfNeeded(user.id);
        }
        
      } catch (error) {
        EventLogger.error('Notification', '[NotificationProvider] Failed to refresh token:', error as Error);
      }
    };

    // Check token refresh on mount and then every 24 hours
    refreshTokenIfNeeded();
    
    const intervalId = setInterval(refreshTokenIfNeeded, 24 * 60 * 60 * 1000); // 24 hours
    
    return () => clearInterval(intervalId);
  }, [isInitialized, user?.id]);

  // Clean up when user signs out
  useEffect(() => {
    const handleUserSignOut = async () => {
      if (!user && pushToken) {
        try {
          EventLogger.debug('Notification', '[NotificationProvider] User signed out, unregistering push token...');
          
          await PushTokenManager.unregisterToken();
          
          // Reset registration flag
          tokenRegistrationAttempted.current = false;
          
          EventLogger.debug('Notification', '[NotificationProvider] Push token unregistered successfully');
          
        } catch (error) {
          EventLogger.error('Notification', '[NotificationProvider] Failed to unregister push token:', error as Error);
        }
      }
    };

    handleUserSignOut();
  }, [user, pushToken]);

  // Handle app state changes for background notifications
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && isInitialized) {
        // App became active, refresh notification state
        EventLogger.debug('Notification', '[NotificationProvider] App became active, refreshing notifications...');
        
        // This could trigger a refresh of the notification state
        // For now, we'll just log it
      }
    };

    // Note: AppState.addEventListener would be used here in a real implementation
    // For now, we'll just set up the handler
    
    return () => {
      // Cleanup app state listener
    };
  }, [isInitialized]);

  // Debug logging for development
  useEffect(() => {
    if (__DEV__ && isInitialized) {
      EventLogger.debug('Notification', '[NotificationProvider] Debug Info:', {
        isInitialized,
        hasPushToken: !!pushToken,
        hasUser: !!user,
        userId: user?.id,
        tokenLength: pushToken?.length,
      });
    }
  }, [isInitialized, pushToken, user]);

  return <>{children}</>;
};

export default NotificationProvider;