import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Card, Text, Button } from 'react-native-paper';
import { AutomationEngine } from '../../services/automation/AutomationEngine';
import { AutomationData, AutomationStep } from '../../types';

const VariableDemo: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);

  const runVariableDemo = async () => {
    setIsRunning(true);
    
    try {
      const demoAutomation: AutomationData = {
        id: 'demo-variables',
        title: 'Variables Demo',
        description: 'Demonstrates variable storage and reference',
        steps: [
          {
            id: 'step1',
            type: 'variable',
            title: 'Set User Name',
            enabled: true,
            config: {
              name: 'userName',
              value: 'John Doe'
            }
          },
          {
            id: 'step2',
            type: 'prompt_input',
            title: 'Ask for Age',
            enabled: true,
            config: {
              title: 'Age Input',
              message: 'How old are you?',
              variableName: 'userAge',
              defaultValue: '25'
            }
          },
          {
            id: 'step3',
            type: 'variable',
            title: 'Set Greeting Template',
            enabled: true,
            config: {
              name: 'greeting',
              value: 'Hello {{userName}}, you are {{userAge}} years old!'
            }
          },
          {
            id: 'step4',
            type: 'get_variable',
            title: 'Get Greeting',
            enabled: true,
            config: {
              name: 'greeting',
              defaultValue: 'No greeting found'
            }
          },
          {
            id: 'step5',
            type: 'notification',
            title: 'Show Greeting',
            enabled: true,
            config: {
              message: '{{greeting}}'
            }
          }
        ] as AutomationStep[],
        created_by: 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false,
        category: 'demo',
        tags: ['demo', 'variables'],
        execution_count: 0,
        average_rating: 0,
        rating_count: 0
      };

      const engine = new AutomationEngine();
      const result = await engine.execute(demoAutomation);

      if (result.success) {
        Alert.alert(
          'Variables Demo Complete! 🎉',
          `Demo executed successfully!\n\n⏱️ Time: ${result.executionTime}ms\n✅ Steps: ${result.stepsCompleted}/${result.totalSteps}\n\nThe automation:\n1. Set userName = "John Doe"\n2. Prompted for userAge\n3. Created greeting with variables\n4. Retrieved the greeting\n5. Showed notification with resolved variables`
        );
      } else {
        Alert.alert('Demo Failed', result.error || 'Unknown error');
      }
    } catch (error: any) {
      Alert.alert('Demo Error', error.message || 'Failed to run demo');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.title}>Variables & Dynamic Content Demo</Text>
        <Text style={styles.description}>
          This demo shows how variables work in automations:
          {'\n\n'}• Store values with "Set Variable"
          {'\n'}• Prompt user input with "Ask for Input"
          {'\n'}• Reference variables using {'{{'} {'}}'}
          {'\n'}• Retrieve stored values with "Get Variable"
          {'\n'}• Use variables in any step (SMS, notifications, etc.)
        </Text>
        
        <Button
          mode="contained"
          onPress={runVariableDemo}
          loading={isRunning}
          disabled={isRunning}
          style={styles.button}
          icon="play"
        >
          {isRunning ? 'Running Demo...' : 'Run Variables Demo'}
        </Button>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});

export default VariableDemo;