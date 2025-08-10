import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { useGetTodayStatsQuery } from '../../../store/api/dashboardApi';

interface StatItemProps {
  icon: string;
  value: string | number;
  label: string;
  color: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, value, label, color }) => {
  const theme = useSafeTheme();
  
  return (
    <View style={styles.statItem}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.colors?.text || '#000' }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.colors?.textSecondary || '#666' }]}>
        {label}
      </Text>
    </View>
  );
};

export const QuickStatsWidget: React.FC = () => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const { data: stats, isLoading } = useGetUserStatsQuery();

  // Calculate today's stats (in a real app, this would come from the API)
  const todayStats = {
    executions: stats?.total_runs || 0,
    successRate: stats?.total_runs > 0 
      ? Math.round((stats.successful_runs / stats.total_runs) * 100) 
      : 100,
    timeSaved: Math.round((stats?.total_time_saved || 0) / 60), // Convert to minutes
    activeAutomations: stats?.total_automations || 0,
  };

  if (isLoading) {
    return (
      <Card variant="elevated" style={styles.container} elevation="lg">
        <CardBody>
          <View style={styles.header}>
            <Shimmer width={150} height={20} />
            <Shimmer width={20} height={20} borderRadius={10} />
          </View>
          <View style={styles.statsGrid}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.statItem}>
                <Shimmer width={56} height={56} borderRadius={theme.tokens.borderRadius.xl} />
                <Shimmer width={40} height={24} style={{ marginTop: theme.spacing.xs }} />
                <Shimmer width={50} height={16} style={{ marginTop: 4 }} />
              </View>
            ))}
          </View>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="elevated" style={styles.container} elevation="lg">
      <CardBody>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text.primary }]}>Today's Activity</Text>
          <MaterialCommunityIcons 
            name="chart-line" 
            size={20} 
            color={colors.text.secondary} 
          />
        </View>
        <View style={styles.statsGrid}>
          <StatItem
            icon="play-circle"
            value={todayStats.executions}
            label="Runs"
            color={colors.brand.primary}
            delay={0}
          />
          <StatItem
            icon="check-circle"
            value={`${todayStats.successRate}%`}
            label="Success"
            color={colors.semantic.success}
            delay={100}
          />
          <StatItem
            icon="clock-fast"
            value={`${todayStats.timeSaved}m`}
            label="Saved"
            color={colors.brand.accent}
            delay={200}
          />
          <StatItem
            icon="robot"
            value={todayStats.activeAutomations}
            label="Active"
            color={colors.brand.secondary}
            delay={300}
          />
        </View>
      </CardBody>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.titleLarge,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.tokens.borderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    ...theme.typography.headlineMedium,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    ...theme.typography.caption,
  },
});