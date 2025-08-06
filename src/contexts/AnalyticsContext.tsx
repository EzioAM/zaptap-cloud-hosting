/**
 * AnalyticsContext - React Context and hooks for analytics integration
 * Provides easy access to analytics, performance monitoring, and crash reporting
 */

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { AnalyticsService, UserProperties } from '../services/analytics/AnalyticsService';
import { CrashReporter, Breadcrumb, UserAction } from '../services/monitoring/CrashReporter';
import { PerformanceMonitor } from '../services/monitoring/PerformanceMonitor';
import { 
  ANALYTICS_EVENTS, 
  SCREEN_NAMES, 
  USER_PROPERTIES,
  getAnalyticsConfig
} from '../config/analytics';
import { EventLogger } from '../utils/EventLogger';

export interface AnalyticsContextValue {
  // Analytics
  track: (eventName: string, properties?: Record<string, any>) => void;
  trackScreen: (screenName: string, properties?: Record<string, any>) => void;
  identify: (userId: string, properties?: UserProperties) => Promise<void>;
  setUserProperties: (properties: UserProperties) => Promise<void>;
  reset: () => Promise<void>;
  setConsent: (consent: { analytics?: boolean; performance?: boolean; marketing?: boolean }) => Promise<void>;
  
  // Performance Monitoring
  startScreenRender: (screenName: string) => void;
  endScreenRender: (screenName: string, context?: Record<string, any>) => void;
  startApiCall: (requestId: string, endpoint: string, method: string) => void;
  endApiCall: (requestId: string, endpoint: string, method: string, statusCode: number, error?: Error) => void;
  trackCustomMetric: (name: string, value: number, unit: string, context?: Record<string, any>) => void;
  
  // Error Reporting
  reportError: (error: Error, context?: Record<string, any>, severity?: 'low' | 'medium' | 'high' | 'critical') => void;
  addBreadcrumb: (breadcrumb: Omit<Breadcrumb, 'timestamp'>) => void;
  trackUserAction: (action: Omit<UserAction, 'timestamp'>) => void;
  setCurrentScreen: (screenName: string, params?: Record<string, any>) => void;
  addContext: (key: string, value: any) => void;
  
  // System
  flush: () => Promise<void>;
  
