/**
 * Redux Middleware to Detect and Handle Circular References
 * Prevents stack overflow errors from circular references in Redux state
 */

import { Middleware } from '@reduxjs/toolkit';
import { hasCircularReference, removeCircularReferences, safeStringify } from '../../utils/circularReferenceDetector';
import { EventLogger } from '../../utils/EventLogger';

/**
 * Middleware to detect and handle circular references in Redux actions and state
 */
export const circularReferenceMiddleware: Middleware = (store) => (next) => (action) => {
  try {
    // Skip circular reference checks for dashboard API actions
    // These are expected to have complex objects that are properly handled
    if (action.type?.includes('dashboardApi/')) {
      return next(action);
    }
    
    // Check for circular references in action payload
    if (action.payload && typeof action.payload === 'object') {
      if (hasCircularReference(action.payload)) {
        // Only log in development and not for expected cases
        if (__DEV__ && !action.type?.includes('Api/')) {
          EventLogger.warn('Redux', `Circular reference detected in action: ${action.type}`);
        }
        
        // Try to remove circular references
        const cleanedPayload = removeCircularReferences(action.payload);
        if (cleanedPayload) {
          action = { ...action, payload: cleanedPayload };
          if (__DEV__ && !action.type?.includes('Api/')) {
            EventLogger.warn('Redux', `Circular references removed from action: ${action.type}`);
          }
        } else {
          // Silently handle - don't block the action
          return next(action);
        }
      }
    }
    
    // Skip expensive state size checks to improve performance
    // These were causing performance issues and stack overflow
    // State size monitoring is handled by other performance tools
    
    // Process the action
    const result = next(action);
    
    // Skip expensive post-action state checks to prevent stack overflow
    // Circular reference detection is handled at the action payload level above
    // This prevents the performance issues and recursion we were seeing
    
    return result;
  } catch (error) {
    EventLogger.error('Redux', 'Error in circular reference middleware', {
      error,
      action: action.type
    });
    
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
      EventLogger.warn('Redux', 'Removing circular references from state');
      return removeCircularReferences(state);
    }
    
    return state;
  } catch (error) {
    EventLogger.error('Redux', 'Failed to sanitize state', error as Error);
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
        EventLogger.warn('Redux', `Circular reference in action payload: ${type}`);
        return {
          type,
          payload: removeCircularReferences(payload),
          meta: { hadCircularReference: true }
        };
      }
      
      return { type, payload };
    } catch (error) {
      EventLogger.error('Redux', `Error creating action ${type}`, error as Error);
      return { type, error: true, payload: error };
    }
  };
}