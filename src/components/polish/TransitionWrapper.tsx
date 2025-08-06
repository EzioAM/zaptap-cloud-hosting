/**
 * Universal Transition Wrapper Component
 * Provides smooth transitions for any child component with customizable effects
 */

import React, { useEffect, useRef, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { 
  AnimationSystem, 
  SpringPresets, 
  CustomEasing 
} from '../../utils/visualPolish/AnimationSystem';
import { 
  PageTransitionOrchestrator, 
  TransitionType, 
  TransitionConfig 
} from '../../utils/visualPolish/PageTransitionOrchestrator';

interface TransitionWrapperProps {
  children: ReactNode;
  visible?: boolean;
  type?: TransitionType;
  duration?: number;
  delay?: number;
  springConfig?: any;
  style?: ViewStyle;
  onEnterStart?: () => void;
  onEnterComplete?: () => void;
  onExitStart?: () => void;
  onExitComplete?: () => void;
  enableGesture?: boolean;
  gestureThreshold?: number;
  staggerChildren?: boolean;
  staggerDelay?: number;
  parallax?: boolean;
  parallaxIntensity?: number;
}

export const TransitionWrapper: React.FC<TransitionWrapperProps> = ({
  children,
  visible = true,
  type = 'fade',
  duration = 300,
  delay = 0,
  springConfig = SpringPresets.gentle,
  style,
  onEnterStart,
  onEnterComplete,
  onExitStart,
  onExitComplete,
  enableGesture = false,
  gestureThreshold = 100,
  staggerChildren = false,
  staggerDelay = 100,
  parallax = false,
  parallaxIntensity = 0.5,
}) => {
  // Animation values
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const gestureProgress = useRef(new Animated.Value(0)).current;
  const parallaxOffset = useRef(new Animated.Value(0)).current;

  // Previous visible state for tracking changes
  const prevVisible = useRef(visible);

  useEffect(() => {
    if (visible !== prevVisible.current) {
      if (visible) {
        startEnterAnimation();
      } else {
        startExitAnimation();
      }
      prevVisible.current = visible;
    }
  }, [visible]);

  const startEnterAnimation = () => {
    onEnterStart?.();

    const config: TransitionConfig = {
      type,
      duration,
      delay,
      springConfig: springConfig ? springConfig : undefined,
    };

    const animation = springConfig
      ? AnimationSystem.createSpring(progress, 1, springConfig)
      : AnimationSystem.createTiming(progress, 1, {
          duration,
          delay,
          easing: CustomEasing.decelerate,
        });

    animation.start(() => {
      onEnterComplete?.();
    });
  };

  const startExitAnimation = () => {
    onExitStart?.();

    const config: TransitionConfig = {
      type,
      duration: duration * 0.8, // Exit slightly faster
      delay: 0,
    };

    const animation = AnimationSystem.createTiming(progress, 0, {
      duration: duration * 0.8,
      easing: CustomEasing.accelerate,
    });

    animation.start(() => {
      onExitComplete?.();
    });
  };

  const getTransitionStyles = () => {
    const config: TransitionConfig = { type, duration, delay };
    const { transform, opacity } = PageTransitionOrchestrator.createGestureTransition(
      progress,
      config
    );

    return { transform, opacity };
  };

  const createGestureHandler = () => {
    if (!enableGesture) return {};

    return {
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (event: any, gesture: any) => {
        const { dx, dy } = gesture;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const gestureValue = Math.min(distance / gestureThreshold, 1);
        
        gestureProgress.setValue(gestureValue);
      },
      onPanResponderRelease: (event: any, gesture: any) => {
        const { dx, dy } = gesture;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > gestureThreshold) {
          // Trigger exit
          startExitAnimation();
        } else {
          // Spring back
          AnimationSystem.createSpring(gestureProgress, 0, SpringPresets.bouncy).start();
        }
      },
    };
  };

  const renderChildren = () => {
    if (!staggerChildren) {
      return children;
    }

    // If staggerChildren is enabled, wrap each child with its own transition
    const childrenArray = React.Children.toArray(children);
    
    return childrenArray.map((child, index) => (
      <TransitionWrapper
        key={index}
        visible={visible}
        type={type}
        duration={duration}
        delay={delay + (index * staggerDelay)}
        springConfig={springConfig}
        style={{ flex: 1 }}
      >
        {child}
      </TransitionWrapper>
    ));
  };

  const transitionStyles = getTransitionStyles();
  const gestureHandlers = createGestureHandler();

  const combinedTransform = [
    ...(transitionStyles.transform || []),
    ...(parallax && parallaxOffset ? [
      {
        translateY: parallaxOffset.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 50 * parallaxIntensity],
        }),
      },
    ] : []),
  ];

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          opacity: transitionStyles.opacity,
          transform: combinedTransform,
        },
      ]}
      {...gestureHandlers}
    >
      {renderChildren()}
    </Animated.View>
  );
};

