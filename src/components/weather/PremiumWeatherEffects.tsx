import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import {
  Canvas,
  Rect,
  LinearGradient,
  vec,
  Paint,
  Circle,
  Path,
  Skia,
  Group,
  Blur,
  Turbulence,
  useClockValue,
  useLoop,
  RuntimeShader,
  Fill,
  useValue,
  useComputedValue,
  runOnSkia,
  BlendMode,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { EventLogger } from '../../utils/EventLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium glass and rain shader with condensation
const premiumRainShader = Skia.RuntimeEffect.Make(`
uniform float iTime;
uniform vec2 iResolution;
uniform float rainIntensity;
uniform float condensation;
uniform float temperature;
uniform vec2 touchPos;
uniform float wipeRadius;

// Advanced noise for organic patterns
vec3 hash3(vec2 p) {
  vec3 q = vec3(dot(p, vec2(127.1, 311.7)), 
                dot(p, vec2(269.5, 183.3)), 
                dot(p, vec2(419.2, 371.9)));
  return fract(sin(q) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float a = fract(sin(dot(i, vec2(12.9898, 78.233))) * 43758.5453);
  float b = fract(sin(dot(i + vec2(1, 0), vec2(12.9898, 78.233))) * 43758.5453);
  float c = fract(sin(dot(i + vec2(0, 1), vec2(12.9898, 78.233))) * 43758.5453);
  float d = fract(sin(dot(i + vec2(1, 1), vec2(12.9898, 78.233))) * 43758.5453);
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Voronoi for water droplets
float voronoi(vec2 x) {
  vec2 p = floor(x);
  vec2 f = fract(x);
  float res = 8.0;
  
  for(int j = -1; j <= 1; j++) {
    for(int i = -1; i <= 1; i++) {
      vec2 b = vec2(i, j);
      vec2 r = vec2(b) - f + hash3(p + b).xy;
      float d = dot(r, r);
      res = min(res, d);
    }
  }
  return sqrt(res);
}

// Realistic raindrop with physics
vec3 raindrop(vec2 uv, float t, float scale, float speed) {
  uv *= scale;
  vec2 id = floor(uv);
  uv = fract(uv) - 0.5;
  
  vec3 n = hash3(id);
  t += n.z * 6.28;
  t *= speed;
  
  // Gravity simulation
  float y = -sin(t + sin(t * 0.63)) * 0.45;
  y = y * 0.5 + 0.5;
  y = 1.0 - y;
  
  vec2 dropPos = vec2((n.x - 0.5) * 0.4, y - 0.5);
  float drop = 1.0 - smoothstep(0.03, 0.035, length(uv - dropPos));
  
  // Trail effect
  vec2 trailPos = vec2((n.x - 0.5) * 0.4, (y - 0.5) * 0.5 + 0.25);
  float trail = 1.0 - smoothstep(0.01, 0.02, abs(uv.x - trailPos.x));
  trail *= 1.0 - smoothstep(trailPos.y - 0.3, trailPos.y + 0.3, uv.y);
  trail *= smoothstep(0.0, 0.1, y);
  trail *= smoothstep(1.0, 0.8, y);
  
  float droplet = max(drop, trail * 0.5);
  
  // Refraction vector
  vec2 refract = normalize(uv - dropPos) * drop * 0.15;
  
  return vec3(droplet, refract);
}

// Temperature-based condensation
float condensationEffect(vec2 uv, float intensity, float temp) {
  float pattern = 0.0;
  
  // Multi-scale condensation
  for(float i = 1.0; i <= 3.0; i++) {
    vec2 p = uv * (8.0 * i) + vec2(iTime * 0.01 / i);
    float vor = voronoi(p);
    pattern += (1.0 - smoothstep(0.0, 0.15 * i, vor)) / (i * 1.5);
  }
  
  // Temperature modulation
  pattern *= intensity * (1.0 + (0.5 - temp) * 0.5);
  
  // Clear wiped area
  float wipeDist = length(uv - touchPos / iResolution);
  float wipeEffect = smoothstep(wipeRadius / max(iResolution.x, iResolution.y), 0.0, wipeDist);
  pattern *= (1.0 - wipeEffect * 0.9);
  
  // Add breathing effect
  pattern *= 0.8 + sin(iTime * 0.5) * 0.2;
  
  return clamp(pattern, 0.0, 1.0);
}

// Main shader
vec4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / iResolution;
  
  // Multiple rain layers
  vec3 rain1 = raindrop(uv, iTime, 6.0, 0.7);
  vec3 rain2 = raindrop(uv * 1.23 + vec2(0.13, 0.07), iTime * 0.95, 8.0, 0.85);
  vec3 rain3 = raindrop(uv * 0.87 - vec2(0.11, 0.13), iTime * 1.05, 10.0, 0.9);
  vec3 rain4 = raindrop(uv * 1.13 + vec2(0.17, -0.09), iTime * 0.88, 7.0, 0.75);
  
  // Combine layers with depth
  float totalRain = rain1.x * 0.4 + rain2.x * 0.3 + rain3.x * 0.2 + rain4.x * 0.1;
  vec2 totalRefract = rain1.yz * 0.4 + rain2.yz * 0.3 + rain3.yz * 0.2 + rain4.yz * 0.1;
  
  totalRain *= rainIntensity;
  
  // Condensation layer
  float cond = condensationEffect(uv, condensation, temperature);
  
  // Glass surface with fresnel
  vec3 normal = normalize(vec3(totalRefract * 2.0, 1.0));
  float fresnel = pow(1.0 - abs(dot(normal, vec3(0, 0, 1))), 2.5);
  fresnel *= 0.5;
  
  // Color mixing
  vec4 glassColor = vec4(0.92, 0.94, 0.96, 0.1);
  vec4 dropColor = vec4(0.7, 0.8, 0.85, 0.9);
  vec4 condColor = vec4(0.85, 0.88, 0.9, 0.6);
  
  vec4 finalColor = glassColor;
  finalColor = mix(finalColor, dropColor, totalRain * 0.8);
  finalColor = mix(finalColor, condColor, cond * 0.7);
  finalColor.a = min(1.0, totalRain * 0.9 + cond * 0.5 + fresnel);
  
  // Temperature tinting
  if(temperature < 0.5) {
    float coldness = (0.5 - temperature) * 2.0;
    finalColor.rgb = mix(finalColor.rgb, vec3(0.75, 0.85, 1.0), coldness * 0.3);
  } else {
    float warmth = (temperature - 0.5) * 2.0;
    finalColor.rgb = mix(finalColor.rgb, vec3(1.0, 0.92, 0.85), warmth * 0.2);
  }
  
  return finalColor;
}
`)!;

interface PremiumWeatherEffectsProps {
  condition: 'rain' | 'snow' | 'clear' | 'clouds' | 'thunderstorm' | 'drizzle';
  intensity?: number;
  temperature?: number; // 0 (cold) to 1 (hot)
  windSpeed?: number;
  isDay?: boolean;
  onTouch?: (x: number, y: number) => void;
}

interface SnowParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  swayAmount: number;
  rotation: number;
}

