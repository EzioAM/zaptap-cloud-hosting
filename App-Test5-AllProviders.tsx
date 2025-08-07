// TEST 5: All Providers (except analytics/auth)
// This tests the full provider hierarchy with minimal content

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAppWrapper } from './src/utils/SafeAppWrapper';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

const SuperMinimalApp = () => {
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState('None');

  console.log('🧪 TEST 5: All Providers active');
  console.log('SuperMinimalApp rendering, tapCount:', tapCount);

  const handleTap = () => {
    const now = new Date().toLocaleTimeString();
    setTapCount(prev => prev + 1);
    setLastTap(now);
    console.log('🎯 TAP DETECTED! Count:', tapCount + 1, 'Time:', now);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>TEST 5: ALL PROVIDERS</Text>
        <Text style={styles.subtitle}>Full Provider Stack</Text>
        
        <Text style={styles.counter}>Tap Count: {tapCount}</Text>
        <Text style={styles.time}>Last Tap: {lastTap}</Text>
        
        <TouchableOpacity 
          style={styles.bigButton}
          onPress={handleTap}
        >
          <Text style={styles.buttonText}>
            TAP ME
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.instruction}>
          If this counter doesn't increase,{'\n'}
          the provider combination is breaking touches.
        </Text>
      </View>
    </SafeAreaView>
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
        console.log('🔬 Test 5: Store loaded successfully');
      } catch (error) {
        console.error('Failed to load store:', error);
        setLoading(false);
      }
    });
  }, []);

  console.log('🔬 Test 5: Mounting app with All Providers');

  if (loading || !store) {
    return (
      <View style={[styles.container, styles.content]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.subtitle}>Loading Redux Store...</Text>
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
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="Test" component={SuperMinimalApp} />
                </Stack.Navigator>
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
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#000000',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666666',
  },
  counter: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  time: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 40,
  },
  bigButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 30,
    paddingHorizontal: 50,
    borderRadius: 15,
    marginBottom: 40,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  instruction: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666666',
    lineHeight: 22,
  },
});

export default App;