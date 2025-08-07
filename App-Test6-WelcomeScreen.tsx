// TEST 6: Testing with actual WelcomeScreen
// This tests if the WelcomeScreen component itself has issues

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAppWrapper } from './src/utils/SafeAppWrapper';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from './src/screens/onboarding/WelcomeScreen';
import { OnboardingFlow } from './src/screens/onboarding/OnboardingFlow';

const Stack = createNativeStackNavigator();

const TestNavigator = () => {
  console.log('🧪 TEST 6: Testing actual WelcomeScreen');
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="OnboardingFlow" component={OnboardingFlow} />
    </Stack.Navigator>
  );
};

const App = () => {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load store asynchronously
    import('./src/store').then(async module => {
      try {
        const { createLazyStore } = module;
        const { store } = await createLazyStore();
        setStore(store);
        setLoading(false);
        console.log('🔬 Test 6: Store loaded, testing WelcomeScreen');
      } catch (error) {
        console.error('Failed to load store:', error);
        setLoading(false);
      }
    });
  }, []);

  console.log('🔬 Test 6: Mounting app with WelcomeScreen');

  if (loading || !store) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.subtitle}>Loading...</Text>
      </View>
    );
  }

  const paperTheme = {
    ...MD3LightTheme,
    colors: {
      ...MD3LightTheme.colors,
      primary: '#6200ee',
      secondary: '#03dac6',
    },
  };
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAppWrapper enableProtection={true} maxRenderCycles={100}>
        <SafeAreaProvider>
          <ReduxProvider store={store}>
            <PaperProvider theme={paperTheme}>
              <NavigationContainer>
                <TestNavigator />
              </NavigationContainer>
            </PaperProvider>
          </ReduxProvider>
        </SafeAreaProvider>
      </SafeAppWrapper>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#666666',
  },
});

export default App;