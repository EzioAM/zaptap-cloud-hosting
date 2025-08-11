// TEST 1: Super Minimal + GestureHandlerRootView
// This tests if GestureHandlerRootView breaks touches

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const SuperMinimalApp = () => {
  const [tapCount, setTapCount] = useState(0);
  const [lastTap, setLastTap] = useState('None');

  console.log('🧪 TEST 1: GestureHandlerRootView wrapper active');
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
        <Text style={styles.title}>TEST 1: WITH GESTURE HANDLER</Text>
        <Text style={styles.subtitle}>GestureHandlerRootView Wrapper</Text>
        
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
          GestureHandlerRootView is breaking touches.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const App = () => {
  console.log('🔬 Test 1: Mounting app with GestureHandlerRootView');
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SuperMinimalApp />
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