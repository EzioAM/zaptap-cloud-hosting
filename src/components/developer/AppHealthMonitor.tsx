import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  List,
  Chip,
  ProgressBar,
  Surface,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { DeveloperService } from '../../services/developer/DeveloperService';
import { EventLogger } from '../../utils/EventLogger';

interface AppHealth {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  suggestions: string[];
  metrics: any;
}

interface AutomationInsights {
  totalAutomations: number;
  userAutomations: number;
  popularStepTypes: { type: string; count: number }[];
  executionSuccess: number;
  averageSteps: number;
  recentExecutions: any[];
}

export const AppHealthMonitor: React.FC = () => {
  const [appHealth, setAppHealth] = useState<AppHealth | null>(null);
  const [automationInsights, setAutomationInsights] = useState<AutomationInsights | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [health, insights] = await Promise.all([
        DeveloperService.getAppHealth(),
        DeveloperService.getAutomationInsights(),
      ]);
      
      setAppHealth(health);
      setAutomationInsights(insights);
    } catch (error) {
      EventLogger.error('AppHealthMonitor', 'Failed to load data:', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'critical': return '#f44336';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'healthy': return 'check-circle';
      case 'warning': return 'alert';
      case 'critical': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const formatSuccessRate = (rate: number): string => {
    return `${rate.toFixed(1)}%`;
  };

  const getStepTypeIcon = (type: string): string => {
    const iconMap: { [key: string]: string } = {
      'notification': 'bell',
      'sms': 'message-text',
      'email': 'email',
      'webhook': 'web',
      'delay': 'clock',
      'variable': 'variable',
      'condition': 'help-rhombus',
      'text': 'text',
      'math': 'calculator',
      'photo': 'camera',
      'clipboard': 'clipboard',
      'app': 'application',
      'loop': 'repeat',
      'url': 'open-in-new',
      'share': 'share-variant',
    };
    return iconMap[type] || 'cog';
  };

  if (!appHealth || !automationInsights) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading app health data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadData} />
      }
    >
      {/* App Health Status */}
      <Card style={styles.card}>
        <Card.Title 
          title="App Health Status"
          left={(props) => (
            <Icon 
              name={getStatusIcon(appHealth.status)} 
              size={24} 
              color={getStatusColor(appHealth.status)} 
            />
          )}
        />
        <Card.Content>
          <Surface style={[styles.statusBanner, { backgroundColor: getStatusColor(appHealth.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(appHealth.status) }]}>
              {appHealth.status.toUpperCase()}
            </Text>
            <Chip 
              mode="outlined"
              textStyle={{ color: getStatusColor(appHealth.status) }}
              style={{ borderColor: getStatusColor(appHealth.status) }}
            >
              {appHealth.issues.length} issues
            </Chip>
          </Surface>

          {appHealth.issues.length > 0 && (
            <View style={styles.issuesContainer}>
              <Text style={styles.sectionTitle}>Issues Found:</Text>
              {appHealth.issues.map((issue, index) => (
                <List.Item
                  key={index}
                  title={issue}
                  left={(props) => <List.Icon {...props} icon="alert" color="#f44336" />}
                  titleStyle={{ fontSize: 14 }}
                />
              ))}
            </View>
          )}

          {appHealth.suggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.sectionTitle}>Recommendations:</Text>
              {appHealth.suggestions.map((suggestion, index) => (
                <List.Item
                  key={index}
                  title={suggestion}
                  left={(props) => <List.Icon {...props} icon="lightbulb" color="#ff9800" />}
                  titleStyle={{ fontSize: 14 }}
                />
              ))}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Real-time Metrics */}
      <Card style={styles.card}>
        <Card.Title title="Real-time Metrics" />
        <Card.Content>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {appHealth.metrics.reduxStoreSize ? 
                  `${(appHealth.metrics.reduxStoreSize / 1024).toFixed(1)}KB` : 
                  'N/A'
                }
              </Text>
              <Text style={styles.metricLabel}>Store Size</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {appHealth.metrics.networkFailureRate?.toFixed(1) || '0'}%
              </Text>
              <Text style={styles.metricLabel}>Network Errors</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {appHealth.metrics.averageApiResponseTime ? 
                  `${appHealth.metrics.averageApiResponseTime.toFixed(0)}ms` : 
                  'N/A'
                }
              </Text>
              <Text style={styles.metricLabel}>API Response</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Automation Insights */}
      <Card style={styles.card}>
        <Card.Title title="Automation Analytics" />
        <Card.Content>
          <View style={styles.insightsGrid}>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>{automationInsights.userAutomations}</Text>
              <Text style={styles.insightLabel}>Your Automations</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>
                {formatSuccessRate(automationInsights.executionSuccess)}
              </Text>
              <Text style={styles.insightLabel}>Success Rate</Text>
            </View>
            <View style={styles.insightItem}>
              <Text style={styles.insightValue}>
                {automationInsights.averageSteps.toFixed(1)}
              </Text>
              <Text style={styles.insightLabel}>Avg Steps</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.progressLabel}>Execution Success Rate</Text>
            <ProgressBar
              progress={automationInsights.executionSuccess / 100}
              color={automationInsights.executionSuccess > 80 ? '#4caf50' : '#ff9800'}
              style={styles.progressBar}
            />
            <Text style={styles.progressValue}>
              {formatSuccessRate(automationInsights.executionSuccess)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Popular Step Types */}
      {automationInsights.popularStepTypes.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Most Used Step Types" />
          <Card.Content>
            {automationInsights.popularStepTypes.slice(0, 5).map((stepType, index) => (
              <List.Item
                key={stepType.type}
                title={stepType.type.charAt(0).toUpperCase() + stepType.type.slice(1)}
                description={`Used ${stepType.count} times`}
                left={(props) => (
                  <List.Icon 
                    {...props} 
                    icon={getStepTypeIcon(stepType.type)} 
                    color="#6200ee" 
                  />
                )}
                right={() => (
                  <Chip mode="outlined" textStyle={{ fontSize: 12 }}>
                    {stepType.count}
                  </Chip>
                )}
              />
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Recent Executions */}
      {automationInsights.recentExecutions.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Recent Executions" />
          <Card.Content>
            {automationInsights.recentExecutions.slice(0, 5).map((execution, index) => (
              <List.Item
                key={execution.id}
                title={execution.automation_title || 'Unknown Automation'}
                description={`${execution.status} • ${new Date(execution.created_at).toLocaleString()}`}
                left={(props) => (
                  <List.Icon 
                    {...props} 
                    icon={execution.status === 'completed' ? 'check-circle' : 'alert-circle'} 
                    color={execution.status === 'completed' ? '#4caf50' : '#f44336'} 
                  />
                )}
                right={() => execution.duration && (
                  <Chip mode="outlined" textStyle={{ fontSize: 10 }}>
                    {execution.duration}ms
                  </Chip>
                )}
              />
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <Card style={styles.card}>
        <Card.Title title="Health Actions" />
        <Card.Content>
          <Button
            mode="outlined"
            onPress={async () => {
              try {
                const bundle = await DeveloperService.exportDebugBundle();
                console.log('HEALTH_DEBUG_BUNDLE:', bundle);
                EventLogger.info('AppHealthMonitor', 'Debug bundle exported to console');
              } catch (error) {
                EventLogger.error('AppHealthMonitor', 'Failed to export debug bundle:', error as Error);
              }
            }}
            style={styles.actionButton}
            icon="export"
          >
            Export Health Report
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => loadData()}
            style={styles.actionButton}
            icon="refresh"
            loading={isLoading}
          >
            Refresh Data
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  issuesContainer: {
    marginBottom: 16,
  },
  suggestionsContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    marginBottom: 16,
  },
  insightItem: {
    alignItems: 'center',
    flex: 1,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  insightLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  progressValue: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  actionButton: {
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});