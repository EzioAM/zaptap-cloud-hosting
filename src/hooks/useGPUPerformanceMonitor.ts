import { useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { EventLogger } from '../utils/EventLogger';

export interface GPUPerformanceConfig {
  enableLogging?: boolean;
  targetFPS?: number;
  warnThreshold?: number;
  criticalThreshold?: number;
  sampleInterval?: number;
  verboseLogging?: boolean;
}

interface PerformanceMetrics {
  fps: number;
  droppedFrames: number;
  averageFPS: number;
  renderTime: number;
}

// Detect if running on simulator or physical device
const isSimulator = (): boolean => {
  // Simple detection - simulators typically report x86_64 or i386 architecture
  return Platform.OS === 'ios' && (
    // Check for simulator architectures
    Platform.Version === 'x86_64' || 
    Platform.Version === 'i386' ||
    // In dev mode, we're usually on simulator
    __DEV__
  );
};

// Determine optimal FPS based on device capabilities
const getOptimalFPS = (): number => {
  if (isSimulator()) {
    // iOS Simulator caps at 60fps
    return 60;
  }
  
  if (Platform.OS === 'ios') {
    // ProMotion devices can do 120fps
    // Since we can't reliably detect model, default to 120 for physical iOS devices
    return 120;
  }
  
  // Default to 60fps for Android and other platforms
  return 60;
};

export const useGPUPerformanceMonitor = (
  componentName: string,
  config: GPUPerformanceConfig = {}
) => {
  const optimalFPS = getOptimalFPS();
  
  const {
    enableLogging = __DEV__ && false, // Disabled by default in dev
    targetFPS = optimalFPS,
    warnThreshold = 0.9, // 90% of target FPS
    criticalThreshold = 0.75, // 75% of target FPS
    sampleInterval = 10000, // Sample every 10 seconds
    verboseLogging = false,
  } = config;

  const frameCount = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const droppedFrames = useRef(0);
  const frameRateHistory = useRef<number[]>([]);
  const performanceData = useRef<PerformanceMetrics>({
    fps: targetFPS,
    droppedFrames: 0,
    averageFPS: targetFPS,
    renderTime: 0,
  });

  const measureFrameRate = useCallback(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTime.current;
    
    if (deltaTime > 0) {
      const currentFPS = Math.min(1000 / deltaTime, targetFPS);
      frameRateHistory.current.push(currentFPS);
      
      // Keep only recent samples
      if (frameRateHistory.current.length > 60) {
        frameRateHistory.current.shift();
      }
      
      // Check for performance issues
      if (currentFPS < targetFPS * criticalThreshold) {
        droppedFrames.current++;
        
        // Only log significant drops or periodic summaries
        const shouldLog = verboseLogging || 
                         (droppedFrames.current === 1) || // First drop
                         (droppedFrames.current % 100 === 0); // Every 100th drop
        
        if (enableLogging && shouldLog) {
          EventLogger.warn('GPU Performance', `${componentName} performance drop`, {
            fps: currentFPS.toFixed(1),
            targetFPS,
            droppedTotal: droppedFrames.current,
            deviceType: isSimulator() ? 'Simulator' : 'Physical Device',
          });
        }
      }
      
      // Update performance data
      performanceData.current = {
        fps: currentFPS,
        droppedFrames: droppedFrames.current,
        averageFPS: frameRateHistory.current.reduce((a, b) => a + b, 0) / frameRateHistory.current.length,
        renderTime: currentTime,
      };
    }
    
    lastFrameTime.current = currentTime;
    frameCount.current++;
  }, [componentName, targetFPS, criticalThreshold, enableLogging, verboseLogging]);

  // Performance summary logging
  useEffect(() => {
    if (!enableLogging) return;

    const logSummary = () => {
      const avgFPS = performanceData.current.averageFPS;
      const dropRate = (droppedFrames.current / frameCount.current) * 100;
      
      // Only log if there are actual performance issues
      if (avgFPS < targetFPS * warnThreshold || dropRate > 5) {
        EventLogger.info('GPU Performance', `${componentName} summary`, {
          averageFPS: avgFPS.toFixed(1),
          targetFPS,
          droppedFrames: droppedFrames.current,
          totalFrames: frameCount.current,
          dropRate: dropRate.toFixed(1) + '%',
          deviceType: isSimulator() ? 'Simulator' : 'Physical Device',
          optimalFPS,
        });
      }
      
      // Reset counters for next interval
      if (!verboseLogging) {
        droppedFrames.current = 0;
        frameCount.current = 0;
        frameRateHistory.current = [];
      }
    };

    const interval = setInterval(logSummary, sampleInterval);
    return () => clearInterval(interval);
  }, [componentName, enableLogging, targetFPS, warnThreshold, sampleInterval, verboseLogging, optimalFPS]);

  return {
    measureFrameRate,
    getMetrics: () => performanceData.current,
    isOptimalPerformance: () => performanceData.current.averageFPS >= targetFPS * warnThreshold,
  };
};

// Hook for monitoring list performance
export const useListPerformanceMonitor = (
  listName: string,
  config: GPUPerformanceConfig = {}
) => {
  const scrollMetrics = useRef({
    scrollVelocity: 0,
    lastScrollTime: 0,
    scrollFrameDrops: 0,
  });

  const onScroll = useCallback((event: any) => {
    const currentTime = performance.now();
    const deltaTime = currentTime - scrollMetrics.current.lastScrollTime;
    
    if (deltaTime > 0) {
      const velocity = Math.abs(event.nativeEvent.contentOffset.y - scrollMetrics.current.scrollVelocity) / deltaTime;
      scrollMetrics.current.scrollVelocity = event.nativeEvent.contentOffset.y;
      scrollMetrics.current.lastScrollTime = currentTime;
      
      // Detect janky scrolling
      if (deltaTime > 32 && config.enableLogging && config.verboseLogging) { // More than 2 frames at 60fps
        scrollMetrics.current.scrollFrameDrops++;
        EventLogger.debug('List Performance', `${listName} scroll jank detected`, {
          deltaTime: deltaTime.toFixed(1),
          velocity: velocity.toFixed(1),
          drops: scrollMetrics.current.scrollFrameDrops,
        });
      }
    }
  }, [listName, config.enableLogging, config.verboseLogging]);

  return { onScroll };
};

// Intelligent performance advisor
export const usePerformanceAdvisor = () => {
  const getRecommendations = useCallback((metrics: PerformanceMetrics): string[] => {
    const recommendations: string[] = [];
    const dropRate = metrics.droppedFrames / (metrics.renderTime / 1000);
    
    if (metrics.averageFPS < 30) {
      recommendations.push('Critical: Consider reducing animation complexity');
      recommendations.push('Disable blur effects and complex gradients');
    } else if (metrics.averageFPS < 50) {
      recommendations.push('Warning: Performance degradation detected');
      recommendations.push('Try reducing the number of animated elements');
    }
    
    if (dropRate > 10) {
      recommendations.push('High frame drop rate - check for expensive re-renders');
    }
    
    if (isSimulator() && metrics.averageFPS < 60) {
      recommendations.push('Simulator performance issue - test on physical device for accurate metrics');
    }
    
    return recommendations;
  }, []);

  return { getRecommendations };
};