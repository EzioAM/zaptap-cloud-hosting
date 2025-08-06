import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { NetInfoStateType } from '@react-native-community/netinfo';
import { syncManager, NetworkInfo, SyncProgress, SyncEvent } from '../services/offline/SyncManager';
import { offlineQueue } from '../services/offline/OfflineQueue';
import { logger } from '../services/analytics/AnalyticsService';

/**
 * Network quality levels based on connection type and speed
 */
export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

/**
 * Network context state
 */
export interface NetworkContextState {
  // Network status
  isOnline: boolean;
  connectionType: NetInfoStateType;
  isInternetReachable: boolean | null;
  networkQuality: NetworkQuality;
  
  // Sync status
  isSyncing: boolean;
  syncProgress: SyncProgress;
  lastSyncTime: number | null;
  
  // Queue status
  pendingOperations: number;
  failedOperations: number;
  
  // Actions
  forceSync: () => Promise<void>;
  retryFailedOperations: () => Promise<void>;
  clearCompletedOperations: () => Promise<void>;
}

/**
 * Default context state
 */
const defaultState: NetworkContextState = {
  isOnline: false,
  connectionType: 'unknown',
  isInternetReachable: null,
  networkQuality: 'offline',
  isSyncing: false,
  syncProgress: {
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false,
  },
  lastSyncTime: null,
  pendingOperations: 0,
  failedOperations: 0,
  forceSync: async () => {},
  retryFailedOperations: async () => {},
  clearCompletedOperations: async () => {},
};

/**
 * Network context
 */
const NetworkContext = createContext<NetworkContextState>(defaultState);

/**
 * Props for NetworkProvider
 */
interface NetworkProviderProps {
  children: ReactNode;
}

/**
 * Network context provider component
 */
export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>(defaultState.syncProgress);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [queueStats, setQueueStats] = useState({ pending: 0, failed: 0 });

  /**
   * Determine network quality based on connection type and details
   */
  const getNetworkQuality = useCallback((networkInfo: NetworkInfo | null): NetworkQuality => {
    if (!networkInfo || !networkInfo.isConnected) {
      return 'offline';
    }

    if (networkInfo.isInternetReachable === false) {
      return 'offline';
    }

    switch (networkInfo.type) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        // Try to determine cellular quality from details if available
        if (networkInfo.details?.cellularGeneration) {
          const generation = networkInfo.details.cellularGeneration;
          if (generation === '5g') return 'excellent';
          if (generation === '4g') return 'good';
          if (generation === '3g') return 'fair';
          return 'poor';
        }
        return 'good'; // Default for cellular
      case 'ethernet':
        return 'excellent';
      case 'bluetooth':
        return 'fair';
      case 'vpn':
        return 'good';
      case 'other':
        return 'fair';
      default:
        return networkInfo.isInternetReachable ? 'fair' : 'offline';
    }
  }, []);

  /**
   * Update queue statistics
   */
  const updateQueueStats = useCallback(async () => {
    try {
      const stats = offlineQueue.getQueueStats();
      setQueueStats({
        pending: stats.pending,
        failed: stats.failed + stats.deadLetter,
      });
    } catch (error) {
      logger.error('NetworkContext: Failed to update queue stats', { error });
    }
  }, []);

  /**
   * Handle sync events
   */
  const handleSyncEvent = useCallback((event: SyncEvent) => {
    switch (event.type) {
      case 'network_changed':
        setNetworkInfo(event.data as NetworkInfo);
        break;
        
      case 'sync_started':
        setIsSyncing(true);
        break;
        
      case 'sync_progress':
        setSyncProgress(event.data as SyncProgress);
        break;
        
      case 'sync_completed':
        setIsSyncing(false);
        setLastSyncTime(event.timestamp);
        setSyncProgress(defaultState.syncProgress);
        updateQueueStats();
        break;
        
      case 'sync_failed':
        setIsSyncing(false);
        setSyncProgress(defaultState.syncProgress);
        updateQueueStats();
        break;
        
      case 'operation_completed':
      case 'operation_failed':
        updateQueueStats();
        break;
    }
  }, [updateQueueStats]);

  /**
   * Initialize network monitoring
   */
  useEffect(() => {
    // Add event listeners
    syncManager.addEventListener('network_changed', handleSyncEvent);
    syncManager.addEventListener('sync_started', handleSyncEvent);
    syncManager.addEventListener('sync_progress', handleSyncEvent);
    syncManager.addEventListener('sync_completed', handleSyncEvent);
    syncManager.addEventListener('sync_failed', handleSyncEvent);
    syncManager.addEventListener('operation_completed', handleSyncEvent);
    syncManager.addEventListener('operation_failed', handleSyncEvent);

    // Get initial state
    const initialNetworkInfo = syncManager.getNetworkInfo();
    if (initialNetworkInfo) {
      setNetworkInfo(initialNetworkInfo);
    }

    setIsSyncing(syncManager.isSyncing());
    setSyncProgress(syncManager.getSyncProgress());
    updateQueueStats();

    // Cleanup on unmount
    return () => {
      syncManager.removeEventListener('network_changed', handleSyncEvent);
      syncManager.removeEventListener('sync_started', handleSyncEvent);
      syncManager.removeEventListener('sync_progress', handleSyncEvent);
      syncManager.removeEventListener('sync_completed', handleSyncEvent);
      syncManager.removeEventListener('sync_failed', handleSyncEvent);
      syncManager.removeEventListener('operation_completed', handleSyncEvent);
      syncManager.removeEventListener('operation_failed', handleSyncEvent);
    };
  }, [handleSyncEvent, updateQueueStats]);

  /**
   * Force synchronization
   */
  const forceSync = useCallback(async () => {
    try {
      logger.info('NetworkContext: Force sync requested by user');
      await syncManager.forceSync();
    } catch (error) {
      logger.error('NetworkContext: Force sync failed', { error });
      throw error;
    }
  }, []);

  /**
   * Retry failed operations
   */
  const retryFailedOperations = useCallback(async () => {
    try {
      logger.info('NetworkContext: Retrying failed operations');
      
      // Get dead letter queue items and requeue them
      const deadLetterOperations = await offlineQueue.getDeadLetterQueue();
      
      let requeuedCount = 0;
      for (const operation of deadLetterOperations) {
        const success = await offlineQueue.requeueFromDeadLetter(operation.id);
        if (success) {
          requeuedCount++;
        }
      }

      logger.info('NetworkContext: Requeued operations', { 
        total: deadLetterOperations.length, 
        requeued: requeuedCount 
      });

      // Update stats and trigger sync if we have requeued operations
      await updateQueueStats();
      if (requeuedCount > 0) {
        await forceSync();
      }

      return requeuedCount;
    } catch (error) {
      logger.error('NetworkContext: Failed to retry operations', { error });
      throw error;
    }
  }, [forceSync, updateQueueStats]);

  /**
   * Clear completed operations
   */
  const clearCompletedOperations = useCallback(async () => {
    try {
      logger.info('NetworkContext: Clearing completed operations');
      const clearedCount = await offlineQueue.clearCompleted();
      await updateQueueStats();
      
      logger.info('NetworkContext: Cleared completed operations', { count: clearedCount });
      return clearedCount;
    } catch (error) {
      logger.error('NetworkContext: Failed to clear completed operations', { error });
      throw error;
    }
  }, [updateQueueStats]);

  /**
   * Context value
   */
  const contextValue: NetworkContextState = {
    isOnline: networkInfo?.isConnected && networkInfo?.isInternetReachable !== false || false,
    connectionType: networkInfo?.type || 'unknown',
    isInternetReachable: networkInfo?.isInternetReachable || null,
    networkQuality: getNetworkQuality(networkInfo),
    isSyncing,
    syncProgress,
    lastSyncTime,
    pendingOperations: queueStats.pending,
    failedOperations: queueStats.failed,
    forceSync,
    retryFailedOperations,
    clearCompletedOperations,
  };

  return (
    <NetworkContext.Provider value={contextValue}>
      {children}
    </NetworkContext.Provider>
  );
};