interface CloudData {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  speed: number;
  layer: number;
}

export const PremiumWeatherEffects: React.FC<PremiumWeatherEffectsProps> = ({
  condition = 'rain',
  intensity = 0.7,
  temperature = 0.5,
  windSpeed = 10,
  isDay = true,
  onTouch,
}) => {
  const clock = useClockValue();
  const touchPos = useSharedValue({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 });
  const wipeRadius = useSharedValue(0);
  const condensationLevel = useSharedValue(0);
  const [lightningVisible, setLightningVisible] = useState(false);
  const lastTouchTime = useRef(0);

  EventLogger.debug('PremiumWeatherEffects', 'Rendering with:', {
    condition,
    intensity,
    temperature,
    windSpeed,
    isDay,
  });

  // Calculate condensation based on temperature and condition
  useEffect(() => {
    let target = 0;
    if (condition === 'rain' || condition === 'drizzle') {
      target = 0.3 + (1 - temperature) * 0.4;
    } else if (condition === 'snow') {
      target = 0.5 + (1 - temperature) * 0.3;
    } else if (condition === 'clouds') {
      target = 0.1 + (1 - temperature) * 0.2;
    }

    condensationLevel.value = withTiming(target, {
      duration: 3000,
      easing: Easing.inOut(Easing.ease),
    });
  }, [condition, temperature]);

  // Thunder effect for storms
  useEffect(() => {
    if (condition !== 'thunderstorm') return;

    const thunderInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        setLightningVisible(true);
        setTimeout(() => setLightningVisible(false), 100 + Math.random() * 200);
      }
    }, 3000 + Math.random() * 5000);

    return () => clearInterval(thunderInterval);
  }, [condition]);

  // Handle touch for wiping effect
  const handleTouch = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const now = Date.now();

    // Debounce touch events
    if (now - lastTouchTime.current < 50) return;
    lastTouchTime.current = now;

    touchPos.value = { x: locationX, y: locationY };
    
    // Animate wipe radius
    wipeRadius.value = withSequence(
      withSpring(100, { damping: 15, stiffness: 200 }),
      withTiming(80, { duration: 3000, easing: Easing.out(Easing.cubic) })
    );

    // Temporarily reduce condensation
    condensationLevel.value = withSequence(
      withTiming(condensationLevel.value * 0.3, { duration: 200 }),
      withTiming(condensationLevel.value, { duration: 4000 })
    );

    onTouch?.(locationX, locationY);
  };

  // Create shader paint with animated uniforms
  const shaderPaint = useMemo(() => {
    if (!premiumRainShader) return null;
    const paint = Skia.Paint();
    paint.setShader(premiumRainShader.makeShader());
    return paint;
  }, []);

  // Animated uniforms for the shader
  const uniforms = useComputedValue(() => ({
    iTime: clock.current / 1000,
    iResolution: vec(SCREEN_WIDTH, SCREEN_HEIGHT),
    rainIntensity: condition === 'rain' ? intensity : 
                  condition === 'drizzle' ? intensity * 0.5 : 0,
    condensation: condensationLevel.value,
    temperature: temperature,
    touchPos: vec(touchPos.value.x, touchPos.value.y),
    wipeRadius: wipeRadius.value,
  }), [clock, condensationLevel, touchPos, wipeRadius]);

  // Update shader uniforms
  useEffect(() => {
    if (shaderPaint && premiumRainShader) {
      runOnSkia(() => {
        'worklet';
        const shader = premiumRainShader.makeShader(uniforms.value);
        shaderPaint.setShader(shader);
      })();
    }
  }, [uniforms]);

  // Background gradient colors
  const backgroundColors = useMemo(() => {
    if (isDay) {
      switch (condition) {
        case 'clear': return ['#87CEEB', '#3386AC'];
        case 'rain':
        case 'drizzle': return ['#64748b', '#94a3b8'];
        case 'thunderstorm': return ['#334155', '#64748b'];
        case 'snow': return ['#e2e8f0', '#f8fafc'];
        case 'clouds': return ['#94a3b8', '#e2e8f0'];
        default: return ['#87CEEB', '#3386AC'];
      }
    } else {
      switch (condition) {
        case 'clear': return ['#0a0e27', '#1e3c72'];
        case 'rain':
        case 'drizzle': return ['#0f172a', '#334155'];
        case 'thunderstorm': return ['#020617', '#1e293b'];
        case 'snow': return ['#1e293b', '#475569'];
        case 'clouds': return ['#1f2937', '#4b5563'];
        default: return ['#0a0e27', '#1e3c72'];
      }
    }
  }, [condition, isDay]);

  // Generate snow particles
  const snowParticles = useMemo(() => {
    if (condition !== 'snow') return [];
    return Array.from({ length: Math.floor(80 * intensity) }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: 2 + Math.random() * 4,
      speed: 0.5 + Math.random() * 1.5,
      opacity: 0.3 + Math.random() * 0.7,
      swayAmount: 10 + Math.random() * 20,
      rotation: Math.random() * 360,
    }));
  }, [condition, intensity]);

  // Animated snow positions
  const snowPositions = useComputedValue(() => {
    return snowParticles.map(p => ({
      x: p.x + Math.sin(clock.current / 1000 * p.speed + p.id) * p.swayAmount,
      y: ((p.y + clock.current / 1000 * p.speed * 40) % (SCREEN_HEIGHT + 100)) - 50,
      rotation: (p.rotation + clock.current / 1000 * p.speed * 30) % 360,
    }));
  }, [clock, snowParticles]);

  // Generate cloud layers
  const clouds = useMemo(() => {
    if (condition !== 'clouds' && condition !== 'rain') return [];
    return Array.from({ length: Math.floor(6 * intensity) }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH * 1.5 - SCREEN_WIDTH * 0.25,
      y: Math.random() * SCREEN_HEIGHT * 0.5,
      width: 100 + Math.random() * 200,
      height: 40 + Math.random() * 80,
      opacity: 0.2 + Math.random() * 0.3,
      speed: 5 + Math.random() * 10,
      layer: i % 3,
    }));
  }, [condition, intensity]);

  // Animated cloud positions
  const cloudPositions = useComputedValue(() => {
    return clouds.map(c => ({
      x: ((c.x + clock.current / 1000 * c.speed) % (SCREEN_WIDTH * 1.5)) - SCREEN_WIDTH * 0.25,
      y: c.y + Math.sin(clock.current / 1000 * 0.5 + c.id) * 10,
    }));
  }, [clock, clouds]);

  return (
    <TouchableWithoutFeedback onPress={handleTouch}>
      <View style={styles.container}>
        <Canvas style={styles.canvas}>
          {/* Background gradient */}
          <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
            <LinearGradient
              start={vec(0, 0)}
              end={vec(0, SCREEN_HEIGHT)}
              colors={backgroundColors}
            />
          </Rect>

          {/* Cloud layers */}
          {clouds.map((cloud, i) => (
            <Group key={cloud.id} opacity={cloud.opacity}>
              <Rect
                x={cloudPositions.value[i].x}
                y={cloudPositions.value[i].y}
                width={cloud.width}
                height={cloud.height}
              >
                <Paint color="white">
                  <Blur blur={20} />
                </Paint>
              </Rect>
            </Group>
          ))}

          {/* Main rain/condensation effect */}
          {(condition === 'rain' || condition === 'drizzle' || condition === 'snow') && shaderPaint && (
            <Rect
              x={0}
              y={0}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              paint={shaderPaint}
            />
          )}

          {/* Snow particles */}
          {condition === 'snow' && snowParticles.map((particle, i) => (
            <Circle
              key={particle.id}
              cx={snowPositions.value[i].x}
              cy={snowPositions.value[i].y}
              r={particle.size}
              opacity={particle.opacity}
            >
              <Paint color="white">
                <Blur blur={particle.size * 0.3} />
              </Paint>
            </Circle>
          ))}

          {/* Lightning flash */}
          {lightningVisible && (
            <Rect
              x={0}
              y={0}
              width={SCREEN_WIDTH}
              height={SCREEN_HEIGHT}
              opacity={0.8}
            >
              <Paint color="white" blendMode="screen" />
            </Rect>
          )}

          {/* Fog effect */}
          {(condition === 'clouds' || intensity > 0.7) && (
            <Group opacity={0.3}>
              <Rect x={0} y={SCREEN_HEIGHT * 0.7} width={SCREEN_WIDTH} height={SCREEN_HEIGHT * 0.3}>
                <Paint>
                  <Turbulence freqX={0.005} freqY={0.005} octaves={2} />
                  <Blur blur={30} />
                </Paint>
              </Rect>
            </Group>
          )}
        </Canvas>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  canvas: {
    flex: 1,
  },
});

export default PremiumWeatherEffects;