import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ModernBottomTabNavigator } from './ModernBottomTabNavigator';
// import { ModernBottomTabNavigator } from './EmergencyBottomTabNavigator';
import AutomationBuilderScreen from '../screens/automation/AutomationBuilderScreen';
import AutomationDetailsScreen from '../screens/automation/AutomationDetailsScreen';
import TemplatesScreen from '../screens/automation/TemplatesScreen';
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
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import PrivacyScreen from '../screens/placeholder/PrivacyScreen';
import TermsScreen from '../screens/placeholder/TermsScreen';
import HelpScreen from '../screens/placeholder/HelpScreen';
import DocsScreen from '../screens/placeholder/DocsScreen';
import FAQScreen from '../screens/placeholder/FAQScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import EmailPreferencesScreen from '../screens/settings/EmailPreferencesScreen';
import PrivacyPolicyScreen from '../screens/placeholder/PrivacyPolicyScreen';
import ScannerScreen from '../screens/modern/ScannerScreen';
import { RootStackParamList } from './types';
import { EventLogger } from '../utils/EventLogger';
import { NavigationErrorBoundary } from '../components/ErrorBoundaries';
import { onboardingManager } from '../utils/OnboardingManager';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Track if this is the first render
let navigatorInitCount = 0;

interface MainNavigatorProps {
  isAuthenticated?: boolean;
}

// Navigation error recovery
let navigationRenderErrors = 0;
const MAX_RENDER_ERRORS = 5;

export const MainNavigator: React.FC<MainNavigatorProps> = ({ isAuthenticated = false }) => {
  navigatorInitCount++;
  if (navigatorInitCount === 1) {
    EventLogger.debug('Navigation', '🚨 MainNavigator starting...');
  }
  
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRecoveringFromError, setIsRecoveringFromError] = useState(false);
  
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        if (navigatorInitCount === 1) {
          EventLogger.debug('Navigation', '🚨 MainNavigator mounted, auth state:', isAuthenticated);
        }
        
        // Clear any previous render errors
        setRenderError(null);
        setIsRecoveringFromError(false);
        
        // Check actual onboarding status
        const hasCompleted = await onboardingManager.hasCompletedOnboarding();
        EventLogger.debug('Navigation', '📱 Onboarding status:', hasCompleted);
        setHasSeenOnboarding(hasCompleted);
        setIsLoading(false);
        
        // Log successful initialization
        EventLogger.debug('Navigation', '✅ MainNavigator initialized successfully');
      } catch (error) {
        EventLogger.error('Navigation', '❌ MainNavigator initialization error:', error as Error);
        // Default to showing main app on error
        setHasSeenOnboarding(true);
        setIsLoading(false);
        handleRenderError('MainNavigator initialization failed');
      }
    };
    
    checkOnboardingStatus();
  }, [isAuthenticated]);
  
  const handleRenderError = (errorMessage: string) => {
    navigationRenderErrors++;
    EventLogger.error('Navigation', 'MainNavigator render error:', new Error(errorMessage), {
      errorCount: navigationRenderErrors,
      maxErrors: MAX_RENDER_ERRORS
    });
    
    if (navigationRenderErrors >= MAX_RENDER_ERRORS) {
      setRenderError('Navigation system requires reset');
      Alert.alert(
        'Navigation Error',
        'The navigation system has encountered repeated errors. Please restart the app.',
        [{ text: 'OK' }]
      );
    } else {
      setRenderError(errorMessage);
      // Auto-recovery after a short delay
      setTimeout(() => {
        if (!isRecoveringFromError) {
          setIsRecoveringFromError(true);
          setRenderError(null);
          EventLogger.debug('Navigation', 'Attempting auto-recovery...');
        }
      }, 2000);
    }
  };
  
  // Show error recovery screen
  if (renderError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f44336', padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: 'bold', marginBottom: 10 }}>Navigation Error</Text>
        <Text style={{ fontSize: 14, color: '#FFFFFF', textAlign: 'center' }}>{renderError}</Text>
        <Text style={{ fontSize: 12, color: '#FFFFFF', marginTop: 10, opacity: 0.8 }}>Error count: {navigationRenderErrors}/{MAX_RENDER_ERRORS}</Text>
      </View>
    );
  }
  
  // Show recovery indicator
  if (isRecoveringFromError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ff9800' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={{ fontSize: 16, color: '#FFFFFF', marginTop: 10 }}>Recovering...</Text>
      </View>
    );
  }
  
  // Fallback loading screen (should rarely be shown)
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6200ee' }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={{ fontSize: 16, color: '#FFFFFF', marginTop: 10 }}>Loading Navigator...</Text>
      </View>
    );
  }
  
  // Wrap navigator in try-catch for render error handling
  try {
    const initialRoute = hasSeenOnboarding ? "MainTabs" : "WelcomeScreen";
    
    return (
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6200ee',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          // Add error handling for screen transitions
          gestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
      <Stack.Screen
        name="MainTabs"
        options={{ 
          headerShown: false 
        }}
      >
        {(props) => (
          // TOUCH FIX: Remove duplicate GestureHandlerRootView to prevent touch blocking
          // The root App.tsx already has GestureHandlerRootView, we don't need another one here
          <NavigationErrorBoundary context="BottomTabNavigator">
            <ModernBottomTabNavigator {...props} />
          </NavigationErrorBoundary>
        )}
      </Stack.Screen>
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
        name="Templates"
        component={TemplatesScreen}
        options={{ title: 'Templates' }}
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
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: 'Reset Password' }}
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
  } catch (error) {
    EventLogger.error('Navigation', '❌ MainNavigator render error:', error as Error);
    handleRenderError('Navigator render failed');
    
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f44336', padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#FFFFFF', fontWeight: 'bold', marginBottom: 10 }}>Navigation Error</Text>
        <Text style={{ fontSize: 14, color: '#FFFFFF', textAlign: 'center' }}>The navigation system failed to render.</Text>
      </View>
    );
  }
};