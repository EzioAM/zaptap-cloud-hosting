import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Switch,
  Platform,
  Vibration,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ANIMATION_CONFIG } from '../../constants/animations';

const { width: screenWidth } = Dimensions.get('window');

interface MenuItem {
  icon: string;
  label: string;
  onPress?: () => void;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  type?: 'normal' | 'switch' | 'destructive';
  badge?: string | number;
  disabled?: boolean;
  description?: string;
}

interface AnimatedMenuItemProps extends MenuItem {
  index: number;
  isLast?: boolean;
  theme?: {
    colors?: {
      text?: string;
      textSecondary?: string;
      primary?: string;
      surface?: string;
      background?: string;
    };
  };
}

export const AnimatedMenuItem: React.FC<AnimatedMenuItemProps> = ({
  icon,
  label,
  onPress,
  value,
  onValueChange,
  type = 'normal',
  badge,
  disabled = false,
  description,
  index,
  isLast = false,
  theme,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  
  const rippleScale = useRef(new Animated.Value(0)).current;
  const [ripplePosition, setRipplePosition] = React.useState({ x: 0, y: 0 });

  useEffect(() => {
    // Entry animation
    const delay = index * 50;
    
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    // Badge animation if present
    if (badge !== undefined) {
      Animated.spring(badgeAnim, {
        toValue: 1,
        delay: delay + 200,
        tension: ANIMATION_CONFIG.SPRING_TENSION,
        friction: ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      }).start();
    }
  }, [index, badge]);

  const handlePressIn = (event: any) => {
    if (disabled || type === 'switch') return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Vibration.vibrate(ANIMATION_CONFIG.HAPTIC_DELAY);
    }

    // Get touch position for ripple effect
    const { locationX, locationY } = event.nativeEvent;
    setRipplePosition({ x: locationX, y: locationY });

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: ANIMATION_CONFIG.MICRO_INTERACTION_SCALE,
      tension: ANIMATION_CONFIG.SPRING_TENSION,
      friction: ANIMATION_CONFIG.SPRING_FRICTION,
      useNativeDriver: true,
    }).start();

    // Ripple effect
    rippleScale.setValue(0);
    rippleOpacity.setValue(1);
    
    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || type === 'switch') return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: ANIMATION_CONFIG.SPRING_TENSION,
      friction: ANIMATION_CONFIG.SPRING_FRICTION,
      useNativeDriver: true,
    }).start();
  };

  const iconColor = disabled 
    ? '#ccc' 
    : type === 'destructive' 
    ? '#ff4444' 
    : theme?.colors?.text || '#000';

  const labelColor = disabled 
    ? '#ccc' 
    : type === 'destructive' 
    ? '#ff4444' 
    : theme?.colors?.text || '#000';

  return (
    <Animated.View
      style={[
        styles.menuItemContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: slideAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.menuItem,
          !isLast && styles.menuItemBorder,
          disabled && styles.disabledItem,
        ]}
        onPress={type === 'switch' ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={type === 'switch' ? 1 : 0.7}
      >
        {/* Ripple effect overlay */}
        <Animated.View
          style={[
            styles.rippleOverlay,
            {
              left: ripplePosition.x - 50,
              top: ripplePosition.y - 50,
              opacity: rippleOpacity,
              transform: [{ scale: rippleScale }],
            },
          ]}
        />

        <View style={styles.menuItemContent}>
          <View style={styles.menuItemLeft}>
            {/* Icon container with gradient background */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={
                  type === 'destructive' 
                    ? ['#ff444420', '#ff444410'] 
                    : [`${theme?.colors?.primary || '#2196F3'}20`, `${theme?.colors?.primary || '#2196F3'}10`]
                }
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons 
                  name={icon as any} 
                  size={24} 
                  color={iconColor}
                />
              </LinearGradient>
            </View>

            {/* Text content */}
            <View style={styles.textContent}>
              <Text style={[styles.menuItemLabel, { color: labelColor }]}>
                {label}
              </Text>
              {description && (
                <Text style={[styles.menuItemDescription, { color: theme?.colors?.textSecondary || '#666' }]}>
                  {description}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.menuItemRight}>
            {/* Badge */}
            {badge !== undefined && (
              <Animated.View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme?.colors?.primary || '#2196F3',
                    opacity: badgeAnim,
                    transform: [{ scale: badgeAnim }],
                  },
                ]}
              >
                <Text style={styles.badgeText}>
                  {typeof badge === 'number' && badge > 99 ? '99+' : badge.toString()}
                </Text>
              </Animated.View>
            )}

            {/* Switch or chevron */}
            {type === 'switch' ? (
              <Switch
                value={value}
                onValueChange={(newValue) => {
                  // Haptic feedback for switch
                  if (Platform.OS !== 'web') {
                    Vibration.vibrate(ANIMATION_CONFIG.HAPTIC_DELAY);
                  }
                  onValueChange?.(newValue);
                }}
                trackColor={{ 
                  false: "#767577", 
                  true: theme?.colors?.primary || '#2196F3' 
                }}
                thumbColor={value ? 'white' : '#f4f3f4'}
                disabled={disabled}
                style={styles.switch}
              />
            ) : (
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color={disabled ? '#ccc' : theme?.colors?.textSecondary || '#666'} 
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Menu section component with accordion-style expand/collapse
interface MenuSection {
  title: string;
  items: MenuItem[];
  collapsible?: boolean;
  initiallyExpanded?: boolean;
}

interface AnimatedMenuSectionProps {
  section: MenuSection;
  sectionIndex: number;
  theme?: any;
  onItemPress?: (item: MenuItem, itemIndex: number) => void;
}

export const AnimatedMenuSection: React.FC<AnimatedMenuSectionProps> = ({
  section,
  sectionIndex,
  theme,
  onItemPress,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(section.initiallyExpanded ?? true);
  const heightAnim = useRef(new Animated.Value(section.initiallyExpanded ? 1 : 0)).current;
  const rotationAnim = useRef(new Animated.Value(section.initiallyExpanded ? 1 : 0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Section entry animation
    const delay = sectionIndex * 100;
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    }, delay);
  }, [sectionIndex]);

  const toggleExpanded = () => {
    if (!section.collapsible) return;

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    Animated.parallel([
      Animated.timing(heightAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(rotationAnim, {
        toValue: newExpanded ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={[styles.sectionHeader, !section.collapsible && styles.sectionHeaderStatic]}
        onPress={toggleExpanded}
        disabled={!section.collapsible}
        activeOpacity={section.collapsible ? 0.7 : 1}
      >
        <Text style={[styles.sectionTitle, { color: theme?.colors?.textSecondary || '#666' }]}>
          {section.title}
        </Text>
        {section.collapsible && (
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <MaterialCommunityIcons 
              name="chevron-down" 
              size={20} 
              color={theme?.colors?.textSecondary || '#666'} 
            />
          </Animated.View>
        )}
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.menuCard,
          {
            backgroundColor: theme?.colors?.surface || '#fff',
            height: heightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, section.items.length * 80], // Approximate item height
            }),
            opacity: heightAnim,
            overflow: 'hidden',
          },
        ]}
      >
        <View style={styles.menuItems}>
          {section.items.map((item, itemIndex) => (
            <AnimatedMenuItem
              key={`${item.label}-${itemIndex}`}
              {...item}
              index={itemIndex}
              isLast={itemIndex === section.items.length - 1}
              theme={theme}
              onPress={() => onItemPress?.(item, itemIndex)}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  menuSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  sectionHeaderStatic: {
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  menuCard: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  menuItems: {
    overflow: 'hidden',
  },
  menuItemContainer: {
    overflow: 'hidden',
  },
  menuItem: {
    position: 'relative',
    overflow: 'hidden',
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  disabledItem: {
    opacity: 0.5,
  },
  rippleOverlay: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    zIndex: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuItemDescription: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
});