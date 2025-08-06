/**
 * CrashReporter - Comprehensive error monitoring and crash reporting service
 * Captures JavaScript errors, native crashes, and provides detailed error context
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../supabase/client';
import { ANALYTICS_CONFIG } from '../../config/analytics';
import { EventLogger } from '../../utils/EventLogger';

export interface ErrorReport {
  id: string;
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
    type: 'javascript' | 'native' | 'unhandled_rejection' | 'network' | 'custom';
    fatal: boolean;
  };
  context: {
    user_id?: string;
    session_id?: string;
    app_version: string;
    build_number: string;
    platform: string;
    os_version: string;
    device_model?: string;
    memory_usage?: number;
    battery_level?: number;
    network_status?: string;
    screen_name?: string;
    component_stack?: string[];
    custom_context?: Record<string, any>;
  };
  breadcrumbs: Breadcrumb[];
  user_actions: UserAction[];
  performance_metrics?: {
    memory_pressure: boolean;
    cpu_usage?: number;
    frame_drops?: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  fingerprint: string;
  tags?: Record<string, string>;
}

export interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, any>;
}

export interface UserAction {
  timestamp: string;
  type: 'navigation' | 'click' | 'input' | 'gesture' | 'api_call';
  target: string;
  data?: Record<string, any>;
}

export interface CrashReporterConfig {
  enabled: boolean;
  apiKey?: string;
  endpoint?: string;
  environment: string;
  maxBreadcrumbs: number;
  maxUserActions: number;
  captureConsoleErrors: boolean;
  captureUnhandledPromiseRejections: boolean;
  beforeSend?: (report: ErrorReport) => ErrorReport | null;
  sampleRate: number;
  userId?: string;
  userContext?: Record<string, any>;
}

class CrashReporterService {
  private config: CrashReporterConfig;
  private breadcrumbs: Breadcrumb[] = [];
  private userActions: UserAction[] = [];
  private isInitialized = false;
  private originalConsoleError: any;
  private originalConsoleWarn: any;
  private sessionId: string;
  private reportQueue: ErrorReport[] = [];
  private isFlushingReports = false;
  private databaseAvailable = false;
  private databaseUnavailableLogged = false; // Track if we've already logged database unavailability

  // Storage keys
  private static readonly OFFLINE_REPORTS_KEY = 'crash_reports_offline';
  private static readonly SESSION_ID_KEY = 'crash_reporter_session_id';

  constructor(config: Partial<CrashReporterConfig> = {}) {
    this.config = {
      enabled: ANALYTICS_CONFIG.errors.enabled,
      environment: __DEV__ ? 'development' : 'production',
      maxBreadcrumbs: ANALYTICS_CONFIG.errors.maxBreadcrumbs,
      maxUserActions: 50,
      captureConsoleErrors: ANALYTICS_CONFIG.errors.captureConsoleErrors,
      captureUnhandledPromiseRejections: ANALYTICS_CONFIG.errors.captureUnhandledPromiseRejections,
      sampleRate: ANALYTICS_CONFIG.errors.sampleRate,
      ...config,
    };

    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize the crash reporter
   */
  public async initialize(options: Partial<CrashReporterConfig> = {}): Promise<void> {
    try {
      this.config = { ...this.config, ...options };

      if (!this.config.enabled) {
        EventLogger.info('CrashReporter', 'Crash reporting disabled');
        this.isInitialized = true; // Mark as initialized even when disabled
        return;
      }

      // Initialize synchronous setup first
      await Promise.resolve().then(() => {
        // Setup global error handlers
        this.setupGlobalErrorHandlers();
        
        // Setup console interception
        this.setupConsoleInterception();
        
        // Setup periodic flush
        this.setupPeriodicFlush();
      });
      
      // Check database availability in background (only log once)
      this.checkDatabaseAvailability().catch(error => {
        if (!this.databaseUnavailableLogged) {
          EventLogger.warn('CrashReporter', 'Database not available - reports will be stored locally only', error as Error);
          this.databaseUnavailableLogged = true;
        }
        this.databaseAvailable = false;
      });
      
      // Load offline reports in background
      this.loadOfflineReports().catch(error => {
        EventLogger.error('CrashReporter', 'Failed to load offline reports', error as Error);
      });
      
      // Add initial breadcrumb
      this.addBreadcrumb({
        category: 'lifecycle',
        message: 'Crash reporter initialized',
        level: 'info',
        data: {
          config: {
            enabled: this.config.enabled,
            environment: this.config.environment,
          },
        },
      });

      this.isInitialized = true;
      EventLogger.info('CrashReporter', 'Crash reporter initialized successfully');
      
    } catch (error) {
      this.isInitialized = true; // Mark as initialized to prevent blocking
      EventLogger.error('CrashReporter', 'Failed to initialize crash reporter', error as Error);
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
      const testReportId = `test-availability-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      const { error: insertError } = await supabase
        .from('error_reports')
        .insert({
          id: testReportId,
          error_name: 'DatabaseAvailabilityTest',
          error_message: 'Test error for database availability check',
          error_type: 'custom',
          error_fatal: false,
          severity: 'low',
          fingerprint: 'test-availability-check',
          context: { test: true },
          tags: { test: 'availability_check' }
        });
      
      if (insertError) {
        // Handle specific error cases
        if (insertError.code === '42P01') {
          // Table does not exist
          EventLogger.warn('CrashReporter', 'Error reports table does not exist', {
            suggestion: 'Run the SQL setup script: scripts/setup-monitoring-tables.sql'
          } as any);
        } else if (insertError.code === '42501') {
          // Permission denied
          EventLogger.warn('CrashReporter', 'Permission denied for error reports table', {
            suggestion: 'Check RLS policies and authentication'
          } as any);
        } else {
          // Other database error
          EventLogger.warn('CrashReporter', 'Error reports table not accessible', {
            tableError: insertError.message,
            code: insertError.code
          } as any);
        }
        
        this.databaseAvailable = false;
        throw new Error(`Table access error: ${insertError.message} (code: ${insertError.code})`);
      }

      // Clean up the test record
      await supabase
        .from('error_reports')
        .delete()
        .eq('id', testReportId);

      this.databaseAvailable = true;
      EventLogger.info('CrashReporter', 'Database available for error reporting');
      
    } catch (error) {
      this.databaseAvailable = false;
      
      // Log specific guidance based on error type
      let message = 'Database not available - will store reports locally';
      const errorDetails: any = {
        error: error instanceof Error ? error.message : String(error)
      };

      if (error instanceof Error) {
        if (error.message.includes('42P01') || error.message.includes('does not exist')) {
          message = 'Error reports table missing - run setup script to create tables';
          errorDetails.setupScript = 'scripts/setup-monitoring-tables.sql';
        } else if (error.message.includes('42501') || error.message.includes('permission')) {
          message = 'Database permission denied - check RLS policies';
        } else if (error.message.includes('not initialized')) {
          message = 'Supabase not configured - check environment variables';
        }
      }

      EventLogger.warn('CrashReporter', message, errorDetails);
      throw error;
    }
  }

  /**
   * Set user context
   */
  public setUser(userId: string, context?: Record<string, any>): void {
    this.config.userId = userId;
    this.config.userContext = context;
    
    this.addBreadcrumb({
      category: 'user',
      message: 'User context updated',
      level: 'info',
      data: { userId, context },
    });
  }

  /**
   * Clear user context
   */
  public clearUser(): void {
    const oldUserId = this.config.userId;
    this.config.userId = undefined;
    this.config.userContext = undefined;
    
    this.addBreadcrumb({
      category: 'user',
      message: 'User context cleared',
      level: 'info',
      data: { oldUserId },
    });
  }

  /**
   * Add a breadcrumb
   */
  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.isInitialized) return;

    const fullBreadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      ...breadcrumb,
    };

    this.breadcrumbs.push(fullBreadcrumb);
    
    // Maintain max breadcrumbs limit
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }
  }

  /**
   * Track user action
   */
  public trackUserAction(action: Omit<UserAction, 'timestamp'>): void {
    if (!this.isInitialized) return;

    const fullAction: UserAction = {
      timestamp: new Date().toISOString(),
      ...action,
    };

    this.userActions.push(fullAction);
    
    // Maintain max actions limit
    if (this.userActions.length > this.config.maxUserActions) {
      this.userActions = this.userActions.slice(-this.config.maxUserActions);
    }

    // Also add as breadcrumb
    this.addBreadcrumb({
      category: 'user_action',
      message: `${action.type}: ${action.target}`,
      level: 'info',
      data: action.data,
    });
  }

  /**
   * Manually report an error
   */
  public reportError(
    error: Error,
    context?: Record<string, any>,
    severity: ErrorReport['severity'] = 'medium'
  ): void {
    if (!this.shouldReportError()) return;

    this.createAndQueueReport({
      name: error.name,
      message: error.message,
      stack: error.stack,
      type: 'custom',
      fatal: false,
    }, context, severity);
  }

  /**
   * Report a network error
   */
  public reportNetworkError(
    url: string,
    method: string,
    statusCode: number,
    error: Error,
    context?: Record<string, any>
  ): void {
    if (!this.shouldReportError()) return;

    this.createAndQueueReport({
      name: 'NetworkError',
      message: `${method} ${url} - ${statusCode}: ${error.message}`,
      stack: error.stack,
      type: 'network',
      fatal: false,
    }, {
      url,
      method,
      statusCode,
      ...context,
    }, 'medium');
  }

  /**
   * Report a fatal error (app crash)
   */
  public reportFatalError(error: Error, context?: Record<string, any>): void {
    this.createAndQueueReport({
      name: error.name,
      message: error.message,
      stack: error.stack,
      type: 'javascript',
      fatal: true,
    }, context, 'critical');

    // Immediately flush fatal errors
    this.flushReports();
  }

  /**
   * Set current screen context
   */
  public setCurrentScreen(screenName: string, params?: Record<string, any>): void {
    this.addBreadcrumb({
      category: 'navigation',
      message: `Navigated to ${screenName}`,
      level: 'info',
      data: { screenName, params },
    });

    // Store current screen for error reports
    this.config.userContext = {
      ...this.config.userContext,
      current_screen: screenName,
      screen_params: params,
    };
  }

  /**
   * Add custom context
   */
  public addContext(key: string, value: any): void {
    this.config.userContext = {
      ...this.config.userContext,
      [key]: value,
    };
  }

  /**
   * Create and queue an error report
   */
  private async createAndQueueReport(
    error: ErrorReport['error'],
    customContext?: Record<string, any>,
    severity: ErrorReport['severity'] = 'medium'
  ): Promise<void> {
    try {
      const report: ErrorReport = {
        id: this.generateReportId(),
        timestamp: new Date().toISOString(),
        error,
        context: await this.buildErrorContext(customContext),
        breadcrumbs: [...this.breadcrumbs],
        user_actions: [...this.userActions],
        performance_metrics: await this.getPerformanceMetrics(),
        severity,
        fingerprint: this.generateFingerprint(error),
        tags: {
          environment: this.config.environment,
          platform: Platform.OS,
          version: '1.0.0', // TODO: Get from package.json
        },
      };

      // Apply beforeSend filter
      const finalReport = this.config.beforeSend ? this.config.beforeSend(report) : report;
      if (!finalReport) return;

      this.reportQueue.push(finalReport);
      EventLogger.error('CrashReporter', 'Error report queued', error as any, {
        report_id: report.id,
        severity,
      });

      // Auto-flush if queue is getting full or for critical errors
      if (this.reportQueue.length >= 10 || severity === 'critical') {
        this.flushReports();
      }
      
    } catch (reportError) {
      EventLogger.error('CrashReporter', 'Failed to create error report', reportError as Error);
    }
  }

  /**
   * Build error context
   */
  private async buildErrorContext(customContext?: Record<string, any>): Promise<ErrorReport['context']> {
    const context: ErrorReport['context'] = {
      user_id: this.config.userId,
      session_id: this.sessionId,
      app_version: '1.0.0', // TODO: Get from package.json or Constants
      build_number: __DEV__ ? 'development' : 'production',
      platform: Platform.OS,
      os_version: Platform.Version.toString(),
      screen_name: this.config.userContext?.current_screen,
      custom_context: {
        ...this.config.userContext,
        ...customContext,
      },
    };

    // Add device info if available
    try {
      // In a real implementation, you'd use react-native-device-info
      // context.device_model = await DeviceInfo.getModel();
      // context.memory_usage = await DeviceInfo.getTotalMemory();
      // context.battery_level = await DeviceInfo.getBatteryLevel();
    } catch (error) {
      // Device info not available, continue without it
    }

    return context;
  }

  /**
   * Get current performance metrics
   */
  private async getPerformanceMetrics(): Promise<ErrorReport['performance_metrics']> {
    try {
      // In a real implementation, you'd collect actual performance metrics
      const memoryPressure = false; // Would check actual memory pressure
      
      return {
        memory_pressure: memoryPressure,
        // cpu_usage: await getCpuUsage(),
        // frame_drops: getFrameDrops(),
      };
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Generate error fingerprint for deduplication
   */
  private generateFingerprint(error: ErrorReport['error']): string {
    // Simple fingerprint based on error type and first few lines of stack
    const stackLines = error.stack?.split('\n').slice(0, 3) || [];
    const fingerprintData = {
      name: error.name,
      message: error.message.slice(0, 100),
      stack: stackLines.join('\n'),
    };
    
    // In a real implementation, you'd use a proper hashing function
    return btoa(JSON.stringify(fingerprintData)).slice(0, 20);
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle JavaScript errors
    if (typeof ErrorUtils !== 'undefined') {
      const originalHandler = ErrorUtils.getGlobalHandler();
      ErrorUtils.setGlobalHandler((error: Error, isFatal: boolean) => {
        this.createAndQueueReport({
          name: error.name,
          message: error.message,
          stack: error.stack,
          type: 'javascript',
          fatal: isFatal,
        }, undefined, isFatal ? 'critical' : 'high');

        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Handle unhandled promise rejections
    if (this.config.captureUnhandledPromiseRejections && typeof global !== 'undefined') {
      const originalHandler = global.onunhandledrejection;
      global.onunhandledrejection = (event: any) => {
        this.createAndQueueReport({
          name: 'UnhandledPromiseRejection',
          message: event.reason?.message || 'Unhandled promise rejection',
          stack: event.reason?.stack,
          type: 'unhandled_rejection',
          fatal: false,
        }, {
          promise: event.promise?.toString(),
        }, 'high');
        
        if (originalHandler) {
          originalHandler(event);
        }
      };
    }
  }

  /**
   * Setup console interception
   */
  private setupConsoleInterception(): void {
    if (!this.config.captureConsoleErrors) return;

    // Intercept console.error
    this.originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      this.addBreadcrumb({
        category: 'console',
        message: args.map(arg => String(arg)).join(' '),
        level: 'error',
      });
      this.originalConsoleError.apply(console, args);
    };

    // Intercept console.warn
    this.originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      this.addBreadcrumb({
        category: 'console',
        message: args.map(arg => String(arg)).join(' '),
        level: 'warning',
      });
      this.originalConsoleWarn.apply(console, args);
    };
  }

  /**
   * Setup periodic report flushing
   */
  private setupPeriodicFlush(): void {
    // Delay initial flush to ensure services are fully ready
    setTimeout(() => {
      setInterval(() => {
        if (this.isInitialized && this.config.enabled && this.reportQueue.length > 0) {
          EventLogger.debug('CrashReporter', 'Periodic flush triggered', { queueLength: this.reportQueue.length });
          this.flushReports().catch(error => {
            EventLogger.error('CrashReporter', 'Periodic flush failed', error as Error);
          });
        }
      }, 60000); // Flush every minute
    }, 5000); // Wait 5 seconds before starting periodic flush
  }

  /**
   * Flush queued reports (public interface)
   */
  public async flush(): Promise<void> {
    if (!this.isInitialized) {
      EventLogger.warn('CrashReporter', 'Cannot flush before initialization');
      return;
    }
    return this.flushReports();
  }

  /**
   * Flush queued reports (internal implementation)
   */
  private async flushReports(): Promise<void> {
    if (!this.config.enabled || !this.isInitialized || this.isFlushingReports || this.reportQueue.length === 0) {
      EventLogger.debug('CrashReporter', 'Skipping flush', {
        enabled: this.config.enabled,
        initialized: this.isInitialized,
        flushing: this.isFlushingReports,
        queueLength: this.reportQueue.length
      });
      return;
    }

    // If database is not available, just store reports offline and don't try to send
    if (!this.databaseAvailable) {
      const reports = [...this.reportQueue];
      this.reportQueue = [];
      await this.storeOfflineReports(reports);
      EventLogger.debug('CrashReporter', 'Stored reports offline - database not available', { count: reports.length });
      return;
    }

    this.isFlushingReports = true;
    const reports = [...this.reportQueue];
    this.reportQueue = [];

    try {
      // Send to backend with detailed error tracking
      await this.sendReports(reports);
      EventLogger.info('CrashReporter', 'Reports flushed successfully', { count: reports.length });
      
    } catch (error) {
      // Put reports back in queue and store offline
      this.reportQueue.unshift(...reports);
      await this.storeOfflineReports(reports);
      
      // Log actual error details
      const errorDetails = {
        name: error instanceof Error ? error.name : 'UnknownError',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        reportCount: reports.length,
        isSupabaseError: error && typeof error === 'object' && 'code' in error,
        errorCode: error && typeof error === 'object' && 'code' in error ? (error as any).code : undefined
      };
      
      EventLogger.error('CrashReporter', 'Failed to flush reports - detailed error', errorDetails as any);
    } finally {
      this.isFlushingReports = false;
    }
  }

  /**
   * Send reports to backend
   */
  private async sendReports(reports: ErrorReport[]): Promise<void> {
    // Check if Supabase is properly configured
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Database availability is already checked in checkDatabaseAvailability()
    // No need to test again here since we only call this when databaseAvailable is true

    const errors: Error[] = [];
    const results = await Promise.allSettled(reports.map(async (report) => {
      try {
        const { error } = await supabase
          .from('error_reports')
          .insert({
            id: report.id,
            timestamp: report.timestamp,
            error_name: report.error.name,
            error_message: report.error.message,
            error_stack: report.error.stack,
            error_type: report.error.type,
            error_fatal: report.error.fatal,
            context: report.context,
            breadcrumbs: report.breadcrumbs,
            user_actions: report.user_actions,
            performance_metrics: report.performance_metrics,
            severity: report.severity,
            fingerprint: report.fingerprint,
            tags: report.tags,
          });

        if (error) {
          EventLogger.error('CrashReporter', `Failed to insert report ${report.id}`, {
            supabaseError: error,
            errorCode: error.code,
            errorMessage: error.message,
            reportId: report.id
          } as any);
          throw new Error(`Supabase error: ${error.message} (code: ${error.code})`);
        }
        
        return { success: true, reportId: report.id };
      } catch (insertError) {
        EventLogger.error('CrashReporter', `Database insert failed for report ${report.id}`, {
          error: insertError,
          reportId: report.id
        } as any);
        throw insertError;
      }
    }));

    // Collect all errors from failed insertions
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        errors.push(new Error(`Report ${reports[index].id}: ${result.reason}`));
      }
    });

    // If any errors occurred, throw with details
    if (errors.length > 0) {
      const errorMessage = `Failed to send ${errors.length}/${reports.length} error reports:\n${errors.map(e => e.message).join('\n')}`;
      EventLogger.error('CrashReporter', 'Batch send failed with detailed errors', {
        failedCount: errors.length,
        totalCount: reports.length,
        errors: errors.map(e => ({ name: e.name, message: e.message, stack: e.stack }))
      } as any);
      throw new Error(errorMessage);
    }
  }

  /**
   * Load offline reports
   */
  private async loadOfflineReports(): Promise<void> {
    try {
      const offlineReports = await AsyncStorage.getItem(CrashReporterService.OFFLINE_REPORTS_KEY);
      if (offlineReports) {
        const reports: ErrorReport[] = JSON.parse(offlineReports);
        this.reportQueue.unshift(...reports);
        await AsyncStorage.removeItem(CrashReporterService.OFFLINE_REPORTS_KEY);
        EventLogger.info('CrashReporter', 'Loaded offline reports', { count: reports.length });

        // Try to sync loaded reports when database becomes available
        if (this.databaseAvailable) {
          this.syncOfflineReports().catch(error => {
            EventLogger.error('CrashReporter', 'Failed to sync offline reports immediately', error as Error);
          });
        }
      }
    } catch (error) {
      // Handle oversized data error specifically
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && 
          error.message.includes('Row too big')) {
        EventLogger.warn('CrashReporter', 'Offline reports too large, clearing data', { error: error.message });
        await this.clearOversizedOfflineData();
        this.reportQueue = [];
      } else {
        EventLogger.error('CrashReporter', 'Failed to load offline reports', error as Error);
      }
    }
  }

  /**
   * Clear oversized offline data when it cannot be loaded
   */
  private async clearOversizedOfflineData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CrashReporterService.OFFLINE_REPORTS_KEY);
      EventLogger.info('CrashReporter', 'Cleared oversized offline reports');
    } catch (error) {
      EventLogger.error('CrashReporter', 'Failed to clear offline data', error as Error);
    }
  }

  /**
   * Store reports offline
   */
  private async storeOfflineReports(reports: ErrorReport[]): Promise<void> {
    try {
      const existingReports = await AsyncStorage.getItem(CrashReporterService.OFFLINE_REPORTS_KEY);
      const allReports = existingReports ? JSON.parse(existingReports) : [];
      
      allReports.push(...reports);
      
      // Limit offline storage to prevent storage bloat (keep last 50 reports to avoid cursor overflow)
      const maxOfflineReports = 50;
      if (allReports.length > maxOfflineReports) {
        allReports.splice(0, allReports.length - maxOfflineReports);
        EventLogger.debug('CrashReporter', `Trimmed offline reports to ${maxOfflineReports} most recent`);
      }
      
      // Check size before storing (rough estimate: 5KB per report max)
      const estimatedSize = JSON.stringify(allReports).length;
      if (estimatedSize > 250000) { // ~250KB limit
        // Keep only the most recent 25 if still too large
        allReports.splice(0, allReports.length - 25);
        EventLogger.warn('CrashReporter', 'Offline reports too large, reduced to 25 most recent');
      }
      
      await AsyncStorage.setItem(CrashReporterService.OFFLINE_REPORTS_KEY, JSON.stringify(allReports));
      
      EventLogger.info('CrashReporter', 'Stored reports offline', { 
        newCount: reports.length, 
        totalStored: allReports.length 
      });
    } catch (error) {
      EventLogger.error('CrashReporter', 'Failed to store offline reports', error as Error);
    }
  }

  /**
   * Sync offline reports when database becomes available
   */
  private async syncOfflineReports(): Promise<void> {
    if (!this.databaseAvailable || !this.isInitialized) {
      EventLogger.debug('CrashReporter', 'Cannot sync offline reports - database not available or not initialized');
      return;
    }

    try {
      // Check if we have reports in queue that came from offline storage
      if (this.reportQueue.length > 0) {
        EventLogger.info('CrashReporter', 'Syncing offline reports to database', { count: this.reportQueue.length });
        await this.flushReports();
      }

      EventLogger.info('CrashReporter', 'Offline reports sync completed');
    } catch (error) {
      EventLogger.error('CrashReporter', 'Failed to sync offline reports', error as Error);
    }
  }

  /**
   * Check database availability and sync offline data if newly available
   */
  public async recheckDatabaseAvailability(): Promise<void> {
    const wasAvailable = this.databaseAvailable;
    
    try {
      await this.checkDatabaseAvailability();
      
      // If database just became available, sync offline reports and reset log flag
      if (!wasAvailable && this.databaseAvailable) {
        EventLogger.info('CrashReporter', 'Database became available - syncing offline reports');
        this.databaseUnavailableLogged = false; // Reset so we can log again if it goes down
        await this.syncOfflineReports();
      }
    } catch (error) {
      this.databaseAvailable = false;
      EventLogger.debug('CrashReporter', 'Database still not available');
    }
  }

  /**
   * Check if we should report this error (sampling)
   */
  private shouldReportError(): boolean {
    if (!this.config.enabled || !this.isInitialized) {
      return false;
    }

    // Always report in development
    if (__DEV__) {
      return true;
    }

    // Apply sample rate
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `crash-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate report ID
   */
  private generateReportId(): string {
    return `crash-report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup when shutting down
   */
  public async shutdown(): Promise<void> {
    // Restore original console methods
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
    }
    if (this.originalConsoleWarn) {
      console.warn = this.originalConsoleWarn;
    }

    // Flush remaining reports
    if (this.reportQueue.length > 0) {
      await this.flushReports();
    }

    this.isInitialized = false;
    EventLogger.info('CrashReporter', 'Crash reporter shut down');
  }
}

// Singleton instance
export const CrashReporter = new CrashReporterService();

// Convenience functions
export const reportError = (error: Error, context?: Record<string, any>, severity?: ErrorReport['severity']) => {
  CrashReporter.reportError(error, context, severity);
};

export const addBreadcrumb = (breadcrumb: Omit<Breadcrumb, 'timestamp'>) => {
  CrashReporter.addBreadcrumb(breadcrumb);
};

export const trackUserAction = (action: Omit<UserAction, 'timestamp'>) => {
  CrashReporter.trackUserAction(action);
};

export const setCurrentScreen = (screenName: string, params?: Record<string, any>) => {
  CrashReporter.setCurrentScreen(screenName, params);
};

export const addContext = (key: string, value: any) => {
  CrashReporter.addContext(key, value);
};

// Export types
export type { ErrorReport, Breadcrumb, UserAction, CrashReporterConfig };