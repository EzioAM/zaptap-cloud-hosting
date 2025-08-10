import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Animated, 
  Dimensions, 
  ViewStyle,
  Easing 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { WeatherCondition } from '../../services/weather/WeatherService';

interface WeatherEffectsProps {
  condition: WeatherCondition;
  isDay: boolean;
  intensity?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const WeatherEffects: React.FC<WeatherEffectsProps> = ({
  condition,
  isDay,
  intensity = 0.5,
  style,
  children
}) => {
  const [raindrops, setRaindrops] = useState<Array<{ key: string; animation: Animated.Value; x: number; delay: number }>>([]);
  const [snowflakes, setSnowflakes] = useState<Array<{ key: string; animation: Animated.Value; x: number; size: number }>>([]);
  const [stars, setStars] = useState<Array<{ key: string; x: number; y: number; size: number; animation: Animated.Value }>>([]);
  const [lightningAnimation] = useState(new Animated.Value(0));
  const cloudAnimation = useRef(new Animated.Value(0)).current;
  const mistAnimation = useRef(new Animated.Value(0.3)).current;
  
  console.log('[WeatherEffects] Rendering with:', { condition, isDay, intensity });

  // Initialize rain drops
  useEffect(() => {
    if (condition === 'rain' || condition === 'drizzle' || condition === 'thunderstorm') {
      const dropCount = condition === 'drizzle' ? 20 : condition === 'thunderstorm' ? 60 : 40;
      const drops = Array.from({ length: dropCount }, (_, i) => ({
        key: `drop-${i}`,
        animation: new Animated.Value(-50),
        x: Math.random() * SCREEN_WIDTH,
        delay: Math.random() * 2000
      }));
      console.log('[WeatherEffects] Creating', dropCount, 'raindrops for', condition);
      setRaindrops(drops);
    } else {
      setRaindrops([]);
    }
  }, [condition]);

  // Initialize snowflakes
  useEffect(() => {
    if (condition === 'snow') {
      const flakeCount = 30;
      const flakes = Array.from({ length: flakeCount }, (_, i) => ({
        key: `flake-${i}`,
        animation: new Animated.Value(-50),
        x: Math.random() * SCREEN_WIDTH,
        size: 5 + Math.random() * 10
      }));
      setSnowflakes(flakes);
    } else {
      setSnowflakes([]);
    }
  }, [condition]);

  // Initialize stars for clear night
  useEffect(() => {
    if (condition === 'clear' && !isDay) {
      const starCount = 50;
      const starsArray = Array.from({ length: starCount }, (_, i) => ({
        key: `star-${i}`,
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * (SCREEN_HEIGHT * 0.6), // Stars in upper 60% of screen
        size: Math.random() * 3 + 1,
        animation: new Animated.Value(Math.random())
      }));
      setStars(starsArray);
      console.log('[WeatherEffects] Creating', starCount, 'stars for clear night');
    } else {
      setStars([]);
    }
  }, [condition, isDay]);

  // Animate raindrops with smooth easing
  useEffect(() => {
    raindrops.forEach((drop) => {
      const animateRain = () => {
        drop.animation.setValue(-50);
        Animated.timing(drop.animation, {
          toValue: SCREEN_HEIGHT + 100,
          duration: condition === 'drizzle' ? 3000 : 1500,
          delay: drop.delay,
          easing: Easing.linear,
          useNativeDriver: true
        }).start(() => {
          drop.delay = Math.random() * 200; // Reduced delay for more continuous effect
          animateRain();
        });
      };
      animateRain();
    });
  }, [raindrops, condition]);

  // Animate snowflakes
  useEffect(() => {
    snowflakes.forEach((flake) => {
      const animateSnow = () => {
        flake.animation.setValue(-50);
        Animated.timing(flake.animation, {
          toValue: SCREEN_HEIGHT + 100,
          duration: 5000 + Math.random() * 3000,
          useNativeDriver: true
        }).start(() => animateSnow());
      };
      animateSnow();
    });
  }, [snowflakes]);

  // Lightning effect for thunderstorms
  useEffect(() => {
    if (condition === 'thunderstorm') {
      const animateLightning = () => {
        Animated.sequence([
          // First flash - bright
          Animated.timing(lightningAnimation, {
            toValue: 0.8,
            duration: 50,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true
          }),
          Animated.timing(lightningAnimation, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true
          }),
          // Second flash - brighter
          Animated.timing(lightningAnimation, {
            toValue: 1,
            duration: 100,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true
          }),
          Animated.timing(lightningAnimation, {
            toValue: 0,
            duration: 200,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true
          }),
          // Afterglow
          Animated.timing(lightningAnimation, {
            toValue: 0.2,
            duration: 100,
            useNativeDriver: true
          }),
          Animated.timing(lightningAnimation, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ]).start(() => {
          setTimeout(animateLightning, 2000 + Math.random() * 4000);
        });
      };
      animateLightning();
    }
  }, [condition, lightningAnimation]);

  // Cloud movement animation
  useEffect(() => {
    if (condition === 'clouds' || condition === 'rain' || condition === 'thunderstorm') {
      Animated.loop(
        Animated.timing(cloudAnimation, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true
        })
      ).start();
    }
  }, [condition, cloudAnimation]);

