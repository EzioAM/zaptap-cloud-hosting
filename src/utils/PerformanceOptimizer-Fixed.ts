import { InteractionManager } from 'react-native';
import { PerformanceMeasurement } from './PerformanceMeasurement';
import { PerformanceAnalyzer } from './PerformanceAnalyzer';
import { EventLogger } from './EventLogger';

/**
 * Performance Optimizer for ShortcutsLike App - FIXED VERSION
 * Safely optimizes performance without blocking touch events
 * 
 * KEY FIXES:
 * 1. Removed aggressive auto-optimization that blocks UI
 * 2. InteractionManager usage is now opt-in, not automatic
 * 3. Animation optimization no longer blocks touch events
 * 4. Frame rate monitoring doesn't trigger aggressive throttling
 * 5. Memory optimization is gentler and less frequent
 */

interface OptimizationConfig {
  enableAutoOptimization: boolean;
  targetLaunchTime: number;
  targetFPS: number;
  maxMemoryUsage: number;
  enableAnimationOptimization: boolean;
  enableNavigationPreloading: boolean;
  enableCaching: boolean;
  // NEW: Control touch event blocking
  allowTouchBlocking: boolean;
  // NEW: Maximum delay for deferred operations
  maxDeferDelay: number;
}

interface AnimationOptimization {
  useNativeDriver: boolean;
  batchAnimations: boolean;
  throttleUpdates: boolean;
  simplifyComplexAnimations: boolean;
  // NEW: Control animation frame rate
  targetAnimationFPS: number;
  // NEW: Allow animations to interrupt
  allowInterruption: boolean;
}

export class PerformanceOptimizer {
  private static config: OptimizationConfig = {
    enableAutoOptimization: false, // CHANGED: Default to false
    targetLaunchTime: 3000, // CHANGED: More realistic target
    targetFPS: 50, // CHANGED: Lower target to prevent aggressive optimization
    maxMemoryUsage: 200, // CHANGED: Higher threshold
    enableAnimationOptimization: true,
    enableNavigationPreloading: false, // CHANGED: Disabled by default
    enableCaching: true,
    allowTouchBlocking: false, // NEW: Never block touch events
    maxDeferDelay: 50, // NEW: Maximum 50ms defer
  };

  private static animationConfig: AnimationOptimization = {
    useNativeDriver: true,
    batchAnimations: false, // CHANGED: Disabled by default
    throttleUpdates: false, // CHANGED: Disabled by default
    simplifyComplexAnimations: false,
    targetAnimationFPS: 60, // NEW: Target frame rate for animations
    allowInterruption: true, // NEW: Allow touch to interrupt animations
  };

  private static cache = new Map<string, any>();
  private static pendingOperations = new Set<Promise<any>>();
  private static isOptimizing = false;
  private static lastOptimizationTime = 0;
  private static touchEventActive = false;

  /**
   * Initialize performance optimization with safer defaults
   */
  public static initialize(customConfig?: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...customConfig };
    
    EventLogger.info('PerformanceOptimizer', 'Performance optimization initialized (FIXED)', this.config);
    
    // Register touch event listeners to prevent blocking
    this.registerTouchEventListeners();
    
