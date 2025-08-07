import { InteractionManager } from 'react-native';
import { EventLogger } from './EventLogger';

/**
 * Touch Performance Analyzer
 * Diagnoses touch responsiveness issues and identifies performance bottlenecks
 */

interface TouchPerformanceMetrics {
  mainThreadBlocked: boolean;
  animationOverload: number;
  scrollHandlerDelay: number;
  rerenderCount: number;
  memoryPressure: boolean;
  jsFrameDrops: number;
  nativeFrameDrops: number;
  pendingAnimations: number;
  touchLatency: number;
}

interface PerformanceBottleneck {
  component: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  solution: string;
}

export class TouchPerformanceAnalyzer {
  private static animationCount = 0;
  private static rerenderCount = 0;
  private static scrollEventCount = 0;
  private static lastScrollTime = 0;
  private static touchResponseTimes: number[] = [];
  private static frameDrops = 0;
  private static pendingInteractions = 0;

  /**
   * Analyze current performance state affecting touch responsiveness
   */
  public static analyzePerformance(): {
    metrics: TouchPerformanceMetrics;
    bottlenecks: PerformanceBottleneck[];
    recommendations: string[];
  } {
    const metrics = this.collectMetrics();
    const bottlenecks = this.identifyBottlenecks(metrics);
    const recommendations = this.generateRecommendations(bottlenecks, metrics);

    return {
      metrics,
      bottlenecks,
      recommendations,
    };
  }

  /**
   * Collect current performance metrics
   */
  private static collectMetrics(): TouchPerformanceMetrics {
    // Check if main thread is blocked
    let mainThreadBlocked = false;
    const blockCheckStart = Date.now();
    
    // Schedule a check on the next frame
    InteractionManager.runAfterInteractions(() => {
      const delay = Date.now() - blockCheckStart;
      if (delay > 100) {
        mainThreadBlocked = true;
        EventLogger.warn('TouchPerformanceAnalyzer', `Main thread blocked for ${delay}ms`);
      }
    });

    // Calculate average touch response time
    const avgTouchLatency = this.touchResponseTimes.length > 0
      ? this.touchResponseTimes.reduce((a, b) => a + b, 0) / this.touchResponseTimes.length
      : 0;

    // Check memory pressure (simplified - in production use react-native-performance)
    const memoryPressure = false; // Would need native module for accurate measurement

    return {
      mainThreadBlocked,
      animationOverload: this.animationCount,
      scrollHandlerDelay: this.calculateScrollDelay(),
      rerenderCount: this.rerenderCount,
      memoryPressure,
      jsFrameDrops: this.frameDrops,
      nativeFrameDrops: 0, // Would need native module
      pendingAnimations: this.animationCount,
      touchLatency: avgTouchLatency,
    };
  }

  /**
   * Calculate scroll handler delay
   */
  private static calculateScrollDelay(): number {
    if (this.lastScrollTime === 0) return 0;
    
    const now = Date.now();
    const timeSinceLastScroll = now - this.lastScrollTime;
    
    // If we're getting scroll events too frequently, it indicates performance issues
    if (timeSinceLastScroll < 16) { // Less than 60fps
      return 16 - timeSinceLastScroll;
    }
    
    return 0;
  }

  /**
   * Identify specific performance bottlenecks
   */
  private static identifyBottlenecks(metrics: TouchPerformanceMetrics): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = [];

    // Check for animation overload
    if (metrics.animationOverload > 10) {
      bottlenecks.push({
        component: 'ModernHomeScreen',
        issue: 'Too many concurrent animations',
        severity: 'critical',
        impact: 'Blocks touch events and causes UI freezing',
        solution: 'Reduce number of animated values, use Animated.parallel for batch updates',
      });
    }

    // Check for scroll performance issues
    if (metrics.scrollHandlerDelay > 5) {
      bottlenecks.push({
        component: 'ParallaxScrollView',
        issue: 'Heavy scroll event processing',
        severity: 'high',
        impact: 'Delays touch response during scrolling',
        solution: 'Increase scrollEventThrottle, optimize scroll handler logic',
      });
    }

    // Check for excessive re-renders
    if (metrics.rerenderCount > 50) {
      bottlenecks.push({
        component: 'Dashboard Widgets',
        issue: 'Excessive component re-renders',
        severity: 'high',
        impact: 'Blocks main thread and prevents touch processing',
        solution: 'Implement React.memo, useMemo, and useCallback properly',
      });
    }

