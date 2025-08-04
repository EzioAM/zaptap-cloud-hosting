import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';

import { store } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
// Using compatibility shim to fix theme-related crashes
import { ThemeCompatibilityProvider } from './src/contexts/ThemeCompatibilityShim';

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
  return (
    <SafeAreaProvider>
      <ReduxProvider store={store}>
        <PaperProvider theme={paperTheme}>
          <ThemeCompatibilityProvider>
            <AppNavigator />
          </ThemeCompatibilityProvider>
        </PaperProvider>
      </ReduxProvider>
    </SafeAreaProvider>
  );
}