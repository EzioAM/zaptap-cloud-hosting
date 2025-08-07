import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { offlineQueue, QueuedOperation } from './OfflineQueue';
import { EventLogger } from '../../utils/EventLogger';

/**
 * Network connection information
 */
export interface NetworkInfo {
  isConnected: boolean;
  type: NetInfoStateType;
  isInternetReachable: boolean | null;
  details: any;
}

/**
 * Sync operation progress tracking
 */
export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: boolean;
  currentOperation?: string;
  estimatedTimeRemaining?: number;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  batchSize: number;
  syncInterval: number; // milliseconds
  priorityOrder: Array<'high' | 'normal' | 'low'>;
  conflictResolution: 'server_wins' | 'client_wins' | 'merge';
  maxConcurrentOperations: number;
  enableBackgroundSync: boolean;
  syncOnAppForeground: boolean;
}

/**
 * Operation processor interface - implement this for each operation type
 */
export interface OperationProcessor {
  process(operation: QueuedOperation): Promise<void>;
  canProcess(operation: QueuedOperation): boolean;
  getEstimatedDuration(operation: QueuedOperation): number; // milliseconds
}

/**
 * Sync event types
 */
export type SyncEventType = 
  | 'network_changed'
  | 'sync_started' 
  | 'sync_progress'
  | 'sync_completed'
  | 'sync_failed'
  | 'operation_completed'
  | 'operation_failed';

/**
 * Sync event data
 */
export interface SyncEvent {
  type: SyncEventType;
  data?: any;
  timestamp: number;
}

/**
 * Event listener callback
 */
export type SyncEventListener = (event: SyncEvent) => void;

/**
 * Comprehensive sync manager for handling offline/online synchronization
 */
export class SyncManager {
  private static instance: SyncManager;
  private networkInfo: NetworkInfo | null = null;
  private syncInProgress = false;
  private appState: AppStateStatus = 'active';
  private syncInterval: NodeJS.Timeout | null = null;
  private processors = new Map<string, OperationProcessor>();
  private eventListeners = new Map<string, Set<SyncEventListener>>();
  private networkUnsubscribe: (() => void) | null = null;
  private appStateSubscription: any = null;

  private readonly config: SyncConfig = {
    batchSize: 10,
    syncInterval: 30000, // 30 seconds
    priorityOrder: ['high', 'normal', 'low'],
    conflictResolution: 'server_wins',
    maxConcurrentOperations: 3,
    enableBackgroundSync: true,
    syncOnAppForeground: true,
  };

  private currentSyncProgress: SyncProgress = {
    total: 0,
    completed: 0,
    failed: 0,
    inProgress: false,
  };

  private constructor() {
    this.initializeNetworkMonitoring();
    this.initializeAppStateMonitoring();
    this.startPeriodicSync();
  }

  /**
   * Singleton pattern implementation
   */
  public static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Initialize network monitoring
   */
  private initializeNetworkMonitoring(): void {
    try {
      EventLogger.info('SyncManager', 'Initializing network monitoring');
      
      // Configure NetInfo for better reliability
      NetInfo.configure({
        reachabilityUrl: 'https://clients3.google.com/generate_204',
        reachabilityTest: async (response) => response.status === 204,
        reachabilityLongTimeout: 60 * 1000, // 60s
        reachabilityShortTimeout: 5 * 1000, // 5s
        reachabilityRequestTimeout: 15 * 1000, // 15s
        reachabilityShouldRun: () => true,
      });

      // Listen for network state changes
      const unsubscribe = NetInfo.addEventListener(this.handleNetworkStateChange.bind(this));
      
      // Store unsubscribe function for cleanup
      this.networkUnsubscribe = unsubscribe;

      // Get initial network state with retry logic
      this.fetchInitialNetworkState();
      
      EventLogger.info('SyncManager', 'Network monitoring initialized');
    } catch (error) {
      EventLogger.error('SyncManager', 'Failed to initialize network monitoring', error);
      // Set a fallback offline state
      this.networkInfo = {
        isConnected: false,
        type: 'unknown',
        isInternetReachable: null,
        details: null,
      };
    }
  }

