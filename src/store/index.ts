import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import { automationApi } from './api/automationApi';
import { analyticsApi } from './api/analyticsApi';
import { setupListeners } from '@reduxjs/toolkit/query';

const rootReducer = combineReducers({
  auth: authSlice.reducer,
  [automationApi.reducerPath]: automationApi.reducer,
  [analyticsApi.reducerPath]: analyticsApi.reducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth'], // Only persist auth data
  blacklist: [automationApi.reducerPath, analyticsApi.reducerPath], // Don't persist API cache
  // Add migration logic for version changes
  migrate: (state: any) => {
    try {
      console.log('🔄 Running store migration...');
      // Clear potentially corrupted state
      if (state && typeof state === 'object') {
        const migratedState = {
          ...state,
          // Reset API state on migration
          [automationApi.reducerPath]: undefined,
          [analyticsApi.reducerPath]: undefined,
        };
        console.log('✅ Store migration completed');
        return migratedState;
      }
      console.log('⚠️ Invalid state during migration, using default');
      return state;
    } catch (error) {
      console.error('❌ Store migration failed:', error);
      // Return undefined to force fresh state
      return undefined;
    }
  },
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
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
          'register',
        ],
      },
      immutableCheck: {
        warnAfter: 128,
        ignoredPaths: [automationApi.reducerPath, analyticsApi.reducerPath],
      },
    });
    
    // Add API middleware
    const enhancedMiddleware = middleware.concat(
      automationApi.middleware,
      analyticsApi.middleware
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
export const persistor = persistStore(store, null, () => {
  console.log('📦 Persistor initialization complete');
});

// Handle rehydration failures
export const handleRehydrationFailure = async () => {
  try {
    console.log('🔧 Handling rehydration failure...');
    
    // Clear potentially corrupted persisted data
    await clearPersistedData();
    
    // Force a fresh start
    console.log('✅ Cleared corrupted state, app will continue with fresh state');
  } catch (error) {
    console.error('❌ Failed to handle rehydration failure:', error);
    // App will continue anyway, but log the issue
  }
};

// Set up RTK Query listeners for automatic cache management
setupListeners(store.dispatch);

// Enhanced utility to clear all persisted data
export const clearPersistedData = async () => {
  try {
    console.log('🧹 Clearing all persisted data...');
    
    // Clear API caches first
    store.dispatch(automationApi.util.resetApiState());
    store.dispatch(analyticsApi.util.resetApiState());
    
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
        console.warn(`Failed to remove ${key}:`, error);
      }
    }));
    
    console.log('✅ Persisted data cleared successfully');
  } catch (error) {
    console.error('❌ Failed to clear persisted data:', error);
    throw error;
  }
};

// Utility to reset API state without affecting auth
export const resetApiState = () => {
  store.dispatch(automationApi.util.resetApiState());
  store.dispatch(analyticsApi.util.resetApiState());
  console.log('🔄 API state reset');
};

// Utility to force rehydration completion in case of timeout
export const forceRehydrationComplete = () => {
  try {
    console.log('⏰ Forcing rehydration completion due to timeout');
    // This will trigger the PersistGate to complete even if rehydration failed
    persistor.persist();
    console.log('✅ Forced rehydration completion');
  } catch (error) {
    console.error('❌ Failed to force rehydration completion:', error);
  }
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;