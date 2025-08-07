/**
 * Store type definitions
 * 
 * This module provides type definitions that can be safely imported
 * without creating circular dependencies.
 */

// Re-export types from store without importing the store itself
export type RootState = any; // Will be properly typed when store is fully initialized
export type AppDispatch = any; // Will be properly typed when store is fully initialized

// Auth state shape for external services
export interface AuthState {
  accessToken?: string;
  isAuthenticated?: boolean;
  user?: any;
  isLoading?: boolean;
  error?: string | null;
}

// Network state shape
export interface NetworkState {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean | null;
}

// Error state shape
export interface ErrorState {
  apiErrors: Array<{
    error: any;
    originalAction: string;
    timestamp: number;
  }>;
  reduxErrors: Array<{
    error: any;
    originalAction: string;
    timestamp: number;
  }>;
  lastError?: {
    message: string;
    timestamp: number;
    category?: string;
  };
}