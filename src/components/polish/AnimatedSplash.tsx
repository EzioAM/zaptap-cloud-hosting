/**
 * Animated Splash Screen Component
 * Features logo animations, progress indicators, and smooth transitions
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AnimationSystem, SpringPresets } from '../../utils/visualPolish/AnimationSystem';
import { DynamicThemeSystem } from '../../utils/visualPolish/DynamicThemeSystem';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AnimatedSplashProps {
  onComplete: () => void;
  duration?: number;
  showProgress?: boolean;
  logoSource?: any;
  title?: string;
  subtitle?: string;
  variant?: 'minimal' | 'elaborate' | 'branded';
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({
  onComplete,
  duration = 3000,
  showProgress = true,
  logoSource,
  title = 'ShortcutsLike',
  subtitle = 'Automate Everything',
  variant = 'elaborate',
}) => {
  // Animation values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(20)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const particleScale = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  // Theme system
  const themeSystem = DynamicThemeSystem.getInstance();
  const currentTheme = themeSystem.getCurrentTheme();
  const gradients = themeSystem.getCurrentGradients();

  useEffect(() => {
    startSplashAnimation();
  }, []);

  const startSplashAnimation = () => {
    const sequence = AnimationSystem.createSequence([
      // Phase 1: Background fade in
      AnimationSystem.createTiming(backgroundOpacity, 1, {
        duration: 300,
      }),

      // Phase 2: Logo entrance with bounce
      AnimationSystem.createParallel([
        AnimationSystem.createSpring(logoScale, 1, SpringPresets.bouncy),
        AnimationSystem.createTiming(logoOpacity, 1, {
          duration: 600,
        }),
      ]),

      // Phase 3: Logo pulse effect
      AnimationSystem.createLoop(
        AnimationSystem.createSequence([
          AnimationSystem.createTiming(pulseScale, 1.05, {
            duration: 800,
          }),
          AnimationSystem.createTiming(pulseScale, 1, {
            duration: 800,
          }),
        ]),
        2
      ),

      // Phase 4: Title animation
      AnimationSystem.createParallel([
        AnimationSystem.createSpring(titleTranslateY, 0, SpringPresets.gentle),
        AnimationSystem.createTiming(titleOpacity, 1, {
          duration: 400,
        }),
      ]),

      // Phase 5: Subtitle animation
      AnimationSystem.createParallel([
        AnimationSystem.createSpring(subtitleTranslateY, 0, SpringPresets.gentle),
        AnimationSystem.createTiming(subtitleOpacity, 1, {
          duration: 400,
        }),
      ]),

      // Phase 6: Progress bar (if enabled)
      ...(showProgress ? [
        AnimationSystem.createTiming(progressWidth, 1, {
          duration: Math.max(duration - 2200, 800),
        }),
      ] : []),

      // Phase 7: Particle effects (elaborate variant)
      ...(variant === 'elaborate' ? [
        AnimationSystem.createSpring(particleScale, 1, SpringPresets.bouncy),
      ] : []),
    ]);

    sequence.start(() => {
      // Exit animation
      const exitAnimation = AnimationSystem.createParallel([
        AnimationSystem.createTiming(backgroundOpacity, 0, {
          duration: 500,
        }),
        AnimationSystem.createTiming(logoOpacity, 0, {
          duration: 400,
        }),
        AnimationSystem.createTiming(titleOpacity, 0, {
          duration: 300,
        }),
        AnimationSystem.createTiming(subtitleOpacity, 0, {
          duration: 300,
        }),
      ]);

      exitAnimation.start(() => {
        onComplete();
      });
    });
  };

  const renderMinimalVariant = () => (
    <Animated.View style={[styles.container, { opacity: backgroundOpacity }]}>
      <LinearGradient
        colors={gradients.background}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: logoScale },
              { scale: pulseScale },
            ],
            opacity: logoOpacity,
          },
        ]}
      >
        {logoSource ? (
          <Image source={logoSource} style={styles.logo} />
        ) : (
          <View style={[styles.defaultLogo, { backgroundColor: currentTheme.primary }]} />
        )}
      </Animated.View>

      <Animated.Text
        style={[
          styles.title,
          { 
            color: currentTheme.onBackground,
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslateY }],
          },
        ]}
      >
        {title}
      </Animated.Text>

      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: currentTheme.surfaceVariant }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: currentTheme.primary,
                  transform: [
                    {
                      scaleX: progressWidth,
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>
      )}
    </Animated.View>
  );

  const renderElaborateVariant = () => (
    <Animated.View style={[styles.container, { opacity: backgroundOpacity }]}>
      <LinearGradient
        colors={gradients.mesh}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Background particles */}
      <Animated.View
        style={[
          styles.particlesContainer,
          {
            transform: [{ scale: particleScale }],
          },
        ]}
      >
        {Array.from({ length: 20 }, (_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: Math.random() * screenWidth,
                top: Math.random() * screenHeight,
                backgroundColor: gradients.primary[index % 2],
                opacity: 0.6,
                transform: [
                  {
                    rotate: logoRotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${360 * (index + 1)}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Main content with blur background */}
      <BlurView intensity={20} style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: logoScale },
                { scale: pulseScale },
                {
                  rotateY: logoRotation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
              opacity: logoOpacity,
            },
          ]}
        >
          {logoSource ? (
            <Image source={logoSource} style={styles.logo} />
          ) : (
            <LinearGradient
              colors={gradients.primary}
              style={styles.gradientLogo}
            />
          )}
        </Animated.View>

        <Animated.Text
          style={[
            styles.title,
            styles.elaborateTitle,
            {
              color: currentTheme.onBackground,
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslateY }],
            },
          ]}
        >
          {title}
        </Animated.Text>

        <Animated.Text
          style={[
            styles.subtitle,
            {
              color: currentTheme.onBackground,
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleTranslateY }],
            },
          ]}
        >
          {subtitle}
        </Animated.Text>

        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: currentTheme.surfaceVariant }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: currentTheme.primary,
                    transform: [{ scaleX: progressWidth }],
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: currentTheme.onBackground }]}>
              Loading...
            </Text>
          </View>
        )}
      </BlurView>
    </Animated.View>
  );

  const renderBrandedVariant = () => (
    <Animated.View style={[styles.container, { opacity: backgroundOpacity }]}>
      <LinearGradient
        colors={[currentTheme.primary, currentTheme.secondary]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.brandContainer}>
        <Animated.View
          style={[
            styles.brandLogoContainer,
            {
              transform: [
                { scale: logoScale },
                { scale: pulseScale },
              ],
              opacity: logoOpacity,
            },
          ]}
        >
          {logoSource ? (
            <Image source={logoSource} style={styles.brandLogo} />
          ) : (
            <View style={[styles.defaultBrandLogo, { backgroundColor: currentTheme.onPrimary }]} />
          )}
        </Animated.View>

        <View style={styles.brandTextContainer}>
          <Animated.Text
            style={[
              styles.brandTitle,
              {
                color: currentTheme.onPrimary,
                opacity: titleOpacity,
                transform: [{ translateY: titleTranslateY }],
              },
            ]}
          >
            {title}
          </Animated.Text>

          <Animated.Text
            style={[
              styles.brandSubtitle,
              {
                color: currentTheme.onPrimary,
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleTranslateY }],
              },
            ]}
          >
            {subtitle}
          </Animated.Text>
        </View>

        {showProgress && (
          <Animated.View
            style={[
              styles.brandProgressContainer,
              { opacity: progressWidth },
            ]}
          >
            <View style={styles.brandProgressDots}>
              {Array.from({ length: 3 }, (_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.progressDot,
                    {
                      backgroundColor: currentTheme.onPrimary,
                      transform: [
                        {
                          scale: pulseScale,
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );

  switch (variant) {
    case 'minimal':
      return renderMinimalVariant();
    case 'branded':
      return renderBrandedVariant();
    case 'elaborate':
    default:
      return renderElaborateVariant();
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },

  logoContainer: {
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },

  defaultLogo: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },

  gradientLogo: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },

  elaborateTitle: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.8,
  },

  progressContainer: {
    position: 'absolute',
    bottom: 80,
    left: 40,
    right: 40,
    alignItems: 'center',
  },

  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 2,
    transformOrigin: 'left',
  },

  progressText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    opacity: 0.7,
  },

  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },

  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Branded variant styles
  brandContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  brandLogoContainer: {
    marginBottom: 30,
  },

  brandLogo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },

  defaultBrandLogo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },

  brandTextContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },

  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },

  brandSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    opacity: 0.9,
  },

  brandProgressContainer: {
    position: 'absolute',
    bottom: 60,
  },

  brandProgressDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default AnimatedSplash;