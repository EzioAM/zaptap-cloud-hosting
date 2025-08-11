import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, Button, Card, List, ActivityIndicator, FAB, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AutomationTestRunner } from '../services/automation/test/AutomationTestRunner';

interface TestResult {
  stepType: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  capabilities?: {
    isAvailable: boolean;
    requiresPermission?: boolean;
    permissionGranted?: boolean;
  };
}

export function AutomationTestScreen() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<string>('');
  
  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setTestOutput('Running automation tests...');
    
    try {
      const runner = new AutomationTestRunner();
      const testResults = await runner.runAllTests();
      setResults(testResults);
      setTestOutput(runner.formatResults());
    } catch (error) {
      setTestOutput(`Error running tests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return 'check-circle';
      case 'failed':
        return 'close-circle';
      case 'skipped':
        return 'skip-next';
      default:
        return 'help-circle';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      case 'skipped':
        return '#FFC107';
      default:
        return '#9E9E9E';
    }
  };
  
  const getSummary = () => {
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const total = results.length;
    
    return { successful, failed, skipped, total };
  };
  
  const summary = getSummary();
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.headerCard}>
          <Card.Title 
            title="Automation Step Tester" 
            subtitle="Verify all automation capabilities"
          />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.description}>
              This tool tests all available automation step types to ensure they are properly configured and functional on your device.
            </Text>
            
            {results.length > 0 && (
              <View style={styles.summaryContainer}>
                <View style={styles.summaryRow}>
                  <Chip 
                    icon="check" 
                    style={[styles.chip, { backgroundColor: '#E8F5E9' }]}
                    textStyle={{ color: '#4CAF50' }}
                  >
                    {summary.successful} Passed
                  </Chip>
                  <Chip 
                    icon="close" 
                    style={[styles.chip, { backgroundColor: '#FFEBEE' }]}
                    textStyle={{ color: '#F44336' }}
                  >
                    {summary.failed} Failed
                  </Chip>
                  <Chip 
                    icon="skip-next" 
                    style={[styles.chip, { backgroundColor: '#FFF8E1' }]}
                    textStyle={{ color: '#F57C00' }}
                  >
                    {summary.skipped} Skipped
                  </Chip>
                </View>
              </View>
            )}
          </Card.Content>
          <Card.Actions>
            <Button 
              mode="contained" 
              onPress={runTests} 
              disabled={isRunning}
              icon={isRunning ? undefined : "play-circle"}
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
          </Card.Actions>
        </Card>
        
        {isRunning && (
          <Card style={styles.loadingCard}>
            <Card.Content style={styles.loadingContent}>
              <ActivityIndicator size="large" />
              <Text variant="bodyLarge" style={styles.loadingText}>
                Testing automation steps...
              </Text>
            </Card.Content>
          </Card>
        )}
        
        {results.length > 0 && !isRunning && (
          <Card style={styles.resultsCard}>
            <Card.Title title="Test Results" />
            <Card.Content>
              <List.Section>
                {results.map((result, index) => (
                  <List.Item
                    key={index}
                    title={result.stepType}
                    description={
                      result.error ? 
                        `Error: ${result.error}` :
                        result.capabilities ?
                          `Available: ${result.capabilities.isAvailable}${
                            result.capabilities.requiresPermission ? 
                              `, Permission: ${result.capabilities.permissionGranted ? 'Granted' : 'Required'}` : 
                              ''
                          }` :
                          result.status
                    }
                    left={(props) => (
                      <List.Icon 
                        {...props} 
                        icon={getStatusIcon(result.status)} 
                        color={getStatusColor(result.status)}
                      />
                    )}
                    right={(props) => (
                      <View style={styles.statusBadge}>
                        <Text 
                          variant="labelSmall" 
                          style={[
                            styles.statusText,
                            { color: getStatusColor(result.status) }
                          ]}
                        >
                          {result.status.toUpperCase()}
                        </Text>
                      </View>
                    )}
                  />
                ))}
              </List.Section>
            </Card.Content>
          </Card>
        )}
        
        {testOutput && !isRunning && (
          <Card style={styles.outputCard}>
            <Card.Title title="Detailed Output" />
            <Card.Content>
              <View style={styles.outputContainer}>
                <Text variant="bodySmall" style={styles.outputText}>
                  {testOutput}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
      
      {results.length > 0 && !isRunning && (
        <FAB
          icon="content-copy"
          style={styles.fab}
          onPress={() => {
            // Copy results to clipboard
            console.log('Copy results to clipboard:', testOutput);
          }}
          label="Copy Results"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  description: {
    marginTop: 8,
    color: '#666',
  },
  summaryContainer: {
    marginTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginHorizontal: 4,
  },
  loadingCard: {
    marginBottom: 16,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  resultsCard: {
    marginBottom: 16,
  },
  statusBadge: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statusText: {
    fontWeight: 'bold',
  },
  outputCard: {
    marginBottom: 80,
  },
  outputContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  outputText: {
    fontFamily: 'monospace',
    color: '#333',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});