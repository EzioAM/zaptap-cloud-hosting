/**
 * IMMEDIATE ErrorUtils Polyfill
 * This file must be loaded as the very first module to prevent
 * "Cannot read property 'setGlobalHandler' of undefined" errors
 */

// Immediately install ErrorUtils polyfill
(function() {
  'use strict';
  
  // Multiple context support for different React Native versions and environments
  const getGlobalContext = () => {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof global !== 'undefined') return global;
    if (typeof window !== 'undefined') return window;
    if (typeof self !== 'undefined') return self;
    return {};
  };
  
  const globalContext = getGlobalContext();
  
  // Check if ErrorUtils already exists in any context
  if (globalContext.ErrorUtils) {
    console.log('[ErrorUtilsPolyfill] ErrorUtils already exists, skipping polyfill');
    return;
  }

  let globalErrorHandler = null;

  const defaultErrorHandler = function(error, isFatal) {
    const prefix = isFatal ? '[FATAL ERROR]' : '[ERROR]';
    console.error(prefix + ' ' + error.name + ': ' + error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  };

  const ErrorUtilsPolyfill = {
    setGlobalHandler: function(handler) {
      globalErrorHandler = handler;
    },
    
    getGlobalHandler: function() {
      return globalErrorHandler;
    },
    
    reportError: function(error) {
      const handler = globalErrorHandler || defaultErrorHandler;
      try {
        handler(error, false);
      } catch (handlerError) {
        console.error('[ErrorUtils] Error handler threw an error:', handlerError);
        defaultErrorHandler(error, false);
      }
    },
    
    reportFatalError: function(error) {
      const handler = globalErrorHandler || defaultErrorHandler;
      try {
        handler(error, true);
      } catch (handlerError) {
        console.error('[ErrorUtils] Fatal error handler threw an error:', handlerError);
        defaultErrorHandler(error, true);
      }
    }
  };

  // Install on the primary global context and ensure it's available everywhere
  globalContext.ErrorUtils = ErrorUtilsPolyfill;
  
  // Also ensure it's on all possible global contexts for maximum compatibility
  const contexts = [
    typeof globalThis !== 'undefined' ? globalThis : null,
    typeof global !== 'undefined' ? global : null,
    typeof window !== 'undefined' ? window : null,
    typeof self !== 'undefined' ? self : null
  ].filter(Boolean);

  for (let i = 0; i < contexts.length; i++) {
    const context = contexts[i];
    if (context && !context.ErrorUtils) {
      context.ErrorUtils = ErrorUtilsPolyfill;
    }
  }
  
  // Special handling for Hermes and other JS engines
  if (typeof __ErrorUtils === 'undefined') {
    global.__ErrorUtils = ErrorUtilsPolyfill;
  }

  console.log('[ErrorUtilsPolyfill] Immediately installed before expo-dev-launcher');
})();