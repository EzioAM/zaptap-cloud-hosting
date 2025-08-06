import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { useUnifiedTheme } from '../contexts/ThemeCompatibilityShim';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventLogger } from '../utils/EventLogger';

// Import consolidated screens
import ModernHomeScreen from '../screens/modern/ModernHomeScreen';
import BuildScreen from '../screens/modern/BuildScreen';
import DiscoverScreen from '../screens/modern/DiscoverScreen';
import LibraryScreen from '../screens/modern/LibraryScreen';
import ModernProfileScreen from '../screens/modern/ModernProfileScreen';

const Tab = createBottomTabNavigator();

// Error recovery state
let tabNavigatorErrors = 0;
const MAX_TAB_ERRORS = 3;

export const ModernBottomTabNavigator = () => {
  const [tabError, setTabError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Safely get theme and insets with fallback values
  let theme = { colors: {} };
  let insets = { bottom: 0, top: 0, left: 0, right: 0 };
  
  try {
    const themeContext = useUnifiedTheme();
    theme = themeContext?.theme || { colors: {} };
  } catch (error) {
    EventLogger.warn('Navigation', 'Failed to get theme context, using defaults:', error);
    theme = {
      colors: {
        brand: { primary: '#6200ee' },
        text: { tertiary: '#9E9E9E' },
        surface: { primary: '#FFFFFF' },
        background: { primary: '#FFFFFF' },
        overlay: { light: '#000000' }
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
                const iconSize = 24;

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
                    <View style={styles.iconContainer}>
                      <MaterialCommunityIcons 
                        name={iconName} 
                        size={iconSize} 
                        color={color || '#6200ee'} 
                      />
                      {focused && <View style={[styles.activeIndicator, { backgroundColor: color || '#6200ee' }]} />}
                    </View>
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
              tabBarActiveTintColor: theme?.colors?.brand?.primary || '#6200ee',
              tabBarInactiveTintColor: theme?.colors?.text?.tertiary || '#9E9E9E',
              tabBarStyle: {
                backgroundColor: theme?.colors?.surface?.primary || '#FFFFFF',
                borderTopWidth: 0,
                height: Platform.OS === 'ios' ? Math.max(85 + (insets?.bottom || 0), 85) : 70,
                paddingBottom: Platform.OS === 'ios' ? Math.max(insets?.bottom || 0, 10) : 10,
                paddingTop: 10,
                paddingHorizontal: 8,
                elevation: 8,
                shadowColor: theme?.colors?.overlay?.light || '#000000',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                // Ensure proper touch handling
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
              },
              tabBarItemStyle: {
                paddingVertical: 5,
              },
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '600',
                marginTop: 4,
              },
              tabBarHideOnKeyboard: true,
              headerShown: false,
              // Improve performance
              lazy: false,
              unmountOnBlur: false,
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
          backgroundColor: theme?.colors?.background?.primary || '#FFFFFF',
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
        component={BuildScreen}
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
    width: 60,
    height: 40,
    // Ensure proper touch area
    minHeight: 44,
    minWidth: 44,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -12,  // Move further down to avoid text overlap
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