  // Mist pulsing animation
  useEffect(() => {
    if (condition === 'mist' || condition === 'fog') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(mistAnimation, {
            toValue: 0.6,
            duration: 3000,
            useNativeDriver: true
          }),
          Animated.timing(mistAnimation, {
            toValue: 0.3,
            duration: 3000,
            useNativeDriver: true
          })
        ])
      ).start();
    }
  }, [condition, mistAnimation]);

  // Animate stars twinkling
  useEffect(() => {
    stars.forEach((star) => {
      const animateTwinkle = () => {
        Animated.sequence([
          Animated.timing(star.animation, {
            toValue: 1,
            duration: 1000 + Math.random() * 2000,
            useNativeDriver: true
          }),
          Animated.timing(star.animation, {
            toValue: 0.3,
            duration: 1000 + Math.random() * 2000,
            useNativeDriver: true
          })
        ]).start(() => animateTwinkle());
      };
      animateTwinkle();
    });
  }, [stars]);

  // Get background gradient based on weather and time
  const getBackgroundGradient = (): string[] => {
    if (!isDay) {
      // Night gradients
      switch (condition) {
        case 'clear':
          return ['#0c1445', '#1e3c72', '#2a5298'];
        case 'clouds':
          return ['#2c3e50', '#34495e', '#576574'];
        case 'rain':
        case 'drizzle':
          return ['#1e2a3a', '#2c3e50', '#34495e'];
        case 'thunderstorm':
          return ['#0f0f1e', '#1a1a2e', '#2d2d44'];
        case 'snow':
          return ['#2c3e50', '#34495e', '#4a5f7a'];
        case 'mist':
        case 'fog':
          return ['#2c3e50', '#445566', '#556677'];
        default:
          return ['#1e3c72', '#2a5298', '#3d6cb9'];
      }
    } else {
      // Day gradients
      switch (condition) {
        case 'clear':
          return ['#56CCF2', '#2F80ED', '#4A90E2'];
        case 'clouds':
          return ['#bdc3c7', '#95a5a6', '#7f8c8d'];
        case 'rain':
        case 'drizzle':
          return ['#616161', '#757575', '#9e9e9e'];
        case 'thunderstorm':
          return ['#373B44', '#4a4e5a', '#5c6170'];
        case 'snow':
          return ['#e0e0e0', '#bdbdbd', '#9e9e9e'];
        case 'mist':
        case 'fog':
          return ['#b8bfc6', '#9ea7b0', '#848f9a'];
        default:
          return ['#56CCF2', '#2F80ED', '#4A90E2'];
      }
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Background gradient */}
      <LinearGradient
        colors={getBackgroundGradient()}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Lightning flash */}
      {condition === 'thunderstorm' && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'white',
              opacity: lightningAnimation
            }
          ]}
          pointerEvents="none"
        />
      )}

      {/* Stars for clear night */}
      {condition === 'clear' && !isDay && stars.map((star) => (
        <Animated.View
          key={star.key}
          style={[
            styles.star,
            {
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              opacity: star.animation
            }
          ]}
          pointerEvents="none"
        />
      ))}

      {/* Clouds */}
      {(condition === 'clouds' || condition === 'rain' || condition === 'thunderstorm') && (
        <Animated.View
          style={[
            styles.cloudContainer,
            {
              transform: [
                {
                  translateX: cloudAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 100]
                  })
                }
              ]
            }
          ]}
          pointerEvents="none"
        >
          <View style={[styles.cloud, styles.cloud1]} />
          <View style={[styles.cloud, styles.cloud2]} />
          <View style={[styles.cloud, styles.cloud3]} />
        </Animated.View>
      )}

      {/* Rain drops */}
      {raindrops.map((drop) => (
        <Animated.View
          key={drop.key}
          style={[
            styles.raindrop,
            {
              left: drop.x,
              transform: [{ translateY: drop.animation }],
              opacity: condition === 'drizzle' ? 0.3 : 0.6
            }
          ]}
          pointerEvents="none"
        />
      ))}

      {/* Snowflakes */}
      {snowflakes.map((flake) => (
        <Animated.View
          key={flake.key}
          style={[
            styles.snowflake,
            {
              left: flake.x,
              width: flake.size,
              height: flake.size,
              borderRadius: flake.size / 2,
              transform: [{ translateY: flake.animation }]
            }
          ]}
          pointerEvents="none"
        />
      ))}

      {/* Mist/Fog effect */}
      {(condition === 'mist' || condition === 'fog') && (
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: mistAnimation }
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)', 'rgba(255,255,255,0.3)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      )}

      {/* Glass effect overlay */}
      {(condition === 'rain' || condition === 'drizzle') && (
        <BlurView
          intensity={condition === 'rain' ? 10 : 5}
          style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]}
          tint={isDay ? 'light' : 'dark'}
        />
      )}

      {/* Content */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative'
  },
  cloudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 100
  },
  cloud1: {
    width: 100,
    height: 40,
    top: 20,
    left: '10%'
  },
  cloud2: {
    width: 120,
    height: 45,
    top: 50,
    left: '40%'
  },
  cloud3: {
    width: 80,
    height: 35,
    top: 30,
    left: '70%'
  },
  raindrop: {
    position: 'absolute',
    width: 3,
    height: 20,
    backgroundColor: 'rgba(200, 220, 255, 0.7)',
    borderRadius: 10,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
  },
  snowflake: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.8)'
  },
  star: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 50,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  }
});

export default WeatherEffects;