/**
 * Animated App Icon Component
 * Creates dynamic app icons with animations for different states and events
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AnimationSystem, SpringPresets } from '../../utils/visualPolish/AnimationSystem';
import { DynamicThemeSystem } from '../../utils/visualPolish/DynamicThemeSystem';

const { width: screenWidth } = Dimensions.get('window');

interface AnimatedAppIconProps {
  size?: number;
  variant?: 'default' | 'notification' | 'progress' | 'celebration' | 'error' | 'loading';
  progress?: number; // 0-1 for progress variant
  notificationCount?: number;
  animated?: boolean;
  style?: any;
}

export const AnimatedAppIcon: React.FC<AnimatedAppIconProps> = ({
  size = 60,
  variant = 'default',
  progress = 0,
  notificationCount = 0,
  animated = true,
  style,
}) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Notification badge animation
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeBounce = useRef(new Animated.Value(1)).current;

  // Theme system
  const themeSystem = DynamicThemeSystem.getInstance();
  const currentTheme = themeSystem.getCurrentTheme();
  const gradients = themeSystem.getCurrentGradients();

  useEffect(() => {
    if (animated) {
      startVariantAnimation();
    }
  }, [variant, animated]);

  useEffect(() => {
    if (progress !== undefined) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  useEffect(() => {
    if (notificationCount > 0) {
      showNotificationBadge();
    } else {
      hideNotificationBadge();
    }
  }, [notificationCount]);

  const startVariantAnimation = () => {
    switch (variant) {
      case 'notification':
        startNotificationAnimation();
        break;
      case 'progress':
        startProgressAnimation();
        break;
      case 'celebration':
        startCelebrationAnimation();
        break;
      case 'error':
        startErrorAnimation();
        break;
      case 'loading':
        startLoadingAnimation();
        break;
      default:
        startDefaultAnimation();
    }
  };

  const startDefaultAnimation = () => {
    const breatheAnimation = AnimationSystem.createLoop(
      AnimationSystem.createSequence([
        AnimationSystem.createTiming(pulseAnim, 1.05, {
          duration: 2000,
        }),
        AnimationSystem.createTiming(pulseAnim, 1, {
          duration: 2000,
        }),
      ])
    );
    breatheAnimation.start();
  };

  const startNotificationAnimation = () => {
    const pulseSequence = AnimationSystem.createLoop(
      AnimationSystem.createSequence([
        AnimationSystem.createTiming(pulseAnim, 1.1, {
          duration: 400,
        }),
        AnimationSystem.createTiming(pulseAnim, 1, {
          duration: 400,
        }),
      ]),
      3
    );

    const glowSequence = AnimationSystem.createSequence([
      AnimationSystem.createTiming(glowAnim, 1, {
        duration: 200,
      }),
      AnimationSystem.createTiming(glowAnim, 0, {
        duration: 1000,
      }),
    ]);

    AnimationSystem.createParallel([pulseSequence, glowSequence]).start();
  };

  const startProgressAnimation = () => {
    const rotateAnimation = AnimationSystem.createLoop(
      AnimationSystem.createTiming(rotateAnim, 1, {
        duration: 2000,
      })
    );
    rotateAnimation.start();
  };

  const startCelebrationAnimation = () => {
    const celebrationSequence = AnimationSystem.createSequence([
      AnimationSystem.createSpring(bounceAnim, 1.3, SpringPresets.bouncy),
      AnimationSystem.createSpring(bounceAnim, 1, SpringPresets.gentle),
      AnimationSystem.createTiming(rotateAnim, 1, {
        duration: 500,
      }),
    ]);

    const rainbowGlow = AnimationSystem.createLoop(
      AnimationSystem.createSequence([
        AnimationSystem.createTiming(glowAnim, 1, {
          duration: 300,
        }),
        AnimationSystem.createTiming(glowAnim, 0, {
          duration: 300,
        }),
      ]),
      5
    );

    AnimationSystem.createParallel([celebrationSequence, rainbowGlow]).start(() => {
      // Reset values after animation
      bounceAnim.setValue(1);
      rotateAnim.setValue(0);
      glowAnim.setValue(0);
    });
  };

  const startErrorAnimation = () => {
    const shakeSequence = AnimationSystem.createShakeAnimation(shakeAnim, 5, 400);
    const errorPulse = AnimationSystem.createSequence([
      AnimationSystem.createTiming(glowAnim, 1, {
        duration: 200,
      }),
      AnimationSystem.createTiming(glowAnim, 0, {
        duration: 800,
      }),
    ]);

    AnimationSystem.createParallel([shakeSequence, errorPulse]).start(() => {
      shakeAnim.setValue(0);
      glowAnim.setValue(0);
    });
  };

  const startLoadingAnimation = () => {
    const loadingRotate = AnimationSystem.createLoop(
      AnimationSystem.createTiming(rotateAnim, 1, {
        duration: 1000,
      })
    );
    
    const loadingPulse = AnimationSystem.createLoop(
      AnimationSystem.createSequence([
        AnimationSystem.createTiming(pulseAnim, 1.1, {
          duration: 800,
        }),
        AnimationSystem.createTiming(pulseAnim, 1, {
          duration: 800,
        }),
      ])
    );

    AnimationSystem.createParallel([loadingRotate, loadingPulse]).start();
  };

  const showNotificationBadge = () => {
    AnimationSystem.createSpring(badgeScale, 1, SpringPresets.bouncy).start();
    
    // Bounce animation
    const bounceSequence = AnimationSystem.createSequence([
      AnimationSystem.createSpring(badgeBounce, 1.2, SpringPresets.bouncy),
      AnimationSystem.createSpring(badgeBounce, 1, SpringPresets.gentle),
    ]);
    bounceSequence.start();
  };

  const hideNotificationBadge = () => {
    AnimationSystem.createTiming(badgeScale, 0, {
      duration: 200,
    }).start();
  };

  const getIconColors = () => {
    switch (variant) {
      case 'notification':
        return gradients.info;
      case 'progress':
        return gradients.primary;
      case 'celebration':
        return ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'];
      case 'error':
        return gradients.error;
      case 'loading':
        return gradients.secondary;
      default:
        return gradients.primary;
    }
  };

  const getGlowColor = () => {
    switch (variant) {
      case 'notification':
        return currentTheme.info;
      case 'celebration':
        return '#FFD700';
      case 'error':
        return currentTheme.error;
      default:
        return currentTheme.primary;
    }
  };

  const iconColors = getIconColors();
  const glowColor = getGlowColor();

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Glow effect */}
      {variant !== 'default' && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) * 0.2,
              backgroundColor: glowColor,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
      )}

      {/* Main icon */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            width: size,
            height: size,
            borderRadius: size * 0.2,
            transform: [
              { scale: pulseAnim },
              { scale: bounceAnim },
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
              {
                translateX: shakeAnim,
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={iconColors}
          style={[
            styles.iconGradient,
            {
              borderRadius: size * 0.2,
            },
          ]}
        >
          {/* Icon content */}
          <View style={styles.iconContent}>
            {/* Main logo/symbol */}
            <View
              style={[
                styles.logoSymbol,
                {
                  width: size * 0.4,
                  height: size * 0.4,
                  borderRadius: size * 0.1,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                },
              ]}
            />

            {/* Progress indicator for progress variant */}
            {variant === 'progress' && (
              <Animated.View
                style={[
                  styles.progressIndicator,
                  {
                    width: size * 0.8,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.3)',
                    overflow: 'hidden',
                    marginTop: size * 0.1,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      height: '100%',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: 2,
                      transform: [
                        {
                          scaleX: progressAnim,
                        },
                      ],
                      transformOrigin: 'left',
                    },
                  ]}
                />
              </Animated.View>
            )}
          </View>
        </LinearGradient>

        {/* Glassmorphism overlay */}
        {Platform.OS === 'ios' && (
          <BlurView
            intensity={20}
            style={[
              styles.blurOverlay,
              {
                borderRadius: size * 0.2,
              },
            ]}
          />
        )}
      </Animated.View>

      {/* Notification badge */}
      {notificationCount > 0 && (
        <Animated.View
          style={[
            styles.notificationBadge,
            {
              transform: [
                { scale: badgeScale },
                { scale: badgeBounce },
              ],
              right: -size * 0.1,
              top: -size * 0.1,
              minWidth: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
            },
          ]}
        >
          <LinearGradient
            colors={gradients.error}
            style={[
              styles.badgeGradient,
              {
                borderRadius: size * 0.125,
              },
            ]}
          >
            <Animated.Text
              style={[
                styles.badgeText,
                {
                  fontSize: size * 0.12,
                  color: 'white',
                  fontWeight: 'bold',
                },
              ]}
            >
              {notificationCount > 99 ? '99+' : notificationCount}
            </Animated.Text>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
};

// Widget-style app icon for home screen widgets
export const WidgetAppIcon: React.FC<{
  size?: number;
  showStats?: boolean;
  stats?: {
    automations: number;
    executions: number;
    success_rate: number;
  };
}> = ({ size = 120, showStats = true, stats }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const themeSystem = DynamicThemeSystem.getInstance();
  const gradients = themeSystem.getCurrentGradients();

  useEffect(() => {
    const breatheAnimation = AnimationSystem.createLoop(
      AnimationSystem.createSequence([
        AnimationSystem.createTiming(pulseAnim, 1.02, {
          duration: 3000,
        }),
        AnimationSystem.createTiming(pulseAnim, 1, {
          duration: 3000,
        }),
      ])
    );
    breatheAnimation.start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.widgetContainer,
        {
          width: size,
          height: size,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={gradients.mesh}
        style={[
          styles.widgetGradient,
          {
            borderRadius: size * 0.15,
          },
        ]}
      >
        <View style={styles.widgetContent}>
          <AnimatedAppIcon
            size={size * 0.4}
            variant="default"
            animated={false}
          />
          
          {showStats && stats && (
            <View style={styles.widgetStats}>
              <Animated.Text style={styles.widgetStatText}>
                {stats.automations} automations
              </Animated.Text>
              <Animated.Text style={styles.widgetStatText}>
                {stats.executions} runs
              </Animated.Text>
              <Animated.Text style={styles.widgetStatText}>
                {Math.round(stats.success_rate)}% success
              </Animated.Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  glow: {
    position: 'absolute',
    top: -10,
    left: -10,
  },

  iconContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  iconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  iconContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  logoSymbol: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  progressIndicator: {
    alignItems: 'flex-start',
  },

  progressFill: {
    width: '100%',
  },

  notificationBadge: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },

  badgeGradient: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  badgeText: {
    textAlign: 'center',
  },

  // Widget styles
  widgetContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  widgetGradient: {
    flex: 1,
    padding: 16,
  },

  widgetContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  widgetStats: {
    alignItems: 'center',
  },

  widgetStatText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginVertical: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default AnimatedAppIcon;