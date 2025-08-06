/**
 * Final Visual Polish Components
 * Premium touches for breathing room, parallax, and visual hierarchy
 */

import React, { useEffect } from 'react';
import {
  View,
  ViewStyle,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  withSpring,
  withTiming,
  useAnimatedRef,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { MicroInteractions, ANIMATION_PRESETS } from '../../utils/animations/MicroInteractions';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enhanced spacing system
export const SPACING_SYSTEM = {
  micro: 2,
  tiny: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 48,
  massive: 64,
  hero: 96,
} as const;

// Premium spacing container
export const SpacingContainer: React.FC<{
  children: React.ReactNode;
  padding?: keyof typeof SPACING_SYSTEM;
  paddingHorizontal?: keyof typeof SPACING_SYSTEM;
  paddingVertical?: keyof typeof SPACING_SYSTEM;
  margin?: keyof typeof SPACING_SYSTEM;
  marginHorizontal?: keyof typeof SPACING_SYSTEM;
  marginVertical?: keyof typeof SPACING_SYSTEM;
  style?: ViewStyle;
}> = ({
  children,
  padding,
  paddingHorizontal,
  paddingVertical,
  margin,
  marginHorizontal,
  marginVertical,
  style,
}) => {
  const spacingStyle: ViewStyle = {
    ...(padding && { padding: SPACING_SYSTEM[padding] }),
    ...(paddingHorizontal && { paddingHorizontal: SPACING_SYSTEM[paddingHorizontal] }),
    ...(paddingVertical && { paddingVertical: SPACING_SYSTEM[paddingVertical] }),
    ...(margin && { margin: SPACING_SYSTEM[margin] }),
    ...(marginHorizontal && { marginHorizontal: SPACING_SYSTEM[marginHorizontal] }),
    ...(marginVertical && { marginVertical: SPACING_SYSTEM[marginVertical] }),
  };

  return (
    <View style={[spacingStyle, style]}>
      {children}
    </View>
  );
};

// Parallax scroll view with enhanced effects
export const ParallaxScrollView: React.FC<{
  children: React.ReactNode;
  headerContent?: React.ReactNode;
  headerHeight?: number;
  parallaxIntensity?: number;
  showsVerticalScrollIndicator?: boolean;
  contentContainerStyle?: ViewStyle;
  onScroll?: (event: { nativeEvent: { contentOffset: { y: number } } }) => void;
}> = ({
  children,
  headerContent,
  headerHeight = 200,
  parallaxIntensity = 0.5,
  showsVerticalScrollIndicator = false,
  contentContainerStyle,
  onScroll,
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const scrollY = useSharedValue(0);
  const scrollRef = useAnimatedRef<ScrollView>();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    const translateY = scrollY.value * parallaxIntensity;
    const scale = interpolate(
      scrollY.value,
      [-100, 0],
      [1.2, 1],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollY.value,
      [0, headerHeight / 2],
      [1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateY },
        { scale },
      ],
      opacity,
    };
  });

  const overlayAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, headerHeight],
      [0, 0.6],
      Extrapolation.CLAMP
    );

    return { opacity };
  });

  return (
    <View style={{ flex: 1 }}>
      {headerContent && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: headerHeight,
              zIndex: 1,
            },
            headerAnimatedStyle,
          ]}
        >
          {headerContent}
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: colors.overlay.dark,
              },
              overlayAnimatedStyle,
            ]}
          />
        </Animated.View>
      )}
      
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        contentContainerStyle={[
          headerContent && { paddingTop: headerHeight },
          contentContainerStyle,
        ]}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
};

// Enhanced gradient overlay
export const GradientOverlay: React.FC<{
  colors?: string[];
  locations?: number[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: ViewStyle;
  intensity?: number;
}> = ({
  colors = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.3)'],
  locations = [0, 1],
  start = { x: 0, y: 0 },
  end = { x: 0, y: 1 },
  style,
  intensity = 1,
}) => {
  const adjustedColors = colors.map(color => {
    if (color.includes('rgba')) {
      const alpha = parseFloat(color.split(',')[3].replace(')', ''));
      return color.replace(/[\d.]+\)$/, `${alpha * intensity})`);
    }
    return color;
  });

  return (
    <LinearGradient
      colors={adjustedColors}
      locations={locations}
      start={start}
      end={end}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        style,
      ]}
      pointerEvents="none"
    />
  );
};

