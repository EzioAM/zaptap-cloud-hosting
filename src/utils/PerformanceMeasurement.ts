import { EventLogger } from './EventLogger';

/**
 * Performance measurement utilities for app launch time optimization
 * Provides tools to measure and verify launch time improvements
 */

export class PerformanceMeasurement {
  public static appStartTime: number = Date.now();
  public static measurementPoints: Map<string, number> = new Map();
  private static isInitialized = false;

  /**
   * Initialize performance measurement
   */
  public static initialize(): void {
    if (this.isInitialized) return;
    
    this.appStartTime = Date.now();
    this.measurementPoints.clear();
    this.measurementPoints.set('app_start', this.appStartTime);
    this.isInitialized = true;

    if (__DEV__) {
      // Only try to log if EventLogger is available
      try {
        EventLogger.debug('PerformanceMeasurement', '📊 Performance measurement initialized');
      } catch (error) {
        // EventLogger might not be ready yet, use console fallback
        console.debug('📊 Performance measurement initialized');
      }
    }
  }

  /**
   * Get detailed performance report with optimization benchmarks
   */
  public static getDetailedReport(): {
    totalLaunchTime: number;
    benchmarks: {
      target: number;
      current: number;
      improvement: number;
      status: 'excellent' | 'good' | 'needs_improvement';
    };
    breakdown: Array<{
      phase: string;
      duration: number;
      percentage: number;
    }>;
  } {
    const totalLaunchTime = this.getAppLaunchTime();
    const target = 2000; // 2 second target
    const improvement = target - totalLaunchTime;
    
    let status: 'excellent' | 'good' | 'needs_improvement' = 'needs_improvement';
    if (totalLaunchTime < 1500) status = 'excellent';
    else if (totalLaunchTime < 2000) status = 'good';

    // Calculate phase breakdown
    const phases = [
      { name: 'Bootstrap', start: 'app_bootstrap_start', end: 'services_loaded' },
      { name: 'Services Init', start: 'services_loaded', end: 'app_initialization_complete' },
      { name: 'First Render', start: 'app_render_start', end: 'app_initialization_complete' },
    ];

    const breakdown = phases.map(phase => {
      const duration = this.getTimeBetween(phase.start, phase.end) || 0;
      return {
        phase: phase.name,
        duration,
        percentage: totalLaunchTime > 0 ? Math.round((duration / totalLaunchTime) * 100) : 0,
      };
    });

    return {
      totalLaunchTime,
      benchmarks: {
        target,
        current: totalLaunchTime,
        improvement,
        status,
      },
      breakdown,
    };
  }

  /**
   * Get time between two measurement points
   */
  public static getTimeBetween(startPoint: string, endPoint: string): number | null {
    const start = this.measurementPoints.get(startPoint);
    const end = this.measurementPoints.get(endPoint);
    
    if (!start || !end) return null;
    return end - start;
  }

  /**
   * Mark a performance point
   */
  public static mark(pointName: string): void {
    const now = Date.now();
    this.measurementPoints.set(pointName, now);
    
    if (__DEV__) {
      const elapsed = now - this.appStartTime;
      try {
        EventLogger.debug('PerformanceMeasurement', `📊 Performance mark: ${pointName} at ${elapsed}ms`);
      } catch (error) {
        console.debug(`📊 Performance mark: ${pointName} at ${elapsed}ms`);
      }
    }
  }

  /**
   * Measure time between two points
   */
  public static measure(
    name: string,
    startPoint: string,
    endPoint: string
  ): number | null {
    const start = this.measurementPoints.get(startPoint);
    const end = this.measurementPoints.get(endPoint);
    
    if (!start || !end) {
      try {
        EventLogger.warn('PerformanceMeasurement', `Performance measurement failed: missing points ${startPoint} or ${endPoint}`);
      } catch (error) {
        console.warn(`Performance measurement failed: missing points ${startPoint} or ${endPoint}`);
      }
      return null;
    }

    const duration = end - start;
    
    if (__DEV__) {
      try {
        EventLogger.debug('PerformanceMeasurement', `📊 Performance measure: ${name} = ${duration}ms`);
      } catch (error) {
        console.debug(`📊 Performance measure: ${name} = ${duration}ms`);
      }
    }
    
    return duration;
  }

  /**
   * Get total app launch time
   */
  public static getAppLaunchTime(): number {
    const now = Date.now();
    return now - this.appStartTime;
  }

  /**
   * Check if launch time exceeds threshold
   */
  public static checkLaunchTimeThreshold(thresholdMs: number = 2000): {
    passed: boolean;
    launchTime: number;
    threshold: number;
  } {
    const launchTime = this.getAppLaunchTime();
    const passed = launchTime <= thresholdMs;
    
    if (__DEV__) {
      const status = passed ? '✅' : '❌';
      try {
        EventLogger.debug('PerformanceMeasurement', `${status} Launch time check: ${launchTime}ms (threshold: ${thresholdMs}ms)`);
      } catch (error) {
        console.debug(`${status} Launch time check: ${launchTime}ms (threshold: ${thresholdMs}ms)`);
      }
    }
    
    return {
      passed,
      launchTime,
      threshold: thresholdMs,
    };
  }

