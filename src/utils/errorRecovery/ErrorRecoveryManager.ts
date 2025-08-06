import { EventLogger } from '../EventLogger';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error) => boolean;
  recover: (error: Error, context?: any) => Promise<boolean>;
  priority: number;
}

export class ErrorRecoveryManager {
  private retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
  };

  private recoveryStrategies: RecoveryStrategy[] = [];

  constructor(config?: Partial<RetryConfig>) {
    if (config) {
      this.retryConfig = { ...this.retryConfig, ...config };
    }

    this.setupDefaultStrategies();
  }

  /**
   * Execute an operation with automatic retry and recovery
   */
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: {
      operationName: string;
      category?: string;
      maxAttempts?: number;
      enableRecovery?: boolean;
    }
  ): Promise<T> {
    const { operationName, category = 'Operation', maxAttempts, enableRecovery = true } = context;
    const attempts = maxAttempts || this.retryConfig.maxAttempts;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          try {
            EventLogger.info(
              'ErrorRecovery',
              `Operation succeeded after retry`,
              { operationName, attempt, category }
            );
          } catch (logError) {
            console.info(`Operation ${operationName} succeeded after retry (attempt ${attempt})`);
          }
        }
        
        return result;
      } catch (error) {
        const isLastAttempt = attempt === attempts;
        
        try {
          EventLogger.warn(
            'ErrorRecovery',
            `Operation failed on attempt ${attempt}`,
            { operationName, attempt, maxAttempts: attempts, error: error.message }
          );
        } catch (logError) {
          console.warn(`Operation ${operationName} failed on attempt ${attempt}: ${error.message}`);
        }

        if (isLastAttempt) {
          // Try recovery strategies before giving up
          if (enableRecovery) {
            const recovered = await this.attemptRecovery(error as Error, {
              operationName,
              category,
              attempt,
            });
            
            if (recovered) {
              // Retry one more time after successful recovery
              try {
                const result = await operation();
                try {
                  EventLogger.info(
                    'ErrorRecovery',
                    'Operation succeeded after recovery',
                    { operationName, category }
                  );
                } catch (logError) {
                  console.info(`Operation ${operationName} succeeded after recovery`);
                }
                return result;
              } catch (retryError) {
                try {
                  EventLogger.error(
                    'ErrorRecovery',
                    'Operation failed even after recovery',
                    retryError as Error,
                    { operationName, category }
                  );
                } catch (logError) {
                  console.error(`Operation ${operationName} failed even after recovery:`, retryError);
                }
              }
            }
          }
          
          // Final failure
          try {
            EventLogger.error(
              'ErrorRecovery',
              `Operation failed after all attempts`,
              error as Error,
              { operationName, category, totalAttempts: attempts }
            );
          } catch (logError) {
            console.error(`Operation ${operationName} failed after all ${attempts} attempts:`, error);
          }
          
          throw error;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt);
        try {
          EventLogger.info(
            'ErrorRecovery',
            `Retrying operation in ${delay}ms`,
            { operationName, attempt, delay }
          );
        } catch (logError) {
          console.info(`Retrying operation ${operationName} in ${delay}ms (attempt ${attempt})`);
        }
        
        await this.sleep(delay);
      }
    }

    throw new Error(`Unexpected end of retry loop for ${operationName}`);
  }

  /**
   * Register a custom recovery strategy
   */
  addRecoveryStrategy(strategy: RecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
    this.recoveryStrategies.sort((a, b) => b.priority - a.priority);
    
    try {
      EventLogger.info(
        'ErrorRecovery',
        'Recovery strategy registered',
        { strategyName: strategy.name, priority: strategy.priority }
      );
    } catch (logError) {
      console.info(`Recovery strategy registered: ${strategy.name} (priority: ${strategy.priority})`);
    }
  }

  /**
   * Remove a recovery strategy
   */
  removeRecoveryStrategy(strategyName: string): void {
    const index = this.recoveryStrategies.findIndex(s => s.name === strategyName);
    if (index >= 0) {
      this.recoveryStrategies.splice(index, 1);
      try {
        EventLogger.info(
          'ErrorRecovery',
          'Recovery strategy removed',
          { strategyName }
        );
      } catch (logError) {
        console.info(`Recovery strategy removed: ${strategyName}`);
      }
    }
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    try {
      EventLogger.info(
        'ErrorRecovery',
        'Retry configuration updated',
        { config: this.retryConfig }
      );
    } catch (logError) {
      console.info('Retry configuration updated:', this.retryConfig);
    }
  }

  /**
   * Attempt to recover from an error using registered strategies
   */
  private async attemptRecovery(error: Error, context: any): Promise<boolean> {
    try {
      EventLogger.info(
        'ErrorRecovery',
        'Attempting error recovery',
        { error: error.message, strategies: this.recoveryStrategies.length }
      );
    } catch (logError) {
      console.info(`Attempting error recovery for: ${error.message} (${this.recoveryStrategies.length} strategies)`);
    }

    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error)) {
        try {
          try {
            EventLogger.info(
              'ErrorRecovery',
              `Trying recovery strategy: ${strategy.name}`,
              { error: error.message, strategy: strategy.name }
            );
          } catch (logError) {
            console.info(`Trying recovery strategy: ${strategy.name} for error: ${error.message}`);
          }
          
          const recovered = await strategy.recover(error, context);
          
          if (recovered) {
            try {
              EventLogger.info(
                'ErrorRecovery',
                `Recovery successful with strategy: ${strategy.name}`,
                { error: error.message, strategy: strategy.name }
              );
            } catch (logError) {
              console.info(`Recovery successful with strategy: ${strategy.name}`);
            }
            return true;
          } else {
            try {
              EventLogger.warn(
                'ErrorRecovery',
                `Recovery failed with strategy: ${strategy.name}`,
                { error: error.message, strategy: strategy.name }
              );
            } catch (logError) {
              console.warn(`Recovery failed with strategy: ${strategy.name}`);
            }
          }
        } catch (recoveryError) {
          try {
            EventLogger.error(
              'ErrorRecovery',
              `Recovery strategy threw error: ${strategy.name}`,
              recoveryError as Error,
              { originalError: error.message, strategy: strategy.name }
            );
          } catch (logError) {
            console.error(`Recovery strategy ${strategy.name} threw error:`, recoveryError);
          }
        }
      }
    }

    try {
      EventLogger.warn(
        'ErrorRecovery',
        'All recovery strategies failed',
        { error: error.message, strategiesAttempted: this.recoveryStrategies.length }
      );
    } catch (logError) {
      console.warn(`All ${this.recoveryStrategies.length} recovery strategies failed for: ${error.message}`);
    }
    
    return false;
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
      this.retryConfig.maxDelay
    );

    if (this.retryConfig.jitter) {
      // Add random jitter (±25% of calculated delay)
      const jitterRange = exponentialDelay * 0.25;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      return Math.max(100, Math.round(exponentialDelay + jitter));
    }

    return exponentialDelay;
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Setup default recovery strategies
   */
  private setupDefaultStrategies(): void {
    // Network error recovery
    this.addRecoveryStrategy({
      name: 'NetworkErrorRecovery',
      canRecover: (error: Error) => {
        const networkPatterns = [
          'network request failed',
          'fetch',
          'network error',
          'connection',
          'timeout',
          'abort',
        ];
        return networkPatterns.some(pattern =>
          error.message.toLowerCase().includes(pattern.toLowerCase())
        );
      },
      recover: async (error: Error) => {
        // Check if network is available
        const isOnline = navigator?.onLine ?? true;
        if (!isOnline) {
          try {
            EventLogger.warn('ErrorRecovery', 'Device is offline, cannot recover network error');
          } catch (logError) {
            console.warn('Device is offline, cannot recover network error');
          }
          return false;
        }

        // Simple network connectivity test
        try {
          const response = await fetch('/ping', { 
            method: 'HEAD',
            cache: 'no-cache',
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      priority: 10,
    });

    // Cache clear recovery for storage errors
    this.addRecoveryStrategy({
      name: 'CacheClearRecovery',
      canRecover: (error: Error) => {
        const cachePatterns = [
          'quotaexceeded',
          'storage',
          'cache',
          'indexeddb',
          'localstorage',
        ];
        return cachePatterns.some(pattern =>
          error.message.toLowerCase().includes(pattern.toLowerCase())
        );
      },
      recover: async (error: Error) => {
        try {
          // Clear various cache types
          if (typeof caches !== 'undefined') {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }

          // Clear localStorage (if quota exceeded)
          try {
            localStorage.clear();
          } catch {}

          try {
            EventLogger.info('ErrorRecovery', 'Caches cleared for recovery');
          } catch (logError) {
            console.info('Caches cleared for recovery');
          }
          return true;
        } catch {
          return false;
        }
      },
      priority: 5,
    });

    // Memory pressure recovery
    this.addRecoveryStrategy({
      name: 'MemoryRecovery',
      canRecover: (error: Error) => {
        const memoryPatterns = [
          'out of memory',
          'memory',
          'heap',
          'maximum call stack',
        ];
        return memoryPatterns.some(pattern =>
          error.message.toLowerCase().includes(pattern.toLowerCase())
        );
      },
      recover: async (error: Error) => {
        try {
          // Force garbage collection if available
          if ((window as any).gc) {
            (window as any).gc();
          }

          // Clear any large data structures we might be holding
          // This is app-specific and should be customized
          try {
            EventLogger.info('ErrorRecovery', 'Memory recovery attempted');
          } catch (logError) {
            console.info('Memory recovery attempted');
          }
          
          // Give it a moment to free up memory
          await this.sleep(100);
          return true;
        } catch {
          return false;
        }
      },
      priority: 3,
    });
  }
}

// Singleton instance
export const errorRecoveryManager = new ErrorRecoveryManager();