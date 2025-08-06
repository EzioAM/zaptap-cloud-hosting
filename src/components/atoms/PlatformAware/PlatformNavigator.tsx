import React, { useMemo } from 'react';
import {
  createStackNavigator,
  StackNavigationOptions,
  CardStyleInterpolators,
  HeaderStyleInterpolators,
  TransitionPresets,
} from '@react-navigation/stack';
import { Platform } from 'react-native';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { usePlatform } from '../../../hooks/usePlatform';

export type PlatformNavigationTransition = 'slide' | 'modal' | 'fade' | 'flip' | 'none';

export interface PlatformNavigatorConfig {
  transition?: PlatformNavigationTransition;
  gesturesEnabled?: boolean;
  headerShown?: boolean;
  customTransition?: {
    cardStyleInterpolator?: any;
    headerStyleInterpolator?: any;
    transitionSpec?: {
      open: any;
      close: any;
    };
  };
}

export interface PlatformScreenOptions extends StackNavigationOptions {
  platformTransition?: PlatformNavigationTransition;
  iosTransition?: PlatformNavigationTransition;
  androidTransition?: PlatformNavigationTransition;
  webTransition?: PlatformNavigationTransition;
}

const Stack = createStackNavigator();

export const usePlatformNavigationOptions = (
  config: PlatformNavigatorConfig = {}
): StackNavigationOptions => {
  const theme = useSafeTheme();
  const platform = usePlatform();
  const colors = theme.colors;

  const platformDefaults = useMemo(() => {
    return platform.select({
      ios: {
        transition: 'slide' as const,
        gesturesEnabled: true,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface.primary,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          fontSize: 17,
          fontWeight: '600' as const,
          color: colors.text.primary,
        },
        headerBackTitleStyle: {
          fontSize: 16,
          color: colors.brand.primary,
        },
        headerTintColor: colors.brand.primary,
      },
      android: {
        transition: 'slide' as const,
        gesturesEnabled: false,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface.primary,
          elevation: 4,
        },
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '500' as const,
          color: colors.text.primary,
        },
        headerTintColor: colors.text.primary,
      },
      web: {
        transition: 'fade' as const,
        gesturesEnabled: false,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface.primary,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '500' as const,
          color: colors.text.primary,
        },
        headerTintColor: colors.text.primary,
      },
      default: {
        transition: 'slide' as const,
        gesturesEnabled: true,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface.primary,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '500' as const,
          color: colors.text.primary,
        },
        headerTintColor: colors.text.primary,
      },
    });
  }, [platform, colors]);

  const getTransitionPreset = (transition: PlatformNavigationTransition) => {
    switch (transition) {
      case 'slide':
        return platform.select({
          ios: TransitionPresets.SlideFromRightIOS,
          android: TransitionPresets.DefaultTransition,
          web: TransitionPresets.SlideFromRightIOS,
          default: TransitionPresets.SlideFromRightIOS,
        });
      
      case 'modal':
        return platform.select({
          ios: TransitionPresets.ModalSlideFromBottomIOS,
          android: TransitionPresets.FadeFromBottomAndroid,
          web: TransitionPresets.ScaleFromCenterAndroid,
          default: TransitionPresets.ModalSlideFromBottomIOS,
        });
      
      case 'fade':
        return TransitionPresets.FadeFromBottomAndroid;
      
      case 'flip':
        return platform.select({
          ios: TransitionPresets.ModalSlideFromBottomIOS,
          default: TransitionPresets.DefaultTransition,
        });
      
      case 'none':
        return {
          cardStyleInterpolator: ({ current }: any) => ({
            cardStyle: {
              opacity: current.progress,
            },
          }),
        };
      
      default:
        return TransitionPresets.DefaultTransition;
    }
  };

  const effectiveTransition = config.transition || platformDefaults.transition;
  const transitionPreset = getTransitionPreset(effectiveTransition);

  return {
    ...platformDefaults,
    ...transitionPreset,
    gesturesEnabled: config.gesturesEnabled ?? platformDefaults.gesturesEnabled,
    headerShown: config.headerShown ?? platformDefaults.headerShown,
    ...config.customTransition,
  };
};

