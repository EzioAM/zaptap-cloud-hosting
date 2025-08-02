import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Portal,
  Modal,
  Text,
  Button,
  Card,
  IconButton,
  Chip,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { VersionHistoryService, AutomationVersion } from '../../services/versions/VersionHistoryService';
import { AutomationData } from '../../types';

interface VersionHistoryModalProps {
  visible: boolean;
  onDismiss: () => void;
  automation: AutomationData;
  onAutomationUpdated?: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  visible,
  onDismiss,
  automation,
  onAutomationUpdated,
}) => {
  const [versions, setVersions] = useState<AutomationVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadVersions();
    }
  }, [visible]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await VersionHistoryService.getVersions(automation.id);
      setVersions(data);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVersions();
    setRefreshing(false);
  };

  const handleRestoreVersion = (version: AutomationVersion) => {
    Alert.alert(
      'Restore Version',
      `Are you sure you want to restore to version ${version.version_number}?\n\nTitle: ${version.title}\nCreated: ${new Date(version.created_at).toLocaleDateString()}\n\nThis will create a new version with the restored content.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setRestoringVersion(version.id);
            try {
              const success = await VersionHistoryService.restoreVersion(automation.id, version.id);
              if (success) {
                Alert.alert('Success', 'Version restored successfully');
                onAutomationUpdated?.();
                await loadVersions();
              } else {
                Alert.alert('Error', 'Failed to restore version');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to restore version');
            } finally {
              setRestoringVersion(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteVersion = (version: AutomationVersion) => {
    Alert.alert(
      'Delete Version',
      `Are you sure you want to delete version ${version.version_number}?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await VersionHistoryService.deleteVersion(version.id);
              if (success) {
                Alert.alert('Success', 'Version deleted successfully');
                await loadVersions();
              } else {
                Alert.alert('Error', 'Failed to delete version');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete version');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getChangeTypeColor = (changesSummary: string | null) => {
    if (!changesSummary) return '#666';
    const summary = changesSummary.toLowerCase();
    if (summary.includes('restored')) return '#ff9800';
    if (summary.includes('created') || summary.includes('initial')) return '#4caf50';
    if (summary.includes('major') || summary.includes('breaking')) return '#f44336';
    return '#2196f3';
  };

  const renderVersionCard = (version: AutomationVersion, index: number) => (
    <Card key={version.id} style={[styles.versionCard, index === 0 && styles.currentVersion]}>
      <Card.Content>
        <View style={styles.versionHeader}>
          <View style={styles.versionInfo}>
            <View style={styles.versionNumber}>
              <Text style={styles.versionNumberText}>v{version.version_number}</Text>
              {index === 0 && <Chip mode="flat" compact style={styles.currentChip}>Current</Chip>}
            </View>
            <Text style={styles.versionTitle}>{version.title}</Text>
            <Text style={styles.versionDate}>{formatDate(version.created_at)}</Text>
          </View>
          <View style={styles.versionActions}>
            {index > 0 && (
              <>
                <IconButton
                  icon="restore"
                  size={20}
                  onPress={() => handleRestoreVersion(version)}
                  disabled={restoringVersion === version.id}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleDeleteVersion(version)}
                  iconColor="#f44336"
                />
              </>
            )}
          </View>
        </View>

        {version.changes_summary && (
          <View style={styles.changesSummary}>
            <Icon 
              name="pencil" 
              size={14} 
              color={getChangeTypeColor(version.changes_summary)} 
            />
            <Text style={[styles.changesText, { color: getChangeTypeColor(version.changes_summary) }]}>
              {version.changes_summary}
            </Text>
          </View>
        )}

        <View style={styles.versionMeta}>
          <View style={styles.metaItem}>
            <Icon name="layers" size={14} color="#666" />
            <Text style={styles.metaText}>{version.steps.length} steps</Text>
          </View>
          {version.category && (
            <View style={styles.metaItem}>
              <Icon name="tag" size={14} color="#666" />
              <Text style={styles.metaText}>{version.category}</Text>
            </View>
          )}
          {version.tags && version.tags.length > 0 && (
            <View style={styles.metaItem}>
              <Icon name="label" size={14} color="#666" />
              <Text style={styles.metaText}>{version.tags.length} tags</Text>
            </View>
          )}
        </View>

        {restoringVersion === version.id && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>Restoring...</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Version History</Text>
            <IconButton icon="close" size={24} onPress={onDismiss} />
          </View>
          
          <Text style={styles.modalSubtitle}>
            Track changes and restore previous versions of "{automation.title}"
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Loading version history...</Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.versionsContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
              }
            >
              {versions.length > 0 ? (
                versions.map((version, index) => renderVersionCard(version, index))
              ) : (
                <View style={styles.emptyState}>
                  <Icon name="history" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No version history available</Text>
                  <Text style={styles.emptySubtext}>
                    Versions are created automatically when you make changes to your automation
                  </Text>
                </View>
              )}
            </ScrollView>
          )}

          <Divider style={styles.divider} />
          
          <View style={styles.modalActions}>
            <Button onPress={onDismiss}>Close</Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '85%',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  versionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  versionCard: {
    marginBottom: 12,
    borderRadius: 8,
  },
  currentVersion: {
    borderColor: '#2196f3',
    borderWidth: 1,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  versionInfo: {
    flex: 1,
  },
  versionNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  versionNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  currentChip: {
    backgroundColor: '#e3f2fd',
  },
  versionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  versionDate: {
    fontSize: 12,
    color: '#666',
  },
  versionActions: {
    flexDirection: 'row',
  },
  changesSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
  },
  changesText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  versionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  divider: {
    marginVertical: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});