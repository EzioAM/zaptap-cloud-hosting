import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CloudLayerProps {
  condition: string;
  isDay: boolean;
  intensity?: number;
}

interface CloudData {
  id: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  speed: number;
  layer: number;
  colors: string[];
  width: number;
  height: number;
  skewX: number;
  morphSpeed: number;
}

const CloudShape: React.FC<{
  cloud: CloudData;
  isDay: boolean;
  index: number;
}> = ({ cloud, isDay, index }) => {
  const translateX = useSharedValue(cloud.x);
  const translateY = useSharedValue(cloud.y);
  const scale = useSharedValue(cloud.scale);
  const opacity = useSharedValue(0);
  const skewX = useSharedValue(cloud.skewX);
  const morphScale = useSharedValue(1);

  useEffect(() => {
    // Fade in animation
    opacity.value = withDelay(
      index * 100,
      withTiming(cloud.opacity, { duration: 2000 })
    );

    // Horizontal drift animation
    translateX.value = withRepeat(
      withSequence(
        withTiming(cloud.x + 100, {
          duration: cloud.speed,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(cloud.x - 100, {
          duration: cloud.speed,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      true
    );

    // Vertical float animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(cloud.y - 20, {
          duration: cloud.speed * 0.8,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(cloud.y + 20, {
          duration: cloud.speed * 0.8,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      true
    );

    // Morphing animation for organic movement
    morphScale.value = withRepeat(
      withSequence(
        withTiming(1.1, {
          duration: cloud.morphSpeed,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.95, {
          duration: cloud.morphSpeed,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      true
    );

    // Skew animation for wind effect
    skewX.value = withRepeat(
      withSequence(
        withTiming(cloud.skewX + 5, {
          duration: cloud.speed * 1.2,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(cloud.skewX - 5, {
          duration: cloud.speed * 1.2,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value * morphScale.value },
      { skewX: `${skewX.value}deg` },
    ],
    opacity: opacity.value,
  }));

  // Dynamic colors based on day/night and layer depth
  const cloudColors = useMemo(() => {
    if (isDay) {
      return cloud.layer === 0
        ? ['rgba(255,255,255,0.7)', 'rgba(250,250,255,0.5)', 'rgba(245,245,255,0.3)']
        : cloud.layer === 1
        ? ['rgba(255,255,255,0.8)', 'rgba(252,252,255,0.6)', 'rgba(248,248,255,0.4)']
        : ['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)', 'rgba(250,250,255,0.5)'];
    } else {
      return cloud.layer === 0
        ? ['rgba(150,150,180,0.6)', 'rgba(140,140,170,0.4)', 'rgba(130,130,160,0.2)']
        : cloud.layer === 1
        ? ['rgba(160,160,190,0.7)', 'rgba(150,150,180,0.5)', 'rgba(140,140,170,0.3)']
        : ['rgba(170,170,200,0.8)', 'rgba(160,160,190,0.6)', 'rgba(150,150,180,0.4)'];
    }
  }, [isDay, cloud.layer]);

  return (
    <Animated.View
      style={[
        styles.cloudShape,
        animatedStyle,
        {
          width: cloud.width,
          height: cloud.height,
          zIndex: cloud.layer,
        },
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={cloudColors}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.5, 1]}
      >
        {/* Inner glow for depth */}
        <View style={styles.innerGlow}>
          <LinearGradient
            colors={[
              'rgba(255,255,255,0.3)',
              'rgba(255,255,255,0.1)',
              'transparent',
            ]}
            style={styles.glowGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>
      </LinearGradient>
      
      {/* Soft blur for realistic appearance */}
      <BlurView
        intensity={cloud.layer === 0 ? 10 : cloud.layer === 1 ? 5 : 2}
        style={StyleSheet.absoluteFillObject}
        tint={isDay ? 'light' : 'dark'}
      />
    </Animated.View>
  );
};

export const CloudLayer: React.FC<CloudLayerProps> = ({
  condition,
  isDay,
  intensity = 0.5,
}) => {
  // Generate cloud data based on intensity
  const clouds = useMemo(() => {
    const cloudCount = Math.floor(8 + intensity * 12); // 8-20 clouds
    const cloudData: CloudData[] = [];

    for (let i = 0; i < cloudCount; i++) {
      const layer = i % 3; // Distribute across 3 layers
      cloudData.push({
        id: `cloud-${i}`,
        x: Math.random() * SCREEN_WIDTH - 100,
        y: Math.random() * (SCREEN_HEIGHT * 0.4) - 50,
        scale: 0.6 + Math.random() * 0.8,
        opacity: 0.3 + (layer * 0.2) + Math.random() * 0.3,
        speed: 20000 + Math.random() * 20000, // 20-40 seconds
        layer,
        colors: [], // Will be set by component
        width: 150 + Math.random() * 200,
        height: 80 + Math.random() * 100,
        skewX: -10 + Math.random() * 20,
        morphSpeed: 8000 + Math.random() * 8000, // 8-16 seconds
      });
    }

    return cloudData.sort((a, b) => a.layer - b.layer); // Sort by layer for proper z-indexing
  }, [intensity]);

  // Add atmospheric mist layer for heavy clouds
  const mistOpacity = useSharedValue(0);
  
  useEffect(() => {
    if (condition === 'clouds' && intensity > 0.6) {
      mistOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 4000 }),
          withTiming(0.1, { duration: 4000 })
        ),
        -1,
        true
      );
    }
  }, [condition, intensity]);

  const mistStyle = useAnimatedStyle(() => ({
    opacity: mistOpacity.value,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Background mist for atmosphere */}
      {condition === 'clouds' && intensity > 0.6 && (
        <Animated.View style={[styles.mistLayer, mistStyle]}>
          <LinearGradient
            colors={
              isDay
                ? ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)', 'transparent']
                : ['rgba(100,100,120,0.4)', 'rgba(100,100,120,0.2)', 'transparent']
            }
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </Animated.View>
      )}

      {/* Render cloud shapes */}
      {clouds.map((cloud, index) => (
        <CloudShape
          key={cloud.id}
          cloud={cloud}
          isDay={isDay}
          index={index}
        />
      ))}

      {/* Volumetric lighting effect */}
      {isDay && (
        <View style={styles.volumetricLight} pointerEvents="none">
          <LinearGradient
            colors={[
              'rgba(255,255,200,0.1)',
              'rgba(255,255,200,0.05)',
              'transparent',
            ]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  cloudShape: {
    position: 'absolute',
    borderRadius: 100,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    borderRadius: 100,
  },
  innerGlow: {
    position: 'absolute',
    top: '10%',
    left: '20%',
    right: '20%',
    bottom: '40%',
  },
  glowGradient: {
    flex: 1,
    borderRadius: 50,
  },
  mistLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  volumetricLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.6,
    zIndex: 20,
  },
});