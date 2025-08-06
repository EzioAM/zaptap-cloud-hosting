import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../analytics/AnalyticsService';

/**
 * Queue item interface defining the structure of operations queued for offline processing
 */
export interface QueuedOperation {
  id: string;
  type: 'automation_execute' | 'share_create' | 'nfc_write' | 'qr_generate' | 'automation_update' | 'deployment_create';
  payload: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'failed' | 'completed' | 'dead_letter';
  lastRetryTimestamp?: number;
  errorMessage?: string;
}

/**
 * Retry strategy configuration for exponential backoff
 */
export interface RetryStrategy {
  initialDelay: number; // 1000ms (1 second)
  maxDelay: number; // 30000ms (30 seconds)
  multiplier: number; // 2 (exponential)
  jitter: boolean; // true (randomize delays)
}

/**
 * Queue configuration options
 */
export interface QueueConfig {
  maxQueueSize: number;
  retryStrategy: RetryStrategy;
  cleanupInterval: number; // milliseconds
  maxCompletedAge: number; // milliseconds to keep completed items
}

/**
 * Comprehensive offline queue management system
 * Handles queuing, persistence, retry logic, and dead letter queue for failed operations
 */
export class OfflineQueue {
  private static instance: OfflineQueue;
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private readonly STORAGE_KEY = '@shortcutslike_offline_queue';
  private readonly DEAD_LETTER_KEY = '@shortcutslike_dead_letter_queue';
  
  private readonly config: QueueConfig = {
    maxQueueSize: 1000,
    retryStrategy: {
      initialDelay: 1000,
      maxDelay: 30000,
      multiplier: 2,
      jitter: true,
    },
    cleanupInterval: 300000, // 5 minutes
    maxCompletedAge: 3600000, // 1 hour
  };

  private constructor() {
    this.initializeQueue();
    this.startCleanupTimer();
  }

  /**
   * Singleton pattern implementation
   */
  public static getInstance(): OfflineQueue {
    if (!OfflineQueue.instance) {
      OfflineQueue.instance = new OfflineQueue();
    }
    return OfflineQueue.instance;
  }

