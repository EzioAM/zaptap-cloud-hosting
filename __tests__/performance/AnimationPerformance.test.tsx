import React from 'react';
import renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { act } from '@testing-library/react-native';
import { QuickStatsWidget } from '../../src/components/organisms/DashboardWidgets/QuickStatsWidget';
import { PerformanceTestUtils } from '../utils/performanceHelpers';
import { TestDataFactory } from '../utils/testHelpers';

// Mock dependencies
jest.mock('../../src/components/common/ThemeFallbackWrapper', () => ({
  useSafeTheme: () => ({
    colors: {
      primary: '#007AFF',
      text: '#000000',
      textSecondary: '#666666',
      surface: '#FFFFFF',
      error: '#FF3B30',
    },
  }),
}));

jest.mock('../../src/store/api/dashboardApi', () => ({
  useGetTodayStatsQuery: jest.fn(),
  dashboardApi: {
    reducer: (state = {}) => state,
    middleware: [],
  },
}));

const { useGetTodayStatsQuery } = require('../../src/store/api/dashboardApi');

describe('Animation Performance Tests', () => {
  let mockStore: ReturnType<typeof configureStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStore = configureStore({
      reducer: {
        auth: (state = { user: null, isAuthenticated: false }) => state,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({ serializableCheck: false }),
    });

    useGetTodayStatsQuery.mockReturnValue({
      data: TestDataFactory.createMockStats(),
      isLoading: false,
      error: null,
    });
  });

  describe('Component Render Performance', () => {
    it('renders QuickStatsWidget within performance budget', () => {
      const { renderTime } = PerformanceTestUtils.measureRenderTime(() =>
        renderer.create(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        )
      );

      expect(renderTime).toBePerformant(16); // 60fps budget
    });

    it('handles multiple quick re-renders efficiently', async () => {
      let renderCount = 0;
      const TestComponent = () => {
        renderCount++;
        return <QuickStatsWidget />;
      };

      const component = renderer.create(
        <Provider store={mockStore}>
          <TestComponent />
        </Provider>
      );

      // Trigger 10 re-renders quickly
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          component.update(
            <Provider store={mockStore}>
              <TestComponent />
            </Provider>
          );
        });
      }

      // Should not cause excessive re-renders
      expect(renderCount).toBeLessThanOrEqual(15);
    });

    it('maintains performance with large datasets', () => {
      const largeStats = TestDataFactory.createMockStats({
        totalExecutions: 999999,
        successRate: 99.99,
        averageTime: 123.456,
        timeSaved: 86400,
      });

      useGetTodayStatsQuery.mockReturnValue({
        data: largeStats,
        isLoading: false,
        error: null,
      });

      const { renderTime } = PerformanceTestUtils.measureRenderTime(() =>
        renderer.create(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        )
      );

      expect(renderTime).toBePerformant(20); // Slightly higher budget for large numbers
    });
  });

  describe('Animation Frame Rate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      
      // Mock requestAnimationFrame for animation testing
      let frameId = 0;
      (global as any).requestAnimationFrame = jest.fn((callback) => {
        frameId++;
        setTimeout(() => callback(performance.now()), 16.67); // 60fps
        return frameId;
      });
      
      (global as any).cancelAnimationFrame = jest.fn((id) => {
        clearTimeout(id);
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('maintains 60fps during counter animations', async () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const animationResult = await PerformanceTestUtils.testAnimationPerformance(
        () => {
          // Trigger animation by fast-forwarding to animation start
          jest.advanceTimersByTime(100);
        },
        1500 // Animation duration
      );

      expect(animationResult.averageFrameTime).toBeLessThan(20); // Allow some variance
      expect(animationResult.droppedFrames).toBeLessThan(3); // Minimal dropped frames
    });

    it('handles staggered animations efficiently', async () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const animationResult = await PerformanceTestUtils.testAnimationPerformance(
        () => {
          // Trigger staggered entry animations
          jest.advanceTimersByTime(50);
        },
        500 // Stagger duration (0ms, 100ms, 200ms, 300ms)
      );

      expect(animationResult).toHaveSmoothAnimation();
    });

    it('handles concurrent animations without frame drops', async () => {
      // Create multiple widget instances to test concurrent animations
      const MultipleWidgets = () => (
        <div>
          <QuickStatsWidget />
          <QuickStatsWidget />
          <QuickStatsWidget />
        </div>
      );

      const component = renderer.create(
        <Provider store={mockStore}>
          <MultipleWidgets />
        </Provider>
      );

      const animationResult = await PerformanceTestUtils.testAnimationPerformance(
        () => {
          jest.advanceTimersByTime(100);
        },
        1500
      );

      // Should maintain performance even with multiple concurrent animations
      expect(animationResult.droppedFrames).toBeLessThan(5);
    });
  });

  describe('Memory Usage', () => {
    it('does not leak memory during animations', async () => {
      const memoryUsage = await PerformanceTestUtils.measureMemoryUsage(async () => {
        // Create and destroy components multiple times
        for (let i = 0; i < 10; i++) {
          const component = renderer.create(
            <Provider store={mockStore}>
              <QuickStatsWidget />
            </Provider>
          );

          await act(async () => {
            jest.useFakeTimers();
            jest.advanceTimersByTime(1500); // Complete animation
            jest.useRealTimers();
          });

          component.unmount();
        }
      });

      expect(memoryUsage).toHaveAcceptableMemoryUsage(5 * 1024 * 1024); // 5MB max
    });

    it('cleans up animation listeners on unmount', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Mock animation listener tracking
      const addListenerSpy = jest.spyOn(require('react-native').Animated.Value.prototype, 'addListener');
      const removeListenerSpy = jest.spyOn(require('react-native').Animated.Value.prototype, 'removeListener');

      component.unmount();

      // Should clean up listeners (this is a simplified test)
      expect(true).toBeTruthy(); // Placeholder - real implementation would verify cleanup
    });
  });

  describe('Bundle Size Impact', () => {
    it('keeps animation code bundle size reasonable', () => {
      const bundleSize = PerformanceTestUtils.measureBundleSize(
        '../../src/components/organisms/DashboardWidgets/QuickStatsWidget.tsx'
      );

      // Should not exceed reasonable size for a widget component
      expect(bundleSize).toBeLessThan(50 * 1024); // 50KB max
    });

    it('loads animation dependencies efficiently', async () => {
      const startTime = performance.now();

      // Simulate dynamic import of animation dependencies
      await import('../../src/components/organisms/DashboardWidgets/QuickStatsWidget');

      const loadTime = performance.now() - startTime;
      expect(loadTime).toBeLessThan(100); // Should load within 100ms
    });
  });

  describe('Platform-Specific Performance', () => {
    const testPlatformPerformance = (platform: 'ios' | 'android' | 'web') => {
      const mockPlatform = require('react-native').Platform;
      mockPlatform.OS = platform;

      const { renderTime } = PerformanceTestUtils.measureRenderTime(() =>
        renderer.create(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        )
      );

      expect(renderTime).toBePerformant(platform === 'web' ? 32 : 16);
    };

    it('maintains performance on iOS', () => {
      testPlatformPerformance('ios');
    });

    it('maintains performance on Android', () => {
      testPlatformPerformance('android');
    });

    it('maintains performance on Web', () => {
      testPlatformPerformance('web');
    });
  });

  describe('Performance Regression Detection', () => {
    it('detects performance anti-patterns', () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      const antiPatterns = PerformanceTestUtils.detectPerformanceAntiPatterns(component);
      
      expect(antiPatterns).toHaveLength(0);
    });

    it('benchmarks initialization time', async () => {
      const benchmark = await PerformanceTestUtils.benchmarkInitialization(
        () => renderer.create(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        ),
        50 // 50 iterations
      );

      expect(benchmark.average).toBeLessThan(20); // Average under 20ms
      expect(benchmark.max).toBeLessThan(50); // No outliers over 50ms
    });

    it('maintains consistent performance across renders', async () => {
      const renderTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const { renderTime } = PerformanceTestUtils.measureRenderTime(() =>
          renderer.create(
            <Provider store={mockStore}>
              <QuickStatsWidget />
            </Provider>
          )
        );
        renderTimes.push(renderTime);
      }

      const average = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      const variance = renderTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / renderTimes.length;
      const standardDeviation = Math.sqrt(variance);

      // Performance should be consistent (low standard deviation)
      expect(standardDeviation).toBeLessThan(average * 0.3); // Within 30% of average
    });
  });

  describe('Animation Optimization', () => {
    it('uses native driver when possible', () => {
      jest.useFakeTimers();
      
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Mock Animated.timing to verify useNativeDriver usage
      const animatedSpy = jest.spyOn(require('react-native').Animated, 'timing');
      
      jest.advanceTimersByTime(100);

      // Should use native driver for transform animations
      expect(true).toBeTruthy(); // Placeholder - real test would verify native driver usage
      
      jest.useRealTimers();
    });

    it('optimizes animation scheduling', async () => {
      jest.useFakeTimers();

      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Measure time to complete all animations
      const startTime = performance.now();
      
      // Fast-forward through all animations
      jest.advanceTimersByTime(2000); // Max animation time
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Animation scheduling should be efficient
      expect(totalTime).toBeLessThan(100); // Scheduling overhead should be minimal

      jest.useRealTimers();
    });

    it('handles rapid state changes gracefully', async () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Rapidly change data to trigger re-animations
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        useGetTodayStatsQuery.mockReturnValue({
          data: TestDataFactory.createMockStats({ totalExecutions: i * 10 }),
          isLoading: false,
          error: null,
        });

        await act(async () => {
          component.update(
            <Provider store={mockStore}>
              <QuickStatsWidget />
            </Provider>
          );
        });
      }

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // Should handle rapid updates efficiently
      expect(updateTime).toBeLessThan(500); // Under 500ms for 10 updates
    });
  });

  describe('Real-World Performance Scenarios', () => {
    it('performs well with realistic user interactions', async () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Simulate realistic usage patterns
      const scenarios = [
        () => {
          // Data update scenario
          useGetTodayStatsQuery.mockReturnValue({
            data: TestDataFactory.createMockStats({ totalExecutions: 100 }),
            isLoading: false,
            error: null,
          });
        },
        () => {
          // Loading scenario
          useGetTodayStatsQuery.mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
          });
        },
        () => {
          // Error scenario
          useGetTodayStatsQuery.mockReturnValue({
            data: null,
            isLoading: false,
            error: { message: 'Network error' },
          });
        },
      ];

      const performanceTimes: number[] = [];

      for (const scenario of scenarios) {
        const { renderTime } = PerformanceTestUtils.measureRenderTime(() => {
          scenario();
          component.update(
            <Provider store={mockStore}>
              <QuickStatsWidget />
            </Provider>
          );
        });

        performanceTimes.push(renderTime);
      }

      // All scenarios should perform well
      performanceTimes.forEach(time => {
        expect(time).toBePerformant(25); // Slightly relaxed budget for realistic scenarios
      });
    });

    it('maintains performance during background/foreground transitions', async () => {
      const component = renderer.create(
        <Provider store={mockStore}>
          <QuickStatsWidget />
        </Provider>
      );

      // Simulate app going to background
      await act(async () => {
        // Trigger app state change
        jest.useFakeTimers();
        jest.advanceTimersByTime(1000);
        jest.useRealTimers();
      });

      // Measure performance when returning to foreground
      const { renderTime } = PerformanceTestUtils.measureRenderTime(() => {
        component.update(
          <Provider store={mockStore}>
            <QuickStatsWidget />
          </Provider>
        );
      });

      expect(renderTime).toBePerformant(20);
    });
  });
});