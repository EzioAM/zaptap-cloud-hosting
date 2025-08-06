import React, { useRef, useEffect, memo, useCallback } from 'react';
import {
  Text,
  StyleSheet,
  Platform,
  Animated,
  Pressable,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { gradients } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';
import { ANIMATION_CONFIG } from '../../constants/animations';
import * as Haptics from 'expo-haptics';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  gradientKey?: keyof typeof gradients;
  icon?: string;
  iconPosition?: 'left' | 'right';
  size?: 'small' | 'medium' | 'large';
  variant?: 'filled' | 'outlined' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  haptic?: boolean;
  animated?: boolean;
  delay?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export const GradientButton: React.FC<GradientButtonProps> = memo(({
  title,
  onPress,
  gradientKey = 'primary',
  icon,
  iconPosition = 'left',
  size = 'medium',
  variant = 'filled',
  disabled = false,
  loading = false,
  style,
  textStyle,
  haptic = true,
  animated = true,
  delay = 0,
}) => {
  const scaleAnim = useRef(new Animated.Value(animated ? 0.8 : 1)).current;
  const fadeAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Glow animation for primary buttons
    if (variant === 'filled' && !disabled) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated, variant, disabled]);

  const handlePressIn = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.parallel([
      Animated.spring(pressAnim, {
        toValue: 0.95,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Ripple effect
    rippleAnim.setValue(0);
    rippleOpacity.setValue(0.5);
    Animated.parallel([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(pressAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const getTextSizeStyles = () => {
    switch (size) {
      case 'small':
        return styles.smallText;
      case 'large':
        return styles.largeText;
      default:
        return styles.mediumText;
    }
  };

  const gradient = gradients[gradientKey];
  const isDisabled = disabled || loading;

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator 
          color={variant === 'filled' ? '#FFFFFF' : gradient.colors[0]} 
          size="small" 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <MaterialCommunityIcons
              name={icon as any}
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
              color={variant === 'filled' ? '#FFFFFF' : gradient.colors[0]}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              getTextSizeStyles(),
              variant === 'filled' ? styles.filledText : styles.outlinedText,
              { color: variant === 'filled' ? '#FFFFFF' : gradient.colors[0] },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <MaterialCommunityIcons
              name={icon as any}
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
              color={variant === 'filled' ? '#FFFFFF' : gradient.colors[0]}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </>
  );

  if (variant === 'ghost') {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        style={[
          styles.container,
          styles.ghost,
          getSizeStyles(),
          {
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, isDisabled ? 0.5 : 1],
            }),
            transform: [
              { scale: scaleAnim },
              { scale: pressAnim },
            ],
          },
          style,
        ]}
      >
        {renderContent()}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { scale: pressAnim },
          ],
        },
        style,
      ]}
    >
      {/* Shadow layers for 3D effect */}
      {variant === 'filled' && !isDisabled && (
        <>
          <Animated.View 
            style={[
              styles.shadowLayer1,
              {
                opacity: shadowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [0.1, 0.3],
                }),
                transform: [
                  { 
                    translateY: shadowAnim.interpolate({
                      inputRange: [0.5, 1],
                      outputRange: [2, 4],
                    })
                  },
                ],
              },
            ]} 
          />
          <Animated.View 
            style={[
              styles.shadowLayer2,
              {
                opacity: shadowAnim.interpolate({
                  inputRange: [0.5, 1],
                  outputRange: [0.05, 0.15],
                }),
                transform: [
                  { 
                    translateY: shadowAnim.interpolate({
                      inputRange: [0.5, 1],
                      outputRange: [4, 8],
                    })
                  },
                ],
              },
            ]} 
          />
        </>
      )}

      {/* Glow effect */}
      {variant === 'filled' && !isDisabled && (
        <Animated.View
          style={[
            styles.glow,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
              transform: [
                {
                  scale: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.1],
                  }),
                },
              ],
              backgroundColor: gradient.colors[0],
            },
          ]}
        />
      )}

      {variant === 'filled' ? (
        <LinearGradient
          colors={isDisabled ? ['#CCCCCC', '#AAAAAA'] : gradient.colors}
          start={gradient.start}
          end={gradient.end}
          style={[styles.button, getSizeStyles()]}
        >
          {/* Ripple effect */}
          <Animated.View
            style={[
              styles.ripple,
              {
                transform: [{ scale: rippleAnim }],
                opacity: rippleOpacity,
              },
            ]}
          />
          {renderContent()}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.button,
            styles.outlined,
            getSizeStyles(),
            { 
              borderColor: isDisabled ? '#CCCCCC' : gradient.colors[0],
              opacity: isDisabled ? 0.5 : 1,
            },
          ]}
        >
          {renderContent()}
        </View>
      )}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 8,
    marginHorizontal: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  outlined: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  ghost: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  text: {
    fontWeight: fontWeights.semibold,
    letterSpacing: 0.5,
  },
  smallText: {
    ...typography.labelSmall,
  },
  mediumText: {
    ...typography.labelLarge,
  },
  largeText: {
    ...typography.titleMedium,
  },
  filledText: {
    ...textShadows.subtle,
  },
  outlinedText: {
    // Text color is set dynamically
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  ripple: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  shadowLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    zIndex: -1,
  },
  shadowLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    zIndex: -2,
  },
  glow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 20,
    zIndex: -3,
  },
});

export default GradientButton;