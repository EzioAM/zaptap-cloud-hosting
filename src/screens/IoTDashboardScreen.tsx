import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeTheme } from '../components/common/ThemeFallbackWrapper';
import { iotService, IoTDevice, DeviceCategory, DeviceCommand } from '../services/iot/IoTIntegrationService';
import { EventLogger } from '../utils/EventLogger';
import { PremiumConfig } from '../config/PremiumConfig';

interface DeviceCardProps {
  device: IoTDevice;
  onControl: (device: IoTDevice, command: DeviceCommand) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onControl }) => {
  const theme = useSafeTheme();
  const [isOn, setIsOn] = useState(device.state?.on || false);
  const [brightness, setBrightness] = useState(device.state?.level || 100);

  const getCategoryIcon = (category: DeviceCategory) => {
    const icons: Record<DeviceCategory, string> = {
      light: 'lightbulb',
      switch: 'toggle-switch',
      outlet: 'power-socket-us',
      lock: 'lock',
      thermostat: 'thermostat',
      sensor: 'motion-sensor',
      camera: 'cctv',
      doorbell: 'doorbell-video',
      blind: 'window-shutter',
      fan: 'fan',
      hvac: 'air-conditioner',
      appliance: 'washing-machine',
      speaker: 'speaker',
      display: 'television',
      bridge: 'router-wireless',
      energy: 'lightning-bolt',
      water: 'water',
      security: 'shield-home',
      health: 'heart-pulse',
      vehicle: 'car-electric',
    };
    return icons[category] || 'devices';
  };

  const getCategoryColor = (category: DeviceCategory) => {
    const colors: Record<DeviceCategory, string> = {
      light: '#FFA726',
      switch: '#66BB6A',
      outlet: '#42A5F5',
      lock: '#EF5350',
      thermostat: '#26C6DA',
      sensor: '#AB47BC',
      camera: '#7E57C2',
      doorbell: '#5C6BC0',
      blind: '#29B6F6',
      fan: '#26A69A',
      hvac: '#00ACC1',
      appliance: '#43A047',
      speaker: '#D4E157',
      display: '#9CCC65',
      bridge: '#FF7043',
      energy: '#FFD54F',
      water: '#4FC3F7',
      security: '#FF5252',
      health: '#EC407A',
      vehicle: '#536DFE',
    };
    return colors[category] || '#9E9E9E';
  };

  const handleToggle = async (value: boolean) => {
    setIsOn(value);
    onControl(device, {
      action: value ? 'on' : 'off',
      parameters: { on: value }
    });
  };

  const handleBrightnessChange = (level: number) => {
    setBrightness(level);
    onControl(device, {
      action: 'setLevel',
      parameters: { level }
    });
  };

  return (
    <TouchableOpacity style={[styles.deviceCard, { backgroundColor: theme.colors.card }]}>
      <View style={styles.deviceHeader}>
        <View style={[styles.deviceIcon, { backgroundColor: getCategoryColor(device.category) + '20' }]}>
          <MaterialCommunityIcons 
            name={getCategoryIcon(device.category) as any} 
            size={24} 
            color={getCategoryColor(device.category)} 
          />
        </View>
        <View style={styles.deviceInfo}>
          <Text style={[styles.deviceName, { color: theme.colors.text }]}>{device.name}</Text>
          <Text style={[styles.deviceModel, { color: theme.colors.text + '80' }]}>
            {device.manufacturer} • {device.protocol.toUpperCase()}
          </Text>
        </View>
        {device.capabilities.onOff && (
          <Switch
            value={isOn}
            onValueChange={handleToggle}
            trackColor={{ false: theme.colors.border, true: getCategoryColor(device.category) }}
            thumbColor={isOn ? '#FFFFFF' : '#F4F3F4'}
          />
        )}
      </View>

      {device.capabilities.dimming && isOn && (
        <View style={styles.brightnessControl}>
          <MaterialCommunityIcons name="brightness-6" size={16} color={theme.colors.text + '80'} />
          <View style={styles.brightnessBar}>
            <View 
              style={[
                styles.brightnessLevel, 
                { 
                  width: `${brightness}%`,
                  backgroundColor: getCategoryColor(device.category)
                }
              ]} 
            />
          </View>
          <Text style={[styles.brightnessText, { color: theme.colors.text + '80' }]}>
            {brightness}%
          </Text>
        </View>
      )}

      <View style={styles.deviceStatus}>
        <View style={styles.statusItem}>
          <MaterialCommunityIcons 
            name={device.online ? 'wifi' : 'wifi-off'} 
            size={14} 
            color={device.online ? '#4CAF50' : '#F44336'} 
          />
          <Text style={[styles.statusText, { color: theme.colors.text + '60' }]}>
            {device.online ? 'Online' : 'Offline'}
          </Text>
        </View>
        {device.batteryLevel !== undefined && (
          <View style={styles.statusItem}>
            <MaterialCommunityIcons 
              name={`battery${device.batteryLevel < 20 ? '-alert' : ''}`} 
              size={14} 
              color={device.batteryLevel < 20 ? '#F44336' : theme.colors.text + '60'} 
            />
            <Text style={[styles.statusText, { color: theme.colors.text + '60' }]}>
              {device.batteryLevel}%
            </Text>
          </View>
        )}
        {device.signalStrength !== undefined && (
          <View style={styles.statusItem}>
            <MaterialCommunityIcons 
              name="signal" 
              size={14} 
              color={theme.colors.text + '60'} 
            />
            <Text style={[styles.statusText, { color: theme.colors.text + '60' }]}>
              {device.signalStrength}dB
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export const IoTDashboardScreen: React.FC = () => {
  const theme = useSafeTheme();
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  useEffect(() => {
    initializeIoT();
  }, []);

  const initializeIoT = async () => {
    try {
      setLoading(true);
      EventLogger.info('IoTDashboard', 'Initializing IoT service');
      
      await iotService.initialize({
        cloud: PremiumConfig.iot.cloud.aws ? {
          provider: 'aws',
          region: 'us-west-2',
        } : undefined
      });

      const connectedDevices = iotService.getDevices();
      setDevices(connectedDevices);
      
      EventLogger.info('IoTDashboard', 'IoT service initialized', { deviceCount: connectedDevices.length });
    } catch (error) {
      EventLogger.error('IoTDashboard', 'Failed to initialize IoT service', error as Error);
      Alert.alert('Error', 'Failed to initialize IoT service');
    } finally {
      setLoading(false);
    }
  };

  const discoverDevices = async () => {
    try {
      setDiscovering(true);
      EventLogger.info('IoTDashboard', 'Starting device discovery');
      
      const discoveredDevices = await iotService.discoverDevices();
      setDevices(discoveredDevices);
      
      EventLogger.info('IoTDashboard', 'Discovery complete', { deviceCount: discoveredDevices.length });
      
      if (discoveredDevices.length === 0) {
        Alert.alert('No Devices Found', 'Make sure your smart devices are powered on and connected to the same network.');
      }
    } catch (error) {
      EventLogger.error('IoTDashboard', 'Device discovery failed', error as Error);
      Alert.alert('Discovery Failed', 'Failed to discover devices. Please check your network connection.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleDeviceControl = async (device: IoTDevice, command: DeviceCommand) => {
    try {
      EventLogger.info('IoTDashboard', 'Controlling device', { deviceId: device.id, command: command.action });
      await iotService.controlDevice(device.id, command);
      
      // Update local state
      const updatedDevices = devices.map(d => 
        d.id === device.id 
          ? { ...d, state: { ...d.state, ...command.parameters } }
          : d
      );
      setDevices(updatedDevices);
    } catch (error) {
      EventLogger.error('IoTDashboard', 'Device control failed', error as Error);
      Alert.alert('Control Failed', 'Failed to control device. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await discoverDevices();
    setRefreshing(false);
  };

  const groupedDevices = devices.reduce((acc, device) => {
    const category = device.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(device);
    return acc;
  }, {} as Record<DeviceCategory, IoTDevice[]>);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
          Initializing Smart Home...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Smart Home</Text>
            <Text style={styles.headerSubtitle}>
              {devices.length} device{devices.length !== 1 ? 's' : ''} connected
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.discoverButton}
            onPress={discoverDevices}
            disabled={discovering}
          >
            {discovering ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="magnify" size={20} color="#FFFFFF" />
                <Text style={styles.discoverButtonText}>Discover</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <MaterialCommunityIcons name="devices" size={24} color="#6366F1" />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {devices.filter(d => d.online).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.text + '80' }]}>Online</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <MaterialCommunityIcons name="home-automation" size={24} color="#10B981" />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {iotService.getAutomations().filter(a => a.enabled).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.text + '80' }]}>Automations</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
          <MaterialCommunityIcons name="cloud-check" size={24} color="#F59E0B" />
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {Object.values(PremiumConfig.iot.protocols).filter(Boolean).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.text + '80' }]}>Protocols</Text>
        </View>
      </View>

      {/* Devices by Category */}
      {devices.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="devices" size={64} color={theme.colors.text + '40'} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Devices Found</Text>
          <Text style={[styles.emptyText, { color: theme.colors.text + '80' }]}>
            Tap "Discover" to find smart devices on your network
          </Text>
        </View>
      ) : (
        Object.entries(groupedDevices).map(([category, categoryDevices]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}s
            </Text>
            {categoryDevices.map(device => (
              <DeviceCard 
                key={device.id} 
                device={device} 
                onControl={handleDeviceControl}
              />
            ))}
          </View>
        ))
      )}

      {/* Add Device Button */}
      <TouchableOpacity 
        style={[styles.addDeviceButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => Alert.alert('Add Device', 'Device pairing will open native platform settings')}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
        <Text style={styles.addDeviceText}>Add New Device</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  discoverButtonText: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  categorySection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  deviceCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  deviceModel: {
    fontSize: 12,
    marginTop: 2,
  },
  brightnessControl: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  brightnessBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  brightnessLevel: {
    height: '100%',
    borderRadius: 2,
  },
  brightnessText: {
    fontSize: 12,
    width: 35,
    textAlign: 'right',
  },
  deviceStatus: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statusText: {
    fontSize: 12,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  addDeviceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  addDeviceText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default IoTDashboardScreen;