import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { HomeScreen } from '../screens/HomeScreen';
import MyAutomationsScreen from '../screens/automation/MyAutomationsScreen';
import GalleryScreen from '../screens/automation/GalleryScreen';
import TemplatesScreen from '../screens/automation/TemplatesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SignInScreen from '../screens/auth/SignInScreen';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e0e0e0',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="MyAutomationsTab"
        component={isAuthenticated ? MyAutomationsScreen : SignInScreen}
        options={{
          title: 'My Automations',
          tabBarLabel: 'My',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="robot" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="GalleryTab"
        component={GalleryScreen}
        options={{
          title: 'Gallery',
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-gallery" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="TemplatesTab"
        component={TemplatesScreen}
        options={{
          title: 'Templates',
          tabBarLabel: 'Templates',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document-multiple" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={isAuthenticated ? ProfileScreen : SignInScreen}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};