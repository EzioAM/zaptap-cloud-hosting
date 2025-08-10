import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Vibration,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth } = Dimensions.get('window');

// Staggered entry animation for lists
export const useStaggeredAnimation = (items: any[], delay: number = 100) => {
  // Handle undefined or empty items
  const safeItems = items || [];
  
  const animatedValues = useRef(
    safeItems.map(() => new Animated.Value(0))
  ).current;

  // Update animated values if items length changes
  useEffect(() => {
    const currentLength = animatedValues.length;
    const newLength = safeItems.length;
    
    if (newLength > currentLength) {
      // Add new animated values for new items
      for (let i = currentLength; i < newLength; i++) {
        animatedValues.push(new Animated.Value(0));
      }
    } else if (newLength < currentLength) {
      // Remove excess animated values
      animatedValues.splice(newLength);
    }
  }, [safeItems.length, animatedValues]);

  useEffect(() => {
    // Only animate if we have items
    if (safeItems.length === 0) return;
    
    const animations = safeItems.map((_, index) =>
      Animated.timing(animatedValues[index], {
        toValue: 1,
        duration: 500,
        delay: index * delay,
        useNativeDriver: true,
      })
    );

    Animated.stagger(delay, animations).start();
  }, [safeItems.length, animatedValues, delay]);

  return animatedValues;
};