  /**
   * Get performance summary
   */
  public static getSummary(): {
    appLaunchTime: number;
    measurementPoints: Record<string, number>;
    relativeTimes: Record<string, number>;
  } {
    const points: Record<string, number> = {};
    const relativeTimes: Record<string, number> = {};

    this.measurementPoints.forEach((time, name) => {
      points[name] = time;
      relativeTimes[name] = time - this.appStartTime;
    });

    return {
      appLaunchTime: this.getAppLaunchTime(),
      measurementPoints: points,
      relativeTimes,
    };
  }

  /**
   * Reset all measurements
   */
  public static reset(): void {
    this.appStartTime = Date.now();
    this.measurementPoints.clear();
    this.measurementPoints.set('app_start', this.appStartTime);
    
    if (__DEV__) {
      try {
        EventLogger.debug('PerformanceMeasurement', '📊 Performance measurements reset');
      } catch (error) {
        console.debug('📊 Performance measurements reset');
      }
    }
  }

  /**
   * Export measurements as JSON for analysis
   */
  public static exportMeasurements(): string {
    const summary = this.getSummary();
    return JSON.stringify(summary, null, 2);
  }

  /**
   * Track component mount time
   */
  public static trackComponentMount(componentName: string): () => void {
    const startTime = Date.now();
    this.mark(`${componentName}_mount_start`);

    return () => {
      const endTime = Date.now();
      this.mark(`${componentName}_mount_end`);
      const mountTime = endTime - startTime;
      
      if (__DEV__) {
        try {
          EventLogger.debug('PerformanceMeasurement', `📊 Component ${componentName} mounted in ${mountTime}ms`);
        } catch (error) {
          console.debug(`📊 Component ${componentName} mounted in ${mountTime}ms`);
        }
      }
    };
  }

  /**
   * Track async operation time
   */
  public static async trackAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.mark(`${operationName}_start`);

    try {
      const result = await operation();
      const endTime = Date.now();
      this.mark(`${operationName}_end`);
      const duration = endTime - startTime;
      
      if (__DEV__) {
        try {
          EventLogger.debug('PerformanceMeasurement', `📊 Async operation ${operationName} completed in ${duration}ms`);
        } catch (error) {
          console.debug(`📊 Async operation ${operationName} completed in ${duration}ms`);
        }
      }
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      this.mark(`${operationName}_error`);
      const duration = endTime - startTime;
      
      if (__DEV__) {
        try {
          EventLogger.debug('PerformanceMeasurement', `📊 Async operation ${operationName} failed after ${duration}ms`);
        } catch (error) {
          console.debug(`📊 Async operation ${operationName} failed after ${duration}ms`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Create a performance-aware setTimeout
   */
  public static performanceTimeout(
    callback: () => void,
    delay: number,
    name?: string
  ): NodeJS.Timeout {
    const startTime = Date.now();
    if (name) {
      this.mark(`timeout_${name}_scheduled`);
    }

    return setTimeout(() => {
      const actualDelay = Date.now() - startTime;
      if (name) {
        this.mark(`timeout_${name}_executed`);
        if (__DEV__ && Math.abs(actualDelay - delay) > 10) {
          try {
            EventLogger.debug('PerformanceMeasurement', `📊 Timeout ${name}: scheduled ${delay}ms, actual ${actualDelay}ms`);
          } catch (error) {
            console.debug(`📊 Timeout ${name}: scheduled ${delay}ms, actual ${actualDelay}ms`);
          }
        }
      }
      callback();
    }, delay);
  }

  /**
   * Measure render performance
   */
  public static measureRender(componentName: string): {
    start: () => void;
    end: () => number;
  } {
    let startTime: number;

    return {
      start: () => {
        startTime = Date.now();
        this.mark(`render_${componentName}_start`);
      },
      end: () => {
        const endTime = Date.now();
        this.mark(`render_${componentName}_end`);
        const renderTime = endTime - startTime;
        
        if (__DEV__) {
          try {
            EventLogger.debug('PerformanceMeasurement', `📊 Render ${componentName}: ${renderTime}ms`);
          } catch (error) {
            console.debug(`📊 Render ${componentName}: ${renderTime}ms`);
          }
        }
        
        return renderTime;
      },
    };
  }
}

/**
 * Performance measurement hook for React components
 */
export const usePerformanceTracking = (componentName: string) => {
  const cleanup = PerformanceMeasurement.trackComponentMount(componentName);
  
  return {
    mark: (pointName: string) => PerformanceMeasurement.mark(`${componentName}_${pointName}`),
    measure: (name: string, start: string, end: string) => 
      PerformanceMeasurement.measure(name, `${componentName}_${start}`, `${componentName}_${end}`),
    cleanup,
  };
};

/**
 * Performance measurement decorator for methods
 */
export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return PerformanceMeasurement.trackAsyncOperation(
        methodName,
        () => originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

// Initialize basic measurements without EventLogger on import
PerformanceMeasurement.appStartTime = Date.now();
PerformanceMeasurement.measurementPoints.set('app_start', PerformanceMeasurement.appStartTime);