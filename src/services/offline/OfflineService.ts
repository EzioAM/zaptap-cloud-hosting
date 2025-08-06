import { store } from '../../store';
import { syncManager } from './SyncManager';
import { offlineQueue } from './OfflineQueue';
import { registerAllProcessors } from './OperationProcessors';
import { initializeOfflineSystem } from '../../store/slices/offlineSlice';
import { logger } from '../analytics/AnalyticsService';

/**
 * Configuration options for offline service
 */
export interface OfflineServiceConfig {
  enableAutoSync: boolean;
  syncInterval: number; // milliseconds
  maxRetryAttempts: number;
  enableBackgroundSync: boolean;
  enableOptimisticUpdates: boolean;
  batchSize: number;
  maxConcurrentOperations: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OfflineServiceConfig = {
  enableAutoSync: true,
  syncInterval: 30000, // 30 seconds
  maxRetryAttempts: 3,
  enableBackgroundSync: true,
  enableOptimisticUpdates: true,
  batchSize: 10,
  maxConcurrentOperations: 3,
};

/**
 * Offline service initialization and management
 */
export class OfflineService {
  private static instance: OfflineService;
  private initialized = false;
  private config: OfflineServiceConfig = DEFAULT_CONFIG;

  private constructor() {}

  /**
   * Singleton pattern implementation
   */
  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Initialize the offline service
   */
  public async initialize(config?: Partial<OfflineServiceConfig>): Promise<void> {
    if (this.initialized) {
      logger.warn('OfflineService: Already initialized, skipping...');
      return;
    }

    try {
      logger.info('OfflineService: Starting initialization...');

      // Update configuration
      if (config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        logger.info('OfflineService: Using custom configuration', this.config);
      }

      // Register operation processors with sync manager
      registerAllProcessors(syncManager);

      // Update sync manager configuration
      syncManager.updateConfig({
        batchSize: this.config.batchSize,
        syncInterval: this.config.syncInterval,
        enableBackgroundSync: this.config.enableBackgroundSync,
        maxConcurrentOperations: this.config.maxConcurrentOperations,
        conflictResolution: 'server_wins',
        priorityOrder: ['high', 'normal', 'low'],
      });

      // Initialize Redux offline state
      await store.dispatch(initializeOfflineSystem());

      this.initialized = true;
      logger.info('OfflineService: Initialization completed successfully');

      // Start initial sync if conditions are met
      if (this.config.enableAutoSync) {
        const networkInfo = syncManager.getNetworkInfo();
        if (networkInfo?.isConnected && networkInfo?.isInternetReachable !== false) {
          logger.info('OfflineService: Starting initial sync...');
          syncManager.startSync().catch(error => {
            logger.warn('OfflineService: Initial sync failed', { error: error.message });
          });
        }
      }
    } catch (error) {
      logger.error('OfflineService: Initialization failed', { error });
      throw error;
    }
  }

  /**
   * Check if service is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get current configuration
   */
  public getConfig(): OfflineServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<OfflineServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update sync manager configuration
    syncManager.updateConfig({
      batchSize: this.config.batchSize,
      syncInterval: this.config.syncInterval,
      enableBackgroundSync: this.config.enableBackgroundSync,
      maxConcurrentOperations: this.config.maxConcurrentOperations,
    });

    logger.info('OfflineService: Configuration updated', this.config);
  }

  /**
   * Get service statistics
   */
  public getStats(): {
    initialized: boolean;
    queueStats: any;
    syncStats: any;
    config: OfflineServiceConfig;
  } {
    return {
      initialized: this.initialized,
      queueStats: offlineQueue.getQueueStats(),
      syncStats: syncManager.getSyncStats(),
      config: this.config,
    };
  }

  /**
   * Force sync operation
   */
  public async forceSync(): Promise<void> {
    if (!this.initialized) {
      throw new Error('OfflineService not initialized');
    }

    logger.info('OfflineService: Force sync requested');
    await syncManager.forceSync();
  }

  /**
   * Queue operation for offline processing
   */
  public async queueOperation(
    type: string,
    payload: any,
    options: {
      priority?: 'high' | 'normal' | 'low';
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    if (!this.initialized) {
      throw new Error('OfflineService not initialized');
    }

    const operationId = await offlineQueue.enqueue({
      type: type as any,
      payload,
      priority: options.priority || 'normal',
      maxRetries: options.maxRetries || this.config.maxRetryAttempts,
    });

    logger.info('OfflineService: Operation queued', {
      operationId,
      type,
      priority: options.priority || 'normal',
    });

    return operationId;
  }

  /**
   * Retry failed operations
   */
  public async retryFailedOperations(operationIds?: string[]): Promise<number> {
    if (!this.initialized) {
      throw new Error('OfflineService not initialized');
    }

    logger.info('OfflineService: Retrying failed operations', {
      specificIds: operationIds?.length || 'all',
    });

    let retryCount = 0;
    const deadLetterOperations = await offlineQueue.getDeadLetterQueue();

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
      for (const operation of deadLetterOperations) {
        const success = await offlineQueue.requeueFromDeadLetter(operation.id);
        if (success) {
          retryCount++;
        }
      }
    }

    // Trigger sync if we have requeued operations
    if (retryCount > 0) {
      await this.forceSync();
    }

    logger.info('OfflineService: Retried failed operations', { retryCount });
    return retryCount;
  }