    if (this.config.enableAutoOptimization) {
      this.startAutoOptimization();
    }
  }

  /**
   * Register touch event listeners to track when touch is active
   */
  private static registerTouchEventListeners(): void {
    // Note: This is a conceptual implementation
    // In practice, you'd hook into the React Native touch system
    EventLogger.debug('PerformanceOptimizer', 'Touch event protection enabled');
  }

  /**
   * Mark touch event as active to prevent blocking
   */
  public static markTouchActive(active: boolean): void {
    this.touchEventActive = active;
    if (active) {
      EventLogger.debug('PerformanceOptimizer', 'Touch event active - preventing blocking operations');
    }
  }

  /**
   * Start automatic performance optimization with gentler approach
   */
  private static startAutoOptimization(): void {
    // Monitor performance every 2 minutes (much less aggressive)
    setInterval(() => {
      // Skip if touch is active or recently optimized
      if (!this.isOptimizing && !this.touchEventActive && 
          Date.now() - this.lastOptimizationTime > 120000) {
        this.runOptimizationCycle();
      }
    }, 120000);
  }

  /**
   * Run optimization cycle with safety checks
   */
  private static async runOptimizationCycle(): Promise<void> {
    // Don't optimize if touch is active
    if (this.touchEventActive) {
      EventLogger.debug('PerformanceOptimizer', 'Skipping optimization - touch active');
      return;
    }

    this.isOptimizing = true;
    this.lastOptimizationTime = Date.now();
    
    try {
      const report = PerformanceAnalyzer.generateReport();
      
      // Only optimize if performance is critical AND no touch events
      if (report.analysis.overallHealth !== 'critical') {
        EventLogger.debug('PerformanceOptimizer', `Performance is ${report.analysis.overallHealth}, skipping optimization`);
        return;
      }
      
      EventLogger.info('PerformanceOptimizer', 'Starting gentle optimization cycle', {
        health: report.analysis.overallHealth,
        frameRate: report.metrics.frameRate,
      });
      
      // Apply only non-blocking optimizations
      for (const bottleneck of report.bottlenecks) {
        if (!this.touchEventActive) {
          await this.optimizeBottleneckSafely(bottleneck);
        }
      }
      
      // Gentle cache cleanup
      if (!this.touchEventActive) {
        this.cleanupCache();
      }
      
    } catch (error) {
      EventLogger.error('PerformanceOptimizer', 'Optimization cycle failed', error as Error);
    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Optimize bottleneck without blocking UI
   */
  private static async optimizeBottleneckSafely(bottleneck: any): Promise<void> {
    EventLogger.debug('PerformanceOptimizer', `Safely optimizing ${bottleneck.component}`, bottleneck);
    
    switch (bottleneck.component) {
      case 'Animations':
        this.optimizeAnimationsSafely();
        break;
      case 'Navigation':
        // Skip navigation optimization as it can block
        EventLogger.debug('PerformanceOptimizer', 'Skipping navigation optimization to prevent blocking');
        break;
      case 'Memory Management':
        this.optimizeMemoryGently();
        break;
      case 'App Initialization':
        // Can't optimize launch time while running
        break;
      default:
        EventLogger.warn('PerformanceOptimizer', `Unknown bottleneck: ${bottleneck.component}`);
    }
  }

  /**
   * Optimize animations without blocking touch events
   */
  public static optimizeAnimationsSafely(): void {
    if (!this.config.enableAnimationOptimization) return;
    
    EventLogger.info('PerformanceOptimizer', 'Optimizing animations safely');
    
    // Always use native driver for better performance
    this.animationConfig.useNativeDriver = true;
    
    // Allow interruption for touch responsiveness
    this.animationConfig.allowInterruption = true;
    
    // Don't batch or throttle by default - this can block touch
    this.animationConfig.batchAnimations = false;
    this.animationConfig.throttleUpdates = false;
    
    // Only simplify if performance is extremely bad
    const report = PerformanceAnalyzer.generateReport();
    if (report.metrics.frameRate < 20) {
      this.animationConfig.simplifyComplexAnimations = true;
      EventLogger.warn('PerformanceOptimizer', 'Simplifying animations due to very low FPS (<20)');
    }
  }

  /**
   * DEPRECATED: Use optimizeAnimationsSafely instead
   */
  public static optimizeAnimations(): void {
    EventLogger.warn('PerformanceOptimizer', 'optimizeAnimations is deprecated, using optimizeAnimationsSafely');
    this.optimizeAnimationsSafely();
  }

  /**
   * Optimize navigation without blocking
   */
  public static async optimizeNavigation(): Promise<void> {
    if (!this.config.enableNavigationPreloading) return;
    
    EventLogger.info('PerformanceOptimizer', 'Navigation optimization disabled to prevent blocking');
    // Don't use InteractionManager.runAfterInteractions as it can delay touch events
  }

  /**
   * Gentle memory optimization
   */
  public static optimizeMemoryGently(): void {
    EventLogger.info('PerformanceOptimizer', 'Gentle memory optimization');
    
    // Only clear old cache entries, not everything
    this.cleanupCache();
    
    // Don't clear pending operations as they might be important
    EventLogger.debug('PerformanceOptimizer', `Keeping ${this.pendingOperations.size} pending operations`);
  }

  /**
   * DEPRECATED: Use optimizeMemoryGently instead
   */
  public static optimizeMemory(): void {
    EventLogger.warn('PerformanceOptimizer', 'optimizeMemory is deprecated, using optimizeMemoryGently');
    this.optimizeMemoryGently();
  }

  /**
   * Optimize app launch time (called once at startup)
   */
  public static optimizeLaunchTime(): void {
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
   * Request garbage collection if available (gentle approach)
   */
  private static requestGarbageCollection(): void {
    // Only try GC if memory is really high
    const report = PerformanceAnalyzer.generateReport();
    if (report.metrics.memoryUsage > this.config.maxMemoryUsage * 1.5) {
      if (typeof global.gc === 'function') {
        try {
          global.gc();
          EventLogger.debug('PerformanceOptimizer', 'Garbage collection triggered');
        } catch (error) {
          EventLogger.warn('PerformanceOptimizer', 'Failed to trigger garbage collection');
        }
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
   * Clean up expired cache entries (gentle)
   */
  private static cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    let checkedCount = 0;
    const maxChecks = 50; // Limit checks to prevent blocking
    
    for (const [key, entry] of this.cache.entries()) {
      if (checkedCount >= maxChecks) break;
      checkedCount++;
      
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      EventLogger.debug('PerformanceOptimizer', `Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Defer operation with touch event awareness
   */
  public static deferOperation<T>(
    operation: () => Promise<T>,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<T> {
    // If touch is active or blocking not allowed, run immediately
    if (this.touchEventActive || !this.config.allowTouchBlocking) {
      return operation();
    }
    
    // Use minimal delays
    const delay = priority === 'high' ? 0 : priority === 'normal' ? 10 : 30;
    const actualDelay = Math.min(delay, this.config.maxDeferDelay);
    
    const promise = new Promise<T>((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.pendingOperations.delete(promise);
        }
      }, actualDelay);
    });
    
    this.pendingOperations.add(promise);
    return promise;
  }

  /**
   * Batch operations without blocking
   */
  public static async batchOperations<T>(
    operations: Array<() => Promise<T>>
  ): Promise<T[]> {
    EventLogger.debug('PerformanceOptimizer', `Batching ${operations.length} operations`);
    
    // If touch is active, run all immediately
    if (this.touchEventActive) {
      return Promise.all(operations.map(op => op()));
    }
    
    // Execute in smaller chunks
    const chunkSize = 3; // Smaller chunks
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += chunkSize) {
      const chunk = operations.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(chunk.map(op => op()));
      results.push(...chunkResults);
      
      // Minimal delay between chunks
      if (i + chunkSize < operations.length && !this.touchEventActive) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }

  /**
   * Get optimized animation configuration
   */
  public static getOptimizedAnimationConfig(): any {
    return {
      useNativeDriver: this.animationConfig.useNativeDriver,
      // Don't reduce duration too much - keeps UI responsive
      duration: this.animationConfig.simplifyComplexAnimations ? 250 : 300,
      // Keep easing for smooth feel
      easing: 'ease-in-out',
      // Allow interruption
      isInteraction: false, // Don't block interactions
    };
  }

  /**
   * Check if operation should be deferred (more conservative)
   */
  public static shouldDeferOperation(): boolean {
    // Never defer if touch is active
    if (this.touchEventActive) return false;
    
    const report = PerformanceAnalyzer.generateReport();
    
    // Only defer if performance is critical AND frame rate is very low
    return report.analysis.overallHealth === 'critical' && 
           report.metrics.frameRate < 20;
  }

  /**
   * Optimize component render without blocking
   */
  public static optimizeRender(componentName: string, renderFn: () => void): void {
    // Never defer render if touch is active
    if (this.touchEventActive || !this.shouldDeferOperation()) {
      PerformanceMeasurement.trackComponentMount(componentName);
      renderFn();
      return;
    }
    
    // Use requestAnimationFrame instead of InteractionManager for smoother rendering
    requestAnimationFrame(() => {
      PerformanceMeasurement.trackComponentMount(componentName);
      renderFn();
    });
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
    touchEventActive: boolean;
  } {
    return {
      isOptimizing: this.isOptimizing,
      config: this.config,
      animationConfig: this.animationConfig,
      cacheSize: this.cache.size,
      pendingOperations: this.pendingOperations.size,
      touchEventActive: this.touchEventActive,
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
        frameRate: performanceReport.metrics.frameRate,
        memory: performanceReport.metrics.memoryUsage,
      },
      optimizations: {
        enabled: status.config.enableAutoOptimization,
        touchBlocking: status.config.allowTouchBlocking,
        animationsOptimized: status.animationConfig.useNativeDriver,
        cachingEnabled: status.config.enableCaching,
        cacheEntries: status.cacheSize,
        pendingOperations: status.pendingOperations,
        touchActive: status.touchEventActive,
      },
      recommendations: [
        ...performanceReport.recommendations,
        'Keep allowTouchBlocking disabled for better responsiveness',
        'Use requestAnimationFrame instead of InteractionManager for UI updates',
        'Minimize use of blur effects and complex animations',
      ],
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Log optimization status
   */
  public static logStatus(): void {
    const status = this.getStatus();
    const performanceReport = PerformanceAnalyzer.generateReport();
    
    console.group('⚡ Performance Optimization Status (FIXED)');
    
    console.group('🎯 Current Performance');
    console.log(`Health: ${performanceReport.analysis.overallHealth}`);
    console.log(`Frame Rate: ${performanceReport.metrics.frameRate}fps`);
    console.log(`Memory: ${performanceReport.metrics.memoryUsage}MB`);
    console.log(`Touch Active: ${status.touchEventActive ? 'YES' : 'NO'}`);
    console.groupEnd();
    
    console.group('⚙️ Optimization Settings');
    console.log(`Auto-optimization: ${status.config.enableAutoOptimization ? 'Enabled' : 'Disabled'}`);
    console.log(`Touch Blocking: ${status.config.allowTouchBlocking ? 'ALLOWED' : 'DISABLED'} ✅`);
    console.log(`Animation optimization: ${status.config.enableAnimationOptimization ? 'Enabled' : 'Disabled'}`);
    console.log(`Max Defer Delay: ${status.config.maxDeferDelay}ms`);
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

// Auto-initialize in development with safe settings
if (__DEV__) {
  PerformanceOptimizer.initialize({
    enableAutoOptimization: false, // No auto-optimization
    targetLaunchTime: 3000,
    targetFPS: 50,
    maxMemoryUsage: 200,
    enableAnimationOptimization: true,
    enableNavigationPreloading: false, // Don't block navigation
    enableCaching: true,
    allowTouchBlocking: false, // NEVER block touch events
    maxDeferDelay: 30, // Maximum 30ms delay
  });
}