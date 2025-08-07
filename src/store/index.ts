import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { errorHandlingMiddleware, errorReducer, initialErrorState } from './middleware/errorHandler';
import { circularReferenceMiddleware } from './middleware/circularReferenceMiddleware';
import { EventLogger } from '../utils/EventLogger';

// Lazy load heavy dependencies to improve store creation time
let storeInstance: ReturnType<typeof configureStore> | null = null;
let persistorInstance: any = null;

// Create store factory function for lazy initialization
export const createLazyStore = async () => {
  if (storeInstance) {
    return { store: storeInstance, persistor: persistorInstance };
  }

  // Dynamically import heavy dependencies
  const [
    { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER },
    { default: AsyncStorage },
    { combineReducers },
    { default: authSlice },
    { default: offlineReducer },
    { default: notificationReducer },
    { default: automationReducer },
    { default: deploymentReducer },
    { default: scanReducer },
    { default: uiReducer },
    { automationApi },
    { analyticsApi },
    { default: dashboardApi },
    { searchApi },
  ] = await Promise.all([
    import('redux-persist'),
    import('@react-native-async-storage/async-storage'),
    import('@reduxjs/toolkit'),
    import('./slices/authSlice'),
    import('./slices/offlineSlice'),
    import('./slices/notificationSlice'),
    import('./slices/automationSlice'),
    import('./slices/deploymentSlice'),
    import('./slices/scanSlice'),
    import('./slices/uiSlice'),
    import('./api/automationApi'),
    import('./api/analyticsApi'),
    import('./api/dashboardApi'),
    import('./api/searchApi'),
  ]);

  const rootReducer = combineReducers({
    auth: authSlice.reducer,
    offline: offlineReducer,
    notifications: notificationReducer,
    automation: automationReducer,
    deployment: deploymentReducer,
    scan: scanReducer,
    ui: uiReducer,
    errors: errorReducer, // Add error state management
    [automationApi.reducerPath]: automationApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [searchApi.reducerPath]: searchApi.reducer,
  });

  const persistConfig = {
    key: 'root',
    version: 1,
    storage: AsyncStorage,
    whitelist: ['auth', 'offline', 'notifications', 'ui'], // Persist key state (errors, automation, deployment, scan are ephemeral)
    blacklist: [automationApi.reducerPath, analyticsApi.reducerPath, dashboardApi.reducerPath, searchApi.reducerPath], // Don't persist API cache
    // Add migration logic for version changes
    migrate: (state: any) => {
      try {
        EventLogger.debug('Store', 'Migration: Running migration...');
        
        // Clear potentially corrupted state
        if (state && typeof state === 'object') {
          // Validate auth state structure
          let authState = state.auth;
          if (authState && typeof authState === 'object') {
            // Ensure all required auth fields exist with proper defaults
            authState = {
              user: authState.user || null,
              isAuthenticated: Boolean(authState.isAuthenticated),
              isLoading: Boolean(authState.isLoading),
              error: authState.error || null,
              accessToken: authState.accessToken || null,
              refreshToken: authState.refreshToken || null,
              // Add new fields with defaults
              isRecovering: authState.isRecovering || false,
              lastErrorTimestamp: authState.lastErrorTimestamp || null,
              consecutiveErrors: authState.consecutiveErrors || 0,
              sessionValid: authState.sessionValid !== undefined ? authState.sessionValid : true,
            };
          }
          
          const migratedState = {
            ...state,
            // Apply validated auth state
            auth: authState,
            // Reset API state on migration
            [automationApi.reducerPath]: undefined,
            [analyticsApi.reducerPath]: undefined,
            [dashboardApi.reducerPath]: undefined,
            [searchApi.reducerPath]: undefined,
            // Reset error state
            errors: initialErrorState,
          };
          
          EventLogger.debug('Store', 'Migration: Migration completed successfully');
          return migratedState;
        }
        
        EventLogger.debug('Store', 'Migration: Invalid state during migration, using default');
        return undefined; // Force fresh state
      } catch (error) {
        EventLogger.error('Store', 'Migration failed', error as Error);
        // Return undefined to force fresh state
        return undefined;
      }
    },
  };

  const persistedReducer = persistReducer(persistConfig, rootReducer);

  storeInstance = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => {
      const middleware = getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            FLUSH,
            REHYDRATE,
            PAUSE,
            PERSIST,
            PURGE,
            REGISTER,
            // RTK Query actions - use string patterns for better coverage
            'automationApi/executeQuery/pending',
            'automationApi/executeQuery/fulfilled', 
            'automationApi/executeQuery/rejected',
            'analyticsApi/executeQuery/pending',
            'analyticsApi/executeQuery/fulfilled',
            'analyticsApi/executeQuery/rejected',
            'dashboardApi/executeQuery/pending',
            'dashboardApi/executeQuery/fulfilled',
            'dashboardApi/executeQuery/rejected',
            'searchApi/executeQuery/pending',
            'searchApi/executeQuery/fulfilled',
            'searchApi/executeQuery/rejected',
            // Error handling actions
            'api/errorOccurred',
            'redux/errorOccurred',
            'api/clearErrors',
            'redux/clearErrors',
            'errors/clearAll',
          ],
          // Ignore paths that might contain non-serializable values
          ignoredActionPaths: [
            'meta.arg',
            'payload.timestamp',
            'meta.baseQueryMeta',
            'payload.originalArgs',
            'meta.condition',
          ],
          ignoredPaths: [
            'items.dates',
            automationApi.reducerPath,
            analyticsApi.reducerPath,
            dashboardApi.reducerPath,
            searchApi.reducerPath,
            'register',
          ],
        },
        immutableCheck: {
          warnAfter: 128,
          ignoredPaths: [automationApi.reducerPath, analyticsApi.reducerPath, dashboardApi.reducerPath, searchApi.reducerPath],
        },
      });
      
      // Add API middleware with proper error handling order
      const enhancedMiddleware = middleware.concat(
        // API middlewares should come first to handle RTK Query actions
        automationApi.middleware,
        analyticsApi.middleware,
        dashboardApi.middleware,
        searchApi.middleware,
        // Error handling middleware after API middlewares to catch their errors
        errorHandlingMiddleware,
        // Circular reference protection last to sanitize any remaining issues
        circularReferenceMiddleware
      );
      
      return enhancedMiddleware;
    },
    devTools: __DEV__ && {
      name: 'ShortcutsLike Store',
      trace: true,
      traceLimit: 25,
    },
  });

  // Enhanced persistor with error handling
  persistorInstance = persistStore(storeInstance, null, () => {
    EventLogger.debug('Store', 'Persistor initialization complete');
  });

  // Set up RTK Query listeners for automatic cache management
  setupListeners(storeInstance.dispatch);

  // Set up auth state provider for baseApi to avoid circular dependency
  const { setAuthStateProvider } = await import('./api/baseApi');
  setAuthStateProvider(() => storeInstance.getState().auth);

  // Bootstrap services that depend on the store
  const { bootstrapServices } = await import('./bootstrap');
  await bootstrapServices(storeInstance);

  // Initialize offline system after store setup
  setTimeout(async () => {
    try {
      const { initializeOfflineSystem } = await import('./slices/offlineSlice');
      storeInstance.dispatch(initializeOfflineSystem());
      EventLogger.debug('index', '📱 Offline system initialization dispatched');
    } catch (error) {
      EventLogger.warn('index', 'Failed to initialize offline system:', error);
    }
  }, 100); // Small delay to ensure store is fully ready

  return { store: storeInstance, persistor: persistorInstance };
};

