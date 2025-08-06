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
          !safeIsLast && styles.menuItemBorder,
          safeDisabled && styles.disabledItem,
        ]}
        onPress={safeType === 'switch' ? undefined : handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={safeDisabled}
        activeOpacity={safeType === 'switch' ? 1 : 0.7}
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
                  safeType === 'destructive' 
                    ? ['#ff444420', '#ff444410'] 
                    : [`${safeTheme.colors.primary}20`, `${safeTheme.colors.primary}10`]
                }
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons 
                  name={safeIcon as any} 
                  size={24} 
                  color={iconColor}
                />
              </LinearGradient>
            </View>

            {/* Text content */}
            <View style={styles.textContent}>
              <Text style={[styles.menuItemLabel, { color: labelColor }]}>
                {safeLabel}
              </Text>
              {isValidString(description) && (
                <Text style={[styles.menuItemDescription, { color: safeTheme.colors.textSecondary }]}>
                  {description}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.menuItemRight}>
            {/* Badge */}
            {renderBadge()}

            {/* Switch or chevron */}
            {safeType === 'switch' ? (
              <Switch
                value={Boolean(value)}
                onValueChange={(newValue) => {
                  // Safe haptic feedback for switch
                  if (Platform.OS !== 'web') {
                    try {
                      Vibration.vibrate(SAFE_ANIMATION_CONFIG.HAPTIC_DELAY);
                    } catch (hapticError) {
                      // Haptic feedback not supported, continue silently
                    }
                  }
                  handleSwitchChange(newValue);
                }}
                trackColor={{ 
                  false: "#767577", 
                  true: safeTheme.colors.primary
                }}
                thumbColor={value ? 'white' : '#f4f3f4'}
                disabled={safeDisabled}
                style={styles.switch}
              />
            ) : (
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color={safeDisabled ? '#cccccc' : safeTheme.colors.textSecondary} 
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

// Safe section validation
const validateSection = (section: any): MenuSection => {
  if (!section || typeof section !== 'object') {
    return {
      title: 'Menu Section',
      items: [],
      collapsible: false,
      initiallyExpanded: true,
    };
  }

  return {
    title: isValidString(section.title) ? section.title : 'Menu Section',
    items: Array.isArray(section.items) ? section.items.filter(item => 
      item && typeof item === 'object' && isValidString(item.icon) && isValidString(item.label)
    ) : [],
    collapsible: typeof section.collapsible === 'boolean' ? section.collapsible : false,
    initiallyExpanded: typeof section.initiallyExpanded === 'boolean' ? section.initiallyExpanded : true,
  };
};

export const AnimatedMenuSection: React.FC<AnimatedMenuSectionProps> = ({
  section,
  sectionIndex,
  theme,
  onItemPress,
}) => {
  // Defensive prop validation
  const safeSection = React.useMemo(() => validateSection(section), [section]);
  const safeSectionIndex = isValidNumber(sectionIndex) ? Math.max(0, Math.floor(sectionIndex)) : 0;
  const safeTheme = theme || DEFAULT_THEME;
  
  // Safe animation value creation helper
  const createSafeAnimatedValueForSection = useCallback((initialValue: number) => {
    try {
      return new Animated.Value(isValidNumber(initialValue) ? initialValue : 0);
    } catch (error) {
      console.warn('Failed to create animated value for section, using fallback:', error);
      return new Animated.Value(0);
    }
  }, []);

  const [isExpanded, setIsExpanded] = React.useState(safeSection.initiallyExpanded);
  const heightAnim = useRef(createSafeAnimatedValueForSection(safeSection.initiallyExpanded ? 1 : 0)).current;
  const rotationAnim = useRef(createSafeAnimatedValueForSection(safeSection.initiallyExpanded ? 1 : 0)).current;
  const fadeAnim = useRef(createSafeAnimatedValueForSection(0)).current;

  // Safe animation execution helper
  const executeSafeAnimation = useCallback((animation: Animated.CompositeAnimation | null) => {
    try {
      if (animation) {
        animation.start();
      }
    } catch (error) {
      console.warn('Section animation execution failed:', error);
    }
  }, []);

  useEffect(() => {
    try {
      // Section entry animation with safe delay
      const delay = Math.max(0, safeSectionIndex * 100);
      const timeoutId = setTimeout(() => {
        const fadeAnimation = Animated.timing(fadeAnim, {
          toValue: 1,
          duration: SAFE_ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
          useNativeDriver: true,
        });
        executeSafeAnimation(fadeAnimation);
      }, delay);

      return () => {
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.warn('Section entry animation setup failed:', error);
    }
  }, [safeSectionIndex, fadeAnim, executeSafeAnimation]);

  const toggleExpanded = useCallback(() => {
    try {
      if (!safeSection.collapsible) return;

      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);

      const expandAnimation = Animated.parallel([
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
      ]);
      executeSafeAnimation(expandAnimation);
    } catch (error) {
      console.warn('Toggle expand failed:', error);
    }
  }, [safeSection.collapsible, isExpanded, heightAnim, rotationAnim, executeSafeAnimation]);

  // Safe item press handler
  const handleItemPress = useCallback((item: MenuItem, itemIndex: number) => {
    try {
      if (typeof onItemPress === 'function') {
        onItemPress(item, itemIndex);
      }
    } catch (error) {
      console.warn('Item press handler failed:', error);
    }
  }, [onItemPress]);

  // Safe rotation calculation
  const rotation = React.useMemo(() => {
    try {
      return rotationAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '180deg'],
      });
    } catch (error) {
      console.warn('Rotation interpolation failed:', error);
      return rotationAnim; // Fallback to the raw animated value
    }
  }, [rotationAnim]);

  return (
    <Animated.View style={[styles.menuSection, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={[styles.sectionHeader, !safeSection.collapsible && styles.sectionHeaderStatic]}
        onPress={toggleExpanded}
        disabled={!safeSection.collapsible}
        activeOpacity={safeSection.collapsible ? 0.7 : 1}
      >
        <Text style={[styles.sectionTitle, { color: safeTheme?.colors?.textSecondary || DEFAULT_THEME.colors.textSecondary }]}>
          {safeSection.title}
        </Text>
        {safeSection.collapsible && (
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <MaterialCommunityIcons 
              name="chevron-down" 
              size={20} 
              color={safeTheme?.colors?.textSecondary || DEFAULT_THEME.colors.textSecondary} 
            />
          </Animated.View>
        )}
      </TouchableOpacity>

      <View style={[styles.menuCard, { backgroundColor: safeTheme?.colors?.surface || DEFAULT_THEME.colors.surface, overflow: 'hidden' }]}>
        <Animated.View
          style={{
            opacity: heightAnim,
            transform: [{
              scaleY: heightAnim
            }],
          }}
        >
        <View style={styles.menuItems}>
          {safeSection.items.map((item, itemIndex) => {
            try {
              return (
                <AnimatedMenuItem
                  key={`${item.label}-${itemIndex}-${safeSectionIndex}`}
                  {...item}
                  index={itemIndex}
                  isLast={itemIndex === safeSection.items.length - 1}
                  theme={safeTheme}
                  onPress={() => handleItemPress(item, itemIndex)}
                />
              );
            } catch (error) {
              console.warn(`Failed to render menu item at index ${itemIndex}:`, error);
              return null;
            }
          }).filter(Boolean)}
        </View>
        </Animated.View>
      </View>
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