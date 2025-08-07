/**
 * Redux Middleware to Detect and Handle Circular References
 * Prevents stack overflow errors from circular references in Redux state
 */

import { Middleware } from '@reduxjs/toolkit';
import { hasCircularReference, removeCircularReferences, safeStringify } from '../../utils/circularReferenceDetector';

/**
 * Middleware to detect and handle circular references in Redux actions and state
 */
export const circularReferenceMiddleware: Middleware = (store) => (next) => (action) => {
  try {
    // Check for circular references in action payload
    if (action.payload && typeof action.payload === 'object') {
      if (hasCircularReference(action.payload)) {
        console.warn(`[Redux] Circular reference detected in action: ${action.type}`);
        
        // Try to remove circular references
        const cleanedPayload = removeCircularReferences(action.payload);
        if (cleanedPayload) {
          action = { ...action, payload: cleanedPayload };
          console.warn(`[Redux] Circular references removed from action: ${action.type}`);
        } else {
          console.error(`[Redux] Failed to clean circular references in action: ${action.type}`);
          // Block the action to prevent stack overflow
          return;
        }
      }
    }
    
    // Check state size before action (development only)
    if (__DEV__) {
      const stateBefore = store.getState();
      try {
        const stateSize = safeStringify(stateBefore).length;
        if (stateSize > 5000000) { // 5MB warning threshold
          console.warn(`[Redux] Large state detected: ${(stateSize / 1000000).toFixed(2)}MB`);
        }
      } catch (error) {
        // State might have circular references
        console.warn('[Redux] Could not measure state size - possible circular reference');
      }
    }
    
    // Process the action
    const result = next(action);
    
    // Verify state after action (development only)
    if (__DEV__) {
      const stateAfter = store.getState();
      
      // Quick check for circular references in new state
      // Only check specific slices to avoid performance impact
      const slicesToCheck = ['auth', 'notifications', 'offline'];
      for (const slice of slicesToCheck) {
        if (stateAfter[slice] && hasCircularReference(stateAfter[slice])) {
          console.error(`[Redux] Circular reference detected in state.${slice} after action: ${action.type}`);
          
          // In development, log more details
          console.error(`[Redux] Action that caused circular reference:`, action);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error(`[Redux] Error in circular reference middleware:`, error);
    console.error(`[Redux] Problematic action:`, action.type);
    
    // Pass the action through to prevent blocking the app
    return next(action);
  }
};

/**
 * Helper function to sanitize Redux state
 * Use this when persisting or serializing state
 */
export function sanitizeReduxState(state: any): any {
  try {
    if (!state || typeof state !== 'object') {
      return state;
    }
    
    // Check for circular references
    if (hasCircularReference(state)) {
      console.warn('[Redux] Removing circular references from state');
      return removeCircularReferences(state);
    }
    
    return state;
  } catch (error) {
    console.error('[Redux] Failed to sanitize state:', error);
    return {};
  }
}

/**
 * Action creator wrapper that checks for circular references
 */
export function safeActionCreator<T>(
  type: string,
  payloadCreator: (...args: any[]) => T
) {
  return (...args: any[]) => {
    try {
      const payload = payloadCreator(...args);
      
      if (payload && typeof payload === 'object' && hasCircularReference(payload)) {
        console.warn(`[Redux] Circular reference in action payload: ${type}`);
        return {
          type,
          payload: removeCircularReferences(payload),
          meta: { hadCircularReference: true }
        };
      }
      
      return { type, payload };
    } catch (error) {
      console.error(`[Redux] Error creating action ${type}:`, error);
      return { type, error: true, payload: error };
    }
  };
}