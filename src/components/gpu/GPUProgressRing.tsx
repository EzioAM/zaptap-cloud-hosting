import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface GPUProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  gradientColors?: string[];
  backgroundColor?: string;
  animated?: boolean;
  duration?: number;
  showPulse?: boolean;
}

export const GPUProgressRing: React.FC<GPUProgressRingProps> = ({
  progress,
  size = 100,
  strokeWidth = 8,
  color = '#6366F1',
  gradientColors = ['#6366F1', '#8B5CF6'],
  backgroundColor = 'rgba(99, 102, 241, 0.1)',
  animated = true,
  duration = 1000,
  showPulse = false,
}) => {
  const animatedProgress = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);
  const rotationAnimation = useSharedValue(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Animate progress changes
  useEffect(() => {
    if (animated) {
      animatedProgress.value = withSpring(progress, {
        damping: 15,
        stiffness: 100,
        mass: 1,
      });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated]);
  
  // Pulse animation for visual feedback
  useEffect(() => {
    if (showPulse && progress > 0) {
      pulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    }
  }, [showPulse, progress]);
  
  // Continuous rotation for loading effect
  useEffect(() => {
    if (progress > 0 && progress < 1) {
      rotationAnimation.value = withRepeat(
        withTiming(360, {
          duration: 2000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }
  }, [progress]);
  
  // Calculate stroke dash offset based on progress
  const strokeDashoffset = useDerivedValue(() => {
    const offset = circumference - (animatedProgress.value * circumference);
    return offset;
  });
  
  // Animated props for the progress circle
  const animatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: strokeDashoffset.value,
      strokeWidth: interpolate(
        pulseAnimation.value,
        [1, 1.1],
        [strokeWidth, strokeWidth * 1.2]
      ),
      opacity: interpolate(
        animatedProgress.value,
        [0, 0.01, 1],
        [0, 1, 1]
      ),
    };
  });
  
  // Animated style for container rotation
  const animatedContainerStyle = useAnimatedProps(() => {
    return {
      transform: [
        { rotate: `${rotationAnimation.value}deg` },
        { scale: pulseAnimation.value },
      ],
    };
  });
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={animatedContainerStyle}>
        <Svg width={size} height={size} style={styles.svg}>
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
              <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={backgroundColor}
              strokeWidth={strokeWidth}
              fill="none"
            />
            
            {/* Progress circle */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#gradient)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${circumference} ${circumference}`}
              animatedProps={animatedProps}
              strokeLinecap="round"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    transform: [{ rotateZ: '0deg' }],
  },
});

export default GPUProgressRing;