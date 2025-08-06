/**
 * Advanced Loading Overlay Component
 * Features multiple loading animations, branded loaders, and progress indicators
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { AnimationSystem, SpringPresets } from '../../utils/visualPolish/AnimationSystem';
import { DynamicThemeSystem } from '../../utils/visualPolish/DynamicThemeSystem';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number; // 0-1
  variant?: 'spinner' | 'dots' | 'wave' | 'pulse' | 'branded' | 'skeleton';
  color?: string;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  onCancel?: () => void;
  transparent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
  progress,
  variant = 'spinner',
  color,
  size = 'medium',
  showProgress = false,
  onCancel,
  transparent = false,
}) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Dots animations
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Theme system
  const themeSystem = DynamicThemeSystem.getInstance();
  const currentTheme = themeSystem.getCurrentTheme();
  const gradients = themeSystem.getCurrentGradients();

  const loaderColor = color || currentTheme.primary;

  useEffect(() => {
    if (visible) {
      startEntranceAnimation();
      startLoadingAnimation();
    } else {
      startExitAnimation();
    }
  }, [visible]);

  useEffect(() => {
    if (progress !== undefined && showProgress) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  const startEntranceAnimation = () => {
    Animated.parallel([
      AnimationSystem.createTiming(fadeAnim, 1, { duration: 300 }),
      AnimationSystem.createSpring(scaleAnim, 1, SpringPresets.bouncy),
    ]).start();
  };

  const startExitAnimation = () => {
    Animated.parallel([
      AnimationSystem.createTiming(fadeAnim, 0, { duration: 200 }),
      AnimationSystem.createTiming(scaleAnim, 0.8, { duration: 200 }),
    ]).start();
  };

  const startLoadingAnimation = () => {
    switch (variant) {
      case 'spinner':
        startSpinnerAnimation();
        break;
      case 'dots':
        startDotsAnimation();
        break;
      case 'wave':
        startWaveAnimation();
        break;
      case 'pulse':
        startPulseAnimation();
        break;
      case 'branded':
        startBrandedAnimation();
        break;
      default:
        startSpinnerAnimation();
    }
  };

  const startSpinnerAnimation = () => {
    const animation = AnimationSystem.createLoop(
      AnimationSystem.createTiming(rotateAnim, 1, {
        duration: 1000,
        easing: (t) => t, // Linear easing
      })
    );
    animation.start();
  };

  const startDotsAnimation = () => {
    const createDotAnimation = (dot: Animated.Value, delay: number) =>
      AnimationSystem.createLoop(
        AnimationSystem.createSequence([
          AnimationSystem.createTiming(dot, 1, { duration: 400, delay }),
          AnimationSystem.createTiming(dot, 0, { duration: 400 }),
        ])
      );

    AnimationSystem.createParallel([
      createDotAnimation(dot1Anim, 0),
      createDotAnimation(dot2Anim, 200),
      createDotAnimation(dot3Anim, 400),
    ]).start();
  };

  const startWaveAnimation = () => {
    const animation = AnimationSystem.createLoop(
      AnimationSystem.createTiming(waveAnim, 1, {
        duration: 1200,
        easing: (t) => Math.sin(t * Math.PI * 2), // Sine wave
      })
    );
    animation.start();
  };

  const startPulseAnimation = () => {
    const animation = AnimationSystem.createLoop(
      AnimationSystem.createSequence([
        AnimationSystem.createTiming(pulseAnim, 1.2, { duration: 600 }),
        AnimationSystem.createTiming(pulseAnim, 1, { duration: 600 }),
      ])
    );
    animation.start();
  };

  const startBrandedAnimation = () => {
    AnimationSystem.createParallel([
      startSpinnerAnimation(),
      startPulseAnimation(),
    ]).start();
  };

  const getSizeValues = () => {
    const sizes = {
      small: { container: 80, loader: 24, fontSize: 12 },
      medium: { container: 120, loader: 32, fontSize: 14 },
      large: { container: 160, loader: 48, fontSize: 16 },
    };
    return sizes[size];
  };

  const renderSpinner = () => {
    const sizeValues = getSizeValues();
    
    return (
      <Animated.View
        style={[
          styles.spinner,
          {
            width: sizeValues.loader,
            height: sizeValues.loader,
            borderColor: loaderColor,
            transform: [
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      />
    );
  };

  const renderDots = () => {
    const sizeValues = getSizeValues();
    const dotSize = sizeValues.loader / 4;

    return (
      <View style={styles.dotsContainer}>
        {[dot1Anim, dot2Anim, dot3Anim].map((dot, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                backgroundColor: loaderColor,
                opacity: dot,
                transform: [
                  {
                    scale: dot.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderWave = () => {
    const sizeValues = getSizeValues();
    const barCount = 5;
    const barWidth = sizeValues.loader / (barCount * 2);

    return (
      <View style={styles.waveContainer}>
        {Array.from({ length: barCount }, (_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveBar,
              {
                width: barWidth,
                backgroundColor: loaderColor,
                height: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [barWidth, sizeValues.loader],
                }),
                transform: [
                  {
                    scaleY: waveAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderPulse = () => {
    const sizeValues = getSizeValues();

    return (
      <Animated.View
        style={[
          styles.pulse,
          {
            width: sizeValues.loader,
            height: sizeValues.loader,
            backgroundColor: loaderColor,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
    );
  };

  const renderBranded = () => {
    const sizeValues = getSizeValues();

    return (
      <View style={styles.brandedContainer}>
        <LinearGradient
          colors={gradients.primary}
          style={[
            styles.brandedLogo,
            {
              width: sizeValues.loader,
              height: sizeValues.loader,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.brandedInner,
              {
                transform: [
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  { scale: pulseAnim },
                ],
              },
            ]}
          />
        </LinearGradient>
      </View>
    );
  };

  const renderSkeleton = () => {
    return (
      <View style={styles.skeletonContainer}>
        {Array.from({ length: 3 }, (_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.skeletonLine,
              {
                backgroundColor: currentTheme.surfaceVariant,
                opacity: pulseAnim.interpolate({
                  inputRange: [1, 1.2],
                  outputRange: [0.3, 0.7],
                }),
              },
              index === 0 && { width: '80%' },
              index === 1 && { width: '60%' },
              index === 2 && { width: '40%' },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'wave':
        return renderWave();
      case 'pulse':
        return renderPulse();
      case 'branded':
        return renderBranded();
      case 'skeleton':
        return renderSkeleton();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  const sizeValues = getSizeValues();

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: transparent
              ? 'transparent'
              : 'rgba(0, 0, 0, 0.5)',
            opacity: fadeAnim,
          },
        ]}
      >
        {!transparent && (
          <BlurView intensity={10} style={StyleSheet.absoluteFillObject} />
        )}
        
        <Animated.View
          style={[
            styles.container,
            {
              minWidth: sizeValues.container,
              minHeight: sizeValues.container,
              backgroundColor: transparent
                ? 'transparent'
                : currentTheme.surface,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.loaderContainer}>
            {renderLoader()}
          </View>

          {message && (
            <Text
              style={[
                styles.message,
                {
                  color: currentTheme.onSurface,
                  fontSize: sizeValues.fontSize,
                },
              ]}
            >
              {message}
            </Text>
          )}

          {showProgress && progress !== undefined && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: currentTheme.surfaceVariant },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: loaderColor,
                      transform: [
                        {
                          scaleX: progressAnim,
                        },
                      ],
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.progressText,
                  {
                    color: currentTheme.onSurface,
                    fontSize: sizeValues.fontSize - 2,
                  },
                ]}
              >
                {Math.round(progress * 100)}%
              </Text>
            </View>
          )}

          {onCancel && (
            <Text
              style={[
                styles.cancelText,
                { color: currentTheme.error },
              ]}
              onPress={onCancel}
            >
              Cancel
            </Text>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  loaderContainer: {
    marginBottom: 16,
  },

  // Spinner styles
  spinner: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRadius: 50,
  },

  // Dots styles
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  dot: {
    borderRadius: 50,
    marginHorizontal: 2,
  },

  // Wave styles
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 48,
  },

  waveBar: {
    marginHorizontal: 1,
    borderRadius: 2,
  },

  // Pulse styles
  pulse: {
    borderRadius: 50,
  },

  // Branded styles
  brandedContainer: {
    alignItems: 'center',
  },

  brandedLogo: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  brandedInner: {
    width: '60%',
    height: '60%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 50,
    borderTopColor: 'transparent',
  },

  // Skeleton styles
  skeletonContainer: {
    width: 120,
  },

  skeletonLine: {
    height: 12,
    borderRadius: 6,
    marginVertical: 4,
  },

  // Text styles
  message: {
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
    maxWidth: 200,
  },

  // Progress styles
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
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
    marginTop: 8,
    fontWeight: '500',
    opacity: 0.8,
  },

  cancelText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default LoadingOverlay;