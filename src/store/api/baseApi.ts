/**
 * Unified Base API Configuration
 * 
 * This module provides a standardized base query configuration for all RTK Query APIs.
 * It handles authentication, error handling, retries, and timeouts consistently.
 */

import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { supabase, ensureValidSession } from '../../services/supabase/client';
import Constants from 'expo-constants';
import { EventLogger } from '../../utils/EventLogger';

// Import types without circular dependency
import type { RootState, AuthState } from '../types';

// Function to safely get auth state from store without circular dependency
let getAuthState: (() => { accessToken?: string; isAuthenticated?: boolean } | null) | null = null;

export const setAuthStateProvider = (provider: () => { accessToken?: string; isAuthenticated?: boolean } | null) => {
  getAuthState = provider;
};

// Import offline services with error handling for cases where they might not be ready
let offlineQueue: any = null;
let syncManager: any = null;
let logger: any = null;

// Lazy load offline services to avoid initialization order issues
const getOfflineServices = async () => {
  if (!offlineQueue || !syncManager || !logger) {
    try {
      const [offlineQueueModule, syncManagerModule, loggerModule] = await Promise.all([
        import('../../services/offline/OfflineQueue'),
        import('../../services/offline/SyncManager'),
        import('../../services/analytics/AnalyticsService')
      ]);
      offlineQueue = offlineQueueModule.offlineQueue;
      syncManager = syncManagerModule.syncManager;
      logger = loggerModule.logger;
    } catch (error) {
      // Services might not be available in all environments
      EventLogger.debug('BaseAPI', 'Offline services not available, continuing without them');
    }
  }
  return { offlineQueue, syncManager, logger };
};

// Environment configuration with validation
const getEnvConfig = () => {
  const config = {
    supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl || process.env.SUPABASE_URL,
    supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey || process.env.SUPABASE_ANON_KEY,
  };

  // Validate configuration
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    EventLogger.error('BaseAPI', 'Missing Supabase configuration. Please check your environment variables.');
    throw new Error('Missing required Supabase configuration');
  }

  return config;
};

const envConfig = getEnvConfig();

/**
 * Standard API error interface for consistent error handling
 */
export interface ApiError {
  status: number | string;
  message: string;
  code?: string;
  details?: any;
}

/**
 * Network error types that should trigger offline behavior
 */
const isNetworkError = (error: any): boolean => {
  return (
    error?.message === 'Failed to fetch' ||
    error?.name === 'NetworkError' ||
    error?.message?.includes('Network request failed') ||
    error?.name === 'AuthRetryableFetchError' ||
    error?.message?.includes('timeout') ||
    error?.name === 'TimeoutError' ||
    error?.status === 0 ||
    !navigator?.onLine
  );
};

/**
 * Server error types that should be retried
 */
const isRetryableServerError = (status: number): boolean => {
  return status >= 500 || status === 429; // Server errors and rate limiting
};

/**
 * Check if operation should be queued for offline processing
 */
const shouldQueueOperation = (args: FetchArgs, error: any): boolean => {
  // Only queue mutation operations (POST, PUT, PATCH, DELETE) when offline
  if (args.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(args.method)) {
    return isNetworkError(error) || error?.status === 'OFFLINE';
  }
  return false;
};

/**
 * Queue operation for offline processing
 */
const queueOfflineOperation = async (args: FetchArgs, apiContext: any): Promise<void> => {
  try {
    const { offlineQueue, logger } = await getOfflineServices();
    
    if (!offlineQueue) {
      EventLogger.debug('BaseAPI', 'Offline queue not available, skipping operation queue');
      return;
    }
    
    const operationType = getOperationType(args);
    const priority = getOperationPriority(args);
    
    await offlineQueue.enqueue({
      type: operationType,
      payload: {
        url: args.url,
        method: args.method,
        body: args.body,
        headers: args.headers,
      },
      priority,
      maxRetries: 3,
    });
    
    if (logger) {
      logger.info('BaseAPI: Operation queued for offline processing', {
        url: args.url,
        method: args.method,
        type: operationType,
        priority,
      });
    } else {
      EventLogger.debug('BaseAPI', 'Operation queued for offline processing', {
        url: args.url,
        method: args.method,
        type: operationType,
        priority,
      });
    }
  } catch (queueError) {
    EventLogger.warn('BaseAPI', 'Failed to queue operation', {
      url: args.url,
      method: args.method,
      error: queueError,
    });
  }
};

