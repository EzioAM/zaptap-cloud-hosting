import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import ModernHomeScreen from '../screens/modern/ModernHomeScreen';
import BuildScreen from '../screens/modern/BuildScreen';
import DiscoverScreen from '../screens/modern/DiscoverScreen';
import LibraryScreen from '../screens/modern/LibraryScreen';
import ModernProfileScreen from '../screens/modern/ModernProfileScreen';

const Tab = createBottomTabNavigator();

export const ModernBottomTabNavigator = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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

          return (
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name={iconName} 
                size={iconSize} 
                color={color} 
              />
              {focused && <View style={[styles.activeIndicator, { backgroundColor: color }]} />}
            </View>
          );
        },
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 85 + insets.bottom : 65,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
          paddingTop: 10,
          elevation: 0,
          shadowColor: theme.colors.cardShadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        headerShown: false,
      })}
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
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 32,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 20,
    height: 3,
    borderRadius: 2,
  },
});