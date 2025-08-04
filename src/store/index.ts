import { configureStore } from '@reduxjs/toolkit';
  import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import { combineReducers } from '@reduxjs/toolkit';
  import authSlice from './slices/authSlice';
  import { automationApi } from './api/automationApi';
  import { analyticsApi } from './api/analyticsApi';

  const rootReducer = combineReducers({
    auth: authSlice.reducer,
    [automationApi.reducerPath]: automationApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
  });

  const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    whitelist: ['auth'], // Only persist auth data
    blacklist: [automationApi.reducerPath, analyticsApi.reducerPath], // Don't persist API cache
  };

  const persistedReducer = persistReducer(persistConfig, rootReducer);

  export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => {
      const defaultMiddleware = getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            FLUSH,
            REHYDRATE,
            PAUSE,
            PERSIST,
            PURGE,
            REGISTER,
            // RTK Query actions
            'automationApi/executeQuery/pending',
            'automationApi/executeQuery/fulfilled',
            'automationApi/executeQuery/rejected',
            'analyticsApi/executeQuery/pending',
            'analyticsApi/executeQuery/fulfilled',
            'analyticsApi/executeQuery/rejected',
          ],
          // Ignore paths that might contain non-serializable values
          ignoredActionPaths: ['meta.arg', 'payload.timestamp', 'meta.baseQueryMeta'],
          ignoredPaths: ['items.dates', 'automationApi', 'analyticsApi'],
        },
        immutableCheck: {
          warnAfter: 128,
          ignoredPaths: ['items.dates'],
        },
      });
      
      // Add API middleware safely
      try {
        return defaultMiddleware.concat(automationApi.middleware, analyticsApi.middleware);
      } catch (error) {
        console.error('❌ API middleware configuration failed:', error);
        // Return default middleware only if API middleware fails
        return defaultMiddleware;
      }
    },
  });

  export const persistor = persistStore(store);

  // Utility to clear all persisted data (useful for sign out)
  export const clearPersistedData = async () => {
    try {
      console.log('🧹 Clearing all persisted data...');
      
      // Clear Redux persist storage
      await persistor.purge();
      
      // Clear AsyncStorage completely for auth-related keys
      const authKeys = [
        'persist:root',
        'supabase.auth.token',
        '@supabase/auth-token',
      ];
      
      await Promise.all(authKeys.map(key => AsyncStorage.removeItem(key)));
      
      console.log('✅ Persisted data cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear persisted data:', error);
    }
  };

  export type RootState = ReturnType<typeof store.getState>;
  export type AppDispatch = typeof store.dispatch;