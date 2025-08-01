import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  List,
  Chip,
  FAB,
  Portal,
  Modal,
  SegmentedButtons,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AutomationTrigger, LocationTriggerConfig, TriggerType } from '../../types';
import LocationTriggerConfigModal from './LocationTriggerConfig';
import { locationTriggerService } from '../../services/triggers/LocationTriggerService';

interface TriggerManagerProps {
  triggers: AutomationTrigger[];
  onTriggersChange: (triggers: AutomationTrigger[]) => void;
  automationId?: string;
}

const TriggerManager: React.FC<TriggerManagerProps> = ({
  triggers,
  onTriggersChange,
  automationId
}) => {
  const [showTriggerPicker, setShowTriggerPicker] = useState(false);
  const [showLocationConfig, setShowLocationConfig] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<AutomationTrigger | undefined>();
  const [selectedTriggerType, setSelectedTriggerType] = useState<TriggerType>('location_enter');
  const [isModalTransitioning, setIsModalTransitioning] = useState(false);

  console.log('TriggerManager render - showLocationConfig:', showLocationConfig, 'selectedTriggerType:', selectedTriggerType);

  const getTriggerIcon = (type: TriggerType): string => {
    switch (type) {
      case 'location_enter': return 'login';
      case 'location_exit': return 'logout';
      case 'time_based': return 'clock';
      case 'nfc_scan': return 'nfc';
      case 'qr_scan': return 'qrcode';
      default: return 'gesture-tap';
    }
  };

  const getTriggerLabel = (type: TriggerType): string => {
    switch (type) {
      case 'location_enter': return 'Arrive at Location';
      case 'location_exit': return 'Leave Location';
      case 'time_based': return 'Time/Schedule';
      case 'nfc_scan': return 'NFC Tag Scan';
      case 'qr_scan': return 'QR Code Scan';
      default: return 'Unknown';
    }
  };

  const getTriggerDescription = (trigger: AutomationTrigger): string => {
    switch (trigger.type) {
      case 'location_enter':
      case 'location_exit': {
        const config = trigger.config as LocationTriggerConfig;
        const action = trigger.type === 'location_enter' ? 'Arrive at' : 'Leave';
        return `${action} "${config.name}" (${config.radius}m radius)`;
      }
      default:
        return 'Trigger configuration';
    }
  };

  const addTrigger = () => {
    setEditingTrigger(undefined);
    setShowTriggerPicker(true);
  };

  const editTrigger = (trigger: AutomationTrigger) => {
    setEditingTrigger(trigger);
    if (trigger.type === 'location_enter' || trigger.type === 'location_exit') {
      setShowLocationConfig(true);
    }
  };

  const deleteTrigger = (triggerId: string) => {
    Alert.alert(
      'Delete Trigger',
      'Are you sure you want to delete this trigger?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedTriggers = triggers.filter(t => t.id !== triggerId);
            onTriggersChange(updatedTriggers);
            
            // Remove from location service if it's a location trigger
            if (automationId) {
              locationTriggerService.removeLocationTrigger(automationId, triggerId);
            }
          }
        }
      ]
    );
  };

  const toggleTrigger = (triggerId: string) => {
    const updatedTriggers = triggers.map(t => 
      t.id === triggerId ? { ...t, enabled: !t.enabled } : t
    );
    onTriggersChange(updatedTriggers);
  };

  const handleTriggerTypeSelected = () => {
    console.log('TriggerManager handleTriggerTypeSelected - selectedTriggerType:', selectedTriggerType);
    setIsModalTransitioning(true);
    setShowTriggerPicker(false);
    
    if (selectedTriggerType === 'location_enter' || selectedTriggerType === 'location_exit') {
      console.log('TriggerManager opening location config modal for type:', selectedTriggerType);
      // Use setTimeout to ensure state updates are complete
      setTimeout(() => {
        setShowLocationConfig(true);
        setIsModalTransitioning(false);
      }, 200);
    } else {
      // For other trigger types, show appropriate config UI
      setIsModalTransitioning(false);
      Alert.alert('Coming Soon', `${getTriggerLabel(selectedTriggerType)} triggers will be available in a future update.`);
    }
  };

  const handleLocationTriggerSaved = (trigger: AutomationTrigger) => {
    console.log('Saving location trigger:', trigger);
    let updatedTriggers;
    
    if (editingTrigger) {
      // Update existing trigger
      updatedTriggers = triggers.map(t => 
        t.id === editingTrigger.id ? trigger : t
      );
      console.log('Updated existing trigger');
    } else {
      // Add new trigger
      updatedTriggers = [...triggers, trigger];
      console.log('Added new trigger, total triggers:', updatedTriggers.length);
    }
    
    onTriggersChange(updatedTriggers);
    setShowLocationConfig(false);
    setEditingTrigger(undefined);
    setSelectedTriggerType('location_enter'); // Reset
  };

  const renderTriggerItem = (trigger: AutomationTrigger) => (
    <Card key={trigger.id} style={styles.triggerCard}>
      <Card.Content>
        <View style={styles.triggerHeader}>
          <View style={styles.triggerInfo}>
            <View style={styles.triggerTitleRow}>
              <Icon 
                name={getTriggerIcon(trigger.type)} 
                size={20} 
                color={trigger.enabled ? '#6200ee' : '#999'}
              />
              <Text style={[styles.triggerTitle, !trigger.enabled && styles.disabledText]}>
                {getTriggerLabel(trigger.type)}
              </Text>
              <Chip 
                compact 
                style={[styles.statusChip, trigger.enabled ? styles.enabledChip : styles.disabledChip]}
              >
                {trigger.enabled ? 'Active' : 'Disabled'}
              </Chip>
            </View>
            <Text style={[styles.triggerDescription, !trigger.enabled && styles.disabledText]}>
              {getTriggerDescription(trigger)}
            </Text>
          </View>
          <View style={styles.triggerActions}>
            <IconButton
              icon={trigger.enabled ? 'pause' : 'play'}
              size={20}
              onPress={() => toggleTrigger(trigger.id)}
            />
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => editTrigger(trigger)}
            />
            <IconButton
              icon="delete"
              size={20}
              onPress={() => deleteTrigger(trigger.id)}
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Automation Triggers</Text>
        <Text style={styles.subtitle}>
          Configure when this automation should run automatically
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {triggers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Icon name="gesture-tap" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No Triggers Set</Text>
              <Text style={styles.emptyDescription}>
                Add triggers to run this automation automatically based on location, time, or other events.
              </Text>
              <Button 
                mode="contained" 
                onPress={addTrigger} 
                style={styles.addFirstTriggerButton}
                icon="plus"
              >
                Add First Trigger
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <>
            {triggers.map(renderTriggerItem)}
            <View style={styles.addTriggerContainer}>
              <Button 
                mode="outlined" 
                onPress={addTrigger} 
                icon="plus"
                style={styles.addTriggerButton}
              >
                Add Another Trigger
              </Button>
            </View>
          </>
        )}
      </ScrollView>

      {/* Trigger Type Picker Modal */}
      <Portal>
        <Modal
          visible={showTriggerPicker}
          onDismiss={() => setShowTriggerPicker(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Trigger Type</Text>
            
            <View style={styles.triggerTypesList}>
              <Card style={styles.triggerTypeCard}>
                <List.Item
                  title="Location - Arrive"
                  description="Trigger when you arrive at a specific location"
                  left={() => <Icon name="login" size={24} color="#6200ee" />}
                  right={() => <Icon name="chevron-right" size={24} color="#ccc" />}
                  onPress={() => {
                    console.log('Location - Arrive pressed');
                    setSelectedTriggerType('location_enter');
                    setIsModalTransitioning(true);
                    setShowTriggerPicker(false);
                    // Longer delay to ensure trigger picker closes first
                    setTimeout(() => {
                      console.log('Setting showLocationConfig to true after delay');
                      setShowLocationConfig(true);
                      setIsModalTransitioning(false);
                    }, 400);
                  }}
                  style={styles.triggerTypeItem}
                />
              </Card>
              
              <Card style={styles.triggerTypeCard}>
                <List.Item
                  title="Location - Leave"
                  description="Trigger when you leave a specific location"
                  left={() => <Icon name="logout" size={24} color="#6200ee" />}
                  right={() => <Icon name="chevron-right" size={24} color="#ccc" />}
                  onPress={() => {
                    console.log('Location - Leave pressed');
                    setSelectedTriggerType('location_exit');
                    setIsModalTransitioning(true);
                    setShowTriggerPicker(false);
                    // Longer delay to ensure trigger picker closes first
                    setTimeout(() => {
                      console.log('Setting showLocationConfig to true after delay');
                      setShowLocationConfig(true);
                      setIsModalTransitioning(false);
                    }, 400);
                  }}
                  style={styles.triggerTypeItem}
                />
              </Card>
              
              <Card style={[styles.triggerTypeCard, styles.disabledCard]}>
                <List.Item
                  title="Time/Schedule"
                  description="Trigger at specific times or on a schedule (Coming Soon)"
                  left={() => <Icon name="clock" size={24} color="#999" />}
                  right={() => <Icon name="lock" size={20} color="#999" />}
                  onPress={() => {
                    Alert.alert('Coming Soon', 'Time-based triggers will be available in a future update.');
                  }}
                  style={[styles.triggerTypeItem, styles.disabledItem]}
                />
              </Card>
              
              <Card style={[styles.triggerTypeCard, styles.disabledCard]}>
                <List.Item
                  title="NFC Tag"
                  description="Trigger when scanning a specific NFC tag (Coming Soon)"
                  left={() => <Icon name="nfc" size={24} color="#999" />}
                  right={() => <Icon name="lock" size={20} color="#999" />}
                  onPress={() => {
                    Alert.alert('Coming Soon', 'NFC triggers will be available in a future update.');
                  }}
                  style={[styles.triggerTypeItem, styles.disabledItem]}
                />
              </Card>
            </View>
            
            <Button onPress={() => setShowTriggerPicker(false)} style={styles.cancelButton}>
              Cancel
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Location Trigger Configuration */}
      <LocationTriggerConfigModal
        visible={showLocationConfig}
        trigger={editingTrigger}
        initialTriggerType={selectedTriggerType as 'location_enter' | 'location_exit'}
        onSave={handleLocationTriggerSaved}
        onCancel={() => {
          console.log('LocationTriggerConfig onCancel called');
          setShowLocationConfig(false);
          setEditingTrigger(undefined);
          setSelectedTriggerType('location_enter'); // Reset to default
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  triggerCard: {
    marginBottom: 12,
  },
  triggerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  triggerInfo: {
    flex: 1,
  },
  triggerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  triggerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
    color: '#333',
  },
  triggerDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 28,
  },
  triggerActions: {
    flexDirection: 'row',
  },
  statusChip: {
    marginLeft: 8,
  },
  enabledChip: {
    backgroundColor: '#e8f5e8',
  },
  disabledChip: {
    backgroundColor: '#f5f5f5',
  },
  disabledText: {
    color: '#999',
  },
  emptyCard: {
    marginVertical: 40,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addFirstTriggerButton: {
    marginTop: 8,
  },
  addTriggerContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  addTriggerButton: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#6200ee',
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalContent: {
    padding: 20,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  triggerTypesList: {
    marginBottom: 20,
  },
  triggerTypeCard: {
    marginBottom: 8,
    elevation: 1,
  },
  disabledCard: {
    opacity: 0.6,
  },
  triggerTypeItem: {
    paddingVertical: 8,
  },
  disabledItem: {
    opacity: 0.7,
  },
  cancelButton: {
    marginTop: 10,
  },
});

export default TriggerManager;