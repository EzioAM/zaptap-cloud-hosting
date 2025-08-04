import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';

// List of screens to test
const screensToTest = [
  { name: 'ModernHomeScreen', path: '../../screens/modern/ModernHomeScreen' },
  { name: 'BuildScreen', path: '../../screens/modern/BuildScreen' },
  { name: 'DiscoverScreen', path: '../../screens/modern/DiscoverScreen' },
  { name: 'LibraryScreen', path: '../../screens/modern/LibraryScreen' },
  { name: 'ModernProfileScreen', path: '../../screens/modern/ModernProfileScreen' },
];

export const ScreenLoaderTest = () => {
  const [results, setResults] = useState<{ [key: string]: string }>({});
  
  const testScreen = async (screenName: string, screenPath: string) => {
    setResults(prev => ({ ...prev, [screenName]: '🔍 Testing...' }));
    
    try {
      console.log(`🔍 Testing ${screenName}...`);
      
      // Try to load the screen module
      const screenModule = require(screenPath);
      
      if (screenModule.default || screenModule[screenName]) {
        setResults(prev => ({ ...prev, [screenName]: '✅ Module loaded' }));
        console.log(`✅ ${screenName} module loaded successfully`);
        
        // Try to check if it's a valid React component
        const ScreenComponent = screenModule.default || screenModule[screenName];
        if (typeof ScreenComponent === 'function' || ScreenComponent?.$$typeof) {
          setResults(prev => ({ ...prev, [screenName]: '✅ Valid component' }));
        } else {
          setResults(prev => ({ ...prev, [screenName]: '⚠️ Not a component' }));
        }
      } else {
        setResults(prev => ({ ...prev, [screenName]: '❌ No default export' }));
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      setResults(prev => ({ ...prev, [screenName]: `❌ ${errorMsg}` }));
      console.error(`❌ ${screenName} error:`, error);
    }
  };
  
  const testAllScreens = () => {
    screensToTest.forEach(screen => {
      testScreen(screen.name, screen.path);
    });
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Screen Loader Test</Text>
      <Text style={styles.subtitle}>
        Test if screens can be loaded without crashing
      </Text>
      
      <Button title="Test All Screens" onPress={testAllScreens} />
      
      <ScrollView style={styles.results}>
        {screensToTest.map(screen => (
          <View key={screen.name} style={styles.resultRow}>
            <Text style={styles.screenName}>{screen.name}:</Text>
            <Text style={styles.resultText}>
              {results[screen.name] || '⏳ Not tested'}
            </Text>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.info}>
        <Text style={styles.infoText}>
          Common issues:
          {'\n'}• useUnifiedTheme not found
          {'\n'}• Missing imports
          {'\n'}• Circular dependencies
          {'\n'}• Syntax errors in screens
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    margin: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  results: {
    maxHeight: 200,
    marginTop: 15,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  screenName: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  info: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});