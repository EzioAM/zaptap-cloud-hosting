import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeTheme } from '../components/common/ThemeFallbackWrapper';
import { Card, CardBody } from '../components/atoms/Card';
import { Badge } from '../components/atoms/Badge';
import { formatDistanceToNow } from 'date-fns';

interface ExecutionDetailsScreenProps {
  route: {
    params: {
      executionId: string;
      execution?: any;
    };
  };
}

export const ExecutionDetailsScreen: React.FC<ExecutionDetailsScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const theme = useSafeTheme();
  const { executionId, execution } = route.params || {};

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return theme.colors.success || '#4CAF50';
      case 'error':
        return theme.colors.error || '#F44336';
      case 'running':
        return theme.colors.warning || '#FF9800';
      default:
        return theme.colors.onSurfaceVariant || '#757575';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'running':
        return 'progress-clock';
      default:
        return 'help-circle';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={24} 
            color={theme.colors.onSurface} 
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Execution Details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <CardBody>
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                Execution ID
              </Text>
              <Text style={[styles.value, { color: theme.colors.onSurface }]}>
                {executionId || 'Unknown'}
              </Text>
            </View>

            {execution && (
              <>
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                    Status
                  </Text>
                  <View style={styles.statusRow}>
                    <MaterialCommunityIcons 
                      name={getStatusIcon(execution.status)} 
                      size={20} 
                      color={getStatusColor(execution.status)} 
                    />
                    <Text style={[
                      styles.statusText, 
                      { color: getStatusColor(execution.status) }
                    ]}>
                      {execution.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                    Automation
                  </Text>
                  <Text style={[styles.value, { color: theme.colors.onSurface }]}>
                    {execution.automation_name || 'Unknown Automation'}
                  </Text>
                </View>

                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                    Executed
                  </Text>
                  <Text style={[styles.value, { color: theme.colors.onSurface }]}>
                    {execution.created_at ? 
                      formatDistanceToNow(new Date(execution.created_at), { addSuffix: true }) 
                      : 'Unknown'}
                  </Text>
                </View>

                {execution.duration && (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                      Duration
                    </Text>
                    <Text style={[styles.value, { color: theme.colors.onSurface }]}>
                      {execution.duration}ms
                    </Text>
                  </View>
                )}

                {execution.error && (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                      Error Message
                    </Text>
                    <Text style={[styles.errorText, { color: theme.colors.error }]}>
                      {execution.error}
                    </Text>
                  </View>
                )}
              </>
            )}
          </CardBody>
        </Card>

        {/* Placeholder for execution steps */}
        <Card style={styles.card}>
          <CardBody>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Execution Steps
            </Text>
            <Text style={[styles.placeholder, { color: theme.colors.onSurfaceVariant }]}>
              Step-by-step execution details will be shown here in a future update.
            </Text>
          </CardBody>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  placeholder: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default ExecutionDetailsScreen;