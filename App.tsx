// Import crypto polyfill FIRST to support UUID generation in React Native
import 'react-native-get-random-values';

// CRITICAL FIX: Import gesture handler install for React Native
import 'react-native-gesture-handler';

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Direct imports for better performance
import { AppNavigator } from './src/navigation/AppNavigator';
import { ThemeCompatibilityProvider } from './src/contexts/ThemeCompatibilityShim';
import { ConnectionProvider } from './src/contexts/ConnectionContext';
import { AuthInitializer } from './src/components/auth/AuthInitializer';
import { AnalyticsProvider } from './src/contexts/AnalyticsContext';
import { EventLogger } from './src/utils/EventLogger';
import { SafeAppWrapper } from './src/utils/SafeAppWrapper';
import { TextInputOptimizer } from './src/utils/textInputFixes';

// Verify Reanimated is properly configured
try {
  const Reanimated = require('react-native-reanimated');
  if (!Reanimated.useSharedValue) {
    console.error('[App] Reanimated not properly initialized - missing useSharedValue');
  } else {
    console.log('[App] Reanimated configured correctly');
  }
} catch (error) {
  console.error('[App] Failed to load Reanimated:', error);
}

// Initialize services
let servicesInitialized = false;
let storePromise: Promise<any> | null = null;

const initializeStore = async () => {
  if (!storePromise) {
    storePromise = import('./src/store').then(async module => {
      const { createLazyStore } = module;
      const { store } = await createLazyStore();
      return store;
    });
  }
  return storePromise;
};

// Error Boundary for crash protection
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    console.error('🚨 ERROR BOUNDARY CAUGHT:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    EventLogger.critical('App', 'Critical error in root component', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'AppErrorBoundary',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.toString() || 'Unknown error'}
          </Text>
          <Text style={styles.errorHint}>Please restart the app</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Loading component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6200ee" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Emergency fallback component
const EmergencyFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }}>
    <Text style={{ fontSize: 18, color: '#333' }}>App is loading...</Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 10 }}>If this persists, please restart the app</Text>
  </View>
);

// Full app component with all providers
const FullApp: React.FC<{ store: any }> = React.memo(({ store }) => {
  console.log('[App] FullApp rendering, store:', !!store);
  
  // Create Material Design 3 theme
  const paperTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#6200ee',
      secondary: '#03dac6',
      background: '#ffffff',
      surface: '#ffffff',
      error: '#B00020',
    },
  };

  console.log('[App] Rendering providers');
  console.log('🚀 App initialized with full navigation');

  return (
    // GestureHandlerRootView at the root for proper touch handling
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAppWrapper enableProtection={__DEV__} maxRenderCycles={100}>
        <SafeAreaProvider>
          <ReduxProvider store={store}>
            <PaperProvider theme={paperTheme}>
              <ThemeCompatibilityProvider>
                <AuthInitializer>
                  <ConnectionProvider>
                    <AnalyticsProvider
                      config={{
                        environment: __DEV__ ? 'development' : 'production',
                        debugMode: __DEV__,
                        enableCrashReporting: true,
                        enablePerformanceMonitoring: true,
                      }}
                    >
                      <AppNavigator />
                    </AnalyticsProvider>
                  </ConnectionProvider>
                </AuthInitializer>
              </ThemeCompatibilityProvider>
            </PaperProvider>
          </ReduxProvider>
        </SafeAreaProvider>
      </SafeAppWrapper>
    </GestureHandlerRootView>
  );
});

export default function App() {
  console.log('[App] Starting App component');
  
  const [store, setStore] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    
    const initializeApp = async () => {
      try {
        console.log('📱 Initializing ShortcutsLike app...');
        
        // Initialize text input optimizations for iOS
        TextInputOptimizer.initialize();
        
        // Initialize store
        const storeInstance = await initializeStore();
        
        if (!mounted) return;
        
        // Initialize network monitoring
        try {
          const { initializeOfflineSystem } = await import('./src/store/slices/offlineSlice');
          storeInstance.dispatch(initializeOfflineSystem());
          EventLogger.info('App', 'Network monitoring initialized');
        } catch (networkError) {
          console.warn('Network monitoring initialization failed:', networkError);
        }
        
        // Set store and mark initialization complete
        setStore(storeInstance);
        setIsInitializing(false);
        
        console.log('✅ App initialization complete');
        
        // Initialize background services after a delay
        setTimeout(() => {
          if (!servicesInitialized) {
            servicesInitialized = true;
            EventLogger.info('App', 'Background services initialized');
          }
        }, 2000);
        
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
        if (!mounted) return;
        
        // Still allow the app to render with basic functionality
        setInitError(true);
        setIsInitializing(false);
      }
    };
    
    // Small delay to ensure first render completes
    const timeoutId = setTimeout(initializeApp, 16);
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Loading screen while initializing
  if (isInitializing) {
    return (
      <AppErrorBoundary>
        <LoadingScreen />
      </AppErrorBoundary>
    );
  }

  // Render full app with store
  if (store) {
    return (
      <AppErrorBoundary>
        <FullApp store={store} />
      </AppErrorBoundary>
    );
  }

  // Fallback if store failed to load or error occurred
  console.log('[App] Rendering fallback, store:', !!store, 'error:', initError);
  return (
    <AppErrorBoundary>
      <EmergencyFallback />
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  errorHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6200ee',
  },
});