  /**
   * Handle network state changes
   */
  private handleNetworkStateChange(state: NetInfoState): void {
    try {
      const previouslyConnected = this.networkInfo?.isConnected || false;
      const previousInternetReachable = this.networkInfo?.isInternetReachable;
      
      const newNetworkInfo: NetworkInfo = {
        isConnected: Boolean(state.isConnected),
        type: state.type || 'unknown',
        isInternetReachable: state.isInternetReachable,
        details: state.details,
      };
      
      // Only update if there's a meaningful change
      const hasChanged = !this.networkInfo || 
        this.networkInfo.isConnected !== newNetworkInfo.isConnected ||
        this.networkInfo.type !== newNetworkInfo.type ||
        this.networkInfo.isInternetReachable !== newNetworkInfo.isInternetReachable;
      
      if (hasChanged) {
        this.networkInfo = newNetworkInfo;
        
        EventLogger.info('SyncManager', 'Network state changed', {
          type: newNetworkInfo.type,
          isConnected: newNetworkInfo.isConnected,
          isInternetReachable: newNetworkInfo.isInternetReachable,
          previouslyConnected,
          previousInternetReachable,
        });

        // Emit network change event
        this.emitEvent('network_changed', this.networkInfo);

        // Start sync if we just came online
        const isNowOnline = newNetworkInfo.isConnected && newNetworkInfo.isInternetReachable !== false;
        const wasOffline = !previouslyConnected || previousInternetReachable === false;
        
        if (wasOffline && isNowOnline) {
          EventLogger.info('SyncManager', 'Connection restored, starting sync');
          // Add a small delay to ensure the connection is stable
          setTimeout(() => {
            this.startSync().catch(error => {
              EventLogger.error('SyncManager', 'Failed to start sync after connection restored', error);
            });
          }, 1000);
        }
      }
    } catch (error) {
      EventLogger.error('SyncManager', 'Error handling network state change', error, { state });
    }
  }

  /**
   * Initialize app state monitoring for foreground/background sync
   */
  private initializeAppStateMonitoring(): void {
    try {
      EventLogger.info('SyncManager', 'Initializing app state monitoring');
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
      this.appState = AppState.currentState;
      EventLogger.info('SyncManager', 'App state monitoring initialized', { currentState: this.appState });
    } catch (error) {
      EventLogger.error('SyncManager', 'Failed to initialize app state monitoring', error);
    }
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const wasInBackground = this.appState !== 'active';
    this.appState = nextAppState;

    // Start sync when app comes to foreground
    if (wasInBackground && nextAppState === 'active' && this.config.syncOnAppForeground) {
      EventLogger.info('SyncManager', 'App came to foreground, starting sync');
      this.startSync().catch(error => {
        EventLogger.error('SyncManager', 'Failed to start sync on app foreground', error);
      });
    }
  }

  /**
   * Start periodic sync based on configuration
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.config.syncInterval > 0) {
      this.syncInterval = setInterval(() => {
        if (this.canSync() && !this.syncInProgress) {
          this.startSync().catch(error => {
            EventLogger.error('SyncManager', 'Periodic sync failed', error);
          });
        }
      }, this.config.syncInterval);
    }
  }

  /**
   * Check if sync can be performed
   */
  private canSync(): boolean {
    if (!this.networkInfo) {
      return false;
    }

    // Check if we have internet connectivity
    if (!this.networkInfo.isConnected || this.networkInfo.isInternetReachable === false) {
      return false;
    }

    // Check if background sync is enabled when app is in background
    if (this.appState !== 'active' && !this.config.enableBackgroundSync) {
      return false;
    }

    return true;
  }

  /**
   * Register operation processor
   */
  public registerProcessor(operationType: string, processor: OperationProcessor): void {
    this.processors.set(operationType, processor);
    EventLogger.info('SyncManager', 'Processor registered', { operationType });
  }

  /**
   * Unregister operation processor
   */
  public unregisterProcessor(operationType: string): void {
    this.processors.delete(operationType);
    EventLogger.info('SyncManager', 'Processor unregistered', { operationType });
  }

