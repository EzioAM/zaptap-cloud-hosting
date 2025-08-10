import React, { useRef, useEffect, useCallback, useMemo } from 'react';
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

// Defensive dimension access with fallbacks
const getScreenWidth = (): number => {
  try {
    const dimensions = Dimensions.get('window');
    return dimensions?.width || 375; // iPhone fallback width
  } catch (error) {
    console.warn('Failed to get screen width, using fallback:', error);
    return 375;
  }
};

const screenWidth = getScreenWidth();

// Type guards
const isValidNumber = (value: unknown): value is number => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

const isValidString = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

const isValidColor = (color: unknown): color is string => {
  return isValidString(color) && (color.startsWith('#') || color.startsWith('rgb') || color.startsWith('hsl') || /^[a-zA-Z]+$/.test(color));
};

// Safe animation configuration with fallbacks
const getSafeAnimationConfig = () => {
  try {
    // Try to import the actual animation config
    const { ANIMATION_CONFIG } = require('../../constants/animations');
    return {
      ENTRY_ANIMATION_DURATION: isValidNumber(ANIMATION_CONFIG?.ENTRY_ANIMATION_DURATION) ? ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION : 600,
      SPRING_TENSION: isValidNumber(ANIMATION_CONFIG?.SPRING_TENSION) ? ANIMATION_CONFIG.SPRING_TENSION : 300,
      SPRING_FRICTION: isValidNumber(ANIMATION_CONFIG?.SPRING_FRICTION) ? ANIMATION_CONFIG.SPRING_FRICTION : 10,
      MICRO_INTERACTION_SCALE: isValidNumber(ANIMATION_CONFIG?.MICRO_INTERACTION_SCALE) ? ANIMATION_CONFIG.MICRO_INTERACTION_SCALE : 0.95,
      HAPTIC_DELAY: isValidNumber(ANIMATION_CONFIG?.HAPTIC_DELAY) ? ANIMATION_CONFIG.HAPTIC_DELAY : 10,
    };
  } catch (error) {
    console.warn('Failed to access animation config, using defaults:', error);
    return {
      ENTRY_ANIMATION_DURATION: 600,
      SPRING_TENSION: 300,
      SPRING_FRICTION: 10,
      MICRO_INTERACTION_SCALE: 0.95,
      HAPTIC_DELAY: 10,
    };
  }
};

const SAFE_ANIMATION_CONFIG = getSafeAnimationConfig();

// Default theme colors with proper fallbacks
const DEFAULT_THEME = {
  colors: {
    text: '#000000',
    textSecondary: '#666666',
    primary: '#2196F3',
    surface: '#FFFFFF',
    background: '#F5F5F5',
  },
} as const;

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

