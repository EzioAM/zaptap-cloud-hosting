/**
 * Performance monitoring hooks for animations
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, InteractionManager, Platform } from 'react-native';
import { animationController } from './AnimationController';
import { animationPool } from './PlatformOptimizations';

// Performance metrics interface
interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  jankFrames: number;
  averageFrameTime: number;
  memoryUsage?: number;
}

// Hook for monitoring animation performance
export const useAnimationPerformance = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameDrops: 0,
    jankFrames: 0,
    averageFrameTime: 16.67,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const currentMetrics = animationController.getMetrics();
      setMetrics(currentMetrics);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return metrics;
};

// Hook for optimized animated value
export const useOptimizedAnimatedValue = (
  initialValue: number = 0,
  key?: string
): Animated.Value => {
  const keyRef = useRef(key || `animated_${Math.random()}`);
  const animatedValue = useRef(
    key ? animationPool.getValue(key, initialValue) : new Animated.Value(initialValue)
  );

  useEffect(() => {
    return () => {
      // Reset value on unmount
      if (key) {
        animationPool.reset(key, initialValue);
      }
    };
  }, [key, initialValue]);

  return animatedValue.current;
};

// Hook for delayed animation (after interactions)
export const useDelayedAnimation = (
  animationFactory: () => Animated.CompositeAnimation,
  dependencies: any[] = []
) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsAnimating(true);
      const animation = animationFactory();
      animation.start(() => {
        setIsAnimating(false);
      });
    });

    return () => handle.cancel();
  }, dependencies);

  return isAnimating;
};

// Hook for batch animations
export const useBatchAnimations = () => {
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const addAnimation = useCallback((animation: Animated.CompositeAnimation) => {
    animationsRef.current.push(animation);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (animationsRef.current.length > 0) {
        Animated.parallel(animationsRef.current).start();
        animationsRef.current = [];
      }
    }, 16); // Next frame
  }, []);

  const executeNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (animationsRef.current.length > 0) {
      Animated.parallel(animationsRef.current).start();
      animationsRef.current = [];
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { addAnimation, executeNow };
};

// Hook for scroll-linked animations with performance optimization
export const useOptimizedScrollAnimation = (
  scrollThreshold: number = 100
) => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isScrolling = useRef(false);

  const handleScrollListener = useCallback((event: any) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    
    // Update scrollY for animations
    scrollY.setValue(currentScrollY);
    
    // Throttle scroll events
    if (Math.abs(currentScrollY - lastScrollY.current) < 5) {
      return;
    }
    
    lastScrollY.current = currentScrollY;
    
    if (!isScrolling.current) {
      isScrolling.current = true;
      InteractionManager.runAfterInteractions(() => {
        isScrolling.current = false;
      });
    }
  }, [scrollY]);

  const handleScroll = useCallback(
    Animated.event(
      [{ nativeEvent: { contentOffset: { y: scrollY } } }],
      {
        useNativeDriver: true,
        listener: handleScrollListener,
      }
    ),
    [scrollY, handleScrollListener]
  );

  const interpolate = useCallback(
    (inputRange: number[], outputRange: number[] | string[]) => {
      return scrollY.interpolate({
        inputRange,
        outputRange,
        extrapolate: 'clamp',
      });
    },
    [scrollY]
  );

  return {
    scrollY,
    handleScroll,
    handleScrollListener,
    interpolate,
    isScrolling: isScrolling.current,
  };
};

// Hook for spring animation with performance tracking
export const useSpringAnimation = (
  initialValue: number = 0,
  config?: any
) => {
  const animatedValue = useOptimizedAnimatedValue(initialValue);
  const [isAnimating, setIsAnimating] = useState(false);

  const animate = useCallback((toValue: number, onComplete?: () => void) => {
    setIsAnimating(true);
    
    const animation = animationController.createSpring(
      animatedValue,
      toValue,
      config
    );
    
    animation.start(() => {
      setIsAnimating(false);
      onComplete?.();
    });
    
    return animation;
  }, [animatedValue, config]);

  const reset = useCallback((value: number = initialValue) => {
    animatedValue.setValue(value);
  }, [animatedValue, initialValue]);

  return {
    value: animatedValue,
    animate,
    reset,
    isAnimating,
  };
};

// Hook for timing animation with performance tracking
export const useTimingAnimation = (
  initialValue: number = 0,
  config?: any
) => {
  const animatedValue = useOptimizedAnimatedValue(initialValue);
  const [isAnimating, setIsAnimating] = useState(false);

  const animate = useCallback((toValue: number, onComplete?: () => void) => {
    setIsAnimating(true);
    
    const animation = animationController.createTiming(
      animatedValue,
      toValue,
      config
    );
    
    animation.start(() => {
      setIsAnimating(false);
      onComplete?.();
    });
    
    return animation;
  }, [animatedValue, config]);

  const reset = useCallback((value: number = initialValue) => {
    animatedValue.setValue(value);
  }, [animatedValue, initialValue]);

  return {
    value: animatedValue,
    animate,
    reset,
    isAnimating,
  };
};

// Hook for reduced motion support
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(animationController.shouldReduceAnimations());
  }, []);

  return reducedMotion;
};

// Hook for FPS monitoring
export const useFPSMonitor = (threshold: number = 30) => {
  const [isLowFPS, setIsLowFPS] = useState(false);
  const [currentFPS, setCurrentFPS] = useState(60);

  useEffect(() => {
    const interval = setInterval(() => {
      const metrics = animationController.getMetrics();
      setCurrentFPS(metrics.fps);
      setIsLowFPS(metrics.fps < threshold);
    }, 500);

    return () => clearInterval(interval);
  }, [threshold]);

  return { isLowFPS, currentFPS };
};

// Hook for lazy animation initialization
export const useLazyAnimation = (
  animationFactory: () => Animated.CompositeAnimation,
  delay: number = 0
) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      InteractionManager.runAfterInteractions(() => {
        animationRef.current = animationFactory();
        setIsInitialized(true);
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [animationFactory, delay]);

  const start = useCallback((callback?: Animated.EndCallback) => {
    if (animationRef.current) {
      animationRef.current.start(callback);
    }
  }, []);

  const stop = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
  }, []);

  return {
    isInitialized,
    start,
    stop,
  };
};

// Hook for gesture-based animations with performance optimization
export const useGestureAnimation = (
  config?: any
) => {
  const translateX = useOptimizedAnimatedValue(0);
  const translateY = useOptimizedAnimatedValue(0);
  const scale = useOptimizedAnimatedValue(1);
  const rotation = useOptimizedAnimatedValue(0);

  const onGestureEvent = useCallback(
    Animated.event(
      [
        {
          nativeEvent: {
            translationX: translateX,
            translationY: translateY,
            scale: scale,
            rotation: rotation,
          },
        },
      ],
      { useNativeDriver: true }
    ),
    [translateX, translateY, scale, rotation]
  );

  const reset = useCallback(() => {
    Animated.parallel([
      animationController.createSpring(translateX, 0, config),
      animationController.createSpring(translateY, 0, config),
      animationController.createSpring(scale, 1, config),
      animationController.createSpring(rotation, 0, config),
    ]).start();
  }, [translateX, translateY, scale, rotation, config]);

  return {
    translateX,
    translateY,
    scale,
    rotation,
    onGestureEvent,
    reset,
    transform: [
      { translateX },
      { translateY },
      { scale },
      {
        rotate: rotation.interpolate({
          inputRange: [-360, 360],
          outputRange: ['-360deg', '360deg'],
        }),
      },
    ],
  };
};