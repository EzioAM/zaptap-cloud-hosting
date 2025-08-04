import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModernBottomTabNavigator } from './ModernBottomTabNavigator';
import AutomationBuilderScreen from '../screens/automation/AutomationBuilderScreen';
import AutomationDetailsScreen from '../screens/automation/AutomationDetailsScreen';
import LocationTriggersScreen from '../screens/automation/LocationTriggersScreen';
import ReviewsScreen from '../screens/automation/ReviewsScreen';
import { DeveloperMenuScreen } from '../screens/developer/DeveloperMenuScreen';
import ModernReviewsScreen from '../screens/modern/ModernReviewsScreen';
import ModernCommentsScreen from '../screens/modern/ModernCommentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { TutorialScreen } from '../screens/onboarding/TutorialScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const MainNavigator = () => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean>(false); // Default false
  
  React.useEffect(() => {
    // Check onboarding status asynchronously - don't block rendering
    checkOnboardingStatus();
  }, []);
  
  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      setHasSeenOnboarding(hasSeenOnboarding === 'true');
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Keep default false - user will see onboarding
    }
  };
  
  // Always render - onboarding check is non-blocking
  
  return (
    <Stack.Navigator
      initialRouteName={hasSeenOnboarding ? "MainTabs" : "WelcomeScreen"}
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
        name="MainTabs"
        component={ModernBottomTabNavigator}
        options={{ 
          headerShown: false 
        }}
      />
      <Stack.Screen
        name="AutomationBuilder"
        component={AutomationBuilderScreen}
        options={{ title: 'Build Automation' }}
      />
      <Stack.Screen
        name="AutomationDetails"
        component={AutomationDetailsScreen}
        options={{ title: 'Automation Details' }}
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
      <Stack.Screen
        name="ModernReviews"
        component={ModernReviewsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ModernComments"
        component={ModernCommentsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="WelcomeScreen"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TutorialScreen"
        component={TutorialScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: 'Sign Up' }}
      />
    </Stack.Navigator>
  );
};