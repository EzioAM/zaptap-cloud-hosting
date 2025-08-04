import React from 'react';
import { View, Text, StyleSheet, Alert, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Progressive restoration imports with error handling
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';

import { emergencyStore } from './src/store/emergency';
import { MainNavigator } from './src/navigation/MainNavigator';

// Simple Paper theme to avoid compatibility issues
const simplePaperTheme = {
  colors: {
    primary: '#6200ee',
    background: '#ffffff',
    surface: '#ffffff',
    accent: '#03dac6',
    error: '#B00020',
    text: '#000000',
    onSurface: '#000000',
    disabled: 'rgba(0, 0, 0, 0.26)',
    placeholder: 'rgba(0, 0, 0, 0.54)',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#ff4444',
  },
};

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; name: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`❌ ${this.props.name} Error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Emergency Status Component
const EmergencyStatus = () => (
  <View style={styles.emergencyBanner}>
    <Text style={styles.emergencyText}>
      🔧 PROGRESSIVE RECOVERY MODE v2 - Redux + Paper + Navigation
    </Text>
  </View>
);

// Fallback components for each layer
const ReduxFallback = () => (
  <View style={styles.fallback}>
    <Text style={styles.fallbackTitle}>❌ Redux Store Failed</Text>
    <Text style={styles.fallbackText}>State management unavailable</Text>
  </View>
);

const PaperFallback = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.fallback}>
    <Text style={styles.fallbackTitle}>❌ React Native Paper Failed</Text>
    <Text style={styles.fallbackText}>Using fallback theming</Text>
    {children}
  </View>
);

const NavigationFallback = () => (
  <View style={styles.fallback}>
    <Text style={styles.fallbackTitle}>❌ Navigation Failed</Text>
    <Text style={styles.fallbackText}>Navigation system unavailable</Text>
  </View>
);

// Standalone App Content (fallback for everything)
const StandaloneApp = () => (
  <View style={styles.container}>
    <Text style={styles.title}>⚠️ STANDALONE MODE</Text>
    <Text style={styles.subtitle}>All systems failed, running basic app</Text>
    
    <View style={styles.status}>
      <Text style={styles.statusText}>
        ✅ React Native: Working{'\n'}
        ✅ SafeAreaProvider: Working{'\n'}
        ❌ Redux: Failed{'\n'}
        ❌ React Native Paper: Failed{'\n'}
        ❌ Navigation: Failed
      </Text>
    </View>
  </View>
);

export default function App() {
  const [appReady, setAppReady] = React.useState(false);

  React.useEffect(() => {
    // Initialize app with timeout protection
    const initTimeout = setTimeout(() => {
      console.warn('⚠️ App initialization timed out, proceeding anyway');
      setAppReady(true);
    }, 3000);

    const initializeApp = async () => {
      try {
        console.log('🚀 Starting progressive app restoration...');
        
        // Brief delay to ensure all modules are loaded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('✅ App initialization complete');
        setAppReady(true);
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        setAppReady(true); // Still proceed to show error boundaries
      } finally {
        clearTimeout(initTimeout);
      }
    };

    initializeApp();

    return () => clearTimeout(initTimeout);
  }, []);

  if (!appReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>🔧 Initializing Recovery...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <EmergencyStatus />
      
      <ErrorBoundary name="Redux Store" fallback={<StandaloneApp />}>
        <ReduxProvider store={emergencyStore}>
          <ErrorBoundary name="React Native Paper" fallback={<PaperFallback><ReduxFallback /></PaperFallback>}>
            <PaperProvider theme={simplePaperTheme}>
              <ErrorBoundary name="Navigation" fallback={<NavigationFallback />}>
                <NavigationContainer>
                  <MainNavigator />
                </NavigationContainer>
              </ErrorBoundary>
            </PaperProvider>
          </ErrorBoundary>
        </ReduxProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // Loading screen
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },

  // Emergency banner
  emergencyBanner: {
    backgroundColor: '#ff9800',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emergencyText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Fallback screens
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Original emergency app styles
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  status: {
    backgroundColor: '#e8f5e8',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    minWidth: '80%',
  },
  statusText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 22,
  },
  instructions: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    minWidth: '80%',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#bf360c',
    lineHeight: 20,
  },
});