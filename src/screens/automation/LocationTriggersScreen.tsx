import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Appbar,
  Card,
  Text,
  Button,
  List,
  Chip,
  FAB,
} from 'react-native-paper';
import SafeIcon from '../../components/common/SafeIcon';
import { AutomationData, AutomationTrigger } from '../../types';
import TriggerManager from '../../components/triggers/TriggerManager';
import { locationTriggerService } from '../../services/triggers/LocationTriggerService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

interface LocationTriggersScreenProps {
  navigation: any;
  route?: {
    params?: {
      automation?: AutomationData;
    };
  };
}

const LocationTriggersScreen: React.FC<LocationTriggersScreenProps> = ({ navigation, route }) => {
  const [automation, setAutomation] = useState<AutomationData | null>(null);
  const [triggers, setTriggers] = useState<AutomationTrigger[]>([]);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (route?.params?.automation) {
      setAutomation(route.params.automation);
      setTriggers(route.params.automation.triggers || []);
    }
    
    checkLocationServices();
  }, [route?.params?.automation]);

  const checkLocationServices = async () => {
    const enabled = await locationTriggerService.isLocationServicesEnabled();
    setIsLocationEnabled(enabled);
  };

  const handleTriggersChange = async (updatedTriggers: AutomationTrigger[]) => {
    setTriggers(updatedTriggers);
    
    if (automation) {
      // Update automation with new triggers
      const updatedAutomation = { ...automation, triggers: updatedTriggers };
      setAutomation(updatedAutomation);
      
      // Add location triggers to the location service
      for (const trigger of updatedTriggers) {
        if ((trigger.type === 'location_enter' || trigger.type === 'location_exit') && trigger.enabled) {
          await locationTriggerService.addLocationTrigger(updatedAutomation, trigger);
        }
      }
    }
  };

  const createDemoAutomation = () => {
    const demoAutomation: AutomationData = {
      id: `demo_${Date.now()}`,
      title: 'Demo Location Automation',
      description: 'A demo automation for testing location triggers',
      steps: [
        {
          id: 'demo-step-1',
          type: 'notification',
          title: 'Location Trigger Activated',
          enabled: true,
          config: {
            message: 'Your location-based automation has been triggered! 🎯'
          }
        }
      ],
      triggers: [],
      created_by: user?.id || 'demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      category: 'tools',
      tags: ['demo', 'location'],
      execution_count: 0,
      average_rating: 0,
      rating_count: 0,
    };
    
    setAutomation(demoAutomation);
    setTriggers([]);
  };

  const getActiveLocationTriggers = () => {
    return triggers.filter(t => 
      (t.type === 'location_enter' || t.type === 'location_exit') && t.enabled
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Location Triggers" />
        <Appbar.Action
          icon="information"
          onPress={() => Alert.alert(
            'Location Triggers',
            'Set up automations that run automatically when you arrive at or leave specific locations. Requires location permissions.'
          )}
        />
      </Appbar.Header>

      {!isLocationEnabled && (
        <Card style={styles.warningCard}>
          <Card.Content>
            <View style={styles.warningContent}>
              <SafeIcon name="alert" size={24} color="#FF9800" />
              <View style={styles.warningText}>
                <Text style={styles.warningTitle}>Location Services Disabled</Text>
                <Text style={styles.warningDescription}>
                  Location triggers require location services to be enabled on your device.
                </Text>
              </View>
            </View>
            <Button
              mode="outlined"
              onPress={checkLocationServices}
              style={styles.refreshButton}
            >
              Refresh
            </Button>
          </Card.Content>
        </Card>
      )}

      {!automation ? (
        <View style={styles.noAutomationContainer}>
          <Card style={styles.infoCard}>
            <Card.Content style={styles.infoContent}>
              <SafeIcon name="robot" size={64} color="#6200ee" />
              <Text style={styles.infoTitle}>No Automation Selected</Text>
              <Text style={styles.infoDescription}>
                To set up location triggers, you need to select an automation first. 
                You can also create a demo automation to test the functionality.
              </Text>
              <View style={styles.infoActions}>
                <Button
                  mode="contained"
                  onPress={createDemoAutomation}
                  style={styles.demoButton}
                  icon="flask"
                >
                  Create Demo Automation
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => navigation.navigate('MyAutomations')}
                  style={styles.selectButton}
                  icon="folder"
                >
                  Select Automation
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Automation Info */}
          <Card style={styles.automationCard}>
            <Card.Content>
              <View style={styles.automationHeader}>
                <SafeIcon name="robot" size={24} color="#6200ee" />
                <View style={styles.automationInfo}>
                  <Text style={styles.automationTitle}>{automation.title}</Text>
                  <Text style={styles.automationDescription}>{automation.description}</Text>
                </View>
              </View>
              
              <View style={styles.automationStats}>
                <Chip icon="layers" compact style={styles.statChip}>
                  {automation.steps.length} steps
                </Chip>
                <Chip icon="gesture-tap" compact style={styles.statChip}>
                  {triggers.length} triggers
                </Chip>
                {getActiveLocationTriggers().length > 0 && (
                  <Chip icon="map-marker" compact style={[styles.statChip, styles.activeChip]}>
                    {getActiveLocationTriggers().length} location active
                  </Chip>
                )}
              </View>
            </Card.Content>
          </Card>

          {/* Trigger Manager */}
          <View style={styles.triggerManagerContainer}>
            <TriggerManager
              triggers={triggers}
              onTriggersChange={handleTriggersChange}
              automationId={automation.id}
            />
          </View>

          {/* Active Regions Info */}
          {getActiveLocationTriggers().length > 0 && (
            <Card style={styles.activeRegionsCard}>
              <Card.Content>
                <Text style={styles.activeRegionsTitle}>Active Location Monitoring</Text>
                <Text style={styles.activeRegionsDescription}>
                  Your device is monitoring {getActiveLocationTriggers().length} location{getActiveLocationTriggers().length !== 1 ? 's' : ''} in the background.
                  The automation will run automatically when triggers are activated.
                </Text>
                <View style={styles.monitoringIndicator}>
                  <SafeIcon name="crosshairs-gps" size={16} color="#4CAF50" />
                  <Text style={styles.monitoringText}>Background monitoring active</Text>
                </View>
              </Card.Content>
            </Card>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  warningCard: {
    margin: 16,
    backgroundColor: '#FFF3CD',
  },
  warningContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
  },
  warningDescription: {
    fontSize: 14,
    color: '#856404',
    marginTop: 2,
  },
  refreshButton: {
    borderColor: '#FF9800',
  },
  noAutomationContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
  },
  infoContent: {
    alignItems: 'center',
    padding: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  infoDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  infoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  demoButton: {
    flex: 1,
  },
  selectButton: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  automationCard: {
    margin: 16,
    marginBottom: 0,
  },
  automationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  automationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  automationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  automationDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  automationStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statChip: {
    backgroundColor: '#f0f0f0',
  },
  activeChip: {
    backgroundColor: '#e8f5e8',
  },
  triggerManagerContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activeRegionsCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#e8f5e8',
  },
  activeRegionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  activeRegionsDescription: {
    fontSize: 14,
    color: '#2E7D32',
    marginBottom: 8,
  },
  monitoringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monitoringText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default LocationTriggersScreen;