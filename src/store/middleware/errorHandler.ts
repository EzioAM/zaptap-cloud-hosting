import { Middleware, isRejectedWithValue, SerializedError } from '@reduxjs/toolkit';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { EventLogger } from '../../utils/EventLogger';
import { errorRecoveryManager } from '../../utils/errorRecovery';

/**
 * Enhanced error types for better categorization
 */
export interface EnhancedApiError extends FetchBaseQueryError {
  category?: 'network' | 'auth' | 'validation' | 'server' | 'client' | 'unknown';
  recoverable?: boolean;
  retryAfter?: number;
  userMessage?: string;
}

/**
 * Categorize errors for better handling
 */
function categorizeError(error: FetchBaseQueryError): EnhancedApiError['category'] {
  if (typeof error.status === 'number') {
    if (error.status >= 400 && error.status < 500) {
      if (error.status === 401 || error.status === 403) return 'auth';
      if (error.status === 422 || error.status === 400) return 'validation';
      return 'client';
    }
    if (error.status >= 500) return 'server';
  }
  
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
    return 'network';
  }
  
  return 'unknown';
}

/**
 * Determine if error is recoverable through retry
 */
function isRecoverable(error: FetchBaseQueryError, category: EnhancedApiError['category']): boolean {
  // Network errors are usually recoverable
  if (category === 'network') return true;
  
  // Server errors might be recoverable
  if (category === 'server') return true;
  
  // 429 Too Many Requests is recoverable
  if (error.status === 429) return true;
  
  // Auth errors might be recoverable if we can refresh token
  if (category === 'auth' && error.status === 401) return true;
  
  // Client and validation errors are usually not recoverable through retry
  return false;
}

/**
 * Generate user-friendly error messages
 */
