import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  ProgressBar,
  List,
  Chip,
  Button,
  DataTable,
} from 'react-native-paper';
import { DeveloperService } from '../../services/developer/DeveloperService';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const [timeLabels, setTimeLabels] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateMetrics();
    }, 1000);

    return () => clearInterval(interval);
  }, [memoryHistory]);

  const updateMetrics = () => {
    const newMetrics = DeveloperService.getPerformanceMetrics();
    setMetrics(newMetrics);

    // Update memory history for chart
    if (newMetrics.jsHeapUsed > 0) {
      setMemoryHistory(prev => {
        const updated = [...prev, newMetrics.jsHeapUsed / 1048576];
        return updated.slice(-20); // Keep last 20 data points
      });

      setTimeLabels(prev => {
        const now = new Date();
        const label = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
        const updated = [...prev, label];
        return updated.slice(-20);
      });
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getMemoryUsagePercent = (): number => {
    if (!metrics || metrics.jsHeapLimit === 0) return 0;
    return (metrics.jsHeapUsed / metrics.jsHeapLimit);
  };

  const getUptime = (): string => {
    if (!metrics) return '0s';
    const uptime = metrics.currentTime - metrics.startTime;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getAverageResponseTime = (times: number[]): number => {
    if (!times || times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  };

  if (!metrics) {
    return (
      <View style={styles.container}>
        <Text>Initializing performance monitor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Memory Usage */}
      <Card style={styles.card}>
        <Card.Title title="Memory Usage" />
        <Card.Content>
          <View style={styles.memoryInfo}>
            <Text style={styles.memoryText}>
              {formatBytes(metrics.jsHeapUsed)} / {formatBytes(metrics.jsHeapLimit)}
            </Text>
            <Text style={styles.percentText}>
              {(getMemoryUsagePercent() * 100).toFixed(1)}%
            </Text>
          </View>
          <ProgressBar 
            progress={getMemoryUsagePercent()} 
            color={getMemoryUsagePercent() > 0.8 ? '#f44336' : '#4caf50'}
            style={styles.progressBar}
          />
          
          {memoryHistory.length > 5 && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Memory Usage Over Time (MB)</Text>
              <LineChart
                data={{
                  labels: timeLabels.filter((_, i) => i % 4 === 0), // Show every 4th label
                  datasets: [{
                    data: memoryHistory.length > 0 ? memoryHistory : [0],
                  }],
                }}
                width={width - 64}
                height={180}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}
        </Card.Content>
      </Card>

      {/* App Statistics */}
      <Card style={styles.card}>
        <Card.Title title="App Statistics" />
        <Card.Content>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getUptime()}</Text>
              <Text style={styles.statLabel}>Uptime</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{metrics.errorCount}</Text>
              <Text style={styles.statLabel}>Errors</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{metrics.warningCount}</Text>
              <Text style={styles.statLabel}>Warnings</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* API Performance */}
      <Card style={styles.card}>
        <Card.Title title="API Performance" />
        <Card.Content>
          {Object.keys(metrics.apiResponseTimes).length === 0 ? (
            <Text style={styles.emptyText}>No API calls recorded yet</Text>
          ) : (
            <DataTable>
              <DataTable.Header>
                <DataTable.Title>Endpoint</DataTable.Title>
                <DataTable.Title numeric>Avg Time</DataTable.Title>
                <DataTable.Title numeric>Calls</DataTable.Title>
              </DataTable.Header>

              {Object.entries(metrics.apiResponseTimes).map(([endpoint, times]) => (
                <DataTable.Row key={endpoint}>
                  <DataTable.Cell>{endpoint}</DataTable.Cell>
                  <DataTable.Cell numeric>
                    {formatDuration(getAverageResponseTime(times as number[]))}
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {(times as number[]).length}
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
          )}
        </Card.Content>
      </Card>

      {/* Performance Tips */}
      <Card style={styles.card}>
        <Card.Title title="Performance Tips" />
        <Card.Content>
          {getMemoryUsagePercent() > 0.8 && (
            <List.Item
              title="High Memory Usage"
              description="Consider clearing cache or restarting the app"
              left={(props) => <List.Icon {...props} icon="alert" color="#f44336" />}
            />
          )}
          {metrics.errorCount > 10 && (
            <List.Item
              title="Multiple Errors Detected"
              description="Check console logs for error details"
              left={(props) => <List.Icon {...props} icon="bug" color="#ff9800" />}
            />
          )}
          {Object.values(metrics.apiResponseTimes).some(times => 
            getAverageResponseTime(times as number[]) > 2000
          ) && (
            <List.Item
              title="Slow API Response"
              description="Some API endpoints are responding slowly"
              left={(props) => <List.Icon {...props} icon="speedometer-slow" color="#ff9800" />}
            />
          )}
          {getMemoryUsagePercent() < 0.8 && metrics.errorCount < 5 && (
            <List.Item
              title="Good Performance"
              description="App is running smoothly"
              left={(props) => <List.Icon {...props} icon="check-circle" color="#4caf50" />}
            />
          )}
        </Card.Content>
      </Card>

      {/* Actions */}
      <Card style={styles.card}>
        <Card.Title title="Performance Actions" />
        <Card.Content>
          <Button
            mode="outlined"
            onPress={() => {
              // Force garbage collection if available
              if (global.gc) {
                global.gc();
              }
              updateMetrics();
            }}
            style={styles.actionButton}
          >
            Force Garbage Collection
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => {
              const report = {
                timestamp: new Date().toISOString(),
                metrics: metrics,
                memoryHistory: memoryHistory,
              };
              console.log('PERFORMANCE_REPORT:', report);
            }}
            style={styles.actionButton}
          >
            Export Performance Report
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
  memoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoryText: {
    fontSize: 16,
    fontWeight: '500',
  },
  percentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  chartContainer: {
    marginTop: 16,
  },
  chartTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    paddingVertical: 16,
  },
  actionButton: {
    marginBottom: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});