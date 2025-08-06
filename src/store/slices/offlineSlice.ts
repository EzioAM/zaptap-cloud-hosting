import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { NetInfoStateType } from '@react-native-community/netinfo';
import { offlineQueue, QueuedOperation } from '../../services/offline/OfflineQueue';
import { syncManager, NetworkInfo, SyncProgress } from '../../services/offline/SyncManager';
import { logger } from '../../services/analytics/AnalyticsService';

/**
 * Network connection state
 */
export interface NetworkState {
  isOnline: boolean;
  connectionType: NetInfoStateType;
  isInternetReachable: boolean | null;
  lastConnectedTime: number | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
}

/**
 * Queue statistics
 */
export interface QueueStatistics {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
}

/**
 * Sync state
 */
export interface SyncState {
  isSyncing: boolean;
  progress: SyncProgress;
  lastSyncTime: number | null;
  nextSyncTime: number | null;
  syncErrors: string[];
  autoSyncEnabled: boolean;
}

/**
 * Failed operation for retry tracking
 */
export interface FailedOperation {
  id: string;
  type: string;
  errorMessage: string;
  timestamp: number;
  retryCount: number;
  canRetry: boolean;
}

/**
 * Complete offline slice state
 */
export interface OfflineState {
  network: NetworkState;
  queue: QueueStatistics;
  sync: SyncState;
  failedOperations: FailedOperation[];
  optimisticUpdates: Record<string, any>;
  settings: {
    enableOptimisticUpdates: boolean;
    maxRetryAttempts: number;
    syncInterval: number;
    enableBackgroundSync: boolean;
  };
  isInitialized: boolean;
}

/**
 * Initial state
 */
const initialState: OfflineState = {
  network: {
    isOnline: false,
    connectionType: 'unknown',
    isInternetReachable: null,
    lastConnectedTime: null,
    connectionQuality: 'offline',
  },
  queue: {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    deadLetter: 0,
  },
  sync: {
    isSyncing: false,
    progress: {
      total: 0,
      completed: 0,
      failed: 0,
      inProgress: false,
    },
    lastSyncTime: null,
    nextSyncTime: null,
    syncErrors: [],
    autoSyncEnabled: true,
  },
  failedOperations: [],
  optimisticUpdates: {},
  settings: {
    enableOptimisticUpdates: true,
    maxRetryAttempts: 3,
    syncInterval: 30000, // 30 seconds
    enableBackgroundSync: true,
  },
  isInitialized: false,
};

/**
 * Async thunk to initialize offline system
 */
export const initializeOfflineSystem = createAsyncThunk(
  'offline/initialize',
  async (_, { dispatch }) => {
    try {
      logger.info('OfflineSlice: Initializing offline system');
      
      // Get initial network state
      const networkInfo = syncManager.getNetworkInfo();
      if (networkInfo) {
        dispatch(updateNetworkState(networkInfo));
      }

      // Get initial queue stats
      const queueStats = offlineQueue.getQueueStats();
      dispatch(updateQueueStatistics(queueStats));

      // Get initial sync state
      const syncProgress = syncManager.getSyncProgress();
      dispatch(updateSyncProgress(syncProgress));

      logger.info('OfflineSlice: Offline system initialized');
      return true;
    } catch (error) {
      logger.error('OfflineSlice: Failed to initialize offline system', { error });
      throw error;
    }
  }
);

/**
 * Async thunk to enqueue operation
 */
export const enqueueOperation = createAsyncThunk(
  'offline/enqueue',
  async (operation: {
    type: QueuedOperation['type'];
    payload: any;
    priority?: QueuedOperation['priority'];
    maxRetries?: number;
  }, { dispatch }) => {
    try {
      const operationId = await offlineQueue.enqueue({
        type: operation.type,
        payload: operation.payload,
        priority: operation.priority || 'normal',
        maxRetries: operation.maxRetries || 3,
      });

      // Update queue statistics
      const queueStats = offlineQueue.getQueueStats();
      dispatch(updateQueueStatistics(queueStats));

      logger.info('OfflineSlice: Operation enqueued', { 
        operationId, 
        type: operation.type 
      });

      return { operationId, ...operation };
    } catch (error) {
      logger.error('OfflineSlice: Failed to enqueue operation', { 
        type: operation.type, 
        error 
      });
      throw error;
    }
  }
);

/**
 * Async thunk to force sync
 */
export const forceSync = createAsyncThunk(
  'offline/forceSync',
  async (_, { dispatch }) => {
    try {
      logger.info('OfflineSlice: Force sync requested');
      await syncManager.forceSync();
      return true;
    } catch (error) {
      logger.error('OfflineSlice: Force sync failed', { error });
      throw error;
    }
  }
);

/**
 * Async thunk to retry failed operations
 */
