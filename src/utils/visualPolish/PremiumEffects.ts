/**
 * Premium Visual Effects System
 * Advanced glassmorphism, mesh gradients, neumorphism, 3D transforms, and particle effects
 */

import { Animated, Platform, Dimensions } from 'react-native';
import { Canvas, LinearGradient, RadialGradient, SweepGradient, vec, interpolate } from '@shopify/react-native-skia';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface GlassmorphismConfig {
  blur: number;
  opacity: number;
  borderRadius: number;
  borderWidth: number;
  borderOpacity: number;
  layers: number;
  shadowIntensity: number;
  colorOverlay?: string;
}

export interface MeshGradientConfig {
  colors: string[];
  positions?: Array<{ x: number; y: number }>;
  animate: boolean;
  animationDuration: number;
  noiseIntensity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';
}

export interface NeumorphismConfig {
  lightColor: string;
  darkColor: string;
  intensity: number;
  distance: number;
  blur: number;
  pressed: boolean;
}

export interface Transform3DConfig {
  perspective: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  translateZ: number;
  scale: number;
}

export interface ParticleConfig {
  count: number;
  size: { min: number; max: number };
  velocity: { min: number; max: number };
  lifetime: { min: number; max: number };
  colors: string[];
  shapes: ('circle' | 'square' | 'triangle' | 'star')[];
  gravity: number;
  wind: number;
}

// Predefined Effect Configurations
export const EffectPresets = {
  glassmorphism: {
    subtle: {
      blur: 10,
      opacity: 0.1,
      borderRadius: 16,
      borderWidth: 1,
      borderOpacity: 0.2,
      layers: 2,
      shadowIntensity: 0.1,
    } as GlassmorphismConfig,
    
    medium: {
      blur: 20,
      opacity: 0.15,
      borderRadius: 20,
      borderWidth: 1.5,
      borderOpacity: 0.3,
      layers: 3,
      shadowIntensity: 0.2,
    } as GlassmorphismConfig,
    
    intense: {
      blur: 30,
      opacity: 0.25,
      borderRadius: 24,
      borderWidth: 2,
      borderOpacity: 0.4,
      layers: 4,
      shadowIntensity: 0.3,
    } as GlassmorphismConfig,
  },

  meshGradient: {
    flowing: {
      colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
      animate: true,
      animationDuration: 8000,
      noiseIntensity: 0.3,
      blendMode: 'normal',
    } as MeshGradientConfig,
    
    electric: {
      colors: ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
      animate: true,
      animationDuration: 5000,
      noiseIntensity: 0.5,
      blendMode: 'screen',
    } as MeshGradientConfig,
    
    ocean: {
      colors: ['#0077be', '#00b4db', '#0083b0', '#00a8cc'],
      animate: true,
      animationDuration: 12000,
      noiseIntensity: 0.2,
      blendMode: 'overlay',
    } as MeshGradientConfig,
  },

  neumorphism: {
    light: {
      lightColor: '#ffffff',
      darkColor: '#d1d9e6',
      intensity: 0.2,
      distance: 8,
      blur: 16,
      pressed: false,
    } as NeumorphismConfig,
    
    dark: {
      lightColor: '#404040',
      darkColor: '#0a0a0a',
      intensity: 0.3,
      distance: 10,
      blur: 20,
      pressed: false,
    } as NeumorphismConfig,
  },
};

// Glassmorphism Effect System
export class GlassmorphismEffect {
  private animatedValues: Map<string, Animated.Value> = new Map();

  constructor() {
    this.initializeAnimations();
  }

  private initializeAnimations(): void {
    this.animatedValues.set('blur', new Animated.Value(0));
    this.animatedValues.set('opacity', new Animated.Value(0));
    this.animatedValues.set('scale', new Animated.Value(1));
  }

  createGlassStyle(config: GlassmorphismConfig): any {
    const blurValue = this.animatedValues.get('blur');
    const opacityValue = this.animatedValues.get('opacity');
    
    // Create multiple layers for depth
    const layers = [];
    
    for (let i = 0; i < config.layers; i++) {
      const layerOpacity = config.opacity * (1 - i * 0.3);
      const layerBlur = config.blur * (1 + i * 0.5);
      
      layers.push({
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: config.colorOverlay || 'rgba(255, 255, 255, 0.1)',
        borderRadius: config.borderRadius,
        borderWidth: config.borderWidth,
        borderColor: `rgba(255, 255, 255, ${config.borderOpacity})`,
        ...(Platform.OS === 'ios' && {
          backdropFilter: `blur(${layerBlur}px)`,
        }),
        opacity: layerOpacity,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4 + i * 2,
        },
        shadowOpacity: config.shadowIntensity * (1 - i * 0.2),
        shadowRadius: layerBlur * 0.5,
        elevation: 5 + i * 2,
      });
    }

