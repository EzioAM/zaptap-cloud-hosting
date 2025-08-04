import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider } from 'react-native-paper';

import { store } from './src/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { UnifiedThemeProvider } from './src/contexts/UnifiedThemeProvider';

// Clean Paper theme configuration
const paperTheme = {
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

export default function App() {
  return (
    <SafeAreaProvider>
      <ReduxProvider store={store}>
        <PaperProvider theme={paperTheme}>
          <UnifiedThemeProvider>
            <AppNavigator />
          </UnifiedThemeProvider>
        </PaperProvider>
      </ReduxProvider>
    </SafeAreaProvider>
  );
}