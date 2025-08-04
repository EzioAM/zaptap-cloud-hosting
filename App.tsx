import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation';
import { RemoteDebugger } from './src/components/debug/RemoteDebugger';
import { AuthInitializer } from './src/components/auth/AuthInitializer';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { ConnectionProvider } from './src/contexts/ConnectionContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Global error handler for uncaught exceptions
if (!__DEV__) {
  global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
    console.error('Global error caught:', error, 'isFatal:', isFatal);
    // In production, you might want to send this to crash reporting
  });
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PersistGate 
            loading={<ActivityIndicator size="large" color="#6200ee" />} 
            persistor={persistor}
            onBeforeLift={() => {
              console.log('Redux store rehydrated');
            }}
          >
            <PaperProvider>
              <ErrorBoundary fallback={<ActivityIndicator size="large" color="#6200ee" />}>
                <ThemeProvider>
                  <ErrorBoundary fallback={<ActivityIndicator size="large" color="#6200ee" />}>
                    <ConnectionProvider>
                      <ErrorBoundary fallback={<ActivityIndicator size="large" color="#6200ee" />}>
                        <AuthInitializer>
                          <AppNavigator />
                          <RemoteDebugger />
                        </AuthInitializer>
                      </ErrorBoundary>
                    </ConnectionProvider>
                  </ErrorBoundary>
                </ThemeProvider>
              </ErrorBoundary>
            </PaperProvider>
          </PersistGate>
        </ReduxProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}