  // State
  isInitialized: boolean;
  hasConsent: boolean;
  currentScreen?: string;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export interface AnalyticsProviderProps {
  children: ReactNode;
  config?: {
    apiKey?: string;
    environment?: string;
    debugMode?: boolean;
    enableCrashReporting?: boolean;
    enablePerformanceMonitoring?: boolean;
  };
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ 
  children, 
  config = {}
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<string>();
  const [isAnalyticsReady, setIsAnalyticsReady] = useState(false);
  
  const analyticsService = useRef(AnalyticsService.getInstance());
  const appStateRef = useRef(AppState.currentState);
  const sessionStartTime = useRef(Date.now());
  const screenStartTimes = useRef<Map<string, number>>(new Map());
  const eventQueueRef = useRef<Array<{ name: string; properties?: any }>>([]);

  // Initialize services with deferred loading for better performance
  useEffect(() => {
    // Set initialized immediately to prevent blocking UI
    setIsInitialized(true);
    
    // Defer analytics initialization to not block critical app startup
    const timeoutId = setTimeout(async () => {
      try {
        // Lazy load analytics configuration
        const [
          AnalyticsService,
          CrashReporter,
          PerformanceMonitor,
          { getAnalyticsConfig },
          { ANALYTICS_EVENTS }
        ] = await Promise.all([
          import('../services/analytics/AnalyticsService').then(m => m.AnalyticsService),
          import('../services/monitoring/CrashReporter').then(m => m.CrashReporter),
          import('../services/monitoring/PerformanceMonitor').then(m => m.PerformanceMonitor),
          import('../config/analytics'),
          import('../config/analytics')
        ]);

        analyticsService.current = AnalyticsService.getInstance();

        // Initialize services in parallel for faster startup
        const initPromises = [];

        // Initialize analytics service
        initPromises.push(
          analyticsService.current.initialize({
            apiKey: config.apiKey,
            environment: config.environment || (__DEV__ ? 'development' : 'production'),
            debugMode: config.debugMode ?? __DEV__,
          })
        );

        // Initialize crash reporter if enabled
        if (config.enableCrashReporting !== false) {
          initPromises.push(
            CrashReporter.initialize({
              enabled: getAnalyticsConfig().errors.enabled,
              environment: config.environment || (__DEV__ ? 'development' : 'production'),
            })
          );
        }

        // Initialize performance monitor only if explicitly enabled
        if (config.enablePerformanceMonitoring === true) {
          initPromises.push(PerformanceMonitor.initialize());
        }

        // Wait for all services to initialize
        await Promise.all(initPromises);
        
        // Mark analytics as ready
        setIsAnalyticsReady(true);
        
        if (__DEV__) {
          EventLogger.debug('Analytics', '✅ Analytics services initialized successfully');
        }

        // Process queued events
        if (eventQueueRef.current.length > 0) {
          if (__DEV__) {
            EventLogger.debug('Analytics', '📊 Processing ${eventQueueRef.current.length} queued analytics events');
          }
          
          eventQueueRef.current.forEach(event => {
            try {
              analyticsService.current.track(event.name, event.properties);
            } catch (error) {
              EventLogger.warn('Analytics', 'Failed to process queued event:', error);
            }
          });
          eventQueueRef.current = [];
        }

        // Track app opened event after analytics is fully ready
        analyticsService.current.track(ANALYTICS_EVENTS.APP_OPENED, {
          app_version: '1.0.0',
          platform: 'mobile',
          environment: config.environment,
        });
        
      } catch (error) {
        EventLogger.error('Analytics', '❌ Failed to initialize analytics services:', error as Error);
        // Don't break the app if analytics fails
      }
    }, 500); // Defer for 500ms to allow critical app startup to complete

    return () => clearTimeout(timeoutId);
  }, [config]);

  // Setup app state handling
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        track(ANALYTICS_EVENTS.APP_FOREGROUNDED, {
          session_duration: Date.now() - sessionStartTime.current,
        });
        EventLogger.info('AnalyticsContext', 'App foregrounded');
      } else if (previousAppState === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        track(ANALYTICS_EVENTS.APP_BACKGROUNDED, {
          session_duration: Date.now() - sessionStartTime.current,
        });
        EventLogger.info('AnalyticsContext', 'App backgrounded');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Analytics functions
  const track = (eventName: string, properties?: Record<string, any>) => {
    if (!isInitialized) {
      EventLogger.warn('AnalyticsContext', 'Attempted to track event before initialization', { eventName });
      return;
    }

    // Queue events if analytics is not ready yet
    if (!isAnalyticsReady) {
      EventLogger.debug('AnalyticsContext', `Queuing event until analytics is ready: ${eventName}`);
      eventQueueRef.current.push({ name: eventName, properties });
      return;
    }

    try {
      analyticsService.current.track(eventName, {
        timestamp: new Date().toISOString(),
        current_screen: currentScreen,
        ...properties,
      });
      
      EventLogger.analyticsEvent(eventName, properties);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to track event', error as Error, { eventName, properties });
    }
  };

  const trackScreen = (screenName: string, properties?: Record<string, any>) => {
    if (!isInitialized) return;

    try {
      // End previous screen render tracking
      if (currentScreen && screenStartTimes.current.has(currentScreen)) {
        const startTime = screenStartTimes.current.get(currentScreen)!;
        const renderTime = Date.now() - startTime;
        PerformanceMonitor.endScreenRender(currentScreen, { render_time: renderTime });
        screenStartTimes.current.delete(currentScreen);
      }

      // Start new screen render tracking
      screenStartTimes.current.set(screenName, Date.now());
      PerformanceMonitor.startScreenRender(screenName);

      // Update current screen
      setCurrentScreen(screenName);
      CrashReporter.setCurrentScreen(screenName, properties);

      // Track screen view
      analyticsService.current.trackScreen(screenName, properties);
      
      // Add breadcrumb
      CrashReporter.addBreadcrumb({
        category: 'navigation',
        message: `Navigated to ${screenName}`,
        level: 'info',
        data: properties,
      });

      EventLogger.info('AnalyticsContext', `Screen viewed: ${screenName}`, properties);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to track screen', error as Error, { screenName, properties });
    }
  };

  const identify = async (userId: string, properties?: UserProperties) => {
    if (!isInitialized) return;

    try {
      await analyticsService.current.identify(userId, properties);
      CrashReporter.setUser(userId, properties);
      EventLogger.setUser(userId, properties);
      
      setHasConsent(true); // Assume consent if user is identified
      
      EventLogger.info('AnalyticsContext', 'User identified', { userId });
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to identify user', error as Error, { userId });
    }
  };

  const setUserProperties = async (properties: UserProperties) => {
    if (!isInitialized) return;

    try {
      await analyticsService.current.setUserProperties(properties);
      EventLogger.info('AnalyticsContext', 'User properties updated', properties);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to set user properties', error as Error, { properties });
    }
  };

  const reset = async () => {
    if (!isInitialized) return;

    try {
      await analyticsService.current.reset();
      CrashReporter.clearUser();
      EventLogger.clearUser();
      setHasConsent(false);
      setCurrentScreen(undefined);
      
      EventLogger.info('AnalyticsContext', 'Analytics context reset');
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to reset analytics', error as Error);
    }
  };

  const setConsent = async (consent: { analytics?: boolean; performance?: boolean; marketing?: boolean }) => {
    if (!isInitialized) return;

    try {
      await analyticsService.current.setConsent(consent);
      setHasConsent(consent.analytics ?? false);
      
      track(ANALYTICS_EVENTS.USER_PROFILE_UPDATED, {
        consent_updated: true,
        analytics_consent: consent.analytics,
        performance_consent: consent.performance,
        marketing_consent: consent.marketing,
      });
      
      EventLogger.info('AnalyticsContext', 'User consent updated', consent);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to set consent', error as Error, { consent });
    }
  };

  // Performance monitoring functions
  const startScreenRender = (screenName: string) => {
    if (!isInitialized) return;
    
    try {
      PerformanceMonitor.startScreenRender(screenName);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to start screen render tracking', error as Error, { screenName });
    }
  };

  const endScreenRender = (screenName: string, context?: Record<string, any>) => {
    if (!isInitialized) return;
    
    try {
      PerformanceMonitor.endScreenRender(screenName, context);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to end screen render tracking', error as Error, { screenName });
    }
  };

  const startApiCall = (requestId: string, endpoint: string, method: string) => {
    if (!isInitialized) return;
    
    try {
      PerformanceMonitor.startApiCall(requestId, endpoint, method);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to start API call tracking', error as Error, { requestId, endpoint, method });
    }
  };

  const endApiCall = (requestId: string, endpoint: string, method: string, statusCode: number, error?: Error) => {
    if (!isInitialized) return;
    
    try {
      PerformanceMonitor.endApiCall(requestId, endpoint, method, statusCode, error);
      
      // Also report to crash reporter if it's an error
      if (error) {
        CrashReporter.reportNetworkError(endpoint, method, statusCode, error);
      }
    } catch (trackingError) {
      EventLogger.error('AnalyticsContext', 'Failed to end API call tracking', trackingError as Error, { requestId, endpoint, method, statusCode });
    }
  };

  const trackCustomMetric = (name: string, value: number, unit: string, context?: Record<string, any>) => {
    if (!isInitialized) return;
    
    try {
      PerformanceMonitor.trackCustomMetric(name, value, unit as any, context);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to track custom metric', error as Error, { name, value, unit });
    }
  };

  // Error reporting functions
  const reportError = (error: Error, context?: Record<string, any>, severity?: 'low' | 'medium' | 'high' | 'critical') => {
    if (!isInitialized) return;
    
    try {
      CrashReporter.reportError(error, {
        current_screen: currentScreen,
        ...context,
      }, severity);
      
      // Also track as analytics event for serious errors
      if (severity === 'high' || severity === 'critical') {
        track(ANALYTICS_EVENTS.ERROR_OCCURRED, {
          error_name: error.name,
          error_message: error.message,
          severity,
          current_screen: currentScreen,
        });
      }
    } catch (reportingError) {
      EventLogger.error('AnalyticsContext', 'Failed to report error', reportingError as Error, { error: error.message, severity });
    }
  };

  const addBreadcrumb = (breadcrumb: Omit<Breadcrumb, 'timestamp'>) => {
    if (!isInitialized) return;
    
    try {
      CrashReporter.addBreadcrumb(breadcrumb);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to add breadcrumb', error as Error, { breadcrumb });
    }
  };

  const trackUserAction = (action: Omit<UserAction, 'timestamp'>) => {
    if (!isInitialized) return;
    
    try {
      CrashReporter.trackUserAction(action);
      
      // Also track as analytics event for important actions
      if (action.type === 'click' || action.type === 'navigation') {
        track(ANALYTICS_EVENTS.BUTTON_PRESSED, {
          action_type: action.type,
          target: action.target,
          current_screen: currentScreen,
          ...action.data,
        });
      }
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to track user action', error as Error, { action });
    }
  };

  const updateCurrentScreen = (screenName: string, params?: Record<string, any>) => {
    if (!isInitialized) return;
    
    try {
      CrashReporter.setCurrentScreen(screenName, params);
      setCurrentScreen(screenName);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to set current screen', error as Error, { screenName, params });
    }
  };

  const addContext = (key: string, value: any) => {
    if (!isInitialized) return;
    
    try {
      CrashReporter.addContext(key, value);
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to add context', error as Error, { key, value });
    }
  };

  const flush = async (): Promise<void> => {
    if (!isInitialized) {
      EventLogger.warn('AnalyticsContext', 'Cannot flush - analytics context not initialized');
      return;
    }
    
    try {
      const flushResults = await Promise.allSettled([
        // Flush performance monitor if enabled
        ...(config.enablePerformanceMonitoring === true ? [PerformanceMonitor.flush()] : []),
        // Flush crash reporter if enabled
        ...(config.enableCrashReporting !== false ? [CrashReporter.flush()] : [])
      ]);
      
      // Log results for each flush operation
      const failures: string[] = [];
      flushResults.forEach((result, index) => {
        const serviceName = index === 0 && config.enablePerformanceMonitoring === true ? 'PerformanceMonitor' : 'CrashReporter';
        
        if (result.status === 'rejected') {
          const errorMsg = `${serviceName}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`;
          failures.push(errorMsg);
          EventLogger.error('AnalyticsContext', `${serviceName} flush failed`, {
            error: result.reason,
            serviceName
          } as any);
        } else {
          EventLogger.debug('AnalyticsContext', `${serviceName} flush completed successfully`);
        }
      });
      
      if (failures.length === 0) {
        EventLogger.info('AnalyticsContext', 'All analytics services flushed successfully', {
          flushedServices: [
            ...(config.enablePerformanceMonitoring === true ? ['PerformanceMonitor'] : []),
            ...(config.enableCrashReporting !== false ? ['CrashReporter'] : [])
          ]
        });
      } else {
        EventLogger.warn('AnalyticsContext', 'Some analytics services failed to flush', {
          failures,
          failureCount: failures.length,
          totalServices: flushResults.length
        });
      }
    } catch (error) {
      EventLogger.error('AnalyticsContext', 'Failed to flush analytics services', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      } as any);
    }
  };