    // Check for main thread blocking
    if (metrics.mainThreadBlocked) {
      bottlenecks.push({
        component: 'JavaScript Thread',
        issue: 'Main thread blocked by heavy computation',
        severity: 'critical',
        impact: 'Complete UI freeze, no touch events processed',
        solution: 'Move heavy operations to InteractionManager.runAfterInteractions',
      });
    }

    // Check for touch latency
    if (metrics.touchLatency > 100) {
      bottlenecks.push({
        component: 'Touch Handlers',
        issue: 'High touch event processing latency',
        severity: 'high',
        impact: 'Delayed or missed touch events',
        solution: 'Simplify onPress handlers, avoid heavy operations in touch callbacks',
      });
    }

    // Check for frame drops
    if (metrics.jsFrameDrops > 10) {
      bottlenecks.push({
        component: 'Animation System',
        issue: 'JavaScript frame drops during animations',
        severity: 'medium',
        impact: 'Choppy animations and delayed touch response',
        solution: 'Use useNativeDriver: true for all animations',
      });
    }

    // Specific issues in ModernHomeScreen
    bottlenecks.push({
      component: 'ModernHomeScreen',
      issue: 'Multiple Animated.Value instances without cleanup',
      severity: 'high',
      impact: 'Memory leaks and increasing performance degradation',
      solution: 'Use useRef for Animated.Value, implement proper cleanup',
    });

    bottlenecks.push({
      component: 'ModernHomeScreen',
      issue: 'Unthrottled scroll handler with complex calculations',
      severity: 'critical',
      impact: 'Blocks touch events during scroll',
      solution: 'Throttle scroll handler, move calculations off main thread',
    });

    bottlenecks.push({
      component: 'ParallaxScrollView',
      issue: 'Complex interpolations recalculated on every render',
      severity: 'medium',
      impact: 'Increased CPU usage and potential touch delays',
      solution: 'Memoize interpolated values with useMemo',
    });

