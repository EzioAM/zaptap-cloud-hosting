import React, { useState, useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Text, Animated } from 'react-native';
import { useSafeTheme } from '../components/common/ThemeFallbackWrapper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventLogger } from '../utils/EventLogger';

// Import consolidated screens
import ModernHomeScreen from '../screens/modern/ModernHomeScreen';
import ModernAutomationBuilder from '../screens/modern/ModernAutomationBuilder';
import DiscoverScreen from '../screens/modern/DiscoverScreen';
import LibraryScreen from '../screens/modern/LibraryScreen';
import ModernProfileScreen from '../screens/modern/ModernProfileScreen';

// Animated Tab Icon Component
const AnimatedTabIcon = ({ focused, color, iconName }: { focused: boolean; color: string; iconName: keyof typeof MaterialCommunityIcons.glyphMap }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    if (focused) {
      // Create subtle vertical bounce animation when tab is focused
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(bounceAnim, {
              toValue: -2.5,  // Bounce up by 2.5px
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(bounceAnim, {
              toValue: 0,  // Return to original position
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.7,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      // Stop animation when not focused
      bounceAnim.stopAnimation();
      opacityAnim.stopAnimation();
      bounceAnim.setValue(0);
      opacityAnim.setValue(0.8);
    }
    
    return () => {
      bounceAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, [focused, bounceAnim, opacityAnim]);
  
  return (
    <View style={styles.iconContainer}>
      <MaterialCommunityIcons 
        name={iconName} 
        size={24} 
        color={color}
      />
      {focused && (
        <Animated.View 
          style={[
            styles.activeIndicator, 
            { 
              backgroundColor: color,
              transform: [{ translateY: bounceAnim }],
              opacity: opacityAnim,
            }
          ]} 
        />
      )}
    </View>
  );
};

const Tab = createBottomTabNavigator();

// Error recovery state
let tabNavigatorErrors = 0;
const MAX_TAB_ERRORS = 3;

export const ModernBottomTabNavigator = () => {
  const [tabError, setTabError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Safely get theme and insets with fallback values
  let theme: any = {};
  let insets = { bottom: 0, top: 0, left: 0, right: 0 };
  
  try {
    theme = useSafeTheme();
  } catch (error) {
    EventLogger.warn('Navigation', 'Failed to get theme context, using defaults:', error);
    theme = {
      colors: {
        primary: '#6200ee',
        onSurfaceVariant: '#9E9E9E',
        surface: '#FFFFFF',
        background: '#FFFFFF',
        outline: '#000000'
      }
    };
  }
  
  try {
    insets = useSafeAreaInsets();
  } catch (error) {
    EventLogger.warn('Navigation', 'Failed to get safe area insets, using defaults:', error);
    insets = { bottom: 20, top: 20, left: 0, right: 0 };
  }
  
  useEffect(() => {
    // Clear any previous errors on mount
    setTabError(null);
    setIsRecovering(false);
    EventLogger.debug('Navigation', 'ModernBottomTabNavigator mounted successfully');
  }, []);
  
  const handleTabError = (errorMessage: string, error?: Error) => {
    tabNavigatorErrors++;
    EventLogger.error('Navigation', 'Tab navigator error:', error || new Error(errorMessage), {
      errorCount: tabNavigatorErrors,
      maxErrors: MAX_TAB_ERRORS
    });
    
    setTabError(errorMessage);
    
    // Auto-recovery for non-critical errors
    if (tabNavigatorErrors < MAX_TAB_ERRORS) {
      setTimeout(() => {
        setIsRecovering(true);
        setTimeout(() => {
          setTabError(null);
          setIsRecovering(false);
        }, 1000);
      }, 2000);
    }
  };
  
  // Show error screen
  if (tabError && !isRecovering) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Tab Navigation Error</Text>
        <Text style={styles.errorText}>{tabError}</Text>
        <Text style={styles.errorCount}>Errors: {tabNavigatorErrors}/{MAX_TAB_ERRORS}</Text>
      </View>
    );
  }
  
  // Show recovery screen
  if (isRecovering) {
    return (
      <View style={styles.recoveryContainer}>
        <Text style={styles.recoveryText}>Recovering Tab Navigation...</Text>
      </View>
    );
  }

  // Wrap navigator in error handling
  try {
    return (
      <Tab.Navigator
        initialRouteName="HomeTab"
        screenOptions={({ route }) => {
          try {
            return {
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: keyof typeof MaterialCommunityIcons.glyphMap;

                switch (route.name) {
                  case 'HomeTab':
                    iconName = focused ? 'home' : 'home-outline';
                    break;
                  case 'BuildTab':
                    iconName = focused ? 'plus-circle' : 'plus-circle-outline';
                    break;
                  case 'DiscoverTab':
                    iconName = focused ? 'compass' : 'compass-outline';
                    break;
                  case 'LibraryTab':
                    iconName = focused ? 'bookmark' : 'bookmark-outline';
                    break;
                  case 'ProfileTab':
                    iconName = focused ? 'account-circle' : 'account-circle-outline';
                    break;
                  default:
                    iconName = 'help-circle';
                }

                try {
                  return (
                    <AnimatedTabIcon 
                      focused={focused} 
                      color={color || '#6200ee'} 
                      iconName={iconName}
                    />
                  );
                } catch (iconError) {
                  EventLogger.warn('Navigation', 'Tab icon render error:', iconError);
                  return (
                    <View style={styles.iconContainer}>
                      <MaterialCommunityIcons 
                        name="help-circle" 
                        size={24} 
                        color={color || '#6200ee'}
                      />
                    </View>
                  );
                }
              },
              tabBarActiveTintColor: theme?.colors?.primary || '#6200ee',
              tabBarInactiveTintColor: theme?.colors?.onSurfaceVariant || '#9E9E9E',
              tabBarStyle: {
                backgroundColor: theme?.colors?.surface || '#FFFFFF',
                borderTopWidth: 0,
                height: Platform.OS === 'ios' ? Math.max(85 + (insets?.bottom || 0), 85) : 70,
                paddingBottom: Platform.OS === 'ios' ? Math.max(insets?.bottom || 0, 10) : 10,
                paddingTop: 10,
                paddingHorizontal: 8,
                elevation: 8,
                shadowColor: theme?.colors?.outline || '#000000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                // CRITICAL TOUCH FIXES: Ensure optimal touch event handling
                pointerEvents: 'auto',
                // Ensure the tab bar is always above other content
                zIndex: 1000,
                // Force proper touch handling
                overflow: 'visible',
              },
              tabBarItemStyle: {
                paddingVertical: 8,
                paddingHorizontal: 4,
                // Ensure proper touch area for tab items (minimum 44pt)
                minHeight: 50,
                minWidth: 50,
                justifyContent: 'center',
                alignItems: 'center',
                // Ensure touch events are handled properly
                flex: 1,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '600',
                marginTop: 4,
              },
              tabBarHideOnKeyboard: true,
              headerShown: false,
              // Optimize for touch responsiveness over performance
              lazy: false,
              unmountOnBlur: false,
              // Ensure all tab interactions work properly
              tabBarAllowFontScaling: false,
              tabBarPressColor: 'rgba(98, 0, 238, 0.2)',
              tabBarPressOpacity: 0.8,
              // Enable better touch feedback
              tabBarButton: undefined, // Use default button behavior
              // Disable potentially blocking optimizations
              detachInactiveScreens: false,
              // Ensure proper touch handling
              tabBarTestID: undefined,
            };
          } catch (screenOptionError) {
            EventLogger.error('Navigation', 'Tab screen options error:', screenOptionError as Error);
            return {
              headerShown: false,
              tabBarIcon: () => <MaterialCommunityIcons name="help-circle" size={24} color="#6200ee" />,
            };
          }
        }}
        sceneContainerStyle={{
          backgroundColor: theme?.colors?.background || '#FFFFFF',
          // Ensure screens don't overlap the tab bar
          paddingBottom: 0,
        }}
    >
      <Tab.Screen
        name="HomeTab"
        component={ModernHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home Tab',
          tabBarAccessibilityHint: 'Navigate to home dashboard',
        }}
      />
      <Tab.Screen
        name="BuildTab"
        component={ModernAutomationBuilder}
        options={{
          tabBarLabel: 'Build',
          tabBarAccessibilityLabel: 'Build Tab',
          tabBarAccessibilityHint: 'Create new automations',
        }}
      />
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverScreen}
        options={{
          tabBarLabel: 'Discover',
          tabBarAccessibilityLabel: 'Discover Tab',
          tabBarAccessibilityHint: 'Browse and search for automations',
        }}
      />
      <Tab.Screen
        name="LibraryTab"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'Library',
          tabBarAccessibilityLabel: 'Library Tab',
          tabBarAccessibilityHint: 'View your saved automations',
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ModernProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarAccessibilityLabel: 'Profile Tab',
          tabBarAccessibilityHint: 'View your profile and settings',
        }}
      />
      </Tab.Navigator>
    );
  } catch (navigatorError) {
    EventLogger.error('Navigation', 'Tab navigator render error:', navigatorError as Error);
    handleTabError('Tab navigator failed to render', navigatorError as Error);
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Tab Navigation Error</Text>
        <Text style={styles.errorText}>Failed to render tab navigator</Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    // Ensure proper touch area (44pt minimum touch target)
    minHeight: 44,
    minWidth: 44,
    // Add padding to ensure touch events are properly captured
    paddingHorizontal: 4,
    paddingVertical: 4,
    // Ensure content is centered within the available space
    flex: 1,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -16,  // Dropped down for better spacing from text
    width: 24,    // Slightly wider for better visibility
    height: 3,
    borderRadius: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f44336',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorCount: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  recoveryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff9800',
  },
  recoveryText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});