/**
 * AnalyticsContext - Analytics Provider for the app
 * Manages analytics tracking and performance monitoring
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { EventLogger } from '../utils/EventLogger';

interface AnalyticsConfig {
  environment: 'development' | 'production';
  debugMode: boolean;
  enableCrashReporting: boolean;
  enablePerformanceMonitoring: boolean;
}

interface AnalyticsContextType {
  track: (event: string, properties?: Record<string, any>) => void;
  identify: (userId: string, traits?: Record<string, any>) => void;
  screen: (name: string, properties?: Record<string, any>) => void;
  timing: (category: string, value: number, properties?: Record<string, any>) => void;
  error: (error: Error, context?: Record<string, any>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  track: () => {},
  identify: () => {},
  screen: () => {},
  timing: () => {},
  error: () => {},
});

export const useAnalytics = () => useContext(AnalyticsContext);

interface AnalyticsProviderProps {
  children: React.ReactNode;
  config: AnalyticsConfig;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children, config }) => {
  const isInitialized = useRef(false);
  const sessionStartTime = useRef(Date.now());

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      EventLogger.info('Analytics', 'Analytics initialized', {
        environment: config.environment,
        debugMode: config.debugMode,
        crashReporting: config.enableCrashReporting,
        performanceMonitoring: config.enablePerformanceMonitoring,
      });

      // Track session start
      track('session_start', {
        timestamp: new Date().toISOString(),
        environment: config.environment,
      });
    }

    // Track session end on unmount
    return () => {
      const sessionDuration = Date.now() - sessionStartTime.current;
      track('session_end', {
        duration: sessionDuration,
        timestamp: new Date().toISOString(),
      });
    };
  }, [config]);

  const track = (event: string, properties?: Record<string, any>) => {
    if (config.debugMode) {
      EventLogger.debug('Analytics', `Track: ${event}`, properties);
    }

    // In production, this would send to analytics service
    // For now, just log in development
    if (config.environment === 'production' && !config.debugMode) {
      // TODO: Send to analytics service (e.g., Mixpanel, Amplitude, etc.)
    }
  };

  const identify = (userId: string, traits?: Record<string, any>) => {
    if (config.debugMode) {
      EventLogger.debug('Analytics', `Identify: ${userId}`, traits);
    }

    // In production, this would identify user in analytics service
    if (config.environment === 'production') {
      // TODO: Identify user in analytics service
    }
  };

  const screen = (name: string, properties?: Record<string, any>) => {
    if (config.debugMode) {
      EventLogger.debug('Analytics', `Screen: ${name}`, properties);
    }

    // Track screen views
    track('screen_view', {
      screen_name: name,
      ...properties,
    });
  };

  const timing = (category: string, value: number, properties?: Record<string, any>) => {
    if (config.debugMode) {
      EventLogger.debug('Analytics', `Timing: ${category}`, { value, ...properties });
    }

    // Track performance timing
    track('timing', {
      category,
      value,
      ...properties,
    });
  };

  const error = (error: Error, context?: Record<string, any>) => {
    EventLogger.error('Analytics', 'Error tracked:', error, context);

    // Track errors
    track('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });

    // Report to crash reporting service if enabled
    if (config.enableCrashReporting) {
      // TODO: Send to crash reporting service (e.g., Sentry, Bugsnag)
    }
  };

  const value: AnalyticsContextType = {
    track,
    identify,
    screen,
    timing,
    error,
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export default AnalyticsContext;