// Pre-configured transition components for common use cases
export const FadeTransition: React.FC<Omit<TransitionWrapperProps, 'type'>> = (props) => (
  <TransitionWrapper {...props} type="fade" />
);

export const SlideTransition: React.FC<Omit<TransitionWrapperProps, 'type'>> = (props) => (
  <TransitionWrapper {...props} type="slide" />
);

export const ScaleTransition: React.FC<Omit<TransitionWrapperProps, 'type'>> = (props) => (
  <TransitionWrapper {...props} type="scale" />
);

export const FlipTransition: React.FC<Omit<TransitionWrapperProps, 'type'>> = (props) => (
  <TransitionWrapper {...props} type="flip" />
);

export const ModalTransition: React.FC<Omit<TransitionWrapperProps, 'type'>> = (props) => (
  <TransitionWrapper {...props} type="modal" />
);

// Specialized transitions
export const StaggeredListTransition: React.FC<{
  children: ReactNode;
  visible: boolean;
  staggerDelay?: number;
  itemDuration?: number;
}> = ({
  children,
  visible,
  staggerDelay = 100,
  itemDuration = 300,
}) => {
  return (
    <TransitionWrapper
      visible={visible}
      type="slide"
      duration={itemDuration}
      staggerChildren={true}
      staggerDelay={staggerDelay}
    >
      {children}
    </TransitionWrapper>
  );
};

export const ParallaxTransition: React.FC<{
  children: ReactNode;
  visible: boolean;
  intensity?: number;
  scrollOffset?: Animated.Value;
}> = ({
  children,
  visible,
  intensity = 0.5,
  scrollOffset,
}) => {
  const parallaxValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scrollOffset) {
      // Link parallax to scroll offset
      const listener = scrollOffset.addListener(({ value }) => {
        parallaxValue.setValue(value * intensity);
      });

      return () => scrollOffset.removeListener(listener);
    }
  }, [scrollOffset, intensity]);

  return (
    <TransitionWrapper
      visible={visible}
      type="fade"
      parallax={true}
      parallaxIntensity={intensity}
    >
      {children}
    </TransitionWrapper>
  );
};

// Gesture-driven transition
export const SwipeableTransition: React.FC<{
  children: ReactNode;
  visible: boolean;
  onSwipeOut?: () => void;
  swipeDirection?: 'horizontal' | 'vertical';
  threshold?: number;
}> = ({
  children,
  visible,
  onSwipeOut,
  swipeDirection = 'horizontal',
  threshold = 100,
}) => {
  return (
    <TransitionWrapper
      visible={visible}
      type="slide"
      enableGesture={true}
      gestureThreshold={threshold}
      onExitComplete={onSwipeOut}
    >
      {children}
    </TransitionWrapper>
  );
};

// Spring-powered bouncy transition
export const BouncyTransition: React.FC<{
  children: ReactNode;
  visible: boolean;
  bounciness?: number;
  speed?: number;
}> = ({
  children,
  visible,
  bounciness = 8,
  speed = 12,
}) => {
  const springConfig = {
    ...SpringPresets.bouncy,
    bounciness,
    speed,
  };

  return (
    <TransitionWrapper
      visible={visible}
      type="scale"
      springConfig={springConfig}
    >
      {children}
    </TransitionWrapper>
  );
};

// Morphing transition (scale + opacity with custom timing)
export const MorphTransition: React.FC<{
  children: ReactNode;
  visible: boolean;
  morphDuration?: number;
}> = ({
  children,
  visible,
  morphDuration = 600,
}) => {
  return (
    <TransitionWrapper
      visible={visible}
      type="scale"
      duration={morphDuration}
    >
      {children}
    </TransitionWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    // Base container styles
  },
});

export default TransitionWrapper;