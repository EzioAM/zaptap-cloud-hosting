import {
  Easing,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { Platform } from 'react-native';
import { CardStyleInterpolators, TransitionPresets } from '@react-navigation/stack';

// Enable 120fps on ProMotion displays
const PREFERRED_FPS = Platform.OS === 'ios' ? 120 : 60;
const FRAME_TIME = 1000 / PREFERRED_FPS;

// Spring configuration for ultra-smooth navigation
const SPRING_CONFIG = {
  damping: 30,
  mass: 0.7,
  stiffness: 200,
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.001,
};

// Timing configuration for linear animations
const TIMING_CONFIG = {
  duration: 250,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Custom ease-out curve
};

// GPU-accelerated slide from right transition
export const GPUSlideFromRight = {
  gestureDirection: 'horizontal' as const,
  transitionSpec: {
    open: {
      animation: 'spring' as const,
      config: SPRING_CONFIG,
    },
    close: {
      animation: 'spring' as const,
      config: {
        ...SPRING_CONFIG,
        damping: 35,
        stiffness: 250,
      },
    },
  },
  cardStyleInterpolator: ({ current, next, layouts }: any) => {
    'worklet';
    
    const translateX = interpolate(
      current.progress.value,
      [0, 1],
      [layouts.screen.width, 0],
      Extrapolate.CLAMP
    );
    
    const overlayOpacity = interpolate(
      current.progress.value,
      [0, 0.5, 1],
      [0, 0.3, 0.7],
      Extrapolate.CLAMP
    );
    
    const scale = next
      ? interpolate(
          next.progress.value,
          [0, 1],
          [1, 0.93],
          Extrapolate.CLAMP
        )
      : 1;
    
    return {
      cardStyle: {
        transform: [
          { translateX },
          { scale },
        ],
      },
      overlayStyle: {
        opacity: overlayOpacity,
      },
    };
  },
};

// GPU-accelerated modal presentation
export const GPUModalPresentation = {
  gestureDirection: 'vertical' as const,
  transitionSpec: {
    open: {
      animation: 'spring' as const,
      config: {
        damping: 25,
        mass: 0.5,
        stiffness: 300,
        overshootClamping: true,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.001,
      },
    },
    close: {
      animation: 'spring' as const,
      config: {
        damping: 30,
        mass: 0.5,
        stiffness: 350,
        overshootClamping: true,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.001,
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }: any) => {
    'worklet';
    
    const translateY = interpolate(
      current.progress.value,
      [0, 1],
      [layouts.screen.height, 0],
      Extrapolate.CLAMP
    );
    
    const borderRadius = interpolate(
      current.progress.value,
      [0, 0.5, 1],
      [28, 20, 0],
      Extrapolate.CLAMP
    );
    
    const opacity = interpolate(
      current.progress.value,
      [0, 0.1, 1],
      [0, 1, 1],
      Extrapolate.CLAMP
    );
    
    return {
      cardStyle: {
        transform: [{ translateY }],
        borderTopLeftRadius: borderRadius,
        borderTopRightRadius: borderRadius,
        opacity,
      },
      overlayStyle: {
        opacity: interpolate(
          current.progress.value,
          [0, 1],
          [0, 0.5],
          Extrapolate.CLAMP
        ),
      },
    };
  },
};

// GPU-accelerated fade transition
export const GPUFadeTransition = {
  gestureDirection: 'horizontal' as const,
  transitionSpec: {
    open: {
      animation: 'timing' as const,
      config: {
        duration: 200,
        easing: Easing.out(Easing.poly(4)),
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: 150,
        easing: Easing.in(Easing.poly(4)),
      },
    },
  },
  cardStyleInterpolator: ({ current, next }: any) => {
    'worklet';
    
    const opacity = interpolate(
      current.progress.value,
      [0, 0.5, 1],
      [0, 0.5, 1],
      Extrapolate.CLAMP
    );
    
    const scale = interpolate(
      current.progress.value,
      [0, 1],
      [0.9, 1],
      Extrapolate.CLAMP
    );
    
    return {
      cardStyle: {
        opacity,
        transform: [{ scale }],
      },
      overlayStyle: {
        opacity: next
          ? interpolate(
              next.progress.value,
              [0, 1],
              [0, 0.3],
              Extrapolate.CLAMP
            )
          : 0,
      },
    };
  },
};

// GPU-accelerated iOS-style slide
export const GPUiOSSlide = {
  ...TransitionPresets.SlideFromRightIOS,
  transitionSpec: {
    open: {
      animation: 'spring' as const,
      config: {
        damping: 500,
        mass: 3,
        stiffness: 1000,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      },
    },
    close: {
      animation: 'spring' as const,
      config: {
        damping: 500,
        mass: 3,
        stiffness: 1000,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      },
    },
  },
};

// GPU-accelerated bottom sheet
export const GPUBottomSheet = {
  gestureDirection: 'vertical' as const,
  transitionSpec: {
    open: {
      animation: 'spring' as const,
      config: {
        damping: 28,
        mass: 0.8,
        stiffness: 400,
        overshootClamping: false,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.001,
      },
    },
    close: {
      animation: 'timing' as const,
      config: {
        duration: 200,
        easing: Easing.inOut(Easing.ease),
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }: any) => {
    'worklet';
    
    const translateY = interpolate(
      current.progress.value,
      [0, 1],
      [layouts.screen.height, 0],
      Extrapolate.CLAMP
    );
    
    return {
      cardStyle: {
        transform: [{ translateY }],
      },
      overlayStyle: {
        opacity: interpolate(
          current.progress.value,
          [0, 1],
          [0, 0.4],
          Extrapolate.CLAMP
        ),
      },
    };
  },
};

// Performance-optimized default screen options
export const GPUScreenOptions = {
  // Enable gesture handling
  gestureEnabled: true,
  gestureResponseDistance: {
    horizontal: 50,
    vertical: 135,
  },
  
  // Optimize header
  headerMode: 'screen' as const,
  headerStatusBarHeight: 0,
  
  // Use GPU-accelerated transitions by default
  ...GPUSlideFromRight,
  
  // Performance flags
  detachPreviousScreen: false,
  freezeOnBlur: true,
  
  // Lazy loading
  lazy: true,
  
  // Optimize unmounting
  unmountOnBlur: false,
};

// Tab navigator animation config
export const GPUTabAnimationConfig = {
  animation: 'shift' as const,
  tabBarShowLabel: true,
  tabBarHideOnKeyboard: true,
  
  // Custom animation timing
  animationDuration: 200,
  
  // Haptic feedback timing (iOS)
  hapticFeedbackDelay: 0,
  
  // Performance optimizations
  lazy: true,
  detachInactiveScreens: Platform.OS === 'android',
  
  // Swipe gesture config
  swipeEnabled: true,
  swipeVelocityImpact: 0.2,
  swipeMinDistance: 10,
};

// Helper to get optimal transition based on route
export const getOptimalTransition = (routeName: string) => {
  'worklet';
  
  // Modal-style screens
  if (['Scanner', 'Camera', 'Settings'].includes(routeName)) {
    return GPUModalPresentation;
  }
  
  // Bottom sheet style
  if (['FilterSheet', 'ShareSheet'].includes(routeName)) {
    return GPUBottomSheet;
  }
  
  // Fade for auth screens
  if (['SignIn', 'SignUp', 'ResetPassword'].includes(routeName)) {
    return GPUFadeTransition;
  }
  
  // Default to optimized slide
  return Platform.OS === 'ios' ? GPUiOSSlide : GPUSlideFromRight;
};

// Export all configs
export default {
  GPUSlideFromRight,
  GPUModalPresentation,
  GPUFadeTransition,
  GPUiOSSlide,
  GPUBottomSheet,
  GPUScreenOptions,
  GPUTabAnimationConfig,
  getOptimalTransition,
};