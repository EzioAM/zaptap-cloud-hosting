// TEST 3: GestureHandler + SafeWrapper + Redux
// This tests if Redux Provider affects touches

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

const SuperMinimalApp = () => {
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState('None');

  console.log('🧪 TEST 3: GestureHandler + SafeWrapper + Redux active');
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
        <Text style={styles.title}>TEST 3: WITH REDUX</Text>
        <Text style={styles.subtitle}>GestureHandler + SafeWrapper + Redux</Text>
        
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
          Redux Provider is affecting touches.
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
        console.log('🔬 Test 3: Store loaded successfully');
      } catch (error) {
        console.error('Failed to load store:', error);
        setLoading(false);
      }
    });
  }, []);

  console.log('🔬 Test 3: Mounting app with GestureHandler + SafeWrapper + Redux');

  if (loading || !store) {
    return (
      <View style={[styles.container, styles.content]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.subtitle}>Loading Redux Store...</Text>
      </View>
    );
  }
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAppWrapper enableProtection={true} maxRenderCycles={100}>
        <ReduxProvider store={store}>
          <SuperMinimalApp />
        </ReduxProvider>
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