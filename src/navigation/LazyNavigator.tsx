import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { lazyScreen, PreloadManager } from '../utils/lazyLoad';
import { EventLogger } from '../utils/EventLogger';

// Lazy load all screens with code splitting
const LazyScreens = {
  // Home and Main screens
  Home: lazyScreen(() => import('../screens/HomeScreen'), 'Home'),
  ModernHome: lazyScreen(() => import('../screens/modern/ModernHomeScreen'), 'Modern Home'),
  
  // Automation screens
  MyAutomations: lazyScreen(() => import('../screens/automation/MyAutomationsScreen'), 'My Automations'),
  AutomationBuilder: lazyScreen(() => import('../screens/automation/AutomationBuilderScreen'), 'Automation Builder'),
  AutomationDetails: lazyScreen(() => import('../screens/automation/AutomationDetailsScreen'), 'Automation Details'),
  
  // Modern screens
  Discover: lazyScreen(() => import('../screens/modern/DiscoverScreenSafe'), 'Discover'),
  Library: lazyScreen(() => import('../screens/modern/LibraryScreenSafe'), 'Library'),
  Build: lazyScreen(() => import('../screens/modern/BuildScreenSafe'), 'Build'),
  Profile: lazyScreen(() => import('../screens/modern/ModernProfileScreenSafe'), 'Profile'),
  
  // Review screens
  Reviews: lazyScreen(() => import('../screens/automation/ReviewsScreen'), 'Reviews'),
  ModernReviews: lazyScreen(() => import('../screens/modern/ModernReviewsScreen'), 'Modern Reviews'),
  
  // Comments screen
  ModernComments: lazyScreen(() => import('../screens/modern/ModernCommentsScreen'), 'Comments'),
  
  // Onboarding
  Welcome: lazyScreen(() => import('../screens/onboarding/WelcomeScreen'), 'Welcome'),
  OnboardingFlow: lazyScreen(() => import('../screens/onboarding/OnboardingFlow'), 'Onboarding'),
  
  // Settings screens (lazy loaded on demand)
  Settings: lazyScreen(() => import('../screens/settings/SettingsScreen'), 'Settings'),
  ProfileSettings: lazyScreen(() => import('../screens/profile/ProfileSettingsScreen'), 'Profile Settings'),
  
  // Scanner screen (lazy loaded when needed)
  Scanner: lazyScreen(() => import('../screens/modern/ScannerScreen'), 'Scanner'),
};

// Preload critical screens on app start
export const preloadCriticalScreens = async () => {
  EventLogger.debug('LazyNavigator', 'Preloading critical screens...');
  
  try {
    // Preload only the most critical screens
    await Promise.all([
      import('../screens/HomeScreen'),
      import('../screens/automation/MyAutomationsScreen'),
    ]);
    
    EventLogger.debug('LazyNavigator', 'Critical screens preloaded');
  } catch (error) {
    EventLogger.error('LazyNavigator', 'Failed to preload critical screens', error as Error);
  }
};

// Preload next likely screens based on current route
export const preloadNextScreens = (currentRoute: string) => {
  const preloadMap: Record<string, string[]> = {
    Home: ['MyAutomations', 'Discover'],
    MyAutomations: ['AutomationBuilder', 'AutomationDetails'],
    Discover: ['Library', 'Build'],
    Library: ['AutomationDetails', 'Reviews'],
  };
  
  const screensToPreload = preloadMap[currentRoute] || [];
  
  screensToPreload.forEach(screenName => {
    const screenImport = getScreenImport(screenName);
    if (screenImport) {
      PreloadManager.preloadComponent(screenName, screenImport);
    }
  });
};

// Helper to get import function for a screen
const getScreenImport = (screenName: string): (() => Promise<any>) | null => {
  const importMap: Record<string, () => Promise<any>> = {
    MyAutomations: () => import('../screens/automation/MyAutomationsScreen'),
    AutomationBuilder: () => import('../screens/automation/AutomationBuilderScreen'),
    AutomationDetails: () => import('../screens/automation/AutomationDetailsScreen'),
    Discover: () => import('../screens/modern/DiscoverScreenSafe'),
    Library: () => import('../screens/modern/LibraryScreenSafe'),
    Build: () => import('../screens/modern/BuildScreenSafe'),
    Reviews: () => import('../screens/automation/ReviewsScreen'),
  };
  
  return importMap[screenName] || null;
};

// Create Stack Navigator with lazy screens
const Stack = createNativeStackNavigator();

export const LazyStackNavigator: React.FC = () => {
  useEffect(() => {
    // Preload critical screens on mount
    preloadCriticalScreens();
  }, []);
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // Enable lazy loading
        lazy: true,
        // Optimize animations
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={LazyScreens.Home} />
      <Stack.Screen name="MyAutomations" component={LazyScreens.MyAutomations} />
      <Stack.Screen name="AutomationBuilder" component={LazyScreens.AutomationBuilder} />
      <Stack.Screen name="AutomationDetails" component={LazyScreens.AutomationDetails} />
      <Stack.Screen name="Reviews" component={LazyScreens.Reviews} />
      <Stack.Screen name="ModernReviews" component={LazyScreens.ModernReviews} />
      <Stack.Screen name="ModernComments" component={LazyScreens.ModernComments} />
      <Stack.Screen name="Settings" component={LazyScreens.Settings} />
      <Stack.Screen name="ProfileSettings" component={LazyScreens.ProfileSettings} />
      <Stack.Screen name="Scanner" component={LazyScreens.Scanner} />
    </Stack.Navigator>
  );
};

// Create Tab Navigator with lazy screens
const Tab = createBottomTabNavigator();

export const LazyTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        lazy: true,
        // Optimize tab bar
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={LazyScreens.ModernHome}
        listeners={{
          focus: () => preloadNextScreens('Home'),
        }}
      />
      <Tab.Screen 
        name="DiscoverTab" 
        component={LazyScreens.Discover}
        listeners={{
          focus: () => preloadNextScreens('Discover'),
        }}
      />
      <Tab.Screen 
        name="LibraryTab" 
        component={LazyScreens.Library}
        listeners={{
          focus: () => preloadNextScreens('Library'),
        }}
      />
      <Tab.Screen 
        name="BuildTab" 
        component={LazyScreens.Build}
        listeners={{
          focus: () => preloadNextScreens('Build'),
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={LazyScreens.Profile}
      />
    </Tab.Navigator>
  );
};

// Export individual lazy screens for direct use
export { LazyScreens };