// Animated container with staggered children
export const StaggeredContainer: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({ children, delay = 100 }) => {
  // Safely convert React children to array
  const childrenArray = React.Children.toArray(children);
  
  // On web, just render children without animation to avoid issues
  if (Platform.OS === 'web') {
    return (
      <View>
        {childrenArray.map((child, index) => (
          <View key={index}>
            {child}
          </View>
        ))}
      </View>
    );
  }
  
  const animatedValues = useStaggeredAnimation(childrenArray, delay);

  // Handle empty children
  if (childrenArray.length === 0) {
    return null;
  }

  return (
    <View>
      {childrenArray.map((child, index) => {
        const animatedValue = animatedValues[index] || new Animated.Value(1);
        
        return (
          <Animated.View
            key={index}
            style={{
              opacity: animatedValue,
              transform: [
                {
                  translateY: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            }}
          >
            {child}
          </Animated.View>
        );
      })}
    </View>
  );
};

// Animated section header
export const AnimatedSectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
  color?: string;
}> = ({ title, subtitle, isCollapsed = false, onToggle, color = '#8B5CF6' }) => {
  const rotateValue = useRef(new Animated.Value(0)).current;
  const fadeValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(rotateValue, {
      toValue: isCollapsed ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    if (subtitle) {
      Animated.timing(fadeValue, {
        toValue: isCollapsed ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isCollapsed, rotateValue, fadeValue, subtitle]);

  const rotation = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <TouchableOpacity
      onPress={onToggle}
      style={styles.sectionHeader}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[`${color}20`, `${color}10`]}
        style={styles.sectionHeaderGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionHeaderText}>
            <Animated.Text style={[styles.sectionTitle, { color }]}>
              {title}
            </Animated.Text>
            {subtitle && (
              <Animated.Text
                style={[
                  styles.sectionSubtitle,
                  { opacity: fadeValue, color: `${color}80` },
                ]}
              >
                {subtitle}
              </Animated.Text>
            )}
          </View>
          {onToggle && (
            <Animated.View
              style={[
                styles.collapseIcon,
                { transform: [{ rotate: rotation }] },
              ]}
            >
              <View style={[styles.chevron, { borderColor: color }]} />
            </Animated.View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Press animation wrapper with haptic feedback
export const PressableAnimated: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: any;
  hapticType?: 'light' | 'medium' | 'heavy';
  scaleValue?: number;
}> = ({
  children,
  onPress,
  onLongPress,
  style,
  hapticType = 'light',
  scaleValue = 0.95,
}) => {
  const animatedScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    // Haptic feedback for mobile platforms
    if (Platform.OS !== 'web') {
      if (hapticType === 'light') {
        Vibration.vibrate(10);
      } else if (hapticType === 'medium') {
        Vibration.vibrate(50);
      } else if (hapticType === 'heavy') {
        Vibration.vibrate([0, 100]);
      }
    }

    Animated.spring(animatedScale, {
      toValue: scaleValue,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(animatedScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={style}
    >
      <Animated.View
        style={{
          transform: [{ scale: animatedScale }],
        }}
      >
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Modern Success/Error feedback toast with glassmorphism
export const FeedbackAnimation: React.FC<{
  type: 'success' | 'error' | 'warning';
  visible: boolean;
  message: string;
}> = ({ type, visible, message }) => {
  const slideValue = useRef(new Animated.Value(-150)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0.9)).current;
  const progressValue = useRef(new Animated.Value(0)).current;
  const { top } = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      // Trigger haptic on show
      if (Platform.OS !== 'web') {
        Vibration.vibrate(10);
      }

      // Show animation with spring effect
      Animated.parallel([
        Animated.spring(slideValue, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();

      // Progress animation
      Animated.timing(progressValue, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false,
      }).start();

      // Auto-hide after 3 seconds
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideValue, {
            toValue: -150,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(fadeValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 0.9,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, 3000);
    } else {
      // Reset values
      slideValue.setValue(-150);
      fadeValue.setValue(0);
      scaleValue.setValue(0.9);
      progressValue.setValue(0);
    }
  }, [visible, slideValue, fadeValue, scaleValue, progressValue]);

  const iconName = 
    type === 'success' ? '✓' : 
    type === 'error' ? '✕' : 
    '⚠';

  const gradientColors = 
    type === 'success' ? ['#10B981', '#059669'] : 
    type === 'error' ? ['#EF4444', '#DC2626'] : 
    ['#F59E0B', '#D97706'];

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.modernFeedbackContainer,
        {
          transform: [
            { translateY: slideValue },
            { scale: scaleValue },
          ],
          opacity: fadeValue,
          top: top + 10, // Position below the notch with margin
        },
      ]}
    >
      <View style={styles.modernFeedbackContent}>
        {/* Glass background effect */}
        <View style={styles.glassBackground} />
        
        {/* Content */}
        <View style={styles.toastContent}>
          {/* Icon with gradient background */}
          <LinearGradient
            colors={gradientColors}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Animated.Text style={styles.toastIcon}>{iconName}</Animated.Text>
          </LinearGradient>
          
          {/* Message */}
          <Animated.Text style={styles.modernFeedbackText} numberOfLines={2}>
            {message}
          </Animated.Text>
        </View>
        
        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <Animated.View 
            style={[
              styles.progressBar,
              {
                width: progressWidth,
                backgroundColor: gradientColors[0],
              },
            ]} 
          />
        </View>
      </View>
    </Animated.View>
  );
};

// Loading pulse animation
export const LoadingPulse: React.FC<{
  color?: string;
  size?: number;
}> = ({ color = '#8B5CF6', size = 40 }) => {
  const pulseValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseValue]);

  const scale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  const opacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <Animated.View
      style={[
        styles.loadingPulse,
        {
          width: size,
          height: size,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

// Swipe to delete animation
export const SwipeToDelete: React.FC<{
  children: React.ReactNode;
  onDelete: () => void;
  threshold?: number;
}> = ({ children, onDelete, threshold = screenWidth * 0.3 }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSwipe = (gestureState: any) => {
    if (gestureState.dx < -threshold && !isDeleting) {
      setIsDeleting(true);
      Animated.timing(translateX, {
        toValue: -screenWidth,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onDelete();
      });
    } else {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <View style={styles.swipeContainer}>
      <Animated.View
        style={{
          transform: [{ translateX }],
        }}
      >
        {children}
      </Animated.View>
      <View style={styles.deleteBackground}>
        <Animated.Text style={styles.deleteText}>Delete</Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeaderGradient: {
    padding: 16,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  collapseIcon: {
    marginLeft: 16,
  },
  chevron: {
    width: 12,
    height: 12,
    borderTopWidth: 2,
    borderRightWidth: 2,
    transform: [{ rotate: '135deg' }],
  },
  feedbackContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 1000,
  },
  feedbackText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Modern toast styles
  modernFeedbackContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 10000,
    elevation: 10,
  },
  modernFeedbackContent: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  glassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastIcon: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modernFeedbackText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 20,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  loadingPulse: {
    borderRadius: 20,
  },
  swipeContainer: {
    backgroundColor: '#F44336',
    borderRadius: 12,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: 'white',
    fontWeight: 'bold',
  },
});