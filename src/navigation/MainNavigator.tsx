import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModernBottomTabNavigator } from './ModernBottomTabNavigator';
// import { ModernBottomTabNavigator } from './EmergencyBottomTabNavigator';
import AutomationBuilderScreen from '../screens/automation/AutomationBuilderScreen';
import AutomationDetailsScreen from '../screens/automation/AutomationDetailsScreen';
import LocationTriggersScreen from '../screens/automation/LocationTriggersScreen';
import ReviewsScreen from '../screens/automation/ReviewsScreen';
import { DeveloperMenuScreen } from '../screens/developer/DeveloperMenuScreen';
import ModernReviewsScreenSafe from '../screens/modern/ModernReviewsScreenSafe';
import ModernCommentsScreen from '../screens/modern/ModernCommentsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { OnboardingFlow } from '../screens/onboarding/OnboardingFlow';
import { TutorialScreen } from '../screens/onboarding/TutorialScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import PrivacyScreen from '../screens/placeholder/PrivacyScreen';
import TermsScreen from '../screens/placeholder/TermsScreen';
import HelpScreen from '../screens/placeholder/HelpScreen';
import DocsScreen from '../screens/placeholder/DocsScreen';
import FAQScreen from '../screens/placeholder/FAQScreen';
import EditProfileScreen from '../screens/placeholder/EditProfileScreen';
import ChangePasswordScreen from '../screens/placeholder/ChangePasswordScreen';
import EmailPreferencesScreen from '../screens/placeholder/EmailPreferencesScreen';
import PrivacyPolicyScreen from '../screens/placeholder/PrivacyPolicyScreen';
import ScannerScreen from '../screens/modern/ScannerScreen';
import { RootStackParamList } from './types';
import { EventLogger } from '../utils/EventLogger';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Track if this is the first render
let navigatorInitCount = 0;

export const MainNavigator = () => {
  navigatorInitCount++;
  if (navigatorInitCount === 1) {
    EventLogger.debug('Navigation', '🚨 MainNavigator starting...');
  }
  
  const [hasSeenOnboarding, setHasSeenOnboarding] = React.useState<boolean | null>(true); // Default to true to skip onboarding
  const [isLoading, setIsLoading] = React.useState(false); // Don't load by default
  
  React.useEffect(() => {
    if (navigatorInitCount === 1) {
      EventLogger.debug('Navigation', '🚨 MainNavigator mounted, skipping onboarding check for emergency recovery');
    }
    // Skip onboarding check entirely for now
    setHasSeenOnboarding(true);
    setIsLoading(false);
  }, []);
  
  // Never show loading screen - go straight to app
  if (isLoading) {
    EventLogger.debug('Navigation', '🚨 MainNavigator in loading state - THIS SHOULD NOT HAPPEN');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FF0000' }}>
        <Text style={{ fontSize: 20, color: '#FFFFFF' }}>STUCK IN LOADING!</Text>
      </View>
    );
  }
  
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
        name="Scanner"
        component={ScannerScreen}
        options={{ headerShown: false }}
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
        component={ModernReviewsScreenSafe}
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
        name="OnboardingFlow"
        component={OnboardingFlow}
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
      <Stack.Screen
        name="Privacy"
        component={PrivacyScreen}
        options={{ title: 'Privacy' }}
      />
      <Stack.Screen
        name="Terms"
        component={TermsScreen}
        options={{ title: 'Terms of Service' }}
      />
      <Stack.Screen
        name="Help"
        component={HelpScreen}
        options={{ title: 'Help Center' }}
      />
      <Stack.Screen
        name="Docs"
        component={DocsScreen}
        options={{ title: 'Documentation' }}
      />
      <Stack.Screen
        name="FAQ"
        component={FAQScreen}
        options={{ title: 'FAQ' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
      <Stack.Screen
        name="EmailPreferences"
        component={EmailPreferencesScreen}
        options={{ title: 'Email Preferences' }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: 'Privacy Policy' }}
      />
    </Stack.Navigator>
  );
};