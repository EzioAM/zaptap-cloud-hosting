/**
 * Enhanced Skeleton Loader with Premium Animations
 * Multiple animation styles and prebuilt components
 */

import React, { useEffect } from 'react';
import { View, ViewStyle, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { MicroInteractions } from '../../../utils/animations/MicroInteractions';

export type SkeletonAnimation = 'shimmer' | 'pulse' | 'wave' | 'breathe' | 'fade';

export interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  animation?: SkeletonAnimation;
  duration?: number;
  delay?: number;
  children?: React.ReactNode;
  isLoading?: boolean;
}

const SkeletonBase: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  animation = 'shimmer',
  duration = 1200,
  delay = 0,
  children,
  isLoading = true,
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  
  // Animation values
  const translateX = useSharedValue(-1);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);
  const waveHeight = useSharedValue(0);

  useEffect(() => {
    if (!isLoading) return;

    switch (animation) {
      case 'shimmer':
        MicroInteractions.loading.shimmer(translateX, typeof width === 'number' ? width : 200);
        break;
      
      case 'pulse':
        MicroInteractions.loading.pulse(scale);
        break;
      
      case 'breathe':
        MicroInteractions.loading.breathe(opacity);
        break;
      
      case 'wave':
        waveHeight.value = withRepeat(
          withSequence(
            withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.sine) }),
            withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.sine) })
          ),
          -1,
          false
        );
        break;
      
      case 'fade':
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.2, { duration: duration / 2 }),
            withTiming(0.8, { duration: duration / 2 })
          ),
          -1,
          true
        );
        break;
    }
  }, [isLoading, animation, duration, width]);

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    if (animation !== 'shimmer') return {};
    
    return {
      transform: [{
        translateX: interpolate(
          translateX.value,
          [-1, 1],
          [typeof width === 'number' ? -width : -200, typeof width === 'number' ? width * 2 : 400]
        ),
      }],
    };
  });

  const pulseAnimatedStyle = useAnimatedStyle(() => {
    if (animation !== 'pulse') return {};
    
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const breatheAnimatedStyle = useAnimatedStyle(() => {
    if (animation !== 'breathe' && animation !== 'fade') return {};
    
    return {
      opacity: opacity.value,
    };
  });

  const waveAnimatedStyle = useAnimatedStyle(() => {
    if (animation !== 'wave') return {};
    
    return {
      transform: [
        { scaleY: 1 + waveHeight.value * 0.1 },
        { scaleX: 1 - waveHeight.value * 0.05 }
      ],
    };
  });

  if (!isLoading && children) {
    return <>{children}</>;
  }

  if (!isLoading) {
    return null;
  }

  const skeletonColors = {
    light: ['#E8E8E8', '#F5F5F5', '#E8E8E8'],
    dark: ['#2a2a2a', '#3a3a3a', '#2a2a2a'],
  };

  const gradientColors = theme.mode === 'dark' 
    ? skeletonColors.dark 
    : skeletonColors.light;

  const baseStyle: ViewStyle = {
    width,
    height,
    borderRadius,
    backgroundColor: colors.surface.secondary,
    overflow: 'hidden',
  };

  const combinedStyle = [
    baseStyle,
    pulseAnimatedStyle,
    breatheAnimatedStyle,
    waveAnimatedStyle,
    style,
  ];

  return (
    <Animated.View style={combinedStyle}>
      {animation === 'shimmer' && (
        <Animated.View style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
          shimmerAnimatedStyle,
        ]}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </Animated.View>
      )}
      {children}
    </Animated.View>
  );
};

// Prebuilt skeleton components
export const SkeletonText: React.FC<{
  lines?: number;
  lineHeight?: number;
  lineSpacing?: number;
  lastLineWidth?: string;
  animation?: SkeletonAnimation;
  staggerDelay?: number;
}> = ({
  lines = 3,
  lineHeight = 16,
  lineSpacing = 8,
  lastLineWidth = '60%',
  animation = 'shimmer',
  staggerDelay = 100,
}) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBase
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          style={index > 0 ? { marginTop: lineSpacing } : undefined}
          animation={animation}
          delay={index * staggerDelay}
        />
      ))}
    </View>
  );
};