// Export the store creation utilities
export { storeInstance as store, persistorInstance as persistor };

// Keep original exports for compatibility but make them lazy
const getStoreInstance = () => {
  if (!storeInstance) {
    throw new Error('Store not initialized. Call createLazyStore() first.');
  }
  return storeInstance;
};

const getPersistorInstance = () => {
  if (!persistorInstance) {
    throw new Error('Persistor not initialized. Call createLazyStore() first.');
  }
  return persistorInstance;
};

// Handle rehydration failures
export const handleRehydrationFailure = async () => {
  try {
    EventLogger.debug('Store', 'Handling rehydration failure...');
    
    // Clear potentially corrupted persisted data
    await clearPersistedData();
    
    // Force a fresh start
    EventLogger.debug('Store', 'Cleared corrupted state, app will continue with fresh state');
  } catch (error) {
    EventLogger.error('Store', 'Failed to handle rehydration failure', error as Error);
    // App will continue anyway, but log the issue
  }
};

// Enhanced utility to clear all persisted data
export const clearPersistedData = async () => {
  try {
    EventLogger.debug('Store', 'Clearing all persisted data...');
    
    const { store, persistor } = await createLazyStore();
    
    // Dynamically load the APIs for clearing
    const [
      { automationApi },
      { analyticsApi },
      { default: dashboardApi },
      { searchApi },
      { default: AsyncStorage }
    ] = await Promise.all([
      import('./api/automationApi'),
      import('./api/analyticsApi'),
      import('./api/dashboardApi'),
      import('./api/searchApi'),
      import('@react-native-async-storage/async-storage')
    ]);
    
    // Clear API caches first
    store.dispatch(automationApi.util.resetApiState());
    store.dispatch(analyticsApi.util.resetApiState());
    store.dispatch(dashboardApi.util.resetApiState());
    store.dispatch(searchApi.util.resetApiState());
    
    // Clear Redux persist storage
    await persistor.purge();
    
    // Clear AsyncStorage completely for auth-related keys
    const authKeys = [
      'persist:root',
      'supabase.auth.token',
      '@supabase/auth-token',
      'sb-gfkdclzgdlcvhfiujkwz-auth-token', // Supabase specific key
    ];
    
    await Promise.all(authKeys.map(async (key) => {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        EventLogger.warn('Store', `Failed to remove ${key}`, error);
      }
    }));
    
    EventLogger.debug('Store', 'Persisted data cleared successfully');
  } catch (error) {
    EventLogger.error('Store', 'Failed to clear persisted data', error as Error);
    throw error;
  }
};

