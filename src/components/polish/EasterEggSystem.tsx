/**
 * Easter Egg System
 * Delightful surprises and hidden interactions throughout the app
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  TouchableWithoutFeedback,
  Vibration,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimationSystem, SpringPresets } from '../../utils/visualPolish/AnimationSystem';
import { DynamicThemeSystem } from '../../utils/visualPolish/DynamicThemeSystem';
import { EventLogger } from '../../utils/EventLogger';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface EasterEggProps {
  trigger?: 'tap' | 'longPress' | 'shake' | 'konami' | 'time' | 'sequence';
  sequence?: string[]; // For sequence-based triggers
  requiredTaps?: number; // For tap triggers
  children?: React.ReactNode;
  onActivate?: () => void;
  disabled?: boolean;
}

// Konami Code sequence
const KONAMI_CODE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA'
];

// Easter Egg State Manager
class EasterEggManager {
  private static instance: EasterEggManager;
  private activeEggs: Map<string, boolean> = new Map();
  private sequences: Map<string, string[]> = new Map();
  private currentSequence: string[] = [];
  private tapCounts: Map<string, number> = new Map();

  public static getInstance(): EasterEggManager {
    if (!EasterEggManager.instance) {
      EasterEggManager.instance = new EasterEggManager();
    }
    return EasterEggManager.instance;
  }

  registerEasterEgg(id: string, trigger: EasterEggProps['trigger'], config?: any): void {
    this.activeEggs.set(id, false);
    
    if (trigger === 'sequence' && config?.sequence) {
      this.sequences.set(id, config.sequence);
    }
  }

  checkSequence(input: string): string[] {
    this.currentSequence.push(input);
    
    // Keep only last 10 inputs
    if (this.currentSequence.length > 10) {
      this.currentSequence.shift();
    }

    const triggeredEggs: string[] = [];
    
    this.sequences.forEach((sequence, eggId) => {
      if (this.isSequenceMatch(sequence)) {
        triggeredEggs.push(eggId);
        this.activateEasterEgg(eggId);
      }
    });

    return triggeredEggs;
  }

  private isSequenceMatch(targetSequence: string[]): boolean {
    if (this.currentSequence.length < targetSequence.length) {
      return false;
    }

    const lastInputs = this.currentSequence.slice(-targetSequence.length);
    return lastInputs.every((input, index) => input === targetSequence[index]);
  }

  incrementTapCount(id: string): number {
    const current = this.tapCounts.get(id) || 0;
    const newCount = current + 1;
    this.tapCounts.set(id, newCount);
    return newCount;
  }

  resetTapCount(id: string): void {
    this.tapCounts.set(id, 0);
  }

  activateEasterEgg(id: string): void {
    this.activeEggs.set(id, true);
    EventLogger.debug('EasterEggSystem', '🥚 Easter egg activated: ${id}');
  }

  isEasterEggActive(id: string): boolean {
    return this.activeEggs.get(id) || false;
  }

  deactivateEasterEgg(id: string): void {
    this.activeEggs.set(id, false);
  }

  reset(): void {
    this.activeEggs.clear();
    this.sequences.clear();
    this.currentSequence = [];
    this.tapCounts.clear();
  }
}

// Main Easter Egg Component
export const EasterEgg: React.FC<EasterEggProps> = ({
  trigger = 'tap',
  sequence = [],
  requiredTaps = 7,
  children,
  onActivate,
  disabled = false,
}) => {
  const [isActive, setIsActive] = useState(false);
  const manager = EasterEggManager.getInstance();
  const eggId = useRef(Math.random().toString(36).substr(2, 9)).current;

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!disabled) {
      manager.registerEasterEgg(eggId, trigger, { sequence, requiredTaps });
    }
  }, [disabled, trigger]);

  useEffect(() => {
    if (isActive) {
      startActivationAnimation();
      onActivate?.();
    }
  }, [isActive]);

  const startActivationAnimation = () => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Vibration.vibrate([100, 50, 100, 50, 200]);
    }

    // Visual animation
    Animated.parallel([
      AnimationSystem.createSequence([
        AnimationSystem.createSpring(pulseAnim, 1.3, SpringPresets.bouncy),
        AnimationSystem.createSpring(pulseAnim, 1, SpringPresets.gentle),
      ]),
      AnimationSystem.createTiming(rotateAnim, 1, {
        duration: 1000,
      }),
      AnimationSystem.createSequence([
        AnimationSystem.createTiming(glowAnim, 1, { duration: 300 }),
        AnimationSystem.createTiming(glowAnim, 0, { duration: 2000 }),
      ]),
    ]).start(() => {
      // Reset after animation
      setTimeout(() => {
        setIsActive(false);
        pulseAnim.setValue(1);
        rotateAnim.setValue(0);
        glowAnim.setValue(0);
        manager.deactivateEasterEgg(eggId);
      }, 1000);
    });
  };

  const handlePress = () => {
    if (disabled) return;

    if (trigger === 'tap') {
      const tapCount = manager.incrementTapCount(eggId);
      if (tapCount >= requiredTaps) {
        setIsActive(true);
        manager.resetTapCount(eggId);
      }

      // Reset tap count after 2 seconds of inactivity
      setTimeout(() => {
        if (!isActive) {
          manager.resetTapCount(eggId);
        }
      }, 2000);
    }
  };

  const handleLongPress = () => {
    if (disabled) return;

    if (trigger === 'longPress') {
      setIsActive(true);
    }
  };

  return (
    <TouchableWithoutFeedback
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={1000}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { scale: pulseAnim },
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      >
        {isActive && (
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowAnim,
              },
            ]}
          />
        )}
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

// Specific Easter Egg Components
export const ParticleExplosion: React.FC<{ active: boolean }> = ({ active }) => {
  const particles = useRef(
    Array.from({ length: 20 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    if (active) {
      startParticleAnimation();
    }
  }, [active]);

  const startParticleAnimation = () => {
    const animations = particles.map((particle, index) => {
      const angle = (index / particles.length) * Math.PI * 2;
      const distance = 100 + Math.random() * 100;
      
      return Animated.parallel([
        Animated.timing(particle.x, {
          toValue: Math.cos(angle) * distance,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: Math.sin(angle) * distance,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start(() => {
      // Reset particles
      particles.forEach(particle => {
        particle.x.setValue(0);
        particle.y.setValue(0);
        particle.opacity.setValue(1);
        particle.scale.setValue(1);
      });
    });
  };

  if (!active) return null;

  return (
    <View style={styles.particleContainer}>
      {particles.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale },
              ],
              opacity: particle.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
};

export const RainbowText: React.FC<{
  text: string;
  active: boolean;
  style?: any;
}> = ({ text, active, style }) => {
  const colorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        })
      ).start();

      AnimationSystem.createSequence([
        AnimationSystem.createSpring(scaleAnim, 1.1, SpringPresets.bouncy),
        AnimationSystem.createSpring(scaleAnim, 1, SpringPresets.gentle),
      ]).start();
    }
  }, [active]);

  if (!active) {
    return (
      <Text style={style}>
        {text}
      </Text>
    );
  }

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }],
      }}
    >
      <Animated.Text
        style={[
          style,
          {
            color: colorAnim.interpolate({
              inputRange: [0, 0.16, 0.33, 0.5, 0.66, 0.83, 1],
              outputRange: [
                '#FF0000', '#FF8800', '#FFFF00', '#00FF00',
                '#0088FF', '#8800FF', '#FF0000'
              ],
            }),
          },
        ]}
      >
        {text}
      </Animated.Text>
    </Animated.View>
  );
};

export const SecretMenu: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({ visible, onClose }) => {
  const slideAnim = useRef(new Animated.Value(-screenHeight)).current;
  const themeSystem = DynamicThemeSystem.getInstance();
  const currentTheme = themeSystem.getCurrentTheme();

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        ...SpringPresets.bouncy,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.secretMenu,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
        style={styles.secretMenuGradient}
      >
        <Text style={styles.secretMenuTitle}>🎉 Secret Menu Unlocked!</Text>
        <Text style={styles.secretMenuSubtitle}>
          You found the hidden developer menu!
        </Text>
        
        <View style={styles.secretMenuItems}>
          <Text style={styles.secretMenuItem}>🎨 All themes unlocked</Text>
          <Text style={styles.secretMenuItem}>🚀 Performance mode</Text>
          <Text style={styles.secretMenuItem}>🐛 Debug tools enabled</Text>
          <Text style={styles.secretMenuItem}>🎵 Sound effects pack</Text>
        </View>

        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.secretMenuCloseButton}>
            <Text style={styles.secretMenuCloseText}>Close</Text>
          </View>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </Animated.View>
  );
};

// Time-based Easter Eggs
export const TimeBasedEasterEgg: React.FC<{
  children: React.ReactNode;
  triggerHour?: number; // 0-23
  triggerDate?: string; // 'MM-DD' format
  triggerDay?: number; // 0-6 (Sunday-Saturday)
}> = ({ children, triggerHour, triggerDate, triggerDay }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const checkTimeCondition = () => {
      const now = new Date();
      const hour = now.getHours();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const day = now.getDay();
      const dateString = `${month}-${date}`;

      let shouldActivate = false;

      if (triggerHour !== undefined && hour === triggerHour) {
        shouldActivate = true;
      }

      if (triggerDate !== undefined && dateString === triggerDate) {
        shouldActivate = true;
      }

      if (triggerDay !== undefined && day === triggerDay) {
        shouldActivate = true;
      }

      setIsActive(shouldActivate);
    };

    checkTimeCondition();
    const interval = setInterval(checkTimeCondition, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [triggerHour, triggerDate, triggerDay]);

  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <EasterEgg trigger="tap" requiredTaps={1}>
      {children}
      <ParticleExplosion active={isActive} />
    </EasterEgg>
  );
};

// Predefined Easter Egg Configurations
export const EASTER_EGG_CONFIGS = {
  logo: {
    trigger: 'tap' as const,
    requiredTaps: 7,
    message: 'Logo Master!',
  },
  
  konami: {
    trigger: 'sequence' as const,
    sequence: KONAMI_CODE,
    message: 'Konami Code Activated!',
  },
  
  christmas: {
    trigger: 'time' as const,
    triggerDate: '12-25',
    message: 'Merry Christmas!',
  },
  
  friday: {
    trigger: 'time' as const,
    triggerDay: 5,
    message: 'TGIF!',
  },
  
  midnight: {
    trigger: 'time' as const,
    triggerHour: 0,
    message: 'Midnight Oil!',
  },
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  glow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    backgroundColor: '#FFD700',
    borderRadius: 50,
    opacity: 0.3,
  },

  particleContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 1,
    height: 1,
    zIndex: 1000,
  },

  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    backgroundColor: '#FFD700',
    borderRadius: 2,
    top: -2,
    left: -2,
  },

  secretMenu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },

  secretMenuGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  secretMenuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },

  secretMenuSubtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.9,
  },

  secretMenuItems: {
    alignItems: 'center',
    marginBottom: 40,
  },

  secretMenuItem: {
    fontSize: 18,
    color: 'white',
    marginVertical: 8,
    textAlign: 'center',
  },

  secretMenuCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  secretMenuCloseText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default EasterEgg;