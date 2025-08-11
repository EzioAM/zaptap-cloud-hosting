/**
 * Enhanced ErrorUtils Polyfill for Expo SDK 53 + React Native 0.79.5
 * 
 * Fixes the "Cannot read property 'setGlobalHandler' of undefined" error
 * caused by Metro bundler module loading order changes in RN 0.79.5
 */

interface ErrorHandler {
  (error: Error, isFatal: boolean): void;
}

interface ErrorUtilsInterface {
  setGlobalHandler: (handler: ErrorHandler | null) => void;
  getGlobalHandler: () => ErrorHandler | null;
  reportError: (error: Error) => void;
  reportFatalError: (error: Error) => void;
}

// Keep track of the current global handler
let globalErrorHandler: ErrorHandler | null = null;

// Default error handler that just logs to console
const defaultErrorHandler: ErrorHandler = (error: Error, isFatal: boolean) => {
  const prefix = isFatal ? '[FATAL ERROR]' : '[ERROR]';
  console.error(`${prefix} ${error.name}: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
};

// ErrorUtils polyfill implementation
const ErrorUtilsPolyfill: ErrorUtilsInterface = {
  setGlobalHandler: (handler: ErrorHandler | null) => {
    globalErrorHandler = handler;
  },
  
  getGlobalHandler: () => {
    return globalErrorHandler;
  },
  
  reportError: (error: Error) => {
    const handler = globalErrorHandler || defaultErrorHandler;
    try {
      handler(error, false);
    } catch (handlerError) {
      console.error('[ErrorUtils] Error handler threw an error:', handlerError);
      defaultErrorHandler(error, false);
    }
  },
  
  reportFatalError: (error: Error) => {
    const handler = globalErrorHandler || defaultErrorHandler;
    try {
      handler(error, true);
    } catch (handlerError) {
      console.error('[ErrorUtils] Fatal error handler threw an error:', handlerError);
      defaultErrorHandler(error, true);
    }
  }
};

// Early initialization - must happen immediately
const initializeErrorUtils = () => {
  try {
    // Multiple fallback contexts for different RN versions
    const contexts = [
      typeof globalThis !== 'undefined' ? globalThis : null,
      typeof global !== 'undefined' ? global : null,
      typeof window !== 'undefined' ? window : null,
      typeof self !== 'undefined' ? self : null
    ].filter(Boolean);

    let installed = false;
    
    for (const context of contexts) {
      if (context && !context.ErrorUtils) {
        context.ErrorUtils = ErrorUtilsPolyfill;
        installed = true;
      }
    }
    
    if (installed) {
      console.log('[ErrorUtilsPolyfill] Successfully installed for Expo SDK 53');
    } else {
      console.log('[ErrorUtilsPolyfill] ErrorUtils already exists, skipping polyfill');
    }
    
    // Extra safety: ensure it's on global specifically
    if (typeof global !== 'undefined' && !global.ErrorUtils) {
      global.ErrorUtils = ErrorUtilsPolyfill;
    }
    
  } catch (error) {
    console.error('[ErrorUtilsPolyfill] Installation failed:', error);
  }
};

// CRITICAL: Execute immediately when module loads
initializeErrorUtils();

export const installErrorUtilsPolyfill = initializeErrorUtils;

export { ErrorUtilsPolyfill };
export default ErrorUtilsPolyfill;