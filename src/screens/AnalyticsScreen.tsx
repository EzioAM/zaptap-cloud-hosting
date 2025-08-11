import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, CardHeader, CardBody } from '../components/atoms/Card';
import { Button, Badge, Shimmer, ShimmerPlaceholder } from '../components/atoms';
import { useSafeTheme } from '../components/common/ThemeFallbackWrapper';
// import { theme } from '../theme';
import { useGetAnalyticsQuery } from '../store/api/analyticsApi';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatDistanceToNow } from 'date-fns';
import { EventLogger } from '../utils/EventLogger';

// Disable Victory Native for now - causing render issues
const FallbackChart = () => (
  <View style={{ padding: 20, alignItems: 'center' }}>
    <MaterialCommunityIcons name="chart-line" size={48} color="#666" />
    <Text style={{ marginTop: 10, color: '#666' }}>Charts temporarily disabled</Text>
  </View>
);
const VictoryChart = FallbackChart;
const VictoryLine = FallbackChart;
const VictoryPie = FallbackChart;
const VictoryBar = FallbackChart;
const VictoryAxis = FallbackChart;
const VictoryTheme = { material: {} };

const { width } = Dimensions.get('window');

type TimeRange = '24h' | '7d' | '30d' | 'all';

const TimeRangeSelector: React.FC<{
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
  theme: any;
}> = ({ selected, onChange, theme }) => {
  const colors = theme.colors;
  
  const ranges: { value: TimeRange; label: string }[] = [
    { value: '24h', label: '24H' },
    { value: '7d', label: '7D' },
    { value: '30d', label: '30D' },
    { value: 'all', label: 'All' },
  ];
  
  return (
    <View style={styles.timeRangeContainer}>
      {ranges.map((range) => (
        <TouchableOpacity
          key={range.value}
          onPress={() => onChange(range.value)}
          style={[
            styles.timeRangeButton,
            selected === range.value && { backgroundColor: colors.brand?.primary || '#6200ee' },
          ]}
        >
          <Text
            style={[
              styles.timeRangeText,
              { color: selected === range.value ? '#FFFFFF' : colors.text?.secondary || '#666666' },
            ]}
          >
            {range.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const AnalyticsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const theme = useSafeTheme();
  const colors = theme.colors;
  const chartWidth = width - (theme.spacing?.md || 16) * 2;
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const { data: analytics, isLoading } = useGetAnalyticsQuery({ timeRange });
  
  // Sample data - replace with real data from API
  const executionData = analytics?.executionTimeline || [
    { x: 1, y: 12 },
    { x: 2, y: 15 },
    { x: 3, y: 20 },
    { x: 4, y: 18 },
    { x: 5, y: 25 },
    { x: 6, y: 30 },
    { x: 7, y: 28 },
  ];
  
  const successRateData = [
    { x: 'Success', y: analytics?.successRate || 85 },
    { x: 'Failed', y: 100 - (analytics?.successRate || 85) },
  ];
  
  const topAutomations = analytics?.topAutomations || [
    { name: 'Morning Routine', executions: 145, avgTime: 2.3 },
    { name: 'Email Digest', executions: 98, avgTime: 1.5 },
    { name: 'Social Media Post', executions: 76, avgTime: 3.2 },
    { name: 'Backup Files', executions: 45, avgTime: 5.1 },
    { name: 'Weather Alert', executions: 32, avgTime: 0.8 },
  ];
  
  const stats = {
    totalExecutions: analytics?.totalExecutions || 1234,
    avgExecutionTime: analytics?.avgExecutionTime || 2.4,
    timeSaved: analytics?.timeSaved || 48.6,
    activeAutomations: analytics?.activeAutomations || 15,
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background?.primary || colors.background || '#F5F5F5' }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text?.primary || '#000000' }]}>Analytics</Text>
          <TimeRangeSelector selected={timeRange} onChange={setTimeRange} theme={theme} />
        </View>
        
        {/* Summary Stats */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Card variant="elevated" style={styles.card} elevation="md">
            <CardBody>
              <View style={styles.statsGrid}>
                {isLoading ? (
                  <>
                    {[0, 1, 2, 3].map((index) => (
                      <View key={index} style={styles.statItem}>
                        <Shimmer width={24} height={24} borderRadius={12} />
                        <Shimmer width={60} height={28} style={{ marginTop: 8 }} />
                        <Shimmer width={70} height={16} style={{ marginTop: 4 }} />
                      </View>
                    ))}
                  </>
                ) : (
                  <>
                    <View style={styles.statItem}>
                      <MaterialCommunityIcons
                        name="play-circle"
                        size={24}
                        color={colors.brand?.primary || '#6200ee'}
                      />
                      <Text style={[styles.statValue, { color: colors.text?.primary || '#000000' }]}>
                        {stats.totalExecutions}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.text?.secondary || '#666666' }]}>
                        Total Runs
                      </Text>
                    </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="timer"
                    size={24}
                    color={colors.brand?.accent || '#BB86FC'}
                  />
                  <Text style={[styles.statValue, { color: colors.text?.primary || '#000000' }]}>
                    {stats.avgExecutionTime}s
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text?.secondary || '#666666' }]}>
                    Avg Time
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="clock-check"
                    size={24}
                    color={colors.semantic?.success || '#4CAF50'}
                  />
                  <Text style={[styles.statValue, { color: colors.text?.primary || '#000000' }]}>
                    {stats.timeSaved}h
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text?.secondary || '#666666' }]}>
                    Time Saved
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="robot"
                    size={24}
                    color={colors.brand?.secondary || '#03DAC6'}
                  />
                  <Text style={[styles.statValue, { color: colors.text?.primary || '#000000' }]}>
                    {stats.activeAutomations}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text?.secondary || '#666666' }]}>
                    Active
                  </Text>
                </View>
                  </>
                )}
              </View>
            </CardBody>
          </Card>
        </Animated.View>
        
        {/* Execution Timeline */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Card variant="elevated" style={styles.card} elevation="md">
            <CardHeader title="Execution Timeline" icon="chart-line" />
            <CardBody>
              {isLoading ? (
                <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                  <Shimmer width={chartWidth - 40} height={160} borderRadius={8} />
                </View>
              ) : (
                <FallbackChart />
              )}
            </CardBody>
          </Card>
        </Animated.View>
        
        {/* Success Rate */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Card variant="elevated" style={styles.card} elevation="md">
            <CardHeader title="Success Rate" icon="check-circle" />
            <CardBody>
              <View style={styles.pieChartContainer}>
                <FallbackChart />
                <View style={styles.pieChartCenter}>
                  <Text style={[styles.pieChartValue, { color: colors.text?.primary || '#000000' }]}>
                    {successRateData[0].y}%
                  </Text>
                  <Text style={[styles.pieChartLabel, { color: colors.text?.secondary || '#666666' }]}>
                    Success
                  </Text>
                </View>
              </View>
            </CardBody>
          </Card>
        </Animated.View>
        
        {/* Top Automations */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Card variant="elevated" style={styles.card} elevation="md">
            <CardHeader title="Top Automations" icon="trending-up" />
            <CardBody>
              {topAutomations.map((automation, index) => (
                <TouchableOpacity
                  key={automation.name}
                  style={styles.automationItem}
                  onPress={() => {}}
                >
                  <View style={styles.automationRank}>
                    <Text style={[styles.rankText, { color: colors.text?.secondary || '#666666' }]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.automationInfo}>
                    <Text style={[styles.automationName, { color: colors.text?.primary || '#000000' }]}>
                      {automation.name}
                    </Text>
                    <View style={styles.automationStats}>
                      <Badge variant="info" size="small">
                        {automation.executions} runs
                      </Badge>
                      <Text style={[styles.automationTime, { color: colors.text?.secondary || '#666666' }]}>
                        Avg: {automation.avgTime}s
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.text?.tertiary || '#999999'}
                  />
                </TouchableOpacity>
              ))}
            </CardBody>
          </Card>
        </Animated.View>
        
        {/* Export Button */}
        <View style={styles.exportContainer}>
          <Button
            variant="outline"
            label="Export Analytics"
            icon="download"
            onPress={() => {}}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  pieChartContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  pieChartCenter: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
  },
  pieChartValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  pieChartLabel: {
    fontSize: 14,
  },
  automationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  automationRank: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '600',
  },
  automationInfo: {
    flex: 1,
    marginLeft: 8,
  },
  automationName: {
    fontSize: 16,
    fontWeight: '500',
  },
  automationStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  automationTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  exportContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
});