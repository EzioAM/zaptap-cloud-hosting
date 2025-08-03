import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import AutomationBuilderScreen from '../screens/automation/AutomationBuilderScreen';
import MyAutomationsScreen from '../screens/automation/MyAutomationsScreen';
import GalleryScreen from '../screens/automation/GalleryScreen';
import AutomationDetailsScreen from '../screens/automation/AutomationDetailsScreen';
import TemplatesScreen from '../screens/automation/TemplatesScreen';
import LocationTriggersScreen from '../screens/automation/LocationTriggersScreen';
import ReviewsScreen from '../screens/automation/ReviewsScreen';
import { DeveloperMenuScreen } from '../screens/developer/DeveloperMenuScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const MainNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ 
          title: 'Zaptap',
          headerShown: false 
        }}
      />
      <Stack.Screen
        name="AutomationBuilder"
        component={AutomationBuilderScreen}
        options={{ title: 'Build Automation' }}
      />
      <Stack.Screen
        name="MyAutomations"
        component={MyAutomationsScreen}
        options={{ title: 'My Automations' }}
      />
      <Stack.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{ title: 'Gallery' }}
      />
      <Stack.Screen
        name="AutomationDetails"
        component={AutomationDetailsScreen}
        options={{ title: 'Automation Details' }}
      />
      <Stack.Screen
        name="Templates"
        component={TemplatesScreen}
        options={{ title: 'Templates' }}
      />
      <Stack.Screen
        name="LocationTriggers"
        component={LocationTriggersScreen}
        options={{ title: 'Location Triggers' }}
      />
      <Stack.Screen
        name="Reviews"
        component={ReviewsScreen}
        options={{ title: 'Reviews' }}
      />
      <Stack.Screen
        name="DeveloperMenu"
        component={DeveloperMenuScreen}
        options={{ title: 'Developer Menu' }}
      />
    </Stack.Navigator>
  );
};