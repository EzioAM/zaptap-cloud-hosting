import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { gradients, subtleGradients } from '../../theme/gradients';
import { typography, fontWeights, textShadows } from '../../theme/typography';
import { ANIMATION_CONFIG } from '../../constants/animations';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  gradientKey?: keyof typeof gradients;
  showBack?: boolean;
  rightIcon?: string;
  onRightPress?: () => void;
  transparent?: boolean;
  animated?: boolean;
  scrollOffset?: Animated.Value;
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  gradientKey = 'primary',
  showBack = false,
  rightIcon,
  onRightPress,
  transparent = false,
  animated = true,
  scrollOffset,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: ANIMATION_CONFIG.GENTLE_SPRING_TENSION,
          friction: ANIMATION_CONFIG.GENTLE_SPRING_FRICTION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
    }
  }, [animated]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    InteractionManager.runAfterInteractions(() => {
      navigation.goBack();
    });
  };

  const handleRightPress = () => {
    if (onRightPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      InteractionManager.runAfterInteractions(() => {
        onRightPress();
      });
    }
  };

  const gradient = gradients[gradientKey];
  
  // Use transform scaleY instead of height for better performance
  const headerScale = scrollOffset?.interpolate({
    inputRange: [0, 80, 120],
    outputRange: [1, 0.85, 0.75],
    extrapolate: 'clamp',
  }) || 1;
  
  const staticHeight = 120 + insets.top;

  const titleScale = scrollOffset?.interpolate({
    inputRange: [0, 40, 80],
    outputRange: [1, 0.95, 0.9],
    extrapolate: 'clamp',
  }) || 1;

  const subtitleOpacity = scrollOffset?.interpolate({
    inputRange: [0, 30, 60],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  }) || 1;

  const headerOpacity = scrollOffset?.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [1, 0.9, 0.8],
    extrapolate: 'clamp',
  }) || 1;

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          height: staticHeight,
          transform: [{ scaleY: headerScale }],
          opacity: headerOpacity,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={gradient.colors}
        start={gradient.start}
        end={gradient.end}
        style={StyleSheet.absoluteFillObject}
      />
      
      {Platform.OS === 'ios' && transparent && (
        <BlurView 
          intensity={80} 
          tint="dark" 
          style={StyleSheet.absoluteFillObject} 
        />
      )}

      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          {showBack && (
            <TouchableOpacity 
              onPress={handleBack}
              style={styles.iconButton}
            >
              <View style={styles.iconBackground}>
                <MaterialCommunityIcons 
                  name="arrow-left" 
                  size={24} 
                  color="#FFFFFF" 
                />
              </View>
            </TouchableOpacity>
          )}

          <Animated.View 
            style={[
              styles.titleContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: titleScale },
                ],
              },
            ]}
          >
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Animated.Text 
                style={[
                  styles.subtitle,
                  { opacity: subtitleOpacity },
                ]} 
                numberOfLines={1}
              >
                {subtitle}
              </Animated.Text>
            )}
          </Animated.View>

          {rightIcon && (
            <TouchableOpacity 
              onPress={handleRightPress}
              style={styles.iconButton}
            >
              <View style={styles.iconBackground}>
                <MaterialCommunityIcons 
                  name={rightIcon as any} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.bottomGradient}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.1)']}
          style={styles.shadow}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    padding: 8,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    ...typography.headlineLarge,
    color: '#FFFFFF',
    fontWeight: fontWeights.bold,
    textAlign: 'center',
    ...textShadows.medium,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
    ...textShadows.subtle,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  shadow: {
    height: 4,
  },
});

export default GradientHeader;