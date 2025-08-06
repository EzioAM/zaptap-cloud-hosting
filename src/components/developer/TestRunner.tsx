import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  List,
  Button,
  ProgressBar,
  Chip,
  ActivityIndicator,
  IconButton,
  Searchbar,
} from 'react-native-paper';
import { DeveloperService } from '../../services/developer/DeveloperService';
import { supabase } from '../../services/supabase/client';
import { EventLogger } from '../../utils/EventLogger';

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  error?: string;
}

export const TestRunner: React.FC = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedAutomationId, setSelectedAutomationId] = useState('');
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [automationSearchQuery, setAutomationSearchQuery] = useState('');
  const [automations, setAutomations] = useState<any[]>([]);
  const [loadingAutomations, setLoadingAutomations] = useState(false);

  const runTests = async () => {
    setRunning(true);
    setTestCases([]);
    
    try {
      const results = await DeveloperService.runTestSuite();
      setTestCases(results);
    } catch (error) {
      Alert.alert('Error', 'Failed to run tests');
    } finally {
      setRunning(false);
    }
  };

  const loadAutomations = async () => {
    setLoadingAutomations(true);
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('id, title, description, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setAutomations(data || []);
    } catch (error) {
      EventLogger.error('TestRunner', 'Failed to load automations:', error as Error);
      Alert.alert('Error', 'Failed to load automations');
    } finally {
      setLoadingAutomations(false);
    }
  };

  const simulateAutomation = async () => {
    if (!selectedAutomationId) {
      Alert.alert('Select Automation', 'Please select an automation to simulate');
      return;
    }

    setSimulationResult(null);
    try {
      const result = await DeveloperService.simulateAutomationExecution(selectedAutomationId);
      setSimulationResult(result);
    } catch (error) {
      Alert.alert('Error', 'Failed to simulate automation');
    }
  };

  const getTestStats = () => {
    const passed = testCases.filter(t => t.status === 'passed').length;
    const failed = testCases.filter(t => t.status === 'failed').length;
    const total = testCases.length;
    const passRate = total > 0 ? (passed / total) * 100 : 0;

    return { passed, failed, total, passRate };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return 'check-circle';
      case 'failed': return 'close-circle';
      case 'running': return 'loading';
      default: return 'circle-outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return '#4caf50';
      case 'failed': return '#f44336';
      case 'running': return '#2196f3';
      default: return '#666';
    }
  };

  const stats = getTestStats();

  return (
    <ScrollView style={styles.container}>
      {/* Test Suite */}
      <Card style={styles.card}>
        <Card.Title title="System Test Suite" />
        <Card.Content>
          <Text style={styles.description}>
            Run automated tests to verify system functionality
          </Text>
          
          <Button
            mode="contained"
            onPress={runTests}
            loading={running}
            disabled={running}
            style={styles.runButton}
          >
            {running ? 'Running Tests...' : 'Run All Tests'}
          </Button>

          {testCases.length > 0 && (
            <>
              <View style={styles.statsContainer}>
                <Chip mode="outlined" style={[styles.statChip, { backgroundColor: '#4caf5020' }]}>
                  ✓ {stats.passed} Passed
                </Chip>
                <Chip mode="outlined" style={[styles.statChip, { backgroundColor: '#f4433620' }]}>
                  ✗ {stats.failed} Failed
                </Chip>
                <Chip mode="outlined" style={styles.statChip}>
                  {stats.passRate.toFixed(0)}% Pass Rate
                </Chip>
              </View>

              <ProgressBar 
                progress={stats.passRate / 100} 
                color={stats.passRate > 80 ? '#4caf50' : '#ff9800'}
                style={styles.progressBar}
              />

              <View style={styles.testResults}>
                {testCases.map(test => (
                  <List.Item
                    key={test.id}
                    title={test.name}
                    description={test.description}
                    left={(props) => (
                      <List.Icon 
                        {...props} 
                        icon={getStatusIcon(test.status)}
                        color={getStatusColor(test.status)}
                      />
                    )}
                    right={() => (
                      <View style={styles.testRight}>
                        {test.duration && (
                          <Text style={styles.duration}>{test.duration}ms</Text>
                        )}
                        {test.status === 'running' && <ActivityIndicator size="small" />}
                      </View>
                    )}
                    onPress={() => {
                      if (test.error) {
                        Alert.alert(test.name, test.error);
                      }
                    }}
                  />
                ))}
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Automation Simulator */}
      <Card style={styles.card}>
        <Card.Title 
          title="Automation Simulator"
          subtitle="Test automation execution without side effects"
        />
        <Card.Content>
          <Button
            mode="outlined"
            onPress={loadAutomations}
            style={styles.loadButton}
            loading={loadingAutomations}
          >
            Load Automations
          </Button>

          {automations.length > 0 && (
            <>
              <Searchbar
                placeholder="Search automations..."
                onChangeText={setAutomationSearchQuery}
                value={automationSearchQuery}
                style={styles.searchBar}
              />

              <ScrollView style={styles.automationList}>
                {automations
                  .filter(a => 
                    a.title.toLowerCase().includes(automationSearchQuery.toLowerCase()) ||
                    a.description?.toLowerCase().includes(automationSearchQuery.toLowerCase())
                  )
                  .map(automation => (
                    <List.Item
                      key={automation.id}
                      title={automation.title}
                      description={automation.description}
                      left={(props) => (
                        <List.Icon 
                          {...props} 
                          icon={selectedAutomationId === automation.id ? 'radiobox-marked' : 'radiobox-blank'}
                          color="#6200ee"
                        />
                      )}
                      onPress={() => setSelectedAutomationId(automation.id)}
                      style={[
                        styles.automationItem,
                        selectedAutomationId === automation.id && styles.selectedAutomation
                      ]}
                    />
                  ))}
              </ScrollView>

              <Button
                mode="contained"
                onPress={simulateAutomation}
                disabled={!selectedAutomationId}
                style={styles.simulateButton}
              >
                Simulate Execution
              </Button>
            </>
          )}

          {simulationResult && (
            <Card style={styles.resultCard}>
              <Card.Title 
                title="Simulation Result"
                left={(props) => (
                  <IconButton
                    icon={simulationResult.success ? 'check-circle' : 'alert-circle'}
                    iconColor={simulationResult.success ? '#4caf50' : '#f44336'}
                  />
                )}
              />
              <Card.Content>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultLabel}>Status:</Text>
                  <Chip mode="outlined" compact>
                    {simulationResult.success ? 'Success' : 'Failed'}
                  </Chip>
                </View>
                
                <View style={styles.resultInfo}>
                  <Text style={styles.resultLabel}>Duration:</Text>
                  <Text>{simulationResult.duration}ms</Text>
                </View>

                {simulationResult.error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorLabel}>Error:</Text>
                    <Text style={styles.errorText}>
                      {typeof simulationResult.error === 'string' 
                        ? simulationResult.error 
                        : JSON.stringify(simulationResult.error, null, 2)}
                    </Text>
                  </View>
                )}

                <View style={styles.logsContainer}>
                  <Text style={styles.logsLabel}>Execution Logs:</Text>
                  <ScrollView style={styles.logsScroll}>
                    {simulationResult.logs.map((log: string, index: number) => (
                      <Text key={index} style={styles.logLine}>{log}</Text>
                    ))}
                  </ScrollView>
                </View>
              </Card.Content>
            </Card>
          )}
        </Card.Content>
      </Card>

      {/* Quick Test Actions */}
      <Card style={styles.card}>
        <Card.Title title="Quick Tests" />
        <Card.Content>
          <Button
            mode="text"
            onPress={async () => {
              try {
                const bundle = await DeveloperService.exportDebugBundle();
                EventLogger.debug('TestRunner', 'DEBUG_BUNDLE:', bundle);
                Alert.alert('Success', 'Debug bundle exported to console');
              } catch (error) {
                Alert.alert('Error', 'Failed to export debug bundle');
              }
            }}
            style={styles.quickButton}
          >
            Export Debug Bundle
          </Button>

          <Button
            mode="text"
            onPress={() => {
              const flags = DeveloperService.getFeatureFlags();
              Alert.alert(
                'Feature Flags',
                Object.entries(flags)
                  .map(([key, value]) => `${key}: ${value ? 'ON' : 'OFF'}`)
                  .join('\n')
              );
            }}
            style={styles.quickButton}
          >
            View Feature Flags
          </Button>

          <Button
            mode="text"
            onPress={() => {
              const env = DeveloperService.getEnvironmentInfo();
              EventLogger.debug('TestRunner', 'ENVIRONMENT_INFO:', env);
              Alert.alert('Environment', JSON.stringify(env, null, 2));
            }}
            style={styles.quickButton}
          >
            Environment Info
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  runButton: {
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statChip: {
    marginRight: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  testResults: {
    marginTop: 8,
  },
  testRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  duration: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  loadButton: {
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 12,
  },
  automationList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  automationItem: {
    backgroundColor: '#f9f9f9',
    marginBottom: 4,
    borderRadius: 4,
  },
  selectedAutomation: {
    backgroundColor: '#e8e0ff',
  },
  simulateButton: {
    marginTop: 8,
  },
  resultCard: {
    marginTop: 16,
    backgroundColor: '#f9f9f9',
  },
  resultInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  errorContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#ffebee',
    borderRadius: 4,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f44336',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#d32f2f',
  },
  logsContainer: {
    marginTop: 16,
  },
  logsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  logsScroll: {
    maxHeight: 200,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
  },
  logLine: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  quickButton: {
    marginBottom: 4,
  },
  bottomSpacer: {
    height: 32,
  },
});