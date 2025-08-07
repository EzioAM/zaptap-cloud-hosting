import { PerformanceMeasurement } from './PerformanceMeasurement';
import { EventLogger } from './EventLogger';

/**
 * Performance Analyzer for ShortcutsLike App
 * Analyzes performance impact of defensive programming measures
 * and provides optimization recommendations
 */

interface PerformanceMetrics {
  launchTime: number;
  memoryUsage: number;
  frameRate: number;
  errorBoundaryOverhead: number;
  animationSmoothnessScore: number;
  navigationTransitionTime: number;
}

interface PerformanceReport {
  metrics: PerformanceMetrics;
  analysis: {
    launchTimeStatus: 'excellent' | 'good' | 'needs_improvement' | 'poor';
    memoryStatus: 'optimal' | 'acceptable' | 'high' | 'critical';
    frameRateStatus: 'smooth' | 'acceptable' | 'choppy' | 'poor';
    overallHealth: 'healthy' | 'degraded' | 'critical';
  };
  recommendations: string[];
  bottlenecks: Array<{
    component: string;
    impact: 'high' | 'medium' | 'low';
    description: string;
    solution: string;
  }>;
}

export class PerformanceAnalyzer {
  private static memoryBaseline: number = 0;
  private static frameDropCount: number = 0;
  private static lastFrameTime: number = 0;
  private static animationMetrics: Map<string, number[]> = new Map();
  private static errorBoundaryTriggers: number = 0;
  private static navigationTransitions: number[] = [];
  private static frameMonitoringActive: boolean = false;
  private static frameMonitoringIntervalId: NodeJS.Timeout | null = null;
  private static lastLogTime: number = 0;
  private static frameDropBuffer: number[] = [];
  private static frameCheckCount: number = 0;
  private static readonly MAX_FRAME_CHECKS = 10000;

  /**
   * Initialize performance monitoring
   */
  public static initialize(): void {
    this.memoryBaseline = this.getCurrentMemoryUsage();
    this.lastFrameTime = Date.now();
    this.startFrameRateMonitoring();
    
    EventLogger.info('PerformanceAnalyzer', 'Performance monitoring initialized', {
      memoryBaseline: this.memoryBaseline,
    });
  }

