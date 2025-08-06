import { ReactTestRenderer } from 'react-test-renderer';
import { ReactTestInstance } from 'react-test-renderer';

/**
 * Performance testing utilities for React Native components
 */
export class PerformanceTestUtils {
  /**
   * Measure component render time
   */
  static measureRenderTime<T>(renderFn: () => T): { result: T; renderTime: number } {
    const startTime = performance.now();
    const result = renderFn();
    const renderTime = performance.now() - startTime;
    return { result, renderTime };
  }

  /**
   * Assert that render time is within acceptable bounds (60fps = 16ms budget)
   */
  static expectPerformantRender(renderTime: number, maxTime: number = 16) {
    expect(renderTime).toBeLessThan(maxTime);
  }

  /**
   * Measure memory usage during component lifecycle
   */
  static async measureMemoryUsage(testFn: () => Promise<void>): Promise<number> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = process.memoryUsage().heapUsed;
    await testFn();
    
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    return finalMemory - initialMemory;
  }

  /**
   * Test animation performance by checking frame rate
   */
  static async testAnimationPerformance(
    animationTrigger: () => void,
    duration: number = 1000
  ): Promise<{ averageFrameTime: number; droppedFrames: number }> {
    const frameTimings: number[] = [];
    const targetFrameTime = 16.67; // 60fps
    let lastFrameTime = performance.now();
    let droppedFrames = 0;

    const measureFrame = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - lastFrameTime;
      frameTimings.push(frameTime);
      
      if (frameTime > targetFrameTime * 1.5) {
        droppedFrames++;
      }
      
      lastFrameTime = currentTime;
      
      if (frameTimings.length * targetFrameTime < duration) {
        requestAnimationFrame(measureFrame);
      }
    };

    animationTrigger();
    requestAnimationFrame(measureFrame);
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, duration));
    
    const averageFrameTime = frameTimings.reduce((sum, time) => sum + time, 0) / frameTimings.length;
    
    return { averageFrameTime, droppedFrames };
  }

  /**
   * Measure bundle size impact of components
   */
  static measureBundleSize(componentPath: string): number {
    // This would require webpack-bundle-analyzer in a real scenario
    // For testing, we'll simulate bundle size measurement
    const fs = require('fs');
    
    try {
      const stats = fs.statSync(componentPath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Test for performance anti-patterns
   */
  static detectPerformanceAntiPatterns(testRenderer: ReactTestRenderer): string[] {
    const issues: string[] = [];
    const root = testRenderer.getInstance();
    
    // Check for inline functions in render (simplified check)
    const inlineRegex = /\(\s*\)\s*=>/;
    if (inlineRegex.test(testRenderer.toJSON()?.toString() || '')) {
      issues.push('Inline functions detected - may cause unnecessary re-renders');
    }

    // Check for missing keys in lists
    const findComponentsWithoutKeys = (instance: ReactTestInstance) => {
      if (instance.children && Array.isArray(instance.children) && instance.children.length > 1) {
        instance.children.forEach(child => {
          if (typeof child === 'object' && !child.props?.key) {
            issues.push('Missing key prop in list items');
          }
        });
      }
      
      if (instance.children) {
        instance.children.forEach(child => {
          if (typeof child === 'object' && child.children) {
            findComponentsWithoutKeys(child);
          }
        });
      }
    };

    const testInstance = testRenderer.root;
    findComponentsWithoutKeys(testInstance);

    return issues;
  }

  /**
   * Test component re-render frequency
   */
  static async testReRenderFrequency(
    renderComponent: () => ReactTestRenderer,
    triggerUpdate: (renderer: ReactTestRenderer) => void,
    iterations: number = 10
  ): Promise<number> {
    let renderCount = 0;
    
    // Mock React's render method to count renders
    const originalRender = React.createElement;
    (React as any).createElement = (...args: any[]) => {
      renderCount++;
      return originalRender.apply(React, args);
    };

    const renderer = renderComponent();
    
    for (let i = 0; i < iterations; i++) {
      triggerUpdate(renderer);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Restore original render method
    (React as any).createElement = originalRender;

    return renderCount / iterations;
  }

  /**
   * Benchmark component initialization time
   */
  static async benchmarkInitialization(
    componentFactory: () => ReactTestRenderer,
    iterations: number = 100
  ): Promise<{ average: number; min: number; max: number; samples: number[] }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const renderer = componentFactory();
      const endTime = performance.now();
      
      times.push(endTime - startTime);
      renderer.unmount();
      
      // Small delay to prevent overwhelming the system
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { average, min, max, samples: times };
  }

  /**
   * Test scroll performance
   */
  static async testScrollPerformance(
    scrollableComponent: ReactTestInstance,
    scrollDistance: number = 1000,
    scrollDuration: number = 1000
  ): Promise<{ smoothness: number; averageFrameTime: number }> {
    const frameTimings: number[] = [];
    const scrollStep = scrollDistance / (scrollDuration / 16.67); // 60fps steps
    let currentScrollY = 0;
    let lastFrameTime = performance.now();

    const simulateScrollFrame = () => {
      const currentTime = performance.now();
      const frameTime = currentTime - lastFrameTime;
      frameTimings.push(frameTime);
      
      currentScrollY += scrollStep;
      
      // Simulate onScroll event
      if (scrollableComponent.props.onScroll) {
        scrollableComponent.props.onScroll({
          nativeEvent: {
            contentOffset: { y: currentScrollY },
          },
        });
      }
      
      lastFrameTime = currentTime;
      
      if (currentScrollY < scrollDistance) {
        requestAnimationFrame(simulateScrollFrame);
      }
    };

    requestAnimationFrame(simulateScrollFrame);
    
    await new Promise(resolve => setTimeout(resolve, scrollDuration));

    const averageFrameTime = frameTimings.reduce((sum, time) => sum + time, 0) / frameTimings.length;
    const targetFrameTime = 16.67;
    const smoothness = Math.max(0, 100 - ((averageFrameTime - targetFrameTime) / targetFrameTime) * 100);

    return { smoothness, averageFrameTime };
  }
}

/**
 * Performance test matchers
 */
export const performanceMatchers = {
  toBePerformant: (received: number, maxTime: number = 16) => {
    const pass = received < maxTime;
    return {
      pass,
      message: () =>
        pass
          ? `Expected render time ${received}ms to be slower than ${maxTime}ms`
          : `Expected render time ${received}ms to be faster than ${maxTime}ms`,
    };
  },

  toHaveSmoothAnimation: (received: { averageFrameTime: number; droppedFrames: number }) => {
    const pass = received.averageFrameTime < 20 && received.droppedFrames < 5;
    return {
      pass,
      message: () =>
        pass
          ? `Expected animation to be less smooth`
          : `Expected animation to be smooth (avg: ${received.averageFrameTime}ms, dropped: ${received.droppedFrames})`,
    };
  },

  toHaveAcceptableMemoryUsage: (received: number, maxBytes: number = 1024 * 1024) => {
    const pass = received < maxBytes;
    return {
      pass,
      message: () =>
        pass
          ? `Expected memory usage ${received} bytes to be higher than ${maxBytes} bytes`
          : `Expected memory usage ${received} bytes to be lower than ${maxBytes} bytes`,
    };
  },
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBePerformant(maxTime?: number): R;
      toHaveSmoothAnimation(): R;
      toHaveAcceptableMemoryUsage(maxBytes?: number): R;
    }
  }
}

// Add performance matchers
expect.extend(performanceMatchers);