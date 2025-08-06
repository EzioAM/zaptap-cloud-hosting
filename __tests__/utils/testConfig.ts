/**
 * Comprehensive test configuration for ShortcutsLike app
 * Provides centralized configuration for all test utilities and settings
 */

export const TEST_CONFIG = {
  // Performance thresholds
  performance: {
    renderTime: {
      fast: 8,      // Ideal render time (< 8ms)
      good: 16,     // Good render time (< 16ms = 60fps)
      acceptable: 32, // Acceptable render time (< 32ms = 30fps)
      slow: 100,    // Slow render time threshold
    },
    animation: {
      targetFrameTime: 16.67, // 60fps target
      maxDroppedFrames: 3,    // Max acceptable dropped frames
      smoothnessThreshold: 85, // Minimum smoothness percentage
    },
    memory: {
      maxUsageBytes: 10 * 1024 * 1024, // 10MB max memory usage
      maxLeakBytes: 1024 * 1024,       // 1MB max memory leak
    },
    bundle: {
      maxComponentSize: 50 * 1024,  // 50KB max component bundle
      maxTotalSize: 5 * 1024 * 1024, // 5MB max total bundle
    },
  },

  // Accessibility thresholds
  accessibility: {
    minScore: 85,           // Minimum accessibility score
    webMinScore: 90,        // Higher standard for web
    maxCriticalIssues: 0,   // No critical accessibility issues allowed
    maxWarningIssues: 3,    // Max 3 warning issues
    minCoverage: 80,        // Minimum screen reader coverage %
    colorContrast: {
      normalText: 4.5,      // WCAG AA normal text ratio
      largeText: 3.0,       // WCAG AA large text ratio
    },
    hitArea: {
      minWidth: 44,         // iOS minimum hit area
      minHeight: 44,        // iOS minimum hit area
    },
    textSize: {
      minFontSize: 12,      // Minimum readable font size
      preferredMinSize: 14, // Preferred minimum font size
    },
  },

  // Test timeouts and delays
  timing: {
    renderTimeout: 5000,        // Max time to wait for render
    animationTimeout: 3000,     // Max time to wait for animation
    networkTimeout: 10000,      // Max time to wait for network
    userActionDelay: 100,       // Delay between user actions
    debounceDelay: 300,         // Standard debounce delay
    longPress: 500,             // Long press duration
  },

  // Mock data configuration
  mockData: {
    user: {
      id: 'test-user-12345',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: null,
    },
    stats: {
      totalExecutions: 42,
      successRate: 95,
      averageTime: 1.2,
      timeSaved: 120,
      activeAutomations: 8,
      totalAutomations: 12,
    },
    automation: {
      id: 'test-automation-123',
      title: 'Test Automation',
      description: 'A test automation for unit testing',
      category: 'productivity',
      tags: ['test', 'automation'],
    },
  },

  // Platform-specific configurations
  platforms: {
    ios: {
      shadowSupport: true,
      blurSupport: true,
      hapticSupport: true,
      nativeAnimations: true,
    },
    android: {
      shadowSupport: false, // Use elevation instead
      blurSupport: false,
      hapticSupport: true,
      nativeAnimations: true,
    },
    web: {
      shadowSupport: true,
      blurSupport: false,
      hapticSupport: false,
      nativeAnimations: false,
    },
  },

  // Network simulation settings
  network: {
    slow3G: {
      downloadThroughput: 400 * 1024 / 8, // 400kbps
      uploadThroughput: 400 * 1024 / 8,   // 400kbps
      latency: 2000,                       // 2s latency
    },
    offline: {
      downloadThroughput: 0,
      uploadThroughput: 0,
      latency: 0,
    },
    fast: {
      downloadThroughput: 10 * 1024 * 1024 / 8, // 10mbps
      uploadThroughput: 10 * 1024 * 1024 / 8,   // 10mbps
      latency: 100,                              // 100ms
    },
  },

  // Test coverage requirements
  coverage: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    critical: {
      statements: 95,
      branches: 90,
      functions: 95,
      lines: 95,
    },
  },

  // Snapshot test configuration
  snapshots: {
    updateMode: process.env.UPDATE_SNAPSHOTS === 'true',
    threshold: 0.2,           // 20% difference threshold
    platforms: ['ios', 'android', 'web'],
    themes: ['light', 'dark'],
    sizes: ['mobile', 'tablet', 'desktop'],
  },

  // Animation test settings
  animations: {
    precision: 1,             // Animation timing precision (ms)
    samplingRate: 60,         // Samples per second for performance monitoring
    maxDuration: 5000,        // Max animation duration to test (ms)
    staggerDelay: 100,        // Default stagger delay between animations
  },

  // Error handling configuration
  errors: {
    maxRetries: 3,            // Max test retries on failure
    retryDelay: 1000,         // Delay between retries (ms)
    silentConsole: true,      // Silence console errors in tests
    captureErrors: true,      // Capture and report errors
  },

  // Database and API testing
  api: {
    baseUrl: 'http://localhost:3000',
    timeout: 5000,
    maxConcurrentRequests: 5,
    retryAttempts: 2,
  },

  // Test environment settings
  environment: {
    nodeEnv: 'test',
    logLevel: 'error',
    debugMode: false,
    verboseLogging: false,
    collectMetrics: true,
  },

  // Test categories and tags
  categories: {
    unit: ['components', 'hooks', 'utils', 'services'],
    integration: ['flows', 'api', 'database', 'navigation'],
    e2e: ['user-journeys', 'critical-paths'],
    performance: ['render-time', 'memory', 'animations'],
    accessibility: ['screen-reader', 'keyboard', 'color-contrast'],
    visual: ['snapshots', 'responsive', 'themes'],
    security: ['auth', 'data-validation', 'permissions'],
  },

  // Test data factories
  factories: {
    user: () => ({
      id: `user-${Date.now()}`,
      email: `test-${Date.now()}@example.com`,
      displayName: 'Test User',
      createdAt: new Date().toISOString(),
    }),
    automation: () => ({
      id: `automation-${Date.now()}`,
      title: 'Test Automation',
      description: 'Generated test automation',
      steps: [],
      createdBy: 'test-user',
      isPublic: false,
      createdAt: new Date().toISOString(),
    }),
    stats: () => ({
      totalExecutions: Math.floor(Math.random() * 100),
      successRate: Math.floor(Math.random() * 100),
      averageTime: Math.random() * 10,
      timeSaved: Math.floor(Math.random() * 1000),
    }),
  },
};

