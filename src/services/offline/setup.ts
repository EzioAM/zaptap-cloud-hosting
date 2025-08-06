/**
 * Offline Support Setup and Integration Guide
 * 
 * This file provides setup instructions and integration examples for the offline support system.
 */

import { initializeOfflineSupport, OfflineServiceConfig } from './OfflineService';
import { logger } from '../analytics/AnalyticsService';
import { EventLogger } from '../../utils/EventLogger';

/**
 * Production configuration for offline support
 */
export const PRODUCTION_CONFIG: Partial<OfflineServiceConfig> = {
  enableAutoSync: true,
  syncInterval: 30000, // 30 seconds
  maxRetryAttempts: 3,
  enableBackgroundSync: true,
  enableOptimisticUpdates: true,
  batchSize: 10,
  maxConcurrentOperations: 3,
};

/**
 * Development configuration with more aggressive syncing
 */
export const DEVELOPMENT_CONFIG: Partial<OfflineServiceConfig> = {
  enableAutoSync: true,
  syncInterval: 10000, // 10 seconds for faster testing
  maxRetryAttempts: 5,
  enableBackgroundSync: true,
  enableOptimisticUpdates: true,
  batchSize: 5,
  maxConcurrentOperations: 2,
};

/**
 * Test configuration with disabled features
 */
export const TEST_CONFIG: Partial<OfflineServiceConfig> = {
  enableAutoSync: false,
  syncInterval: 0,
  maxRetryAttempts: 1,
  enableBackgroundSync: false,
  enableOptimisticUpdates: false,
  batchSize: 1,
  maxConcurrentOperations: 1,
};

/**
 * Initialize offline support with environment-appropriate configuration
 */
export const setupOfflineSupport = async (environment: 'production' | 'development' | 'test' = 'production'): Promise<void> => {
  let config: Partial<OfflineServiceConfig>;

  switch (environment) {
    case 'development':
      config = DEVELOPMENT_CONFIG;
      break;
    case 'test':
      config = TEST_CONFIG;
      break;
    default:
      config = PRODUCTION_CONFIG;
  }

  logger.info('Setting up offline support', { environment, config });
  
  try {
    await initializeOfflineSupport(config);
    logger.info('✅ Offline support setup completed');
  } catch (error) {
    logger.error('❌ Offline support setup failed', { error });
    throw error;
  }
};

/**
 * App.tsx Integration Example:
 * 
 * ```typescript
 * import React, { useEffect } from 'react';
 * import { NetworkProvider } from './services/offline';
 * import { setupOfflineSupport } from './services/offline/setup';
 * import { OfflineIndicator } from './services/offline';
 * 
 * export default function App() {
 *   useEffect(() => {
 *     const initializeApp = async () => {
 *       try {
 *         await setupOfflineSupport(__DEV__ ? 'development' : 'production');
 *       } catch (error) {
 *         EventLogger.error('setup', 'Failed to setup offline support:', error as Error);
 *         // App can continue without offline support
 *       }
 *     };
 * 
 *     initializeApp();
 *   }, []);
 * 
 *   return (
 *     <NetworkProvider>
 *       <OfflineIndicator showDetails={true} position="top" />
 *       <YourAppContent />
 *     </NetworkProvider>
 *   );
 * }
 * ```
 */

