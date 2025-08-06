import { InteractionManager } from 'react-native';
import { PerformanceMeasurement } from './PerformanceMeasurement';
import { PerformanceAnalyzer } from './PerformanceAnalyzer';
import { EventLogger } from './EventLogger';

/**
 * Performance Optimizer for ShortcutsLike App
 * Actively monitors and optimizes app performance while maintaining safety
 */

interface OptimizationConfig {
  enableAutoOptimization: boolean;
  targetLaunchTime: number;
  targetFPS: number;
  maxMemoryUsage: number;
  enableAnimationOptimization: boolean;
  enableNavigationPreloading: boolean;
  enableCaching: boolean;
}

interface AnimationOptimization {
  useNativeDriver: boolean;
  batchAnimations: boolean;
  throttleUpdates: boolean;
  simplifyComplexAnimations: boolean;
}

export class PerformanceOptimizer {
  private static config: OptimizationConfig = {
    enableAutoOptimization: true,
    targetLaunchTime: 2000,
    targetFPS: 60,
    maxMemoryUsage: 100, // MB
    enableAnimationOptimization: true,
    enableNavigationPreloading: true,
    enableCaching: true,
  };

  private static animationConfig: AnimationOptimization = {
    useNativeDriver: true,
    batchAnimations: true,
    throttleUpdates: true,
    simplifyComplexAnimations: false,
  };

  private static cache = new Map<string, any>();
  private static pendingOperations = new Set<Promise<any>>();
  private static isOptimizing = false;

  /**
   * Initialize performance optimization
   */
  public static initialize(customConfig?: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...customConfig };
    
    EventLogger.info('PerformanceOptimizer', 'Performance optimization initialized', this.config);
    