    return bottlenecks;
  }

  /**
   * Generate specific recommendations
   */
  private static generateRecommendations(
    bottlenecks: PerformanceBottleneck[],
    metrics: TouchPerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Critical fixes for touch responsiveness
    recommendations.push('IMMEDIATE: Remove or comment out blur overlay in ModernHomeScreen (lines 431-444)');
    recommendations.push('IMMEDIATE: Reduce scrollEventThrottle from 16 to 100 in ModernHomeScreen');
    recommendations.push('IMMEDIATE: Add pointerEvents="box-none" to animation wrapper views');
    
    // Animation optimizations
    recommendations.push('Use InteractionManager.runAfterInteractions for staggered animations');
    recommendations.push('Replace multiple Animated.Value with single Animated.ValueXY where possible');
    recommendations.push('Add useNativeDriver: true to ALL animations');
    
    // Scroll optimizations
    recommendations.push('Debounce or throttle handleScroll function');
    recommendations.push('Move scroll calculations to async function');
    recommendations.push('Use Animated.event with useNativeDriver for scroll animations');
    
    // Component optimizations
    recommendations.push('Wrap all widgets in React.memo');
    recommendations.push('Use useMemo for expensive calculations in widgets');
    recommendations.push('Implement shouldComponentUpdate for class components');
    
    // Touch handling
    recommendations.push('Replace TouchableOpacity with Pressable for better performance');
    recommendations.push('Add disabled state during animations to prevent touch conflicts');
    recommendations.push('Use hitSlop sparingly - large hit areas can cause touch conflicts');

    // Memory management
    recommendations.push('Clear animation listeners in useEffect cleanup');
    recommendations.push('Limit animation history arrays to prevent memory growth');
    recommendations.push('Use weak references for event handlers');

    return recommendations;
  }

  /**
   * Track animation lifecycle
   */
  public static trackAnimation(name: string, started: boolean): void {
    if (started) {
      this.animationCount++;
      EventLogger.debug('TouchPerformanceAnalyzer', `Animation started: ${name}`, {
        activeAnimations: this.animationCount,
      });
    } else {
      this.animationCount = Math.max(0, this.animationCount - 1);
      EventLogger.debug('TouchPerformanceAnalyzer', `Animation ended: ${name}`, {
        activeAnimations: this.animationCount,
      });
    }

    // Warn if too many concurrent animations
    if (this.animationCount > 10) {
      EventLogger.warn('TouchPerformanceAnalyzer', 'High animation count detected', {
        count: this.animationCount,
        warning: 'May cause touch responsiveness issues',
      });
    }
  }

  /**
   * Track component re-renders
   */
  public static trackRerender(componentName: string): void {
    this.rerenderCount++;
    
    // Reset counter periodically
    if (this.rerenderCount > 100) {
      EventLogger.warn('TouchPerformanceAnalyzer', 'Excessive re-renders detected', {
        component: componentName,
        count: this.rerenderCount,
      });
      this.rerenderCount = 0;
    }
  }

  /**
   * Track scroll events
   */
  public static trackScrollEvent(): void {
    const now = Date.now();
    const timeSinceLastScroll = this.lastScrollTime > 0 ? now - this.lastScrollTime : 0;
    
    if (timeSinceLastScroll < 16 && timeSinceLastScroll > 0) {
      EventLogger.debug('TouchPerformanceAnalyzer', 'Scroll events too frequent', {
        interval: timeSinceLastScroll,
        recommendation: 'Increase scrollEventThrottle',
      });
    }
    
    this.lastScrollTime = now;
    this.scrollEventCount++;
  }

  /**
   * Track touch response time
   */
  public static trackTouchResponse(responseTime: number): void {
    this.touchResponseTimes.push(responseTime);
    
    // Keep only last 50 measurements
    if (this.touchResponseTimes.length > 50) {
      this.touchResponseTimes.shift();
    }
    
    // Warn if response time is high
    if (responseTime > 100) {
      EventLogger.warn('TouchPerformanceAnalyzer', 'Slow touch response detected', {
        responseTime,
        threshold: 100,
      });
    }
  }

  /**
   * Generate and log performance report
   */
  public static generateReport(): void {
    const analysis = this.analyzePerformance();
    
    console.log('');
    console.log('Touch Performance Analysis Report');
    console.log('==================================');
    
    console.log('');
    console.log('Performance Metrics:');
    console.log('-------------------');
    console.log(`Main Thread Blocked: ${analysis.metrics.mainThreadBlocked ? 'YES (CRITICAL)' : 'No'}`);
    console.log(`Active Animations: ${analysis.metrics.animationOverload}`);
    console.log(`Scroll Handler Delay: ${analysis.metrics.scrollHandlerDelay}ms`);
    console.log(`Re-render Count: ${analysis.metrics.rerenderCount}`);
    console.log(`Touch Latency: ${analysis.metrics.touchLatency.toFixed(2)}ms`);
    console.log(`JS Frame Drops: ${analysis.metrics.jsFrameDrops}`);
    
    console.log('');
    console.log('Critical Bottlenecks:');
    console.log('--------------------');
    const criticalBottlenecks = analysis.bottlenecks.filter(b => b.severity === 'critical');
    criticalBottlenecks.forEach((bottleneck, index) => {
      console.log(`${index + 1}. ${bottleneck.component}`);
      console.log(`   Issue: ${bottleneck.issue}`);
      console.log(`   Impact: ${bottleneck.impact}`);
      console.log(`   Fix: ${bottleneck.solution}`);
      console.log('');
    });
    
    console.log('Top Recommendations:');
    console.log('-------------------');
    analysis.recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
    console.log('');
    console.log('==================================');
    console.log('');
    
    // Log to EventLogger for persistence
    EventLogger.info('TouchPerformanceAnalyzer', 'Performance report generated', {
      metrics: analysis.metrics,
      criticalIssues: criticalBottlenecks.length,
      totalBottlenecks: analysis.bottlenecks.length,
    });
  }

  /**
   * Reset all counters
   */
  public static reset(): void {
    this.animationCount = 0;
    this.rerenderCount = 0;
    this.scrollEventCount = 0;
    this.lastScrollTime = 0;
    this.touchResponseTimes = [];
    this.frameDrops = 0;
    this.pendingInteractions = 0;
  }
}

// Export for use in components
export const trackAnimation = TouchPerformanceAnalyzer.trackAnimation.bind(TouchPerformanceAnalyzer);
export const trackRerender = TouchPerformanceAnalyzer.trackRerender.bind(TouchPerformanceAnalyzer);
export const trackScrollEvent = TouchPerformanceAnalyzer.trackScrollEvent.bind(TouchPerformanceAnalyzer);
export const trackTouchResponse = TouchPerformanceAnalyzer.trackTouchResponse.bind(TouchPerformanceAnalyzer);
export const generateTouchPerformanceReport = TouchPerformanceAnalyzer.generateReport.bind(TouchPerformanceAnalyzer);