  const contextValue: AnalyticsContextValue = {
    // Analytics
    track,
    trackScreen,
    identify,
    setUserProperties,
    reset,
    setConsent,
    
    // Performance Monitoring
    startScreenRender,
    endScreenRender,
    startApiCall,
    endApiCall,
    trackCustomMetric,
    
    // Error Reporting
    reportError,
    addBreadcrumb,
    trackUserAction,
    setCurrentScreen: updateCurrentScreen,
    addContext,
    
    // System
    flush,
    
    // State
    isInitialized,
    hasConsent,
    currentScreen,
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};

// Custom hooks
export const useAnalytics = (): AnalyticsContextValue => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

export const useTrackEvent = () => {
  const { track } = useAnalytics();
  return track;
};

export const useTrackScreen = () => {
  const { trackScreen } = useAnalytics();
  return trackScreen;
};

export const usePerformanceTracking = () => {
  const { startScreenRender, endScreenRender, startApiCall, endApiCall, trackCustomMetric } = useAnalytics();
  return { startScreenRender, endScreenRender, startApiCall, endApiCall, trackCustomMetric };
};

export const useErrorReporting = () => {
  const { reportError, addBreadcrumb, trackUserAction } = useAnalytics();
  return { reportError, addBreadcrumb, trackUserAction };
};

// Higher-order component for automatic screen tracking
export const withAnalyticsScreen = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const { trackScreen } = useAnalytics();
    
