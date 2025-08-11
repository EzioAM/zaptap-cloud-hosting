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
import { EmptyState } from '../components/molecules/EmptyState';
import { useSafeTheme } from '../components/common/ThemeFallbackWrapper';
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
  const currentTheme = useSafeTheme();
  
  const statusConfig = {
    success: { color: currentTheme.colors?.semantic?.success || '#4CAF50', icon: 'check-circle', label: 'Success' },
    failed: { color: currentTheme.colors?.semantic?.error || '#F44336', icon: 'close-circle', label: 'Failed' },
    running: { color: currentTheme.colors?.semantic?.info || '#2196F3', icon: 'loading', label: 'Running' },
  };
  
  const config = statusConfig[execution.status as keyof typeof statusConfig];
  
  return (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card variant="outlined" style={styles.executionCard}>
          <CardBody>
            <View style={styles.executionHeader}>
              <View style={styles.executionInfo}>
                <Text style={[styles.automationName, { color: currentTheme.colors.text?.primary || '#000000' }]} numberOfLines={1}>
                  {execution.automation?.name || 'Unknown Automation'}
                </Text>
                <View style={styles.executionMeta}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={14}
                    color={currentTheme.colors.text?.secondary || '#666666'}
                  />
                  <Text style={[styles.timestamp, { color: currentTheme.colors.text?.secondary || '#666666' }]}>
                    {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
                  </Text>
                  {execution.execution_time && (
                    <>
                      <Text style={[styles.separator, { color: currentTheme.colors.text?.tertiary || '#999999' }]}>•</Text>
                      <MaterialCommunityIcons
                        name="timer-outline"
                        size={14}
                        color={currentTheme.colors.text?.secondary || '#666666'}
                      />
                      <Text style={[styles.duration, { color: currentTheme.colors.text?.secondary || '#666666' }]}>
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
              <View style={[styles.errorContainer, { backgroundColor: `${currentTheme.colors.semantic?.error || '#F44336'}10` }]}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={16}
                  color={currentTheme.colors.semantic?.error || '#F44336'}
                />
                <Text style={[styles.errorText, { color: currentTheme.colors.semantic?.error || '#F44336' }]} numberOfLines={2}>
                  {execution.error_message}
                </Text>
              </View>
            )}
            
            {execution.steps_completed !== undefined && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: currentTheme.colors.surface?.tertiary || '#E0E0E0' }]}>
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
                <Text style={[styles.progressText, { color: currentTheme.colors.text?.secondary || '#666666' }]}>
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
  const currentTheme = useSafeTheme();
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
          onPress: () => {
            clearHistory()
              .unwrap()
              .then(() => {
                Alert.alert('Success', 'Execution history cleared');
              })
              .catch(() => {
                Alert.alert('Error', 'Failed to clear history');
              });
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
      <Text style={[styles.title, { color: currentTheme.colors.text?.primary || '#000000' }]}>Execution History</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={handleExport} style={styles.headerButton}>
          <MaterialCommunityIcons name="download" size={24} color={currentTheme.colors.text?.secondary || '#666666'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClearHistory} style={styles.headerButton}>
          <MaterialCommunityIcons name="delete-outline" size={24} color={currentTheme.colors.text?.secondary || '#666666'} />
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
      <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background?.primary || '#FFFFFF' }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.brand?.primary || '#6200EE'} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background?.primary || '#FFFFFF' }]}>
      {renderHeader()}
      <FlatList
        data={executions || []}
        renderItem={({ item, index }) => (
          <ExecutionItem
            execution={item}
            index={index}
            onPress={() => {
              // Navigate to execution details
              navigation?.navigate('ExecutionDetails', { 
                executionId: item.id,
                execution: item 
              });
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
            tintColor={currentTheme.colors.brand?.primary || '#6200EE'}
            colors={[currentTheme.colors.brand?.primary || '#6200EE']}
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