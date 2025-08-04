import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, CardHeader, CardBody } from '../../atoms/Card';
import { Shimmer } from '../../atoms/Shimmer';
import { useTheme } from '../../../contexts/ThemeContext';
import { theme } from '../../../theme';
import { useGetRecentExecutionsQuery } from '../../../store/api/automationApi';
import Animated, { FadeInRight } from 'react-native-reanimated';
// Simple date formatting function
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

interface ExecutionItemProps {
  title: string;
  status: 'success' | 'failed' | 'running';
  timestamp: string;
  duration?: number;
  delay?: number;
}

const ExecutionItem: React.FC<ExecutionItemProps> = ({ 
  title, 
  status, 
  timestamp, 
  duration,
  delay = 0 
}) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);

  const statusConfig = {
    success: {
      icon: 'check-circle' as const,
      color: colors.semantic.success,
      label: 'Success',
    },
    failed: {
      icon: 'alert-circle' as const,
      color: colors.semantic.error,
      label: 'Failed',
    },
    running: {
      icon: 'timer-sand' as const,
      color: colors.brand.primary,
      label: 'Running',
    },
  };

  const config = statusConfig[status];

  return (
    <Animated.View
      entering={FadeInRight.delay(delay).springify()}
      style={[styles.executionItem, { borderBottomColor: colors.border.light }]}
    >
      <View style={[styles.statusIcon, { backgroundColor: `${config.color}15` }]}>
        <MaterialCommunityIcons
          name={config.icon}
          size={20}
          color={config.color}
        />
      </View>
      <View style={styles.executionInfo}>
        <Text style={[styles.executionTitle, { color: colors.text.primary }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.executionMeta}>
          <Text style={[styles.executionTime, { color: colors.text.tertiary }]}>
            {formatTime(timestamp)}
          </Text>
          {duration && (
            <>
              <Text style={[styles.dot, { color: colors.text.tertiary }]}>•</Text>
              <Text style={[styles.executionTime, { color: colors.text.tertiary }]}>
                {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}
              </Text>
            </>
          )}
        </View>
      </View>
      <Text style={[styles.statusLabel, { color: config.color }]}>
        {config.label}
      </Text>
    </Animated.View>
  );
};

export const RecentActivityWidget: React.FC = () => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const { data: executions = [], isLoading } = useGetRecentExecutionsQuery({ limit: 5 });

  const viewAllAction = (
    <MaterialCommunityIcons
      name="chevron-right"
      size={24}
      color={colors.text.secondary}
    />
  );

  if (isLoading) {
    return (
      <Card variant="elevated" style={styles.container}>
        <CardHeader title="Recent Activity" action={viewAllAction} />
        <CardBody>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[styles.executionItem, { borderBottomColor: colors.border.light }]}>
              <Shimmer width={36} height={36} borderRadius={18} style={{ marginRight: theme.spacing.sm }} />
              <View style={styles.executionInfo}>
                <Shimmer width={120} height={16} style={{ marginBottom: theme.spacing.xs }} />
                <Shimmer width={80} height={12} />
              </View>
              <Shimmer width={60} height={20} borderRadius={theme.tokens.borderRadius.full} />
            </View>
          ))}
        </CardBody>
      </Card>
    );
  }

  if (executions.length === 0) {
    return (
      <Card variant="elevated" style={styles.container}>
        <CardHeader title="Recent Activity" />
        <CardBody>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="history"
              size={48}
              color={colors.text.tertiary}
            />
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              No recent activity
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.text.tertiary }]}>
              Run an automation to see it here
            </Text>
          </View>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="elevated" style={styles.container} elevation="md">
      <CardHeader 
        title="Recent Activity" 
        subtitle="Last 5 executions"
        action={viewAllAction} 
      />
      <CardBody noPadding>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {executions.map((execution: any, index: number) => (
            <ExecutionItem
              key={execution.id}
              title={execution.automation?.title || 'Unknown Automation'}
              status={execution.status}
              timestamp={execution.created_at}
              duration={execution.duration_ms}
              delay={index * 50}
            />
          ))}
        </ScrollView>
      </CardBody>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    maxHeight: 320,
  },
  scrollView: {
    maxHeight: 250,
  },
  executionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: theme.constants.borderWidth,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.tokens.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  executionInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  executionTitle: {
    ...theme.typography.bodyMedium,
    marginBottom: 2,
  },
  executionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  executionTime: {
    ...theme.typography.caption,
  },
  dot: {
    marginHorizontal: theme.spacing.xs,
    ...theme.typography.caption,
  },
  statusLabel: {
    ...theme.typography.labelSmall,
    fontWeight: theme.tokens.typography.fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    ...theme.typography.bodyLarge,
    marginTop: theme.spacing.md,
  },
  emptySubtext: {
    ...theme.typography.bodySmall,
    marginTop: theme.spacing.xs,
  },
});