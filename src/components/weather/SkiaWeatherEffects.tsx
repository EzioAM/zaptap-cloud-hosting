import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import {
  Canvas,
  Group,
  Circle,
  LinearGradient as SkiaLinearGradient,
  vec,
  Path,
  Skia,
  Blur,
  DisplacementMap,
  Turbulence,
  Fill,
  Shader,
  RuntimeShader,
  Mix,
  BackdropFilter,
  RoundedRect,
  Paint,
  useTiming,
  useValue,
  useSharedValueEffect,
  useLoop,
  useDerivedValue,
  interpolate,
  Extrapolate,
} from '@shopify/react-native-skia';
import { WeatherCondition } from '../../services/weather/WeatherService';

interface SkiaWeatherEffectsProps {
  condition: WeatherCondition;
  isDay: boolean;
  intensity?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// High-quality cloud shader for realistic rendering
const cloudShader = Skia.RuntimeEffect.Make(`
  uniform vec2 resolution;
  uniform float time;
  uniform float coverage;
  uniform float lightness;
  
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 2.0;
    
    for (int i = 0; i < 6; i++) {
      value += amplitude * smoothNoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return value;
  }
  
  vec4 main(vec2 coord) {
    vec2 uv = coord / resolution;
    
    // Create flowing cloud movement
    vec2 cloudPos = uv + vec2(time * 0.02, time * 0.01);
    
    // Generate cloud density using fractal brownian motion
    float cloud = fbm(cloudPos * 3.0 + vec2(time * 0.05, 0.0));
    cloud += fbm(cloudPos * 6.0 - vec2(time * 0.03, time * 0.02)) * 0.5;
    cloud += fbm(cloudPos * 12.0 + vec2(time * 0.07, time * 0.04)) * 0.25;
    
    // Shape the clouds
    cloud = smoothstep(1.0 - coverage, 1.0, cloud);
    cloud *= smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.7, uv.y);
    
    // Cloud color with subtle variations
    vec3 cloudColor = mix(
      vec3(0.95, 0.95, 0.98),
      vec3(1.0, 1.0, 1.0),
      cloud * lightness
    );
    
    // Add subtle blue tint for atmosphere
    cloudColor = mix(cloudColor, vec3(0.85, 0.9, 0.95), 0.1);
    
    return vec4(cloudColor, cloud * 0.9);
  }
`)!;

// Rain shader for realistic droplets
const rainShader = Skia.RuntimeEffect.Make(`
  uniform vec2 resolution;
  uniform float time;
  uniform float intensity;
  
  float rain(vec2 uv, float scale, float speed) {
    float t = time * speed;
    uv.y += t;
    uv *= scale;
    
    vec2 id = floor(uv);
    uv = fract(uv) - 0.5;
    
    float n = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453);
    
    // Create raindrop shape
    float drop = smoothstep(0.05, 0.03, length(vec2(uv.x, uv.y)));
    drop *= smoothstep(-0.5, 0.5, uv.y);
    drop *= step(0.5, fract(t + n));
    
    // Add streak effect
    float streak = smoothstep(0.0, 0.02, abs(uv.x));
    streak *= smoothstep(0.5, -0.5, uv.y);
    streak *= smoothstep(0.5, 0.6, fract(t + n * 0.7));
    
    return drop + streak * 0.5;
  }
  
  vec4 main(vec2 coord) {
    vec2 uv = coord / resolution;
    
    float rainEffect = 0.0;
    
    // Multiple layers for depth
    rainEffect += rain(uv, 20.0, 0.5) * 0.8;
    rainEffect += rain(uv * vec2(1.2, 1.0) + vec2(0.5, 0.0), 25.0, 0.7) * 0.6;
    rainEffect += rain(uv * vec2(0.9, 1.0) - vec2(0.3, 0.0), 30.0, 0.9) * 0.4;
    rainEffect += rain(uv * vec2(1.1, 1.0) + vec2(0.7, 0.0), 35.0, 1.1) * 0.3;
    
    rainEffect *= intensity;
    
    vec3 rainColor = vec3(0.8, 0.85, 0.95);
    return vec4(rainColor, rainEffect * 0.6);
  }
`)!;

export const SkiaWeatherEffects: React.FC<SkiaWeatherEffectsProps> = ({
  condition,
  isDay,
  intensity = 0.5,
}) => {
  // Animation values
  const time = useLoop({ duration: 30000 });
  const cloudMovement = useLoop({ duration: 20000 });
  const rainTime = useLoop({ duration: 5000 });
  
  // Derived values for smooth animations
  const cloudX = useDerivedValue(() => 
    interpolate(
      cloudMovement.current,
      [0, 1],
      [-SCREEN_WIDTH * 0.2, SCREEN_WIDTH * 0.2],
      Extrapolate.CLAMP
    )
  );
  
  // Background gradient colors based on weather and time
  const getGradientColors = () => {
    if (!isDay) {
      switch (condition) {
        case 'clear':
          return ['#0a0e27', '#1a2a5e', '#2d4a7c'];
        case 'clouds':
          return ['#1f2937', '#374151', '#4b5563'];
        case 'rain':
        case 'drizzle':
          return ['#0f172a', '#1e293b', '#334155'];
        case 'thunderstorm':
          return ['#020617', '#0f172a', '#1e293b'];
        case 'snow':
          return ['#1e293b', '#334155', '#475569'];
        default:
          return ['#1a2a5e', '#2d4a7c', '#3d5a8b'];
      }
    } else {
      switch (condition) {
        case 'clear':
          return ['#87CEEB', '#6BB6D6', '#4F9EC1'];
        case 'clouds':
          return ['#94a3b8', '#cbd5e1', '#e2e8f0'];
        case 'rain':
        case 'drizzle':
          return ['#64748b', '#94a3b8', '#cbd5e1'];
        case 'thunderstorm':
          return ['#334155', '#475569', '#64748b'];
        case 'snow':
          return ['#e2e8f0', '#f1f5f9', '#f8fafc'];
        default:
          return ['#87CEEB', '#6BB6D6', '#4F9EC1'];
      }
    }
  };
  
  const gradientColors = getGradientColors();
  
  // Cloud parameters based on weather
  const cloudParams = useMemo(() => {
    switch (condition) {
      case 'clouds':
        return { coverage: 0.7, lightness: isDay ? 0.9 : 0.3, opacity: 0.8 };
      case 'rain':
      case 'drizzle':
        return { coverage: 0.85, lightness: isDay ? 0.6 : 0.2, opacity: 0.9 };
      case 'thunderstorm':
        return { coverage: 0.95, lightness: isDay ? 0.4 : 0.1, opacity: 0.95 };
      default:
        return { coverage: 0.3, lightness: isDay ? 0.95 : 0.4, opacity: 0.4 };
    }
  }, [condition, isDay]);
  
  // Create cloud shader paint
  const cloudPaint = useMemo(() => {
    const paint = Skia.Paint();
    paint.setShader(
      cloudShader.makeShader({
        resolution: vec(SCREEN_WIDTH, SCREEN_HEIGHT),
        time: 0,
        coverage: cloudParams.coverage,
        lightness: cloudParams.lightness,
      })
    );
    return paint;
  }, [cloudParams]);
  
  // Update shader uniforms
  useSharedValueEffect(() => {
    cloudPaint.setShader(
      cloudShader.makeShader({
        resolution: vec(SCREEN_WIDTH, SCREEN_HEIGHT),
        time: time.current * 10,
        coverage: cloudParams.coverage,
        lightness: cloudParams.lightness,
      })
    );
  }, time);
  
  // Create rain shader paint
  const rainPaint = useMemo(() => {
    if (condition !== 'rain' && condition !== 'drizzle' && condition !== 'thunderstorm') {
      return null;
    }
    const paint = Skia.Paint();
    paint.setShader(
      rainShader.makeShader({
        resolution: vec(SCREEN_WIDTH, SCREEN_HEIGHT),
        time: 0,
        intensity: intensity,
      })
    );
    return paint;
  }, [condition, intensity]);
  
  // Update rain shader uniforms
  useSharedValueEffect(() => {
    if (rainPaint) {
      rainPaint.setShader(
        rainShader.makeShader({
          resolution: vec(SCREEN_WIDTH, SCREEN_HEIGHT),
          time: rainTime.current * 5,
          intensity: intensity,
        })
      );
    }
  }, rainTime);
  
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <Canvas style={StyleSheet.absoluteFillObject}>
        {/* Background gradient */}
        <Fill>
          <SkiaLinearGradient
            start={vec(0, 0)}
            end={vec(0, SCREEN_HEIGHT)}
            colors={gradientColors}
          />
        </Fill>
        
        {/* Advanced cloud layer with GPU shaders */}
        {(condition === 'clouds' || condition === 'rain' || condition === 'thunderstorm') && (
          <Group>
            {/* Cloud turbulence for realistic effect */}
            <Group transform={[{ translateX: cloudX }]}>
              <RoundedRect
                x={0}
                y={0}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT * 0.4}
                r={0}
              >
                <Paint paint={cloudPaint} />
              </RoundedRect>
              
              {/* Add displacement for more realistic clouds */}
              <BackdropFilter filter={
                <DisplacementMap channelX="a" channelY="a" scale={10}>
                  <Turbulence freqX={0.01} freqY={0.01} octaves={2} />
                </DisplacementMap>
              }>
                <Fill />
              </BackdropFilter>
            </Group>
            
            {/* Atmospheric blur for depth */}
            <BackdropFilter filter={<Blur blur={2} />}>
              <Fill color="rgba(255,255,255,0.05)" />
            </BackdropFilter>
          </Group>
        )}
        