export const retryFailedOperations = createAsyncThunk(
  'offline/retryFailed',
  async (operationIds?: string[], { dispatch }) => {
    try {
      logger.info('OfflineSlice: Retrying failed operations', { 
        operationIds: operationIds?.length || 'all' 
      });

      let retryCount = 0;
      
      if (operationIds && operationIds.length > 0) {
        // Retry specific operations
        for (const operationId of operationIds) {
          const success = await offlineQueue.requeueFromDeadLetter(operationId);
          if (success) {
            retryCount++;
          }
        }
      } else {
        // Retry all dead letter operations
        const deadLetterOperations = await offlineQueue.getDeadLetterQueue();
        for (const operation of deadLetterOperations) {
          const success = await offlineQueue.requeueFromDeadLetter(operation.id);
          if (success) {
            retryCount++;
          }
        }
      }

      // Update queue stats
      const queueStats = offlineQueue.getQueueStats();
      dispatch(updateQueueStatistics(queueStats));

      // Trigger sync if we have requeued operations
      if (retryCount > 0) {
        await syncManager.forceSync();
      }

      logger.info('OfflineSlice: Retried failed operations', { retryCount });
      return retryCount;
    } catch (error) {
      logger.error('OfflineSlice: Failed to retry operations', { error });
      throw error;
    }
  }
);

/**
 * Async thunk to clear completed operations
 */
export const clearCompletedOperations = createAsyncThunk(
  'offline/clearCompleted',
  async (_, { dispatch }) => {
    try {
      logger.info('OfflineSlice: Clearing completed operations');
      const clearedCount = await offlineQueue.clearCompleted();
      
      // Update queue stats
      const queueStats = offlineQueue.getQueueStats();
      dispatch(updateQueueStatistics(queueStats));

      logger.info('OfflineSlice: Cleared completed operations', { count: clearedCount });
      return clearedCount;
    } catch (error) {
      logger.error('OfflineSlice: Failed to clear completed operations', { error });
      throw error;
    }
  }
);

/**
 * Offline slice
 */