export const usePlatformScreenOptions = (
  options: PlatformScreenOptions = {}
): StackNavigationOptions => {
  const platform = usePlatform();
  const baseOptions = usePlatformNavigationOptions();

  // Platform-specific transition overrides
  const platformTransition = platform.select({
    ios: options.iosTransition,
    android: options.androidTransition,
    web: options.webTransition,
    default: options.platformTransition,
  });

  if (platformTransition) {
    const getTransitionPreset = (transition: PlatformNavigationTransition) => {
      switch (transition) {
        case 'slide':
          return platform.select({
            ios: TransitionPresets.SlideFromRightIOS,
            android: TransitionPresets.DefaultTransition,
            web: TransitionPresets.SlideFromRightIOS,
            default: TransitionPresets.SlideFromRightIOS,
          });
        
        case 'modal':
          return platform.select({
            ios: TransitionPresets.ModalSlideFromBottomIOS,
            android: TransitionPresets.FadeFromBottomAndroid,
            web: TransitionPresets.ScaleFromCenterAndroid,
            default: TransitionPresets.ModalSlideFromBottomIOS,
          });
        
        case 'fade':
          return TransitionPresets.FadeFromBottomAndroid;
        
        case 'flip':
          return platform.select({
            ios: TransitionPresets.ModalSlideFromBottomIOS,
            default: TransitionPresets.DefaultTransition,
          });
        
        case 'none':
          return {
            cardStyleInterpolator: ({ current }: any) => ({
              cardStyle: {
                opacity: current.progress,
              },
            }),
          };
        
        default:
          return TransitionPresets.DefaultTransition;
      }
    };

    const transitionPreset = getTransitionPreset(platformTransition);
    
    return {
      ...baseOptions,
      ...transitionPreset,
      ...options,
    };
  }

  return {
    ...baseOptions,
    ...options,
  };
};

// Custom transition interpolators
export const PlatformTransitions = {
  // iOS-style slide with parallax
  slideFromRightWithParallax: ({ current, next, layouts }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.07],
        }),
      },
    };
  },

  // Android-style fade with scale
  fadeWithScale: ({ current }: any) => {
    return {
      cardStyle: {
        opacity: current.progress,
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.92, 1],
            }),
          },
        ],
      },
    };
  },

  // Web-style slide from bottom
  slideFromBottom: ({ current, layouts }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.height, 0],
            }),
          },
        ],
      },
    };
  },

  // Flip transition
  flip: ({ current, next, layouts }: any) => {
    return {
      cardStyle: {
        backfaceVisibility: 'hidden',
        transform: [
          {
            rotateY: current.progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: ['180deg', '90deg', '0deg'],
            }),
          },
        ],
      },
    };
  },

  // Custom slide with bounce
  slideWithBounce: ({ current, layouts }: any) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [layouts.screen.width, -20, 0],
            }),
          },
        ],
      },
    };
  },
};

// Header transition interpolators
export const PlatformHeaderTransitions = {
  // iOS-style header fade
  fadeHeader: ({ current }: any) => {
    return {
      titleStyle: {
        opacity: current.progress,
      },
      backgroundStyle: {
        opacity: current.progress,
      },
    };
  },

  // Android-style header slide
  slideHeader: ({ current, layouts }: any) => {
    return {
      titleStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
    };
  },
};

// Gesture configuration
export const PlatformGestureConfig = {
  ios: {
    gestureResponseDistance: 50,
    gestureVelocityImpact: 0.3,
  },
  android: {
    gestureResponseDistance: 25,
    gestureVelocityImpact: 0.2,
  },
  web: {
    gestureResponseDistance: 0,
    gestureVelocityImpact: 0,
  },
};

// Pre-configured navigator variants
export const createPlatformStackNavigator = (config: PlatformNavigatorConfig = {}) => {
  return function PlatformStackNavigator() {
    const screenOptions = usePlatformNavigationOptions(config);
    
    return Stack.Navigator
      screenOptions={screenOptions}
      {...config}
    />;
  };
};

export { Stack as PlatformStack };