/**
 * Hook to use network context
 */
export const useNetwork = (): NetworkContextState => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

/**
 * Hook to get simple online status
 */
export const useIsOnline = (): boolean => {
  const { isOnline } = useNetwork();
  return isOnline;
};

/**
 * Hook to get network quality
 */
export const useNetworkQuality = (): NetworkQuality => {
  const { networkQuality } = useNetwork();
  return networkQuality;
};

/**
 * Hook to get sync status
 */
export const useSyncStatus = (): {
  isSyncing: boolean;
  syncProgress: SyncProgress;
  lastSyncTime: number | null;
  forceSync: () => Promise<void>;
} => {
  const { isSyncing, syncProgress, lastSyncTime, forceSync } = useNetwork();
  return { isSyncing, syncProgress, lastSyncTime, forceSync };
};

/**
 * Hook to get offline queue status
 */
export const useOfflineQueue = (): {
  pendingOperations: number;
  failedOperations: number;
  retryFailedOperations: () => Promise<void>;
  clearCompletedOperations: () => Promise<void>;
} => {
  const { 
    pendingOperations, 
    failedOperations, 
    retryFailedOperations, 
    clearCompletedOperations 
  } = useNetwork();
  
  return { 
    pendingOperations, 
    failedOperations, 
    retryFailedOperations, 
    clearCompletedOperations 
  };
};

/**
 * Hook for network quality indicator
 */
export const useNetworkIndicator = (): {
  quality: NetworkQuality;
  isOnline: boolean;
  showOfflineIndicator: boolean;
  connectionType: NetInfoStateType;
} => {
  const { networkQuality, isOnline, connectionType } = useNetwork();
  
  return {
    quality: networkQuality,
    isOnline,
    showOfflineIndicator: !isOnline || networkQuality === 'offline',
    connectionType,
  };
};

export default NetworkContext;