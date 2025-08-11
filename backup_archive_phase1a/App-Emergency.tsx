import React from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

console.log('🚨 EMERGENCY APP LOADING...');

export default function App() {
  const [testCount, setTestCount] = React.useState(0);
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>🚨 ZAPTAP EMERGENCY MODE</Text>
          <Text style={styles.subtitle}>Basic functionality test</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusTitle}>System Status:</Text>
          <Text style={styles.statusItem}>✅ React Native: Working</Text>
          <Text style={styles.statusItem}>✅ Basic UI: Rendering</Text>
          <Text style={styles.statusItem}>✅ State Management: {testCount > 0 ? 'Working' : 'Testing...'}</Text>
        </View>
        
        <TouchableOpacity style={styles.button} onPress={() => setTestCount(testCount + 1)}>
          <Text style={styles.buttonText}>Test Interaction (Count: {testCount})</Text>
        </TouchableOpacity>
        
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Next Steps:</Text>
          <Text style={styles.infoItem}>1. Check console logs for errors</Text>
          <Text style={styles.infoItem}>2. Test provider components one by one</Text>
          <Text style={styles.infoItem}>3. Verify Supabase connection</Text>
          <Text style={styles.infoItem}>4. Re-enable navigation</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    backgroundColor: '#ff6b6b',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusItem: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  button: {
    backgroundColor: '#4ecdc4',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    backgroundColor: '#fff3cd',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#856404',
  },
  infoItem: {
    fontSize: 14,
    marginBottom: 5,
    color: '#856404',
  },
});