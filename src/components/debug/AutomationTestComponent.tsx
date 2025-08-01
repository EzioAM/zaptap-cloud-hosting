import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AutomationEngine } from '../../services/automation/AutomationEngine';
import { AutomationData } from '../../types';

interface TestResult {
  name: string;
  success: boolean;
  executionTime?: number;
  stepsCompleted?: number;
  totalSteps?: number;
  error?: string;
}

export const AutomationTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runAllTests = async () => {
    setTesting(true);
    setTestResults([]);
    
    const tests = [
      { name: 'Basic Steps', automation: createBasicTestAutomation() },
      { name: 'Variable Management', automation: createVariableTestAutomation() },
      { name: 'Text Processing', automation: createTextProcessingAutomation() },
      { name: 'Math Operations', automation: createMathTestAutomation() },
      { name: 'Logic Conditions', automation: createLogicTestAutomation() },
      { name: 'Device Integration', automation: createDeviceTestAutomation() },
    ];

    const results: TestResult[] = [];
    const engine = new AutomationEngine();

    for (const test of tests) {
      try {
        console.log(`🧪 Running test: ${test.name}`);
        const result = await engine.execute(test.automation);
        
        results.push({
          name: test.name,
          success: result.success,
          executionTime: result.executionTime,
          stepsCompleted: result.stepsCompleted,
          totalSteps: result.totalSteps,
          error: result.error,
        });
        
        console.log(`✅ ${test.name}: ${result.success ? 'PASSED' : 'FAILED'}`);
        if (result.error) console.log(`   Error: ${result.error}`);
        
      } catch (error: any) {
        results.push({
          name: test.name,
          success: false,
          error: error.message,
        });
        console.log(`❌ ${test.name}: FAILED - ${error.message}`);
      }
      
      // Update results in real-time
      setTestResults([...results]);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setTesting(false);
    
    // Show summary
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    
    Alert.alert(
      'Test Complete! 🎯',
      `${passed}/${total} tests passed\nSuccess rate: ${Math.round((passed / total) * 100)}%`,
      [{ text: 'OK' }]
    );
  };

  const runSingleTest = async (testName: string) => {
    setTesting(true);
    
    let automation: AutomationData;
    switch (testName) {
      case 'Basic Steps':
        automation = createBasicTestAutomation();
        break;
      case 'Variable Management':
        automation = createVariableTestAutomation();
        break;
      case 'Text Processing':
        automation = createTextProcessingAutomation();
        break;
      case 'Math Operations':
        automation = createMathTestAutomation();
        break;
      case 'Logic Conditions':
        automation = createLogicTestAutomation();
        break;
      case 'Device Integration':
        automation = createDeviceTestAutomation();
        break;
      default:
        setTesting(false);
        return;
    }

    try {
      const engine = new AutomationEngine();
      const result = await engine.execute(automation);
      
      Alert.alert(
        `${testName} Test Result`,
        `Success: ${result.success ? 'YES' : 'NO'}\n` +
        `Steps: ${result.stepsCompleted}/${result.totalSteps}\n` +
        `Time: ${result.executionTime}ms\n` +
        (result.error ? `Error: ${result.error}` : 'All steps completed successfully!'),
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Test Failed', error.message);
    }
    
    setTesting(false);
  };

  const getStatusColor = (success: boolean) => success ? '#4CAF50' : '#F44336';
  const getStatusIcon = (success: boolean) => success ? '✅' : '❌';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧪 Automation Engine Test Suite</Text>
        <TouchableOpacity
          style={[styles.runAllButton, testing && styles.disabledButton]}
          onPress={runAllTests}
          disabled={testing}
        >
          <Text style={styles.runAllButtonText}>
            {testing ? 'Running Tests...' : 'Run All Tests'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.testGrid}>
        {[
          { name: 'Basic Steps', description: 'Notifications, delays, basic functionality' },
          { name: 'Variable Management', description: 'Set, get, and process variables' },
          { name: 'Text Processing', description: 'Combine, format, and manipulate text' },
          { name: 'Math Operations', description: 'Add, subtract, multiply, divide' },
          { name: 'Logic Conditions', description: 'If/then conditions and comparisons' },
          { name: 'Device Integration', description: 'Clipboard, location, camera, apps' },
        ].map((test) => {
          const result = testResults.find(r => r.name === test.name);
          
          return (
            <TouchableOpacity
              key={test.name}
              style={styles.testCard}
              onPress={() => runSingleTest(test.name)}
              disabled={testing}
            >
              <View style={styles.testHeader}>
                <Text style={styles.testName}>{test.name}</Text>
                {result && (
                  <Text style={[styles.testStatus, { color: getStatusColor(result.success) }]}>
                    {getStatusIcon(result.success)}
                  </Text>
                )}
              </View>
              <Text style={styles.testDescription}>{test.description}</Text>
              {result && (
                <View style={styles.testResult}>
                  {result.success ? (
                    <Text style={styles.testDetails}>
                      ⏱️ {result.executionTime}ms • ✅ {result.stepsCompleted}/{result.totalSteps} steps
                    </Text>
                  ) : (
                    <Text style={styles.testError} numberOfLines={2}>
                      ❌ {result.error}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {testResults.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>📊 Test Summary</Text>
          {testResults.map((result, index) => (
            <View key={index} style={styles.summaryItem}>
              <Text style={[styles.summaryStatus, { color: getStatusColor(result.success) }]}>
                {getStatusIcon(result.success)}
              </Text>
              <Text style={styles.summaryName}>{result.name}</Text>
              <Text style={styles.summaryDetails}>
                {result.success ? `${result.executionTime}ms` : 'Failed'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

// Test Automation Definitions
const createBasicTestAutomation = (): AutomationData => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
  title: 'Basic Steps Test',
  description: 'Tests notification, delay, and basic functionality',
  steps: [
    {
      id: 'step1',
      type: 'notification',
      title: 'Welcome Notification',
      enabled: true,
      config: { message: '🎉 Starting basic steps test!' }
    },
    {
      id: 'step2',
      type: 'delay',
      title: 'Wait 1 second',
      enabled: true,
      config: { delay: 1000 }
    },
    {
      id: 'step3',
      type: 'notification',
      title: 'Completion Notification',
      enabled: true,
      config: { message: '✅ Basic steps test completed!' }
    }
  ],
  created_by: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_public: false,
  category: 'test',
  tags: ['test', 'basic'],
  execution_count: 0,
  average_rating: 0,
  rating_count: 0
});

const createVariableTestAutomation = (): AutomationData => ({
  id: '550e8400-e29b-41d4-a716-446655440002',
  title: 'Variable Management Test',
  description: 'Tests variable setting, getting, and processing',
  steps: [
    {
      id: 'step1',
      type: 'variable',
      title: 'Set Username',
      enabled: true,
      config: { name: 'userName', value: 'TestUser123' }
    },
    {
      id: 'step2',
      type: 'variable',
      title: 'Set App Name',
      enabled: true,
      config: { name: 'appName', value: 'Zaptap' }
    },
    {
      id: 'step3',
      type: 'get_variable',
      title: 'Get Username',
      enabled: true,
      config: { name: 'userName', defaultValue: 'DefaultUser' }
    },
    {
      id: 'step4',
      type: 'notification',
      title: 'Show Variables',
      enabled: true,
      config: { message: 'User: {{userName}} using {{appName}}' }
    }
  ],
  created_by: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_public: false,
  category: 'test',
  tags: ['test', 'variables'],
  execution_count: 0,
  average_rating: 0,
  rating_count: 0
});

const createTextProcessingAutomation = (): AutomationData => ({
  id: '550e8400-e29b-41d4-a716-446655440003',
  title: 'Text Processing Test',
  description: 'Tests text combination, formatting, and manipulation',
  steps: [
    {
      id: 'step1',
      type: 'text',
      title: 'Combine Text',
      enabled: true,
      config: { action: 'combine', text1: 'Hello', text2: 'World', separator: ' ' }
    },
    {
      id: 'step2',
      type: 'text',
      title: 'Format Text',
      enabled: true,
      config: { action: 'format', text1: 'automation test' }
    },
    {
      id: 'step3',
      type: 'notification',
      title: 'Show Results',
      enabled: true,
      config: { message: 'Text processing completed successfully!' }
    }
  ],
  created_by: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_public: false,
  category: 'test',
  tags: ['test', 'text'],
  execution_count: 0,
  average_rating: 0,
  rating_count: 0
});

const createMathTestAutomation = (): AutomationData => ({
  id: '550e8400-e29b-41d4-a716-446655440004',
  title: 'Math Operations Test',
  description: 'Tests mathematical calculations',
  steps: [
    {
      id: 'step1',
      type: 'math',
      title: 'Add Numbers',
      enabled: true,
      config: { operation: 'add', number1: 15, number2: 25 }
    },
    {
      id: 'step2',
      type: 'math',
      title: 'Multiply Numbers',
      enabled: true,
      config: { operation: 'multiply', number1: 7, number2: 8 }
    },
    {
      id: 'step3',
      type: 'math',
      title: 'Divide Numbers',
      enabled: true,
      config: { operation: 'divide', number1: 100, number2: 4 }
    },
    {
      id: 'step4',
      type: 'notification',
      title: 'Math Complete',
      enabled: true,
      config: { message: '🧮 Math operations test completed!' }
    }
  ],
  created_by: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_public: false,
  category: 'test',
  tags: ['test', 'math'],
  execution_count: 0,
  average_rating: 0,
  rating_count: 0
});

const createLogicTestAutomation = (): AutomationData => ({
  id: '550e8400-e29b-41d4-a716-446655440005',
  title: 'Logic Conditions Test',
  description: 'Tests conditional logic and comparisons',
  steps: [
    {
      id: 'step1',
      type: 'variable',
      title: 'Set Test Number',
      enabled: true,
      config: { name: 'testNumber', value: '42' }
    },
    {
      id: 'step2',
      type: 'condition',
      title: 'Check if Greater Than 30',
      enabled: true,
      config: { variable: 'testNumber', condition: 'greater', value: '30' }
    },
    {
      id: 'step3',
      type: 'variable',
      title: 'Set Test Text',
      enabled: true,
      config: { name: 'testText', value: 'automation' }
    },
    {
      id: 'step4',
      type: 'condition',
      title: 'Check if Contains "auto"',
      enabled: true,
      config: { variable: 'testText', condition: 'contains', value: 'auto' }
    },
    {
      id: 'step5',
      type: 'notification',
      title: 'Logic Test Complete',
      enabled: true,
      config: { message: '🧠 Logic conditions test completed!' }
    }
  ],
  created_by: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_public: false,
  category: 'test',
  tags: ['test', 'logic'],
  execution_count: 0,
  average_rating: 0,
  rating_count: 0
});

const createDeviceTestAutomation = (): AutomationData => ({
  id: '550e8400-e29b-41d4-a716-446655440006',
  title: 'Device Integration Test',
  description: 'Tests device features (clipboard, location, etc.)',
  steps: [
    {
      id: 'step1',
      type: 'clipboard',
      title: 'Copy Test Text',
      enabled: true,
      config: { action: 'copy', text: 'Automation test clipboard content!' }
    },
    {
      id: 'step2',
      type: 'clipboard',
      title: 'Read Clipboard',
      enabled: true,
      config: { action: 'paste' }
    },
    {
      id: 'step3',
      type: 'notification',
      title: 'Device Test Complete',
      enabled: true,
      config: { message: '📱 Device integration test completed!' }
    }
  ],
  created_by: 'test-user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  is_public: false,
  category: 'test',
  tags: ['test', 'device'],
  execution_count: 0,
  average_rating: 0,
  rating_count: 0
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  runAllButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 150,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  runAllButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  testGrid: {
    marginBottom: 24,
  },
  testCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  testStatus: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  testDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  testResult: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginTop: 8,
  },
  testDetails: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  testError: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
  },
  summary: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryStatus: {
    fontSize: 16,
    width: 30,
  },
  summaryName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  summaryDetails: {
    fontSize: 12,
    color: '#666',
  },
});