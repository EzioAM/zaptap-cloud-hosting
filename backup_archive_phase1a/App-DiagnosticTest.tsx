// COMPREHENSIVE TOUCH DIAGNOSTIC TEST
// This version systematically tests different touch scenarios

import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Button,
  Pressable,
  Dimensions,
  Alert
} from 'react-native';

const { width, height } = Dimensions.get('window');

const DiagnosticTestApp = () => {
  const [results, setResults] = useState<{ [key: string]: boolean }>({});
  const [touchLog, setTouchLog] = useState<string[]>([]);
  const mountTime = useRef(Date.now());

  const log = (message: string) => {
    const timestamp = Date.now() - mountTime.current;
    const logEntry = `[${timestamp}ms] ${message}`;
    console.log('🔍 DIAGNOSTIC:', logEntry);
    setTouchLog(prev => [logEntry, ...prev.slice(0, 9)]); // Keep last 10 logs
  };

  const markTestResult = (testName: string, success: boolean) => {
    log(`TEST: ${testName} - ${success ? 'PASSED' : 'FAILED'}`);
    setResults(prev => ({ ...prev, [testName]: success }));
    
    if (success) {
      Alert.alert('Test Passed', `${testName} is working!`);
    }
  };

  React.useEffect(() => {
    log('App mounted and ready for testing');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>iOS Touch Diagnostics</Text>
        <Text style={styles.subtitle}>Device: {width}x{height}</Text>
        
        {/* Test Results Display */}
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Test Results:</Text>
          {Object.keys(results).length === 0 ? (
            <Text style={styles.noResults}>No tests completed yet</Text>
          ) : (
            Object.entries(results).map(([test, passed]) => (
              <Text 
                key={test} 
                style={[styles.testResult, { color: passed ? 'green' : 'red' }]}
              >
                {passed ? '✅' : '❌'} {test}
              </Text>
            ))
          )}
        </View>

        {/* Touch Log */}
        <View style={styles.logSection}>
          <Text style={styles.sectionTitle}>Touch Log:</Text>
          {touchLog.length === 0 ? (
            <Text style={styles.noLogs}>No touch events logged yet</Text>
          ) : (
            touchLog.map((logEntry, index) => (
              <Text key={index} style={styles.logEntry}>{logEntry}</Text>
            ))
          )}
        </View>

        {/* TEST 1: Native Button */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test 1: Native Button</Text>
          <Button
            title="Native Button Test"
            onPress={() => markTestResult('Native Button', true)}
            color="#007AFF"
          />
        </View>

        {/* TEST 2: TouchableOpacity */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test 2: TouchableOpacity</Text>
          <TouchableOpacity 
            style={styles.touchableButton}
            onPress={() => markTestResult('TouchableOpacity', true)}
            onPressIn={() => log('TouchableOpacity press in')}
            onPressOut={() => log('TouchableOpacity press out')}
          >
            <Text style={styles.buttonText}>TouchableOpacity Test</Text>
          </TouchableOpacity>
        </View>

        {/* TEST 3: Pressable */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test 3: Pressable</Text>
          <Pressable 
            style={({ pressed }) => [
              styles.pressableButton,
              { backgroundColor: pressed ? '#E0E0E0' : '#F0F0F0' }
            ]}
            onPress={() => markTestResult('Pressable', true)}
            onPressIn={() => log('Pressable press in')}
            onPressOut={() => log('Pressable press out')}
          >
            <Text style={styles.buttonText}>Pressable Test</Text>
          </Pressable>
        </View>

        {/* TEST 4: Touch Events */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test 4: Raw Touch Events</Text>
          <View 
            style={styles.touchEventButton}
            onTouchStart={(event) => {
              log(`Touch start at (${Math.round(event.nativeEvent.locationX)}, ${Math.round(event.nativeEvent.locationY)})`);
              markTestResult('Touch Events', true);
            }}
            onTouchEnd={() => log('Touch end')}
            onTouchMove={(event) => log(`Touch move at (${Math.round(event.nativeEvent.locationX)}, ${Math.round(event.nativeEvent.locationY)})`)}
          >
            <Text style={styles.buttonText}>Touch Event Test</Text>
          </View>
        </View>

        {/* TEST 5: Responder System */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test 5: Responder System</Text>
          <View 
            style={styles.responderButton}
            onStartShouldSetResponder={() => {
              log('onStartShouldSetResponder called');
              return true;
            }}
            onResponderGrant={() => {
              log('onResponderGrant called');
              markTestResult('Responder System', true);
            }}
            onResponderMove={(event) => {
              log(`Responder move at (${Math.round(event.nativeEvent.locationX)}, ${Math.round(event.nativeEvent.locationY)})`);
            }}
            onResponderRelease={() => log('onResponderRelease called')}
          >
            <Text style={styles.buttonText}>Responder Test</Text>
          </View>
        </View>

        {/* TEST 6: Large Touch Area */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test 6: Large Touch Area</Text>
          <TouchableOpacity 
            style={styles.largeButton}
            onPress={() => markTestResult('Large Touch Area', true)}
            activeOpacity={0.8}
          >
            <Text style={styles.largeButtonText}>Large Touch Test</Text>
          </TouchableOpacity>
        </View>

        {/* TEST 7: Multiple Touch Points */}
        <View style={styles.testSection}>
          <Text style={styles.testTitle}>Test 7: Multiple Small Targets</Text>
          <View style={styles.multiButtonRow}>
            {[1, 2, 3, 4].map(num => (
              <TouchableOpacity
                key={num}
                style={styles.smallButton}
                onPress={() => markTestResult(`Small Button ${num}`, true)}
              >
                <Text style={styles.smallButtonText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Clear Results Button */}
        <View style={styles.testSection}>
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => {
              setResults({});
              setTouchLog([]);
              log('Results cleared');
            }}
          >
            <Text style={styles.clearButtonText}>Clear All Results</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000000',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333333',
  },
  resultsSection: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  noResults: {
    fontStyle: 'italic',
    color: '#999999',
  },
  testResult: {
    fontSize: 14,
    marginVertical: 2,
    fontWeight: '500',
  },
  logSection: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    maxHeight: 150,
  },
  noLogs: {
    fontStyle: 'italic',
    color: '#999999',
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'Monaco',
    color: '#333333',
    marginVertical: 1,
  },
  testSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333333',
  },
  touchableButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  pressableButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CCCCCC',
  },
  touchEventButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  responderButton: {
    backgroundColor: '#AF52DE',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  largeButton: {
    backgroundColor: '#34C759',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 100,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  largeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  multiButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  smallButton: {
    backgroundColor: '#FF9500',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#666666',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default DiagnosticTestApp;