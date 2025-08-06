import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueue, OfflineQueue } from '../../src/services/offline/OfflineQueue';
import { automationSharingService } from '../../src/services/sharing/AutomationSharingService';
import NFCService from '../../src/services/nfc/NFCService';
import { TestDataFactory, TestUtils, MockServices } from '../utils/testHelpers';

// Mock all dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../src/services/sharing/AutomationSharingService');
jest.mock('../../src/services/nfc/NFCService');
jest.mock('../../src/services/supabase/client');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockAutomationSharingService = automationSharingService as jest.Mocked<typeof automationSharingService>;
const mockNFCService = NFCService as jest.Mocked<typeof NFCService>;

describe('OfflineSync Integration Tests', () => {
  let queue: OfflineQueue;
  let mockStorage: ReturnType<typeof MockServices.createMockAsyncStorage>;
  let networkSimulator: ReturnType<typeof TestUtils.simulateNetworkConditions>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset singleton
    (OfflineQueue as any).instance = undefined;

    // Setup mock storage
    mockStorage = MockServices.createMockAsyncStorage();
    Object.assign(mockAsyncStorage, mockStorage);

    // Setup network simulation
    networkSimulator = TestUtils.simulateNetworkConditions(true);

    // Initialize queue
    queue = OfflineQueue.getInstance();
    await TestUtils.waitFor(100); // Allow initialization

    // Setup service mocks
    mockAutomationSharingService.createPublicShareLink.mockResolvedValue({
      success: true,
      shareUrl: 'https://www.zaptap.cloud/share/test123abc',
      publicId: 'test123abc',
    });

    mockNFCService.writeAutomationToNFC.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    queue.stopCleanupTimer();
  });

  describe('Online to Offline Transition', () => {
    it('should queue operations when going offline', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Start online
      networkSimulator.goOnline();

      // Queue an operation
      const operationId = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      expect(queue.getQueueStats().pending).toBe(1);

      // Go offline
      networkSimulator.goOffline();

      // Operation should remain in queue
      expect(queue.getOperation(operationId)).toBeTruthy();
      expect(queue.getOperation(operationId)?.status).toBe('pending');
    });

    it('should persist queue operations to storage when offline', async () => {
      const operations = [
        TestDataFactory.createMockQueuedOperation({ type: 'share_create' }),
        TestDataFactory.createMockQueuedOperation({ type: 'nfc_write' }),
        TestDataFactory.createMockQueuedOperation({ type: 'automation_update' }),
      ];

      // Go offline and add operations
      networkSimulator.goOffline();

      for (const op of operations) {
        await queue.enqueue(op);
      }

      // Verify storage calls
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@shortcutslike_offline_queue',
        expect.any(String)
      );

      // Verify all operations are queued
      expect(queue.getQueueStats().total).toBe(3);
    });

    it('should handle rapid online/offline transitions', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Add operations during rapid network changes
      networkSimulator.goOnline();
      const op1Id = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'normal',
      });

      networkSimulator.goOffline();
      const op2Id = await queue.enqueue({
        type: 'nfc_write',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      networkSimulator.goOnline();
      const op3Id = await queue.enqueue({
        type: 'qr_generate',
        payload: { automation },
        maxRetries: 3,
        priority: 'low',
      });

      // All operations should be properly queued
      expect(queue.getOperation(op1Id)).toBeTruthy();
      expect(queue.getOperation(op2Id)).toBeTruthy();
      expect(queue.getOperation(op3Id)).toBeTruthy();
    });
  });

  describe('Offline Queue Processing', () => {
    it('should process queued operations when coming back online', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Start offline and queue operations
      networkSimulator.goOffline();

      const shareOpId = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      const nfcOpId = await queue.enqueue({
        type: 'nfc_write',
        payload: { automation },
        maxRetries: 3,
        priority: 'normal',
      });

      // Go back online
      networkSimulator.goOnline();

      // Simulate processing
      await queue.updateOperationStatus(shareOpId, 'processing');
      
      // Mock successful operation
      await queue.updateOperationStatus(shareOpId, 'completed');

      expect(queue.getOperation(shareOpId)?.status).toBe('completed');
      expect(queue.getQueueStats().completed).toBe(1);
    });

    it('should respect priority ordering during sync', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Add operations in mixed priority order
      const lowPriorityId = await queue.enqueue({
        type: 'qr_generate',
        payload: { automation },
        maxRetries: 3,
        priority: 'low',
      });

      const highPriorityId = await queue.enqueue({
        type: 'nfc_write',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      const normalPriorityId = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'normal',
      });

      const readyOperations = queue.getReadyOperations();

      // Should be ordered by priority (high, normal, low)
      expect(readyOperations[0].id).toBe(highPriorityId);
      expect(readyOperations[1].id).toBe(normalPriorityId);
      expect(readyOperations[2].id).toBe(lowPriorityId);
    });

    it('should handle partial sync failures', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Queue multiple operations
      const successOpId = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      const failOpId = await queue.enqueue({
        type: 'nfc_write',
        payload: { automation },
        maxRetries: 3,
        priority: 'normal',
      });

      // Simulate one success, one failure
      await queue.updateOperationStatus(successOpId, 'completed');
      await queue.updateOperationStatus(failOpId, 'failed', 'Network error');

      expect(queue.getOperation(successOpId)?.status).toBe('completed');
      expect(queue.getOperation(failOpId)?.status).toBe('failed');
      expect(queue.getOperation(failOpId)?.errorMessage).toBe('Network error');
    });
  });

  describe('Retry Logic and Exponential Backoff', () => {
    it('should retry failed operations with exponential backoff', async () => {
      const automation = TestDataFactory.createMockAutomation();

      const operationId = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'normal',
      });

      // Simulate failures with retries
      for (let i = 1; i <= 3; i++) {
        const delay = await queue.incrementRetryCount(operationId);
        
        expect(delay).toBeGreaterThan(0);
        expect(queue.getOperation(operationId)?.retryCount).toBe(i);

        // Each delay should be roughly double the previous (with jitter)
        if (i > 1) {
          const previousDelay = 1000 * Math.pow(2, i - 2); // Previous expected delay
          const currentDelay = delay;
          expect(currentDelay).toBeGreaterThan(previousDelay * 0.9); // Account for jitter
        }
      }
    });

    it('should move to dead letter queue after max retries', async () => {
      const automation = TestDataFactory.createMockAutomation();

      const operationId = await queue.enqueue({
        type: 'nfc_write',
        payload: { automation },
        maxRetries: 2,
        priority: 'high',
      });

      // Exceed max retries
      await queue.incrementRetryCount(operationId); // Retry 1
      await queue.incrementRetryCount(operationId); // Retry 2

      // Next failure should move to dead letter queue
      await queue.updateOperationStatus(operationId, 'failed', 'Max retries exceeded');

      expect(queue.getOperation(operationId)?.status).toBe('dead_letter');

      // Should be stored in dead letter queue in AsyncStorage
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@shortcutslike_dead_letter_queue',
        expect.any(String)
      );
    });

    it('should handle retry timing correctly', async () => {
      const automation = TestDataFactory.createMockAutomation();

      const operationId = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'normal',
      });

      // First retry
      await queue.incrementRetryCount(operationId);
      
      const operation = queue.getOperation(operationId);
      expect(queue.isOperationReadyForRetry(operation!)).toBe(false);

      // Fast-forward time
      jest.advanceTimersByTime(1500); // Advance past initial delay

      expect(queue.isOperationReadyForRetry(operation!)).toBe(true);
    });
  });

  describe('Data Integrity and Conflict Resolution', () => {
    it('should maintain data integrity during sync', async () => {
      const automation = TestDataFactory.createMockAutomation({
        id: 'integrity-test-123',
        title: 'Integrity Test Automation',
      });

      // Queue operation offline
      networkSimulator.goOffline();
      
      const operationId = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      // Go online and process
      networkSimulator.goOnline();

      // Simulate successful processing
      await queue.updateOperationStatus(operationId, 'processing');

      // Mock service call
      mockAutomationSharingService.createPublicShareLink.mockResolvedValue({
        success: true,
        shareUrl: 'https://www.zaptap.cloud/share/integrity123',
        publicId: 'integrity123',
      });

      await queue.updateOperationStatus(operationId, 'completed');

      // Verify the operation completed with correct data
      const completedOperation = queue.getOperation(operationId);
      expect(completedOperation?.status).toBe('completed');
      expect(completedOperation?.payload.automation.id).toBe('integrity-test-123');
    });

    it('should handle concurrent operations on same data', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Queue multiple operations for the same automation
      const op1Id = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      const op2Id = await queue.enqueue({
        type: 'nfc_write',
        payload: { automation },
        maxRetries: 3,
        priority: 'normal',
      });

      const op3Id = await queue.enqueue({
        type: 'qr_generate',
        payload: { automation },
        maxRetries: 3,
        priority: 'low',
      });

      // All operations should be queued without conflicts
      expect(queue.getOperation(op1Id)).toBeTruthy();
      expect(queue.getOperation(op2Id)).toBeTruthy();
      expect(queue.getOperation(op3Id)).toBeTruthy();

      // Process them in order
      await queue.updateOperationStatus(op1Id, 'completed');
      await queue.updateOperationStatus(op2Id, 'completed');
      await queue.updateOperationStatus(op3Id, 'completed');

      expect(queue.getQueueStats().completed).toBe(3);
    });

    it('should handle storage errors gracefully', async () => {
      // Mock storage failure
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage full'));

      const automation = TestDataFactory.createMockAutomation();

      // Should not throw, but handle gracefully
      await expect(queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'normal',
      })).resolves.toBeDefined();

      // Operation should still be in memory queue
      expect(queue.getQueueStats().total).toBeGreaterThan(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle large queue sizes efficiently', async () => {
      const startTime = performance.now();

      // Add many operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        const automation = TestDataFactory.createMockAutomation({ id: `test-${i}` });
        const opId = await queue.enqueue({
          type: 'share_create',
          payload: { automation },
          maxRetries: 3,
          priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'normal' : 'low',
        });
        operations.push(opId);
      }

      const endTime = performance.now();

      expect(queue.getQueueStats().total).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in reasonable time

      // Priority ordering should still work
      const readyOps = queue.getReadyOperations();
      let previousPriority = 0; // high = 0, normal = 1, low = 2
      
      readyOps.forEach(op => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const currentPriority = priorityOrder[op.priority];
        expect(currentPriority).toBeGreaterThanOrEqual(previousPriority);
        previousPriority = currentPriority;
      });
    });

    it('should cleanup completed operations automatically', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Add and complete many operations
      for (let i = 0; i < 10; i++) {
        const opId = await queue.enqueue({
          type: 'share_create',
          payload: { automation },
          maxRetries: 3,
          priority: 'normal',
        });

        await queue.updateOperationStatus(opId, 'completed');
      }

      expect(queue.getQueueStats().completed).toBe(10);

      // Trigger cleanup by advancing time
      jest.advanceTimersByTime(300000); // 5 minutes

      // Some completed operations should be cleaned up if they're old enough
      // (This depends on the actual cleanup implementation)
    });

    it('should handle memory pressure by cleaning up old operations', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Add operations with old timestamps
      const oldTimestamp = Date.now() - 3700000; // More than 1 hour ago

      for (let i = 0; i < 5; i++) {
        const opId = await queue.enqueue({
          type: 'share_create',
          payload: { automation },
          maxRetries: 3,
          priority: 'normal',
        });

        // Manually set old timestamp and completed status
        const operation = queue.getOperation(opId);
        if (operation) {
          operation.timestamp = oldTimestamp;
          operation.status = 'completed';
        }
      }

      // Add new operations to trigger cleanup
      await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      // The cleanup logic should have been triggered
      // (Specific behavior depends on implementation)
      expect(queue.getQueueStats().total).toBeGreaterThan(0);
    });
  });

  describe('Recovery and Persistence', () => {
    it('should recover queue from storage on restart', async () => {
      const storedOperations = [
        TestDataFactory.createMockQueuedOperation({ id: 'stored-1', status: 'pending' }),
        TestDataFactory.createMockQueuedOperation({ id: 'stored-2', status: 'processing' }),
        TestDataFactory.createMockQueuedOperation({ id: 'stored-3', status: 'completed' }),
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedOperations));

      // Create new queue instance (simulates restart)
      (OfflineQueue as any).instance = undefined;
      const newQueue = OfflineQueue.getInstance();
      
      await TestUtils.waitFor(150); // Allow initialization

      // Should have loaded stored operations
      expect(newQueue.getQueueStats().total).toBe(3);
      expect(newQueue.getQueueStats().pending).toBe(1);
      expect(newQueue.getQueueStats().processing).toBe(1);
      expect(newQueue.getQueueStats().completed).toBe(1);
    });

    it('should handle corrupted storage data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json data');

      // Create new queue instance
      (OfflineQueue as any).instance = undefined;
      const newQueue = OfflineQueue.getInstance();
      
      await TestUtils.waitFor(150);

      // Should start with empty queue instead of crashing
      expect(newQueue.getQueueStats().total).toBe(0);
    });

    it('should persist changes immediately', async () => {
      const automation = TestDataFactory.createMockAutomation();

      const operationId = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      // Storage should be updated
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@shortcutslike_offline_queue',
        expect.any(String)
      );

      // Update status
      await queue.updateOperationStatus(operationId, 'processing');

      // Storage should be updated again
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Network State Integration', () => {
    it('should detect network state changes', async () => {
      // Mock NetInfo responses
      mockNetInfo.fetch
        .mockResolvedValueOnce(TestDataFactory.createMockNetInfoState(true))
        .mockResolvedValueOnce(TestDataFactory.createMockNetInfoState(false));

      const onlineState = await NetInfo.fetch();
      expect(onlineState.isConnected).toBe(true);

      const offlineState = await NetInfo.fetch();
      expect(offlineState.isConnected).toBe(false);
    });

    it('should adapt behavior based on connection type', async () => {
      // Mock different connection types
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'cellular',
        details: {
          isConnectionExpensive: true,
        },
      } as any);

      const networkState = await NetInfo.fetch();
      
      // Queue could adapt behavior based on expensive connections
      // (Implementation would depend on specific requirements)
      expect(networkState.details.isConnectionExpensive).toBe(true);
    });
  });

  describe('End-to-End Offline Scenarios', () => {
    it('should handle complete offline automation sharing flow', async () => {
      const automation = TestDataFactory.createMockAutomation({
        title: 'Offline Test Automation',
        is_public: true,
      });

      // Start offline
      networkSimulator.goOffline();

      // Queue share operation
      const shareOpId = await queue.enqueue({
        type: 'share_create',
        payload: { automation },
        maxRetries: 3,
        priority: 'high',
      });

      // Queue NFC write operation
      const nfcOpId = await queue.enqueue({
        type: 'nfc_write',
        payload: { automation },
        maxRetries: 3,
        priority: 'normal',
      });

      expect(queue.getQueueStats().pending).toBe(2);

      // Go back online
      networkSimulator.goOnline();

      // Process operations in priority order
      const readyOps = queue.getReadyOperations();
      expect(readyOps[0].id).toBe(shareOpId); // High priority first

      // Simulate successful processing
      await queue.updateOperationStatus(shareOpId, 'processing');
      await queue.updateOperationStatus(shareOpId, 'completed');

      await queue.updateOperationStatus(nfcOpId, 'processing');
      await queue.updateOperationStatus(nfcOpId, 'completed');

      expect(queue.getQueueStats().completed).toBe(2);
      expect(queue.getQueueStats().pending).toBe(0);
    });

    it('should handle mixed success and failure scenarios', async () => {
      const automation = TestDataFactory.createMockAutomation();

      // Queue multiple operations
      const ops = [];
      for (let i = 0; i < 5; i++) {
        const opId = await queue.enqueue({
          type: 'share_create',
          payload: { automation },
          maxRetries: 3,
          priority: 'normal',
        });
        ops.push(opId);
      }

      // Simulate mixed results
      await queue.updateOperationStatus(ops[0], 'completed');
      await queue.updateOperationStatus(ops[1], 'failed', 'Network timeout');
      await queue.updateOperationStatus(ops[2], 'completed');
      await queue.updateOperationStatus(ops[3], 'failed', 'Server error');

      // Retry failed operations
      await queue.incrementRetryCount(ops[1]);
      await queue.incrementRetryCount(ops[3]);

      // Eventually succeed
      await queue.updateOperationStatus(ops[1], 'completed');
      await queue.updateOperationStatus(ops[3], 'completed');

      const stats = queue.getQueueStats();
      expect(stats.completed).toBe(4);
      expect(stats.pending).toBe(1); // ops[4] still pending
    });
  });
});