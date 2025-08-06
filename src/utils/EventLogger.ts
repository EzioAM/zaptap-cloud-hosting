/**
 * EventLogger - Centralized logging utility for the application
 * Provides structured logging with different levels and optional analytics integration
 */

import { ANALYTICS_CONFIG } from '../config/analytics';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: Error;
  userId?: string;
  sessionId?: string;
  context?: Record<string, any>;
}

export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsoleOutput: boolean;
  enableRemoteLogging: boolean;
  maxLocalEntries: number;
  shouldSanitizeData: boolean;
  remoteEndpoint?: string;
  apiKey?: string;
}

class EventLoggerService {
  private config: LoggerConfig;
  private localEntries: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;
  private logQueue: LogEntry[] = [];
  private isFlushingLogs = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsoleOutput: true,
      enableRemoteLogging: ANALYTICS_CONFIG.enabled,
      maxLocalEntries: 1000,
      shouldSanitizeData: true,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandling();
    
    // Flush logs periodically
    if (this.config.enableRemoteLogging) {
      setInterval(() => this.flushLogs(), 30000); // Every 30 seconds
    }
  }

  /**
   * Set user context for all future logs
   */
  setUser(userId: string, properties?: Record<string, any>): void {
    this.userId = userId;
    this.debug('EventLogger', 'User context set', { userId, properties });
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.userId = undefined;
    this.debug('EventLogger', 'User context cleared');
  }

  /**
   * Debug level logging - only in development
   */
  debug(category: string, message: string, data?: any, context?: Record<string, any>): void {
    if (__DEV__) {
      this.log(LogLevel.DEBUG, category, message, data, undefined, context);
    }
  }

  /**
   * Info level logging
   */
  info(category: string, message: string, data?: any, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, category, message, data, undefined, context);
  }

  /**
   * Warning level logging
   */
  warn(category: string, message: string, data?: any, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, category, message, data, undefined, context);
  }

  /**
   * Error level logging
   */
  error(category: string, message: string, error?: Error, data?: any, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, category, message, data, error, context);
  }

  /**
   * Critical error logging
   */
  critical(category: string, message: string, error?: Error, data?: any, context?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, category, message, data, error, context);
  }

  /**
   * Network request logging
   */
  networkRequest(url: string, method: string, statusCode?: number, duration?: number, error?: Error): void {
    const data = {
      url,
      method,
      statusCode,
      duration,
      timestamp: Date.now(),
    };

    if (error || (statusCode && statusCode >= 400)) {
      this.error('Network', `${method} ${url} failed`, error, data);
    } else {
      this.info('Network', `${method} ${url}`, data);
    }
  }

  /**
   * Performance logging
   */
  performance(category: string, operation: string, duration: number, metadata?: Record<string, any>): void {
    const data = {
      operation,
      duration,
      ...metadata,
    };

    if (duration > ANALYTICS_CONFIG.performance.slowThresholdMs) {
      this.warn('Performance', `Slow ${operation}: ${duration}ms`, data);
    } else {
      this.info('Performance', `${operation}: ${duration}ms`, data);
    }
  }

  /**
   * User action logging
   */
  userAction(action: string, screen: string, data?: any): void {
    this.info('UserAction', `${action} on ${screen}`, {
      action,
      screen,
      ...data,
    });
  }

  /**
   * Analytics event logging
   */
  analyticsEvent(eventName: string, properties?: Record<string, any>): void {
    this.info('Analytics', `Event: ${eventName}`, {
      eventName,
      properties,
    });
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    error?: Error,
    context?: Record<string, any>
  ): void {
    // Check minimum log level
    if (level < this.config.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: this.config.shouldSanitizeData ? this.sanitizeData(data) : data,
      error,
      userId: this.userId,
      sessionId: this.sessionId,
      context: this.config.shouldSanitizeData ? this.sanitizeData(context) : context,
    };

    // Store locally
    this.storeLogEntry(entry);

    // Console output
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(entry);
    }

    // Queue for remote logging
    if (this.config.enableRemoteLogging && level >= LogLevel.WARN) {
      this.queueForRemoteLogging(entry);
    }
  }

  /**
   * Store log entry locally
   */
  private storeLogEntry(entry: LogEntry): void {
    this.localEntries.push(entry);
    
    // Maintain max entries limit
    if (this.localEntries.length > this.config.maxLocalEntries) {
      this.localEntries = this.localEntries.slice(-this.config.maxLocalEntries);
    }
  }

  /**
   * Output log entry to console with appropriate styling
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.split('T')[1]?.split('.')[0] || '';
    const prefix = `[${timestamp}] [${entry.category}]`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`🐛 ${prefix}`, entry.message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(`ℹ️  ${prefix}`, entry.message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(`⚠️  ${prefix}`, entry.message, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${prefix}`, entry.message, entry.error || entry.data);
        break;
      case LogLevel.CRITICAL:
        console.error(`🚨 ${prefix}`, entry.message, entry.error || entry.data);
        break;
    }
  }

  /**
   * Queue log entry for remote logging
   */
  private queueForRemoteLogging(entry: LogEntry): void {
    this.logQueue.push(entry);
    
    // Auto-flush if queue gets too large
    if (this.logQueue.length >= 50) {
      this.flushLogs();
    }
  }

  /**
   * Flush queued logs to remote service
   */
  private async flushLogs(): Promise<void> {
    if (this.isFlushingLogs || this.logQueue.length === 0) {
      return;
    }

    this.isFlushingLogs = true;
    const logsToSend = [...this.logQueue];
    this.logQueue = [];

    try {
      // In a real implementation, this would send to your logging service
      // For now, we'll just log the intent
      console.info(`📤 Flushing ${logsToSend.length} log entries to remote service`);
      
      // Example remote logging implementation:
      // await fetch(this.config.remoteEndpoint, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${this.config.apiKey}`,
      //   },
      //   body: JSON.stringify({ logs: logsToSend }),
      // });

    } catch (error) {
      // If remote logging fails, put logs back in queue
      this.logQueue.unshift(...logsToSend);
      console.error('Failed to flush logs to remote service:', error);
    } finally {
      this.isFlushingLogs = false;
    }
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 100, minLevel: LogLevel = LogLevel.INFO): LogEntry[] {
    return this.localEntries
      .filter(entry => entry.level >= minLevel)
      .slice(-count);
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: string, count: number = 50): LogEntry[] {
    return this.localEntries
      .filter(entry => entry.category === category)
      .slice(-count);
  }

  /**
   * Search logs
   */
  searchLogs(query: string, count: number = 50): LogEntry[] {
    const normalizedQuery = query.toLowerCase();
    return this.localEntries
      .filter(entry => 
        entry.message.toLowerCase().includes(normalizedQuery) ||
        entry.category.toLowerCase().includes(normalizedQuery) ||
        JSON.stringify(entry.data || {}).toLowerCase().includes(normalizedQuery)
      )
      .slice(-count);
  }

  /**
   * Export logs (for debugging or support)
   */
  exportLogs(minLevel: LogLevel = LogLevel.INFO): string {
    const logs = this.localEntries.filter(entry => entry.level >= minLevel);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clear local log entries
   */
  clearLogs(): void {
    this.localEntries = [];
    this.debug('EventLogger', 'Local logs cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.info('EventLogger', 'Configuration updated', newConfig);
  }

  /**
   * Setup global error handling
   */
  private setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    if (typeof global !== 'undefined') {
      const originalHandler = global.onunhandledrejection;
      const self = this;
      global.onunhandledrejection = (event: any) => {
        self.critical('UnhandledPromise', 'Unhandled promise rejection', event.reason, {
          promise: event.promise,
        });
        
        if (originalHandler) {
          originalHandler.call(global, event);
        }
      };
    }

    // Handle uncaught exceptions
    if (typeof global !== 'undefined' && global.process?.on) {
      global.process.on('uncaughtException', (error: Error) => {
        this.critical('UncaughtException', 'Uncaught exception', error);
      });
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitizeData(data: any): any {
    if (!data) return data;
    
    if (typeof data === 'string') {
      // Basic sanitization for common sensitive patterns
      return data.replace(/\b\d{16}\b/g, '**** **** **** ****') // Credit card numbers
                 .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***'); // Email addresses
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip sensitive keys
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }
}

// Singleton instance
export const EventLogger = new EventLoggerService();

// Convenience functions for common logging patterns
export const logUserAction = (action: string, screen: string, data?: any) => {
  EventLogger.userAction(action, screen, data);
};

export const logNetworkRequest = (url: string, method: string, statusCode?: number, duration?: number, error?: Error) => {
  EventLogger.networkRequest(url, method, statusCode, duration, error);
};

export const logPerformance = (operation: string, duration: number, metadata?: Record<string, any>) => {
  EventLogger.performance('Performance', operation, duration, metadata);
};

export const logError = (category: string, message: string, error?: Error, data?: any) => {
  EventLogger.error(category, message, error, data);
};

export const logAnalyticsEvent = (eventName: string, properties?: Record<string, any>) => {
  EventLogger.analyticsEvent(eventName, properties);
};

// Types are already exported at declaration