// Utility to reset API state without affecting auth
export const resetApiState = async () => {
  const { store } = await createLazyStore();
  
  const [
    { automationApi },
    { analyticsApi },
    { default: dashboardApi },
    { searchApi }
  ] = await Promise.all([
    import('./api/automationApi'),
    import('./api/analyticsApi'),
    import('./api/dashboardApi'),
    import('./api/searchApi')
  ]);
  
  store.dispatch(automationApi.util.resetApiState());
  store.dispatch(analyticsApi.util.resetApiState());
  store.dispatch(dashboardApi.util.resetApiState());
  store.dispatch(searchApi.util.resetApiState());
  EventLogger.debug('Store', 'API state reset');
};

// Utility to force rehydration completion in case of timeout
export const forceRehydrationComplete = async () => {
  try {
    EventLogger.debug('Store', 'Forcing rehydration completion due to timeout');
    const { persistor } = await createLazyStore();
    // This will trigger the PersistGate to complete even if rehydration failed
    persistor.persist();
    EventLogger.debug('Store', 'Forced rehydration completion');
  } catch (error) {
    EventLogger.error('Store', 'Failed to force rehydration completion', error as Error);
  }
};

// Re-export types from types.ts to maintain compatibility
export type { RootState, AppDispatch } from './types';

// For immediate access to store instance after initialization
export const getStore = () => getStoreInstance();
export const getPersistor = () => getPersistorInstance();

// Re-export typed hooks
export { useAppDispatch, useAppSelector } from '../hooks/redux';