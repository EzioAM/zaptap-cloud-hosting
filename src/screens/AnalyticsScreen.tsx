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
// Safe imports for Victory Native with error fallback
let VictoryChart: any, VictoryLine: any, VictoryPie: any, VictoryBar: any, VictoryAxis: any, VictoryTheme: any;
try {
  const victory = require('victory-native');
  VictoryChart = victory.VictoryChart;
  VictoryLine = victory.VictoryLine;
  VictoryPie = victory.VictoryPie;
  VictoryBar = victory.VictoryBar;
  VictoryAxis = victory.VictoryAxis;
  VictoryTheme = victory.VictoryTheme;
} catch (error) {
  console.warn('Victory Native failed to load, charts will be disabled:', error);
  // Fallback components
  const FallbackChart = () => (
    <View style={{ padding: 20, alignItems: 'center' }}>
      <MaterialCommunityIcons name="chart-line" size={48} color="#666" />
      <Text style={{ marginTop: 10, color: '#666' }}>Charts unavailable</Text>
    </View>
  );
  VictoryChart = VictoryLine = VictoryPie = VictoryBar = VictoryAxis = FallbackChart;
  VictoryTheme = { material: {} };
}
import { Card, CardHeader, CardBody } from '../components/atoms/Card';
import { Button, Badge, Shimmer, ShimmerPlaceholder } from '../components/atoms';
import { useUnifiedTheme as useTheme } from '../contexts/UnifiedThemeProvider';
import { theme } from '../theme';
import { useGetAnalyticsQuery } from '../store/api/analyticsApi';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatDistanceToNow } from 'date-fns';

const { width } = Dimensions.get('window');
const chartWidth = width - theme.spacing.md * 2;

type TimeRange = '24h' | '7d' | '30d' | 'all';

const TimeRangeSelector: React.FC<{
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
}> = ({ selected, onChange }) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  
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
            selected === range.value && { backgroundColor: colors.brand.primary },
          ]}
        >
          <Text
            style={[
              styles.timeRangeText,
              { color: selected === range.value ? '#FFFFFF' : colors.text.secondary },
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
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Analytics</Text>
          <TimeRangeSelector selected={timeRange} onChange={setTimeRange} />
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
                        color={colors.brand.primary}
                      />
                      <Text style={[styles.statValue, { color: colors.text.primary }]}>
                        {stats.totalExecutions}
                      </Text>
                      <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                        Total Runs
                      </Text>
                    </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="timer"
                    size={24}
                    color={colors.brand.accent}
                  />
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>
                    {stats.avgExecutionTime}s
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                    Avg Time
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="clock-check"
                    size={24}
                    color={colors.semantic.success}
                  />
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>
                    {stats.timeSaved}h
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
                    Time Saved
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons
                    name="robot"
                    size={24}
                    color={colors.brand.secondary}
                  />
                  <Text style={[styles.statValue, { color: colors.text.primary }]}>
                    {stats.activeAutomations}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.text.secondary }]}>
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
                <VictoryChart
                width={chartWidth}
                height={200}
                padding={{ top: 20, bottom: 40, left: 60, right: 40 }}
                theme={VictoryTheme.material}
              >
                <VictoryAxis
                  dependentAxis
                  style={{
                    grid: { stroke: colors.border.light },
                    tickLabels: { fill: colors.text.secondary, fontSize: 12 },
                  }}
                />
                <VictoryAxis
                  style={{
                    grid: { stroke: colors.border.light },
                    tickLabels: { fill: colors.text.secondary, fontSize: 12 },
                  }}
                />
                <VictoryLine
                  data={executionData}
                  style={{
                    data: { stroke: colors.brand.primary, strokeWidth: 3 },
                  }}
                  interpolation="catmullRom"
                />
              </VictoryChart>
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
                <VictoryPie
                  data={successRateData}
                  width={chartWidth}
                  height={200}
                  innerRadius={60}
                  padAngle={3}
                  colorScale={[colors.semantic.success, colors.semantic.error]}
                  labelRadius={({ innerRadius }) => (innerRadius as number) + 30}
                  style={{
                    labels: { fill: colors.text.primary, fontSize: 14 },
                  }}
                />
                <View style={styles.pieChartCenter}>
                  <Text style={[styles.pieChartValue, { color: colors.text.primary }]}>
                    {successRateData[0].y}%
                  </Text>
                  <Text style={[styles.pieChartLabel, { color: colors.text.secondary }]}>
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
                    <Text style={[styles.rankText, { color: colors.text.secondary }]}>
                      #{index + 1}
                    </Text>
                  </View>
                  <View style={styles.automationInfo}>
                    <Text style={[styles.automationName, { color: colors.text.primary }]}>
                      {automation.name}
                    </Text>
                    <View style={styles.automationStats}>
                      <Badge variant="info" size="small">
                        {automation.executions} runs
                      </Badge>
                      <Text style={[styles.automationTime, { color: colors.text.secondary }]}>
                        Avg: {automation.avgTime}s
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={20}
                    color={colors.text.tertiary}
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
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.displaySmall,
    marginBottom: theme.spacing.md,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.tokens.colors.gray[100],
    borderRadius: theme.tokens.borderRadius.full,
    padding: 4,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.tokens.borderRadius.full,
    alignItems: 'center',
  },
  timeRangeText: {
    ...theme.typography.labelMedium,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
    ...theme.typography.headlineMedium,
    marginTop: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
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
    ...theme.typography.displaySmall,
  },
  pieChartLabel: {
    ...theme.typography.bodyMedium,
  },
  automationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.tokens.colors.gray[100],
  },
  automationRank: {
    width: 32,
    alignItems: 'center',
  },
  rankText: {
    ...theme.typography.labelLarge,
    fontWeight: '600',
  },
  automationInfo: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  automationName: {
    ...theme.typography.bodyLarge,
    fontWeight: '500',
  },
  automationStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  automationTime: {
    ...theme.typography.caption,
    marginLeft: theme.spacing.sm,
  },
  exportContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
});