  /**
   * Get current memory usage in MB
   */
  private static getCurrentMemoryUsage(): number {
    try {
      // React Native doesn't provide direct memory access
      // This is a placeholder - in production, use react-native-performance
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        return Math.round(memory.usedJSHeapSize / 1048576); // Convert to MB
      }
    } catch (error) {
      console.warn('Memory monitoring not available');
    }
    return 0;
  }

  /**
   * Monitor frame rate using setInterval to prevent stack overflow
   */
  private static startFrameRateMonitoring(): void {
    // Prevent duplicate monitoring
    if (this.frameMonitoringActive || this.frameMonitoringIntervalId) return;

    this.frameMonitoringActive = true;
    this.frameCheckCount = 0;
    
    // Use setInterval instead of requestAnimationFrame to prevent stack overflow
    this.frameMonitoringIntervalId = setInterval(() => {
      // Safety check: stop after maximum iterations
      if (!this.frameMonitoringActive || this.frameCheckCount >= this.MAX_FRAME_CHECKS) {
        this.stopFrameRateMonitoring();
        return;
      }
      
      this.frameCheckCount++;
      
      const now = Date.now();
      const frameDuration = now - this.lastFrameTime;
      
      // Only count significant frame drops (> 33ms for 30fps threshold)
      if (frameDuration > 33 && frameDuration < 5000) { // Cap at 5 seconds to prevent overflow
        this.frameDropCount++;
        
        // Buffer severe drops for batch logging
        if (frameDuration > 100 && frameDuration < 1000) { // Cap at 1 second
          this.frameDropBuffer.push(frameDuration);
          
          // Only log once per second to avoid performance impact
          if (now - this.lastLogTime > 1000 && this.frameDropBuffer.length > 0) {
            const maxDrop = Math.max(...this.frameDropBuffer);
            const avgDrop = Math.round(this.frameDropBuffer.reduce((a, b) => a + b, 0) / this.frameDropBuffer.length);
            
            if (__DEV__) {
              EventLogger.warn('PerformanceAnalyzer', `Frame drop: ${maxDrop}ms (avg: ${avgDrop}ms)`);
            }
            
            this.frameDropBuffer = [];
            this.lastLogTime = now;
          }
        }
      }
      
      this.lastFrameTime = now;
      
      // Reset check count periodically to prevent overflow
      if (this.frameCheckCount > this.MAX_FRAME_CHECKS - 100) {
        this.frameCheckCount = 0;
      }
    }, 100); // Check every 100ms (10 times per second)
  }

  /**
   * Track animation performance
   */
  public static trackAnimation(name: string, duration: number): void {
    if (!this.animationMetrics.has(name)) {
      this.animationMetrics.set(name, []);
    }
    
    const metrics = this.animationMetrics.get(name)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
    
    // Warn if animation is consistently slow
    const avgDuration = metrics.reduce((a, b) => a + b, 0) / metrics.length;
    if (avgDuration > 300) {
      EventLogger.warn('PerformanceAnalyzer', `Slow animation detected: ${name} avg ${avgDuration}ms`);
    }
  }

  /**
   * Track error boundary overhead
   */
  public static trackErrorBoundary(componentName: string, recoveryTime: number): void {
    this.errorBoundaryTriggers++;
    
    EventLogger.debug('PerformanceAnalyzer', `Error boundary triggered in ${componentName}`, {
      recoveryTime,
      totalTriggers: this.errorBoundaryTriggers,
    });
    
    // Alert if error boundaries are triggering too frequently
    if (this.errorBoundaryTriggers > 10) {
      EventLogger.critical('PerformanceAnalyzer', 'Excessive error boundary triggers detected', null, {
        count: this.errorBoundaryTriggers,
        component: componentName,
      });
    }
  }

  /**
   * Track navigation transition performance
   */
  public static trackNavigationTransition(duration: number): void {
    this.navigationTransitions.push(duration);
    
    // Keep only last 50 transitions
    if (this.navigationTransitions.length > 50) {
      this.navigationTransitions.shift();
    }
    
    // Warn if transition is slow
    if (duration > 500) {
      EventLogger.warn('PerformanceAnalyzer', `Slow navigation transition: ${duration}ms`);
    }
  }

  /**
   * Calculate frame rate based on frame drops
   */
  private static calculateFrameRate(): number {
    // More realistic FPS calculation
    // Assume 60fps baseline, subtract significant drops only
    const dropPenalty = Math.min(this.frameDropCount * 2, 30); // Cap penalty at 30fps
    const estimatedFPS = Math.max(30, 60 - dropPenalty);
    
    // Reset counter periodically to get fresh measurements
    if (this.frameDropCount > 30) {
      this.frameDropCount = Math.floor(this.frameDropCount / 2); // Decay instead of hard reset
    }
    
    return estimatedFPS;
  }

  /**
   * Calculate animation smoothness score
   */
  private static calculateAnimationSmoothness(): number {
    if (this.animationMetrics.size === 0) return 100;
    
    let totalScore = 0;
    let count = 0;
    
    this.animationMetrics.forEach((durations, name) => {
      if (durations.length === 0) return;
      
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
      
      // Score based on average duration and consistency
      let score = 100;
      
      // Penalize slow animations
      if (avgDuration > 200) score -= 10;
      if (avgDuration > 300) score -= 20;
      if (avgDuration > 500) score -= 30;
      
      // Penalize inconsistent animations
      if (variance > 1000) score -= 10;
      if (variance > 5000) score -= 20;
      
      totalScore += Math.max(0, score);
      count++;
    });
    
    return count > 0 ? Math.round(totalScore / count) : 100;
  }

  /**
   * Generate comprehensive performance report with circular reference protection
   */
  public static generateReport(): PerformanceReport {
    try {
      const launchTime = PerformanceMeasurement.getAppLaunchTime();
      const memoryUsage = this.getCurrentMemoryUsage();
      const frameRate = this.calculateFrameRate();
      const animationSmoothnessScore = this.calculateAnimationSmoothness();
      
      // Calculate average navigation transition time
      const navigationTransitionTime = this.navigationTransitions.length > 0
        ? this.navigationTransitions.reduce((a, b) => a + b, 0) / this.navigationTransitions.length
        : 0;
      
      // Calculate error boundary overhead (estimated)
      const errorBoundaryOverhead = this.errorBoundaryTriggers * 50; // Assume 50ms per trigger
      
      const metrics: PerformanceMetrics = {
        launchTime,
        memoryUsage,
        frameRate,
        errorBoundaryOverhead,
        animationSmoothnessScore,
        navigationTransitionTime,
      };
      
      // Analyze metrics
      const analysis = this.analyzeMetrics(metrics);
      
      // Generate recommendations - limit to prevent stack overflow
      const recommendations = this.generateRecommendations(metrics, analysis).slice(0, 10);
      
      // Identify bottlenecks - limit to prevent stack overflow
      const bottlenecks = this.identifyBottlenecks(metrics).slice(0, 10);
      
      // Create report with circular reference check
      const report = {
        metrics,
        analysis,
        recommendations,
        bottlenecks,
      };
      
      // Verify no circular references by trying to stringify
      try {
        JSON.stringify(report);
      } catch (e) {
        console.warn('PerformanceAnalyzer: Report contains circular references');
        // Return a minimal safe report
        return {
          metrics,
          analysis,
          recommendations: [],
          bottlenecks: [],
        };
      }
      
      return report;
    } catch (error) {
      console.error('PerformanceAnalyzer: Failed to generate report', error);
      // Return a minimal safe report on error
      return {
        metrics: {
          launchTime: 0,
          memoryUsage: 0,
          frameRate: 60,
          errorBoundaryOverhead: 0,
          animationSmoothnessScore: 100,
          navigationTransitionTime: 0,
        },
        analysis: {
          launchTimeStatus: 'excellent',
          memoryStatus: 'optimal',
          frameRateStatus: 'smooth',
          overallHealth: 'healthy',
        },
        recommendations: [],
        bottlenecks: [],
      };
    }
  }

  /**
   * Analyze performance metrics
   */
  private static analyzeMetrics(metrics: PerformanceMetrics): PerformanceReport['analysis'] {
    // Launch time analysis - more realistic thresholds
    let launchTimeStatus: 'excellent' | 'good' | 'needs_improvement' | 'poor';
    if (metrics.launchTime < 1500) launchTimeStatus = 'excellent';
    else if (metrics.launchTime < 2500) launchTimeStatus = 'good';
    else if (metrics.launchTime < 4000) launchTimeStatus = 'needs_improvement';
    else launchTimeStatus = 'poor';
    
    // Memory analysis
    let memoryStatus: 'optimal' | 'acceptable' | 'high' | 'critical';
    if (metrics.memoryUsage < 50) memoryStatus = 'optimal';
    else if (metrics.memoryUsage < 100) memoryStatus = 'acceptable';
    else if (metrics.memoryUsage < 200) memoryStatus = 'high';
    else memoryStatus = 'critical';
    
    // Frame rate analysis - more forgiving thresholds
    let frameRateStatus: 'smooth' | 'acceptable' | 'choppy' | 'poor';
    if (metrics.frameRate >= 50) frameRateStatus = 'smooth';
    else if (metrics.frameRate >= 40) frameRateStatus = 'acceptable';
    else if (metrics.frameRate >= 30) frameRateStatus = 'choppy';
    else frameRateStatus = 'poor';
    
    // Overall health - more balanced assessment
    let overallHealth: 'healthy' | 'degraded' | 'critical';
    const criticalCount = [
      launchTimeStatus === 'poor',
      memoryStatus === 'critical',
      frameRateStatus === 'poor',
    ].filter(Boolean).length;
    
    const degradedCount = [
      launchTimeStatus === 'needs_improvement',
      memoryStatus === 'high',
      frameRateStatus === 'choppy',
    ].filter(Boolean).length;
    
    if (criticalCount >= 2) overallHealth = 'critical';
    else if (criticalCount === 1 || degradedCount >= 2) overallHealth = 'degraded';
    else overallHealth = 'healthy';
    
    return {
      launchTimeStatus,
      memoryStatus,
      frameRateStatus,
      overallHealth,
    };
  }

  /**
   * Generate performance recommendations
   */
  private static generateRecommendations(
    metrics: PerformanceMetrics,
    analysis: PerformanceReport['analysis']
  ): string[] {
    const recommendations: string[] = [];
    
    // Launch time recommendations
    if (metrics.launchTime > 2000) {
      recommendations.push('Consider implementing code splitting to reduce initial bundle size');
      recommendations.push('Defer non-critical service initialization');
      recommendations.push('Use lazy loading for heavy components');
    }
    
    // Memory recommendations
    if (metrics.memoryUsage > 100) {
      recommendations.push('Review and optimize image assets');
      recommendations.push('Implement proper cleanup in useEffect hooks');
      recommendations.push('Check for memory leaks in error boundaries');
    }
    
    // Frame rate recommendations
    if (metrics.frameRate < 55) {
      recommendations.push('Optimize animation performance with useNativeDriver');
      recommendations.push('Reduce complex calculations during animations');
      recommendations.push('Consider using InteractionManager for heavy operations');
    }
    
    // Error boundary recommendations
    if (metrics.errorBoundaryOverhead > 200) {
      recommendations.push('Investigate frequent error boundary triggers');
      recommendations.push('Add more specific error handling to prevent boundary triggers');
      recommendations.push('Consider removing unnecessary error boundaries');
    }
    
    // Animation recommendations
    if (metrics.animationSmoothnessScore < 80) {
      recommendations.push('Simplify complex animations');
      recommendations.push('Use Animated.Value instead of state for animation values');
      recommendations.push('Batch animation updates with Animated.parallel');
    }
    
    // Navigation recommendations
    if (metrics.navigationTransitionTime > 300) {
      recommendations.push('Optimize screen component render performance');
      recommendations.push('Implement screen preloading for common navigation paths');
      recommendations.push('Reduce initial data fetching in screen components');
    }
    
    return recommendations;
  }

  /**
   * Identify performance bottlenecks
   */
  private static identifyBottlenecks(metrics: PerformanceMetrics): PerformanceReport['bottlenecks'] {
    const bottlenecks: PerformanceReport['bottlenecks'] = [];
    
    // Check launch time bottleneck
    if (metrics.launchTime > 2000) {
      bottlenecks.push({
        component: 'App Initialization',
        impact: metrics.launchTime > 3000 ? 'high' : 'medium',
        description: `App launch time is ${metrics.launchTime}ms (target: <2000ms)`,
        solution: 'Implement lazy loading and defer non-critical initialization',
      });
    }
    
    // Check animation bottleneck
    if (metrics.animationSmoothnessScore < 80) {
      bottlenecks.push({
        component: 'Animations',
        impact: metrics.animationSmoothnessScore < 60 ? 'high' : 'medium',
        description: `Animation smoothness score is ${metrics.animationSmoothnessScore}/100`,
        solution: 'Optimize animation code and use native driver',
      });
    }
    
    // Check error boundary bottleneck
    if (this.errorBoundaryTriggers > 5) {
      bottlenecks.push({
        component: 'Error Boundaries',
        impact: this.errorBoundaryTriggers > 10 ? 'high' : 'medium',
        description: `Error boundaries triggered ${this.errorBoundaryTriggers} times`,
        solution: 'Fix underlying errors to prevent boundary triggers',
      });
    }
    
    // Check navigation bottleneck
    if (metrics.navigationTransitionTime > 300) {
      bottlenecks.push({
        component: 'Navigation',
        impact: metrics.navigationTransitionTime > 500 ? 'high' : 'medium',
        description: `Average navigation transition time is ${Math.round(metrics.navigationTransitionTime)}ms`,
        solution: 'Optimize screen components and implement lazy loading',
      });
    }
    
    // Check memory bottleneck
    if (metrics.memoryUsage > 100) {
      bottlenecks.push({
        component: 'Memory Management',
        impact: metrics.memoryUsage > 200 ? 'high' : 'medium',
        description: `Memory usage is ${metrics.memoryUsage}MB`,
        solution: 'Review component lifecycle and implement proper cleanup',
      });
    }
    
    return bottlenecks;
  }

  /**
   * Run performance benchmark
   */
  public static async runBenchmark(): Promise<void> {
    EventLogger.info('PerformanceAnalyzer', 'Starting performance benchmark...');
    
    const startTime = Date.now();
    
    // Test 1: Component render performance
    const renderStart = Date.now();
    // Simulate component renders
    for (let i = 0; i < 100; i++) {
      this.trackAnimation(`test-render-${i}`, Math.random() * 50 + 10);
    }
    const renderTime = Date.now() - renderStart;
    
    // Test 2: Navigation performance
    const navStart = Date.now();
    // Simulate navigation transitions
    for (let i = 0; i < 10; i++) {
      this.trackNavigationTransition(Math.random() * 200 + 100);
    }
    const navTime = Date.now() - navStart;
    
    // Test 3: Error boundary recovery
    const errorStart = Date.now();
    // Simulate error boundary triggers
    for (let i = 0; i < 3; i++) {
      this.trackErrorBoundary('TestComponent', Math.random() * 100 + 50);
    }
    const errorTime = Date.now() - errorStart;
    
    const totalTime = Date.now() - startTime;
    
    EventLogger.info('PerformanceAnalyzer', 'Benchmark completed', {
      totalTime,
      renderTime,
      navTime,
      errorTime,
      renderPerformance: renderTime < 100 ? 'excellent' : renderTime < 200 ? 'good' : 'poor',
      navPerformance: navTime < 50 ? 'excellent' : navTime < 100 ? 'good' : 'poor',
      errorPerformance: errorTime < 50 ? 'excellent' : errorTime < 100 ? 'good' : 'poor',
    });
  }

  /**
   * Export performance report as JSON with circular reference protection
   */
  public static exportReport(): string {
    try {
      const report = this.generateReport();
      // Use a replacer to handle any potential circular references
      const seen = new WeakSet();
      return JSON.stringify(report, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      }, 2);
    } catch (error) {
      console.error('PerformanceAnalyzer: Failed to export report', error);
      return '{}';
    }
  }

  /**
   * Log performance report to console (simplified to prevent stack overflow)
   */
  public static logReport(): void {
    try {
      const report = this.generateReport();
      
      // Use simple console.log instead of nested console.group to prevent stack issues
      console.log('🎯 Performance Analysis Report');
      console.log('=====================================');
      
      // Metrics
      console.log('📊 Metrics:');
      console.log(`  Launch Time: ${report.metrics.launchTime}ms`);
      console.log(`  Memory Usage: ${report.metrics.memoryUsage}MB`);
      console.log(`  Frame Rate: ${report.metrics.frameRate}fps`);
      console.log(`  Error Boundary Overhead: ${report.metrics.errorBoundaryOverhead}ms`);
      console.log(`  Animation Smoothness: ${report.metrics.animationSmoothnessScore}/100`);
      console.log(`  Avg Navigation Time: ${Math.round(report.metrics.navigationTransitionTime)}ms`);
      
      // Analysis
      console.log('\n🔍 Analysis:');
      console.log(`  Launch Time Status: ${report.analysis.launchTimeStatus}`);
      console.log(`  Memory Status: ${report.analysis.memoryStatus}`);
      console.log(`  Frame Rate Status: ${report.analysis.frameRateStatus}`);
      console.log(`  Overall Health: ${report.analysis.overallHealth}`);
      
      // Bottlenecks - safely handle
      if (report.bottlenecks && report.bottlenecks.length > 0) {
        console.log('\n🚧 Bottlenecks:');
        // Limit iteration to prevent issues
        const maxBottlenecks = Math.min(report.bottlenecks.length, 5);
        for (let i = 0; i < maxBottlenecks; i++) {
          const bottleneck = report.bottlenecks[i];
          if (bottleneck && bottleneck.component) {
            console.log(`  [${bottleneck.impact}] ${bottleneck.component}`);
            console.log(`    Issue: ${bottleneck.description}`);
            console.log(`    Solution: ${bottleneck.solution}`);
          }
        }
      }
      
      // Recommendations - safely handle
      if (report.recommendations && report.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        // Limit iteration to prevent issues
        const maxRecs = Math.min(report.recommendations.length, 5);
        for (let i = 0; i < maxRecs; i++) {
          console.log(`  ${i + 1}. ${report.recommendations[i]}`);
        }
      }
      
      console.log('=====================================');
    } catch (error) {
      // Fail silently to prevent crash
      console.error('PerformanceAnalyzer: Failed to log report', error);
    }
  }

  /**
   * Stop frame rate monitoring
   */
  public static stopFrameRateMonitoring(): void {
    this.frameMonitoringActive = false;
    if (this.frameMonitoringIntervalId !== null) {
      clearInterval(this.frameMonitoringIntervalId);
      this.frameMonitoringIntervalId = null;
    }
    this.frameCheckCount = 0;
  }

  /**
   * Cleanup and reset
   */
  public static cleanup(): void {
    this.stopFrameRateMonitoring();
    this.frameDropCount = 0;
    this.frameDropBuffer = [];
    this.frameCheckCount = 0;
    this.animationMetrics.clear();
    this.errorBoundaryTriggers = 0;
    this.navigationTransitions = [];
  }
}

// Auto-initialization disabled - now controlled by App.tsx for better timing