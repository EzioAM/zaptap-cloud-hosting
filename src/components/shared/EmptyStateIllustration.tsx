import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '../../theme/gradients';
import { typography, fontWeights } from '../../theme/typography';
import GradientButton from './GradientButton';

interface EmptyStateIllustrationProps {
  type?: 'empty' | 'error' | 'search' | 'success' | 'offline' | 'maintenance';
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  gradientKey?: keyof typeof gradients;
  animated?: boolean;
}

export const EmptyStateIllustration: React.FC<EmptyStateIllustrationProps> = ({
  type = 'empty',
  title,
  subtitle,
  actionLabel,
  onAction,
  gradientKey = 'primary',
  animated = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated) {
      // Entry animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -10,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      if (type === 'error' || type === 'offline') {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    } else {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [animated, type]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return 'alert-circle';
      case 'search':
        return 'magnify';
      case 'success':
        return 'check-circle';
      case 'offline':
        return 'wifi-off';
      case 'maintenance':
        return 'wrench';
      default:
        return 'package-variant';
    }
  };

  const getGradientKey = (): keyof typeof gradients => {
    switch (type) {
      case 'error':
        return 'error';
      case 'success':
        return 'success';
      case 'offline':
        return 'warning';
      default:
        return gradientKey;
    }
  };

  const gradient = gradients[getGradientKey()];
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.illustrationContainer}>
        {/* Background circles */}
        <Animated.View
          style={[
            styles.backgroundCircle,
            styles.circle1,
            {
              transform: [
                { rotate: rotation },
                { scale: pulseAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[...gradient.colors].reverse()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            opacity={0.1}
          />
        </Animated.View>
        
        <Animated.View
          style={[
            styles.backgroundCircle,
            styles.circle2,
            {
              transform: [
                { rotate: rotation },
                { scale: pulseAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={gradient.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            opacity={0.15}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.backgroundCircle,
            styles.circle3,
            {
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          <LinearGradient
            colors={[...gradient.colors].reverse()}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            opacity={0.05}
          />
        </Animated.View>

        {/* Main icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                { translateY: floatAnim },
                { scale: pulseAnim },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={gradient.colors}
            start={gradient.start}
            end={gradient.end}
            style={styles.iconGradient}
          >
            <MaterialCommunityIcons
              name={getIcon()}
              size={48}
              color="#FFFFFF"
            />
          </LinearGradient>
        </Animated.View>

        {/* Decorative elements */}
        <Animated.View
          style={[
            styles.decorativeElement,
            styles.element1,
            {
              transform: [
                { translateY: floatAnim },
                { rotate: rotation },
              ],
            },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: gradient.colors[0] }]} />
        </Animated.View>

        <Animated.View
          style={[
            styles.decorativeElement,
            styles.element2,
            {
              transform: [
                { 
                  translateY: Animated.multiply(floatAnim, -1),
                },
                { rotate: rotation },
              ],
            },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: gradient.colors[1] }]} />
        </Animated.View>

        <Animated.View
          style={[
            styles.decorativeElement,
            styles.element3,
            {
              transform: [
                { translateY: floatAnim },
                { rotate: rotation },
              ],
            },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: gradient.colors[2] || gradient.colors[1] }]} />
        </Animated.View>
      </View>

      <Text style={styles.title}>{title}</Text>
      
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      {actionLabel && onAction && (
        <View style={styles.actionContainer}>
          <GradientButton
            title={actionLabel}
            onPress={onAction}
            gradientKey={getGradientKey()}
            size="medium"
            animated={animated}
            delay={300}
          />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  illustrationContainer: {
    width: 200,
    height: 200,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundCircle: {
    position: 'absolute',
    borderRadius: 999,
    overflow: 'hidden',
  },
  circle1: {
    width: 180,
    height: 180,
  },
  circle2: {
    width: 140,
    height: 140,
  },
  circle3: {
    width: 200,
    height: 200,
  },
  iconContainer: {
    zIndex: 1,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  decorativeElement: {
    position: 'absolute',
  },
  element1: {
    top: 20,
    right: 30,
  },
  element2: {
    bottom: 30,
    left: 20,
  },
  element3: {
    top: 40,
    left: 25,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    ...typography.headlineMedium,
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodyLarge,
    textAlign: 'center',
    color: '#666666',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  actionContainer: {
    marginTop: 16,
  },
});

export default EmptyStateIllustration;