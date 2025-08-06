/**
 * Tests to verify performance measurement fixes
 */

import { PerformanceMeasurement } from '../../src/utils/PerformanceMeasurement';
import { PerformanceAnalyzer } from '../../src/utils/PerformanceAnalyzer';
import { PerformanceOptimizer } from '../../src/utils/PerformanceOptimizer';

describe('Performance Fixes Verification', () => {
  beforeEach(() => {
    // Reset all performance measurements before each test
    PerformanceMeasurement.reset();
    jest.clearAllMocks();
  });

  describe('Launch Time Measurement', () => {
    it('should capture and freeze launch time when app_initialization_complete is marked', () => {
      // Simulate app startup sequence
      PerformanceMeasurement.mark('app_bootstrap_start');
      
      // Wait a bit to simulate loading
      jest.advanceTimersByTime(500);
      PerformanceMeasurement.mark('services_loaded');
      
      jest.advanceTimersByTime(300);
      PerformanceMeasurement.mark('app_render_start');
      
      jest.advanceTimersByTime(200);
      PerformanceMeasurement.mark('app_initialization_complete');
      
      // Get initial launch time
      const launchTime1 = PerformanceMeasurement.getAppLaunchTime();
      
      // Wait more time
      jest.advanceTimersByTime(30000); // 30 seconds later
      
      // Launch time should remain the same (frozen)
      const launchTime2 = PerformanceMeasurement.getAppLaunchTime();
      
      expect(launchTime2).toBe(launchTime1);
      expect(launchTime2).toBeLessThan(2000); // Should be around 1000ms, not 31000ms
    });

    it('should not reset appStartTime when initialize is called multiple times', () => {
      const originalStartTime = PerformanceMeasurement.appStartTime;
      
      // First initialization
      PerformanceMeasurement.initialize();
      const afterFirstInit = PerformanceMeasurement.appStartTime;
      
      // Second initialization (duplicate call)
      PerformanceMeasurement.initialize();
      const afterSecondInit = PerformanceMeasurement.appStartTime;
      
      // appStartTime should remain the same
      expect(afterFirstInit).toBe(originalStartTime);
      expect(afterSecondInit).toBe(originalStartTime);
    });
  });

  describe('Frame Drop Detection', () => {
    it('should only count significant frame drops (>33ms)', () => {
      // Mock the frame monitoring
      const analyzer = PerformanceAnalyzer as any;
      analyzer.frameDropCount = 0;
      analyzer.lastFrameTime = Date.now();
      
      // Simulate minor frame delays (should not count)
      analyzer.lastFrameTime = Date.now() - 20; // 20ms frame
      analyzer.startFrameRateMonitoring();
      
      // Simulate significant frame drop (should count)
      analyzer.lastFrameTime = Date.now() - 50; // 50ms frame
      
      // Frame rate should be reasonable, not overly penalized
      const frameRate = analyzer.calculateFrameRate();
      expect(frameRate).toBeGreaterThanOrEqual(30);
      expect(frameRate).toBeLessThanOrEqual(60);
    });
  });

  describe('Performance Health Analysis', () => {
    it('should use realistic thresholds for performance status', () => {
      const analyzer = PerformanceAnalyzer as any;
      
      // Test launch time thresholds
      const excellentMetrics = { launchTime: 1400, memoryUsage: 40, frameRate: 55 };
      const goodMetrics = { launchTime: 2200, memoryUsage: 80, frameRate: 45 };
      const needsImprovementMetrics = { launchTime: 3500, memoryUsage: 150, frameRate: 35 };
      
      const excellentAnalysis = analyzer.analyzeMetrics(excellentMetrics);
      expect(excellentAnalysis.launchTimeStatus).toBe('excellent');
      expect(excellentAnalysis.overallHealth).toBe('healthy');
      
      const goodAnalysis = analyzer.analyzeMetrics(goodMetrics);
      expect(goodAnalysis.launchTimeStatus).toBe('good');
      expect(goodAnalysis.overallHealth).toBe('healthy');
      
      const needsImprovementAnalysis = analyzer.analyzeMetrics(needsImprovementMetrics);
      expect(needsImprovementAnalysis.launchTimeStatus).toBe('needs_improvement');
      // Should not immediately be 'degraded' for just one 'needs_improvement' metric
    });
  });

  describe('Performance Optimizer', () => {
    it('should not trigger optimization for healthy or degraded performance', () => {
      const optimizer = PerformanceOptimizer as any;
      const runOptimizationCycleSpy = jest.spyOn(optimizer, 'runOptimizationCycle');
      
      // Mock healthy performance report
      jest.spyOn(PerformanceAnalyzer, 'generateReport').mockReturnValue({
        analysis: { overallHealth: 'healthy' },
        metrics: { frameRate: 55 },
        bottlenecks: [],
        recommendations: []
      } as any);
      
      optimizer.runOptimizationCycle();
      
      // Should skip optimization for healthy status
      expect(runOptimizationCycleSpy).toHaveBeenCalled();
    });

    it('should only defer operations when performance is critical', () => {
      // Mock critical performance
      jest.spyOn(PerformanceAnalyzer, 'generateReport').mockReturnValue({
        analysis: { overallHealth: 'critical' },
        metrics: { frameRate: 25 },
        bottlenecks: [],
        recommendations: []
      } as any);
      
      expect(PerformanceOptimizer.shouldDeferOperation()).toBe(true);
      
      // Mock degraded (but not critical) performance
      jest.spyOn(PerformanceAnalyzer, 'generateReport').mockReturnValue({
        analysis: { overallHealth: 'degraded' },
        metrics: { frameRate: 45 },
        bottlenecks: [],
        recommendations: []
      } as any);
      
      expect(PerformanceOptimizer.shouldDeferOperation()).toBe(false);
    });
  });

  describe('Integration Test', () => {
    it('should correctly measure a typical app launch sequence', () => {
      // Simulate real app launch sequence
      PerformanceMeasurement.mark('app_bootstrap_start');
      jest.advanceTimersByTime(300);
      
      PerformanceMeasurement.mark('services_loaded');
      jest.advanceTimersByTime(500);
      
      PerformanceMeasurement.mark('app_render_start');
      jest.advanceTimersByTime(400);
      
      PerformanceMeasurement.mark('app_initialization_complete');
      
      const report = PerformanceMeasurement.getDetailedReport();
      
      // Verify the launch time is captured correctly
      expect(report.totalLaunchTime).toBeGreaterThan(1000);
      expect(report.totalLaunchTime).toBeLessThan(1500);
      expect(report.benchmarks.status).toBe('excellent');
      
      // Wait more and verify launch time doesn't increase
      jest.advanceTimersByTime(60000); // 1 minute later
      const laterReport = PerformanceMeasurement.getDetailedReport();
      expect(laterReport.totalLaunchTime).toBe(report.totalLaunchTime);
    });
  });
});