/**
 * Test utilities for configuration access
 */
export class TestConfig {
  static getPerformanceThreshold(type: keyof typeof TEST_CONFIG.performance): any {
    return TEST_CONFIG.performance[type];
  }

  static getAccessibilityThreshold(type: keyof typeof TEST_CONFIG.accessibility): any {
    return TEST_CONFIG.accessibility[type];
  }

  static getPlatformConfig(platform: 'ios' | 'android' | 'web') {
    return TEST_CONFIG.platforms[platform];
  }

  static getMockData(type: keyof typeof TEST_CONFIG.mockData): any {
    return TEST_CONFIG.mockData[type];
  }

  static isUpdateSnapshots(): boolean {
    return TEST_CONFIG.snapshots.updateMode;
  }

  static shouldSilenceConsole(): boolean {
    return TEST_CONFIG.errors.silentConsole;
  }

  static getTimeout(type: keyof typeof TEST_CONFIG.timing): number {
    return TEST_CONFIG.timing[type];
  }

  static getCoverageThreshold(type: 'global' | 'critical' = 'global') {
    return TEST_CONFIG.coverage[type];
  }
}

/**
 * Test environment setup utilities
 */
export class TestEnvironment {
  static setup(): void {
    // Set up global test environment
    if (TEST_CONFIG.errors.silentConsole) {
      this.silenceConsole();
    }

    if (TEST_CONFIG.environment.debugMode) {
      this.enableDebugMode();
    }

    // Set up performance monitoring
    if (TEST_CONFIG.environment.collectMetrics) {
      this.enableMetricsCollection();
    }
  }

  static teardown(): void {
    // Clean up global test environment
    this.restoreConsole();
    this.disableDebugMode();
    this.disableMetricsCollection();
  }

  private static originalConsole: Console;

  private static silenceConsole(): void {
    this.originalConsole = { ...console };
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  }

  private static restoreConsole(): void {
    if (this.originalConsole) {
      Object.assign(console, this.originalConsole);
    }
  }

  private static enableDebugMode(): void {
    // Enable detailed logging and debugging
    process.env.DEBUG = 'true';
    console.log('🔍 Debug mode enabled for tests');
  }

  private static disableDebugMode(): void {
    delete process.env.DEBUG;
  }

  private static enableMetricsCollection(): void {
    // Enable performance metrics collection
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('test-suite-start');
    }
  }

  private static disableMetricsCollection(): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark('test-suite-end');
      performance.measure('test-suite-duration', 'test-suite-start', 'test-suite-end');
    }
  }
}

/**
 * Test reporter utilities
 */
export class TestReporter {
  static reportPerformanceMetrics(metrics: any): void {
    if (!TEST_CONFIG.environment.collectMetrics) return;

    console.log('📊 Performance Metrics:', {
      renderTime: `${metrics.renderTime}ms`,
      memoryUsage: `${Math.round(metrics.memoryUsage / 1024)}KB`,
      animationFrameRate: `${metrics.frameRate}fps`,
      timestamp: new Date().toISOString(),
    });
  }

  static reportAccessibilityResults(results: any): void {
    console.log('♿ Accessibility Results:', {
      score: `${results.score}/100`,
      issues: results.issues.length,
      coverage: `${results.coveragePercentage}%`,
      timestamp: new Date().toISOString(),
    });
  }

  static reportTestSummary(summary: any): void {
    console.log('🎯 Test Summary:', {
      total: summary.numTotalTests,
      passed: summary.numPassedTests,
      failed: summary.numFailedTests,
      coverage: `${summary.coveragePercent}%`,
      duration: `${summary.testDuration}ms`,
    });
  }
}

// Export for use in jest setup
export default TEST_CONFIG;