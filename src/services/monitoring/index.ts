/**
 * Monitoring Services - Centralized exports for crash reporting and performance monitoring
 */

// Crash Reporter
export { 
  CrashReporter,
  reportError,
  addBreadcrumb,
  trackUserAction,
  setCurrentScreen,
  addContext,
} from './CrashReporter';

export type { 
  ErrorReport,
  Breadcrumb,
  UserAction,
  CrashReporterConfig 
} from './CrashReporter';

// Performance Monitor
export { 
  PerformanceMonitor,
  startScreenRender,
  endScreenRender,
  startApiCall,
  endApiCall,
  trackCustomMetric,
} from './PerformanceMonitor';

export type { 
  PerformanceMetric,
  PerformanceSummary,
  PerformanceAlert,
  PerformanceConfig 
} from './PerformanceMonitor';

// Re-export common functions for convenience
import { CrashReporter } from './CrashReporter';
import { PerformanceMonitor } from './PerformanceMonitor';
import { EventLogger } from '../../utils/EventLogger';

/**
 * Initialize all monitoring services
 */
export const initializeMonitoring = async (config: {
  crashReporting?: {
    enabled?: boolean;
    environment?: string;
    apiKey?: string;
  };
  performance?: {
    enabled?: boolean;
    sampleRate?: number;
  };
} = {}) => {
  try {
    // Initialize crash reporter
    if (config.crashReporting?.enabled !== false) {
      await CrashReporter.initialize({
        enabled: true,
        environment: config.crashReporting?.environment || (__DEV__ ? 'development' : 'production'),
        apiKey: config.crashReporting?.apiKey,
      });
    }

    // Initialize performance monitor
    if (config.performance?.enabled !== false) {
      await PerformanceMonitor.initialize();
    }

    EventLogger.debug('index', '✅ Monitoring services initialized successfully');
  } catch (error) {
    EventLogger.error('index', '❌ Failed to initialize monitoring services:', error as Error);
  }
};

/**
 * Shutdown all monitoring services
 */
export const shutdownMonitoring = async () => {
  try {
    await Promise.all([
      CrashReporter.shutdown(),
      PerformanceMonitor.shutdown(),
    ]);
    EventLogger.debug('index', '✅ Monitoring services shut down successfully');
  } catch (error) {
    EventLogger.error('index', '❌ Failed to shutdown monitoring services:', error as Error);
  }
};