  /**
   * Start synchronization process
   */
  public async startSync(): Promise<void> {
    if (this.syncInProgress) {
      EventLogger.info('SyncManager', 'Sync already in progress, skipping');
      return;
    }

    if (!this.canSync()) {
      EventLogger.info('SyncManager', 'Cannot sync - network not available or app in background');
      return;
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      EventLogger.info('SyncManager', 'Starting synchronization');
      this.emitEvent('sync_started');

      await this.performSync();

      const duration = Date.now() - startTime;
      EventLogger.info('SyncManager', 'Synchronization completed', { 
        duration,
        completed: this.currentSyncProgress.completed,
        failed: this.currentSyncProgress.failed 
      });

      this.emitEvent('sync_completed', {
        duration,
        completed: this.currentSyncProgress.completed,
        failed: this.currentSyncProgress.failed,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      EventLogger.error('SyncManager', 'Synchronization failed', error, { duration });
      this.emitEvent('sync_failed', { error: error.message, duration });
    } finally {
      this.syncInProgress = false;
      this.resetSyncProgress();
    }
  }

  /**
   * Perform the actual synchronization
   */
  private async performSync(): Promise<void> {
    const readyOperations = offlineQueue.getReadyOperations();
    
    if (readyOperations.length === 0) {
      EventLogger.info('SyncManager', 'No operations ready for sync');
      return;
    }

    // Initialize sync progress
    this.currentSyncProgress = {
      total: readyOperations.length,
      completed: 0,
      failed: 0,
      inProgress: true,
    };

    EventLogger.info('SyncManager', 'Processing operations', { total: readyOperations.length });

    // Process operations in batches by priority
    for (const priority of this.config.priorityOrder) {
      const priorityOperations = readyOperations.filter(op => op.priority === priority);
      
      if (priorityOperations.length > 0) {
        await this.processBatch(priorityOperations);
      }
    }
  }

  /**
   * Process a batch of operations
   */
  private async processBatch(operations: QueuedOperation[]): Promise<void> {
    const batches = this.chunkArray(operations, this.config.batchSize);
    
    for (const batch of batches) {
      if (!this.canSync()) {
        EventLogger.info('SyncManager', 'Network lost during batch processing, stopping');
        break;
      }

      await this.processConcurrentOperations(batch);
    }
  }

  /**
   * Process operations concurrently with limit
   */
  private async processConcurrentOperations(operations: QueuedOperation[]): Promise<void> {
    const chunks = this.chunkArray(operations, this.config.maxConcurrentOperations);
    
    for (const chunk of chunks) {
      const promises = chunk.map(operation => this.processOperation(operation));
      await Promise.allSettled(promises);
    }
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    const processor = this.processors.get(operation.type);
    
    if (!processor) {
      const error = `No processor found for operation type: ${operation.type}`;
      EventLogger.error('SyncManager', 'Operation processing failed', undefined, { 
        operationId: operation.id, 
        type: operation.type, 
        error 
      });
      
      await offlineQueue.updateOperationStatus(operation.id, 'failed', error);
      await offlineQueue.incrementRetryCount(operation.id);
      
      this.currentSyncProgress.failed++;
      this.emitEvent('operation_failed', { operationId: operation.id, error });
      return;
    }

    if (!processor.canProcess(operation)) {
      EventLogger.info('SyncManager', 'Operation cannot be processed at this time', { 
        operationId: operation.id, 
        type: operation.type 
      });
      return;
    }

    try {
      // Update operation status to processing
      await offlineQueue.updateOperationStatus(operation.id, 'processing');
      
      // Update sync progress
      this.currentSyncProgress.currentOperation = `${operation.type}:${operation.id}`;
      this.emitEvent('sync_progress', { ...this.currentSyncProgress });

      EventLogger.info('SyncManager', 'Processing operation', { 
        operationId: operation.id, 
        type: operation.type,
        attempt: operation.retryCount + 1 
      });

      // Process the operation
      await processor.process(operation);

      // Mark as completed
      await offlineQueue.updateOperationStatus(operation.id, 'completed');
      
      this.currentSyncProgress.completed++;
      this.emitEvent('operation_completed', { 
        operationId: operation.id, 
        type: operation.type 
      });

      EventLogger.info('SyncManager', 'Operation processed successfully', { 
        operationId: operation.id, 
        type: operation.type 
      });

    } catch (error) {
      EventLogger.error('SyncManager', 'Operation processing failed', error as Error, { 
        operationId: operation.id, 
        type: operation.type, 
        errorMessage: (error as Error).message,
        attempt: operation.retryCount + 1 
      });

      await offlineQueue.updateOperationStatus(operation.id, 'failed', error.message);
      
      // Increment retry count if not exceeded
      if (operation.retryCount < operation.maxRetries) {
        await offlineQueue.incrementRetryCount(operation.id);
      }

      this.currentSyncProgress.failed++;
      this.emitEvent('operation_failed', { 
        operationId: operation.id, 
        type: operation.type, 
        error: error.message 
      });
    }
  }

  /**
   * Reset sync progress
   */
  private resetSyncProgress(): void {
    this.currentSyncProgress = {
      total: 0,
      completed: 0,
      failed: 0,
      inProgress: false,
    };
  }

  /**
   * Get current network information
   */
  public getNetworkInfo(): NetworkInfo | null {
    return this.networkInfo;
  }

  /**
   * Get current sync progress
   */
  public getSyncProgress(): SyncProgress {
    return { ...this.currentSyncProgress };
  }

  /**
   * Check if currently syncing
   */
  public isSyncing(): boolean {
    return this.syncInProgress;
  }

  /**
   * Force sync (even if conditions not met)
   */
  public async forceSync(): Promise<void> {
    EventLogger.info('SyncManager', 'Force sync requested');
    this.syncInProgress = false; // Reset flag to allow force sync
    await this.startSync();
  }

  /**
   * Stop sync process
   */
  public stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    EventLogger.info('SyncManager', 'Sync stopped');
  }

  /**
   * Update sync configuration
   */
  public updateConfig(newConfig: Partial<SyncConfig>): void {
    Object.assign(this.config, newConfig);
    
    // Restart periodic sync if interval changed
    if (newConfig.syncInterval !== undefined) {
      this.startPeriodicSync();
    }
    
    EventLogger.info('SyncManager', 'Configuration updated', newConfig);
  }

  /**
   * Add event listener
   */
  public addEventListener(eventType: SyncEventType, listener: SyncEventListener): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(eventType: SyncEventType, listener: SyncEventListener): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(type: SyncEventType, data?: any): void {
    const event: SyncEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          EventLogger.error('SyncManager', 'Event listener error', error, { eventType: type });
        }
      });
    }
  }

  /**
   * Utility function to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get sync statistics
   */
  public getSyncStats(): {
    queueStats: any;
    networkInfo: NetworkInfo | null;
    syncProgress: SyncProgress;
    isSyncing: boolean;
  } {
    return {
      queueStats: offlineQueue.getQueueStats(),
      networkInfo: this.networkInfo,
      syncProgress: this.currentSyncProgress,
      isSyncing: this.syncInProgress,
    };
  }

  /**
   * Add method to fetch initial network state with retry
   */
  private async fetchInitialNetworkState(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 3;
    const retryDelay = 1000; // 1 second

    while (attempts < maxAttempts) {
      try {
        EventLogger.info('SyncManager', 'Fetching initial network state', { attempt: attempts + 1 });
        const state = await NetInfo.fetch();
        this.handleNetworkStateChange(state);
        EventLogger.info('SyncManager', 'Initial network state fetched successfully');
        return;
      } catch (error) {
        attempts++;
        EventLogger.warn('SyncManager', 'Failed to fetch network state', { 
          attempt: attempts, 
          maxAttempts, 
          error 
        });
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempts));
        } else {
          // Set fallback state after all retries failed
          EventLogger.error('SyncManager', 'All network fetch attempts failed, setting fallback state');
          this.networkInfo = {
            isConnected: false,
            type: 'unknown',
            isInternetReachable: null,
            details: null,
          };
          this.emitEvent('network_changed', this.networkInfo);
        }
      }
    }
  }

  /**
   * Cleanup on app termination
   */
  public cleanup(): void {
    try {
      this.stopSync();
      
      // Clean up network monitoring
      if (this.networkUnsubscribe) {
        this.networkUnsubscribe();
        this.networkUnsubscribe = null;
      }
      
      // Clean up app state monitoring
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
      
      this.eventListeners.clear();
      EventLogger.info('SyncManager', 'Cleanup completed');
    } catch (error) {
      EventLogger.error('SyncManager', 'Error during cleanup', error);
    }
  }
}

// Export singleton instance
export const syncManager = SyncManager.getInstance();