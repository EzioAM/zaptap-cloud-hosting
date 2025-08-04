import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, CardBody } from '../components/atoms/Card';
import { Badge } from '../components/atoms/Badge';
import { Button } from '../components/atoms/Button';
import { EmptyState } from '../components/molecules/EmptyState';
import { useUnifiedTheme as useTheme } from '../contexts/UnifiedThemeProvider';
import { theme } from '../theme';
import { useGetExecutionHistoryQuery, useClearHistoryMutation } from '../store/api/automationApi';
import { formatDistanceToNow } from 'date-fns';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ExecutionItemProps {
  execution: any;
  onPress: () => void;
  index: number;
}

const ExecutionItem: React.FC<ExecutionItemProps> = ({ execution, onPress, index }) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  
  const statusConfig = {
    success: { color: colors.semantic.success, icon: 'check-circle', label: 'Success' },
    failed: { color: colors.semantic.error, icon: 'close-circle', label: 'Failed' },
    running: { color: colors.semantic.info, icon: 'loading', label: 'Running' },
  };
  
  const config = statusConfig[execution.status as keyof typeof statusConfig];
  
  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card variant="outlined" style={styles.executionCard}>
          <CardBody>
            <View style={styles.executionHeader}>
              <View style={styles.executionInfo}>
                <Text style={[styles.automationName, { color: colors.text.primary }]} numberOfLines={1}>
                  {execution.automation?.name || 'Unknown Automation'}
                </Text>
                <View style={styles.executionMeta}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={colors.text.secondary}
                  />
                  <Text style={[styles.timestamp, { color: colors.text.secondary }]}>
                    {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
                  </Text>
                  {execution.execution_time && (
                    <>
                      <Text style={[styles.separator, { color: colors.text.tertiary }]}>•</Text>
                      <MaterialCommunityIcons
                        name="timer-outline"
                        size={14}
                        color={colors.text.secondary}
                      />
                      <Text style={[styles.duration, { color: colors.text.secondary }]}>
                        {execution.execution_time.toFixed(1)}s
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <Badge variant={execution.status === 'success' ? 'success' : 'error'}>
                {config.label}
              </Badge>
            </View>
            
            {execution.error_message && (
              <View style={[styles.errorContainer, { backgroundColor: `${colors.semantic.error}10` }]}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={16}
                  color={colors.semantic.error}
                />
                <Text style={[styles.errorText, { color: colors.semantic.error }]} numberOfLines={2}>
                  {execution.error_message}
                </Text>
              </View>
            )}
            
            {execution.steps_completed !== undefined && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: colors.surface.tertiary }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: config.color,
                        width: `${(execution.steps_completed / execution.total_steps) * 100}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.text.secondary }]}>
                  {execution.steps_completed} / {execution.total_steps} steps
                </Text>
              </View>
            )}
          </CardBody>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ExecutionHistoryScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { theme: currentTheme } = useTheme();
  const colors = theme.getColors(currentTheme);
  const [refreshing, setRefreshing] = useState(false);
  
  const { data: executions, isLoading, refetch } = useGetExecutionHistoryQuery({ limit: 50 });
  const [clearHistory] = useClearHistoryMutation();
  
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);
  
  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all execution history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearHistory().unwrap();
              Alert.alert('Success', 'Execution history cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ],
    );
  };
  
  const handleExport = () => {
    Alert.alert('Export History', 'Export functionality coming soon!');
  };
  
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text.primary }]}>Execution History</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={handleExport} style={styles.headerButton}>
          <MaterialCommunityIcons name="download" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClearHistory} style={styles.headerButton}>
          <MaterialCommunityIcons name="delete-outline" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderEmpty = () => (
    <EmptyState
      type="no-history"
      actionLabel="Run an Automation"
      onAction={() => navigation?.navigate('MyAutomationsTab')}
    />
  );
  
  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      {renderHeader()}
      <FlatList
        data={executions || []}
        renderItem={({ item, index }) => (
          <ExecutionItem
            execution={item}
            index={index}
            onPress={() => {
              // Navigate to execution details
              navigation?.navigate('ExecutionDetails', { executionId: item.id });
            }}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          (!executions || executions.length === 0) && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  title: {
    ...theme.typography.headlineLarge,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  emptyListContent: {
    flex: 1,
  },
  executionCard: {
    marginBottom: theme.spacing.sm,
  },
  executionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  executionInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  automationName: {
    ...theme.typography.bodyLarge,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  executionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestamp: {
    ...theme.typography.caption,
    marginLeft: theme.spacing.xs,
  },
  separator: {
    ...theme.typography.caption,
    marginHorizontal: theme.spacing.xs,
  },
  duration: {
    ...theme.typography.caption,
    marginLeft: theme.spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.tokens.borderRadius.md,
  },
  errorText: {
    ...theme.typography.caption,
    flex: 1,
    marginLeft: theme.spacing.xs,
  },
  progressContainer: {
    marginTop: theme.spacing.sm,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    ...theme.typography.caption,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});