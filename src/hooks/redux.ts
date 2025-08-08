/**
 * Redux Hooks - Type-safe hooks for Redux store
 */

import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store/types';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Helper hooks for common selectors
export const useAuth = () => useAppSelector((state) => state.auth);
export const useIsAuthenticated = () => useAppSelector((state) => state.auth.isAuthenticated);
export const useCurrentUser = () => useAppSelector((state) => state.auth.user);
export const useAuthLoading = () => useAppSelector((state) => state.auth.isLoading);
export const useAuthError = () => useAppSelector((state) => state.auth.error);

// UI state hooks
export const useUIState = () => useAppSelector((state) => state.ui);

// Offline state hooks
export const useOfflineState = () => useAppSelector((state) => state.offline);
export const useIsOffline = () => useAppSelector((state) => state.offline?.isOffline ?? false);

// Notification hooks
export const useNotifications = () => useAppSelector((state) => state.notifications);

// Automation hooks
export const useAutomations = () => useAppSelector((state) => state.automation);
export const useCurrentAutomation = () => useAppSelector((state) => state.automation?.currentAutomation);

// Deployment hooks
export const useDeployments = () => useAppSelector((state) => state.deployment);

// Scan hooks
export const useScanState = () => useAppSelector((state) => state.scan);