function getUserMessage(error: FetchBaseQueryError, category: EnhancedApiError['category']): string {
  switch (category) {
    case 'network':
      return 'Network connection error. Please check your internet connection and try again.';
    case 'auth':
      if (error.status === 401) return 'Your session has expired. Please sign in again.';
      if (error.status === 403) return 'You don\'t have permission to perform this action.';
      return 'Authentication error. Please sign in again.';
    case 'validation':
      return 'The information provided is invalid. Please check your input and try again.';
    case 'server':
      return 'Server error. We\'re working to fix this. Please try again later.';
    case 'client':
      if (error.status === 404) return 'The requested resource was not found.';
      if (error.status === 429) return 'Too many requests. Please wait a moment and try again.';
      return 'Request error. Please try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Extract retry delay from error response
 */
function getRetryAfter(error: FetchBaseQueryError): number | undefined {
  if (error.status === 429 && error.data && typeof error.data === 'object') {
    const data = error.data as any;
    if (data.retryAfter) return data.retryAfter * 1000; // Convert to ms
    if (data['retry-after']) return parseInt(data['retry-after']) * 1000;
  }
  return undefined;
}

/**
 * Enhanced Redux error handling middleware
 * 
 * This middleware:
 * 1. Catches all RTK Query errors
 * 2. Categorizes errors for better handling
 * 3. Logs structured error information
 * 4. Determines recovery strategies
 * 5. Provides user-friendly error messages
 */
export const errorHandlingMiddleware: Middleware = (storeApi) => (next) => (action) => {
  // Handle rejected RTK Query actions
  if (isRejectedWithValue(action)) {
    const error = action.payload as FetchBaseQueryError;
    const category = categorizeError(error);
    const recoverable = isRecoverable(error, category);
    const userMessage = getUserMessage(error, category);
    const retryAfter = getRetryAfter(error);

    // Create enhanced error object
    const enhancedError: EnhancedApiError = {
      ...error,
      category,
      recoverable,
      retryAfter,
      userMessage,
    };

    // Log the error with context
    try {
      EventLogger.error(
        'Redux',
        `API ${category} error in ${action.type}`,
        new Error(userMessage),
        {
          action: action.type,
          error: enhancedError,
          category,
          recoverable,
          retryAfter,
          status: error.status,
          endpoint: action.meta?.baseQueryMeta?.request?.url,
          method: action.meta?.baseQueryMeta?.request?.method,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (logError) {
      // Fallback to console if EventLogger is not ready
      console.error(`Redux API ${category} error in ${action.type}:`, enhancedError);
    }

    // Register recovery strategy for this error type if recoverable
    if (recoverable && !errorRecoveryManager['strategies']?.find?.(s => s.name === `redux_${category}_recovery`)) {
      errorRecoveryManager.addRecoveryStrategy({
        name: `redux_${category}_recovery`,
        canRecover: (err: Error) => {
          return err.message.includes(category || '');
        },
        recover: async (err: Error) => {
          try {
            EventLogger.info('Redux', `Attempting recovery for ${category} error`);
          } catch (logError) {
            console.info(`Attempting recovery for ${category} error`);
          }
          
          switch (category) {
            case 'network':
              // Wait a bit for network to recover
              await new Promise(resolve => setTimeout(resolve, 2000));
              return navigator?.onLine !== false;
              
            case 'auth':
              // Try to refresh session
              try {
                const { supabase } = await import('../../services/supabase/client');
                const { error: refreshError } = await supabase.auth.refreshSession();
                return !refreshError;
              } catch {
                return false;
              }
              
            case 'server':
              // Wait longer for server recovery
              await new Promise(resolve => setTimeout(resolve, 5000));
              return true;
              
            default:
              return false;
          }
        },
        priority: category === 'network' ? 10 : category === 'auth' ? 8 : 5,
      });
    }

    // Dispatch custom error action for UI handling
    storeApi.dispatch({
      type: 'api/errorOccurred',
      payload: {
        error: enhancedError,
        originalAction: action.type,
        timestamp: Date.now(),
      },
    });

    // For development, also log to console with more details
    if (__DEV__) {
      console.group(`🚨 Redux API Error: ${action.type}`);
      console.error('Error Details:', enhancedError);
      console.error('Original Action:', action);
      console.error('Store State:', storeApi.getState());
      console.groupEnd();
    }
  }

  // Handle other types of errors (like serialized errors)
  if (action.error && !action.payload) {
    const error = action.error as SerializedError;
    
    try {
      EventLogger.error(
        'Redux',
        `Redux action error in ${action.type}`,
        new Error(error.message || 'Unknown Redux error'),
        {
          action: action.type,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
            code: error.code,
          },
          timestamp: new Date().toISOString(),
        }
      );
    } catch (logError) {
      // Fallback to console if EventLogger is not ready
      console.error(`Redux action error in ${action.type}:`, error);
    }

    // Dispatch custom error action
    storeApi.dispatch({
      type: 'redux/errorOccurred',
      payload: {
        error,
        originalAction: action.type,
        timestamp: Date.now(),
      },
    });
  }

  return next(action);
};

/**
 * Action creators for error handling
 */
export const errorActions = {
  clearApiErrors: () => ({
    type: 'api/clearErrors',
  }),
  
  clearReduxErrors: () => ({
    type: 'redux/clearErrors', 
  }),
  
  clearAllErrors: () => ({
    type: 'errors/clearAll',
  }),
} as const;

/**
 * Error state interface for components
 */
export interface ErrorState {
  apiErrors: Array<{
    error: EnhancedApiError;
    originalAction: string;
    timestamp: number;
  }>;
  reduxErrors: Array<{
    error: SerializedError;
    originalAction: string;
    timestamp: number;
  }>;
  lastError?: {
    message: string;
    timestamp: number;
    category?: string;
  };
}

/**
 * Initial error state
 */
export const initialErrorState: ErrorState = {
  apiErrors: [],
  reduxErrors: [],
};

/**
 * Error reducer for managing error state
 */
export const errorReducer = (state = initialErrorState, action: any): ErrorState => {
  switch (action.type) {
    case 'api/errorOccurred':
      return {
        ...state,
        apiErrors: [
          ...state.apiErrors.slice(-9), // Keep last 10 errors
          action.payload,
        ],
        lastError: {
          message: action.payload.error.userMessage,
          timestamp: action.payload.timestamp,
          category: action.payload.error.category,
        },
      };
      
    case 'redux/errorOccurred':
      return {
        ...state,
        reduxErrors: [
          ...state.reduxErrors.slice(-9), // Keep last 10 errors
          action.payload,
        ],
        lastError: {
          message: action.payload.error.message || 'Redux error occurred',
          timestamp: action.payload.timestamp,
        },
      };
      
    case 'api/clearErrors':
      return {
        ...state,
        apiErrors: [],
      };
      
    case 'redux/clearErrors':
      return {
        ...state,
        reduxErrors: [],
      };
      
    case 'errors/clearAll':
      return initialErrorState;
      
    default:
      return state;
  }
};