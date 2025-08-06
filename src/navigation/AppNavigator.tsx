import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { linkingService } from '../services/linking/LinkingService';
import { RootStackParamList } from './types';
import { MainNavigator } from './MainNavigator';
import { onboardingManager } from '../utils/OnboardingManager';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { NotificationProvider } from '../components/notifications/NotificationProvider';
import { EventLogger } from '../utils/EventLogger';

// Error Boundaries and Recovery
import { BaseErrorBoundary } from '../components/ErrorBoundaries';
import { ErrorFallback, LoadingFallback } from '../components/Fallbacks';
import { useErrorHandler } from '../utils/errorRecovery';

// Track initialization
let appNavigatorInitCount = 0;

// Emergency fallback screen
const EmergencyScreen = React.memo(() => (
  <View style={styles.emergency}>
    <Text style={styles.emergencyText}>Navigation Loading...</Text>
  </View>
));

const AppNavigatorContent = React.memo(() => {
  appNavigatorInitCount++;
  if (appNavigatorInitCount === 1) {
    EventLogger.debug('Navigation', '🚨 AppNavigator rendering...');
  }
  
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  
  try {
    const { isAuthenticated } = useSelector((state: RootState) => state.auth);
    if (appNavigatorInitCount === 1) {
      EventLogger.debug('Navigation', '🚨 Auth state:', isAuthenticated);
    }
  } catch (error) {
    EventLogger.error('Navigation', '🚨 Redux selector error:', error as Error);
  }

  // Check onboarding status on mount
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
          linkingService.initialize(navigationRef.current);
          EventLogger.debug('Navigation', '✅ Linking service initialized');
        } catch (error) {
          EventLogger.error('Navigation', 'Failed to initialize linking service:', error as Error);
        }
      } else {
        EventLogger.warn('Navigation', 'Navigation ref not ready for linking service');
      }
    }, 100);
  }, []);
  
  const onError = useCallback((error: Error) => {
    EventLogger.error('Navigation', '🚨 Navigation error:', error as Error);
  }, []);

  // Handle navigation state changes to intercept and redirect invalid routes
  const onStateChange = useCallback(() => {
    if (navigationRef.current) {
      const state = navigationRef.current.getRootState();
      const currentRoute = state?.routes[state.index];
      
      // Check if trying to navigate to BuildScreen
      if (currentRoute?.name === 'BuildScreen') {
        EventLogger.warn('Navigation', '🚨 Redirecting BuildScreen to AutomationBuilder');
        // Redirect to AutomationBuilder with the same params
        const params = (currentRoute as any).params;
        navigationRef.current.navigate('AutomationBuilder' as never, params as never);
      }
    }
  }, []);
  
  // Simplified linking config
  const linking = {
    prefixes: ['shortcuts-like://', 'https://shortcutslike.app'],
    config: {
      screens: {
        MainTabs: {
          screens: {
            HomeTab: 'home',
          },
        },
      },
    },
  };

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
          {/* Show welcome screen if onboarding not completed, otherwise show main navigator */}
          {hasCompletedOnboarding === false ? <WelcomeScreen /> : <MainNavigator />}
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
});