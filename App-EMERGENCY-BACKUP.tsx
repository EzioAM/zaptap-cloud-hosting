import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Ultra-minimal emergency app to test if React Native renders at all
export default function App() {
  console.log('🚀 EMERGENCY MODE: Ultra-minimal app test');
  
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Text style={styles.title}>🚀 EMERGENCY MODE</Text>
        <Text style={styles.message}>App is running!</Text>
        <Text style={styles.details}>
          If you can see this, React Native is working.{'\n'}
          Now we can add components back one by one.
        </Text>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e91e63',
    marginBottom: 20,
  },
  message: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
  },
  details: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});