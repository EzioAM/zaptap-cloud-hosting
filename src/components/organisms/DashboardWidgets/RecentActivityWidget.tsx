import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeTheme } from '../../common/ThemeFallbackWrapper';
import { useGetRecentActivityQuery } from '../../../store/api/dashboardApi';
import { useNavigation } from '@react-navigation/native';
import EnhancedLoadingSkeleton from '../../common/EnhancedLoadingSkeleton';
// Simple date formatting function
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

interface ExecutionItemProps {
  title: string;
  status: 'success' | 'failed' | 'running' | 'cancelled';
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
  const theme = useSafeTheme();

  const statusConfig = {
    success: {
      icon: 'check-circle' as const,
      color: '#4CAF50',
      label: 'Success',
    },
    failed: {
      icon: 'alert-circle' as const,
      color: '#ff4444',
      label: 'Failed',
    },
    running: {
      icon: 'timer-sand' as const,
      color: theme.colors?.primary || '#6200ee',
      label: 'Running',
    },
    cancelled: {
      icon: 'cancel' as const,
      color: '#999',
      label: 'Cancelled',
    },
  };

  const config = statusConfig[status];

  return (
    <View style={[styles.executionItem, { borderBottomColor: '#e0e0e0' }]}>
      <View style={[styles.statusIcon, { backgroundColor: `${config.color}15` }]}>
        <MaterialCommunityIcons
          name={config.icon}
          size={20}
          color={config.color}
        />
      </View>
      <View style={styles.executionInfo}>
        <Text style={[styles.executionTitle, { color: theme.colors?.text || '#000' }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.executionMeta}>
          <Text style={[styles.executionTime, { color: theme.colors?.textSecondary || '#666' }]}>
            {formatTime(timestamp)}
            {duration ? ` • ${duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}` : ''}
          </Text>
        </View>
      </View>
      <Text style={[styles.statusLabel, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

export const RecentActivityWidget: React.FC = () => {
  const theme = useSafeTheme();
  const navigation = useNavigation();
  const { data: activities = [], isLoading, error } = useGetRecentActivityQuery();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors?.surface || '#fff' }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
            Recent Activity
          </Text>
          <Text style={[styles.viewAll, { color: theme.colors?.primary || '#6200ee' }]}>
            View All
          </Text>
        </View>
        <EnhancedLoadingSkeleton 
          variant="list" 
          count={3} 
          showAnimation={true}
        />
      </View>
    );
  }

  if (error || activities.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors?.surface || '#fff' }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
            Recent Activity
          </Text>
        </View>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons
            name="history"
            size={48}
            color={theme.colors?.textSecondary || '#666'}
          />
          <Text style={[styles.emptyText, { color: theme.colors?.textSecondary || '#666' }]}>
            No recent activity
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.colors?.textSecondary || '#999' }]}>
            Run an automation to see it here
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors?.surface || '#fff' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors?.text || '#000' }]}>
          Recent Activity
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ExecutionHistory' as never)}
        >
          <Text style={[styles.viewAll, { color: theme.colors?.primary || '#6200ee' }]}>
            View All
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {activities.slice(0, 5).map((activity: any, index: number) => {
          return (
            <ExecutionItem
              key={activity.id}
              title={activity.automation?.title || 'Unknown Automation'}
              status={activity.status}
              timestamp={activity.createdAt}
              duration={activity.executionTime}
              delay={index * 50}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 320,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: 250,
  },
  executionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  executionInfo: {
    flex: 1,
    marginRight: 8,
  },
  executionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  executionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  executionTime: {
    fontSize: 12,
  },
  dot: {
    marginHorizontal: 4,
    fontSize: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
});

export default RecentActivityWidget;