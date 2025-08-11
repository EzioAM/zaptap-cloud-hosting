import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { linkingService } from '../services/linking/LinkingService';
import { RootStackParamList } from './types';
import { MainNavigator } from './MainNavigator';
import { onboardingManager } from '../utils/OnboardingManager';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { OnboardingFlow } from '../screens/onboarding/OnboardingFlow';
import { NotificationProvider } from '../components/notifications/NotificationProvider';
import { EventLogger } from '../utils/EventLogger';
import { NavigationHelper } from '../services/navigation/NavigationHelper';
import { navigationStateTracker } from '../services/navigation/NavigationStateTracker';

// Error Boundaries and Recovery
import { BaseErrorBoundary, NavigationErrorBoundary } from '../components/ErrorBoundaries';
import { ErrorFallback, LoadingFallback } from '../components/Fallbacks';
import { SafeAnimatedWrapper } from '../components/SafeAnimatedWrapper';

// Track initialization
let appNavigatorInitCount = 0;

// Navigation error recovery state
let navigationErrorCount = 0;
let lastErrorTime = 0;
const MAX_NAVIGATION_ERRORS = 3;
const ERROR_RESET_INTERVAL = 30000; // 30 seconds

// Emergency fallback screen
const EmergencyScreen = React.memo(() => (
  <View style={styles.emergency}>
    <Text style={styles.emergencyText}>Navigation Loading...</Text>
  </View>
));

// Create Native Stack Navigator for Onboarding - fixes touch issues
const OnboardingStack = createNativeStackNavigator();

// Onboarding Navigator Component wrapped with error boundary
const OnboardingNavigator = React.memo(() => {
  console.log('📱 OnboardingNavigator rendering');
  
  return (
    <SafeAnimatedWrapper
      fallbackComponent={
        <View style={styles.emergency}>
          <Text style={styles.emergencyText}>Loading Onboarding...</Text>
        </View>
      }
      onError={(error) => {
        console.error('OnboardingNavigator error:', error);
        EventLogger.error('Navigation', 'OnboardingNavigator error:', error);
      }}
    >
      <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
        <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
        <OnboardingStack.Screen name="OnboardingFlow" component={OnboardingFlow} />
      </OnboardingStack.Navigator>
    </SafeAnimatedWrapper>
  );
});

