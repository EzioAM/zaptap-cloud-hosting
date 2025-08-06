import { useEffect, useRef, useCallback } from 'react';
import { EventLogger } from '../utils/EventLogger';

export type CleanupFunction = () => void;

/**
 * Hook for managing cleanup functions that should run on component unmounting
 * Provides a safe way to register and manage cleanup tasks
 */
export function useCleanup() {
  const cleanupFunctions = useRef<Set<CleanupFunction>>(new Set());
  const isMountedRef = useRef(true);

  // Register a cleanup function
  const addCleanup = useCallback((cleanupFn: CleanupFunction) => {
    if (isMountedRef.current) {
      cleanupFunctions.current.add(cleanupFn);
    }
    
    // Return a function to remove this specific cleanup
    return () => {
      cleanupFunctions.current.delete(cleanupFn);
    };
  }, []);

  // Remove a specific cleanup function
  const removeCleanup = useCallback((cleanupFn: CleanupFunction) => {
    cleanupFunctions.current.delete(cleanupFn);
  }, []);

  // Clear all cleanup functions
  const clearAllCleanup = useCallback(() => {
    cleanupFunctions.current.clear();
  }, []);

  // Execute all cleanup functions immediately
  const runCleanup = useCallback(() => {
    cleanupFunctions.current.forEach((cleanupFn) => {
      try {
        cleanupFn();
      } catch (error) {
        EventLogger.error('useCleanup', 'Error running cleanup function:', error as Error);
      }
    });
    cleanupFunctions.current.clear();
  }, []);

  // Main cleanup effect
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Run all registered cleanup functions
      cleanupFunctions.current.forEach((cleanupFn) => {
        try {
          cleanupFn();
        } catch (error) {
          EventLogger.error('useCleanup', 'Error during component cleanup:', error as Error);
        }
      });
      
      cleanupFunctions.current.clear();
    };
  }, []);

  return {
    addCleanup,
    removeCleanup,
    clearAllCleanup,
    runCleanup,
    isMounted: isMountedRef.current,
  };
}

/**
 * Hook for managing subscriptions that need cleanup
 * Automatically handles unsubscription on component unmount
 */
export function useSubscription() {
  const { addCleanup, isMounted } = useCleanup();

  const subscribe = useCallback(
    <T>(
      subscribeFn: () => T,
      unsubscribeFn: (subscription: T) => void
    ) => {
      if (!isMounted) {
        EventLogger.warn('useCleanup', 'Attempting to subscribe after component unmounted');
        return;
      }

      const subscription = subscribeFn();
      
      const cleanup = () => {
        try {
          unsubscribeFn(subscription);
        } catch (error) {
          EventLogger.error('useCleanup', 'Error unsubscribing:', error as Error);
        }
      };

      addCleanup(cleanup);
      
      return subscription;
    },
    [addCleanup, isMounted]
  );

  return { subscribe };
}

/**
 * Hook for managing timers that need cleanup
 * Automatically clears timers on component unmount
 */
export function useTimer() {
  const { addCleanup } = useCleanup();

  const setTimeout = useCallback(
    (callback: () => void, delay: number) => {
      const timerId = global.setTimeout(callback, delay);
      
      const cleanup = () => {
        global.clearTimeout(timerId);
      };

      addCleanup(cleanup);
      
      return timerId;
    },
    [addCleanup]
  );

  const setInterval = useCallback(
    (callback: () => void, delay: number) => {
      const intervalId = global.setInterval(callback, delay);
      
      const cleanup = () => {
        global.clearInterval(intervalId);
      };

      addCleanup(cleanup);
      
      return intervalId;
    },
    [addCleanup]
  );

  const clearTimeout = useCallback((timerId: NodeJS.Timeout) => {
    global.clearTimeout(timerId);
  }, []);

  const clearInterval = useCallback((intervalId: NodeJS.Timeout) => {
    global.clearInterval(intervalId);
  }, []);

  return {
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
  };
}

/**
 * Hook for managing async operations that need cleanup
 * Provides cancellation token to prevent state updates after unmount
 */
export function useAsyncOperation() {
  const { addCleanup } = useCleanup();
  const isCancelledRef = useRef(false);

  const createCancellablePromise = useCallback(
    <T>(asyncFn: (isCancelled: () => boolean) => Promise<T>) => {
      isCancelledRef.current = false;
      
      const cleanup = () => {
        isCancelledRef.current = true;
      };

      addCleanup(cleanup);

      const isCancelled = () => isCancelledRef.current;
      
      return asyncFn(isCancelled);
    },
    [addCleanup]
  );

  const isCancelled = useCallback(() => isCancelledRef.current, []);

  return {
    createCancellablePromise,
    isCancelled,
  };
}

export default useCleanup;