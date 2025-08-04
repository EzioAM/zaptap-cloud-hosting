import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, G, Circle } from 'react-native-svg';
import { theme } from '../theme';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationComplete }) => {
  const scale = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const boltOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const dotScale = useSharedValue(0);

  useEffect(() => {
    // Sequence of animations
    scale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 100 }),
      withSpring(1, { damping: 12, stiffness: 150 })
    );

    opacity.value = withTiming(1, { duration: 300 });

    boltOpacity.value = withDelay(
      300,
      withTiming(1, { duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1) })
    );

    rotate.value = withDelay(
      300,
      withSequence(
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(0, { duration: 100 })
      )
    );

    glowScale.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1000 }),
          withTiming(0.8, { duration: 1000 })
        ),
        -1,
        true
      )
    );

    dotScale.value = withDelay(
      900,
      withSpring(1, { damping: 8, stiffness: 200 })
    );

    // Complete animation after 2.5 seconds
    const timeout = setTimeout(() => {
      if (onAnimationComplete) {
        runOnJS(onAnimationComplete)();
      }
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  const containerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value },
        { rotate: `${rotate.value}deg` },
      ],
      opacity: opacity.value,
    };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: glowScale.value }],
      opacity: interpolate(glowScale.value, [0.8, 1.2], [0.3, 0.1]),
    };
  });

  const boltStyle = useAnimatedStyle(() => {
    return {
      opacity: boltOpacity.value,
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dotScale.value }],
      opacity: dotScale.value,
    };
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />
      
      <Animated.View style={[styles.iconContainer, containerStyle]}>
        <AnimatedSvg width={200} height={200} viewBox="0 0 1024 1024">
          <Defs>
            <LinearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#6366F1" />
              <Stop offset="50%" stopColor="#8B5CF6" />
              <Stop offset="100%" stopColor="#EC4899" />
            </LinearGradient>
            
            <LinearGradient id="accentGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
              <Stop offset="100%" stopColor="#6366F1" stopOpacity="0.8" />
            </LinearGradient>
          </Defs>
          
          <G transform="translate(512, 512)">
            {/* Animated glow effect */}
            <AnimatedCircle
              r="350"
              fill="url(#mainGradient)"
              style={glowStyle}
            />
            
            {/* Main lightning bolt with animation */}
            <AnimatedPath
              d="M -120 -200 L 40 -40 L -20 -40 L 120 200 L -40 40 L 20 40 Z"
              fill="url(#mainGradient)"
              stroke="#FFFFFF"
              strokeWidth="12"
              strokeLinejoin="round"
              strokeLinecap="round"
              style={boltStyle}
            />
            
            {/* Animated accent dots */}
            <AnimatedCircle cx="-200" cy="-100" r="20" fill="url(#accentGradient)" style={dotStyle} />
            <AnimatedCircle cx="200" cy="-100" r="20" fill="url(#accentGradient)" style={dotStyle} />
            <AnimatedCircle cx="-200" cy="100" r="20" fill="url(#accentGradient)" style={dotStyle} />
            <AnimatedCircle cx="200" cy="100" r="20" fill="url(#accentGradient)" style={dotStyle} />
          </G>
        </AnimatedSvg>
      </Animated.View>
      
      {/* Loading dots animation */}
      <View style={styles.loadingContainer}>
        {[0, 1, 2].map((index) => {
          const dotOpacity = useSharedValue(0);
          
          useEffect(() => {
            dotOpacity.value = withDelay(
              1200 + index * 200,
              withRepeat(
                withSequence(
                  withTiming(1, { duration: 400 }),
                  withTiming(0.3, { duration: 400 })
                ),
                -1,
                true
              )
            );
          }, []);
          
          const animatedDotStyle = useAnimatedStyle(() => ({
            opacity: dotOpacity.value,
          }));
          
          return (
            <Animated.View
              key={index}
              style={[styles.loadingDot, animatedDotStyle]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    flexDirection: 'row',
    gap: 10,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
});