const AppNavigatorContent = React.memo(() => {
  appNavigatorInitCount++;
  if (appNavigatorInitCount === 1) {
    EventLogger.debug('Navigation', '🚨 AppNavigator rendering...');
  }
  
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Safely get auth state with error handling
  let isAuthenticated = false;
  try {
    const authState = useSelector((state: RootState) => state?.auth);
    isAuthenticated = authState?.isAuthenticated || false;
    if (appNavigatorInitCount === 1) {
      EventLogger.debug('Navigation', '🚨 Auth state:', isAuthenticated);
    }
  } catch (error) {
    EventLogger.error('Navigation', '🚨 Redux selector error:', error as Error);
    // Continue with default values
  }

  // Check onboarding status on mount and periodically
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await onboardingManager.hasCompletedOnboarding();
        setHasCompletedOnboarding(completed);
        if (appNavigatorInitCount === 1) {
          EventLogger.debug('Navigation', '🚨 Onboarding completed:', completed);
        }
      } catch (error) {
        EventLogger.error('Navigation', '🚨 Error checking onboarding status:', error as Error);
        // Default to showing main app on error
        setHasCompletedOnboarding(true);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
    
    // Check periodically for onboarding completion
    const interval = setInterval(checkOnboardingStatus, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Initialize linking service when navigation is ready
  const onReady = useCallback(() => {
    if (appNavigatorInitCount === 1) {
      EventLogger.debug('Navigation', '🚨 Navigation ready');
    }
    // Delay initialization to ensure navigation is fully ready
    setTimeout(() => {
      if (navigationRef.current?.isReady()) {
        try {
          // Initialize NavigationHelper with ref
          NavigationHelper.setNavigationRef(navigationRef.current);
          linkingService.initialize(navigationRef.current);
          EventLogger.debug('Navigation', '✅ Linking service and NavigationHelper initialized');
        } catch (error) {
          EventLogger.error('Navigation', 'Failed to initialize linking service:', error as Error);
        }
      } else {
        EventLogger.warn('Navigation', 'Navigation ref not ready for linking service');
      }
    }, 100);
  }, []);
  
  const onError = useCallback((error: Error) => {
    const now = Date.now();
    
    // Reset error count if enough time has passed
    if (now - lastErrorTime > ERROR_RESET_INTERVAL) {
      navigationErrorCount = 0;
    }
    
    navigationErrorCount++;
    lastErrorTime = now;
    
    EventLogger.error('Navigation', '🚨 Navigation error:', error as Error, {
      errorCount: navigationErrorCount,
      maxErrors: MAX_NAVIGATION_ERRORS,
      timeElapsed: now - lastErrorTime
    });
    
    // Set navigation error state to show user-friendly message
    setNavigationError(error.message || 'Navigation error occurred');
    
    // If we've had too many errors, show recovery options
    if (navigationErrorCount >= MAX_NAVIGATION_ERRORS) {
      Alert.alert(
        'Navigation Issues Detected',
        'The app navigation has encountered repeated errors. Would you like to reset the navigation system?',
        [
          {
            text: 'Continue',
            style: 'cancel',
            onPress: () => setNavigationError(null)
          },
          {
            text: 'Reset Navigation',
            onPress: () => handleNavigationReset()
          }
        ]
      );
    }
  }, []);
  
  const handleNavigationReset = useCallback(() => {
    setIsRecovering(true);
    setNavigationError(null);
    navigationErrorCount = 0;
    lastErrorTime = 0;
    
    EventLogger.info('Navigation', 'Resetting navigation system...');
    
    // Force a navigation reset by clearing and rebuilding state
    setTimeout(() => {
      setIsRecovering(false);
      setHasCompletedOnboarding(true); // Default to main app
      EventLogger.info('Navigation', 'Navigation system reset completed');
    }, 1000);
  }, []);

  // Handle navigation state changes (removed BuildScreen redirect as it's a valid screen)
  const onStateChange = useCallback(() => {
    if (navigationRef.current) {
      const state = navigationRef.current.getRootState();
      const currentRoute = state?.routes[state.index];
      
      // Update navigation state tracker
      navigationStateTracker.updateState(state);
      
      // Log navigation for debugging if needed
      if (__DEV__) {
        EventLogger.debug('Navigation', 'Navigation state changed', { 
          currentRoute: currentRoute?.name,
          currentParams: navigationStateTracker.getCurrentParams(),
          stack: navigationStateTracker.getNavigationStack()
        });
      }
    }
  }, []);
  
  // Comprehensive linking configuration
  const linking = {
    prefixes: [
      'zaptap://',
      'shortcuts-like://', // Legacy support
      'https://zaptap.cloud',
      'https://www.zaptap.cloud',
      'https://shortcutslike.app' // Legacy support
    ],
    config: {
      screens: {
        MainTabs: {
          screens: {
            HomeTab: {
              path: 'home',
              screens: {
                Home: 'index'
              }
            },
            AutomateTab: {
              path: 'automate',
              screens: {
                Automate: 'index',
                BuildScreen: 'build/:id?',
                AutomationDetails: 'details/:automationId'
              }
            },
            ScanTab: {
              path: 'scan',
              screens: {
                Scan: 'index'
              }
            },
            ProfileTab: {
              path: 'profile',
              screens: {
                Profile: 'index',
                Settings: 'settings'
              }
            }
          },
        },
        // Deep link routes
        AutomationExecution: 'automation/:automationId',
        ShareAutomation: 'share/:automationId',
        EmergencyAutomation: 'emergency/:automationId',
        ResetPassword: 'reset-password',
        AuthCallback: 'auth/callback',
        // Onboarding routes
        Welcome: 'welcome',
        OnboardingFlow: 'onboarding'
      },
    },
    // Custom URL parsing for special cases
    getStateFromPath: (path: string, options: any) => {
      // Handle legacy URLs
      if (path.includes('/link/') || path.includes('/run/')) {
        const automationId = path.split('/').pop()?.split('?')[0];
        if (automationId) {
          return {
            routes: [{
              name: 'AutomationExecution',
              params: { automationId }
            }]
          };
        }
      }
      
      // Default parsing
      return options.getStateFromPath(path, options);
    }
  };

  // Show recovery screen if navigation is being reset
  if (isRecovering) {
    return (
      <View style={styles.recovery}>
        <Text style={styles.recoveryText}>Resetting Navigation...</Text>
      </View>
    );
  }
  
  // Show error screen if navigation has persistent errors
  if (navigationError) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorTitle}>Navigation Error</Text>
        <Text style={styles.errorText}>{navigationError}</Text>
      </View>
    );
  }
  
  // Show loading screen while checking onboarding
  if (isCheckingOnboarding) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  try {
    return (
      <NotificationProvider>
        <NavigationContainer 
          ref={navigationRef} 
          onReady={onReady}
          onError={onError}
          onStateChange={onStateChange}
          linking={linking}
          fallback={<EmergencyScreen />}
        >
          {/* Show onboarding navigator if not completed, otherwise show main navigator */}
          {hasCompletedOnboarding === false ? (
            <NavigationErrorBoundary context="OnboardingNavigator">
              <OnboardingNavigator />
            </NavigationErrorBoundary>
          ) : (
            <NavigationErrorBoundary context="MainNavigator">
              <MainNavigator isAuthenticated={isAuthenticated} />
            </NavigationErrorBoundary>
          )}
        </NavigationContainer>
      </NotificationProvider>
    );
  } catch (error) {
    EventLogger.error('Navigation', '🚨 NavigationContainer render error:', error as Error);
    return <EmergencyScreen />;
  }
});

// Main AppNavigator with Error Boundary
export const AppNavigator = React.memo(() => {
  return (
    <BaseErrorBoundary
      context="AppNavigator"
      level="screen"
      onError={(error, errorInfo) => {
        EventLogger.critical('Navigation', 'Critical navigation error', error, {
          componentStack: errorInfo.componentStack,
          navigationState: 'unknown',
          timestamp: new Date().toISOString(),
        });
      }}
      fallback={
        <ErrorFallback
          title="Navigation Error"
          message="The app navigation encountered an error. Please restart the app."
          icon="navigation-outline"
          onRetry={() => {
            // Force app reload
            if (__DEV__) {
              require('react-native').DevSettings?.reload?.();
            }
          }}
          showRetry={__DEV__}
        />
      }
    >
      <AppNavigatorContent />
    </BaseErrorBoundary>
  );
});

AppNavigator.displayName = 'AppNavigator';

const styles = StyleSheet.create({
  emergency: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  emergencyText: {
    fontSize: 18,
    color: '#333',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  recovery: {
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
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f44336',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
  },
});