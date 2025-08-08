import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';

// PHASE 9 - USING AppNavigator instead of direct WelcomeScreen
// Testing if AppNavigator blocks touches

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6200ee" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

export default function App() {
  const [store, setStore] = useState<any>(null);
  
  useEffect(() => {
    console.log('🚀 Phase 9 - Loading Redux Store');
    
    import('./src/store').then(async module => {
      const { createLazyStore } = module;
      const { store } = await createLazyStore();
      setStore(store);
      console.log('✅ Redux Store loaded');
    }).catch(error => {
      console.error('❌ Failed to load Redux store:', error);
    });
  }, []);
  
  if (!store) {
    return <LoadingScreen />;
  }
  
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
  
  console.log('🚀 Phase 9 - Testing AppNavigator');
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PaperProvider theme={paperTheme}>
            <AppNavigator />
          </PaperProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
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