    if (this.config.enableAutoOptimization) {
      this.startAutoOptimization();
    }
  }

  /**
   * Start automatic performance optimization
   */
  private static startAutoOptimization(): void {
    // Monitor performance every 60 seconds (less aggressive)
    setInterval(() => {
      if (!this.isOptimizing) {
        this.runOptimizationCycle();
      }
    }, 60000);
  }

  /**
   * Run optimization cycle
   */
  private static async runOptimizationCycle(): Promise<void> {
    this.isOptimizing = true;
    
    try {
      const report = PerformanceAnalyzer.generateReport();
      
      // Only optimize if performance is critical, not just degraded
      if (report.analysis.overallHealth !== 'critical') {
        EventLogger.debug('PerformanceOptimizer', `Performance is ${report.analysis.overallHealth}, skipping optimization`);
        return;
      }
      
      EventLogger.info('PerformanceOptimizer', 'Starting optimization cycle', {
        health: report.analysis.overallHealth,
        launchTime: report.metrics.launchTime,
        frameRate: report.metrics.frameRate,
      });
      
      // Apply optimizations based on bottlenecks
      for (const bottleneck of report.bottlenecks) {
        await this.optimizeBottleneck(bottleneck);
      }
      
      // Clear old cache entries
      this.cleanupCache();
      
      // Run garbage collection if needed
      if (report.metrics.memoryUsage > this.config.maxMemoryUsage) {
        this.requestGarbageCollection();
      }
      
    } catch (error) {
      EventLogger.error('PerformanceOptimizer', 'Optimization cycle failed', error as Error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Optimize specific bottleneck
   */
  private static async optimizeBottleneck(bottleneck: any): Promise<void> {
    EventLogger.debug('PerformanceOptimizer', `Optimizing ${bottleneck.component}`, bottleneck);
    
    switch (bottleneck.component) {
      case 'Animations':
        this.optimizeAnimations();
        break;
      case 'Navigation':
        await this.optimizeNavigation();
        break;
      case 'Memory Management':
        this.optimizeMemory();
        break;
      case 'App Initialization':
        this.optimizeLaunchTime();
        break;
      default:
        EventLogger.warn('PerformanceOptimizer', `Unknown bottleneck: ${bottleneck.component}`);
    }
  }

  /**
   * Optimize animations for better performance
   */
  public static optimizeAnimations(): void {
    if (!this.config.enableAnimationOptimization) return;
    
    EventLogger.info('PerformanceOptimizer', 'Optimizing animations');
    
    // Enable native driver for all animations
    this.animationConfig.useNativeDriver = true;
    
    // Enable animation batching
    this.animationConfig.batchAnimations = true;
    
    // Throttle animation updates
    this.animationConfig.throttleUpdates = true;
    
    // Only simplify animations if performance is really bad
    const report = PerformanceAnalyzer.generateReport();
    if (report.metrics.frameRate < 30) {
      this.animationConfig.simplifyComplexAnimations = true;
      EventLogger.warn('PerformanceOptimizer', 'Simplifying complex animations due to very low FPS');
    }
  }

  /**
   * Optimize navigation performance
   */
  public static async optimizeNavigation(): Promise<void> {
    if (!this.config.enableNavigationPreloading) return;
    
    EventLogger.info('PerformanceOptimizer', 'Optimizing navigation');
    
    // Defer heavy operations until after navigation
    await InteractionManager.runAfterInteractions(() => {
      EventLogger.debug('PerformanceOptimizer', 'Navigation interaction complete');
    });
  }

  /**
   * Optimize memory usage
   */
  public static optimizeMemory(): void {
    EventLogger.info('PerformanceOptimizer', 'Optimizing memory usage');
    
    // Clear cache
    const oldSize = this.cache.size;
    this.cache.clear();
    EventLogger.debug('PerformanceOptimizer', `Cleared ${oldSize} cache entries`);
    
    // Cancel pending operations
    this.pendingOperations.clear();
    
    // Request garbage collection
    this.requestGarbageCollection();
  }

  /**
   * Optimize app launch time
   */
  public static optimizeLaunchTime(): void {
    EventLogger.info('PerformanceOptimizer', 'Optimizing launch time');
    
    // This would typically involve:
    // 1. Lazy loading heavy modules
    // 2. Deferring non-critical initialization
    // 3. Optimizing bundle size
    // 4. Using code splitting
    
    // For now, we just log recommendations
    EventLogger.info('PerformanceOptimizer', 'Launch time optimization recommendations:', {
      recommendations: [
        'Enable Hermes engine for Android',
        'Use lazy loading for heavy components',
        'Defer non-critical service initialization',
        'Implement code splitting',
        'Optimize image assets',
      ],
    });
  }

  /**
   * Request garbage collection if available
   */
  private static requestGarbageCollection(): void {
    if (typeof global.gc === 'function') {
      try {
        global.gc();
        EventLogger.debug('PerformanceOptimizer', 'Garbage collection triggered');
      } catch (error) {
        EventLogger.warn('PerformanceOptimizer', 'Failed to trigger garbage collection');
      }
    }
  }

  /**
   * Cache data with automatic expiration
   */
  public static cacheData(key: string, data: any, ttl: number = 60000): void {
    if (!this.config.enableCaching) return;
    
    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    
    this.cache.set(key, entry);
    
    // Schedule cleanup
    setTimeout(() => {
      this.cache.delete(key);
    }, ttl);
  }

  /**
   * Get cached data
   */
  public static getCachedData(key: string): any | null {
    if (!this.config.enableCaching) return null;
    
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Clean up expired cache entries
   */
  private static cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      EventLogger.debug('PerformanceOptimizer', `Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Defer heavy operation until idle
   */
  public static deferOperation<T>(
    operation: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    const delay = priority === 'high' ? 0 : priority === 'normal' ? 100 : 500;
    
    const promise = new Promise<T>((resolve, reject) => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(async () => {
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            this.pendingOperations.delete(promise);
          }
        }, delay);
      });
    });
    
    this.pendingOperations.add(promise);
    return promise;
  }

  /**
   * Batch multiple operations for better performance
   */
  public static async batchOperations<T>(
    operations: Array<() => Promise<T>>
  ): Promise<T[]> {
    EventLogger.debug('PerformanceOptimizer', `Batching ${operations.length} operations`);
    
    // Execute in chunks to avoid blocking
    const chunkSize = 5;
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += chunkSize) {
      const chunk = operations.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map(op => op()));
      results.push(...chunkResults);
      
      // Allow other operations to run
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return results;
  }

  /**
   * Create optimized animation configuration
   */
  public static getOptimizedAnimationConfig(): any {
    return {
      useNativeDriver: this.animationConfig.useNativeDriver,
      // Reduce duration if simplifying
      duration: this.animationConfig.simplifyComplexAnimations ? 200 : 300,
      // Use simpler easing if needed
      easing: this.animationConfig.simplifyComplexAnimations ? undefined : 'ease-in-out',
    };
  }

  /**
   * Check if operation should be deferred
   */
  public static shouldDeferOperation(): boolean {
    const report = PerformanceAnalyzer.generateReport();
    
    // Only defer if performance is critical
    return report.analysis.overallHealth === 'critical' ||
           report.metrics.frameRate < 30;
  }

  /**
   * Optimize component render
   */
  public static optimizeRender(componentName: string, renderFn: () => void): void {
    if (this.shouldDeferOperation()) {
      // Defer render if performance is poor
      InteractionManager.runAfterInteractions(() => {
        PerformanceMeasurement.trackComponentMount(componentName);
        renderFn();
      });
    } else {
      // Render immediately if performance is good
      PerformanceMeasurement.trackComponentMount(componentName);
      renderFn();
    }
  }

  /**
   * Get optimization status
   */
  public static getStatus(): {
    isOptimizing: boolean;
    config: OptimizationConfig;
    animationConfig: AnimationOptimization;
    cacheSize: number;
    pendingOperations: number;
  } {
    return {
      isOptimizing: this.isOptimizing,
      config: this.config,
      animationConfig: this.animationConfig,
      cacheSize: this.cache.size,
      pendingOperations: this.pendingOperations.size,
    };
  }

  /**
   * Generate optimization report
   */
  public static generateOptimizationReport(): string {
    const performanceReport = PerformanceAnalyzer.generateReport();
    const status = this.getStatus();
    
    const report = {
      timestamp: new Date().toISOString(),
      performance: {
        health: performanceReport.analysis.overallHealth,
        launchTime: performanceReport.metrics.launchTime,
        frameRate: performanceReport.metrics.frameRate,
        memory: performanceReport.metrics.memoryUsage,
      },
      optimizations: {
        enabled: status.config.enableAutoOptimization,
        animationsOptimized: status.animationConfig.useNativeDriver,
        cachingEnabled: status.config.enableCaching,
        cacheEntries: status.cacheSize,
        pendingOperations: status.pendingOperations,
      },
      recommendations: performanceReport.recommendations,
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Log optimization status
   */
  public static logStatus(): void {
    const status = this.getStatus();
    const performanceReport = PerformanceAnalyzer.generateReport();
    
    console.group('⚡ Performance Optimization Status');
    
    console.group('🎯 Current Performance');
    console.log(`Health: ${performanceReport.analysis.overallHealth}`);
    console.log(`Launch Time: ${performanceReport.metrics.launchTime}ms`);
    console.log(`Frame Rate: ${performanceReport.metrics.frameRate}fps`);
    console.log(`Memory: ${performanceReport.metrics.memoryUsage}MB`);
    console.groupEnd();
    
    console.group('⚙️ Optimization Settings');
    console.log(`Auto-optimization: ${status.config.enableAutoOptimization ? 'Enabled' : 'Disabled'}`);
    console.log(`Animation optimization: ${status.config.enableAnimationOptimization ? 'Enabled' : 'Disabled'}`);
    console.log(`Navigation preloading: ${status.config.enableNavigationPreloading ? 'Enabled' : 'Disabled'}`);
    console.log(`Caching: ${status.config.enableCaching ? 'Enabled' : 'Disabled'}`);
    console.groupEnd();
    
    console.group('📊 Runtime Stats');
    console.log(`Cache entries: ${status.cacheSize}`);
    console.log(`Pending operations: ${status.pendingOperations}`);
    console.log(`Currently optimizing: ${status.isOptimizing ? 'Yes' : 'No'}`);
    console.groupEnd();
    
    if (performanceReport.bottlenecks.length > 0) {
      console.group('🚧 Active Bottlenecks');
      performanceReport.bottlenecks.forEach(b => {
        console.warn(`${b.component}: ${b.description}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Auto-initialize in development with conservative settings
if (__DEV__) {
  PerformanceOptimizer.initialize({
    enableAutoOptimization: false, // Disable auto-optimization by default
    targetLaunchTime: 2500, // More realistic target
    targetFPS: 50, // More realistic FPS target
    maxMemoryUsage: 200, // Higher memory threshold
    enableAnimationOptimization: true,
    enableNavigationPreloading: true,
    enableCaching: true,
  });
}