    return layers;
  }

  animateIn(duration: number = 800): Animated.CompositeAnimation {
    return Animated.parallel([
      Animated.timing(this.animatedValues.get('blur')!, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(this.animatedValues.get('opacity')!, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }),
      Animated.spring(this.animatedValues.get('scale')!, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]);
  }

  animateOut(duration: number = 400): Animated.CompositeAnimation {
    return Animated.parallel([
      Animated.timing(this.animatedValues.get('blur')!, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(this.animatedValues.get('opacity')!, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(this.animatedValues.get('scale')!, {
        toValue: 0.9,
        duration,
        useNativeDriver: true,
      }),
    ]);
  }
}

// Mesh Gradient Effect System
export class MeshGradientEffect {
  private animationProgress = new Animated.Value(0);
  private noiseOffset = new Animated.Value(0);

  createMeshGradient(config: MeshGradientConfig): any {
    const positions = config.positions || this.generateRandomPositions(config.colors.length);
    
    if (config.animate) {
      this.startAnimation(config.animationDuration);
    }

    return {
      width: '100%',
      height: '100%',
      position: 'absolute',
    };
  }

  private generateRandomPositions(count: number): Array<{ x: number; y: number }> {
    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: Math.random(),
        y: Math.random(),
      });
    }
    return positions;
  }

  private startAnimation(duration: number): void {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(this.animationProgress, {
          toValue: 1,
          duration,
          useNativeDriver: false,
        }),
        Animated.timing(this.animationProgress, {
          toValue: 0,
          duration,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();
  }

  getAnimatedPositions(positions: Array<{ x: number; y: number }>): any[] {
    return positions.map((pos, index) => {
      const animatedX = this.animationProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [pos.x * screenWidth, (pos.x + 0.2) * screenWidth],
        extrapolate: 'clamp',
      });

      const animatedY = this.animationProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [pos.y * screenHeight, (pos.y - 0.1) * screenHeight],
        extrapolate: 'clamp',
      });

      return { x: animatedX, y: animatedY };
    });
  }
}

// Neumorphism Effect System
export class NeumorphismEffect {
  createNeumorphismStyle(config: NeumorphismConfig): any {
    const { lightColor, darkColor, intensity, distance, blur, pressed } = config;
    
    const lightShadow = {
      shadowColor: lightColor,
      shadowOffset: {
        width: pressed ? distance * 0.5 : -distance,
        height: pressed ? distance * 0.5 : -distance,
      },
      shadowOpacity: intensity,
      shadowRadius: blur,
    };

    const darkShadow = {
      shadowColor: darkColor,
      shadowOffset: {
        width: pressed ? -distance * 0.5 : distance,
        height: pressed ? -distance * 0.5 : distance,
      },
      shadowOpacity: intensity * 0.8,
      shadowRadius: blur * 1.2,
    };

    return [
      {
        ...lightShadow,
        elevation: pressed ? 2 : 8,
      },
      {
        ...darkShadow,
        elevation: pressed ? 1 : 6,
      },
    ];
  }

  createPressAnimation(
    scale: Animated.Value,
    config: NeumorphismConfig
  ): {
    pressIn: () => void;
    pressOut: () => void;
  } {
    const pressIn = () => {
      Animated.spring(scale, {
        toValue: 0.95,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    const pressOut = () => {
      Animated.spring(scale, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      }).start();
    };

    return { pressIn, pressOut };
  }
}

// 3D Transform Effect System
export class Transform3DEffect {
  private animatedValues: Map<string, Animated.Value> = new Map();

  constructor() {
    ['rotateX', 'rotateY', 'rotateZ', 'translateZ', 'scale'].forEach(key => {
      this.animatedValues.set(key, new Animated.Value(0));
    });
  }

  create3DTransform(config: Transform3DConfig): any {
    const rotateX = this.animatedValues.get('rotateX')!.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${config.rotateX}deg`],
    });

    const rotateY = this.animatedValues.get('rotateY')!.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${config.rotateY}deg`],
    });

