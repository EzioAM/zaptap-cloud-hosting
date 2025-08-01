import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Button,
  List,
  RadioButton,
  Switch,
  ActivityIndicator,
  Card,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AutomationData } from '../../types';
import { 
  automationImportExportService, 
  ExportFormat 
} from '../../services/import-export/AutomationImportExportService';

interface ImportExportModalProps {
  visible: boolean;
  mode: 'import' | 'export';
  automations?: AutomationData[];
  userId: string;
  onClose: () => void;
  onImportComplete?: (importedAutomations: AutomationData[]) => void;
  onExportComplete?: (filePath: string) => void;
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({
  visible,
  mode,
  automations = [],
  userId,
  onClose,
  onImportComplete,
  onExportComplete,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat['type']>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedAutomations, setSelectedAutomations] = useState<string[]>(
    automations.map(a => a.id)
  );

  const exportFormats = automationImportExportService.getExportFormats();

  const handleImport = async () => {
    setLoading(true);
    try {
      const result = await automationImportExportService.importAutomations(userId);
      
      if (result.success) {
        Alert.alert(
          'Import Successful! 🎉',
          result.message || 'Automations imported successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                if (result.automations && onImportComplete) {
                  onImportComplete(result.automations);
                }
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Import Failed', result.message || 'Failed to import automations');
      }
    } catch (error: any) {
      Alert.alert('Import Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (selectedAutomations.length === 0) {
      Alert.alert('No Selection', 'Please select at least one automation to export');
      return;
    }

    setLoading(true);
    try {
      const automationsToExport = automations.filter(a => 
        selectedAutomations.includes(a.id)
      );

      const result = await automationImportExportService.exportAutomations(
        automationsToExport,
        selectedFormat,
        includeMetadata
      );

      if (result.success) {
        Alert.alert(
          'Export Successful! 📤',
          result.message || 'Automations exported successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                if (result.filePath && onExportComplete) {
                  onExportComplete(result.filePath);
                }
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export automations');
      }
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleExportLibrary = async () => {
    setLoading(true);
    try {
      const result = await automationImportExportService.exportUserLibrary(
        userId,
        selectedFormat
      );

      if (result.success) {
        Alert.alert(
          'Library Export Successful! 📚',
          result.message || 'Complete library exported successfully',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert('Export Failed', result.error || 'Failed to export library');
      }
    } catch (error: any) {
      Alert.alert('Export Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomationSelection = (automationId: string) => {
    setSelectedAutomations(prev => 
      prev.includes(automationId)
        ? prev.filter(id => id !== automationId)
        : [...prev, automationId]
    );
  };

  const selectAllAutomations = () => {
    setSelectedAutomations(automations.map(a => a.id));
  };

  const deselectAllAutomations = () => {
    setSelectedAutomations([]);
  };

  const renderImportTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📥 Import Automations</Text>
        <Text style={styles.sectionDescription}>
          Import automations from various formats including JSON exports, 
          Apple Shortcuts, and backup files.
        </Text>
      </View>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.infoTitle}>Supported Formats</Text>
          <View style={styles.formatList}>
            <View style={styles.formatItem}>
              <Icon name="code-json" size={20} color="#6200ee" />
              <Text style={styles.formatText}>ShortcutsLike JSON (.json)</Text>
            </View>
            <View style={styles.formatItem}>
              <Icon name="apple" size={20} color="#6200ee" />
              <Text style={styles.formatText}>Apple Shortcuts (.shortcuts)</Text>
            </View>
            <View style={styles.formatItem}>
              <Icon name="backup-restore" size={20} color="#6200ee" />
              <Text style={styles.formatText}>Backup Files (.slbackup)</Text>
            </View>
            <View style={styles.formatItem}>
              <Icon name="package-variant" size={20} color="#6200ee" />
              <Text style={styles.formatText}>Automation Packages (.slpkg)</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.importNotes}>
        <Text style={styles.notesTitle}>📝 Import Notes</Text>
        <Text style={styles.notesText}>
          • Duplicate automations (same title) will be skipped{'\n'}
          • Imported automations will be set as private by default{'\n'}
          • All step configurations will be preserved{'\n'}
          • Large imports may take a few moments to complete
        </Text>
      </View>

      <View style={styles.actionSection}>
        <Button
          mode="contained"
          onPress={handleImport}
          disabled={loading}
          icon="import"
          style={styles.actionButton}
          buttonColor="#6200ee"
        >
          {loading ? <ActivityIndicator color="white" /> : 'Select File to Import'}
        </Button>
      </View>
    </ScrollView>
  );

  const renderExportTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📤 Export Automations</Text>
        <Text style={styles.sectionDescription}>
          Export your automations for backup, sharing, or migration to other devices.
        </Text>
      </View>

      {/* Format Selection */}
      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>Export Format</Text>
        <RadioButton.Group
          onValueChange={(value) => setSelectedFormat(value as any)}
          value={selectedFormat}
        >
          {exportFormats.map((format) => (
            <View key={format.type} style={styles.radioItem}>
              <RadioButton value={format.type} color="#6200ee" />
              <View style={styles.radioContent}>
                <Text style={styles.radioTitle}>
                  {format.type.toUpperCase()} Format
                </Text>
                <Text style={styles.radioDescription}>
                  {format.description}
                </Text>
              </View>
            </View>
          ))}
        </RadioButton.Group>
      </View>

      <Divider style={styles.divider} />

      {/* Options */}
      <View style={styles.section}>
        <Text style={styles.subsectionTitle}>Export Options</Text>
        <View style={styles.switchOption}>
          <View style={styles.switchContent}>
            <Text style={styles.switchLabel}>Include Metadata</Text>
            <Text style={styles.switchDescription}>
              Include creation dates, ratings, and other metadata
            </Text>
          </View>
          <Switch
            value={includeMetadata}
            onValueChange={setIncludeMetadata}
            color="#6200ee"
          />
        </View>
      </View>

      <Divider style={styles.divider} />

      {/* Automation Selection */}
      <View style={styles.section}>
        <View style={styles.selectionHeader}>
          <Text style={styles.subsectionTitle}>
            Select Automations ({selectedAutomations.length}/{automations.length})
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity onPress={selectAllAutomations}>
              <Text style={styles.selectionAction}>All</Text>
            </TouchableOpacity>
            <Text style={styles.selectionSeparator}>|</Text>
            <TouchableOpacity onPress={deselectAllAutomations}>
              <Text style={styles.selectionAction}>None</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.automationList}>
          {automations.map((automation) => (
            <TouchableOpacity
              key={automation.id}
              style={[
                styles.automationItem,
                selectedAutomations.includes(automation.id) && styles.selectedAutomationItem
              ]}
              onPress={() => toggleAutomationSelection(automation.id)}
            >
              <Icon
                name={selectedAutomations.includes(automation.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={24}
                color={selectedAutomations.includes(automation.id) ? '#6200ee' : '#999'}
              />
              <View style={styles.automationInfo}>
                <Text style={styles.automationTitle}>{automation.title}</Text>
                <Text style={styles.automationMeta}>
                  {automation.steps?.length || 0} steps • {automation.category}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.actionSection}>
        <Button
          mode="outlined"
          onPress={handleExportLibrary}
          disabled={loading}
          icon="database-export"
          style={styles.secondaryButton}
        >
          Export Entire Library
        </Button>
        
        <Button
          mode="contained"
          onPress={handleExport}
          disabled={loading || selectedAutomations.length === 0}
          icon="export"
          style={styles.actionButton}
          buttonColor="#6200ee"
        >
          {loading ? <ActivityIndicator color="white" /> : 'Export Selected'}
        </Button>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {mode === 'import' ? 'Import Automations' : 'Export Automations'}
          </Text>
          <View style={styles.closeButton} />
        </View>

        {mode === 'import' ? renderImportTab() : renderExportTab()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  formatList: {
    gap: 8,
  },
  formatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  formatText: {
    fontSize: 14,
    color: '#333',
  },
  importNotes: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 18,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  radioContent: {
    flex: 1,
    marginLeft: 8,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  switchOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  switchContent: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionAction: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '500',
  },
  selectionSeparator: {
    fontSize: 14,
    color: '#ccc',
    marginHorizontal: 8,
  },
  automationList: {
    gap: 8,
  },
  automationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedAutomationItem: {
    borderColor: '#6200ee',
    backgroundColor: '#6200ee08',
  },
  automationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  automationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  automationMeta: {
    fontSize: 14,
    color: '#666',
  },
  actionSection: {
    gap: 12,
    paddingTop: 16,
  },
  actionButton: {
    paddingVertical: 4,
  },
  secondaryButton: {
    paddingVertical: 4,
    borderColor: '#6200ee',
  },
  divider: {
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
});

export { ImportExportModal };