/**
 * Offline Support System for ShortcutsLike
 * 
 * This module provides comprehensive offline functionality including:
 * - Operation queuing and retry logic
 * - Network monitoring and automatic synchronization
 * - Optimistic updates for immediate UI feedback
 * - Offline indicator components
 * - Redux state management for offline data
 */

// Core Services
export { OfflineQueue, offlineQueue } from './OfflineQueue';
export { SyncManager, syncManager } from './SyncManager';
export { OfflineService, offlineService } from './OfflineService';

// Operation Processors
export { 
  createOperationProcessors,
  registerAllProcessors,
  AutomationExecuteProcessor,
  ShareCreateProcessor,
  NFCWriteProcessor,
  QRGenerateProcessor,
  AutomationCRUDProcessor,
  DeploymentProcessor,
  GenericAPIProcessor,
} from './OperationProcessors';

// Helper Functions
export {
  initializeOfflineSupport,
  queueAutomationExecution,
  queueShareCreation,
  queueNFCWrite,
  queueQRGeneration,
} from './OfflineService';

// Types
export type { QueuedOperation, RetryStrategy } from './OfflineQueue';
export type { NetworkInfo, SyncProgress, OperationProcessor, SyncEventType } from './SyncManager';
export type { OfflineServiceConfig } from './OfflineService';

// Re-export context and components from their respective locations
export {
  NetworkProvider,
  useNetwork,
  useIsOnline,
  useNetworkQuality,
  useSyncStatus,
  useOfflineQueue,
  useNetworkIndicator,
} from '../../contexts/NetworkContext';

export {
  OfflineIndicator,
  ConnectionStatusBadge,
  SyncProgressBar,
} from '../../components/common/OfflineIndicator';

// Redux exports
export {
  default as offlineSlice,
  initializeOfflineSystem,
  enqueueOperation,
  forceSync,
  retryFailedOperations,
  clearCompletedOperations,
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
  selectNetworkState,
  selectIsOnline,
  selectConnectionQuality,
  selectQueueStats,
  selectSyncState,
  selectIsSyncing,
  selectSyncProgress,
  selectFailedOperations,
  selectOptimisticUpdates,
  selectOfflineSettings,
  selectIsInitialized,
} from '../../store/slices/offlineSlice';

// API exports
export {
  baseApiConfig,
  offlineApiConfig,
  createQueryConfig,
  createOfflineMutationConfig,
} from '../../store/api/baseApi';

/**
 * Quick Start Guide:
 * 
 * 1. Initialize offline support in your app:
 * ```typescript
 * import { initializeOfflineSupport } from './services/offline';
 * 
 * await initializeOfflineSupport({
 *   enableAutoSync: true,
 *   syncInterval: 30000, // 30 seconds
 *   enableBackgroundSync: true,
 *   enableOptimisticUpdates: true,
 * });
 * ```
 * 
 * 2. Wrap your app with NetworkProvider:
 * ```typescript
 * import { NetworkProvider } from './services/offline';
 * 
 * <NetworkProvider>
 *   <YourApp />
 * </NetworkProvider>
 * ```
 * 
 * 3. Add offline indicator to your UI:
 * ```typescript
 * import { OfflineIndicator } from './services/offline';
 * 
 * <OfflineIndicator showDetails={true} position="top" />
 * ```
 * 
 * 4. Use hooks in components:
 * ```typescript
 * import { useNetwork, useSyncStatus } from './services/offline';
 * 
 * const { isOnline, networkQuality } = useNetwork();
 * const { isSyncing, forceSync } = useSyncStatus();
 * ```
 * 
 * 5. Queue operations when offline:
 * ```typescript
 * import { queueAutomationExecution } from './services/offline';
 * 
 * const operationId = await queueAutomationExecution(automation, variables);
 * ```
 */

export default {
  OfflineQueue,
  SyncManager,
  OfflineService,
  offlineQueue,
  syncManager,
  offlineService,
  initializeOfflineSupport,
};