/**
 * Store type definitions
 * 
 * This module provides type definitions that can be safely imported
 * without creating circular dependencies.
 */

// Lazy type definitions that avoid circular dependencies
export type RootState = {
  auth: AuthState;
  offline: import('./slices/offlineSlice').OfflineState;
  notifications: import('../types/notifications').NotificationState;
  automation: import('./slices/automationSlice').AutomationState;
  deployment: import('./slices/deploymentSlice').DeploymentState;
  scan: import('./slices/scanSlice').ScanState;
  ui: import('./slices/uiSlice').UIState;
  errors: ErrorState;
  // API slices
  automationApi: any;
  analyticsApi: any;
  dashboardApi: any;
  searchApi: any;
};

// AppDispatch type without circular dependency
export type AppDispatch = import('@reduxjs/toolkit').ThunkDispatch<RootState, any, import('@reduxjs/toolkit').AnyAction> & import('@reduxjs/toolkit').Dispatch<import('@reduxjs/toolkit').AnyAction>;

// Auth state shape for external services
export interface AuthState {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isRecovering: boolean;
  lastErrorTimestamp: number | null;
  consecutiveErrors: number;
  sessionValid: boolean;
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