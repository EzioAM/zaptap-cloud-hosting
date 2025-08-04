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
import { UnifiedThemeProvider, useUnifiedTheme } from './src/contexts/UnifiedThemeProvider';
import { ConnectionProvider } from './src/contexts/ConnectionContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Global error handler for uncaught exceptions
if (!__DEV__) {
  global.ErrorUtils?.setGlobalHandler((error, isFatal) => {
    console.error('Global error caught:', error, 'isFatal:', isFatal);
    // In production, you might want to send this to crash reporting
  });
}

// Component to integrate unified theme with Paper
const ThemedPaperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useUnifiedTheme();
  
  // Convert unified theme to Paper theme
  const paperTheme = {
    mode: theme.mode === 'light' ? 'adaptive' as const : 'adaptive' as const,
    version: 3 as const,
    colors: {
      primary: theme.colors.brand.primary,
      onPrimary: theme.colors.text.inverse,
      primaryContainer: theme.colors.brand.primaryLight,
      onPrimaryContainer: theme.colors.text.primary,
      secondary: theme.colors.brand.secondary,
      onSecondary: theme.colors.text.inverse,
      secondaryContainer: theme.colors.surface.secondary,
      onSecondaryContainer: theme.colors.text.primary,
      tertiary: theme.colors.brand.accent,
      onTertiary: theme.colors.text.inverse,
      tertiaryContainer: theme.colors.surface.elevated,
      onTertiaryContainer: theme.colors.text.primary,
      error: theme.colors.semantic.error,
      onError: theme.colors.text.inverse,
      errorContainer: theme.colors.semantic.errorBackground,
      onErrorContainer: theme.colors.text.primary,
      background: theme.colors.background.primary,
      onBackground: theme.colors.text.primary,
      surface: theme.colors.surface.primary,
      onSurface: theme.colors.text.primary,
      surfaceVariant: theme.colors.surface.secondary,
      onSurfaceVariant: theme.colors.text.secondary,
      outline: theme.colors.border.medium,
      outlineVariant: theme.colors.border.light,
      shadow: theme.colors.overlay.dark,
      scrim: theme.colors.overlay.dark,
      inverseSurface: theme.colors.text.primary,
      inverseOnSurface: theme.colors.text.inverse,
      inversePrimary: theme.colors.brand.primaryLight,
      elevation: {
        level0: 'transparent',
        level1: theme.colors.surface.elevated,
        level2: theme.colors.surface.elevated,
        level3: theme.colors.surface.elevated,
        level4: theme.colors.surface.elevated,
        level5: theme.colors.surface.elevated,
      },
      surfaceDisabled: theme.colors.states.disabled,
      onSurfaceDisabled: theme.colors.text.tertiary,
      backdrop: theme.colors.overlay.medium,
    },
  };

  return (
    <PaperProvider theme={paperTheme}>
      {children}
    </PaperProvider>
  );
};

// Loading component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
    <ActivityIndicator size="large" color="#6200ee" />
    <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>Loading...</Text>
  </View>
);

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PersistGate 
            loading={<LoadingScreen />} 
            persistor={persistor}
            onBeforeLift={() => {
              console.log('Redux store rehydrated');
            }}
          >
            <UnifiedThemeProvider>
              <ThemedPaperProvider>
                <ErrorBoundary fallback={<LoadingScreen />}>
                  <ConnectionProvider>
                    <ErrorBoundary fallback={<LoadingScreen />}>
                      <AuthInitializer>
                        <AppNavigator />
                        <RemoteDebugger />
                      </AuthInitializer>
                    </ErrorBoundary>
                  </ConnectionProvider>
                </ErrorBoundary>
              </ThemedPaperProvider>
            </UnifiedThemeProvider>
          </PersistGate>
        </ReduxProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}