    useEffect(() => {
      trackScreen(screenName, props as any);
    }, []);
    
    return <WrappedComponent {...props} ref={ref} />;
  });
};

// Hook for automatic screen tracking
export const useScreenTracking = (screenName: string, params?: Record<string, any>) => {
  const { trackScreen } = useAnalytics();
  
  useEffect(() => {
    trackScreen(screenName, params);
  }, [screenName, params]);
};

// Hook for automatic performance tracking of async operations
export const usePerformanceTimer = () => {
  const { trackCustomMetric } = useAnalytics();
  
  return {
    time<T>(name: string, operation: () => Promise<T>, context?: Record<string, any>): Promise<T> {
      return (async () => {
        const startTime = Date.now();
        try {
          const result = await operation();
          const duration = Date.now() - startTime;
          trackCustomMetric(name, duration, 'ms', { success: true, ...context });
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          trackCustomMetric(name, duration, 'ms', { success: false, error: (error as Error).message, ...context });
          throw error;
        }
      })();
    }
  };
};

// Hook for automatic error boundary integration
export const useErrorBoundary = () => {
  const { reportError } = useAnalytics();
  
  return {
    captureError: (error: Error, errorInfo?: { componentStack?: string }) => {
      reportError(error, {
        error_boundary: true,
        component_stack: errorInfo?.componentStack,
      }, 'high');
    }
  };
};

// Utility function to generate request IDs
export const generateRequestId = (): string => {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Constants for easy access
export { ANALYTICS_EVENTS, SCREEN_NAMES, USER_PROPERTIES };