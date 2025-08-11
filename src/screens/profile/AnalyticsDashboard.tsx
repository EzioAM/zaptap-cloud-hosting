/**
 * AnalyticsDashboard - Personal usage statistics and insights screen
 * Shows user their automation usage, engagement metrics, and achievements
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  ProgressBar,
  List,
  Divider,
  useTheme,
} from 'react-native-paper';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useAnalytics } from '../../contexts/AnalyticsContext';
import { AnalyticsService } from '../../services/analytics/AnalyticsService';
import { PerformanceMonitor, PerformanceSummary } from '../../services/monitoring/PerformanceMonitor';
import { EventLogger } from '../../utils/EventLogger';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

interface UserAnalytics {
  totalAutomations: number;
  totalExecutions: number;
  totalShares: number;
  mostUsedAutomations: Array<{
    id: string;
    name: string;
    executions: number;
  }>;
  weeklyStats: Array<{
    date: string;
    executions: number;
    shares: number;
  }>;
  deploymentStats: {
    nfcTags: number;
    qrCodes: number;
    shareLinks: number;
  };
  engagementScore: number;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
    icon: string;
  }>;
  usageInsights: Array<{
    type: 'tip' | 'achievement' | 'trend';
    title: string;
    description: string;
    action?: {
      label: string;
      onPress: () => void;
    };
  }>;
}

interface AnalyticsDashboardProps {
  navigation?: any;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ navigation }) => {
  const theme = useTheme();
  const { track, screen } = useAnalytics();
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isInitialized, setIsInitialized] = useState(true);

  // Track screen view
  useEffect(() => {
    screen('AnalyticsDashboard');
  }, []);

  // Load analytics data
  useEffect(() => {
    if (isInitialized) {
      loadAnalyticsData();
    }
  }, [isInitialized, timeRange]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Simulate loading analytics data
      // In a real implementation, this would come from your backend
      const mockAnalytics: UserAnalytics = {
        totalAutomations: 12,
        totalExecutions: 156,
        totalShares: 8,
        mostUsedAutomations: [
          { id: '1', name: 'Morning Routine', executions: 45 },
          { id: '2', name: 'Work Setup', executions: 32 },
          { id: '3', name: 'Bedtime Actions', executions: 28 },
          { id: '4', name: 'Workout Playlist', executions: 21 },
          { id: '5', name: 'Travel Mode', executions: 15 },
        ],
        weeklyStats: generateWeeklyStats(timeRange),
        deploymentStats: {
          nfcTags: 5,
          qrCodes: 3,
          shareLinks: 8,
        },
        engagementScore: 78,
        achievements: [
          {
            id: 'first_automation',
            name: 'Automation Pioneer',
            description: 'Created your first automation',
            unlockedAt: '2024-01-15T10:30:00Z',
            icon: '🚀',
          },
          {
            id: 'power_user',
            name: 'Power User',
            description: 'Executed 100+ automations',
            unlockedAt: '2024-02-20T15:45:00Z',
            icon: '⚡',
          },
          {
            id: 'sharing_enthusiast',
            name: 'Sharing Enthusiast',
            description: 'Shared 5+ automations with others',
            unlockedAt: '2024-03-10T09:20:00Z',
            icon: '🤝',
          },
        ],
        usageInsights: generateUsageInsights(),
      };
      
      setAnalytics(mockAnalytics);
      
      // Load performance data
      const perfData = PerformanceMonitor.getPerformanceSummary();
      setPerformanceData(perfData);
      
      // Track analytics viewed event
      track('feature_used', {
        feature_name: 'analytics_dashboard',
        time_range: timeRange,
      });
      
      EventLogger.info('AnalyticsDashboard', 'Analytics data loaded', { timeRange });
      
    } catch (error) {
      EventLogger.error('AnalyticsDashboard', 'Failed to load analytics data', error as Error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  const generateWeeklyStats = (range: '7d' | '30d' | '90d') => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const stats = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      stats.push({
        date: date.toISOString().split('T')[0],
        executions: Math.floor(Math.random() * 20) + 1,
        shares: Math.floor(Math.random() * 3),
      });
    }
    
    return stats;
  };

  const generateUsageInsights = () => {
    return [
      {
        type: 'tip' as const,
        title: 'Optimize Your Morning Routine',
        description: 'Your Morning Routine automation is your most used. Consider adding weather-based conditions to make it even smarter.',
        action: {
          label: 'Edit Automation',
          onPress: () => {
            track('button_pressed', {
              button_name: 'edit_automation_from_insight',
              automation_name: 'Morning Routine',
            });
            // Navigate to automation builder
          },
        },
      },
      {
        type: 'achievement' as const,
        title: 'Share Your Creations',
        description: "You're just 2 shares away from unlocking the 'Community Builder' achievement!",
      },
      {
        type: 'trend' as const,
        title: 'Usage Trending Up',
        description: 'Your automation usage has increased by 23% this month. Great job staying productive!',
      },
    ];
  };

  const getChartConfig = () => ({
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => (theme.colors.brand?.primary || '#6200ee') + Math.round(opacity * 255).toString(16).padStart(2, '0'),
    labelColor: (opacity = 1) => theme.colors.onSurface + Math.round(opacity * 255).toString(16).padStart(2, '0'),
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  });

  const formatEngagementScore = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: '#4CAF50' };
    if (score >= 60) return { label: 'Good', color: '#FF9800' };
    if (score >= 40) return { label: 'Fair', color: '#FF5722' };
    return { label: 'Getting Started', color: '#9E9E9E' };
  };

  if (loading && !analytics) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading your analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Unable to load analytics data</Text>
        <Button mode="outlined" onPress={loadAnalyticsData} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  const engagementInfo = formatEngagementScore(analytics.engagementScore);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Stats */}
      <Card style={styles.card}>
        <Card.Title 
          title="Your Analytics" 
          subtitle={`Last ${timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}`}
        />
        <Card.Content>
          <View style={styles.timeRangeContainer}>
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Chip 
                key={range}
                selected={timeRange === range}
                onPress={() => setTimeRange(range)}
                style={styles.timeRangeChip}
              >
                {range === '7d' ? '7 days' : range === '30d' ? '30 days' : '90 days'}
              </Chip>
            ))}
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{analytics.totalAutomations}</Text>
              <Text style={styles.statLabel}>Automations</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{analytics.totalExecutions}</Text>
              <Text style={styles.statLabel}>Executions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{analytics.totalShares}</Text>
              <Text style={styles.statLabel}>Shares</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Engagement Score */}
      <Card style={styles.card}>
        <Card.Title 
          title="Engagement Score" 
          subtitle={`${analytics.engagementScore}/100 - ${engagementInfo.label}`}
        />
        <Card.Content>
          <ProgressBar 
            progress={analytics.engagementScore / 100} 
            color={engagementInfo.color}
            style={styles.progressBar}
          />
          <Text style={styles.engagementDescription}>
            Based on your automation creation, usage frequency, and sharing activity.
          </Text>
        </Card.Content>
      </Card>

      {/* Usage Trends Chart */}
      <Card style={styles.card}>
        <Card.Title title="Usage Trends" />
        <Card.Content>
          {analytics.weeklyStats.length > 0 && (
            <LineChart
              data={{
                labels: analytics.weeklyStats
                  .filter((_, i) => i % Math.ceil(analytics.weeklyStats.length / 6) === 0)
                  .map(stat => {
                    const date = new Date(stat.date);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }),
                datasets: [
                  {
                    data: analytics.weeklyStats
                      .filter((_, i) => i % Math.ceil(analytics.weeklyStats.length / 6) === 0)
                      .map(stat => stat.executions),
                    strokeWidth: 2,
                  },
                ],
              }}
              width={chartWidth}
              height={200}
              chartConfig={getChartConfig()}
              bezier
              style={styles.chart}
            />
          )}
        </Card.Content>
      </Card>

      {/* Most Used Automations */}
      <Card style={styles.card}>
        <Card.Title title="Most Used Automations" />
        <Card.Content>
          {analytics.mostUsedAutomations.map((automation, index) => (
            <View key={automation.id} style={{ paddingVertical: 4 }}>
              <List.Item
                title={automation.name}
                description={`${automation.executions} executions`}
                style={{ paddingVertical: 8 }}
                left={(props) => (
                  <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary || '#6200ee' }]}>
                    <Text style={[styles.rankText, { color: '#ffffff' }]}>
                      {index + 1}
                    </Text>
                  </View>
                )}
                right={(props) => (
                  <View style={{ width: 80, alignSelf: 'center' }}>
                    <ProgressBar 
                      progress={automation.executions / analytics.mostUsedAutomations[0].executions}
                      style={styles.automationProgress}
                      color={theme.colors.primary || '#6200ee'}
                    />
                  </View>
                )}
              />
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Deployment Stats */}
      <Card style={styles.card}>
        <Card.Title title="Deployment Methods" />
        <Card.Content>
          <View style={styles.deploymentGrid}>
            <View style={styles.deploymentItem}>
              <Text style={styles.deploymentIcon}>📱</Text>
              <Text style={styles.deploymentValue}>{analytics.deploymentStats.nfcTags}</Text>
              <Text style={styles.deploymentLabel}>NFC Tags</Text>
            </View>
            <View style={styles.deploymentItem}>
              <Text style={styles.deploymentIcon}>📋</Text>
              <Text style={styles.deploymentValue}>{analytics.deploymentStats.qrCodes}</Text>
              <Text style={styles.deploymentLabel}>QR Codes</Text>
            </View>
            <View style={styles.deploymentItem}>
              <Text style={styles.deploymentIcon}>🔗</Text>
              <Text style={styles.deploymentValue}>{analytics.deploymentStats.shareLinks}</Text>
              <Text style={styles.deploymentLabel}>Share Links</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Achievements */}
      <Card style={styles.card}>
        <Card.Title title="Achievements" subtitle={`${analytics.achievements.length} unlocked`} />
        <Card.Content>
          {analytics.achievements.map((achievement) => (
            <View key={achievement.id} style={{ paddingVertical: 4 }}>
              <List.Item
                title={achievement.name}
                description={achievement.description}
                style={{ paddingVertical: 8 }}
                left={() => (
                  <View style={styles.achievementIcon}>
                    <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
                  </View>
                )}
                right={() => (
                  <View style={{ justifyContent: 'center' }}>
                    <Text style={styles.achievementDate}>
                      {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              />
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Usage Insights */}
      <Card style={styles.card}>
        <Card.Title title="Usage Insights" />
        <Card.Content>
          {analytics.usageInsights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <View style={styles.insightHeader}>
                <Chip 
                  mode="outlined" 
                  compact
                  style={[
                    styles.insightChip,
                    { 
                      backgroundColor: insight.type === 'tip' ? '#E3F2FD' : 
                                      insight.type === 'achievement' ? '#FFF3E0' : '#E8F5E8'
                    }
                  ]}
                >
                  {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                </Chip>
              </View>
              <Text style={styles.insightTitle}>{insight.title}</Text>
              <Text style={styles.insightDescription}>{insight.description}</Text>
              {insight.action && (
                <Button 
                  mode="outlined" 
                  compact 
                  onPress={insight.action.onPress}
                  style={styles.insightAction}
                >
                  {insight.action.label}
                </Button>
              )}
              {index < analytics.usageInsights.length - 1 && (
                <Divider style={styles.insightDivider} />
              )}
            </View>
          ))}
        </Card.Content>
      </Card>

      {/* Performance Stats (if available) */}
      {performanceData && (
        <Card style={styles.card}>
          <Card.Title title="App Performance" subtitle="Your usage impact" />
          <Card.Content>
            <View style={styles.performanceGrid}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>
                  {performanceData.app_launch_time.average.toFixed(0)}ms
                </Text>
                <Text style={styles.performanceLabel}>Avg Launch Time</Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceValue}>
                  {performanceData.memory_usage.average.toFixed(0)}MB
                </Text>
                <Text style={styles.performanceLabel}>Memory Usage</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Export Data */}
      <Card style={styles.card}>
        <Card.Title title="Data Export" subtitle="Download your analytics data" />
        <Card.Content>
          <Text style={styles.exportDescription}>
            Export your personal analytics data for external analysis or backup.
          </Text>
          <Button 
            mode="outlined" 
            onPress={() => {
              track('button_pressed', {
                button_name: 'export_analytics_data',
              });
              // Implement data export functionality
            }}
            style={styles.exportButton}
          >
            Export Data
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 16,
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timeRangeChip: {
    marginHorizontal: 4,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  engagementDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  automationProgress: {
    width: 60,
    height: 4,
    alignSelf: 'center',
  },
  deploymentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  deploymentItem: {
    alignItems: 'center',
  },
  deploymentIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  deploymentValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  deploymentLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  achievementEmoji: {
    fontSize: 18,
  },
  achievementDate: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'center',
  },
  insightItem: {
    marginBottom: 12,
    paddingBottom: 12,
  },
  insightHeader: {
    marginBottom: 8,
  },
  insightChip: {
    alignSelf: 'flex-start',
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  insightDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  insightAction: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  insightDivider: {
    marginTop: 12,
    marginBottom: 4,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  performanceItem: {
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  exportDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  exportButton: {
    alignSelf: 'flex-start',
  },
  bottomSpacer: {
    height: 32,
  },
});