/**
 * Component Integration Examples:
 * 
 * 1. Automation Execution with Offline Support:
 * ```typescript
 * import { useNetwork, queueAutomationExecution } from './services/offline';
 * 
 * const AutomationButton = ({ automation }) => {
 *   const { isOnline } = useNetwork();
 * 
 *   const handleExecute = async () => {
 *     try {
 *       const operationId = await queueAutomationExecution(automation);
 *       
 *       if (isOnline) {
 *         // Will execute immediately
 *         showToast('Automation executed!');
 *       } else {
 *         // Will be queued for later
 *         showToast('Automation queued - will execute when online');
 *       }
 *     } catch (error) {
 *       showToast('Failed to execute automation');
 *     }
 *   };
 * 
 *   return (
 *     <Button onPress={handleExecute}>
 *       Execute {!isOnline && '(Offline)'}
 *     </Button>
 *   );
 * };
 * ```
 * 
 * 2. Share Creation with Offline Support:
 * ```typescript
 * import { useNetwork, queueShareCreation } from './services/offline';
 * 
 * const ShareButton = ({ automationId }) => {
 *   const { isOnline } = useNetwork();
 * 
 *   const handleShare = async () => {
 *     try {
 *       const shareData = { public: true, password: null };
 *       const operationId = await queueShareCreation(automationId, shareData);
 *       
 *       if (isOnline) {
 *         showToast('Share link created!');
 *         // Show share URL: https://www.zaptap.cloud/share/{publicId}
 *       } else {
 *         showToast('Share queued - will create when online');
 *       }
 *     } catch (error) {
 *       showToast('Failed to create share');
 *     }
 *   };
 * 
 *   return <Button onPress={handleShare}>Share</Button>;
 * };
 * ```
 * 
 * 3. Network Status Display:
 * ```typescript
 * import { useNetworkIndicator, useSyncStatus } from './services/offline';
 * 
 * const NetworkStatus = () => {
 *   const { quality, isOnline, connectionType } = useNetworkIndicator();
 *   const { isSyncing, syncProgress } = useSyncStatus();
 * 
 *   return (
 *     <View>
 *       <Text>Status: {isOnline ? 'Online' : 'Offline'}</Text>
 *       <Text>Quality: {quality}</Text>
 *       <Text>Connection: {connectionType}</Text>
 *       {isSyncing && (
 *         <Text>
 *           Syncing: {syncProgress.completed}/{syncProgress.total}
 *         </Text>
 *       )}
 *     </View>
 *   );
 * };
 * ```
 */

/**
 * RTK Query Integration Example:
 * 
 * ```typescript
 * import { createApi } from '@reduxjs/toolkit/query/react';
 * import { offlineApiConfig } from './services/offline';
 * 
 * export const automationApi = createApi({
 *   reducerPath: 'automationApi',
 *   ...offlineApiConfig,
 *   endpoints: (builder) => ({
 *     executeAutomation: builder.mutation({
 *       query: ({ automationId, variables }) => ({
 *         url: `automations/${automationId}/execute`,
 *         method: 'POST',
 *         body: { variables },
 *         offline: {
 *           queue: true,
 *           optimistic: true,
 *           priority: 'high',
 *         },
 *       }),
 *     }),
 *   }),
 * });
 * ```
 */

/**
 * Testing Offline Functionality:
 * 
 * 1. Simulate Network Loss:
 * ```typescript
 * // Turn on airplane mode or disconnect network
 * // Try to execute automations - they should queue
 * // Turn network back on - they should sync automatically
 * ```
 * 
 * 2. Test Offline Queue:
 * ```typescript
 * import { offlineService } from './services/offline';
 * 
 * // Get pending operations
 * const pending = offlineService.getPendingOperations();
 * 
 * // Get failed operations
 * const failed = await offlineService.getDeadLetterQueue();
 * 
 * // Retry failed operations
 * await offlineService.retryFailedOperations();
 * 
 * // Clear completed operations
 * await offlineService.clearCompletedOperations();
 * ```
 * 
 * 3. Monitor Sync Progress:
 * ```typescript
 * import { offlineService } from './services/offline';
 * 
 * offlineService.addEventListener('sync_progress', (event) => {
 *   EventLogger.debug('setup', 'Sync progress:', event.data);
 * });
 * 
 * offlineService.addEventListener('operation_completed', (event) => {
 *   EventLogger.debug('setup', 'Operation completed:', event.data);
 * });
 * ```
 */

export default setupOfflineSupport;