// Simple error boundary wrapper for menu items
interface MenuItemErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MenuItemErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  MenuItemErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{ fallback?: React.ReactNode }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): MenuItemErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('MenuItemErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={[styles.menuItem, styles.errorItem]}>
          <View style={styles.menuItemContent}>
            <View style={styles.menuItemLeft}>
              <View style={styles.iconContainer}>
                <View style={[styles.iconGradient, { backgroundColor: '#ff444420' }]}>
                  <MaterialCommunityIcons 
                    name="alert-circle" 
                    size={24} 
                    color="#ff4444"
                  />
                </View>
              </View>
              <View style={styles.textContent}>
                <Text style={[styles.menuItemLabel, { color: '#ff4444' }]}>
                  Error loading menu item
                </Text>
                <Text style={[styles.menuItemDescription, { color: '#666666' }]}>
                  This item could not be displayed
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export const SafeAnimatedMenuItem: React.FC<AnimatedMenuItemProps> = (props) => {
  // Defensive prop validation with early return for invalid props
  if (!props || typeof props !== 'object') {
    return null;
  }

  const {
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
  } = props;

  // Defensive prop validation
  const safeIcon = isValidString(icon) ? icon : 'help-circle';
  const safeLabel = isValidString(label) ? label : 'Menu Item';
  const safeIndex = isValidNumber(index) ? Math.max(0, Math.floor(index)) : 0;
  const safeType = type === 'switch' || type === 'destructive' ? type : 'normal';
  const safeDisabled = Boolean(disabled);
  const safeIsLast = Boolean(isLast);
  
  // Safe theme access with fallbacks
  const safeTheme = useMemo(() => ({
    colors: {
      text: isValidColor(theme?.colors?.text) ? theme.colors.text : DEFAULT_THEME.colors.text,
      textSecondary: isValidColor(theme?.colors?.textSecondary) ? theme.colors.textSecondary : DEFAULT_THEME.colors.textSecondary,
      primary: isValidColor(theme?.colors?.primary) ? theme.colors.primary : DEFAULT_THEME.colors.primary,
      surface: isValidColor(theme?.colors?.surface) ? theme.colors.surface : DEFAULT_THEME.colors.surface,
      background: isValidColor(theme?.colors?.background) ? theme.colors.background : DEFAULT_THEME.colors.background,
    },
  }), [theme]);

  // Safe animation value creation with error handling
  const createSafeAnimatedValue = useCallback((initialValue: number) => {
    try {
      return new Animated.Value(isValidNumber(initialValue) ? initialValue : 0);
    } catch (error) {
      console.warn('Failed to create animated value, using fallback:', error);
      return new Animated.Value(0);
    }
  }, []);

  const fadeAnim = useRef(createSafeAnimatedValue(0)).current;
  const slideAnim = useRef(createSafeAnimatedValue(30)).current;
  const scaleAnim = useRef(createSafeAnimatedValue(1)).current;
  const rippleAnim = useRef(createSafeAnimatedValue(0)).current;
  const rippleOpacity = useRef(createSafeAnimatedValue(0)).current;
  const badgeAnim = useRef(createSafeAnimatedValue(0)).current;
  const rippleScale = useRef(createSafeAnimatedValue(0)).current;
  
  const [ripplePosition, setRipplePosition] = React.useState({ x: 0, y: 0 });

  // Safe animation execution with error handling
  const executeAnimation = useCallback((animation: Animated.CompositeAnimation | null) => {
    try {
      if (animation) {
        animation.start();
      }
    } catch (error) {
      console.warn('Animation execution failed:', error);
    }
  }, []);

  useEffect(() => {
    try {
      // Entry animation with safe delay calculation
      const delay = Math.max(0, safeIndex * 50);
      
      const timeoutId = setTimeout(() => {
        const entryAnimation = Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: SAFE_ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: SAFE_ANIMATION_CONFIG.ENTRY_ANIMATION_DURATION,
            useNativeDriver: true,
          }),
        ]);
        executeAnimation(entryAnimation);
      }, delay);

      // Badge animation if present
      if (badge !== undefined && badge !== null) {
        const badgeAnimation = Animated.spring(badgeAnim, {
          toValue: 1,
          delay: delay + 200,
          tension: SAFE_ANIMATION_CONFIG.SPRING_TENSION,
          friction: SAFE_ANIMATION_CONFIG.SPRING_FRICTION,
          useNativeDriver: true,
        });
        executeAnimation(badgeAnimation);
      }

      return () => {
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.warn('Entry animation setup failed:', error);
    }
  }, [safeIndex, badge, fadeAnim, slideAnim, badgeAnim, executeAnimation]);

  const handlePressIn = useCallback((event: any) => {
    try {
      if (safeDisabled || safeType === 'switch') return;

      // Safe haptic feedback
      if (Platform.OS !== 'web') {
        try {
          Vibration.vibrate(SAFE_ANIMATION_CONFIG.HAPTIC_DELAY);
        } catch (hapticError) {
          // Haptic feedback not supported, continue silently
        }
      }

      // Safe touch position extraction
      let touchX = 0;
      let touchY = 0;
      
      if (event?.nativeEvent) {
        touchX = isValidNumber(event.nativeEvent.locationX) ? event.nativeEvent.locationX : 0;
        touchY = isValidNumber(event.nativeEvent.locationY) ? event.nativeEvent.locationY : 0;
      }
      
      setRipplePosition({ x: touchX, y: touchY });

      // Safe scale animation
      const scaleAnimation = Animated.spring(scaleAnim, {
        toValue: SAFE_ANIMATION_CONFIG.MICRO_INTERACTION_SCALE,
        tension: SAFE_ANIMATION_CONFIG.SPRING_TENSION,
        friction: SAFE_ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      });
      executeAnimation(scaleAnimation);

      // Safe ripple effect
      try {
        rippleScale.setValue(0);
        rippleOpacity.setValue(1);
        
        const rippleAnimation = Animated.parallel([
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
        ]);
        executeAnimation(rippleAnimation);
      } catch (rippleError) {
        console.warn('Ripple animation failed:', rippleError);
      }
    } catch (error) {
      console.warn('PressIn handler failed:', error);
    }
  }, [safeDisabled, safeType, scaleAnim, rippleScale, rippleOpacity, executeAnimation]);

  const handlePressOut = useCallback(() => {
    try {
      if (safeDisabled || safeType === 'switch') return;

      const resetAnimation = Animated.spring(scaleAnim, {
        toValue: 1,
        tension: SAFE_ANIMATION_CONFIG.SPRING_TENSION,
        friction: SAFE_ANIMATION_CONFIG.SPRING_FRICTION,
        useNativeDriver: true,
      });
      executeAnimation(resetAnimation);
    } catch (error) {
      console.warn('PressOut handler failed:', error);
    }
  }, [safeDisabled, safeType, scaleAnim, executeAnimation]);

  // Safe press handler wrapper
  const handlePress = useCallback(() => {
    try {
      console.log('SafeAnimatedMenuItem handlePress called for:', label);
      if (!safeDisabled && safeType !== 'switch' && typeof onPress === 'function') {
        console.log('Calling onPress for:', label);
        onPress();
      }
    } catch (error) {
      console.warn('Press handler failed:', error);
    }
  }, [onPress, safeDisabled, safeType, label]);

  // Safe switch handler
  const handleSwitchChange = useCallback((newValue: boolean) => {
    try {
      if (!safeDisabled && typeof onValueChange === 'function') {
        onValueChange(Boolean(newValue));
      }
    } catch (error) {
      console.warn('Switch change handler failed:', error);
    }
  }, [onValueChange, safeDisabled]);

  // Safe color calculation with proper fallbacks
  const getIconColor = useCallback(() => {
    if (safeDisabled) return '#cccccc';
    if (safeType === 'destructive') return '#ff4444';
    return safeTheme.colors.text;
  }, [safeDisabled, safeType, safeTheme.colors.text]);

  const getLabelColor = useCallback(() => {
    if (safeDisabled) return '#cccccc';
    if (safeType === 'destructive') return '#ff4444';
    return safeTheme.colors.text;
  }, [safeDisabled, safeType, safeTheme.colors.text]);

  const iconColor = getIconColor();
  const labelColor = getLabelColor();

  // Safe badge rendering
  const renderBadge = useCallback(() => {
    if (badge === undefined || badge === null) return null;
    
    let badgeContent = '';
    if (typeof badge === 'number') {
      badgeContent = badge > 99 ? '99+' : badge.toString();
    } else if (typeof badge === 'string') {
      badgeContent = badge;
    } else {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.badge,
          {
            backgroundColor: safeTheme.colors.primary,
            opacity: badgeAnim,
            transform: [{ scale: badgeAnim }],
          },
        ]}
      >
        <Text style={styles.badgeText}>
          {badgeContent}
        </Text>
      </Animated.View>
    );
  }, [badge, badgeAnim, safeTheme.colors.primary]);

  return (
    <MenuItemErrorBoundary>
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
    </MenuItemErrorBoundary>
  );
};

