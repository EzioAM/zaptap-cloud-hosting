/**
 * Unified Base API Configuration
 * 
 * This module provides a standardized base query configuration for all RTK Query APIs.
 * It handles authentication, error handling, retries, and timeouts consistently.
 */

import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { supabase, ensureValidSession } from '../../services/supabase/client';
import Constants from 'expo-constants';
import { RootState } from '../index';

// Environment configuration with validation
const getEnvConfig = () => {
  const config = {
    supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl || process.env.SUPABASE_URL,
    supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey || process.env.SUPABASE_ANON_KEY,
  };

  // Validate configuration
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration. Please check your environment variables.');
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

        // Add authentication if available
        const state = getState() as RootState;
        const accessToken = state.auth?.accessToken;
        
        if (accessToken) {
          headers.set('Authorization', `Bearer ${accessToken}`);
        }

        return headers;
      } catch (error) {
        console.warn('Failed to prepare headers:', error);
        // Ensure minimum required headers
        headers.set('apikey', envConfig.supabaseAnonKey);
        headers.set('Content-Type', 'application/json');
        return headers;
      }
    },
  });

  // Enhanced base query with retry logic and error handling
  const enhancedBaseQuery: BaseQueryFn<FetchArgs, unknown, ApiError> = async (
    args,
    api,
    extraOptions
  ) => {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second base delay

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await baseQuery(args, api, extraOptions);

        // Handle successful responses
        if (!result.error) {
          return result;
        }

        const error = result.error as FetchBaseQueryError;

        // Handle authentication errors
        if (error.status === 401 || 
            (error.status === 400 && error.data && 
             (error.data as any)?.message?.includes('JWT'))) {
          
          console.warn(`🔄 Auth error on attempt ${attempt + 1}, trying to refresh token...`);
          
          try {
            // Attempt to refresh session
            const newSession = await ensureValidSession();
            
            if (newSession && newSession.access_token) {
              // Update auth state and retry request
              const state = api.getState() as RootState;
              if (state.auth) {
                // Token will be updated by auth listener, retry the request
                const retryResult = await baseQuery(args, api, extraOptions);
                if (!retryResult.error) {
                  return retryResult;
                }
              }
            }
          } catch (refreshError) {
            console.error('Failed to refresh session:', refreshError);
          }
        }

        // Don't retry certain errors
        if (error.status === 403 || // Forbidden
            error.status === 404 || // Not found
            error.status === 422 || // Validation error
            (error.status >= 400 && error.status < 500 && error.status !== 401)) {
          return { error: transformError(error) };
        }

        // Retry network and server errors
        if (attempt < maxRetries - 1) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.warn(`⏳ Retrying request in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Final attempt failed
        return { error: transformError(error) };
      } catch (unexpectedError) {
        console.error('Unexpected error in base query:', unexpectedError);
        
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
        console.error(`RPC function ${functionName} failed:`, error);
        return { error: transformError(error) };
      }

      return { data };
    } catch (error) {
      console.error(`RPC function ${functionName} failed:`, error);
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
 * Standard API configuration
 */
export const baseApiConfig = {
  baseQuery: createSupabaseBaseQuery(),
  tagTypes: standardTagTypes,
  keepUnusedDataFor: 60, // 1 minute
  refetchOnMountOrArgChange: 30, // 30 seconds
  refetchOnFocus: false, // Disable automatic refetch on focus
  refetchOnReconnect: true,
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
 * Helper function to create consistent query configurations
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
  } = {}
): FetchArgs => {
  const { method = 'GET', params = {}, body, select, order, limit } = options;
  
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
  };
};

export default baseApiConfig;