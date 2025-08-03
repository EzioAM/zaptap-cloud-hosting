import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  List,
  Chip,
  Button,
  Searchbar,
  IconButton,
  Menu,
  Divider,
  Badge,
} from 'react-native-paper';
import { DeveloperService } from '../../services/developer/DeveloperService';

interface NetworkLogDisplay {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  requestBody?: any;
  responseBody?: any;
  error?: string;
}

export const NetworkMonitor: React.FC = () => {
  const [logs, setLogs] = useState<NetworkLogDisplay[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<NetworkLogDisplay[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<NetworkLogDisplay | null>(null);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    showErrors: true,
    showSuccess: true,
    method: 'all',
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadNetworkLogs();
    const interval = setInterval(loadNetworkLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, activeFilters]);

  const loadNetworkLogs = () => {
    const networkLogs = DeveloperService.getNetworkLogs();
    setLogs(networkLogs);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNetworkLogs();
    setRefreshing(false);
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.status && log.status.toString().includes(searchQuery))
      );
    }

    // Apply status filter
    filtered = filtered.filter(log => {
      if (log.error || (log.status && log.status >= 400)) {
        return activeFilters.showErrors;
      }
      return activeFilters.showSuccess;
    });

    // Apply method filter
    if (activeFilters.method !== 'all') {
      filtered = filtered.filter(log => 
        log.method.toUpperCase() === activeFilters.method.toUpperCase()
      );
    }

    setFilteredLogs(filtered);
  };

  const getStatusColor = (status?: number, error?: string): string => {
    if (error) return '#f44336';
    if (!status) return '#666';
    if (status >= 200 && status < 300) return '#4caf50';
    if (status >= 300 && status < 400) return '#ff9800';
    return '#f44336';
  };

  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleTimeString();
  };

  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatUrl = (url: string): string => {
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname}`;
    } catch {
      return url;
    }
  };

  const copyToClipboard = (data: any, label: string) => {
    const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    console.log(`${label}:`, formatted);
    Alert.alert('Copied', `${label} copied to console`);
  };

  const renderLogDetails = () => {
    if (!selectedLog) return null;

    return (
      <Card style={styles.detailsCard}>
        <Card.Title 
          title="Request Details"
          right={(props) => (
            <IconButton
              icon="close"
              onPress={() => setSelectedLog(null)}
            />
          )}
        />
        <Card.Content>
          <ScrollView>
            {/* Basic Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>URL</Text>
              <Text style={styles.detailValue} selectable>{selectedLog.url}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Method</Text>
              <Chip mode="outlined" compact>{selectedLog.method}</Chip>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Status</Text>
              <Chip 
                mode="outlined" 
                compact
                style={{ backgroundColor: getStatusColor(selectedLog.status, selectedLog.error) + '20' }}
              >
                {selectedLog.error ? 'Error' : selectedLog.status || 'Pending'}
              </Chip>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{formatDuration(selectedLog.duration)}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Timestamp</Text>
              <Text style={styles.detailValue}>{new Date(selectedLog.timestamp).toLocaleString()}</Text>
            </View>

            {/* Request Body */}
            {selectedLog.requestBody && (
              <View style={styles.detailSection}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailLabel}>Request Body</Text>
                  <IconButton
                    icon="content-copy"
                    size={16}
                    onPress={() => copyToClipboard(selectedLog.requestBody, 'Request Body')}
                  />
                </View>
                <Text style={styles.jsonText}>
                  {JSON.stringify(selectedLog.requestBody, null, 2)}
                </Text>
              </View>
            )}

            {/* Response Body */}
            {selectedLog.responseBody && (
              <View style={styles.detailSection}>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailLabel}>Response Body</Text>
                  <IconButton
                    icon="content-copy"
                    size={16}
                    onPress={() => copyToClipboard(selectedLog.responseBody, 'Response Body')}
                  />
                </View>
                <Text style={styles.jsonText}>
                  {JSON.stringify(selectedLog.responseBody, null, 2)}
                </Text>
              </View>
            )}

            {/* Error */}
            {selectedLog.error && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Error</Text>
                <Text style={[styles.detailValue, styles.errorText]}>
                  {selectedLog.error}
                </Text>
              </View>
            )}
          </ScrollView>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header Controls */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <Searchbar
            placeholder="Search requests..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          
          <View style={styles.controls}>
            <Menu
              visible={filterMenuVisible}
              onDismiss={() => setFilterMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setFilterMenuVisible(true)}
                  icon="filter"
                >
                  Filters
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  setActiveFilters(prev => ({ ...prev, showErrors: !prev.showErrors }));
                  setFilterMenuVisible(false);
                }}
                title="Show Errors"
                leadingIcon={activeFilters.showErrors ? "check" : "circle-outline"}
              />
              <Menu.Item
                onPress={() => {
                  setActiveFilters(prev => ({ ...prev, showSuccess: !prev.showSuccess }));
                  setFilterMenuVisible(false);
                }}
                title="Show Success"
                leadingIcon={activeFilters.showSuccess ? "check" : "circle-outline"}
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  setActiveFilters(prev => ({ ...prev, method: 'all' }));
                  setFilterMenuVisible(false);
                }}
                title="All Methods"
                leadingIcon={activeFilters.method === 'all' ? "radiobox-marked" : "radiobox-blank"}
              />
              <Menu.Item
                onPress={() => {
                  setActiveFilters(prev => ({ ...prev, method: 'GET' }));
                  setFilterMenuVisible(false);
                }}
                title="GET Only"
                leadingIcon={activeFilters.method === 'GET' ? "radiobox-marked" : "radiobox-blank"}
              />
              <Menu.Item
                onPress={() => {
                  setActiveFilters(prev => ({ ...prev, method: 'POST' }));
                  setFilterMenuVisible(false);
                }}
                title="POST Only"
                leadingIcon={activeFilters.method === 'POST' ? "radiobox-marked" : "radiobox-blank"}
              />
            </Menu>

            <Button
              mode="text"
              onPress={() => {
                DeveloperService.clearNetworkLogs();
                loadNetworkLogs();
              }}
            >
              Clear
            </Button>
          </View>

          <View style={styles.stats}>
            <Chip mode="outlined" compact style={styles.statChip}>
              Total: {logs.length}
            </Chip>
            <Chip mode="outlined" compact style={styles.statChip}>
              Errors: {logs.filter(l => l.error || (l.status && l.status >= 400)).length}
            </Chip>
            <Chip mode="outlined" compact style={styles.statChip}>
              Avg: {logs.length > 0 
                ? formatDuration(
                    logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length
                  )
                : '-'}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Network Logs */}
      <ScrollView
        style={styles.logsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredLogs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>No network requests recorded</Text>
            </Card.Content>
          </Card>
        ) : (
          filteredLogs.map(log => (
            <List.Item
              key={log.id}
              title={formatUrl(log.url)}
              description={`${log.method} • ${formatTimestamp(log.timestamp)} • ${formatDuration(log.duration)}`}
              left={(props) => (
                <View style={styles.statusIndicator}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(log.status, log.error) }
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {log.error ? 'ERR' : log.status || '...'}
                  </Text>
                </View>
              )}
              right={(props) => (
                <IconButton
                  icon="chevron-right"
                  onPress={() => setSelectedLog(log)}
                />
              )}
              onPress={() => setSelectedLog(log)}
              style={styles.logItem}
            />
          ))
        )}
      </ScrollView>

      {/* Request Details Modal */}
      {selectedLog && renderLogDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  searchBar: {
    marginBottom: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    marginRight: 8,
  },
  logsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  logItem: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    paddingVertical: 8,
  },
  statusIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyCard: {
    marginTop: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  detailsCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    elevation: 8,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  errorText: {
    color: '#f44336',
  },
});