export const SkeletonCard: React.FC<{
  height?: number;
  showAvatar?: boolean;
  showActions?: boolean;
  animation?: SkeletonAnimation;
}> = ({
  height = 120,
  showAvatar = true,
  showActions = false,
  animation = 'shimmer',
}) => {
  const theme = useSafeTheme();
  const colors = theme.colors;

  return (
    <View
      style={{
        backgroundColor: colors.surface.primary,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        height,
        shadowColor: colors.overlay.light,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {showAvatar && (
          <SkeletonBase
            width={48}
            height={48}
            borderRadius={24}
            style={{ marginRight: 12 }}
            animation={animation}
          />
        )}
        <View style={{ flex: 1 }}>
          <SkeletonBase 
            width="70%" 
            height={18} 
            animation={animation}
          />
          <SkeletonBase 
            width="100%" 
            height={14} 
            style={{ marginTop: 8 }} 
            animation={animation}
            delay={100}
          />
          <SkeletonBase 
            width="85%" 
            height={14} 
            style={{ marginTop: 4 }} 
            animation={animation}
            delay={200}
          />
        </View>
        {showActions && (
          <View style={{ marginLeft: 12 }}>
            <SkeletonBase
              width={32}
              height={32}
              borderRadius={16}
              animation={animation}
              delay={300}
            />
          </View>
        )}
      </View>
    </View>
  );
};

export const SkeletonButton: React.FC<{
  width?: number | string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  animation?: SkeletonAnimation;
}> = ({
  width = 120,
  variant = 'primary',
  size = 'medium',
  animation = 'pulse',
}) => {
  const heights = {
    small: 32,
    medium: 44,
    large: 56,
  };

  const borderRadii = {
    small: 6,
    medium: 8,
    large: 10,
  };

  return (
    <SkeletonBase
      width={width}
      height={heights[size]}
      borderRadius={borderRadii[size]}
      animation={animation}
    />
  );
};

export const SkeletonList: React.FC<{
  items?: number;
  itemHeight?: number;
  itemSpacing?: number;
  animation?: SkeletonAnimation;
  staggerDelay?: number;
}> = ({
  items = 5,
  itemHeight = 60,
  itemSpacing = 12,
  animation = 'shimmer',
  staggerDelay = 150,
}) => {
  return (
    <View>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard
          key={index}
          height={itemHeight}
          style={index > 0 ? { marginTop: itemSpacing } : undefined}
          animation={animation}
          delay={index * staggerDelay}
        />
      ))}
    </View>
  );
};

export const SkeletonGrid: React.FC<{
  columns?: number;
  rows?: number;
  itemAspectRatio?: number;
  spacing?: number;
  animation?: SkeletonAnimation;
  staggerDelay?: number;
}> = ({
  columns = 2,
  rows = 3,
  itemAspectRatio = 1,
  spacing = 12,
  animation = 'wave',
  staggerDelay = 100,
}) => {
  const itemWidth = `${(100 - (columns - 1) * 2) / columns}%`;
  const itemHeight = 120 / itemAspectRatio;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -spacing / 2 }}>
      {Array.from({ length: columns * rows }).map((_, index) => {
        const isNotLastInRow = (index + 1) % columns !== 0;
        return (
          <View
            key={index}
            style={{
              width: itemWidth,
              marginHorizontal: spacing / 2,
              marginVertical: spacing / 2,
            }}
          >
            <SkeletonBase
              width="100%"
              height={itemHeight}
              borderRadius={12}
              animation={animation}
              delay={index * staggerDelay}
            />
          </View>
        );
      })}
    </View>
  );
};

export const SkeletonHeader: React.FC<{
  showBackButton?: boolean;
  showActions?: boolean;
  animation?: SkeletonAnimation;
}> = ({
  showBackButton = false,
  showActions = true,
  animation = 'fade',
}) => {
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    }}>
      {showBackButton && (
        <SkeletonBase
          width={24}
          height={24}
          borderRadius={12}
          animation={animation}
        />
      )}
      <SkeletonBase
        width={150}
        height={24}
        borderRadius={4}
        animation={animation}
        delay={100}
      />
      {showActions && (
        <View style={{ flexDirection: 'row' }}>
          <SkeletonBase
            width={24}
            height={24}
            borderRadius={12}
            animation={animation}
            delay={200}
          />
          <SkeletonBase
            width={24}
            height={24}
            borderRadius={12}
            style={{ marginLeft: 16 }}
            animation={animation}
            delay={300}
          />
        </View>
      )}
    </View>
  );
};

// Main export
export const SkeletonLoader = SkeletonBase;

export default SkeletonLoader;