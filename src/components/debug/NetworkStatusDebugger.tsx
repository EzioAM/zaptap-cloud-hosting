import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Button, Card, Chip } from 'react-native-paper';
import { useAppSelector } from '../../hooks/redux';
import { selectNetworkState, selectIsOnline, selectConnectionQuality } from '../../store/slices/offlineSlice';
import { syncManager } from '../../services/offline/SyncManager';
import { networkService } from '../../services/network/NetworkService';
import { supabaseWithRetry } from '../../services/supabase/client';
import { logger } from '../../services/analytics/AnalyticsService';

interface NetworkDebugInfo {
  reduxState: any;
  syncManagerState: any;
  supabaseState: {
    isOnline: boolean;
  };
  networkServiceState: {
    isInitialized: boolean;
  };
  timestamp: number;
}

/**
 * Debug component to monitor network state across all services
 */
export const NetworkStatusDebugger: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<NetworkDebugInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Get Redux state
  const networkState = useAppSelector(selectNetworkState);
  const isOnline = useAppSelector(selectIsOnline);
  const connectionQuality = useAppSelector(selectConnectionQuality);

  const collectDebugInfo = async (): Promise<NetworkDebugInfo> => {
    try {
      return {
        reduxState: {
          isOnline,
          connectionType: networkState.connectionType,
          isInternetReachable: networkState.isInternetReachable,
          connectionQuality,
          lastConnectedTime: networkState.lastConnectedTime,
        },
        syncManagerState: {
          networkInfo: syncManager.getNetworkInfo(),
          isSyncing: syncManager.isSyncing(),
          syncProgress: syncManager.getSyncProgress(),
        },
        supabaseState: {
          isOnline: supabaseWithRetry.getNetworkStatus(),
        },
        networkServiceState: {
          isInitialized: networkService.isInitialized_(),
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('NetworkStatusDebugger', 'Failed to collect debug info', { error });
      throw error;
    }
  };

  const refreshDebugInfo = async () => {
    try {
      setRefreshing(true);
      const info = await collectDebugInfo();
      setDebugInfo(info);
      setLastUpdate(Date.now());
      logger.info('NetworkStatusDebugger', 'Debug info refreshed', info);
    } catch (error) {
      logger.error('NetworkStatusDebugger', 'Failed to refresh debug info', { error });
    } finally {
      setRefreshing(false);
    }
  };

  const testNetworkRefresh = async () => {
    try {
      logger.info('NetworkStatusDebugger', 'Testing network refresh');
      // This would require dispatch access, so let's just refresh our debug info
      await refreshDebugInfo();
    } catch (error) {
      logger.error('NetworkStatusDebugger', 'Network refresh test failed', { error });
    }
  };

  const forceSync = async () => {
    try {
      logger.info('NetworkStatusDebugger', 'Forcing sync');
      await syncManager.forceSync();
      await refreshDebugInfo();
    } catch (error) {
      logger.error('NetworkStatusDebugger', 'Force sync failed', { error });
    }
  };

  useEffect(() => {
    refreshDebugInfo();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      if (!refreshing) {
        refreshDebugInfo();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? '#4CAF50' : '#f44336';
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return '#4CAF50';
      case 'good': return '#8BC34A';
      case 'fair': return '#FF9800';
      case 'poor': return '#FF5722';
      case 'offline': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (!debugInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading Network Debug Info...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refreshDebugInfo} />
      }
    >
      <Text style={styles.title}>Network Status Debugger</Text>
      <Text style={styles.subtitle}>
        Last updated: {formatTimestamp(lastUpdate)}
      </Text>

      <Card style={styles.card}>
        <Card.Title title="Redux Store State" />
        <Card.Content>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Online Status:</Text>
            <Chip
              style={[styles.chip, { backgroundColor: getStatusColor(debugInfo.reduxState.isOnline) }]}
              textStyle={styles.chipText}
            >
              {debugInfo.reduxState.isOnline ? 'ONLINE' : 'OFFLINE'}
            </Chip>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.label}>Connection Type:</Text>
            <Text style={styles.value}>{debugInfo.reduxState.connectionType || 'unknown'}</Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.label}>Internet Reachable:</Text>
            <Text style={styles.value}>
              {debugInfo.reduxState.isInternetReachable === null ? 'null' : 
               debugInfo.reduxState.isInternetReachable ? 'true' : 'false'}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.label}>Connection Quality:</Text>
            <Chip
              style={[styles.chip, { backgroundColor: getQualityColor(debugInfo.reduxState.connectionQuality) }]}
              textStyle={styles.chipText}
            >
              {debugInfo.reduxState.connectionQuality.toUpperCase()}
            </Chip>
          </View>

          {debugInfo.reduxState.lastConnectedTime && (
            <View style={styles.statusRow}>
              <Text style={styles.label}>Last Connected:</Text>
              <Text style={styles.value}>
                {formatTimestamp(debugInfo.reduxState.lastConnectedTime)}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="SyncManager State" />
        <Card.Content>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Network Info:</Text>
            <Text style={styles.value}>
              {debugInfo.syncManagerState.networkInfo ? 
                JSON.stringify(debugInfo.syncManagerState.networkInfo, null, 2) : 
                'null'}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.label}>Is Syncing:</Text>
            <Text style={styles.value}>{debugInfo.syncManagerState.isSyncing ? 'true' : 'false'}</Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.label}>Sync Progress:</Text>
            <Text style={styles.value}>
              {JSON.stringify(debugInfo.syncManagerState.syncProgress, null, 2)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Supabase Client State" />
        <Card.Content>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Online Status:</Text>
            <Chip
              style={[styles.chip, { backgroundColor: getStatusColor(debugInfo.supabaseState.isOnline) }]}
              textStyle={styles.chipText}
            >
              {debugInfo.supabaseState.isOnline ? 'ONLINE' : 'OFFLINE'}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Network Service State" />
        <Card.Content>
          <View style={styles.statusRow}>
            <Text style={styles.label}>Is Initialized:</Text>
            <Text style={styles.value}>
              {debugInfo.networkServiceState.isInitialized ? 'true' : 'false'}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={refreshDebugInfo}
          style={styles.button}
          loading={refreshing}
        >
          Refresh Info
        </Button>
        
        <Button
          mode="outlined"
          onPress={testNetworkRefresh}
          style={styles.button}
        >
          Test Network Refresh
        </Button>
        
        <Button
          mode="outlined"
          onPress={forceSync}
          style={styles.button}
        >
          Force Sync
        </Button>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Pull to refresh • Auto-refreshes every 10s
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  label: {
    fontWeight: '600',
    marginRight: 8,
    minWidth: 120,
  },
  value: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 12,
  },
  chip: {
    marginLeft: 8,
  },
  chipText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  button: {
    marginBottom: 8,
    minWidth: '30%',
  },
  footer: {
    marginTop: 16,
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
});