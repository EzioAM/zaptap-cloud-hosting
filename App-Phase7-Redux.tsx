import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { WelcomeScreen } from './src/screens/onboarding/WelcomeScreen';

// PHASE 7 - ADDING Redux Provider
// Testing if Redux blocks touches

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#6200ee" />
    <Text style={styles.loadingText}>Loading Redux...</Text>
  </View>
);

export default function App() {
  const [store, setStore] = useState<any>(null);
  
  useEffect(() => {
    console.log('🚀 Phase 7 - Loading Redux Store');
    
    // Load store asynchronously
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
  
  console.log('🚀 Phase 7 - Testing Redux Provider');
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <NavigationContainer>
            <WelcomeScreen />
          </NavigationContainer>
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