        {/* Rain effect layer */}
        {rainPaint && (
          <RoundedRect
            x={0}
            y={0}
            width={SCREEN_WIDTH}
            height={SCREEN_HEIGHT}
            r={0}
          >
            <Paint paint={rainPaint} />
          </RoundedRect>
        )}
        
        {/* Snow particles for snow condition */}
        {condition === 'snow' && (
          <Group>
            {Array.from({ length: 60 }).map((_, i) => {
              const snowX = useLoop({ duration: 10000 + i * 200 });
              const snowY = useLoop({ duration: 8000 + i * 300 });
              
              const x = useDerivedValue(() => 
                interpolate(
                  snowX.current,
                  [0, 1],
                  [Math.random() * SCREEN_WIDTH - 50, Math.random() * SCREEN_WIDTH + 50],
                  Extrapolate.CLAMP
                )
              );
              
              const y = useDerivedValue(() => 
                interpolate(
                  snowY.current,
                  [0, 1],
                  [-20, SCREEN_HEIGHT + 20],
                  Extrapolate.CLAMP
                )
              );
              
              return (
                <Circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={1 + Math.random() * 3}
                  color="rgba(255,255,255,0.8)"
                >
                  <Blur blur={0.5} />
                </Circle>
              );
            })}
          </Group>
        )}
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default SkiaWeatherEffects;