  /**
   * Initialize queue by loading from AsyncStorage
   */
  private async initializeQueue(): Promise<void> {
    try {
      const storedQueue = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedQueue) {
        this.queue = JSON.parse(storedQueue);
        logger.info('OfflineQueue: Loaded queue from storage', { queueSize: this.queue.length });
      }
    } catch (error) {
      logger.error('OfflineQueue: Failed to load queue from storage', { error });
      this.queue = [];
    }
  }

  /**
   * Persist current queue to AsyncStorage
   */
  private async persistQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      logger.error('OfflineQueue: Failed to persist queue', { error });
    }
  }

  /**
   * Add operation to the queue
   */
  public async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest completed items to make space
      this.cleanupCompletedItems();
      
      if (this.queue.length >= this.config.maxQueueSize) {
        throw new Error('Queue is full. Cannot add more operations.');
      }
    }

    const queuedOperation: QueuedOperation = {
      id: this.generateId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      ...operation,
    };

    // Insert based on priority
    const insertIndex = this.findInsertIndex(queuedOperation.priority);
    this.queue.splice(insertIndex, 0, queuedOperation);

    await this.persistQueue();
    
    logger.info('OfflineQueue: Operation enqueued', { 
      operationId: queuedOperation.id, 
      type: queuedOperation.type,
      priority: queuedOperation.priority,
      queueSize: this.queue.length 
    });

    return queuedOperation.id;
  }

  /**
   * Find the correct insertion index based on priority
   */
  private findInsertIndex(priority: QueuedOperation['priority']): number {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const targetPriority = priorityOrder[priority];

    for (let i = 0; i < this.queue.length; i++) {
      const currentPriority = priorityOrder[this.queue[i].priority];
      if (currentPriority > targetPriority) {
        return i;
      }
    }

    return this.queue.length;
  }

  /**
   * Remove operation from queue
   */
  public async dequeue(operationId: string): Promise<QueuedOperation | null> {
    const index = this.queue.findIndex(op => op.id === operationId);
    if (index === -1) {
      return null;
    }

    const operation = this.queue.splice(index, 1)[0];
    await this.persistQueue();

    logger.info('OfflineQueue: Operation dequeued', { 
      operationId, 
      type: operation.type,
      queueSize: this.queue.length 
    });

    return operation;
  }

  /**
   * Get all pending operations sorted by priority
   */
  public getPendingOperations(): QueuedOperation[] {
    return this.queue
      .filter(op => op.status === 'pending')
      .sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  /**
   * Get operation by ID
   */
  public getOperation(operationId: string): QueuedOperation | null {
    return this.queue.find(op => op.id === operationId) || null;
  }

  /**
   * Update operation status
   */
  public async updateOperationStatus(
    operationId: string, 
    status: QueuedOperation['status'],
    errorMessage?: string
  ): Promise<void> {
    const operation = this.queue.find(op => op.id === operationId);
    if (!operation) {
      logger.warn('OfflineQueue: Operation not found for status update', { operationId });
      return;
    }

    operation.status = status;
    if (errorMessage) {
      operation.errorMessage = errorMessage;
    }

    // Move to dead letter queue if max retries exceeded
    if (status === 'failed' && operation.retryCount >= operation.maxRetries) {
      operation.status = 'dead_letter';
      await this.moveToDeadLetterQueue(operation);
    }

    await this.persistQueue();

    logger.info('OfflineQueue: Operation status updated', { 
      operationId, 
      status, 
      retryCount: operation.retryCount,
      maxRetries: operation.maxRetries 
    });
  }

  /**
   * Increment retry count and calculate next retry delay
   */
  public async incrementRetryCount(operationId: string): Promise<number> {
    const operation = this.queue.find(op => op.id === operationId);
    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    operation.retryCount++;
    operation.lastRetryTimestamp = Date.now();
    operation.status = 'pending';

    const delay = this.calculateRetryDelay(operation.retryCount);
    
    await this.persistQueue();

    logger.info('OfflineQueue: Retry count incremented', { 
      operationId, 
      retryCount: operation.retryCount,
      nextRetryDelay: delay 
    });

    return delay;
  }

  /**
   * Calculate retry delay using exponential backoff with jitter
   */
  private calculateRetryDelay(retryCount: number): number {
    const { initialDelay, maxDelay, multiplier, jitter } = this.config.retryStrategy;
    
    let delay = Math.min(initialDelay * Math.pow(multiplier, retryCount - 1), maxDelay);
    
    // Add jitter to prevent thundering herd problem
    if (jitter) {
      delay = delay + (Math.random() * delay * 0.1); // ±10% jitter
    }

    return Math.floor(delay);
  }

  /**
   * Get queue statistics
   */
  public getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
  } {
    const stats = {
      total: this.queue.length,
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      deadLetter: 0,
    };

    this.queue.forEach(op => {
      switch (op.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'processing':
          stats.processing++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
        case 'dead_letter':
          stats.deadLetter++;
          break;
      }
    });

    return stats;
  }

  /**
   * Clear completed operations older than configured age
   */
  private cleanupCompletedItems(): void {
    const cutoffTime = Date.now() - this.config.maxCompletedAge;
    const originalLength = this.queue.length;

    this.queue = this.queue.filter(op => {
      return !(op.status === 'completed' && op.timestamp < cutoffTime);
    });

    if (this.queue.length < originalLength) {
      this.persistQueue();
      logger.info('OfflineQueue: Cleaned up completed items', { 
        removed: originalLength - this.queue.length,
        remaining: this.queue.length 
      });
    }
  }

  /**
   * Move operation to dead letter queue
   */
  private async moveToDeadLetterQueue(operation: QueuedOperation): Promise<void> {
    try {
      const deadLetterQueueStr = await AsyncStorage.getItem(this.DEAD_LETTER_KEY);
      const deadLetterQueue: QueuedOperation[] = deadLetterQueueStr 
        ? JSON.parse(deadLetterQueueStr) 
        : [];

      deadLetterQueue.push({
        ...operation,
        status: 'dead_letter',
        timestamp: Date.now(), // Update timestamp for dead letter entry
      });

      // Keep only recent dead letter items (last 100)
      if (deadLetterQueue.length > 100) {
        deadLetterQueue.splice(0, deadLetterQueue.length - 100);
      }

      await AsyncStorage.setItem(this.DEAD_LETTER_KEY, JSON.stringify(deadLetterQueue));
      
      logger.warn('OfflineQueue: Operation moved to dead letter queue', { 
        operationId: operation.id,
        type: operation.type,
        retryCount: operation.retryCount,
        errorMessage: operation.errorMessage 
      });
    } catch (error) {
      logger.error('OfflineQueue: Failed to move operation to dead letter queue', { 
        operationId: operation.id, 
        error 
      });
    }
  }

  /**
   * Get dead letter queue items
   */
  public async getDeadLetterQueue(): Promise<QueuedOperation[]> {
    try {
      const deadLetterQueueStr = await AsyncStorage.getItem(this.DEAD_LETTER_KEY);
      return deadLetterQueueStr ? JSON.parse(deadLetterQueueStr) : [];
    } catch (error) {
      logger.error('OfflineQueue: Failed to load dead letter queue', { error });
      return [];
    }
  }

  /**
   * Requeue operation from dead letter queue
   */
  public async requeueFromDeadLetter(operationId: string): Promise<boolean> {
    try {
      const deadLetterQueue = await this.getDeadLetterQueue();
      const operationIndex = deadLetterQueue.findIndex(op => op.id === operationId);
      
      if (operationIndex === -1) {
        return false;
      }

      const operation = deadLetterQueue[operationIndex];
      
      // Reset operation for retry
      operation.status = 'pending';
      operation.retryCount = 0;
      operation.timestamp = Date.now();
      operation.errorMessage = undefined;

      // Add back to main queue
      this.queue.push(operation);
      
      // Remove from dead letter queue
      deadLetterQueue.splice(operationIndex, 1);
      await AsyncStorage.setItem(this.DEAD_LETTER_KEY, JSON.stringify(deadLetterQueue));
      
      await this.persistQueue();

      logger.info('OfflineQueue: Operation requeued from dead letter queue', { 
        operationId,
        type: operation.type 
      });

      return true;
    } catch (error) {
      logger.error('OfflineQueue: Failed to requeue from dead letter queue', { 
        operationId, 
        error 
      });
      return false;
    }
  }

  /**
   * Clear all completed operations
   */
  public async clearCompleted(): Promise<number> {
    const originalLength = this.queue.length;
    this.queue = this.queue.filter(op => op.status !== 'completed');
    
    await this.persistQueue();
    
    const removedCount = originalLength - this.queue.length;
    
    logger.info('OfflineQueue: Cleared completed operations', { 
      removed: removedCount,
      remaining: this.queue.length 
    });

    return removedCount;
  }

  /**
   * Start cleanup timer for periodic maintenance
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedItems();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  public stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Generate unique ID for operations
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if operation is ready for retry based on backoff delay
   */
  public isOperationReadyForRetry(operation: QueuedOperation): boolean {
    if (operation.status !== 'pending' || operation.retryCount === 0) {
      return true;
    }

    if (!operation.lastRetryTimestamp) {
      return true;
    }

    const delay = this.calculateRetryDelay(operation.retryCount);
    const timeSinceLastRetry = Date.now() - operation.lastRetryTimestamp;

    return timeSinceLastRetry >= delay;
  }

  /**
   * Get operations ready for processing (considering retry delays)
   */
  public getReadyOperations(): QueuedOperation[] {
    return this.getPendingOperations().filter(op => this.isOperationReadyForRetry(op));
  }

  /**
   * Clear entire queue (use with caution)
   */
  public async clearQueue(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    logger.warn('OfflineQueue: Queue cleared');
  }

  /**
   * Cleanup on app termination
   */
  public async cleanup(): Promise<void> {
    this.stopCleanupTimer();
    await this.persistQueue();
    logger.info('OfflineQueue: Cleanup completed');
  }
}

// Export singleton instance
export const offlineQueue = OfflineQueue.getInstance();