/**
 * Determine operation type from request
 */
const getOperationType = (args: FetchArgs): string => {
  const url = typeof args.url === 'string' ? args.url : '';
  const method = args.method || 'GET';
  
  // Map URL patterns to operation types
  if (url.includes('automations')) {
    return method === 'POST' ? 'automation_create' : 'automation_update';
  }
  if (url.includes('deployments')) {
    return 'deployment_create';
  }
  if (url.includes('executions')) {
    return 'automation_execute';
  }
  if (url.includes('shares')) {
    return 'share_create';
  }
  
  // Default to generic operation type
  return `api_${method.toLowerCase()}`;
};

/**
 * Determine operation priority
 */
const getOperationPriority = (args: FetchArgs): 'high' | 'normal' | 'low' => {
  const url = typeof args.url === 'string' ? args.url : '';
  
  // High priority for user actions and executions
  if (url.includes('executions') || url.includes('shares')) {
    return 'high';
  }
  
  // Normal priority for CRUD operations
  if (args.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(args.method)) {
    return 'normal';
  }
  
  // Low priority for everything else
  return 'low';
};

/**
 * Create optimistic update for immediate UI feedback
 */
const createOptimisticUpdate = (args: FetchArgs): any => {
  if (!args.body) return null;
  
  try {
    const body = typeof args.body === 'string' ? JSON.parse(args.body) : args.body;
    
    // Return optimistic data based on operation
    switch (args.method) {
      case 'POST':
        return {
          ...body,
          id: `temp_${Date.now()}`,
          created_at: new Date().toISOString(),
          status: 'pending',
        };
      case 'PUT':
      case 'PATCH':
        return {
          ...body,
          updated_at: new Date().toISOString(),
          status: 'pending',
        };
      default:
        return null;
    }
  } catch {
    return null;
  }
};

/**
 * Transforms errors into a consistent format
 */
const transformError = (error: any): ApiError => {
  // Handle Supabase errors
  if (error?.code && error?.message) {
    return {
      status: error.code,
      message: error.message,
      code: error.code,
      details: error.details || error.hint,
    };
  }

  // Handle HTTP errors
  if (error?.status && error?.data) {
    return {
      status: error.status,
      message: error.data?.message || 'Request failed',
      details: error.data,
    };
  }

  // Handle network errors
  if (error?.message === 'Failed to fetch' || error?.name === 'NetworkError') {
    return {
      status: 'NETWORK_ERROR',
      message: 'Network connection failed. Please check your internet connection.',
    };
  }

  // Handle timeout errors
  if (error?.message?.includes('timeout') || error?.name === 'TimeoutError') {
    return {
      status: 'TIMEOUT_ERROR',
      message: 'Request timed out. Please try again.',
    };
  }

  // Fallback for unknown errors
  return {
    status: 'UNKNOWN_ERROR',
    message: error?.message || 'An unexpected error occurred',
    details: error,
  };
};

/**
 * Base query configuration for Supabase REST API
 */
