/**
 * Performance comparison tests for EventLogger implementations
 */

import { EventLogger as OriginalLogger } from '../EventLogger';
import { EventLogger as OptimizedLogger } from '../EventLogger.optimized';

// Performance measurement utilities
class PerformanceTester {
  private startTime: number = 0;
  private measurements: number[] = [];
  
  start(): void {
    this.startTime = performance.now();
  }
  
  end(): number {
    const duration = performance.now() - this.startTime;
    this.measurements.push(duration);
    return duration;
  }
  
  getStats() {
    const sorted = [...this.measurements].sort((a, b) => a - b);
    return {
      min: sorted[0] || 0,
      max: sorted[sorted.length - 1] || 0,
      avg: this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length || 0,
      median: sorted[Math.floor(sorted.length / 2)] || 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
    };
  }
  
  reset(): void {
    this.measurements = [];
  }
}

// Test data generators
const generateSimpleData = () => ({
  id: Math.random().toString(36),
  timestamp: Date.now(),
  value: Math.random() * 100,
});

const generateComplexData = () => ({
  user: {
    id: Math.random().toString(36),
    email: `user${Math.random()}@example.com`,
    profile: {
      name: 'Test User',
      preferences: {
        theme: 'dark',
        notifications: true,
        features: ['feature1', 'feature2', 'feature3'],
      },
    },
  },
  automation: {
    id: Math.random().toString(36),
    steps: Array(10).fill(null).map(() => ({
      type: 'action',
      config: generateSimpleData(),
    })),
  },
  metadata: {
    timestamp: Date.now(),
    version: '1.0.0',
    platform: 'ios',
  },
});

const generateDeepNestedData = (depth: number = 5): any => {
  if (depth === 0) return generateSimpleData();
  
  return {
    level: depth,
    data: generateSimpleData(),
    nested: generateDeepNestedData(depth - 1),
    array: Array(3).fill(null).map(() => generateDeepNestedData(Math.max(0, depth - 2))),
  };
};

