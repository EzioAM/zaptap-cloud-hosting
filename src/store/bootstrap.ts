/**
 * Store Bootstrap
 * 
 * This module handles proper initialization of services that depend on the store
 * without creating circular dependencies.
 */

import type { Store } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from './types';

/**
 * Initialize all services that depend on the store
 */
export const bootstrapServices = async (store: Store<RootState, any>) => {
  try {
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
        console.debug('Could not get auth state:', error);
        return null;
      }
    });

    // Initialize any other services that need store access
    // This is the proper place to set up service connections
    
    console.debug('Services bootstrapped successfully');
  } catch (error) {
    console.error('Failed to bootstrap services:', error);
  }
};

/**
 * Clean up service connections
 */
export const cleanupServices = async () => {
  try {
    // Clean up any service listeners or connections
    const { setAuthStateProvider } = await import('./api/baseApi');
    setAuthStateProvider(null);
    
    console.debug('Services cleaned up successfully');
  } catch (error) {
    console.error('Failed to clean up services:', error);
  }
};