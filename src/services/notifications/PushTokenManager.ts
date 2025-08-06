/**
 * PushTokenManager.ts
 * Manages push tokens synchronization with Supabase backend
 * Features: token storage, multi-device support, sync with backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';
import { PushToken } from '../../types/notifications';
import NotificationService from './NotificationService';
import { EventLogger } from '../../utils/EventLogger';

class PushTokenManager {
  private static instance: PushTokenManager;
  private syncInProgress = false;
  
  // Storage keys
  private static readonly STORAGE_KEYS = {
    DEVICE_ID: '@zaptap_device_id',
    TOKEN_SYNC_STATUS: '@zaptap_token_sync_status',
    LAST_SYNC_TIMESTAMP: '@zaptap_last_token_sync',
    SYNC_RETRIES: '@zaptap_sync_retries',
  };
  
  // Maximum retry attempts for token sync
  private static readonly MAX_SYNC_RETRIES = 3;
  private static readonly SYNC_RETRY_DELAY = 5000; // 5 seconds

  private constructor() {}

  public static getInstance(): PushTokenManager {
    if (!PushTokenManager.instance) {
      PushTokenManager.instance = new PushTokenManager();
    }
    return PushTokenManager.instance;
  }

  /**
   * Generate or retrieve device ID
   */
  public async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(PushTokenManager.STORAGE_KEYS.DEVICE_ID);
      
      if (!deviceId) {
        // Generate unique device ID
        deviceId = `${Platform.OS}-${Device.modelName || 'unknown'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(PushTokenManager.STORAGE_KEYS.DEVICE_ID, deviceId);
        EventLogger.debug('PushToken', '[PushTokenManager] Generated new device ID:', deviceId);
      }
      
      return deviceId;
    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to get device ID:', error as Error);
      // Fallback device ID
      return `${Platform.OS}-fallback-${Date.now()}`;
    }
  }

  /**
   * Register push token with backend
   */
  public async registerToken(userId?: string): Promise<boolean> {
    try {
      if (this.syncInProgress) {
        EventLogger.debug('PushToken', '[PushTokenManager] Token sync already in progress');
        return false;
      }

      this.syncInProgress = true;

      // Get push token from notification service
      const token = await NotificationService.getPushToken();
      if (!token) {
        EventLogger.warn('PushToken', '[PushTokenManager] No push token available');
        this.syncInProgress = false;
        return false;
      }

      // Get device information
      const deviceId = await this.getDeviceId();
      const platform = Platform.OS as 'ios' | 'android';

      // Create push token object
      const pushTokenData: Omit<PushToken, 'createdAt' | 'updatedAt'> = {
        token,
        deviceId,
        platform,
        userId,
      };

      // Sync with Supabase
      const success = await this.syncTokenWithSupabase(pushTokenData);
      
      if (success) {
        await this.markSyncSuccess();
        EventLogger.debug('PushToken', '[PushTokenManager] Token registered successfully');
      } else {
        await this.handleSyncFailure();
      }

      this.syncInProgress = false;
      return success;

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to register token:', error as Error);
      this.syncInProgress = false;
      await this.handleSyncFailure();
      return false;
    }
  }

  /**
   * Sync token with Supabase database
   */
  private async syncTokenWithSupabase(tokenData: Omit<PushToken, 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      // Check if token already exists for this device
      const { data: existing, error: fetchError } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('device_id', tokenData.deviceId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
        EventLogger.error('PushToken', '[PushTokenManager] Error checking existing token:', fetchError as Error);
        return false;
      }

      let result;

      if (existing) {
        // Update existing token
        result = await supabase
          .from('push_tokens')
          .update({
            token: tokenData.token,
            user_id: tokenData.userId,
            platform: tokenData.platform,
            updated_at: new Date().toISOString(),
          })
          .eq('device_id', tokenData.deviceId);
      } else {
        // Insert new token
        result = await supabase
          .from('push_tokens')
          .insert({
            token: tokenData.token,
            device_id: tokenData.deviceId,
            platform: tokenData.platform,
            user_id: tokenData.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }

      if (result.error) {
        EventLogger.error('PushToken', '[PushTokenManager] Supabase sync error:', result.error as Error);
        return false;
      }

      EventLogger.debug('PushToken', '[PushTokenManager] Token synced with Supabase successfully');
      return true;

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Supabase sync failed:', error as Error);
      return false;
    }
  }

  /**
   * Unregister push token from backend
   */
  public async unregisterToken(): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();

      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('device_id', deviceId);

      if (error) {
        EventLogger.error('PushToken', '[PushTokenManager] Failed to unregister token:', error as Error);
        return false;
      }

      // Clear local storage
      await AsyncStorage.multiRemove([
        PushTokenManager.STORAGE_KEYS.TOKEN_SYNC_STATUS,
        PushTokenManager.STORAGE_KEYS.LAST_SYNC_TIMESTAMP,
        PushTokenManager.STORAGE_KEYS.SYNC_RETRIES,
      ]);

      EventLogger.debug('PushToken', '[PushTokenManager] Token unregistered successfully');
      return true;

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to unregister token:', error as Error);
      return false;
    }
  }

  /**
   * Update user ID for existing token
   */
  public async updateUserId(userId: string): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();

      const { error } = await supabase
        .from('push_tokens')
        .update({
          user_id: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('device_id', deviceId);

      if (error) {
        EventLogger.error('PushToken', '[PushTokenManager] Failed to update user ID:', error as Error);
        return false;
      }

      EventLogger.debug('PushToken', '[PushTokenManager] User ID updated successfully');
      return true;

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to update user ID:', error as Error);
      return false;
    }
  }

  /**
   * Get all tokens for a user (for multi-device support)
   */
  public async getUserTokens(userId: string): Promise<PushToken[]> {
    try {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        EventLogger.error('PushToken', '[PushTokenManager] Failed to get user tokens:', error as Error);
        return [];
      }

      return data.map(row => ({
        token: row.token,
        deviceId: row.device_id,
        platform: row.platform,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to get user tokens:', error as Error);
      return [];
    }
  }

  /**
   * Check if token needs refresh
   */
  public async shouldRefreshToken(): Promise<boolean> {
    try {
      const lastSync = await AsyncStorage.getItem(PushTokenManager.STORAGE_KEYS.LAST_SYNC_TIMESTAMP);
      
      if (!lastSync) {
        return true; // Never synced
      }

      const lastSyncTime = new Date(lastSync);
      const now = new Date();
      const daysSinceSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60 * 24);

      // Refresh token if it's been more than 7 days
      return daysSinceSync > 7;

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to check token refresh status:', error as Error);
      return true; // Default to refresh
    }
  }

  /**
   * Refresh token if needed
   */
  public async refreshTokenIfNeeded(userId?: string): Promise<boolean> {
    try {
      const shouldRefresh = await this.shouldRefreshToken();
      
      if (!shouldRefresh) {
        EventLogger.debug('PushToken', '[PushTokenManager] Token refresh not needed');
        return true;
      }

      EventLogger.debug('PushToken', '[PushTokenManager] Refreshing token...');
      return await this.registerToken(userId);

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to refresh token:', error as Error);
      return false;
    }
  }

  /**
   * Get sync status information
   */
  public async getSyncStatus(): Promise<{
    isTokenSynced: boolean;
    lastSyncTime: string | null;
    retryCount: number;
  }> {
    try {
      const [syncStatus, lastSync, retries] = await Promise.all([
        AsyncStorage.getItem(PushTokenManager.STORAGE_KEYS.TOKEN_SYNC_STATUS),
        AsyncStorage.getItem(PushTokenManager.STORAGE_KEYS.LAST_SYNC_TIMESTAMP),
        AsyncStorage.getItem(PushTokenManager.STORAGE_KEYS.SYNC_RETRIES),
      ]);

      return {
        isTokenSynced: syncStatus === 'success',
        lastSyncTime: lastSync,
        retryCount: retries ? parseInt(retries, 10) : 0,
      };

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to get sync status:', error as Error);
      return {
        isTokenSynced: false,
        lastSyncTime: null,
        retryCount: 0,
      };
    }
  }

  /**
   * Mark sync as successful
   */
  private async markSyncSuccess(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      
      await AsyncStorage.multiSet([
        [PushTokenManager.STORAGE_KEYS.TOKEN_SYNC_STATUS, 'success'],
        [PushTokenManager.STORAGE_KEYS.LAST_SYNC_TIMESTAMP, timestamp],
        [PushTokenManager.STORAGE_KEYS.SYNC_RETRIES, '0'],
      ]);

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to mark sync success:', error as Error);
    }
  }

  /**
   * Handle sync failure with retry logic
   */
  private async handleSyncFailure(): Promise<void> {
    try {
      const currentRetries = await AsyncStorage.getItem(PushTokenManager.STORAGE_KEYS.SYNC_RETRIES);
      const retryCount = currentRetries ? parseInt(currentRetries, 10) : 0;
      const newRetryCount = retryCount + 1;

      await AsyncStorage.multiSet([
        [PushTokenManager.STORAGE_KEYS.TOKEN_SYNC_STATUS, 'failed'],
        [PushTokenManager.STORAGE_KEYS.SYNC_RETRIES, newRetryCount.toString()],
      ]);

      // Schedule retry if within limits
      if (newRetryCount <= PushTokenManager.MAX_SYNC_RETRIES) {
        EventLogger.debug('PushToken', '[PushTokenManager] Scheduling retry ${newRetryCount}/${PushTokenManager.MAX_SYNC_RETRIES}');
        
        setTimeout(() => {
          this.retryTokenSync();
        }, PushTokenManager.SYNC_RETRY_DELAY * newRetryCount); // Exponential backoff
      } else {
        EventLogger.error('PushToken', '[PushTokenManager] Max retry attempts reached, giving up');
      }

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to handle sync failure:', error as Error);
    }
  }

  /**
   * Retry token sync
   */
  private async retryTokenSync(): Promise<void> {
    try {
      EventLogger.debug('PushToken', '[PushTokenManager] Retrying token sync...');
      
      // Get current user from auth state (this would need to be passed in)
      // For now, we'll just retry without user ID
      await this.registerToken();

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Retry failed:', error as Error);
    }
  }

  /**
   * Clean up old tokens for a user (keep only latest 5 devices)
   */
  public async cleanupOldTokens(userId: string): Promise<void> {
    try {
      const { data: tokens, error } = await supabase
        .from('push_tokens')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error || !tokens) {
        EventLogger.error('PushToken', '[PushTokenManager] Failed to get tokens for cleanup:', error as Error);
        return;
      }

      // Keep only the 5 most recent tokens
      const tokensToDelete = tokens.slice(5);
      
      if (tokensToDelete.length > 0) {
        const deviceIdsToDelete = tokensToDelete.map(token => token.device_id);
        
        const { error: deleteError } = await supabase
          .from('push_tokens')
          .delete()
          .in('device_id', deviceIdsToDelete);

        if (deleteError) {
          EventLogger.error('PushToken', '[PushTokenManager] Failed to cleanup old tokens:', deleteError as Error);
        } else {
          EventLogger.debug('PushToken', '[PushTokenManager] Cleaned up ${tokensToDelete.length} old tokens');
        }
      }

    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to cleanup old tokens:', error as Error);
    }
  }

  /**
   * Clear all local token data
   */
  public async clearLocalData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        PushTokenManager.STORAGE_KEYS.DEVICE_ID,
        PushTokenManager.STORAGE_KEYS.TOKEN_SYNC_STATUS,
        PushTokenManager.STORAGE_KEYS.LAST_SYNC_TIMESTAMP,
        PushTokenManager.STORAGE_KEYS.SYNC_RETRIES,
      ]);

      EventLogger.debug('PushToken', '[PushTokenManager] Local data cleared');
    } catch (error) {
      EventLogger.error('PushToken', '[PushTokenManager] Failed to clear local data:', error as Error);
    }
  }
}

export default PushTokenManager.getInstance();