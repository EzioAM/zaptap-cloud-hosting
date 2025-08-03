import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  IconButton,
  Chip,
  ActivityIndicator,
  Divider,
  ProgressBar,
  Appbar,
} from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AnalyticsService, AnalyticsData } from '../../services/analytics/AnalyticsService';
import { AutomationData } from '../../types';
import { FullScreenModal } from '../common/FullScreenModal';

interface AnalyticsModalProps {
  visible: boolean;
  onDismiss: () => void;
  automation: AutomationData;
}

const { width: screenWidth } = Dimensions.get('window');

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  visible,
  onDismiss,
  automation,
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (visible) {
      loadAnalytics();
    }
  }, [visible, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time
          break;
      }

      const data = await AnalyticsService.getAnalytics(
        automation.id,
        startDate.toISOString(),
        endDate.toISOString()
      );
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      case '90d': return 'Last 90 days';
      case 'all': return 'All time';
    }
  };

  const renderMetricCard = (
    title: string,
    value: number,
    icon: string,
    color: string,
    subtitle?: string,
    progress?: number
  ) => (
    <Card style={styles.metricCard}>
      <Card.Content style={styles.metricContent}>
        <View style={styles.metricHeader}>
          <Icon name={icon} size={24} color={color} />
          <Text style={styles.metricValue}>{formatNumber(value)}</Text>
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
        {progress !== undefined && (
          <ProgressBar progress={progress} color={color} style={styles.progressBar} />
        )}
      </Card.Content>
    </Card>
  );

  const renderEngagementMetrics = () => {
    if (!analytics) return null;

    const totalEngagement = analytics.views + analytics.executions + analytics.shares + analytics.downloads;
    const executionRate = analytics.views > 0 ? (analytics.executions / analytics.views) : 0;
    const shareRate = analytics.views > 0 ? (analytics.shares / analytics.views) : 0;

    return (
      <Card style={styles.section}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Engagement Metrics</Text>
          <View style={styles.engagementRow}>
            <View style={styles.engagementItem}>
              <Text style={styles.engagementValue}>{(executionRate * 100).toFixed(1)}%</Text>
              <Text style={styles.engagementLabel}>Execution Rate</Text>
            </View>
            <View style={styles.engagementItem}>
              <Text style={styles.engagementValue}>{(shareRate * 100).toFixed(1)}%</Text>
              <Text style={styles.engagementLabel}>Share Rate</Text>
            </View>
            <View style={styles.engagementItem}>
              <Text style={styles.engagementValue}>{analytics.likes}</Text>
              <Text style={styles.engagementLabel}>Likes</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderTopLocations = () => {
    if (!analytics?.top_locations || analytics.top_locations.length === 0) return null;

    return (
      <Card style={styles.section}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Top Locations</Text>
          {analytics.top_locations.slice(0, 5).map((location, index) => (
            <View key={index} style={styles.locationItem}>
              <View style={styles.locationInfo}>
                <Icon name="map-marker" size={16} color="#666" />
                <Text style={styles.locationName}>{location.location || 'Unknown'}</Text>
              </View>
              <Text style={styles.locationCount}>{location.count}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderRecentActivity = () => {
    if (!analytics?.recent_executions || analytics.recent_executions.length === 0) return null;

    return (
      <Card style={styles.section}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {analytics.recent_executions.slice(0, 5).map((execution, index) => (
            <View key={index} style={styles.activityItem}>
              <Icon 
                name={execution.success ? "check-circle" : "alert-circle"} 
                size={16} 
                color={execution.success ? "#4caf50" : "#f44336"} 
              />
              <View style={styles.activityInfo}>
                <Text style={styles.activityText}>
                  Executed {execution.success ? 'successfully' : 'with errors'}
                </Text>
                <Text style={styles.activityTime}>
                  {new Date(execution.executed_at).toLocaleDateString()} at{' '}
                  {new Date(execution.executed_at).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  return (
    <FullScreenModal
      visible={visible}
      onDismiss={onDismiss}
    >
      <SafeAreaView style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onDismiss} />
          <Appbar.Content title="Analytics & Insights" />
        </Appbar.Header>
        
        <View style={styles.content}>
          
          <Text style={styles.modalSubtitle}>
            Usage statistics and performance metrics for "{automation.title}"
          </Text>

          <View style={styles.timeRangeContainer}>
            <Text style={styles.timeRangeLabel}>Time Range:</Text>
            <View style={styles.timeRangeButtons}>
              {(['7d', '30d', '90d', 'all'] as const).map((range) => (
                <Chip
                  key={range}
                  selected={timeRange === range}
                  onPress={() => setTimeRange(range)}
                  style={styles.timeRangeChip}
                  mode={timeRange === range ? 'flat' : 'outlined'}
                >
                  {range === 'all' ? 'All' : range}
                </Chip>
              ))}
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.analyticsContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            >
              {analytics ? (
                <>
                  <Text style={styles.periodLabel}>{getTimeRangeLabel()}</Text>
                  
                  {/* Main Metrics */}
                  <View style={styles.metricsGrid}>
                    {renderMetricCard('Views', analytics.views, 'eye', '#2196f3')}
                    {renderMetricCard('Executions', analytics.executions, 'play', '#4caf50')}
                    {renderMetricCard('Shares', analytics.shares, 'share', '#ff9800')}
                    {renderMetricCard('Downloads', analytics.downloads, 'download', '#9c27b0')}
                  </View>

                  {renderEngagementMetrics()}
                  {renderTopLocations()}
                  {renderRecentActivity()}

                  {/* Performance Insights */}
                  <Card style={styles.section}>
                    <Card.Content>
                      <Text style={styles.sectionTitle}>Performance Insights</Text>
                      <View style={styles.insightItem}>
                        <Icon name="trending-up" size={20} color="#4caf50" />
                        <Text style={styles.insightText}>
                          {analytics.executions > 0 
                            ? `Your automation has been executed ${analytics.executions} times`
                            : 'No executions recorded in this period'
                          }
                        </Text>
                      </View>
                      {analytics.views > 0 && (
                        <View style={styles.insightItem}>
                          <Icon name="chart-line" size={20} color="#2196f3" />
                          <Text style={styles.insightText}>
                            {((analytics.executions / analytics.views) * 100).toFixed(1)}% of viewers executed your automation
                          </Text>
                        </View>
                      )}
                      {analytics.shares > 0 && (
                        <View style={styles.insightItem}>
                          <Icon name="share-variant" size={20} color="#ff9800" />
                          <Text style={styles.insightText}>
                            Your automation was shared {analytics.shares} times
                          </Text>
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="chart-line" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No analytics data available</Text>
                  <Text style={styles.emptySubtext}>
                    Analytics data will appear here once users start interacting with your automation
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

        </View>
      </SafeAreaView>
    </FullScreenModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  timeRangeContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  timeRangeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  timeRangeChip: {
    height: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  analyticsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: (screenWidth - 60) / 2,
    marginBottom: 12,
  },
  metricContent: {
    alignItems: 'center',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  progressBar: {
    width: '100%',
    marginTop: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  engagementRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  engagementItem: {
    alignItems: 'center',
  },
  engagementValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  engagementLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationName: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  locationCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2196f3',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  activityInfo: {
    marginLeft: 12,
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  insightText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    marginVertical: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});