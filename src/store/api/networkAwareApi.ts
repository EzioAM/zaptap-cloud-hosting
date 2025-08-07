/**
 * Network-aware API utilities
 * 
 * This module provides utilities to prevent API calls when offline
 * and handle network errors gracefully.
 */

import NetInfo from '@react-native-community/netinfo';
import { ApiError } from './baseApi';
import { EventLogger } from '../../utils/EventLogger';
// Cache network status to avoid repeated checks - start optimistically online
let isOnline = true;
let lastNetworkCheck = Date.now();
const NETWORK_CHECK_INTERVAL = 5000; // 5 seconds

// Initialize network listener with error handling
try {
  NetInfo.addEventListener(state => {
    isOnline = state.isConnected ?? true;
    lastNetworkCheck = Date.now();
  });
} catch (error) {
  // NetInfo might not be available in all environments (e.g., web)
  EventLogger.debug('NetworkAwareAPI', 'NetInfo not available, assuming online status');
}

/**
 * Check if device is online (with caching)
 */
export const checkNetworkStatus = async (): Promise<boolean> => {
  // Use cached value if recent
  if (Date.now() - lastNetworkCheck < NETWORK_CHECK_INTERVAL) {
    return isOnline;
  }

  try {
    const state = await NetInfo.fetch();
    isOnline = state.isConnected ?? true;
    lastNetworkCheck = Date.now();
    return isOnline;
  } catch (error) {
    EventLogger.warn('NetworkAwareAPI', 'Failed to check network status', error);
    return isOnline; // Return last known state
  }
};

/**
 * Network-aware query wrapper that prevents API calls when offline
 */
export const networkAwareQuery = async <T>(
  queryFn: () => Promise<T>,
  options?: {
    skipNetworkCheck?: boolean;
    offlineData?: T;
  }
): Promise<T> => {
  const { skipNetworkCheck = false, offlineData } = options || {};

  // Skip network check if requested (for critical operations)
  if (!skipNetworkCheck) {
    const online = await checkNetworkStatus();
    
    if (!online) {
      if (offlineData !== undefined) {
        return offlineData;
      }
      
      throw {
        status: 'OFFLINE',
        message: 'No internet connection. Please check your network and try again.',
        code: 'NETWORK_OFFLINE',
      } as ApiError;
    }
  }

  try {
    return await queryFn();
  } catch (error: any) {
    // Check if error is due to network failure
    if (error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch') ||
        error?.code === 'NETWORK_ERROR') {
      
      // Update network status
      isOnline = false;
      lastNetworkCheck = Date.now();
      
      throw {
        status: 'OFFLINE',
        message: 'Connection lost. Please check your internet connection.',
        code: 'NETWORK_ERROR',
      } as ApiError;
    }
    
    // Re-throw other errors
    throw error;
  }
};

/**
 * Debounced error logger to prevent spam
 */
const errorLogCache = new Map<string, number>();
const ERROR_LOG_INTERVAL = 60000; // 1 minute

export const logApiError = (error: any, context: string) => {
  const errorKey = `${context}:${error?.message || error?.code || 'unknown'}`;
  const lastLogged = errorLogCache.get(errorKey) || 0;
  
  if (Date.now() - lastLogged > ERROR_LOG_INTERVAL) {
    EventLogger.error('NetworkAwareAPI', `[${context}] API Error`, error);
    errorLogCache.set(errorKey, Date.now());
  }
};

/**
 * Clear error log cache (useful for testing)
 */
export const clearErrorLogCache = () => {
  errorLogCache.clear();
};