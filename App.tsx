import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { ActivityIndicator } from 'react-native';
import { store, persistor } from './src/store';
import { AppNavigator } from './src/navigation';
import { RemoteDebugger } from './src/components/debug/RemoteDebugger';
import { AuthInitializer } from './src/components/auth/AuthInitializer';

export default function App() {
  return (
    <ReduxProvider store={store}>
      <PersistGate loading={<ActivityIndicator />} persistor={persistor}>
        <PaperProvider>
          <AuthInitializer>
            <AppNavigator />
            <RemoteDebugger />
          </AuthInitializer>
        </PaperProvider>
      </PersistGate>
    </ReduxProvider>
  );
}