    const rotateZ = this.animatedValues.get('rotateZ')!.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', `${config.rotateZ}deg`],
    });

    const scale = this.animatedValues.get('scale')!.interpolate({
      inputRange: [0, 1],
      outputRange: [1, config.scale],
    });

    return {
      transform: [
        { perspective: config.perspective },
        { rotateX },
        { rotateY },
        { rotateZ },
        { scale },
      ],
    };
  }

  animateTransform(
    targetConfig: Transform3DConfig,
    duration: number = 1000
  ): Animated.CompositeAnimation {
    const animations = Object.keys(targetConfig)
      .filter(key => key !== 'perspective')
      .map(key => {
        const animatedValue = this.animatedValues.get(key);
        if (animatedValue) {
          return Animated.timing(animatedValue, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          });
        }
        return null;
      })
      .filter(Boolean) as Animated.CompositeAnimation[];

    return Animated.parallel(animations);
  }

  createHoverEffect(
    config: Partial<Transform3DConfig> = {}
  ): {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  } {
    const defaultConfig: Transform3DConfig = {
      perspective: 1000,
      rotateX: -5,
      rotateY: 5,
      rotateZ: 0,
      translateZ: 20,
      scale: 1.05,
      ...config,
    };

    const onMouseEnter = () => {
      this.animateTransform(defaultConfig, 300).start();
    };

    const onMouseLeave = () => {
      this.resetTransform().start();
    };

    return { onMouseEnter, onMouseLeave };
  }

  resetTransform(): Animated.CompositeAnimation {
    const animations = Array.from(this.animatedValues.values()).map(value =>
      Animated.timing(value, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    );

    return Animated.parallel(animations);
  }
}

// Particle Effect System
export class ParticleEffect {
  private particles: any[] = [];
  private animationProgress = new Animated.Value(0);

  createParticleSystem(config: ParticleConfig): any {
    this.generateParticles(config);
    this.startParticleAnimation();

    return {
      particles: this.particles,
      animationProgress: this.animationProgress,
    };
  }

  private generateParticles(config: ParticleConfig): void {
    this.particles = [];
    
    for (let i = 0; i < config.count; i++) {
      const particle = {
        id: i,
        x: new Animated.Value(Math.random() * screenWidth),
        y: new Animated.Value(Math.random() * screenHeight),
        size: Math.random() * (config.size.max - config.size.min) + config.size.min,
        velocity: Math.random() * (config.velocity.max - config.velocity.min) + config.velocity.min,
        lifetime: Math.random() * (config.lifetime.max - config.lifetime.min) + config.lifetime.min,
        color: config.colors[Math.floor(Math.random() * config.colors.length)],
        shape: config.shapes[Math.floor(Math.random() * config.shapes.length)],
        opacity: new Animated.Value(1),
        rotation: new Animated.Value(0),
      };

      this.particles.push(particle);
    }
  }

  private startParticleAnimation(): void {
    const animations = this.particles.map(particle => {
      return Animated.parallel([
        // Movement animation
        Animated.timing(particle.y, {
          toValue: -100,
          duration: particle.lifetime,
          useNativeDriver: false,
        }),
        
        // Fade out animation
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: particle.lifetime,
          useNativeDriver: false,
        }),
        
        // Rotation animation
        Animated.timing(particle.rotation, {
          toValue: 360,
          duration: particle.lifetime * 0.5,
          useNativeDriver: false,
        }),
      ]);
    });

    Animated.stagger(100, animations).start(() => {
      // Restart animation
      this.resetParticles();
      this.startParticleAnimation();
    });
  }

  private resetParticles(): void {
    this.particles.forEach(particle => {
      particle.x.setValue(Math.random() * screenWidth);
      particle.y.setValue(screenHeight + 100);
      particle.opacity.setValue(1);
      particle.rotation.setValue(0);
    });
  }

  stopParticles(): void {
    this.particles.forEach(particle => {
      particle.x.stopAnimation();
      particle.y.stopAnimation();
      particle.opacity.stopAnimation();
      particle.rotation.stopAnimation();
    });
  }
}

// Main Premium Effects Controller
export class PremiumEffectsController {
  private glassmorphism = new GlassmorphismEffect();
  private meshGradient = new MeshGradientEffect();
  private neumorphism = new NeumorphismEffect();
  private transform3D = new Transform3DEffect();
  private particles = new ParticleEffect();

  getGlassmorphism(): GlassmorphismEffect {
    return this.glassmorphism;
  }

  getMeshGradient(): MeshGradientEffect {
    return this.meshGradient;
  }

  getNeumorphism(): NeumorphismEffect {
    return this.neumorphism;
  }

  getTransform3D(): Transform3DEffect {
    return this.transform3D;
  }

  getParticles(): ParticleEffect {
    return this.particles;
  }

  dispose(): void {
    this.particles.stopParticles();
    this.transform3D.resetTransform();
  }
}

export default PremiumEffectsController;