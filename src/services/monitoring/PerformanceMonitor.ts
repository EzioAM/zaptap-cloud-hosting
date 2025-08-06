/**
 * PerformanceMonitor - Comprehensive app performance tracking service
 * Monitors app launch time, screen render time, API response times, memory usage, and more
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, InteractionManager } from 'react-native';
import { supabase } from '../supabase/client';
import { ANALYTICS_CONFIG } from '../../config/analytics';
import { EventLogger } from '../../utils/EventLogger';

export interface PerformanceMetric {
  id: string;
  timestamp: string;
  type: 'app_launch' | 'screen_render' | 'api_call' | 'memory_usage' | 'battery' | 'network' | 'custom';
  name: string;
  value: number;
  unit: 'ms' | 'mb' | 'percent' | 'count' | 'bytes' | 'fps';
  context?: {
    screen_name?: string;
    api_endpoint?: string;
    method?: string;
    status_code?: number;
    user_id?: string;
    session_id?: string;
    device_type?: string;
    os_version?: string;
    app_version?: string;
    network_type?: string;
    battery_level?: number;
    memory_pressure?: boolean;
    [key: string]: any;
  };
  tags?: Record<string, string>;
}

export interface PerformanceSummary {
  app_launch_time: {
    average: number;
    p50: number;
    p90: number;
    p99: number;
    samples: number;
  };
  screen_render_times: {
    [screenName: string]: {
      average: number;
      p90: number;
      samples: number;
    };
  };
  api_performance: {
    [endpoint: string]: {
      average_response_time: number;
      success_rate: number;
      error_rate: number;
      total_requests: number;
    };
  };
  memory_usage: {
    average: number;
    peak: number;
    warnings: number;
  };
  battery_impact: {
    average_drain: number;
    high_usage_events: number;
  };
  frame_rate: {
    average_fps: number;
    dropped_frames: number;
  };
}

export interface PerformanceAlert {
  id: string;
  timestamp: string;
  type: 'slow_launch' | 'slow_render' | 'slow_api' | 'memory_warning' | 'low_battery' | 'network_timeout' | 'frame_drops';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  context?: Record<string, any>;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;
  alertThresholds: {
    slowAppLaunch: number; // ms
    slowScreenRender: number; // ms
    slowApiResponse: number; // ms
    memoryUsagePercent: number; // percentage
    lowBatteryPercent: number; // percentage
    lowFpsThreshold: number; // fps
  };
  trackingEnabled: {
    appLaunch: boolean;
    screenRender: boolean;
    apiCalls: boolean;
    memoryUsage: boolean;
    batteryUsage: boolean;
    frameRate: boolean;
    networkLatency: boolean;
  };
}

class PerformanceMonitorService {
  private config: PerformanceConfig;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private isInitialized = false;
  private sessionId: string;
  private appStartTime: number;
  private screenStartTimes: Map<string, number> = new Map();
  private apiCallTimes: Map<string, number> = new Map();
  private memoryCheckInterval?: NodeJS.Timeout;
  private frameRateMonitor?: any;
  private metricQueue: PerformanceMetric[] = [];
  private isFlushingMetrics = false;
  private databaseAvailable = false;
  private databaseUnavailableLogged = false; // Track if we've already logged database unavailability

  // Storage keys
  private static readonly OFFLINE_METRICS_KEY = 'performance_metrics_offline';
  private static readonly OFFLINE_ALERTS_KEY = 'performance_alerts_offline';

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: ANALYTICS_CONFIG.performance.trackFPS,
      sampleRate: ANALYTICS_CONFIG.performance.sampleRate,
      alertThresholds: {
        slowAppLaunch: 3000, // 3 seconds
        slowScreenRender: 2000, // 2 seconds
        slowApiResponse: ANALYTICS_CONFIG.performance.slowThresholdMs,
        memoryUsagePercent: 80, // 80%
        lowBatteryPercent: 20, // 20%
        lowFpsThreshold: 50, // 50 FPS
      },
      trackingEnabled: {
        appLaunch: ANALYTICS_CONFIG.performance.trackAppLaunchTime,
        screenRender: ANALYTICS_CONFIG.performance.trackScreenRenderTime,
        apiCalls: ANALYTICS_CONFIG.performance.trackNetworkLatency,
        memoryUsage: ANALYTICS_CONFIG.performance.trackMemory,
        batteryUsage: true,
        frameRate: ANALYTICS_CONFIG.performance.trackFPS,
        networkLatency: ANALYTICS_CONFIG.performance.trackNetworkLatency,
      },
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.appStartTime = Date.now();
  }

  /**
   * Initialize performance monitoring
   */
  public async initialize(): Promise<void> {
    try {
      if (!this.config.enabled) {
        EventLogger.info('PerformanceMonitor', 'Performance monitoring disabled');
        this.isInitialized = true; // Mark as initialized even when disabled
        return;
      }

      // Initialize in batches to avoid blocking
      await Promise.resolve().then(() => {
        // Setup periodic memory monitoring
        if (this.config.trackingEnabled.memoryUsage) {
          this.setupMemoryMonitoring();
        }

        // Setup frame rate monitoring
        if (this.config.trackingEnabled.frameRate) {
          this.setupFrameRateMonitoring();
        }

        // Setup periodic metric flushing
        this.setupPeriodicFlush();
      });

      // Check database availability in background (only log once)
      this.checkDatabaseAvailability().catch(error => {
        if (!this.databaseUnavailableLogged) {
          EventLogger.warn('PerformanceMonitor', 'Database not available - metrics will be stored locally only', error as Error);
          this.databaseUnavailableLogged = true;
        }
        this.databaseAvailable = false;
      });

      // Load offline data in background
      this.loadOfflineData().catch(error => {
        EventLogger.error('PerformanceMonitor', 'Failed to load offline data', error as Error);
      });

      // Track app launch time
      if (this.config.trackingEnabled.appLaunch) {
        Promise.resolve().then(() => this.trackAppLaunchTime());
      }

      this.isInitialized = true;
      EventLogger.info('PerformanceMonitor', 'Performance monitoring initialized');
      
    } catch (error) {
      this.isInitialized = true; // Mark as initialized to prevent blocking
      EventLogger.error('PerformanceMonitor', 'Failed to initialize performance monitor', error as Error);
    }
  }

  /**
   * Check if the database is available and accessible
   */
  private async checkDatabaseAvailability(): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Test table access with INSERT capability (more comprehensive than SELECT)
      // Create a minimal test record to verify the table exists and we can write to it
      const testMetricId = `test-availability-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      const { error: insertError } = await supabase
        .from('performance_metrics')
        .insert({
          id: testMetricId,
          type: 'custom',
          name: 'database_availability_test',
          value: 1,
          unit: 'count',
          context: { test: true },
          tags: { test: 'availability_check' }
        });
      
      if (insertError) {
        // Handle specific error cases
        if (insertError.code === '42P01') {
          // Table does not exist
          EventLogger.warn('PerformanceMonitor', 'Performance metrics table does not exist', {
            suggestion: 'Run the SQL setup script: scripts/setup-monitoring-tables.sql'
          } as any);
        } else if (insertError.code === '42501') {
          // Permission denied
          EventLogger.warn('PerformanceMonitor', 'Permission denied for performance metrics table', {
            suggestion: 'Check RLS policies and authentication'
          } as any);
        } else {
          // Other database error
          EventLogger.warn('PerformanceMonitor', 'Performance metrics table not accessible', {
            tableError: insertError.message,
            code: insertError.code
          } as any);
        }
        
        this.databaseAvailable = false;
        throw new Error(`Table access error: ${insertError.message} (code: ${insertError.code})`);
      }

      // Clean up the test record
      await supabase
        .from('performance_metrics')
        .delete()
        .eq('id', testMetricId);

      this.databaseAvailable = true;
      EventLogger.info('PerformanceMonitor', 'Database available for metrics storage');
      
    } catch (error) {
      this.databaseAvailable = false;
      
      // Log specific guidance based on error type
      let message = 'Database not available - will store metrics locally';
      const errorDetails: any = {
        error: error instanceof Error ? error.message : String(error)
      };

      if (error instanceof Error) {
        if (error.message.includes('42P01') || error.message.includes('does not exist')) {
          message = 'Performance metrics table missing - run setup script to create tables';
          errorDetails.setupScript = 'scripts/setup-monitoring-tables.sql';
        } else if (error.message.includes('42501') || error.message.includes('permission')) {
          message = 'Database permission denied - check RLS policies';
        } else if (error.message.includes('not initialized')) {
          message = 'Supabase not configured - check environment variables';
        }
      }

      EventLogger.warn('PerformanceMonitor', message, errorDetails);
      throw error;
    }
  }

  /**
   * Track app launch time
   */
  private trackAppLaunchTime(): void {
    InteractionManager.runAfterInteractions(() => {
      const launchTime = Date.now() - this.appStartTime;
      
      this.trackMetric({
        type: 'app_launch',
        name: 'app_launch_time',
        value: launchTime,
        unit: 'ms',
        context: {
          platform: Platform.OS,
          os_version: Platform.Version.toString(),
        },
      });

      // Check for slow launch
      if (launchTime > this.config.alertThresholds.slowAppLaunch) {
        this.createAlert({
          type: 'slow_launch',
          severity: launchTime > this.config.alertThresholds.slowAppLaunch * 2 ? 'high' : 'medium',
          message: `App launch took ${launchTime}ms`,
          value: launchTime,
          threshold: this.config.alertThresholds.slowAppLaunch,
        });
      }

      EventLogger.performance('App', 'launch_time', launchTime, { platform: Platform.OS });
    });
  }

  /**
   * Start tracking screen render time
   */
  public startScreenRender(screenName: string): void {
    if (!this.shouldTrack() || !this.config.trackingEnabled.screenRender) return;

    const startTime = Date.now();
    this.screenStartTimes.set(screenName, startTime);

    EventLogger.debug('PerformanceMonitor', `Started tracking render for ${screenName}`);
  }

  /**
   * End tracking screen render time
   */
  public endScreenRender(screenName: string, additionalContext?: Record<string, any>): void {
    if (!this.shouldTrack() || !this.config.trackingEnabled.screenRender) return;

    const startTime = this.screenStartTimes.get(screenName);
    if (!startTime) {
      EventLogger.warn('PerformanceMonitor', `No start time found for screen ${screenName}`);
      return;
    }

    const renderTime = Date.now() - startTime;
    this.screenStartTimes.delete(screenName);

    this.trackMetric({
      type: 'screen_render',
      name: 'screen_render_time',
      value: renderTime,
      unit: 'ms',
      context: {
        screen_name: screenName,
        ...additionalContext,
      },
    });

    // Check for slow render
    if (renderTime > this.config.alertThresholds.slowScreenRender) {
      this.createAlert({
        type: 'slow_render',
        severity: renderTime > this.config.alertThresholds.slowScreenRender * 2 ? 'high' : 'medium',
        message: `Screen ${screenName} rendered in ${renderTime}ms`,
        value: renderTime,
        threshold: this.config.alertThresholds.slowScreenRender,
        context: { screen_name: screenName },
      });
    }

    EventLogger.performance('Screen', `render_${screenName}`, renderTime);
  }

  /**
   * Start tracking API call
   */
  public startApiCall(requestId: string, endpoint: string, method: string): void {
    if (!this.shouldTrack() || !this.config.trackingEnabled.apiCalls) return;

    const startTime = Date.now();
    this.apiCallTimes.set(requestId, startTime);

    EventLogger.debug('PerformanceMonitor', `Started tracking API call ${method} ${endpoint}`, { requestId });
  }

  /**
   * End tracking API call
   */
  public endApiCall(
    requestId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    error?: Error
  ): void {
    if (!this.shouldTrack() || !this.config.trackingEnabled.apiCalls) return;

    const startTime = this.apiCallTimes.get(requestId);
    if (!startTime) {
      EventLogger.warn('PerformanceMonitor', `No start time found for API call ${requestId}`);
      return;
    }

    const responseTime = Date.now() - startTime;
    this.apiCallTimes.delete(requestId);

    this.trackMetric({
      type: 'api_call',
      name: 'api_response_time',
      value: responseTime,
      unit: 'ms',
      context: {
        api_endpoint: endpoint,
        method,
        status_code: statusCode,
        success: !error && statusCode >= 200 && statusCode < 300,
        error_message: error?.message,
      },
    });

    // Check for slow API response
    if (responseTime > this.config.alertThresholds.slowApiResponse) {
      this.createAlert({
        type: 'slow_api',
        severity: responseTime > this.config.alertThresholds.slowApiResponse * 2 ? 'high' : 'medium',
        message: `API ${method} ${endpoint} responded in ${responseTime}ms`,
        value: responseTime,
        threshold: this.config.alertThresholds.slowApiResponse,
        context: { endpoint, method, status_code: statusCode },
      });
    }

    EventLogger.networkRequest(endpoint, method, statusCode, responseTime, error);
  }

  /**
   * Track custom performance metric
   */
  public trackCustomMetric(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'],
    context?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return;

    this.trackMetric({
      type: 'custom',
      name,
      value,
      unit,
      context,
    });

    EventLogger.performance('Custom', name, value, context);
  }

  /**
   * Track memory usage
   */
  public trackMemoryUsage(): void {
    if (!this.shouldTrack() || !this.config.trackingEnabled.memoryUsage) return;

    try {
      // In React Native, memory info is limited
      // You'd typically use a native module or react-native-device-info
      
      if (typeof (performance as any).memory !== 'undefined') {
        const memInfo = (performance as any).memory;
        const usedMemory = memInfo.usedJSHeapSize;
        const totalMemory = memInfo.totalJSHeapSize;
        const memoryPercent = (usedMemory / totalMemory) * 100;

        this.trackMetric({
          type: 'memory_usage',
          name: 'js_heap_usage',
          value: usedMemory,
          unit: 'bytes',
          context: {
            total_memory: totalMemory,
            usage_percent: memoryPercent,
            memory_pressure: memoryPercent > this.config.alertThresholds.memoryUsagePercent,
          },
        });

        // Check for memory warning
        if (memoryPercent > this.config.alertThresholds.memoryUsagePercent) {
          this.createAlert({
            type: 'memory_warning',
            severity: memoryPercent > 90 ? 'high' : 'medium',
            message: `Memory usage at ${memoryPercent.toFixed(1)}%`,
            value: memoryPercent,
            threshold: this.config.alertThresholds.memoryUsagePercent,
          });
        }
      }
    } catch (error) {
      EventLogger.error('PerformanceMonitor', 'Failed to track memory usage', error as Error);
    }
  }

  /**
   * Track battery level (would need native module)
   */
  public trackBatteryUsage(): void {
    if (!this.shouldTrack() || !this.config.trackingEnabled.batteryUsage) return;

    // In a real implementation, you'd use react-native-device-info
    // DeviceInfo.getBatteryLevel().then((batteryLevel) => {
    //   this.trackMetric({
    //     type: 'battery',
    //     name: 'battery_level',
    //     value: batteryLevel * 100,
    //     unit: 'percent',
    //   });
    //   
    //   if (batteryLevel * 100 < this.config.alertThresholds.lowBatteryPercent) {
    //     this.createAlert({
    //       type: 'low_battery',
    //       severity: 'medium',
    //       message: `Battery level at ${(batteryLevel * 100).toFixed(1)}%`,
    //       value: batteryLevel * 100,
    //       threshold: this.config.alertThresholds.lowBatteryPercent,
    //     });
    //   }
    // });
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): PerformanceSummary {
    const summary: PerformanceSummary = {
      app_launch_time: this.calculateStats(this.metrics.filter(m => m.name === 'app_launch_time')),
      screen_render_times: this.groupScreenRenderStats(),
      api_performance: this.groupApiPerformanceStats(),
      memory_usage: this.calculateMemoryStats(),
      battery_impact: this.calculateBatteryStats(),
      frame_rate: this.calculateFrameRateStats(),
    };

    return summary;
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit: number = 20): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Clear all metrics and alerts
   */
  public clearData(): void {
    this.metrics = [];
    this.alerts = [];
    EventLogger.info('PerformanceMonitor', 'Performance data cleared');
  }

  /**
   * Export performance data
   */
  public exportData(): { metrics: PerformanceMetric[], alerts: PerformanceAlert[] } {
    return {
      metrics: [...this.metrics],
      alerts: [...this.alerts],
    };
  }

  /**
   * Track a performance metric internally
   */
  private trackMetric(metricData: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const metric: PerformanceMetric = {
      id: this.generateMetricId(),
      timestamp: new Date().toISOString(),
      context: {
        session_id: this.sessionId,
        ...metricData.context,
      },
      ...metricData,
    };

    this.metrics.push(metric);
    this.metricQueue.push(metric);

    // Maintain metrics limit
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Auto-flush if queue is full
    if (this.metricQueue.length >= 50) {
      this.flushMetrics();
    }
  }

  /**
   * Create a performance alert
   */
  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp'>): void {
    const alert: PerformanceAlert = {
      id: this.generateAlertId(),
      timestamp: new Date().toISOString(),
      ...alertData,
    };

    this.alerts.push(alert);

    // Maintain alerts limit
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Store alert offline if database is not available
    if (!this.databaseAvailable) {
      this.storeOfflineAlerts([alert]).catch(error => {
        EventLogger.error('PerformanceMonitor', 'Failed to store alert offline', error as Error);
      });
    }

    EventLogger.warn('PerformanceMonitor', `Performance alert: ${alert.message}`, {
      type: alert.type,
      severity: alert.severity,
      value: alert.value,
      threshold: alert.threshold,
    });
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(() => {
      this.trackMemoryUsage();
    }, 30000); // Every 30 seconds
  }

  /**
   * Setup frame rate monitoring
   */
  private setupFrameRateMonitoring(): void {
    // Frame rate monitoring would require a native module
    // This is a placeholder for the concept
    EventLogger.debug('PerformanceMonitor', 'Frame rate monitoring setup (requires native module)');
  }

  /**
   * Setup periodic metric flushing
   */
  private setupPeriodicFlush(): void {
    // Delay initial flush to ensure services are fully ready
    setTimeout(() => {
      setInterval(() => {
        if (this.isInitialized && this.config.enabled && this.metricQueue.length > 0) {
          EventLogger.debug('PerformanceMonitor', 'Periodic flush triggered', { queueLength: this.metricQueue.length });
          this.flushMetrics().catch(error => {
            EventLogger.error('PerformanceMonitor', 'Periodic flush failed', error as Error);
          });
        }
      }, 60000); // Flush every minute
    }, 5000); // Wait 5 seconds before starting periodic flush
  }

  /**
   * Flush metrics to backend
   */
  public async flush(): Promise<void> {
    if (!this.isInitialized) {
      EventLogger.warn('PerformanceMonitor', 'Cannot flush before initialization');
      return;
    }
    return this.flushMetrics();
  }

  /**
   * Flush metrics to backend (internal implementation)
   */
  private async flushMetrics(): Promise<void> {
    if (!this.config.enabled || !this.isInitialized || this.isFlushingMetrics || this.metricQueue.length === 0) {
      EventLogger.debug('PerformanceMonitor', 'Skipping flush', {
        enabled: this.config.enabled,
        initialized: this.isInitialized,
        flushing: this.isFlushingMetrics,
        queueLength: this.metricQueue.length
      });
      return;
    }

    // If database is not available, just store metrics offline and don't try to send
    if (!this.databaseAvailable) {
      const metrics = [...this.metricQueue];
      this.metricQueue = [];
      await this.storeOfflineMetrics(metrics);
      EventLogger.debug('PerformanceMonitor', 'Stored metrics offline - database not available', { count: metrics.length });
      return;
    }

    this.isFlushingMetrics = true;
    const metrics = [...this.metricQueue];
    this.metricQueue = [];

    try {
      await this.sendMetrics(metrics);
      EventLogger.info('PerformanceMonitor', 'Metrics flushed successfully', { count: metrics.length });
      
    } catch (error) {
      // Put metrics back in queue and store offline
      this.metricQueue.unshift(...metrics);
      await this.storeOfflineMetrics(metrics);
      
      // Log actual error details
      const errorDetails = {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        metricCount: metrics.length,
        isSupabaseError: error && typeof error === 'object' && 'code' in error,
        errorCode: error && typeof error === 'object' && 'code' in error ? (error as any).code : undefined
      };
      
      EventLogger.error('PerformanceMonitor', 'Failed to flush metrics - detailed error', errorDetails as any);
    } finally {
      this.isFlushingMetrics = false;
    }
  }

  /**
   * Send metrics to backend
   */
  private async sendMetrics(metrics: PerformanceMetric[]): Promise<void> {
    // Check if Supabase is properly configured
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Database availability is already checked in checkDatabaseAvailability()
    // No need to test again here since we only call this when databaseAvailable is true

    const errors: Error[] = [];
    const results = await Promise.allSettled(metrics.map(async (metric) => {
      try {
        const { error } = await supabase
          .from('performance_metrics')
          .insert({
            id: metric.id,
            timestamp: metric.timestamp,
            type: metric.type,
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            context: metric.context,
            tags: metric.tags,
          });

        if (error) {
          EventLogger.error('PerformanceMonitor', `Failed to insert metric ${metric.id}`, {
            supabaseError: error,
            errorCode: error.code,
            errorMessage: error.message,
            metricId: metric.id
          } as any);
          throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
        }
        
        return { success: true, metricId: metric.id };
      } catch (insertError) {
        EventLogger.error('PerformanceMonitor', `Database insert failed for metric ${metric.id}`, {
          error: insertError,
          metricId: metric.id
        } as any);
        throw insertError;
      }
    }));

    // Collect all errors from failed insertions
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        errors.push(new Error(`Metric ${metrics[index].id}: ${result.reason}`));
      }
    });

    // If any errors occurred, throw with details
    if (errors.length > 0) {
      const errorMessage = `Failed to send ${errors.length}/${metrics.length} performance metrics:\n${errors.map(e => e.message).join('\n')}`;
      EventLogger.error('PerformanceMonitor', 'Batch send failed with detailed errors', {
        failedCount: errors.length,
        totalCount: metrics.length,
        errors: errors.map(e => ({ name: e.name, message: e.message, stack: e.stack }))
      } as any);
      throw new Error(errorMessage);
    }
  }

  /**
   * Load offline data (metrics and alerts)
   */
  private async loadOfflineData(): Promise<void> {
    try {
      const [offlineMetrics, offlineAlerts] = await AsyncStorage.multiGet([
        PerformanceMonitorService.OFFLINE_METRICS_KEY,
        PerformanceMonitorService.OFFLINE_ALERTS_KEY,
      ]);

      let loadedMetrics = 0;
      let loadedAlerts = 0;

      if (offlineMetrics[1]) {
        const metrics: PerformanceMetric[] = JSON.parse(offlineMetrics[1]);
        
        // Clean up old metrics (older than 24 hours) and limit to most recent 100
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const recentMetrics = metrics
          .filter(m => m.timestamp > oneDayAgo)
          .slice(-100); // Keep only the most recent 100
        
        this.metricQueue.unshift(...recentMetrics);
        loadedMetrics = recentMetrics.length;
        await AsyncStorage.removeItem(PerformanceMonitorService.OFFLINE_METRICS_KEY);
        
        if (metrics.length !== recentMetrics.length) {
          EventLogger.debug('PerformanceMonitor', `Cleaned up ${metrics.length - recentMetrics.length} old/excess metrics`);
        }
      }

      if (offlineAlerts[1]) {
        const alerts: PerformanceAlert[] = JSON.parse(offlineAlerts[1]);
        
        // Limit alerts to most recent 50
        const recentAlerts = alerts.slice(-50);
        
        this.alerts.unshift(...recentAlerts);
        loadedAlerts = recentAlerts.length;
        await AsyncStorage.removeItem(PerformanceMonitorService.OFFLINE_ALERTS_KEY);
        
        if (alerts.length !== recentAlerts.length) {
          EventLogger.debug('PerformanceMonitor', `Trimmed alerts from ${alerts.length} to ${recentAlerts.length}`);
        }
      }

      if (loadedMetrics > 0 || loadedAlerts > 0) {
        EventLogger.info('PerformanceMonitor', 'Loaded offline performance data', { 
          metricsLoaded: loadedMetrics, 
          alertsLoaded: loadedAlerts 
        });

        // Try to sync loaded data when database becomes available
        if (this.databaseAvailable) {
          this.syncOfflineData().catch(error => {
            EventLogger.error('PerformanceMonitor', 'Failed to sync offline data immediately', error as Error);
          });
        }
      }
    } catch (error) {
      // Handle oversized data error specifically
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && 
          error.message.includes('Row too big')) {
        EventLogger.warn('PerformanceMonitor', 'Offline data too large, clearing data', { error: error.message });
        await this.clearOversizedOfflineData();
        this.metricQueue = [];
        this.alerts = [];
      } else {
        EventLogger.error('PerformanceMonitor', 'Failed to load offline data', error as Error);
      }
    }
  }

  /**
   * Clear oversized offline data when it cannot be loaded
   */
  private async clearOversizedOfflineData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        PerformanceMonitorService.OFFLINE_METRICS_KEY,
        PerformanceMonitorService.OFFLINE_ALERTS_KEY,
      ]);
      EventLogger.info('PerformanceMonitor', 'Cleared oversized offline data');
    } catch (error) {
      EventLogger.error('PerformanceMonitor', 'Failed to clear offline data', error as Error);
    }
  }

  /**
   * Store metrics offline
   */
  private async storeOfflineMetrics(metrics: PerformanceMetric[]): Promise<void> {
    try {
      // Get existing offline metrics to append to
      const existingData = await AsyncStorage.getItem(PerformanceMonitorService.OFFLINE_METRICS_KEY);
      const existingMetrics = existingData ? JSON.parse(existingData) : [];
      
      // Combine with new metrics
      const allMetrics = [...existingMetrics, ...metrics];
      
      // Limit offline storage to prevent storage bloat (keep last 100 metrics to avoid cursor overflow)
      const maxOfflineMetrics = 100;
      if (allMetrics.length > maxOfflineMetrics) {
        allMetrics.splice(0, allMetrics.length - maxOfflineMetrics);
        EventLogger.debug('PerformanceMonitor', `Trimmed offline metrics to ${maxOfflineMetrics} most recent`);
      }
      
      // Check size before storing (rough estimate: 2KB per metric max)
      const estimatedSize = JSON.stringify(allMetrics).length;
      if (estimatedSize > 200000) { // ~200KB limit
        // Keep only the most recent 50 if still too large
        allMetrics.splice(0, allMetrics.length - 50);
        EventLogger.warn('PerformanceMonitor', 'Offline metrics too large, reduced to 50 most recent');
      }
      
      await AsyncStorage.setItem(
        PerformanceMonitorService.OFFLINE_METRICS_KEY,
        JSON.stringify(allMetrics)
      );
      
      EventLogger.info('PerformanceMonitor', 'Stored metrics offline', { 
        newCount: metrics.length, 
        totalStored: allMetrics.length 
      });
    } catch (error) {
      EventLogger.error('PerformanceMonitor', 'Failed to store offline metrics', error as Error);
    }
  }

  /**
   * Store alerts offline
   */
  private async storeOfflineAlerts(alerts: PerformanceAlert[]): Promise<void> {
    try {
      // Get existing offline alerts to append to
      const existingData = await AsyncStorage.getItem(PerformanceMonitorService.OFFLINE_ALERTS_KEY);
      const existingAlerts = existingData ? JSON.parse(existingData) : [];
      
      // Combine with new alerts
      const allAlerts = [...existingAlerts, ...alerts];
      
      // Limit offline storage to prevent storage bloat (keep last 50 alerts to avoid cursor overflow)
      const maxOfflineAlerts = 50;
      if (allAlerts.length > maxOfflineAlerts) {
        allAlerts.splice(0, allAlerts.length - maxOfflineAlerts);
        EventLogger.debug('PerformanceMonitor', `Trimmed offline alerts to ${maxOfflineAlerts} most recent`);
      }
      
      // Check size before storing (rough estimate: 3KB per alert max)
      const estimatedSize = JSON.stringify(allAlerts).length;
      if (estimatedSize > 150000) { // ~150KB limit
        // Keep only the most recent 25 if still too large
        allAlerts.splice(0, allAlerts.length - 25);
        EventLogger.warn('PerformanceMonitor', 'Offline alerts too large, reduced to 25 most recent');
      }
      
      await AsyncStorage.setItem(
        PerformanceMonitorService.OFFLINE_ALERTS_KEY,
        JSON.stringify(allAlerts)
      );
      
      EventLogger.info('PerformanceMonitor', 'Stored alerts offline', { 
        newCount: alerts.length, 
        totalStored: allAlerts.length 
      });
    } catch (error) {
      EventLogger.error('PerformanceMonitor', 'Failed to store offline alerts', error as Error);
    }
  }

  /**
   * Sync offline data when database becomes available
   */
  private async syncOfflineData(): Promise<void> {
    if (!this.databaseAvailable || !this.isInitialized) {
      EventLogger.debug('PerformanceMonitor', 'Cannot sync offline data - database not available or not initialized');
      return;
    }

    try {
      // Check if we have metrics in queue that came from offline storage
      if (this.metricQueue.length > 0) {
        EventLogger.info('PerformanceMonitor', 'Syncing offline metrics to database', { count: this.metricQueue.length });
        await this.flushMetrics();
      }

      // Note: Alerts are typically not sent to database individually like metrics
      // They're mainly used locally for monitoring and debugging purposes
      // If alerts need to be synced, implement alert syncing logic here

      EventLogger.info('PerformanceMonitor', 'Offline data sync completed');
    } catch (error) {
      EventLogger.error('PerformanceMonitor', 'Failed to sync offline data', error as Error);
    }
  }

  /**
   * Check database availability and sync offline data if newly available
   */
  public async recheckDatabaseAvailability(): Promise<void> {
    const wasAvailable = this.databaseAvailable;
    
    try {
      await this.checkDatabaseAvailability();
      
      // If database just became available, sync offline data and reset log flag
      if (!wasAvailable && this.databaseAvailable) {
        EventLogger.info('PerformanceMonitor', 'Database became available - syncing offline data');
        this.databaseUnavailableLogged = false; // Reset so we can log again if it goes down
        await this.syncOfflineData();
      }
    } catch (error) {
      this.databaseAvailable = false;
      EventLogger.debug('PerformanceMonitor', 'Database still not available');
    }
  }

  /**
   * Check if we should track (sampling)
   */
  private shouldTrack(): boolean {
    if (!this.config.enabled || !this.isInitialized) {
      return false;
    }

    // Always track in development
    if (__DEV__) {
      return true;
    }

    // Apply sample rate
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Calculate statistics for metrics
   */
  private calculateStats(metrics: PerformanceMetric[]): any {
    if (metrics.length === 0) {
      return { average: 0, p50: 0, p90: 0, p99: 0, samples: 0 };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const len = values.length;

    return {
      average: values.reduce((a, b) => a + b, 0) / len,
      p50: values[Math.floor(len * 0.5)],
      p90: values[Math.floor(len * 0.9)],
      p99: values[Math.floor(len * 0.99)],
      samples: len,
    };
  }

  /**
   * Group screen render statistics
   */
  private groupScreenRenderStats(): PerformanceSummary['screen_render_times'] {
    const screenMetrics = this.metrics.filter(m => m.type === 'screen_render');
    const grouped: Record<string, PerformanceMetric[]> = {};

    screenMetrics.forEach(metric => {
      const screenName = metric.context?.screen_name || 'unknown';
      if (!grouped[screenName]) {
        grouped[screenName] = [];
      }
      grouped[screenName].push(metric);
    });

    const result: PerformanceSummary['screen_render_times'] = {};
    Object.entries(grouped).forEach(([screenName, metrics]) => {
      const values = metrics.map(m => m.value);
      const sortedValues = values.sort((a, b) => a - b);
      
      result[screenName] = {
        average: values.reduce((a, b) => a + b, 0) / values.length,
        p90: sortedValues[Math.floor(sortedValues.length * 0.9)],
        samples: values.length,
      };
    });

    return result;
  }

  /**
   * Group API performance statistics
   */
  private groupApiPerformanceStats(): PerformanceSummary['api_performance'] {
    const apiMetrics = this.metrics.filter(m => m.type === 'api_call');
    const grouped: Record<string, PerformanceMetric[]> = {};

    apiMetrics.forEach(metric => {
      const endpoint = metric.context?.api_endpoint || 'unknown';
      if (!grouped[endpoint]) {
        grouped[endpoint] = [];
      }
      grouped[endpoint].push(metric);
    });

    const result: PerformanceSummary['api_performance'] = {};
    Object.entries(grouped).forEach(([endpoint, metrics]) => {
      const responseTimes = metrics.map(m => m.value);
      const successfulRequests = metrics.filter(m => m.context?.success === true);
      const errorRequests = metrics.filter(m => m.context?.success === false);
      
      result[endpoint] = {
        average_response_time: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        success_rate: (successfulRequests.length / metrics.length) * 100,
        error_rate: (errorRequests.length / metrics.length) * 100,
        total_requests: metrics.length,
      };
    });

    return result;
  }

  /**
   * Calculate memory statistics
   */
  private calculateMemoryStats(): PerformanceSummary['memory_usage'] {
    const memoryMetrics = this.metrics.filter(m => m.type === 'memory_usage');
    
    if (memoryMetrics.length === 0) {
      return { average: 0, peak: 0, warnings: 0 };
    }

    const values = memoryMetrics.map(m => m.value);
    const warnings = memoryMetrics.filter(m => 
      m.context?.memory_pressure === true
    ).length;

    return {
      average: values.reduce((a, b) => a + b, 0) / values.length,
      peak: Math.max(...values),
      warnings,
    };
  }

  /**
   * Calculate battery statistics
   */
  private calculateBatteryStats(): PerformanceSummary['battery_impact'] {
    const batteryMetrics = this.metrics.filter(m => m.type === 'battery');
    
    return {
      average_drain: 0, // Would calculate based on battery level changes
      high_usage_events: 0, // Would track periods of high CPU/GPU usage
    };
  }

  /**
   * Calculate frame rate statistics
   */
  private calculateFrameRateStats(): PerformanceSummary['frame_rate'] {
    // Would be populated by actual frame rate monitoring
    return {
      average_fps: 60, // Default assumption
      dropped_frames: 0,
    };
  }

  /**
   * Generate metric ID
   */
  private generateMetricId(): string {
    return `perf-metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `perf-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `perf-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup when shutting down
   */
  public async shutdown(): Promise<void> {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    // Flush remaining metrics
    if (this.metricQueue.length > 0) {
      await this.flushMetrics();
    }

    this.isInitialized = false;
    EventLogger.info('PerformanceMonitor', 'Performance monitor shut down');
  }
}

// Singleton instance
export const PerformanceMonitor = new PerformanceMonitorService();

// Convenience functions
export const startScreenRender = (screenName: string) => {
  PerformanceMonitor.startScreenRender(screenName);
};

export const endScreenRender = (screenName: string, context?: Record<string, any>) => {
  PerformanceMonitor.endScreenRender(screenName, context);
};

export const startApiCall = (requestId: string, endpoint: string, method: string) => {
  PerformanceMonitor.startApiCall(requestId, endpoint, method);
};

export const endApiCall = (
  requestId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  error?: Error
) => {
  PerformanceMonitor.endApiCall(requestId, endpoint, method, statusCode, error);
};

export const trackCustomMetric = (
  name: string,
  value: number,
  unit: PerformanceMetric['unit'],
  context?: Record<string, any>
) => {
  PerformanceMonitor.trackCustomMetric(name, value, unit, context);
};

// Export types
export type { PerformanceMetric, PerformanceSummary, PerformanceAlert, PerformanceConfig };