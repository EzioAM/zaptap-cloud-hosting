import React, { useState, useCallback, useRef, useEffect } from 'react';
import { errorRecoveryManager } from './ErrorRecoveryManager';
import { EventLogger } from '../EventLogger';

export interface RetryWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<RetryFallbackProps>;
  maxRetries?: number;
  enableAutoRetry?: boolean;
  retryDelay?: number;
  onError?: (error: Error, retryCount: number) => void;
  onSuccess?: (retryCount: number) => void;
  contextName?: string;
}

export interface RetryFallbackProps {
  error: Error;
  retry: () => void;
  retryCount: number;
  maxRetries: number;
  isRetrying: boolean;
}

export const RetryWrapper: React.FC<RetryWrapperProps> = ({
  children,
  fallback: FallbackComponent,
  maxRetries = 3,
  enableAutoRetry = true,
  retryDelay = 1000,
  onError,
  onSuccess,
  contextName = 'Component',
}) => {
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const retry = useCallback(async () => {
    if (!mountedRef.current || isRetrying) return;

    setIsRetrying(true);
    setError(null);

    try {
      // Attempt recovery if this is a retry
      if (retryCount > 0 && error) {
        const recovered = await errorRecoveryManager.executeWithRecovery(
          async () => Promise.resolve(true),
          {
            operationName: `${contextName}_retry`,
            category: 'ComponentRetry',
            maxAttempts: 1,
            enableRecovery: true,
          }
        );

        if (!recovered) {
          EventLogger.warn('RetryWrapper', 'Recovery failed, continuing with retry');
        }
      }

      // Small delay to allow for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      if (mountedRef.current) {
        setRetryCount(prev => prev + 1);
        onSuccess?.(retryCount + 1);
        
        EventLogger.info(
          'RetryWrapper',
          'Retry successful',
          { contextName, retryCount: retryCount + 1 }
        );
      }
    } catch (retryError) {
      if (mountedRef.current) {
        EventLogger.error(
          'RetryWrapper',
          'Retry failed',
          retryError as Error,
          { contextName, retryCount: retryCount + 1 }
        );
      }
    } finally {
      if (mountedRef.current) {
        setIsRetrying(false);
      }
    }
  }, [retryCount, error, isRetrying, contextName, onSuccess]);

  const handleError = useCallback((error: Error) => {
    if (!mountedRef.current) return;

    setError(error);
    onError?.(error, retryCount);

    EventLogger.error(
      'RetryWrapper',
      'Component error caught',
      error,
      { contextName, retryCount }
    );

    // Auto-retry if enabled and under limit
    if (enableAutoRetry && retryCount < maxRetries) {
      const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
      
      EventLogger.info(
        'RetryWrapper',
        `Auto-retry scheduled in ${delay}ms`,
        { contextName, retryCount, delay }
      );

      retryTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          retry();
        }
      }, delay);
    }
  }, [retryCount, maxRetries, enableAutoRetry, retryDelay, contextName, onError, retry]);

  // Error boundary effect
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      handleError(event.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(event.reason instanceof Error ? event.reason : new Error(event.reason));
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleError]);

  // If there's an error and we've exceeded retry limit, show fallback
  if (error && retryCount >= maxRetries && !isRetrying) {
    if (FallbackComponent) {
      return (
        <FallbackComponent
          error={error}
          retry={retry}
          retryCount={retryCount}
          maxRetries={maxRetries}
          isRetrying={isRetrying}
        />
      );
    }

    // Default fallback
    return (
      <div style={defaultFallbackStyles.container}>
        <div style={defaultFallbackStyles.content}>
          <h3>Something went wrong</h3>
          <p>{error.message}</p>
          <button onClick={retry} disabled={isRetrying}>
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  // Show loading state during retry
  if (isRetrying) {
    return (
      <div style={defaultFallbackStyles.container}>
        <div style={defaultFallbackStyles.content}>
          <p>Retrying... ({retryCount}/{maxRetries})</p>
        </div>
      </div>
    );
  }

  // Wrap children in error boundary context
  return (
    <ErrorBoundaryContext.Provider value={{ handleError, retry, retryCount }}>
      {children}
    </ErrorBoundaryContext.Provider>
  );
};

// Context for child components to access error handling
interface ErrorBoundaryContextValue {
  handleError: (error: Error) => void;
  retry: () => void;
  retryCount: number;
}

const ErrorBoundaryContext = React.createContext<ErrorBoundaryContextValue | null>(null);

export const useErrorBoundary = () => {
  const context = React.useContext(ErrorBoundaryContext);
  
  if (!context) {
    throw new Error('useErrorBoundary must be used within a RetryWrapper');
  }
  
  return context;
};

// Hook for manual error reporting
export const useErrorHandler = (contextName?: string) => {
  const errorBoundary = React.useContext(ErrorBoundaryContext);
  
  return useCallback((error: Error | string) => {
    const errorObj = error instanceof Error ? error : new Error(error);
    
    if (errorBoundary) {
      errorBoundary.handleError(errorObj);
    } else {
      EventLogger.error(
        'ErrorHandler',
        'Error occurred outside of RetryWrapper',
        errorObj,
        { contextName }
      );
    }
  }, [errorBoundary, contextName]);
};

const defaultFallbackStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    minHeight: '200px',
  },
  content: {
    textAlign: 'center' as const,
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#f9f9f9',
  },
};