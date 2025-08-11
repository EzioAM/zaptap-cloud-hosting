import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { WelcomeScreen } from './src/screens/onboarding/WelcomeScreen';

// PHASE 8 - ADDING Paper Provider
// Testing if React Native Paper blocks touches

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6200ee" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

export default function App() {
  const [store, setStore] = useState<any>(null);
  
  useEffect(() => {
    console.log('🚀 Phase 8 - Loading Redux Store');
    
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
  
  console.log('🚀 Phase 8 - Testing Paper Provider');
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PaperProvider theme={paperTheme}>
            <NavigationContainer>
              <WelcomeScreen />
            </NavigationContainer>
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