  /**
   * Clear completed operations
   */
  public async clearCompletedOperations(): Promise<number> {
    if (!this.initialized) {
      throw new Error('OfflineService not initialized');
    }

    logger.info('OfflineService: Clearing completed operations');
    const clearedCount = await offlineQueue.clearCompleted();
    logger.info('OfflineService: Cleared completed operations', { count: clearedCount });
    return clearedCount;
  }

  /**
   * Get operation details
   */
  public getOperation(operationId: string): any {
    if (!this.initialized) {
      throw new Error('OfflineService not initialized');
    }

    return offlineQueue.getOperation(operationId);
  }

  /**
   * Get pending operations
   */
  public getPendingOperations(): any[] {
    if (!this.initialized) {
      throw new Error('OfflineService not initialized');
    }

    return offlineQueue.getPendingOperations();
  }

  /**
   * Get dead letter queue
   */
  public async getDeadLetterQueue(): Promise<any[]> {
    if (!this.initialized) {
      throw new Error('OfflineService not initialized');
    }

    return await offlineQueue.getDeadLetterQueue();
  }

  /**
   * Add event listener for sync events
   */
  public addEventListener(
    eventType: string,
    listener: (event: any) => void
  ): void {
    if (!this.initialized) {
      throw new Error('OfflineService not initialized');
    }

    syncManager.addEventListener(eventType as any, listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(
    eventType: string,
    listener: (event: any) => void
  ): void {
    if (!this.initialized) {
      throw new Error('OfflineService not initialized');
    }

    syncManager.removeEventListener(eventType as any, listener);
  }

  /**
   * Check if currently online
   */
  public isOnline(): boolean {
    const networkInfo = syncManager.getNetworkInfo();
    return networkInfo?.isConnected && networkInfo?.isInternetReachable !== false || false;
  }

  /**
   * Check if currently syncing
   */
  public isSyncing(): boolean {
    return syncManager.isSyncing();
  }

  /**
   * Get network information
   */
  public getNetworkInfo(): any {
    return syncManager.getNetworkInfo();
  }

  /**
   * Get sync progress
   */
  public getSyncProgress(): any {
    return syncManager.getSyncProgress();
  }

  /**
   * Cleanup service on app termination
   */
  public async cleanup(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    logger.info('OfflineService: Starting cleanup...');

    try {
      // Stop sync manager
      syncManager.cleanup();

      // Cleanup offline queue
      await offlineQueue.cleanup();

      this.initialized = false;
      logger.info('OfflineService: Cleanup completed successfully');
    } catch (error) {
      logger.error('OfflineService: Cleanup failed', { error });
    }
  }

  /**
   * Reset service (for testing or emergency recovery)
   */
  public async reset(): Promise<void> {
    logger.warn('OfflineService: Resetting service...');

    try {
      await this.cleanup();
      await offlineQueue.clearQueue();
      this.config = { ...DEFAULT_CONFIG };
      this.initialized = false;
      
      logger.warn('OfflineService: Reset completed');
    } catch (error) {
      logger.error('OfflineService: Reset failed', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const offlineService = OfflineService.getInstance();

/**
 * Helper function to initialize offline support in the app
 */
export const initializeOfflineSupport = async (
  config?: Partial<OfflineServiceConfig>
): Promise<void> => {
  logger.info('Initializing offline support for ShortcutsLike app...');
  
  try {
    await offlineService.initialize(config);
    logger.info('✅ Offline support initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize offline support', { error });
    throw error;
  }
};

/**
 * Helper function to queue automation execution
 */
export const queueAutomationExecution = async (
  automation: any,
  variables?: any,
  triggerData?: any
): Promise<string> => {
  return await offlineService.queueOperation('automation_execute', {
    automation,
    variables,
    triggerData,
  }, {
    priority: 'high', // High priority for user actions
  });
};

/**
 * Helper function to queue share creation
 */
export const queueShareCreation = async (
  automationId: string,
  shareData: any
): Promise<string> => {
  return await offlineService.queueOperation('share_create', {
    automationId,
    shareData,
  }, {
    priority: 'high', // High priority for sharing
  });
};

/**
 * Helper function to queue NFC write
 */
export const queueNFCWrite = async (
  automationId: string,
  nfcData: any,
  deploymentData: any
): Promise<string> => {
  return await offlineService.queueOperation('nfc_write', {
    automationId,
    nfcData,
    deploymentData,
  }, {
    priority: 'normal',
  });
};

/**
 * Helper function to queue QR generation
 */
export const queueQRGeneration = async (
  automationId: string,
  qrData: any,
  deploymentData: any
): Promise<string> => {
  return await offlineService.queueOperation('qr_generate', {
    automationId,
    qrData,
    deploymentData,
  }, {
    priority: 'normal',
  });
};

export default offlineService;