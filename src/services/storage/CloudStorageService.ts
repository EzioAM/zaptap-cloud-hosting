/**
 * Cloud Storage Service
 * Handles background sync, caching, and efficient cloud storage operations
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../supabase/client';
import { Platform } from 'react-native';

// Conditionally import background task modules (not available on web)
let BackgroundFetch: any = null;
let TaskManager: any = null;

if (Platform.OS !== 'web') {
  try {
    BackgroundFetch = require('expo-background-fetch');
    TaskManager = require('expo-task-manager');
  } catch (error) {
    console.log('[CloudStorage] Background tasks not available on this platform');
  }
}

const BACKGROUND_SYNC_TASK = 'cloud-storage-sync';
const SYNC_QUEUE_KEY = '@cloud_storage_sync_queue';
const CACHE_DIR = `${FileSystem.documentDirectory}cloud-cache/`;
const MAX_RETRY_ATTEMPTS = 3;

interface SyncQueueItem {
  id: string;
  action: 'upload' | 'download' | 'delete';
  bucket: string;
  fileName: string;
  localPath?: string;
  remotePath?: string;
  content?: string;
  retryCount: number;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
}

class CloudStorageService {
  private static instance: CloudStorageService;
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing = false;
  private isOnline = true;

  private constructor() {
    this.initializeService();
  }

  static getInstance(): CloudStorageService {
    if (!CloudStorageService.instance) {
      CloudStorageService.instance = new CloudStorageService();
    }
    return CloudStorageService.instance;
  }

  private async initializeService() {
    // Create cache directory if it doesn't exist
    await this.ensureCacheDirectory();
    
    // Load sync queue from storage
    await this.loadSyncQueue();
    
    // Monitor network connectivity
    this.setupNetworkMonitoring();
    
    // Register background task
    await this.registerBackgroundTask();
    
    // Start initial sync if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async ensureCacheDirectory() {
    const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    }
  }

  private async loadSyncQueue() {
    try {
      const queueData = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('[CloudStorage] Failed to load sync queue:', error);
    }
  }

  private async saveSyncQueue() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('[CloudStorage] Failed to save sync queue:', error);
    }
  }

  private setupNetworkMonitoring() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected && state.isInternetReachable;
      
      // Start syncing when coming back online
      if (wasOffline && this.isOnline) {
        console.log('[CloudStorage] Network restored, starting sync...');
        this.processSyncQueue();
      }
    });
  }

  private async registerBackgroundTask() {
    if (Platform.OS === 'web' || !BackgroundFetch || !TaskManager) {
      // Background tasks not supported on web or modules not available
      console.log('[CloudStorage] Background tasks not available, using periodic sync instead');
      // Set up periodic sync as fallback
      setInterval(() => {
        if (this.isOnline) {
          this.processSyncQueue();
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
      return;
    }

    try {
      // Define the background task
      TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
        try {
          await this.processSyncQueue();
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('[CloudStorage] Background sync failed:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register the background fetch task
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('[CloudStorage] Background sync task registered');
    } catch (error) {
      console.error('[CloudStorage] Failed to register background task:', error);
      // Fall back to periodic sync
      setInterval(() => {
        if (this.isOnline) {
          this.processSyncQueue();
        }
      }, 5 * 60 * 1000); // Check every 5 minutes
    }
  }

  /**
   * Upload a file to cloud storage (with offline support)
   */
  async uploadFile(
    fileName: string,
    content: string | Blob,
    bucket = 'user-files',
    options: { immediate?: boolean; isPublic?: boolean } = {}
  ): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const remotePath = `${user.id}/${fileName}`;
    
    // Save to local cache first
    const localPath = `${CACHE_DIR}${fileName}`;
    if (typeof content === 'string') {
      await FileSystem.writeAsStringAsync(localPath, content);
    }

    // If offline or not immediate, queue for sync
    if (!this.isOnline || !options.immediate) {
      const queueItem: SyncQueueItem = {
        id: `upload-${Date.now()}-${Math.random()}`,
        action: 'upload',
        bucket,
        fileName,
        localPath,
        remotePath,
        content: typeof content === 'string' ? content : undefined,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      this.syncQueue.push(queueItem);
      await this.saveSyncQueue();

      // Process immediately if online and requested
      if (this.isOnline && options.immediate) {
        this.processSyncQueue();
      }

      return { success: true };
    }

    // Try immediate upload
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(remotePath, content, {
          upsert: true,
          contentType: this.getContentType(fileName)
        });

      if (error) throw error;

      let publicUrl: string | undefined;
      if (options.isPublic) {
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(remotePath);
        publicUrl = urlData.publicUrl;
      }

      return { success: true, publicUrl };
    } catch (error) {
      // Queue for retry
      const queueItem: SyncQueueItem = {
        id: `upload-${Date.now()}-${Math.random()}`,
        action: 'upload',
        bucket,
        fileName,
        localPath,
        remotePath,
        content: typeof content === 'string' ? content : undefined,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        status: 'pending',
        error: error.message
      };

      this.syncQueue.push(queueItem);
      await this.saveSyncQueue();

      return { success: false, error: error.message };
    }
  }

  /**
   * Download a file from cloud storage (with caching)
   */
  async downloadFile(
    fileName: string,
    bucket = 'user-files',
    options: { forceRefresh?: boolean } = {}
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const remotePath = `${user.id}/${fileName}`;
    const localPath = `${CACHE_DIR}${fileName}`;

    // Check cache first unless force refresh
    if (!options.forceRefresh) {
      const cacheInfo = await FileSystem.getInfoAsync(localPath);
      if (cacheInfo.exists) {
        const content = await FileSystem.readAsStringAsync(localPath);
        return { success: true, content };
      }
    }

    // If offline, return cache or error
    if (!this.isOnline) {
      const cacheInfo = await FileSystem.getInfoAsync(localPath);
      if (cacheInfo.exists) {
        const content = await FileSystem.readAsStringAsync(localPath);
        return { success: true, content };
      }
      return { success: false, error: 'Offline and no cached version available' };
    }

    // Download from cloud
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(remotePath);

      if (error) throw error;

      const content = await data.text();

      // Save to cache
      await FileSystem.writeAsStringAsync(localPath, content);

      return { success: true, content };
    } catch (error) {
      // Try cache as fallback
      const cacheInfo = await FileSystem.getInfoAsync(localPath);
      if (cacheInfo.exists) {
        const content = await FileSystem.readAsStringAsync(localPath);
        return { success: true, content };
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * List files in cloud storage
   */
  async listFiles(
    folder = '',
    bucket = 'user-files',
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ success: boolean; files?: any[]; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    if (!this.isOnline) {
      // Return cached file list if available
      const cacheKey = `@file_list_${bucket}_${folder}`;
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          return { success: true, files: JSON.parse(cached) };
        }
      } catch (error) {
        // Continue to error
      }
      return { success: false, error: 'Offline and no cached list available' };
    }

    try {
      const searchPath = folder ? `${user.id}/${folder}` : user.id;
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(searchPath, {
          limit: options.limit || 100,
          offset: options.offset || 0
        });

      if (error) throw error;

      // Cache the file list
      const cacheKey = `@file_list_${bucket}_${folder}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));

      return { success: true, files: data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a file from cloud storage
   */
  async deleteFile(
    fileName: string,
    bucket = 'user-files'
  ): Promise<{ success: boolean; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const remotePath = `${user.id}/${fileName}`;
    const localPath = `${CACHE_DIR}${fileName}`;

    // Delete from cache
    try {
      await FileSystem.deleteAsync(localPath, { idempotent: true });
    } catch (error) {
      // Ignore cache deletion errors
    }

    if (!this.isOnline) {
      // Queue for deletion when online
      const queueItem: SyncQueueItem = {
        id: `delete-${Date.now()}-${Math.random()}`,
        action: 'delete',
        bucket,
        fileName,
        remotePath,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      this.syncQueue.push(queueItem);
      await this.saveSyncQueue();

      return { success: true };
    }

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([remotePath]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      // Queue for retry
      const queueItem: SyncQueueItem = {
        id: `delete-${Date.now()}-${Math.random()}`,
        action: 'delete',
        bucket,
        fileName,
        remotePath,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        status: 'pending',
        error: error.message
      };

      this.syncQueue.push(queueItem);
      await this.saveSyncQueue();

      return { success: false, error: error.message };
    }
  }

  /**
   * Process the sync queue
   */
  private async processSyncQueue() {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;
    console.log(`[CloudStorage] Processing ${this.syncQueue.length} queued items...`);

    const pendingItems = this.syncQueue.filter(item => 
      item.status === 'pending' || 
      (item.status === 'failed' && item.retryCount < MAX_RETRY_ATTEMPTS)
    );

    for (const item of pendingItems) {
      try {
        item.status = 'syncing';
        await this.processSyncItem(item);
        item.status = 'completed';
        
        // Remove completed items from queue
        this.syncQueue = this.syncQueue.filter(qi => qi.id !== item.id);
      } catch (error) {
        item.status = 'failed';
        item.retryCount++;
        item.error = error.message;
        
        if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
          console.error(`[CloudStorage] Max retries reached for item ${item.id}`);
          // Keep in queue but mark as permanently failed
        }
      }
    }

    await this.saveSyncQueue();
    this.isSyncing = false;

    console.log(`[CloudStorage] Sync complete. Remaining items: ${this.syncQueue.length}`);
  }

  private async processSyncItem(item: SyncQueueItem) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    switch (item.action) {
      case 'upload':
        if (item.localPath) {
          const content = await FileSystem.readAsStringAsync(item.localPath);
          const { error } = await supabase.storage
            .from(item.bucket)
            .upload(item.remotePath || `${user.id}/${item.fileName}`, content, {
              upsert: true,
              contentType: this.getContentType(item.fileName)
            });
          
          if (error) throw error;
        }
        break;

      case 'delete':
        const { error } = await supabase.storage
          .from(item.bucket)
          .remove([item.remotePath || `${user.id}/${item.fileName}`]);
        
        if (error) throw error;
        break;

      case 'download':
        // Downloads are handled on-demand, not queued
        break;
    }
  }

  private getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'json': 'application/json',
      'csv': 'text/csv',
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }

  /**
   * Get sync queue status
   */
  getSyncStatus(): { 
    isOnline: boolean; 
    isSyncing: boolean; 
    queueLength: number;
    pendingItems: number;
    failedItems: number;
  } {
    const pendingItems = this.syncQueue.filter(i => i.status === 'pending').length;
    const failedItems = this.syncQueue.filter(i => i.status === 'failed').length;

    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      pendingItems,
      failedItems
    };
  }

  /**
   * Clear cache and sync queue
   */
  async clearCache() {
    try {
      // Clear cache directory
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await this.ensureCacheDirectory();

      // Clear sync queue
      this.syncQueue = [];
      await this.saveSyncQueue();

      // Clear cached lists
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('@file_list_'));
      await AsyncStorage.multiRemove(cacheKeys);

      console.log('[CloudStorage] Cache cleared');
    } catch (error) {
      console.error('[CloudStorage] Failed to clear cache:', error);
    }
  }

  /**
   * Force sync immediately
   */
  async forceSync() {
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }
}

export const cloudStorageService = CloudStorageService.getInstance();