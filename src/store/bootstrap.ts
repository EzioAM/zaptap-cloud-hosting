/**
 * Store Bootstrap - Fixed Version
 * 
 * This module handles proper initialization of services that depend on the store
 * without creating circular dependencies.
 */

import type { Store } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from './types';
import { EventLogger } from '../utils/EventLogger';

/**
 * Initialize all services that depend on the store
 */
export const bootstrapServices = async (store: Store<RootState, any>) => {
  try {
    EventLogger.debug('Bootstrap', 'Starting services bootstrap...');
    
    // Set up auth state provider for baseApi
    const { setAuthStateProvider } = await import('./api/baseApi');
    setAuthStateProvider(() => {
      try {
        const state = store.getState();
        return state?.auth ? {
          accessToken: state.auth.accessToken,
          isAuthenticated: state.auth.isAuthenticated
        } : null;
      } catch (error) {
        EventLogger.debug('Bootstrap', 'Could not get auth state:', error);
        return null;
      }
    });

    // Initialize Supabase auth listener
    const { supabase } = await import('../services/supabase/client');
    const { restoreSession, signOutSuccess, updateTokens, setUser } = await import('./slices/authSlice');
    
    // Set up auth state change listener
    supabase.auth.onAuthStateChange(async (event, session) => {
      EventLogger.debug('Bootstrap', `Auth state changed: ${event}`);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          // Build the name using the best available data
          let userName = 'User';
          const metadata = session.user.user_metadata || {};
          
          // Try full_name first
          if (metadata.full_name) {
            userName = metadata.full_name;
          }
          // Try first and last name combination
          else if (metadata.first_name || metadata.last_name) {
            const firstName = metadata.first_name || '';
            const lastName = metadata.last_name || '';
            userName = `${firstName} ${lastName}`.trim() || 'User';
          }
          // Try name field
          else if (metadata.name) {
            userName = metadata.name;
          }
          // Fall back to email prefix only as last resort
          else if (session.user.email) {
            userName = session.user.email.split('@')[0];
          }
          
          store.dispatch(restoreSession({
            user: {
              id: session.user.id,
              email: session.user.email!,
              name: userName,
              first_name: metadata.first_name,
              last_name: metadata.last_name,
              avatar_url: metadata.avatar_url,
              role: metadata.role || 'user',
              user_metadata: metadata,
            },
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          }));
        }
      } else if (event === 'SIGNED_OUT') {
        store.dispatch(signOutSuccess());
      } else if (event === 'USER_UPDATED') {
        if (session) {
          // Update tokens
          store.dispatch(updateTokens({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          }));
          
          // Also update the user data with the latest metadata
          const updatedUser = session.user;
          if (updatedUser) {
            // Build the name using the best available data
            let userName = 'User';
            const metadata = updatedUser.user_metadata || {};
            
            // Try full_name first
            if (metadata.full_name) {
              userName = metadata.full_name;
            }
            // Try first and last name combination
            else if (metadata.first_name || metadata.last_name) {
              const firstName = metadata.first_name || '';
              const lastName = metadata.last_name || '';
              userName = `${firstName} ${lastName}`.trim() || 'User';
            }
            // Try name field
            else if (metadata.name) {
              userName = metadata.name;
            }
            // Fall back to email prefix only as last resort
            else if (updatedUser.email) {
              userName = updatedUser.email.split('@')[0];
            }
            
            store.dispatch(setUser({
              id: updatedUser.id,
              email: updatedUser.email!,
              name: userName,
              first_name: metadata.first_name,
              last_name: metadata.last_name,
              avatar_url: metadata.avatar_url,
              role: metadata.role || 'user',
              user_metadata: metadata,
            }));
          }
        }
      }
    });

    // Initialize network monitoring
    try {
      const NetInfo = await import('@react-native-community/netinfo').then(m => m.default);
      NetInfo.addEventListener(state => {
        EventLogger.debug('Bootstrap', 'Network state changed:', {
          isConnected: state.isConnected,
          isInternetReachable: state.isInternetReachable,
          type: state.type,
        });
      });
    } catch (error) {
      EventLogger.warn('Bootstrap', 'Failed to initialize network monitoring:', error);
    }
    
    EventLogger.info('Bootstrap', 'Services bootstrapped successfully');
  } catch (error) {
    EventLogger.error('Bootstrap', 'Failed to bootstrap services:', error as Error);
    // Don't throw - allow app to continue with limited functionality
  }
};

/**
 * Clean up service connections
 */
export const cleanupServices = async () => {
  try {
    EventLogger.debug('Bootstrap', 'Cleaning up services...');
    
    // Clean up auth state provider
    const { setAuthStateProvider } = await import('./api/baseApi');
    setAuthStateProvider(null);
    
    // Clean up Supabase listeners
    const { supabase } = await import('../services/supabase/client');
    const { data } = supabase.auth.onAuthStateChange(() => {});
    data?.subscription?.unsubscribe();
    
    EventLogger.info('Bootstrap', 'Services cleaned up successfully');
  } catch (error) {
    EventLogger.error('Bootstrap', 'Failed to clean up services:', error as Error);
  }
};

/**
 * Initialize offline system
 */
export const initializeOfflineSystem = async (store: Store<RootState, any>) => {
  try {
    const { initializeOfflineSystem } = await import('./slices/offlineSlice');
    store.dispatch(initializeOfflineSystem());
    EventLogger.debug('Bootstrap', 'Offline system initialized');
  } catch (error) {
    EventLogger.warn('Bootstrap', 'Failed to initialize offline system:', error);
  }
};