import React, { useState, useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ModernBottomTabNavigator } from './ModernBottomTabNavigator';
// import { ModernBottomTabNavigator } from './EmergencyBottomTabNavigator';
import AutomationBuilderScreen from '../screens/automation/AutomationBuilderScreen';
import ModernAutomationBuilder from '../screens/modern/ModernAutomationBuilder';
import AutomationDetailsScreen from '../screens/automation/AutomationDetailsScreen';
import { ExecutionHistoryScreen } from '../screens/ExecutionHistoryScreen';
import TemplatesScreen from '../screens/automation/TemplatesScreen';
import LocationTriggersScreen from '../screens/automation/LocationTriggersScreen';
import ReviewsScreen from '../screens/automation/ReviewsScreen';
import { DeveloperMenuScreen } from '../screens/developer/DeveloperMenuScreen';
// ModernReviewsScreenSafe was removed - using ReviewsScreen instead
import ModernCommentsScreen from '../screens/modern/ModernCommentsScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { OnboardingFlow } from '../screens/onboarding/OnboardingFlow';
import { TutorialScreen } from '../screens/onboarding/TutorialScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import EnhancedSignUpScreen from '../screens/auth/EnhancedSignUpScreen';
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
// import EnhancedSettingsScreen from '../screens/settings/EnhancedSettingsScreen';
import SimpleSettingsScreen from '../screens/settings/SimpleSettingsScreen';
import ScannerScreen from '../screens/modern/ScannerScreen';
// Orphaned screens to be integrated
import SearchScreen from '../screens/discover/SearchScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import MyAutomationsScreen from '../screens/automation/MyAutomationsScreen';
import GalleryScreenWrapper from '../screens/automation/GalleryScreenWrapper';
import { AnalyticsDashboard } from '../screens/profile/AnalyticsDashboard';
// Additional screens to integrate
import NotificationSettings from '../screens/settings/NotificationSettings';
// import SecurityScreen from '../screens/settings/SecurityScreen';
import EnhancedSettingsScreen from '../screens/settings/EnhancedSettingsScreen';
// import AdvancedSettingsScreen from '../screens/settings/AdvancedSettingsScreen';
// import TriggerSettingsScreen from '../screens/settings/TriggerSettingsScreen';
// import IntegrationsScreen from '../screens/settings/IntegrationsScreen';
// import PremiumScreen from '../screens/profile/PremiumScreen';
// import HelpCenterScreen from '../screens/support/HelpCenterScreen';
// import ContactSupportScreen from '../screens/support/ContactSupportScreen';
// import FeedbackScreen from '../screens/support/FeedbackScreen';
// import TutorialsScreen from '../screens/support/TutorialsScreen';
import IoTDashboardScreen from '../screens/IoTDashboardScreen';
// import NotificationsScreen from '../screens/profile/NotificationsScreen';
// import BadgesScreen from '../screens/profile/BadgesScreen';
// import SubscriptionScreen from '../screens/profile/SubscriptionScreen';
// import CommunityScreen from '../screens/community/CommunityScreen';
// import TrendingScreen from '../screens/community/TrendingScreen';
// import ChallengesScreen from '../screens/community/ChallengesScreen';
// import ShareScreen from '../screens/community/ShareScreen';
// import AutomationCatalogScreen from '../screens/automation/AutomationCatalogScreen';
// import SmartSuggestionsScreen from '../screens/automation/SmartSuggestionsScreen';
// import AutomationEditorScreen from '../screens/automation/AutomationEditorScreen';
// import SchedulerScreen from '../screens/automation/SchedulerScreen';
// import TriggerConfigScreen from '../screens/automation/TriggerConfigScreen';
// import ActionLibraryScreen from '../screens/automation/ActionLibraryScreen';
// import IntegrationHubScreen from '../screens/integrations/IntegrationHubScreen';
// import APIKeyManagementScreen from '../screens/integrations/APIKeyManagementScreen';
// import WebhookManagerScreen from '../screens/integrations/WebhookManagerScreen';
// import CloudSyncScreen from '../screens/integrations/CloudSyncScreen';
// import BackupRestoreScreen from '../screens/integrations/BackupRestoreScreen';
// import AnalyticsDetailScreen from '../screens/analytics/AnalyticsDetailScreen';
// import PerformanceMetricsScreen from '../screens/analytics/PerformanceMetricsScreen';
// import UsageStatsScreen from '../screens/analytics/UsageStatsScreen';
// import AutomationInsightsScreen from '../screens/analytics/AutomationInsightsScreen';
// import ReportsScreen from '../screens/analytics/ReportsScreen';
// import NFCWriterScreen from '../screens/nfc/NFCWriterScreen';
// import NFCReaderScreen from '../screens/nfc/NFCReaderScreen';
// import NFCManagementScreen from '../screens/nfc/NFCManagementScreen';
// import QRGeneratorScreen from '../screens/qr/QRGeneratorScreen';
// import QRManagementScreen from '../screens/qr/QRManagementScreen';
// import DeploymentManagerScreen from '../screens/deployment/DeploymentManagerScreen';
// import AccessControlScreen from '../screens/deployment/AccessControlScreen';
// import SharingSettingsScreen from '../screens/deployment/SharingSettingsScreen';
// import OnboardingCustomizationScreen from '../screens/onboarding/OnboardingCustomizationScreen';
// import FirstAutomationGuideScreen from '../screens/onboarding/FirstAutomationGuideScreen';
// import InteractiveTutorialScreen from '../screens/onboarding/InteractiveTutorialScreen';
import GalleryScreenFixed from '../screens/automation/GalleryScreenFixed';
import { AutomationTestScreen } from '../screens/AutomationTestScreen';

