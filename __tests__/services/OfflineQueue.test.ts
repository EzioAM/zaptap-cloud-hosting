import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineQueue, OfflineQueue, QueuedOperation } from '../../src/services/offline/OfflineQueue';
import { TestDataFactory, TestUtils, MockServices } from '../utils/testHelpers';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../src/services/analytics/AnalyticsService', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('OfflineQueue', () => {
  let queue: OfflineQueue;
  let mockStorage: ReturnType<typeof MockServices.createMockAsyncStorage>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton instance
    (OfflineQueue as any).instance = undefined;
    
    // Setup mock storage
    mockStorage = MockServices.createMockAsyncStorage();
    Object.assign(mockAsyncStorage, mockStorage);

    queue = OfflineQueue.getInstance();
  });

  afterEach(() => {
    jest.useRealTimers();
    queue.stopCleanupTimer();
  });

  describe('initialization', () => {
    it('should initialize with empty queue when no stored data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      // Wait for initialization to complete
      await TestUtils.waitFor(100);

      const stats = queue.getQueueStats();
      expect(stats.total).toBe(0);
    });

    it('should load existing queue from storage', async () => {
      const storedQueue = [
        TestDataFactory.createMockQueuedOperation({ id: 'op1' }),
        TestDataFactory.createMockQueuedOperation({ id: 'op2' }),
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedQueue));

      // Create new instance to test loading
      (OfflineQueue as any).instance = undefined;
      queue = OfflineQueue.getInstance();
      
      await TestUtils.waitFor(100);

      const stats = queue.getQueueStats();
      expect(stats.total).toBe(2);
    });

    it('should handle storage loading errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      // Create new instance
      (OfflineQueue as any).instance = undefined;
      queue = OfflineQueue.getInstance();
      
      await TestUtils.waitFor(100);

      const stats = queue.getQueueStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('enqueue', () => {
    it('should add operation to queue with correct priority ordering', async () => {
      const highPriorityOp = TestDataFactory.createMockQueuedOperation({
        type: 'automation_execute',
        priority: 'high',
      });

      const normalPriorityOp = TestDataFactory.createMockQueuedOperation({
        type: 'share_create',
        priority: 'normal',
      });

      const lowPriorityOp = TestDataFactory.createMockQueuedOperation({
        type: 'qr_generate',
        priority: 'low',
      });

      // Add in reverse priority order to test sorting
      await queue.enqueue(lowPriorityOp);
      await queue.enqueue(normalPriorityOp);
      await queue.enqueue(highPriorityOp);

      const pendingOps = queue.getPendingOperations();
      
      expect(pendingOps).toHaveLength(3);
      expect(pendingOps[0].priority).toBe('high');
      expect(pendingOps[1].priority).toBe('normal');
      expect(pendingOps[2].priority).toBe('low');
    });

    it('should generate unique operation IDs', async () => {
      const op1 = TestDataFactory.createMockQueuedOperation();
      const op2 = TestDataFactory.createMockQueuedOperation();

      const id1 = await queue.enqueue(op1);
      const id2 = await queue.enqueue(op2);

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });

    it('should persist queue to storage after enqueue', async () => {
      const operation = TestDataFactory.createMockQueuedOperation();

      await queue.enqueue(operation);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@shortcutslike_offline_queue',
        expect.any(String)
      );
    });

    it('should handle queue size limit', async () => {
      // Mock a queue that's at capacity
      const largeQueue = Array.from({ length: 1000 }, (_, i) =>
        TestDataFactory.createMockQueuedOperation({ id: `op-${i}`, status: 'pending' })
      );

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(largeQueue));

      // Create new instance with full queue
      (OfflineQueue as any).instance = undefined;
      queue = OfflineQueue.getInstance();
      await TestUtils.waitFor(100);

      const operation = TestDataFactory.createMockQueuedOperation();

      await expect(queue.enqueue(operation)).rejects.toThrow(
        'Queue is full. Cannot add more operations.'
      );
    });

    it('should cleanup completed items when approaching limit', async () => {
      const mixedQueue = [
        ...Array.from({ length: 500 }, (_, i) =>
          TestDataFactory.createMockQueuedOperation({ 
            id: `completed-${i}`, 
            status: 'completed',
            timestamp: Date.now() - 3700000, // Older than 1 hour
          })
        ),
        ...Array.from({ length: 499 }, (_, i) =>
          TestDataFactory.createMockQueuedOperation({ 
            id: `pending-${i}`, 
            status: 'pending' 
          })
        ),
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mixedQueue));

      // Create new instance
      (OfflineQueue as any).instance = undefined;
      queue = OfflineQueue.getInstance();
      await TestUtils.waitFor(100);

      const operation = TestDataFactory.createMockQueuedOperation();
      await queue.enqueue(operation);

      const stats = queue.getQueueStats();
      expect(stats.completed).toBeLessThan(500); // Should have cleaned up some completed items
    });
  });

  describe('dequeue', () => {
    it('should remove operation from queue', async () => {
      const operation = TestDataFactory.createMockQueuedOperation();
      const operationId = await queue.enqueue(operation);

      const dequeuedOp = await queue.dequeue(operationId);

      expect(dequeuedOp).toBeDefined();
      expect(dequeuedOp?.id).toBe(operationId);

      const stats = queue.getQueueStats();
      expect(stats.total).toBe(0);
    });

    it('should return null for non-existent operation', async () => {
      const result = await queue.dequeue('non-existent-id');

      expect(result).toBeNull();
    });

    it('should persist queue after dequeue', async () => {
      const operation = TestDataFactory.createMockQueuedOperation();
      const operationId = await queue.enqueue(operation);

      mockAsyncStorage.setItem.mockClear();

      await queue.dequeue(operationId);

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('operation status management', () => {
    let operationId: string;

    beforeEach(async () => {
      const operation = TestDataFactory.createMockQueuedOperation();
      operationId = await queue.enqueue(operation);
    });

    it('should update operation status', async () => {
      await queue.updateOperationStatus(operationId, 'processing');

      const operation = queue.getOperation(operationId);
      expect(operation?.status).toBe('processing');
    });

    it('should update operation status with error message', async () => {
      const errorMessage = 'Test error occurred';

      await queue.updateOperationStatus(operationId, 'failed', errorMessage);

      const operation = queue.getOperation(operationId);
      expect(operation?.status).toBe('failed');
      expect(operation?.errorMessage).toBe(errorMessage);
    });

    it('should move to dead letter queue when max retries exceeded', async () => {
      const operation = queue.getOperation(operationId);
      if (operation) {
        operation.retryCount = operation.maxRetries;
      }

      await queue.updateOperationStatus(operationId, 'failed');

      const updatedOperation = queue.getOperation(operationId);
      expect(updatedOperation?.status).toBe('dead_letter');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@shortcutslike_dead_letter_queue',
        expect.any(String)
      );
    });

    it('should handle status update for non-existent operation', async () => {
      await queue.updateOperationStatus('non-existent', 'completed');

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('retry logic and exponential backoff', () => {
    let operationId: string;

    beforeEach(async () => {
      const operation = TestDataFactory.createMockQueuedOperation({ maxRetries: 3 });
      operationId = await queue.enqueue(operation);
    });

    it('should increment retry count and calculate delay', async () => {
      const delay = await queue.incrementRetryCount(operationId);

      expect(delay).toBeGreaterThan(0);

      const operation = queue.getOperation(operationId);
      expect(operation?.retryCount).toBe(1);
      expect(operation?.status).toBe('pending');
      expect(operation?.lastRetryTimestamp).toBeDefined();
    });

    it('should calculate exponential backoff correctly', async () => {
      const delays = [];
      
      for (let i = 0; i < 3; i++) {
        const delay = await queue.incrementRetryCount(operationId);
        delays.push(delay);
      }

      // Each delay should be roughly double the previous (with jitter)
      expect(delays[1]).toBeGreaterThan(delays[0]);
      expect(delays[2]).toBeGreaterThan(delays[1]);
    });

    it('should respect maximum delay limit', async () => {
      // Simulate many retries to test max delay
      for (let i = 0; i < 10; i++) {
        await queue.incrementRetryCount(operationId);
      }

      const operation = queue.getOperation(operationId);
      const delay = (queue as any).calculateRetryDelay(operation?.retryCount || 0);

      expect(delay).toBeLessThanOrEqual(30000); // Max delay is 30 seconds
    });

    it('should determine if operation is ready for retry', async () => {
      const operation = queue.getOperation(operationId);
      
      // Fresh operation should be ready
      expect(queue.isOperationReadyForRetry(operation!)).toBe(true);

      // After incrementing retry count, should not be ready immediately
      await queue.incrementRetryCount(operationId);
      const retryOperation = queue.getOperation(operationId);
      
      expect(queue.isOperationReadyForRetry(retryOperation!)).toBe(false);

      // Should be ready after sufficient time has passed
      jest.advanceTimersByTime(5000); // Advance 5 seconds
      
      expect(queue.isOperationReadyForRetry(retryOperation!)).toBe(true);
    });

    it('should get only ready operations', async () => {
      // Add multiple operations with different retry states
      const op1Id = await queue.enqueue(TestDataFactory.createMockQueuedOperation());
      const op2Id = await queue.enqueue(TestDataFactory.createMockQueuedOperation());
      
      // Increment retry count for one operation
      await queue.incrementRetryCount(op2Id);

      const readyOps = queue.getReadyOperations();
      
      expect(readyOps).toHaveLength(2); // op1 and original operation
      expect(readyOps.some(op => op.id === op1Id)).toBe(true);
    });

    it('should handle retry count increment for non-existent operation', async () => {
      await expect(queue.incrementRetryCount('non-existent')).rejects.toThrow();
    });
  });

  describe('dead letter queue management', () => {
    it('should retrieve dead letter queue items', async () => {
      const deadLetterItems = [
        TestDataFactory.createMockQueuedOperation({ status: 'dead_letter' }),
      ];

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(null) // Main queue
        .mockResolvedValueOnce(JSON.stringify(deadLetterItems)); // Dead letter queue

      const items = await queue.getDeadLetterQueue();

      expect(items).toHaveLength(1);
      expect(items[0].status).toBe('dead_letter');
    });

    it('should requeue operation from dead letter queue', async () => {
      const deadLetterOp = TestDataFactory.createMockQueuedOperation({
        id: 'dead-op-1',
        status: 'dead_letter',
        retryCount: 5,
        errorMessage: 'Max retries exceeded',
      });

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(null) // Main queue  
        .mockResolvedValueOnce(JSON.stringify([deadLetterOp])); // Dead letter queue

      const result = await queue.requeueFromDeadLetter('dead-op-1');

      expect(result).toBe(true);

      const requeuedOp = queue.getOperation('dead-op-1');
      expect(requeuedOp?.status).toBe('pending');
      expect(requeuedOp?.retryCount).toBe(0);
      expect(requeuedOp?.errorMessage).toBeUndefined();
    });

    it('should return false when trying to requeue non-existent operation', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

      const result = await queue.requeueFromDeadLetter('non-existent');

      expect(result).toBe(false);
    });

    it('should limit dead letter queue size', async () => {
      // Create operation that will go to dead letter queue
      const operation = TestDataFactory.createMockQueuedOperation({ maxRetries: 0 });
      const operationId = await queue.enqueue(operation);

      // Simulate existing dead letter queue with 100 items
      const existingDeadLetterQueue = Array.from({ length: 100 }, (_, i) =>
        TestDataFactory.createMockQueuedOperation({ id: `dead-${i}` })
      );

      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(existingDeadLetterQueue));

      // This should trigger move to dead letter queue and cleanup
      await queue.updateOperationStatus(operationId, 'failed');

      // Verify that setItem was called to update dead letter queue
      const deadLetterSetCalls = mockAsyncStorage.setItem.mock.calls.filter(
        call => call[0] === '@shortcutslike_dead_letter_queue'
      );

      expect(deadLetterSetCalls.length).toBeGreaterThan(0);
    });
  });

  describe('queue statistics', () => {
    beforeEach(async () => {
      // Add operations in various states
      const op1Id = await queue.enqueue(TestDataFactory.createMockQueuedOperation());
      const op2Id = await queue.enqueue(TestDataFactory.createMockQueuedOperation());
      const op3Id = await queue.enqueue(TestDataFactory.createMockQueuedOperation());

      await queue.updateOperationStatus(op1Id, 'processing');
      await queue.updateOperationStatus(op2Id, 'completed');
      await queue.updateOperationStatus(op3Id, 'failed');
    });

    it('should return correct queue statistics', () => {
      const stats = queue.getQueueStats();

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(0);
      expect(stats.processing).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.deadLetter).toBe(0);
    });
  });

  describe('queue maintenance', () => {
    it('should clear completed operations', async () => {
      const op1Id = await queue.enqueue(TestDataFactory.createMockQueuedOperation());
      const op2Id = await queue.enqueue(TestDataFactory.createMockQueuedOperation());
      const op3Id = await queue.enqueue(TestDataFactory.createMockQueuedOperation());

      await queue.updateOperationStatus(op1Id, 'completed');
      await queue.updateOperationStatus(op2Id, 'completed');
      await queue.updateOperationStatus(op3Id, 'pending');

      const removedCount = await queue.clearCompleted();

      expect(removedCount).toBe(2);

      const stats = queue.getQueueStats();
      expect(stats.total).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it('should clear entire queue', async () => {
      await queue.enqueue(TestDataFactory.createMockQueuedOperation());
      await queue.enqueue(TestDataFactory.createMockQueuedOperation());

      await queue.clearQueue();

      const stats = queue.getQueueStats();
      expect(stats.total).toBe(0);

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
        '@shortcutslike_offline_queue'
      );
    });

    it('should automatically cleanup old completed items', () => {
      const mockCleanup = jest.spyOn(queue as any, 'cleanupCompletedItems');

      // Start cleanup timer
      (queue as any).startCleanupTimer();

      // Fast-forward time
      jest.advanceTimersByTime(300000); // 5 minutes

      expect(mockCleanup).toHaveBeenCalled();
    });

    it('should stop cleanup timer', () => {
      (queue as any).startCleanupTimer();
      
      queue.stopCleanupTimer();

      // Timer should not trigger cleanup after stopping
      const mockCleanup = jest.spyOn(queue as any, 'cleanupCompletedItems');
      jest.advanceTimersByTime(300000);

      expect(mockCleanup).not.toHaveBeenCalled();
    });
  });

  describe('persistence and error handling', () => {
    it('should handle persistence errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      const operation = TestDataFactory.createMockQueuedOperation();

      // Should not throw error
      await expect(queue.enqueue(operation)).resolves.toBeDefined();
    });

    it('should handle dead letter queue persistence errors', async () => {
      const operation = TestDataFactory.createMockQueuedOperation({ maxRetries: 0 });
      const operationId = await queue.enqueue(operation);

      // Mock storage error for dead letter queue
      mockAsyncStorage.setItem.mockImplementation((key) => {
        if (key === '@shortcutslike_dead_letter_queue') {
          return Promise.reject(new Error('Dead letter storage error'));
        }
        return Promise.resolve();
      });

      // Should handle error gracefully
      await expect(
        queue.updateOperationStatus(operationId, 'failed')
      ).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      const mockStopTimer = jest.spyOn(queue, 'stopCleanupTimer');

      await queue.cleanup();

      expect(mockStopTimer).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalled(); // Should persist queue
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = OfflineQueue.getInstance();
      const instance2 = OfflineQueue.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should use exported singleton instance', () => {
      expect(offlineQueue).toBe(OfflineQueue.getInstance());
    });
  });
});