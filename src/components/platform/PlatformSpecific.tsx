/**
 * Platform-Specific Components and Behaviors
 * iOS, Android, and Web optimizations for premium experience
 */

import React from 'react';
import {
  View,
  ViewStyle,
  Platform,
  TouchableOpacity,
  TouchableNativeFeedback,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  runOnJS,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  TapGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { MicroInteractions } from '../../utils/animations/MicroInteractions';

// iOS-specific blur background
export const IOSBlurView: React.FC<{
  children: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: ViewStyle;
}> = ({ children, intensity = 80, tint = 'default', style }) => {
  if (Platform.OS !== 'ios') {
    const theme = useSafeTheme();
    return (
      <View
        style={[
          {
            backgroundColor: tint === 'dark' 
              ? 'rgba(0, 0, 0, 0.8)' 
              : 'rgba(255, 255, 255, 0.8)',
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
};

// Material Design 3 Surface
export const Material3Surface: React.FC<{
  children: React.ReactNode;
  elevation?: number;
  style?: ViewStyle;
  onPress?: () => void;
  rippleColor?: string;
}> = ({ children, elevation = 1, style, onPress, rippleColor }) => {
  const theme = useSafeTheme();
  const colors = theme.colors;

  const elevationStyles = {
    1: { shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 },
    2: { shadowOpacity: 0.08, shadowRadius: 2, elevation: 2 },
    3: { shadowOpacity: 0.12, shadowRadius: 4, elevation: 4 },
    4: { shadowOpacity: 0.16, shadowRadius: 6, elevation: 6 },
    5: { shadowOpacity: 0.20, shadowRadius: 8, elevation: 8 },
  }[Math.min(elevation, 5)] || { shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 };

  const surfaceStyle: ViewStyle = {
    backgroundColor: colors.surface.primary,
    borderRadius: 12,
    ...elevationStyles,
    shadowColor: Platform.OS === 'ios' ? colors.overlay.dark : 'transparent',
    shadowOffset: { width: 0, height: elevation / 2 },
  };

  if (onPress && Platform.OS === 'android') {
    return (
      <TouchableNativeFeedback
        onPress={onPress}
        background={TouchableNativeFeedback.Ripple(
          rippleColor || colors.states.pressed,
          false
        )}
      >
        <Animated.View style={[surfaceStyle, style]}>
          {children}
        </Animated.View>
      </TouchableNativeFeedback>
    );
  }

  const Component = onPress ? TouchableOpacity : View;
  return (
    <Component onPress={onPress} style={[surfaceStyle, style]}>
      {children}
    </Component>
  );
};

// iOS-style swipe actions
export const IOSSwipeActions: React.FC<{
  children: React.ReactNode;
  leftActions?: Array<{
    title: string;
    color: string;
    onPress: () => void;
  }>;
  rightActions?: Array<{
    title: string;
    color: string;
    onPress: () => void;
  }>;
  style?: ViewStyle;
}> = ({ children, leftActions = [], rightActions = [], style }) => {
  const translateX = useSharedValue(0);
  const actionWidth = 80;

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      runOnJS(MicroInteractions.haptics.light)();
    },
    onActive: (event) => {
      const maxLeftSwipe = leftActions.length * actionWidth;
      const maxRightSwipe = -(rightActions.length * actionWidth);
      
      translateX.value = Math.max(
        maxRightSwipe,
        Math.min(maxLeftSwipe, event.translationX)
      );
    },
    onEnd: (event) => {
      const threshold = actionWidth / 2;
      
      if (event.translationX > threshold && leftActions.length > 0) {
        translateX.value = withSpring(leftActions.length * actionWidth);
      } else if (event.translationX < -threshold && rightActions.length > 0) {
        translateX.value = withSpring(-(rightActions.length * actionWidth));
      } else {
        translateX.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      {/* Left actions */}
      {leftActions.map((action, index) => (
        <Animated.View
          key={`left-${index}`}
          style={{
            position: 'absolute',
            left: index * actionWidth,
            top: 0,
            bottom: 0,
            width: actionWidth,
            backgroundColor: action.color,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              action.onPress();
              translateX.value = withSpring(0);
            }}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {/* Action content */}
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* Right actions */}
      {rightActions.map((action, index) => (
        <Animated.View
          key={`right-${index}`}
          style={{
            position: 'absolute',
            right: index * actionWidth,
            top: 0,
            bottom: 0,
            width: actionWidth,
            backgroundColor: action.color,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              action.onPress();
              translateX.value = withSpring(0);
            }}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
            }}
          >
            {/* Action content */}
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* Main content */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View style={animatedStyle}>
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

// Platform-aware touchable
export const PlatformTouchable: React.FC<{
  children: React.ReactNode;
  onPress: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  rippleColor?: string;
  hapticFeedback?: boolean;
  disabled?: boolean;
}> = ({
  children,
  onPress,
  onLongPress,
  style,
  rippleColor,
  hapticFeedback = true,
  disabled = false,
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;

  const handlePress = () => {
    if (disabled) return;
    
    if (hapticFeedback) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
    
    onPress();
  };

  const handleLongPress = () => {
    if (disabled || !onLongPress) return;
    
    if (hapticFeedback) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
    
    onLongPress();
  };

  if (Platform.OS === 'android') {
    return (
      <TouchableNativeFeedback
        onPress={handlePress}
        onLongPress={handleLongPress}
        disabled={disabled}
        background={TouchableNativeFeedback.Ripple(
          rippleColor || colors.states.pressed,
          false
        )}
      >
        <View style={style}>
          {children}
        </View>
      </TouchableNativeFeedback>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={disabled}
      style={style}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

// iOS-style large title header
export const IOSLargeTitle: React.FC<{
  title: string;
  scrollY?: Animated.SharedValue<number>;
  style?: ViewStyle;
}> = ({ title, scrollY, style }) => {
  const theme = useSafeTheme();
  const colors = theme.colors;

  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    
    const opacity = scrollY.value > 100 ? 0 : 1;
    const scale = scrollY.value > 100 ? 0.8 : 1;
    
    return {
      opacity: withTiming(opacity),
      transform: [{ scale: withTiming(scale) }],
    };
  });

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <Animated.View
      style={[
        {
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
        },
        animatedStyle,
        style,
      ]}
    >
      {/* Large title implementation */}
    </Animated.View>
  );
};

// Material Design 3 FAB
export const Material3FAB: React.FC<{
  icon: React.ReactNode;
  onPress: () => void;
  extended?: boolean;
  label?: string;
  style?: ViewStyle;
}> = ({ icon, onPress, extended = false, label, style }) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const scale = useSharedValue(1);
  const width = useSharedValue(extended ? 200 : 56);

  const handlePress = () => {
    MicroInteractions.material3.fabExpand(scale, width);
    if (Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    width: width.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <PlatformTouchable
        onPress={handlePress}
        style={{
          height: 56,
          backgroundColor: colors.brand.primary,
          borderRadius: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: extended ? 16 : 0,
          shadowColor: colors.overlay.dark,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 6,
        }}
        rippleColor={colors.states.pressed}
      >
        {icon}
        {extended && label && (
          <View style={{ marginLeft: 8 }}>
            {/* Label component */}
          </View>
        )}
      </PlatformTouchable>
    </Animated.View>
  );
};

// Cross-platform status bar
export const PlatformStatusBar: React.FC<{
  barStyle?: 'default' | 'light-content' | 'dark-content';
  backgroundColor?: string;
  translucent?: boolean;
}> = ({ barStyle = 'default', backgroundColor, translucent = false }) => {
  const theme = useSafeTheme();
  const colors = theme.colors;

  return (
    <StatusBar
      barStyle={barStyle}
      backgroundColor={backgroundColor || colors.background.primary}
      translucent={translucent}
      animated
    />
  );
};

// Web-specific hover effects
export const WebHoverEffect: React.FC<{
  children: React.ReactNode;
  hoverStyle?: ViewStyle;
  style?: ViewStyle;
}> = ({ children, hoverStyle, style }) => {
  if (Platform.OS !== 'web') {
    return <View style={style}>{children}</View>;
  }

  // Web-specific hover implementation would go here
  return (
    <View
      style={[
        style,
        {
          // @ts-ignore - Web-specific CSS
          ':hover': hoverStyle,
          cursor: 'pointer',
        },
      ]}
    >
      {children}
    </View>
  );
};

// Platform-aware keyboard avoiding view
export const PlatformKeyboardAvoidingView: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => {
  if (Platform.OS === 'web') {
    return <View style={style}>{children}</View>;
  }

  const KeyboardAvoidingView = require('react-native').KeyboardAvoidingView;
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={style}
    >
      {children}
    </KeyboardAvoidingView>
  );
};

export default {
  IOSBlurView,
  Material3Surface,
  IOSSwipeActions,
  PlatformTouchable,
  IOSLargeTitle,
  Material3FAB,
  PlatformStatusBar,
  WebHoverEffect,
  PlatformKeyboardAvoidingView,
};