/**
import { EventLogger } from './EventLogger';
 * Smart Error Interceptor
 * 
 * This module intelligently manages console.error calls to reduce spam
 * while maintaining visibility into real issues.
 */

// Keep reference to original console.error
const originalConsoleError = console.error;

// Track errors by type and context
interface ErrorInfo {
  count: number;
  firstSeen: number;
  lastSeen: number;
  endpoint?: string;
  suppressed: number;
}

const errorTracker = new Map<string, ErrorInfo>();

// Configuration
const ERROR_BATCH_WINDOW = 10000; // 10 seconds
const MAX_ERRORS_BEFORE_SUMMARY = 3; // Show first 3, then summarize
const SUMMARY_INTERVAL = 30000; // Show summary every 30 seconds

// Last summary time
let lastSummaryTime = 0;

/**
 * Network error patterns
 */
const NETWORK_ERROR_PATTERNS = [
  'Network request failed',
  'Failed to fetch',
  'NetworkError',
  'AuthRetryableFetchError',
  'fetch failed',
  'ERR_NETWORK',
  'ERR_INTERNET_DISCONNECTED',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'Unable to resolve host',
  'Network is unreachable',
];

/**
 * Extract error context (like API endpoint or component)
 */
const extractErrorContext = (args: any[]): { key: string; endpoint?: string } => {
  let key = 'unknown_error';
  let endpoint: string | undefined;

  // Look for API endpoint information
  for (const arg of args) {
    if (typeof arg === 'string') {
      // Check for common API patterns
      if (arg.includes('getPublicAutomations')) {
        key = 'api_public_automations';
        endpoint = 'getPublicAutomations';
      } else if (arg.includes('getTrendingAutomations')) {
        key = 'api_trending_automations';
        endpoint = 'getTrendingAutomations';
      } else if (arg.includes('auth') || arg.includes('session')) {
        key = 'auth_session';
        endpoint = 'auth';
      } else if (arg.includes('RPC function')) {
        const match = arg.match(/RPC function (\w+)/);
        if (match) {
          key = `rpc_${match[1]}`;
          endpoint = match[1];
        }
      }
    }
    
    // Check error objects
    if (arg && typeof arg === 'object' && arg.message) {
      if (arg.message.includes('Network request failed')) {
        if (key === 'unknown_error') {
          key = 'network_request_failed';
        }
      }
    }
  }

  return { key, endpoint };
};

/**
 * Check if error is network-related
 */
const isNetworkError = (args: any[]): boolean => {
  for (const arg of args) {
    if (arg instanceof Error && arg.name === 'TypeError' && 
        arg.message && arg.message.includes('Network request failed')) {
      return true;
    }
    
    if (arg && typeof arg === 'object') {
      if (arg.name === 'NetworkError' || 
          arg.name === 'AuthRetryableFetchError' ||
          (arg.message && NETWORK_ERROR_PATTERNS.some(pattern => arg.message.includes(pattern)))) {
        return true;
      }
    }
  }
  
  const errorString = args.map(arg => String(arg)).join(' ');
  return NETWORK_ERROR_PATTERNS.some(pattern => errorString.includes(pattern));
};

/**
 * Show error summary
 */
const showErrorSummary = () => {
  const now = Date.now();
  if (now - lastSummaryTime < SUMMARY_INTERVAL) {
    return;
  }
  
  lastSummaryTime = now;
  
  const networkErrors = Array.from(errorTracker.entries())
    .filter(([key]) => key.includes('api_') || key.includes('rpc_') || key.includes('network'))
    .filter(([, info]) => info.suppressed > 0);

  if (networkErrors.length > 0) {
    EventLogger.debug('errorInterceptor', '\n📊 Network Error Summary (last 30s):');
    networkErrors.forEach(([key, info]) => {
      const total = info.count + info.suppressed;
      const endpoint = info.endpoint || key;
      EventLogger.debug('errorInterceptor', '   - ${endpoint}: ${total} errors (${info.count} shown, ${info.suppressed} suppressed)');
    });
    EventLogger.debug('errorInterceptor', '💡 Check your network connection or API availability\n');
  }
};

/**
 * Initialize the error interceptor
 */
export const initializeErrorInterceptor = () => {
  console.error = (...args: any[]) => {
    const now = Date.now();
    const { key, endpoint } = extractErrorContext(args);
    
    // Get or create error info
    let errorInfo = errorTracker.get(key);
    if (!errorInfo) {
      errorInfo = {
        count: 0,
        firstSeen: now,
        lastSeen: now,
        endpoint,
        suppressed: 0,
      };
      errorTracker.set(key, errorInfo);
    }
    
    // Update last seen
    errorInfo.lastSeen = now;
    
    // Check if this is a network error
    if (isNetworkError(args)) {
      // For network errors, show first few then suppress
      if (errorInfo.count < MAX_ERRORS_BEFORE_SUMMARY) {
        errorInfo.count++;
        // Show with context
        const context = endpoint ? ` [${endpoint}]` : '';
        EventLogger.debug('errorInterceptor', '🔴 Network Error${context}:', args[0]?.message || args[0] || 'Network request failed');
      } else {
        errorInfo.suppressed++;
        
        // Show summary periodically
        if (errorInfo.suppressed % 10 === 0) {
          EventLogger.debug('errorInterceptor', '📴 Network errors continuing for ${endpoint || key} (${errorInfo.suppressed + errorInfo.count} total)');
        }
      }
      
      // Show summary if enough time has passed
      showErrorSummary();
      return;
    }
    
    // For non-network errors, always show
    originalConsoleError.apply(console, args);
  };
  
  // Set up periodic summary
  setInterval(showErrorSummary, SUMMARY_INTERVAL);
};

/**
 * Restore original console.error
 */
export const restoreConsoleError = () => {
  console.error = originalConsoleError;
};

/**
 * Reset error tracking
 */
export const resetErrorTracking = () => {
  errorTracker.clear();
  lastSummaryTime = 0;
};

/**
 * Get error statistics
 */
export const getErrorStats = () => {
  const stats: Record<string, any> = {};
  errorTracker.forEach((info, key) => {
    stats[key] = {
      total: info.count + info.suppressed,
      shown: info.count,
      suppressed: info.suppressed,
      endpoint: info.endpoint,
    };
  });
  return stats;
};