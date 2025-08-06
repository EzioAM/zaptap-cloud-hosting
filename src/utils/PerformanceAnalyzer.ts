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
   * Monitor frame rate
   */
  private static startFrameRateMonitoring(): void {
    if (typeof requestAnimationFrame === 'undefined') return;

    const measureFrame = () => {
      const now = Date.now();
      const frameDuration = now - this.lastFrameTime;
      
      // Only count significant frame drops (> 33ms for 30fps threshold)
      // This avoids false positives from normal JS thread work
      if (frameDuration > 33) {
        this.frameDropCount++;
        // Only warn for severe drops that actually impact user experience
        if (frameDuration > 100) { // Very severe frame drop (< 10fps)
          EventLogger.warn('PerformanceAnalyzer', `Severe frame drop detected: ${frameDuration}ms`);
        }
      }
      
      this.lastFrameTime = now;
      requestAnimationFrame(measureFrame);
    };
    
    requestAnimationFrame(measureFrame);
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
   * Generate comprehensive performance report
   */
  public static generateReport(): PerformanceReport {
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
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, analysis);
    
    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(metrics);
    
    return {
      metrics,
      analysis,
      recommendations,
      bottlenecks,
    };
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
   * Export performance report as JSON
   */
  public static exportReport(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Log performance report to console
   */
  public static logReport(): void {
    const report = this.generateReport();
    
    console.group('🎯 Performance Analysis Report');
    
    console.group('📊 Metrics');
    console.log(`Launch Time: ${report.metrics.launchTime}ms`);
    console.log(`Memory Usage: ${report.metrics.memoryUsage}MB`);
    console.log(`Frame Rate: ${report.metrics.frameRate}fps`);
    console.log(`Error Boundary Overhead: ${report.metrics.errorBoundaryOverhead}ms`);
    console.log(`Animation Smoothness: ${report.metrics.animationSmoothnessScore}/100`);
    console.log(`Avg Navigation Time: ${Math.round(report.metrics.navigationTransitionTime)}ms`);
    console.groupEnd();
    
    console.group('🔍 Analysis');
    console.log(`Launch Time Status: ${report.analysis.launchTimeStatus}`);
    console.log(`Memory Status: ${report.analysis.memoryStatus}`);
    console.log(`Frame Rate Status: ${report.analysis.frameRateStatus}`);
    console.log(`Overall Health: ${report.analysis.overallHealth}`);
    console.groupEnd();
    
    if (report.bottlenecks.length > 0) {
      console.group('🚧 Bottlenecks');
      report.bottlenecks.forEach(bottleneck => {
        console.warn(`[${bottleneck.impact.toUpperCase()}] ${bottleneck.component}`);
        console.log(`  Issue: ${bottleneck.description}`);
        console.log(`  Solution: ${bottleneck.solution}`);
      });
      console.groupEnd();
    }
    
    if (report.recommendations.length > 0) {
      console.group('💡 Recommendations');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Auto-initialize in development
if (__DEV__) {
  PerformanceAnalyzer.initialize();
}