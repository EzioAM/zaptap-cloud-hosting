import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../common/ThemeFallbackWrapper';
import { ANIMATION_CONFIG } from '../../constants/animations';

interface FABAction {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

interface EnhancedFloatingActionButtonProps {
  onPress: () => void;
  isVisible: boolean;
  actions?: FABAction[];
  icon?: string;
  size?: number;
  backgroundColor?: string;
}

const EnhancedFloatingActionButton: React.FC<EnhancedFloatingActionButtonProps> = ({
  onPress,
  isVisible,
  actions = [],
  icon = 'plus',
  size = 56,
  backgroundColor,
}) => {
  const theme = useSafeTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(isVisible ? 1 : 0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Update visibility animation
  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isVisible ? 1 : 0,
      tension: ANIMATION_CONFIG.SPRING_TENSION,
      friction: ANIMATION_CONFIG.SPRING_FRICTION,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  // Handle press with ripple effect
  const handlePress = useCallback(() => {
    // Ripple animation
    Animated.sequence([
      Animated.timing(rippleAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.MICRO_INTERACTION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(rippleAnim, {
        toValue: 0,
        duration: ANIMATION_CONFIG.MICRO_INTERACTION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    if (actions.length > 0) {
      toggleMenu();
    } else {
      onPress();
    }
  }, [actions.length, onPress]);

  // Toggle menu expansion
  const toggleMenu = useCallback(() => {
    const toValue = isExpanded ? 0 : 1;
    
    Animated.parallel([
      Animated.timing(menuAnim, {
        toValue,
        duration: ANIMATION_CONFIG.MODAL_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: ANIMATION_CONFIG.MODAL_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();

    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Handle action press
  const handleActionPress = useCallback((action: FABAction) => {
    action.onPress();
    toggleMenu();
  }, [toggleMenu]);

  // Animated values
  const fabStyle = {
    transform: [
      { 
        scale: scaleAnim.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [0, 1.1, 1],
        })
      },
    ],
  };

  const iconRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 0],
  });

  const menuOpacity = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const menuScale = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  if (!isVisible) {
    return null;
  }

  const fabColor = backgroundColor || theme.colors?.primary || '#2196F3';

  return (
    <View style={styles.container}>
      {/* Menu Actions */}
      {actions.length > 0 && (
        <Animated.View
          style={[
            styles.menuContainer,
            {
              opacity: menuOpacity,
              transform: [{ scale: menuScale }],
            },
          ]}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          {actions.map((action, index) => {
            const actionDelay = index * 50;
            const actionTranslateY = menuAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            });

            return (
              <Animated.View
                key={action.label}
                style={[
                  styles.actionContainer,
                  {
                    transform: [
                      {
                        translateY: actionTranslateY,
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.actionLabelContainer}>
                  <Text style={[styles.actionLabel, { color: theme.colors?.text || '#000' }]}>
                    {action.label}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    { backgroundColor: action.color || fabColor },
                  ]}
                  onPress={() => handleActionPress(action)}
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <MaterialCommunityIcons
                    name={action.icon as any}
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>
      )}

      {/* Overlay for menu dismiss - only when expanded */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleMenu}
          // Ensure overlay doesn't interfere with navigation
          pointerEvents={isExpanded ? 'auto' : 'none'}
        />
      )}

      {/* Main FAB */}
      <Animated.View style={fabStyle}>
        {/* Ripple effect */}
        <Animated.View
          style={[
            styles.ripple,
            {
              backgroundColor: fabColor,
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />
        
        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: fabColor,
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          onPress={handlePress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          android_ripple={{
            color: 'rgba(255, 255, 255, 0.3)',
            borderless: true,
            radius: size / 2,
          }}
          accessibilityRole="button"
          accessibilityLabel="Floating action button"
        >
          <Animated.View
            style={{
              transform: [{ rotate: iconRotation }],
            }}
          >
            <MaterialCommunityIcons
              name={icon as any}
              size={size * 0.5}
              color="white"
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default EnhancedFloatingActionButton;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // CRITICAL FIX: Position FAB higher to avoid overlap with bottom navigation
    bottom: Platform.OS === 'ios' ? 120 : 110,
    right: 24,
    alignItems: 'flex-end',
    // Ensure FAB doesn't block navigation touches
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    // CRITICAL FIX: Don't extend overlay to bottom navigation area
    // Leave space for bottom navigation (approximately 100px)
    bottom: 100,
    backgroundColor: 'transparent',
    // Ensure overlay doesn't interfere with navigation
    zIndex: -1,
  },
  menuContainer: {
    marginBottom: 16,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionLabelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  actionLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ripple: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
});