// Safe section validation
const validateSection = (section: any): {
  title: string;
  items: MenuItem[];
  collapsible: boolean;
  initiallyExpanded: boolean;
} => {
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

export const SafeAnimatedMenuSection: React.FC<AnimatedMenuSectionProps> = ({
  section,
  sectionIndex,
  theme,
  onItemPress,
}) => {
  // Defensive prop validation
  const safeSection = useMemo(() => validateSection(section), [section]);
  const safeSectionIndex = isValidNumber(sectionIndex) ? Math.max(0, Math.floor(sectionIndex)) : 0;
  const safeTheme = theme || DEFAULT_THEME;
  
  // Early return for empty sections
  if (!safeSection.items || safeSection.items.length === 0) {
    return null;
  }

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
      // Call the custom handler if provided
      if (typeof onItemPress === 'function') {
        onItemPress(item, itemIndex);
      }
      // Also call the item's own onPress if it exists
      if (typeof item.onPress === 'function') {
        item.onPress();
      }
    } catch (error) {
      console.warn('Item press handler failed:', error);
    }
  }, [onItemPress]);

  // Safe rotation calculation
  const rotation = useMemo(() => {
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
    <MenuItemErrorBoundary fallback={
      <View style={styles.menuSection}>
        <View style={[styles.menuCard, { backgroundColor: DEFAULT_THEME.colors.surface }]}>
          <View style={styles.menuItemContent}>
            <Text style={[styles.menuItemLabel, { color: '#ff4444' }]}>
              Error loading section: {safeSection.title}
            </Text>
          </View>
        </View>
      </View>
    }>
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
                    <SafeAnimatedMenuItem
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
    </MenuItemErrorBoundary>
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
  errorItem: {
    opacity: 0.7,
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