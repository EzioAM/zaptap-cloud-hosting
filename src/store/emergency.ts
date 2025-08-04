import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import { automationApi } from './api/automationApi';
import { analyticsApi } from './api/analyticsApi';
import { setupListeners } from '@reduxjs/toolkit/query';

// Emergency non-persisted store for immediate app recovery
const rootReducer = combineReducers({
  auth: authSlice.reducer,
  [automationApi.reducerPath]: automationApi.reducer,
  [analyticsApi.reducerPath]: analyticsApi.reducer,
});

export const emergencyStore = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          // RTK Query actions
          'automationApi/executeQuery/pending',
          'automationApi/executeQuery/fulfilled', 
          'automationApi/executeQuery/rejected',
          'analyticsApi/executeQuery/pending',
          'analyticsApi/executeQuery/fulfilled',
          'analyticsApi/executeQuery/rejected',
        ],
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
    name: 'ShortcutsLike Emergency Store',
    trace: true,
    traceLimit: 25,
  },
});

// Set up RTK Query listeners
setupListeners(emergencyStore.dispatch);

export type EmergencyRootState = ReturnType<typeof emergencyStore.getState>;
export type EmergencyAppDispatch = typeof emergencyStore.dispatch;