const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    /**
     * Update network state
     */
    updateNetworkState: (state, action: PayloadAction<NetworkInfo>) => {
      const { isConnected, type, isInternetReachable } = action.payload;
      
      // Track when we went online/offline
      if (isConnected && !state.network.isOnline) {
        state.network.lastConnectedTime = Date.now();
      }

      state.network.isOnline = isConnected;
      state.network.connectionType = type;
      state.network.isInternetReachable = isInternetReachable;
      
      // Determine connection quality
      if (!isConnected || isInternetReachable === false) {
        state.network.connectionQuality = 'offline';
      } else {
        switch (type) {
          case 'wifi':
          case 'ethernet':
            state.network.connectionQuality = 'excellent';
            break;
          case 'cellular':
            state.network.connectionQuality = 'good';
            break;
          case 'bluetooth':
          case 'vpn':
            state.network.connectionQuality = 'fair';
            break;
          default:
            state.network.connectionQuality = 'poor';
        }
      }
    },

    /**
     * Update queue statistics
     */
    updateQueueStatistics: (state, action: PayloadAction<QueueStatistics>) => {
      state.queue = action.payload;
    },

    /**
     * Update sync progress
     */
    updateSyncProgress: (state, action: PayloadAction<SyncProgress>) => {
      state.sync.progress = action.payload;
      state.sync.isSyncing = action.payload.inProgress;
    },

    /**
     * Set sync status
     */
    setSyncStatus: (state, action: PayloadAction<boolean>) => {
      state.sync.isSyncing = action.payload;
      if (!action.payload) {
        // Reset progress when sync completes
        state.sync.progress = initialState.sync.progress;
      }
    },

    /**
     * Set last sync time
     */
    setLastSyncTime: (state, action: PayloadAction<number>) => {
      state.sync.lastSyncTime = action.payload;
    },

    /**
     * Add sync error
     */
    addSyncError: (state, action: PayloadAction<string>) => {
      state.sync.syncErrors.push(action.payload);
      // Keep only last 10 errors
      if (state.sync.syncErrors.length > 10) {
        state.sync.syncErrors.shift();
      }
    },

    /**
     * Clear sync errors
     */
    clearSyncErrors: (state) => {
      state.sync.syncErrors = [];
    },

    /**
     * Add failed operation
     */
    addFailedOperation: (state, action: PayloadAction<FailedOperation>) => {
      const existingIndex = state.failedOperations.findIndex(
        op => op.id === action.payload.id
      );
      
      if (existingIndex >= 0) {
        state.failedOperations[existingIndex] = action.payload;
      } else {
        state.failedOperations.push(action.payload);
      }
      
      // Keep only last 50 failed operations
      if (state.failedOperations.length > 50) {
        state.failedOperations.shift();
      }
    },

    /**
     * Remove failed operation
     */
    removeFailedOperation: (state, action: PayloadAction<string>) => {
      state.failedOperations = state.failedOperations.filter(
        op => op.id !== action.payload
      );
    },

    /**
     * Clear failed operations
     */
    clearFailedOperations: (state) => {
      state.failedOperations = [];
    },

    /**
     * Add optimistic update
     */
    addOptimisticUpdate: (state, action: PayloadAction<{ id: string; data: any }>) => {
      if (state.settings.enableOptimisticUpdates) {
        state.optimisticUpdates[action.payload.id] = action.payload.data;
      }
    },

    /**
     * Remove optimistic update
     */
    removeOptimisticUpdate: (state, action: PayloadAction<string>) => {
      delete state.optimisticUpdates[action.payload];
    },

    /**
     * Clear all optimistic updates
     */
    clearOptimisticUpdates: (state) => {
      state.optimisticUpdates = {};
    },

    /**
     * Update settings
     */
    updateSettings: (state, action: PayloadAction<Partial<OfflineState['settings']>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },

    /**
     * Toggle auto sync
     */
    toggleAutoSync: (state) => {
      state.sync.autoSyncEnabled = !state.sync.autoSyncEnabled;
    },

    /**
     * Reset offline state
     */
    resetOfflineState: (state) => {
      return { ...initialState, isInitialized: true };
    },
  },
  extraReducers: (builder) => {
    builder
      // Initialize offline system
      .addCase(initializeOfflineSystem.fulfilled, (state) => {
        state.isInitialized = true;
      })
      .addCase(initializeOfflineSystem.rejected, (state, action) => {
        state.isInitialized = false;
        if (action.error.message) {
          state.sync.syncErrors.push(`Initialization failed: ${action.error.message}`);
        }
      })

      // Enqueue operation
      .addCase(enqueueOperation.fulfilled, (state, action) => {
        logger.info('OfflineSlice: Operation enqueued successfully', { 
          operationId: action.payload.operationId 
        });
      })
      .addCase(enqueueOperation.rejected, (state, action) => {
        if (action.error.message) {
          state.sync.syncErrors.push(`Failed to enqueue operation: ${action.error.message}`);
        }
      })

      // Force sync
      .addCase(forceSync.pending, (state) => {
        state.sync.isSyncing = true;
      })
      .addCase(forceSync.fulfilled, (state) => {
        state.sync.lastSyncTime = Date.now();
      })
      .addCase(forceSync.rejected, (state, action) => {
        state.sync.isSyncing = false;
        if (action.error.message) {
          state.sync.syncErrors.push(`Force sync failed: ${action.error.message}`);
        }
      })

      // Retry failed operations
      .addCase(retryFailedOperations.fulfilled, (state, action) => {
        logger.info('OfflineSlice: Successfully retried operations', { 
          count: action.payload 
        });
      })
      .addCase(retryFailedOperations.rejected, (state, action) => {
        if (action.error.message) {
          state.sync.syncErrors.push(`Failed to retry operations: ${action.error.message}`);
        }
      })

      // Clear completed operations
      .addCase(clearCompletedOperations.fulfilled, (state, action) => {
        logger.info('OfflineSlice: Successfully cleared completed operations', { 
          count: action.payload 
        });
      })
      .addCase(clearCompletedOperations.rejected, (state, action) => {
        if (action.error.message) {
          state.sync.syncErrors.push(`Failed to clear completed operations: ${action.error.message}`);
        }
      });
  },
});

// Export actions
export const {
  updateNetworkState,
  updateQueueStatistics,
  updateSyncProgress,
  setSyncStatus,
  setLastSyncTime,
  addSyncError,
  clearSyncErrors,
  addFailedOperation,
  removeFailedOperation,
  clearFailedOperations,
  addOptimisticUpdate,
  removeOptimisticUpdate,
  clearOptimisticUpdates,
  updateSettings,
  toggleAutoSync,
  resetOfflineState,
} = offlineSlice.actions;

// Selectors
export const selectNetworkState = (state: { offline: OfflineState }) => state.offline.network;
export const selectIsOnline = (state: { offline: OfflineState }) => state.offline.network.isOnline;
export const selectConnectionQuality = (state: { offline: OfflineState }) => state.offline.network.connectionQuality;
export const selectQueueStats = (state: { offline: OfflineState }) => state.offline.queue;
export const selectSyncState = (state: { offline: OfflineState }) => state.offline.sync;
export const selectIsSyncing = (state: { offline: OfflineState }) => state.offline.sync.isSyncing;
export const selectSyncProgress = (state: { offline: OfflineState }) => state.offline.sync.progress;
export const selectFailedOperations = (state: { offline: OfflineState }) => state.offline.failedOperations;
export const selectOptimisticUpdates = (state: { offline: OfflineState }) => state.offline.optimisticUpdates;
export const selectOfflineSettings = (state: { offline: OfflineState }) => state.offline.settings;
export const selectIsInitialized = (state: { offline: OfflineState }) => state.offline.isInitialized;

// Export reducer
export default offlineSlice.reducer;