// Test scenarios
export const runPerformanceTests = () => {
  const results: any = {
    original: {},
    optimized: {},
    improvement: {},
  };
  
  const originalTester = new PerformanceTester();
  const optimizedTester = new PerformanceTester();
  
  console.log('🚀 Starting EventLogger Performance Tests...\n');
  
  // Test 1: Simple logging performance
  console.log('Test 1: Simple Logging (10,000 entries)');
  originalTester.reset();
  optimizedTester.reset();
  
  for (let i = 0; i < 10000; i++) {
    const data = generateSimpleData();
    
    originalTester.start();
    OriginalLogger.info('Test', `Entry ${i}`, data);
    originalTester.end();
    
    optimizedTester.start();
    OptimizedLogger.info('Test', `Entry ${i}`, data);
    optimizedTester.end();
  }
  
  results.original.simpleLogging = originalTester.getStats();
  results.optimized.simpleLogging = optimizedTester.getStats();
  results.improvement.simpleLogging = {
    avgImprovement: `${((1 - results.optimized.simpleLogging.avg / results.original.simpleLogging.avg) * 100).toFixed(1)}%`,
    p95Improvement: `${((1 - results.optimized.simpleLogging.p95 / results.original.simpleLogging.p95) * 100).toFixed(1)}%`,
  };
  
  console.log('  Original avg:', results.original.simpleLogging.avg.toFixed(3), 'ms');
  console.log('  Optimized avg:', results.optimized.simpleLogging.avg.toFixed(3), 'ms');
  console.log('  Improvement:', results.improvement.simpleLogging.avgImprovement, '\n');
  
  // Test 2: Complex object logging
  console.log('Test 2: Complex Object Logging (1,000 entries)');
  originalTester.reset();
  optimizedTester.reset();
  
  for (let i = 0; i < 1000; i++) {
    const data = generateComplexData();
    
    originalTester.start();
    OriginalLogger.info('Complex', `Entry ${i}`, data);
    originalTester.end();
    
    optimizedTester.start();
    OptimizedLogger.info('Complex', `Entry ${i}`, data);
    optimizedTester.end();
  }
  
  results.original.complexLogging = originalTester.getStats();
  results.optimized.complexLogging = optimizedTester.getStats();
  results.improvement.complexLogging = {
    avgImprovement: `${((1 - results.optimized.complexLogging.avg / results.original.complexLogging.avg) * 100).toFixed(1)}%`,
    p95Improvement: `${((1 - results.optimized.complexLogging.p95 / results.original.complexLogging.p95) * 100).toFixed(1)}%`,
  };
  
  console.log('  Original avg:', results.original.complexLogging.avg.toFixed(3), 'ms');
  console.log('  Optimized avg:', results.optimized.complexLogging.avg.toFixed(3), 'ms');
  console.log('  Improvement:', results.improvement.complexLogging.avgImprovement, '\n');
  
  // Test 3: Deep nested object logging
  console.log('Test 3: Deep Nested Object Logging (100 entries)');
  originalTester.reset();
  optimizedTester.reset();
  
  for (let i = 0; i < 100; i++) {
    const data = generateDeepNestedData(5);
    
    originalTester.start();
    OriginalLogger.info('DeepNested', `Entry ${i}`, data);
    originalTester.end();
    
    optimizedTester.start();
    OptimizedLogger.info('DeepNested', `Entry ${i}`, data);
    optimizedTester.end();
  }
  
  results.original.deepNested = originalTester.getStats();
  results.optimized.deepNested = optimizedTester.getStats();
  results.improvement.deepNested = {
    avgImprovement: `${((1 - results.optimized.deepNested.avg / results.original.deepNested.avg) * 100).toFixed(1)}%`,
    p95Improvement: `${((1 - results.optimized.deepNested.p95 / results.original.deepNested.p95) * 100).toFixed(1)}%`,
  };
  
  console.log('  Original avg:', results.original.deepNested.avg.toFixed(3), 'ms');
  console.log('  Optimized avg:', results.optimized.deepNested.avg.toFixed(3), 'ms');
  console.log('  Improvement:', results.improvement.deepNested.avgImprovement, '\n');
  
  // Test 4: Search performance
  console.log('Test 4: Search Performance (1000 logs, 100 searches)');
  
  // Populate logs first
  for (let i = 0; i < 1000; i++) {
    const data = generateSimpleData();
    OriginalLogger.info(`Category${i % 10}`, `Message ${i} with keyword${i % 5}`, data);
    OptimizedLogger.info(`Category${i % 10}`, `Message ${i} with keyword${i % 5}`, data);
  }
  
  originalTester.reset();
  optimizedTester.reset();
  
  for (let i = 0; i < 100; i++) {
    const query = `keyword${i % 5}`;
    
    originalTester.start();
    OriginalLogger.searchLogs(query, 50);
    originalTester.end();
    
    optimizedTester.start();
    OptimizedLogger.searchLogs(query, 50);
    optimizedTester.end();
  }
  
  results.original.search = originalTester.getStats();
  results.optimized.search = optimizedTester.getStats();
  results.improvement.search = {
    avgImprovement: `${((1 - results.optimized.search.avg / results.original.search.avg) * 100).toFixed(1)}%`,
    p95Improvement: `${((1 - results.optimized.search.p95 / results.original.search.p95) * 100).toFixed(1)}%`,
  };
  
  console.log('  Original avg:', results.original.search.avg.toFixed(3), 'ms');
  console.log('  Optimized avg:', results.optimized.search.avg.toFixed(3), 'ms');
  console.log('  Improvement:', results.improvement.search.avgImprovement, '\n');
  
  // Test 5: Memory usage comparison
  console.log('Test 5: Memory Usage (after 1000 complex logs)');
  
  // Clear logs first
  OriginalLogger.clearLogs();
  OptimizedLogger.clearLogs();
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  const memBefore = process.memoryUsage();
  
  // Add 1000 complex logs to original
  for (let i = 0; i < 1000; i++) {
    OriginalLogger.info('Memory', `Entry ${i}`, generateComplexData());
  }
  
  const memAfterOriginal = process.memoryUsage();
  const originalMemUsage = (memAfterOriginal.heapUsed - memBefore.heapUsed) / 1024 / 1024;
  
  // Clear and measure optimized
  OriginalLogger.clearLogs();
  if (global.gc) global.gc();
  
  const memBeforeOptimized = process.memoryUsage();
  
  for (let i = 0; i < 1000; i++) {
    OptimizedLogger.info('Memory', `Entry ${i}`, generateComplexData());
  }
  
  const memAfterOptimized = process.memoryUsage();
  const optimizedMemUsage = (memAfterOptimized.heapUsed - memBeforeOptimized.heapUsed) / 1024 / 1024;
  
  results.original.memoryUsage = originalMemUsage;
  results.optimized.memoryUsage = optimizedMemUsage;
  results.improvement.memoryUsage = `${((1 - optimizedMemUsage / originalMemUsage) * 100).toFixed(1)}%`;
  
  console.log('  Original:', originalMemUsage.toFixed(2), 'MB');
  console.log('  Optimized:', optimizedMemUsage.toFixed(2), 'MB');
  console.log('  Improvement:', results.improvement.memoryUsage, '\n');
  
  // Summary
  console.log('📊 Performance Test Summary:');
  console.log('================================');
  console.log('Simple Logging:', results.improvement.simpleLogging.avgImprovement, 'faster');
  console.log('Complex Objects:', results.improvement.complexLogging.avgImprovement, 'faster');
  console.log('Deep Nested:', results.improvement.deepNested.avgImprovement, 'faster');
  console.log('Search:', results.improvement.search.avgImprovement, 'faster');
  console.log('Memory:', results.improvement.memoryUsage, 'less memory');
  console.log('================================\n');
  
  return results;
};

// Run tests if executed directly
if (require.main === module) {
  runPerformanceTests();
}