// Breathing room container with dynamic spacing
export const BreathingRoom: React.FC<{
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  horizontal?: boolean;
  vertical?: boolean;
  style?: ViewStyle;
}> = ({
  children,
  size = 'medium',
  horizontal = true,
  vertical = true,
  style,
}) => {
  const spacingMap = {
    small: SPACING_SYSTEM.medium,
    medium: SPACING_SYSTEM.large,
    large: SPACING_SYSTEM.xlarge,
    xlarge: SPACING_SYSTEM.xxlarge,
  };

  const spacing = spacingMap[size];

  return (
    <View
      style={[
        {
          ...(horizontal && { paddingHorizontal: spacing }),
          ...(vertical && { paddingVertical: spacing }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

// Enhanced visual hierarchy with automatic spacing
export const HierarchyStack: React.FC<{
  children: React.ReactElement[];
  spacing?: keyof typeof SPACING_SYSTEM;
  animated?: boolean;
  staggerDelay?: number;
}> = ({
  children,
  spacing = 'medium',
  animated = false,
  staggerDelay = 100,
}) => {
  const spacingValue = SPACING_SYSTEM[spacing];

  return (
    <View>
      {children.map((child, index) => {
        const isLast = index === children.length - 1;
        
        if (animated) {
          const opacity = useSharedValue(0);
          const translateY = useSharedValue(30);
          
          useEffect(() => {
            const delay = index * staggerDelay;
            opacity.value = withTiming(1, { duration: 400, delay });
            translateY.value = withSpring(0, { ...ANIMATION_PRESETS.spring.gentle, delay });
          }, []);
          
          const animatedStyle = useAnimatedStyle(() => ({
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }],
          }));
          
          return (
            <Animated.View
              key={index}
              style={[
                animatedStyle,
                !isLast && { marginBottom: spacingValue },
              ]}
            >
              {child}
            </Animated.View>
          );
        }
        
        return (
          <View
            key={index}
            style={!isLast ? { marginBottom: spacingValue } : undefined}
          >
            {child}
          </View>
        );
      })}
    </View>
  );
};

// Floating card with premium elevation
export const FloatingCard: React.FC<{
  children: React.ReactNode;
  elevation?: number;
  borderRadius?: number;
  animated?: boolean;
  hoverEffect?: boolean;
  style?: ViewStyle;
}> = ({
  children,
  elevation = 4,
  borderRadius = 16,
  animated = false,
  hoverEffect = Platform.OS === 'web',
  style,
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);

  const elevationStyle = {
    shadowColor: colors.overlay.dark,
    shadowOffset: { width: 0, height: elevation / 2 },
    shadowOpacity: 0.1 + (elevation * 0.02),
    shadowRadius: elevation * 2,
    elevation: Platform.OS === 'android' ? elevation : 0,
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
  }));

  const handleHoverIn = () => {
    if (hoverEffect) {
      scale.value = withSpring(1.02, ANIMATION_PRESETS.spring.gentle);
      shadowOpacity.value = withTiming(0.15, { duration: 200 });
    }
  };

  const handleHoverOut = () => {
    if (hoverEffect) {
      scale.value = withSpring(1, ANIMATION_PRESETS.spring.gentle);
      shadowOpacity.value = withTiming(0.1, { duration: 200 });
    }
  };

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.surface.primary,
          borderRadius,
          overflow: 'hidden',
          ...elevationStyle,
        },
        animated && animatedStyle,
        style,
      ]}
      onPointerEnter={Platform.OS === 'web' ? handleHoverIn : undefined}
      onPointerLeave={Platform.OS === 'web' ? handleHoverOut : undefined}
    >
      {children}
    </Animated.View>
  );
};

// Dynamic grid layout
export const DynamicGrid: React.FC<{
  children: React.ReactElement[];
  minItemWidth?: number;
  spacing?: number;
  style?: ViewStyle;
}> = ({
  children,
  minItemWidth = 150,
  spacing = 16,
  style,
}) => {
  const columns = Math.floor((SCREEN_WIDTH - spacing * 2) / (minItemWidth + spacing));
  const itemWidth = (SCREEN_WIDTH - spacing * (columns + 1)) / columns;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: spacing / 2,
        },
        style,
      ]}
    >
      {children.map((child, index) => (
        <View
          key={index}
          style={{
            width: itemWidth,
            marginHorizontal: spacing / 2,
            marginBottom: spacing,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

// Enhanced separator with gradient
export const EnhancedSeparator: React.FC<{
  height?: number;
  color?: string;
  gradient?: boolean;
  style?: ViewStyle;
}> = ({
  height = 1,
  color,
  gradient = false,
  style,
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const separatorColor = color || colors.border.light;

  if (gradient) {
    return (
      <LinearGradient
        colors={[
          'transparent',
          separatorColor,
          'transparent',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          {
            height,
            width: '100%',
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          height,
          backgroundColor: separatorColor,
          width: '100%',
        },
        style,
      ]}
    />
  );
};

// Contextual background blur
export const ContextualBackground: React.FC<{
  children: React.ReactNode;
  blur?: boolean;
  opacity?: number;
  color?: string;
  style?: ViewStyle;
}> = ({
  children,
  blur = false,
  opacity = 0.95,
  color,
  style,
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const backgroundColor = color || colors.background.primary;

  if (blur && Platform.OS === 'ios') {
    const { BlurView } = require('expo-blur');
    return (
      <BlurView
        intensity={80}
        tint={theme.mode === 'dark' ? 'dark' : 'light'}
        style={[{ flex: 1 }, style]}
      >
        <View style={{ flex: 1, backgroundColor: `${backgroundColor}${Math.round(opacity * 255).toString(16)}` }}>
          {children}
        </View>
      </BlurView>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: backgroundColor,
          opacity,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

// Premium layout wrapper
export const PremiumLayout: React.FC<{
  children: React.ReactNode;
  safeArea?: boolean;
  statusBarStyle?: 'light' | 'dark' | 'auto';
  backgroundColor?: string;
}> = ({
  children,
  safeArea = true,
  statusBarStyle = 'auto',
  backgroundColor,
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const SafeAreaProvider = require('react-native-safe-area-context').SafeAreaProvider;
  const SafeAreaView = require('react-native-safe-area-context').SafeAreaView;

  const bgColor = backgroundColor || colors.background.primary;

  const content = (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {children}
    </View>
  );

  if (safeArea) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
          {content}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return content;
};

export default {
  SpacingContainer,
  ParallaxScrollView,
  GradientOverlay,
  BreathingRoom,
  HierarchyStack,
  FloatingCard,
  DynamicGrid,
  EnhancedSeparator,
  ContextualBackground,
  PremiumLayout,
  SPACING_SYSTEM,
};