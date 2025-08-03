import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  List,
  Chip,
  Surface,
  IconButton,
  ActivityIndicator,
  Searchbar,
  FAB,
  Portal,
  Dialog,
  Divider,
} from 'react-native-paper';
import ChangeHistoryService, { ChangeHistoryEntry } from '../../services/developer/ChangeHistoryService';

export const ChangeHistoryView: React.FC = () => {
  const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<ChangeHistoryEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadHistory();
    loadStats();
  }, []);

  const loadHistory = async () => {
    try {
      const service = ChangeHistoryService.getInstance();
      const data = await service.getHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const service = ChangeHistoryService.getInstance();
      const statistics = await service.getStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory();
    loadStats();
  };

  const handleRevert = (entry: ChangeHistoryEntry) => {
    Alert.alert(
      'Revert Changes',
      `Are you sure you want to revert "${entry.feature}"?\n\nThis will undo ${entry.changes.length} changes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revert',
          style: 'destructive',
          onPress: async () => {
            const service = ChangeHistoryService.getInstance();
            const success = await service.revertChange(entry.id);
            if (success) {
              Alert.alert(
                'Revert Instructions',
                'Check the console for detailed revert instructions. You may need to manually restore some files.',
                [{ text: 'OK' }]
              );
              loadHistory();
              loadStats();
            } else {
              Alert.alert('Error', 'Failed to revert changes');
            }
          }
        }
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'This will permanently delete all change history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const service = ChangeHistoryService.getInstance();
            await service.clearHistory();
            setHistory([]);
            loadStats();
          }
        }
      ]
    );
  };

  const handleExport = async () => {
    try {
      const service = ChangeHistoryService.getInstance();
      const data = await service.exportHistory();
      Alert.alert(
        'Export History',
        `History exported (${data.length} characters).\n\nIn a production app, this would save to a file or share.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to export history');
    }
  };

  const filteredHistory = history.filter(entry =>
    entry.feature.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    return status === 'active' ? '#4CAF50' : '#FF5252';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'file_created': return 'file-plus';
      case 'file_modified': return 'file-edit';
      case 'file_deleted': return 'file-remove';
      case 'dependency_added': return 'package-variant';
      case 'config_changed': return 'cog';
      default: return 'file';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading change history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {stats?.active || 0}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#FF5252' }]}>
              {stats?.reverted || 0}
            </Text>
            <Text style={styles.statLabel}>Reverted</Text>
          </View>
        </View>
      </Surface>

      <Searchbar
        placeholder="Search changes..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredHistory.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No changes match your search' : 'No change history yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                Changes made through AI tools will appear here
              </Text>
            </Card.Content>
          </Card>
        ) : (
          filteredHistory.map((entry) => (
            <Card key={entry.id} style={styles.changeCard}>
              <Card.Title
                title={entry.feature}
                subtitle={entry.description}
                right={(props) => (
                  <Chip
                    {...props}
                    style={{ backgroundColor: getStatusColor(entry.status) }}
                    textStyle={{ color: 'white' }}
                  >
                    {entry.status}
                  </Chip>
                )}
              />
              <Card.Content>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </Text>
                  <Text style={styles.metaText}>
                    {entry.changes.length} changes
                  </Text>
                </View>
                
                <View style={styles.changesList}>
                  {entry.changes.slice(0, 3).map((change, index) => (
                    <View key={index} style={styles.changeItem}>
                      <List.Icon icon={getTypeIcon(change.type)} />
                      <Text style={styles.changeText} numberOfLines={1}>
                        {change.filepath}
                      </Text>
                    </View>
                  ))}
                  {entry.changes.length > 3 && (
                    <Text style={styles.moreText}>
                      +{entry.changes.length - 3} more changes
                    </Text>
                  )}
                </View>
              </Card.Content>
              <Card.Actions>
                <Button
                  onPress={() => {
                    setSelectedEntry(entry);
                    setShowDetails(true);
                  }}
                >
                  View Details
                </Button>
                {entry.status === 'active' && (
                  <Button
                    mode="contained"
                    onPress={() => handleRevert(entry)}
                    buttonColor="#FF5252"
                  >
                    Revert
                  </Button>
                )}
              </Card.Actions>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB.Group
        open={false}
        visible={true}
        icon="menu"
        actions={[
          {
            icon: 'export',
            label: 'Export',
            onPress: handleExport,
          },
          {
            icon: 'delete',
            label: 'Clear History',
            onPress: handleClearHistory,
          },
        ]}
        onStateChange={() => {}}
      />

      <Portal>
        <Dialog
          visible={showDetails}
          onDismiss={() => setShowDetails(false)}
          style={styles.dialog}
        >
          <Dialog.Title>{selectedEntry?.feature}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              {selectedEntry && (
                <View style={styles.dialogContent}>
                  <Text style={styles.dialogSection}>Description</Text>
                  <Text>{selectedEntry.description}</Text>
                  
                  <Text style={styles.dialogSection}>Timestamp</Text>
                  <Text>{new Date(selectedEntry.timestamp).toLocaleString()}</Text>
                  
                  {selectedEntry.status === 'reverted' && selectedEntry.revertedAt && (
                    <>
                      <Text style={styles.dialogSection}>Reverted At</Text>
                      <Text>{new Date(selectedEntry.revertedAt).toLocaleString()}</Text>
                    </>
                  )}
                  
                  <Text style={styles.dialogSection}>Changes ({selectedEntry.changes.length})</Text>
                  {selectedEntry.changes.map((change, index) => (
                    <Surface key={index} style={styles.changeDetail}>
                      <View style={styles.changeDetailHeader}>
                        <List.Icon icon={getTypeIcon(change.type)} />
                        <Text style={styles.changeType}>{change.type}</Text>
                      </View>
                      <Text style={styles.changeFilepath}>{change.filepath}</Text>
                      <Text style={styles.changeDescription}>{change.description}</Text>
                      {change.metadata && (
                        <View style={styles.metadata}>
                          {change.metadata.source && (
                            <Chip compact>{change.metadata.source}</Chip>
                          )}
                          {change.metadata.aiModel && (
                            <Chip compact>{change.metadata.aiModel}</Chip>
                          )}
                        </View>
                      )}
                    </Surface>
                  ))}
                </View>
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowDetails(false)}>Close</Button>
            {selectedEntry?.status === 'active' && (
              <Button
                mode="contained"
                onPress={() => {
                  setShowDetails(false);
                  handleRevert(selectedEntry);
                }}
                buttonColor="#FF5252"
              >
                Revert
              </Button>
            )}
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  statsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchBar: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  changeCard: {
    marginBottom: 16,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  changesList: {
    marginTop: 8,
  },
  changeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  changeText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    marginLeft: -16,
  },
  moreText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyCard: {
    margin: 32,
  },
  emptyText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  dialog: {
    maxHeight: '80%',
  },
  dialogContent: {
    padding: 20,
  },
  dialogSection: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  changeDetail: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  changeDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  changeType: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: -16,
  },
  changeFilepath: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  changeDescription: {
    fontSize: 12,
    color: '#666',
  },
  metadata: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
});