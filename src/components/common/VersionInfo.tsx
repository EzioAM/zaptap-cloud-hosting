import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Button, Card, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  APP_VERSION,
  APP_NAME,
  CHANGELOG,
  getLatestChangelog,
  formatChangelog,
  ChangelogEntry,
} from '../../constants/version';

interface VersionInfoProps {
  showButton?: boolean;
  buttonStyle?: any;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({
  showButton = true,
  buttonStyle,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

  const latest = getLatestChangelog();

  const renderChangelogItem = (changes: any, type: string, icon: string, color: string) => {
    if (!changes || changes.length === 0) return null;

    return (
      <View style={styles.changelogSection}>
        <View style={styles.sectionHeader}>
          <Icon name={icon} size={16} color={color} />
          <Text style={[styles.sectionTitle, { color }]}>
            {type}
          </Text>
        </View>
        {changes.map((change: string, index: number) => (
          <Text key={index} style={styles.changeItem}>
            • {change}
          </Text>
        ))}
      </View>
    );
  };

  const renderVersionCard = (entry: ChangelogEntry) => (
    <Card key={entry.version} style={styles.versionCard}>
      <TouchableOpacity
        onPress={() => setSelectedVersion(
          selectedVersion === entry.version ? null : entry.version
        )}
      >
        <View style={styles.versionHeader}>
          <View style={styles.versionInfo}>
            <Text style={styles.versionNumber}>v{entry.version}</Text>
            <Text style={styles.versionDate}>{entry.date}</Text>
          </View>
          <View style={styles.versionBadge}>
            <Text style={[
              styles.versionType,
              { backgroundColor: entry.type === 'major' ? '#ff6b6b' : entry.type === 'minor' ? '#4ecdc4' : '#95a5a6' }
            ]}>
              {entry.type}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {selectedVersion === entry.version && (
        <View style={styles.versionDetails}>
          <Divider style={styles.divider} />
          {renderChangelogItem(entry.changes.added, 'Added', 'plus-circle', '#4CAF50')}
          {renderChangelogItem(entry.changes.improved, 'Improved', 'trending-up', '#2196F3')}
          {renderChangelogItem(entry.changes.fixed, 'Fixed', 'bug', '#FF9800')}
          {renderChangelogItem(entry.changes.removed, 'Removed', 'minus-circle', '#F44336')}
        </View>
      )}
    </Card>
  );

  return (
    <>
      {showButton && (
        <TouchableOpacity
          style={[styles.versionButton, buttonStyle]}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.versionButtonText}>v{APP_VERSION}</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{APP_NAME} Version History</Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.currentVersionCard}>
              <View style={styles.currentVersionHeader}>
                <Text style={styles.currentVersionTitle}>Current Version</Text>
                <Text style={styles.currentVersionNumber}>v{APP_VERSION}</Text>
              </View>
              <Text style={styles.currentVersionDesc}>
                Released {latest.date}
              </Text>
            </View>

            <Text style={styles.changelogTitle}>Version History</Text>
            
            {CHANGELOG.map(renderVersionCard)}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  versionButton: {
    backgroundColor: '#03dac6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  versionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  currentVersionCard: {
    backgroundColor: '#6200ee',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  currentVersionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentVersionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  currentVersionNumber: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  currentVersionDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  changelogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  versionCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  versionInfo: {
    flex: 1,
  },
  versionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  versionDate: {
    fontSize: 14,
    color: '#666',
  },
  versionBadge: {
    alignItems: 'flex-end',
  },
  versionType: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'uppercase',
  },
  versionDetails: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    marginBottom: 16,
  },
  changelogSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  changeItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    marginLeft: 16,
    lineHeight: 20,
  },
});