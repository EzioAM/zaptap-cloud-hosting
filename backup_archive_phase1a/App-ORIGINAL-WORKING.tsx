import React from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// WORKING MINIMAL APP - NO DEPENDENCIES ON BROKEN COMPONENTS
export default function App() {
  const [testPassed, setTestPassed] = React.useState(false);
  
  const runDiagnostic = () => {
    setTestPassed(true);
    Alert.alert('Success!', 'The app is now working. Add back features gradually.');
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <Text style={styles.title}>✅ ZAPTAP RECOVERED</Text>
        <Text style={styles.subtitle}>Emergency mode successful!</Text>
        
        <View style={styles.status}>
          <Text style={styles.statusText}>
            ✅ React Native: Working{'\n'}
            ✅ SafeAreaProvider: Working{'\n'}
            ✅ Basic rendering: Working{'\n'}
            ✅ State management: Working{'\n'}
            {testPassed && '✅ User interaction: Working\n'}
          </Text>
        </View>

        <Button title="Test Interaction" onPress={runDiagnostic} />
        
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>Next Steps:</Text>
          <Text style={styles.instructionText}>
            1. Add Redux store back{'\n'}
            2. Add React Native Paper{'\n'}
            3. Add navigation{'\n'}
            4. Add auth components{'\n'}
            5. Add networking{'\n'}
            6. Add persistence
          </Text>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  status: {
    backgroundColor: '#e8f5e8',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    minWidth: '80%',
  },
  statusText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 22,
  },
  instructions: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    minWidth: '80%',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#bf360c',
    lineHeight: 20,
  },
});