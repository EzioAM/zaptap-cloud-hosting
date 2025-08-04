import { configureStore } from '@reduxjs/toolkit';
  import { persistStore, persistReducer } from 'redux-persist';
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
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
      }).concat(automationApi.middleware, analyticsApi.middleware),
  });

  export const persistor = persistStore(store);

  export type RootState = ReturnType<typeof store.getState>;
  export type AppDispatch = typeof store.dispatch;