const createSupabaseBaseQuery = (): BaseQueryFn<FetchArgs, unknown, ApiError> => {
  const baseQuery = fetchBaseQuery({
    baseUrl: `${envConfig.supabaseUrl}/rest/v1/`,
    timeout: 15000, // 15 second timeout
    prepareHeaders: async (headers, { getState }) => {
      try {
        // Set required Supabase headers
        headers.set('apikey', envConfig.supabaseAnonKey);
        headers.set('Content-Type', 'application/json');
        headers.set('Prefer', 'return=representation');

        // Add authentication if available (but don't require it)
        try {
          // Try using the auth state provider first to avoid circular dependency
          if (getAuthState) {
            const authState = getAuthState();
            if (authState?.accessToken && authState?.isAuthenticated) {
              headers.set('Authorization', `Bearer ${authState.accessToken}`);
            }
          } else {
            // Fallback to getState if provider not set (mainly for backwards compatibility)
            const state = getState() as RootState;
            const accessToken = state?.auth?.accessToken;
            
            if (accessToken && state?.auth?.isAuthenticated) {
              headers.set('Authorization', `Bearer ${accessToken}`);
            }
          }
        } catch (error) {
          // If we can't access auth state, continue without authentication
          // This allows public endpoints to work even if Redux hasn't initialized
          EventLogger.debug('BaseAPI', 'Auth state not available, proceeding without authentication');
        }

        return headers;
      } catch (error) {
        EventLogger.warn('BaseAPI', 'Failed to prepare headers', error);
        // Ensure minimum required headers
        headers.set('apikey', envConfig.supabaseAnonKey);
        headers.set('Content-Type', 'application/json');
        return headers;
      }
    },
  });

  // Enhanced base query with retry logic, offline queue, and optimistic updates
  const enhancedBaseQuery: BaseQueryFn<FetchArgs, unknown, ApiError> = async (
    args,
    api,
    extraOptions
  ) => {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second base delay
    
    // Get network info safely - initialize services if needed
    let networkInfo = { isConnected: true, isInternetReachable: true }; // Default to online
    try {
      const { syncManager: sm } = await getOfflineServices();
      if (sm && typeof sm.getNetworkInfo === 'function') {
        networkInfo = sm.getNetworkInfo() || networkInfo;
      }
    } catch (error) {
      // If offline services aren't available, continue with default online state
      EventLogger.debug('BaseAPI', 'Offline services not available, assuming online connection');
    }
    
    // Only check offline status if we definitely know we're offline
    const isActuallyOffline = networkInfo && (networkInfo.isConnected === false || networkInfo.isInternetReachable === false);
    
    if (isActuallyOffline) {
      if (shouldQueueOperation(args, { status: 'NETWORK_ERROR', message: 'Offline' })) {
        try {
          await queueOfflineOperation(args, api);
          
          // Return optimistic update for immediate UI feedback
          const optimisticData = createOptimisticUpdate(args);
          if (optimisticData) {
            const { logger: lg } = await getOfflineServices();
            if (lg) {
              lg.info('BaseAPI: Returning optimistic update for offline operation', {
                url: args.url,
                method: args.method,
              });
            }
            return { data: optimisticData };
          }
        } catch (queueError) {
          // If queueing fails, continue with the request anyway
          EventLogger.debug('BaseAPI', 'Failed to queue operation, continuing with request', queueError);
        }
        
        return {
          error: {
            status: 'OFFLINE',
            message: 'Operation queued for when connection is restored',
            code: 'QUEUED_OFFLINE',
          }
        };
      }
      
      return {
        error: {
          status: 'OFFLINE',
          message: 'No internet connection available',
          code: 'NETWORK_OFFLINE',
        }
      };
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await baseQuery(args, api, extraOptions);

        // Handle successful responses
        if (!result.error) {
          return result;
        }

        const error = result.error as FetchBaseQueryError;

        // Handle authentication errors only if we were actually trying to authenticate
        if (error.status === 401 || 
            (error.status === 400 && error.data && 
             (error.data as any)?.message?.includes('JWT'))) {
          
          // Check if this was a request that should have authentication
          let wasAuthenticated = false;
          try {
            if (getAuthState) {
              const authState = getAuthState();
              wasAuthenticated = Boolean(authState?.isAuthenticated && authState?.accessToken);
            } else {
              const state = api.getState() as RootState;
              wasAuthenticated = Boolean(state?.auth?.isAuthenticated && state?.auth?.accessToken);
            }
          } catch (error) {
            EventLogger.debug('BaseAPI', 'Could not check authentication state', error);
          }
          
          if (wasAuthenticated) {
            console.warn(`Auth error on attempt ${attempt + 1}, trying to refresh token...`);
            
            try {
              // Attempt to refresh session
              const newSession = await ensureValidSession();
              
              if (newSession && newSession.access_token) {
                // Token will be updated by auth listener, retry the request
                const retryResult = await baseQuery(args, api, extraOptions);
                if (!retryResult.error) {
                  return retryResult;
                }
              }
            } catch (refreshError: any) {
              // Only log non-network errors as errors
              if (refreshError?.message?.includes('Network request failed') || 
                  refreshError?.name === 'NetworkError' ||
                  refreshError?.name === 'AuthRetryableFetchError') {
                console.debug('Network unavailable during token refresh');
              } else {
                console.error('Failed to refresh session:', refreshError);
              }
            }
          } else {
            // If we weren't authenticated, this might be expected for a public endpoint
            console.debug('Auth error on public endpoint access, this may be expected');
          }
        }

        // Handle network errors - queue operation if applicable
        if (isNetworkError(error)) {
          if (shouldQueueOperation(args, error)) {
            await queueOfflineOperation(args, api);
            
            // Return optimistic update for immediate UI feedback
            const optimisticData = createOptimisticUpdate(args);
            if (optimisticData) {
              try {
                const { logger: lg } = await getOfflineServices();
                if (lg) {
                  lg.info('BaseAPI: Returning optimistic update for network error', {
                    url: args.url,
                    method: args.method,
                  });
                }
              } catch {}
              return { data: optimisticData };
            }
            
            return {
              error: {
                status: 'QUEUED',
                message: 'Operation queued for retry when connection is restored',
                code: 'NETWORK_ERROR_QUEUED',
              }
            };
          }
          
          // For read operations, just return network error
          return { error: transformError(error) };
        }

        // Don't retry client errors (except 401 handled above)
        if (typeof error.status === 'number' && 
            error.status >= 400 && 
            error.status < 500 && 
            error.status !== 401) {
          
          // For validation errors on mutations, still queue if configured
          if (error.status === 422 && shouldQueueOperation(args, error)) {
            await queueOfflineOperation(args, api);
            return {
              error: {
                ...transformError(error),
                code: 'VALIDATION_ERROR_QUEUED',
              }
            };
          }
          
          return { error: transformError(error) };
        }

        // Retry server errors and rate limiting
        if (typeof error.status === 'number' && isRetryableServerError(error.status)) {
          if (attempt < maxRetries - 1) {
            const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
            try {
              const { logger: lg } = await getOfflineServices();
              if (lg) {
                lg.warn('BaseAPI: Retrying server error', {
                  url: args.url,
                  status: error.status,
                  attempt: attempt + 1,
                  maxRetries,
                  delay,
                });
              } else {
                console.warn('BaseAPI: Retrying server error', {
                  url: args.url,
                  status: error.status,
                  attempt: attempt + 1,
                  maxRetries,
                  delay,
                });
              }
            } catch {}
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // Final attempt failed - queue if applicable
          if (shouldQueueOperation(args, error)) {
            await queueOfflineOperation(args, api);
            return {
              error: {
                ...transformError(error),
                code: 'SERVER_ERROR_QUEUED',
              }
            };
          }
        }

        // Final attempt failed
        return { error: transformError(error) };
      } catch (unexpectedError: any) {
        try {
          const { logger: lg } = await getOfflineServices();
          if (lg) {
            lg.warn('BaseAPI: Unexpected error in request', {
              url: args.url,
              method: args.method,
              attempt: attempt + 1,
              error: unexpectedError?.message,
            });
          } else {
            console.warn('BaseAPI: Unexpected error in request', {
              url: args.url,
              method: args.method,
              attempt: attempt + 1,
              error: unexpectedError?.message,
            });
          }
        } catch {}
        
        // Handle network errors
        if (isNetworkError(unexpectedError)) {
          if (shouldQueueOperation(args, unexpectedError)) {
            await queueOfflineOperation(args, api);
            
            const optimisticData = createOptimisticUpdate(args);
            if (optimisticData) {
              return { data: optimisticData };
            }
            
            return {
              error: {
                status: 'QUEUED',
                message: 'Operation queued for retry when connection is restored',
                code: 'UNEXPECTED_ERROR_QUEUED',
              }
            };
          }
        }
        
        if (attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return { error: transformError(unexpectedError) };
      }
    }

    // This should never be reached, but TypeScript requires it
    return { error: transformError(new Error('Max retries exceeded')) };
  };

  return enhancedBaseQuery;
};

/**
 * Base query configuration for Supabase RPC functions
 */
const createSupabaseRpcQuery = (): BaseQueryFn<
  { functionName: string; params?: any },
  unknown,
  ApiError
> => {
  return async ({ functionName, params = {} }, api) => {
    try {
      // Ensure we have a valid session for RPC calls
      const session = await ensureValidSession();
      
      const { data, error } = await supabase
        .rpc(functionName, params);

      if (error) {
        // Only log non-network errors as errors
        if (error?.message?.includes('Network request failed') || 
            error?.name === 'NetworkError' ||
            error?.name === 'AuthRetryableFetchError') {
          console.debug(`RPC function ${functionName} - network unavailable`);
        } else {
          console.error(`RPC function ${functionName} failed:`, error);
        }
        return { error: transformError(error) };
      }

      return { data };
    } catch (error: any) {
      // Only log non-network errors as errors
      if (error?.message?.includes('Network request failed') || 
          error?.name === 'NetworkError' ||
          error?.name === 'AuthRetryableFetchError') {
        console.debug(`RPC function ${functionName} - network unavailable`);
      } else {
        console.error(`RPC function ${functionName} failed:`, error);
      }
      return { error: transformError(error) };
    }
  };
};

/**
 * Standard tag types for cache invalidation
 */
export const standardTagTypes = [
  'Automation',
  'User',
  'Execution',
  'Analytics',
  'Deployment',
] as const;

/**
 * Helper function to create standard cache tags
 */
export const createCacheTags = (
  type: typeof standardTagTypes[number],
  id?: string | number
) => {
  if (id) {
    return [{ type, id }, { type, id: 'LIST' }];
  }
  return [{ type, id: 'LIST' }];
};

/**
 * Standard API configuration with offline support
 */
export const baseApiConfig = {
  baseQuery: createSupabaseBaseQuery(),
  tagTypes: standardTagTypes,
  keepUnusedDataFor: 300, // 5 minutes (longer for offline scenarios)
  refetchOnMountOrArgChange: 30, // 30 seconds
  refetchOnFocus: false, // Disable automatic refetch on focus
  refetchOnReconnect: true, // Automatically refetch when reconnecting
};

/**
 * Offline-aware query configuration
 */
export const offlineApiConfig = {
  ...baseApiConfig,
  keepUnusedDataFor: 900, // 15 minutes for offline scenarios
  refetchOnReconnect: 'always' as const, // Always refetch on reconnect
};

/**
 * RPC API configuration for direct function calls
 */
export const rpcApiConfig = {
  baseQuery: createSupabaseRpcQuery(),
  tagTypes: standardTagTypes,
  keepUnusedDataFor: 60,
  refetchOnMountOrArgChange: 30,
  refetchOnFocus: false,
  refetchOnReconnect: true,
};

/**
 * Helper function to create consistent query configurations with offline support
 */
export const createQueryConfig = <T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    params?: Record<string, any>;
    body?: any;
    select?: string;
    order?: string;
    limit?: number;
    offline?: {
      queue?: boolean;
      optimistic?: boolean;
      priority?: 'high' | 'normal' | 'low';
    };
  } = {}
): FetchArgs & { offline?: any } => {
  const { method = 'GET', params = {}, body, select, order, limit, offline } = options;
  
  // Build query parameters for GET requests
  const queryParams = new URLSearchParams();
  
  if (select) queryParams.set('select', select);
  if (order) queryParams.set('order', order);
  if (limit) queryParams.set('limit', limit.toString());
  
  // Add custom parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.set(key, value.toString());
    }
  });

  const queryString = queryParams.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  return {
    url,
    method,
    body: method !== 'GET' ? body : undefined,
    offline,
  };
};

/**
 * Helper to create offline-ready mutation config
 */
export const createOfflineMutationConfig = (
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  options: {
    body?: any;
    priority?: 'high' | 'normal' | 'low';
    optimistic?: boolean;
  } = {}
) => {
  return createQueryConfig(endpoint, {
    method,
    body: options.body,
    offline: {
      queue: true,
      optimistic: options.optimistic ?? true,
      priority: options.priority ?? 'normal',
    },
  });
};

// Export processors for sync manager integration
export { createOptimisticUpdate, getOperationType, getOperationPriority };

export default baseApiConfig;