// Placeholder component for screens that don't exist yet
const PlaceholderScreen = ({ route }: any) => {
  const React = require('react');
  const { View, Text, StyleSheet } = require('react-native');
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderTitle}>{route.name}</Text>
      <Text style={styles.placeholderText}>Coming Soon</Text>
    </View>
  );
};

const styles = {
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
  },
};
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
        name="ModernAutomationBuilder"
        component={ModernAutomationBuilder}
        options={{ headerShown: false }}
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
        name="ExecutionHistory"
        component={ExecutionHistoryScreen}
        options={{ title: 'Execution History' }}
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
        name="AutomationTest"
        component={AutomationTestScreen}
        options={{ title: 'Automation Test' }}
      />
      <Stack.Screen
        name="ModernReviews"
        component={ReviewsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ModernComments"
        component={ModernCommentsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SimpleSettingsScreen}
        options={{ headerShown: false }}
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
        component={EnhancedSignUpScreen}
        options={{ headerShown: false }}
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
        options={{ headerShown: false }}
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
      {/* Newly integrated orphaned screens */}
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Search' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{ title: 'Analytics' }}
      />
      <Stack.Screen
        name="MyAutomations"
        component={MyAutomationsScreen}
        options={{ title: 'My Automations' }}
      />
      <Stack.Screen
        name="Gallery"
        component={GalleryScreenWrapper}
        options={{ title: 'Gallery' }}
      />
      <Stack.Screen
        name="AnalyticsDashboard"
        component={AnalyticsDashboard}
        options={{ title: 'Analytics Dashboard' }}
      />
      {/* Settings Screens */}
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettings}
        options={{ title: 'Notification Settings' }}
      />
      <Stack.Screen
        name="SecuritySettings"
        component={PlaceholderScreen}
        options={{ title: 'Security Settings' }}
      />
      <Stack.Screen
        name="EnhancedSettings"
        component={EnhancedSettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdvancedSettings"
        component={PlaceholderScreen}
        options={{ title: 'Advanced Settings' }}
      />
      <Stack.Screen
        name="TriggerSettings"
        component={PlaceholderScreen}
        options={{ title: 'Trigger Settings' }}
      />
      <Stack.Screen
        name="IntegrationsSettings"
        component={PlaceholderScreen}
        options={{ title: 'Integrations' }}
      />
      {/* Profile Screens */}
      <Stack.Screen
        name="Premium"
        component={PlaceholderScreen}
        options={{ title: 'Premium' }}
      />
      <Stack.Screen
        name="Notifications"
        component={PlaceholderScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="Badges"
        component={PlaceholderScreen}
        options={{ title: 'Badges' }}
      />
      <Stack.Screen
        name="Subscription"
        component={PlaceholderScreen}
        options={{ title: 'Subscription' }}
      />
      {/* Support Screens */}
      <Stack.Screen
        name="HelpCenter"
        component={PlaceholderScreen}
        options={{ title: 'Help Center' }}
      />
      <Stack.Screen
        name="ContactSupport"
        component={PlaceholderScreen}
        options={{ title: 'Contact Support' }}
      />
      <Stack.Screen
        name="Feedback"
        component={PlaceholderScreen}
        options={{ title: 'Feedback' }}
      />
      <Stack.Screen
        name="Tutorials"
        component={PlaceholderScreen}
        options={{ title: 'Tutorials' }}
      />
      {/* IoT Screen */}
      <Stack.Screen
        name="IoTDashboard"
        component={IoTDashboardScreen}
        options={{ title: 'IoT Dashboard' }}
      />
      {/* Community Screens */}
      <Stack.Screen
        name="Community"
        component={PlaceholderScreen}
        options={{ title: 'Community' }}
      />
      <Stack.Screen
        name="Trending"
        component={PlaceholderScreen}
        options={{ title: 'Trending' }}
      />
      <Stack.Screen
        name="Challenges"
        component={PlaceholderScreen}
        options={{ title: 'Challenges' }}
      />
      <Stack.Screen
        name="Share"
        component={PlaceholderScreen}
        options={{ title: 'Share' }}
      />
      {/* Automation Screens */}
      <Stack.Screen
        name="AutomationCatalog"
        component={PlaceholderScreen}
        options={{ title: 'Automation Catalog' }}
      />
      <Stack.Screen
        name="SmartSuggestions"
        component={PlaceholderScreen}
        options={{ title: 'Smart Suggestions' }}
      />
      <Stack.Screen
        name="AutomationEditor"
        component={PlaceholderScreen}
        options={{ title: 'Automation Editor' }}
      />
      <Stack.Screen
        name="Scheduler"
        component={PlaceholderScreen}
        options={{ title: 'Scheduler' }}
      />
      <Stack.Screen
        name="TriggerConfig"
        component={PlaceholderScreen}
        options={{ title: 'Trigger Configuration' }}
      />
      <Stack.Screen
        name="ActionLibrary"
        component={PlaceholderScreen}
        options={{ title: 'Action Library' }}
      />
      <Stack.Screen
        name="GalleryFixed"
        component={GalleryScreenFixed}
        options={{ title: 'Gallery' }}
      />
      {/* Integration Screens */}
      <Stack.Screen
        name="IntegrationHub"
        component={PlaceholderScreen}
        options={{ title: 'Integration Hub' }}
      />
      <Stack.Screen
        name="APIKeyManagement"
        component={PlaceholderScreen}
        options={{ title: 'API Key Management' }}
      />
      <Stack.Screen
        name="WebhookManager"
        component={PlaceholderScreen}
        options={{ title: 'Webhook Manager' }}
      />
      <Stack.Screen
        name="CloudSync"
        component={PlaceholderScreen}
        options={{ title: 'Cloud Sync' }}
      />
      <Stack.Screen
        name="BackupRestore"
        component={PlaceholderScreen}
        options={{ title: 'Backup & Restore' }}
      />
      {/* Analytics Screens */}
      <Stack.Screen
        name="AnalyticsDetail"
        component={PlaceholderScreen}
        options={{ title: 'Analytics Detail' }}
      />
      <Stack.Screen
        name="PerformanceMetrics"
        component={PlaceholderScreen}
        options={{ title: 'Performance Metrics' }}
      />
      <Stack.Screen
        name="UsageStats"
        component={PlaceholderScreen}
        options={{ title: 'Usage Statistics' }}
      />
      <Stack.Screen
        name="AutomationInsights"
        component={PlaceholderScreen}
        options={{ title: 'Automation Insights' }}
      />
      <Stack.Screen
        name="Reports"
        component={PlaceholderScreen}
        options={{ title: 'Reports' }}
      />
      {/* NFC Screens */}
      <Stack.Screen
        name="NFCWriter"
        component={PlaceholderScreen}
        options={{ title: 'NFC Writer' }}
      />
      <Stack.Screen
        name="NFCReader"
        component={PlaceholderScreen}
        options={{ title: 'NFC Reader' }}
      />
      <Stack.Screen
        name="NFCManagement"
        component={PlaceholderScreen}
        options={{ title: 'NFC Management' }}
      />
      {/* QR Screens */}
      <Stack.Screen
        name="QRGenerator"
        component={PlaceholderScreen}
        options={{ title: 'QR Generator' }}
      />
      <Stack.Screen
        name="QRManagement"
        component={PlaceholderScreen}
        options={{ title: 'QR Management' }}
      />
      {/* Deployment Screens */}
      <Stack.Screen
        name="DeploymentManager"
        component={PlaceholderScreen}
        options={{ title: 'Deployment Manager' }}
      />
      <Stack.Screen
        name="AccessControl"
        component={PlaceholderScreen}
        options={{ title: 'Access Control' }}
      />
      <Stack.Screen
        name="SharingSettings"
        component={PlaceholderScreen}
        options={{ title: 'Sharing Settings' }}
      />
      {/* Onboarding Screens */}
      <Stack.Screen
        name="OnboardingCustomization"
        component={PlaceholderScreen}
        options={{ title: 'Customize Onboarding' }}
      />
      <Stack.Screen
        name="FirstAutomationGuide"
        component={PlaceholderScreen}
        options={{ title: 'First Automation Guide' }}
      />
      <Stack.Screen
        name="InteractiveTutorial"
        component={PlaceholderScreen}
        options={{ title: 'Interactive Tutorial' }}
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