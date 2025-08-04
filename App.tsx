import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';

// Add logging at the very top
console.log('🚨 App.tsx loading...');

import { store } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
// Using compatibility shim to fix theme-related crashes
import { ThemeCompatibilityProvider } from './src/contexts/ThemeCompatibilityShim';
import { ConnectionProvider } from './src/contexts/ConnectionContext';

console.log('🚨 All imports loaded successfully');

// Emergency Error Boundary
class EmergencyErrorBoundary extends React.Component<
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
    console.error('🚨 CRITICAL ERROR DETAILS:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>🚨 CRITICAL ERROR</Text>
          <Text style={styles.errorText}>
            {this.state.error?.toString() || 'Unknown error'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Using Material Design 3 light theme as a stable fallback
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

export default function App() {
  console.log('🚨 App function starting...');
  
  try {
    return (
      <EmergencyErrorBoundary>
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>App rendering...</Text>
        </View>
        <SafeAreaProvider>
          {console.log('🚨 SafeAreaProvider rendered')}
          <ReduxProvider store={store}>
            {console.log('🚨 ReduxProvider rendered')}
            <PaperProvider theme={paperTheme}>
              {console.log('🚨 PaperProvider rendered')}
              <ThemeCompatibilityProvider>
                {console.log('🚨 ThemeProvider rendered')}
                <ConnectionProvider>
                  {console.log('🚨 ConnectionProvider rendered')}
                  <AppNavigator />
                </ConnectionProvider>
              </ThemeCompatibilityProvider>
            </PaperProvider>
          </ReduxProvider>
        </SafeAreaProvider>
      </EmergencyErrorBoundary>
    );
  } catch (error) {
    console.error('🚨 App render error:', error);
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>RENDER ERROR</Text>
        <Text style={styles.errorText}>{error?.toString()}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: 'red',
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
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  debugContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'yellow',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: 'black',
  },
});