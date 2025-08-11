// IoT Integration Service for Premium Automation Platform
// Supports Matter, HomeKit, Zigbee, Thread protocols

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventLogger } from '../../utils/EventLogger';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { nativeModuleWrapper } from './NativeModuleWrapper';

// Protocol types
export type IoTProtocol = 'matter' | 'homekit' | 'zigbee' | 'thread' | 'zwave' | 'wifi' | 'bluetooth';

// Device categories based on Matter 1.4 specification
export type DeviceCategory = 
  | 'light'
  | 'switch'
  | 'outlet'
  | 'lock'
  | 'thermostat'
  | 'sensor'
  | 'camera'
  | 'doorbell'
  | 'blind'
  | 'fan'
  | 'hvac'
  | 'appliance'
  | 'speaker'
  | 'display'
  | 'bridge'
  | 'energy'
  | 'water'
  | 'security'
  | 'health'
  | 'vehicle';

// Device capability flags
export interface DeviceCapabilities {
  onOff?: boolean;
  dimming?: boolean;
  colorControl?: boolean;
  temperatureControl?: boolean;
  motionDetection?: boolean;
  energyMeasurement?: boolean;
  audioControl?: boolean;
  videoStream?: boolean;
  automation?: boolean;
  scheduling?: boolean;
  scenes?: boolean;
  firmware?: boolean;
  localControl?: boolean;
  cloudControl?: boolean;
}

// Unified device model
export interface IoTDevice {
  id: string;
  name: string;
  category: DeviceCategory;
  protocol: IoTProtocol;
  manufacturer: string;
  model: string;
  firmwareVersion?: string;
  capabilities: DeviceCapabilities;
  state: any;
  online: boolean;
  batteryLevel?: number;
  signalStrength?: number;
  lastSeen: Date;
  metadata?: Record<string, any>;
  bridgeId?: string; // For bridged devices
  roomId?: string;
  automationIds?: string[];
}

// Device command structure
export interface DeviceCommand {
  action: string;
  parameters?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
  retries?: number;
}

// Automation trigger types
export interface AutomationTrigger {
  id: string;
  type: 'device' | 'time' | 'location' | 'weather' | 'voice' | 'manual' | 'ml';
  deviceId?: string;
  condition?: any;
  schedule?: string; // Cron expression
  geofence?: { lat: number; lng: number; radius: number };
  mlModel?: string;
  threshold?: number;
}

// Automation action
export interface AutomationAction {
  id: string;
  deviceId: string;
  command: DeviceCommand;
  delay?: number;
  condition?: any;
}

// Automation rule
export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  triggers: AutomationTrigger[];
  conditions?: any[];
  actions: AutomationAction[];
  createdAt: Date;
  updatedAt: Date;
  executionCount: number;
  lastExecuted?: Date;
}

// Cloud provider configuration
export interface CloudConfig {
  provider: 'aws' | 'azure' | 'google' | 'custom';
  endpoint?: string;
  apiKey?: string;
  region?: string;
  credentials?: any;
}

// Main IoT Service Class
export class IoTIntegrationService {
  private static instance: IoTIntegrationService;
  private devices: Map<string, IoTDevice> = new Map();
  private automations: Map<string, AutomationRule> = new Map();
  private bridges: Map<string, any> = new Map();
  private cloudConfig?: CloudConfig;
  private isInitialized = false;
  private discoveryInterval?: NodeJS.Timeout;
  private syncInterval?: NodeJS.Timeout;

  // Native module wrapper for safe access to native bridges
  private nativeWrapper = nativeModuleWrapper;

  private constructor() {
    EventLogger.info('IoTService', 'Initializing IoT Integration Service');
  }

  static getInstance(): IoTIntegrationService {
    if (!IoTIntegrationService.instance) {
      IoTIntegrationService.instance = new IoTIntegrationService();
    }
    return IoTIntegrationService.instance;
  }

  // Initialize the service
  async initialize(config?: { cloud?: CloudConfig }): Promise<void> {
    if (this.isInitialized) {
      EventLogger.warn('IoTService', 'Service already initialized');
      return;
    }

    try {
      EventLogger.info('IoTService', 'Starting initialization');

      // Load saved devices and automations
      await this.loadFromStorage();

      // Initialize cloud connection if configured
      if (config?.cloud) {
        await this.initializeCloud(config.cloud);
      }

      // Initialize protocol bridges
      await this.initializeBridges();

      // Start device discovery
      await this.startDiscovery();

      // Start sync service
      this.startSync();

      this.isInitialized = true;
      EventLogger.info('IoTService', 'Initialization complete', {
        deviceCount: this.devices.size,
        automationCount: this.automations.size,
      });
    } catch (error) {
      EventLogger.error('IoTService', 'Initialization failed', error as Error);
      throw error;
    }
  }

  // Initialize protocol bridges
  private async initializeBridges(): Promise<void> {
    // Initialize native module wrapper
    try {
      await this.nativeWrapper.initialize();
      EventLogger.info('IoTService', 'Native bridges initialized via wrapper');
      
      // Log which modules are available
      if (this.nativeWrapper.isMatterAvailable()) {
        EventLogger.info('IoTService', 'Matter bridge is available');
      }
      if (this.nativeWrapper.isHomeKitAvailable()) {
        EventLogger.info('IoTService', 'HomeKit bridge is available');
      }
    } catch (error) {
      EventLogger.error('IoTService', 'Native bridge initialization failed', error as Error);
      // Continue without native modules - use fallback/mock data
    }
  }

  // Initialize cloud connection
  private async initializeCloud(config: CloudConfig): Promise<void> {
    this.cloudConfig = config;

    switch (config.provider) {
      case 'aws':
        await this.initializeAWSIoT(config);
        break;
      case 'azure':
        await this.initializeAzureIoT(config);
        break;
      case 'google':
        await this.initializeGoogleIoT(config);
        break;
      case 'custom':
        await this.initializeCustomCloud(config);
        break;
    }
  }

  // AWS IoT Core initialization
  private async initializeAWSIoT(config: CloudConfig): Promise<void> {
    EventLogger.info('IoTService', 'Initializing AWS IoT Core');
    // Implementation would use AWS IoT Device SDK
    // This is a placeholder for the actual implementation
  }

  // Azure IoT Hub initialization
  private async initializeAzureIoT(config: CloudConfig): Promise<void> {
    EventLogger.info('IoTService', 'Initializing Azure IoT Hub');
    // Implementation would use Azure IoT Device SDK
  }

  // Google Cloud IoT initialization
  private async initializeGoogleIoT(config: CloudConfig): Promise<void> {
    EventLogger.info('IoTService', 'Initializing Google Cloud IoT');
    // Implementation would use Google Cloud IoT SDK
  }

  // Custom cloud initialization
  private async initializeCustomCloud(config: CloudConfig): Promise<void> {
    EventLogger.info('IoTService', 'Initializing custom cloud', { endpoint: config.endpoint });
    // Implementation for custom MQTT/HTTP endpoints
  }

  // Device discovery
  async discoverDevices(): Promise<IoTDevice[]> {
    EventLogger.info('IoTService', 'Starting device discovery');
    const discoveredDevices: IoTDevice[] = [];

    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No network connection');
      }

      // Discover Matter devices
      if (this.nativeWrapper.isMatterAvailable()) {
        const matterDevices = await this.nativeWrapper.discoverMatterDevices();
        discoveredDevices.push(...this.normalizeMatterDevices(matterDevices));
      }

      // Discover HomeKit devices
      if (this.nativeWrapper.isHomeKitAvailable()) {
        const homekitDevices = await this.nativeWrapper.discoverHomeKitDevices();
        discoveredDevices.push(...this.normalizeHomeKitDevices(homekitDevices));
      }

      // Discover Zigbee devices
      // Note: Zigbee support will be added when native module is available
      const zigbeeAvailable = false; // TODO: Add to native wrapper
      if (zigbeeAvailable) {
        // const zigbeeDevices = await this.nativeWrapper.discoverZigbeeDevices();
        discoveredDevices.push(...this.normalizeZigbeeDevices(zigbeeDevices));
      }

      // Discover cloud devices
      if (this.cloudConfig) {
        const cloudDevices = await this.discoverCloudDevices();
        discoveredDevices.push(...cloudDevices);
      }

      EventLogger.info('IoTService', 'Discovery complete', { 
        deviceCount: discoveredDevices.length 
      });

      // Update device list
      discoveredDevices.forEach(device => {
        this.devices.set(device.id, device);
      });

      // Save to storage
      await this.saveToStorage();

      return discoveredDevices;
    } catch (error) {
      EventLogger.error('IoTService', 'Device discovery failed', error as Error);
      throw error;
    }
  }

  // Normalize Matter devices to unified model
  private normalizeMatterDevices(devices: any[]): IoTDevice[] {
    return devices.map(device => ({
      id: device.nodeId,
      name: device.name || `Matter Device ${device.nodeId}`,
      category: this.mapMatterDeviceType(device.deviceType),
      protocol: 'matter' as IoTProtocol,
      manufacturer: device.vendorName || 'Unknown',
      model: device.productName || 'Unknown',
      firmwareVersion: device.softwareVersion,
      capabilities: this.extractMatterCapabilities(device.clusters),
      state: device.state || {},
      online: device.reachable || false,
      batteryLevel: device.batteryLevel,
      signalStrength: device.rssi,
      lastSeen: new Date(device.lastSeen || Date.now()),
      metadata: device.metadata,
    }));
  }

  // Normalize HomeKit devices
  private normalizeHomeKitDevices(devices: any[]): IoTDevice[] {
    return devices.map(device => ({
      id: device.uniqueId,
      name: device.name,
      category: this.mapHomeKitCategory(device.category),
      protocol: 'homekit' as IoTProtocol,
      manufacturer: device.manufacturer || 'Unknown',
      model: device.model || 'Unknown',
      firmwareVersion: device.firmwareRevision,
      capabilities: this.extractHomeKitCapabilities(device.services),
      state: device.characteristics || {},
      online: device.reachable || false,
      batteryLevel: device.batteryLevel,
      signalStrength: device.signalStrength,
      lastSeen: new Date(),
      metadata: device.metadata,
    }));
  }

  // Normalize Zigbee devices
  private normalizeZigbeeDevices(devices: any[]): IoTDevice[] {
    return devices.map(device => ({
      id: device.ieeeAddr,
      name: device.friendly_name || `Zigbee ${device.ieeeAddr}`,
      category: this.mapZigbeeDeviceType(device.type),
      protocol: 'zigbee' as IoTProtocol,
      manufacturer: device.manufacturerName || 'Unknown',
      model: device.modelId || 'Unknown',
      firmwareVersion: device.swBuildId,
      capabilities: this.extractZigbeeCapabilities(device),
      state: device.state || {},
      online: device.online || false,
      batteryLevel: device.battery,
      signalStrength: device.linkquality,
      lastSeen: new Date(device.lastSeen || Date.now()),
      metadata: device.meta,
    }));
  }

  // Discover cloud-connected devices
  private async discoverCloudDevices(): Promise<IoTDevice[]> {
    if (!this.cloudConfig) return [];

    switch (this.cloudConfig.provider) {
      case 'aws':
        return this.discoverAWSDevices();
      case 'azure':
        return this.discoverAzureDevices();
      case 'google':
        return this.discoverGoogleDevices();
      default:
        return [];
    }
  }

  // Placeholder for AWS device discovery
  private async discoverAWSDevices(): Promise<IoTDevice[]> {
    // Implementation would use AWS IoT API
    return [];
  }

  // Placeholder for Azure device discovery
  private async discoverAzureDevices(): Promise<IoTDevice[]> {
    // Implementation would use Azure IoT API
    return [];
  }

  // Placeholder for Google device discovery
  private async discoverGoogleDevices(): Promise<IoTDevice[]> {
    // Implementation would use Google IoT API
    return [];
  }

  // Control a device
  async controlDevice(deviceId: string, command: DeviceCommand): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    EventLogger.info('IoTService', 'Controlling device', {
      deviceId,
      command: command.action,
      protocol: device.protocol,
    });

    try {
      switch (device.protocol) {
        case 'matter':
          await this.controlMatterDevice(device, command);
          break;
        case 'homekit':
          await this.controlHomeKitDevice(device, command);
          break;
        case 'zigbee':
          await this.controlZigbeeDevice(device, command);
          break;
        default:
          await this.controlCloudDevice(device, command);
      }

      // Update device state
      device.state = { ...device.state, ...command.parameters };
      device.lastSeen = new Date();

      // Save state
      await this.saveToStorage();

      EventLogger.info('IoTService', 'Device controlled successfully', { deviceId });
    } catch (error) {
      EventLogger.error('IoTService', 'Device control failed', error as Error);
      throw error;
    }
  }

  // Control Matter device
  private async controlMatterDevice(device: IoTDevice, command: DeviceCommand): Promise<void> {
    if (!this.nativeWrapper.isMatterAvailable()) {
      throw new Error('Matter bridge not available');
    }
    await this.nativeWrapper.sendMatterCommand(device.id, command);
  }

  // Control HomeKit device
  private async controlHomeKitDevice(device: IoTDevice, command: DeviceCommand): Promise<void> {
    if (!this.nativeWrapper.isHomeKitAvailable()) {
      throw new Error('HomeKit bridge not available');
    }
    await this.nativeWrapper.setHomeKitCharacteristic(device.id, command);
  }

  // Control Zigbee device
  private async controlZigbeeDevice(device: IoTDevice, command: DeviceCommand): Promise<void> {
    // Zigbee support will be added when native module is available
    throw new Error('Zigbee bridge not yet implemented');
  }

  // Control cloud device
  private async controlCloudDevice(device: IoTDevice, command: DeviceCommand): Promise<void> {
    // Implementation would send command via cloud API
    EventLogger.info('IoTService', 'Sending cloud command', { deviceId: device.id });
  }

  // Create automation rule
  async createAutomation(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>): Promise<AutomationRule> {
    const automation: AutomationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      executionCount: 0,
    };

    this.automations.set(automation.id, automation);
    await this.saveToStorage();

    EventLogger.info('IoTService', 'Automation created', { 
      id: automation.id, 
      name: automation.name 
    });

    return automation;
  }

  // Execute automation
  async executeAutomation(automationId: string): Promise<void> {
    const automation = this.automations.get(automationId);
    if (!automation) {
      throw new Error(`Automation ${automationId} not found`);
    }

    if (!automation.enabled) {
      EventLogger.warn('IoTService', 'Automation is disabled', { automationId });
      return;
    }

    EventLogger.info('IoTService', 'Executing automation', { 
      id: automationId, 
      name: automation.name 
    });

    try {
      // Execute actions in sequence
      for (const action of automation.actions) {
        if (action.delay) {
          await this.delay(action.delay);
        }

        await this.controlDevice(action.deviceId, action.command);
      }

      // Update execution stats
      automation.executionCount++;
      automation.lastExecuted = new Date();
      automation.updatedAt = new Date();

      await this.saveToStorage();

      EventLogger.info('IoTService', 'Automation executed successfully', { automationId });
    } catch (error) {
      EventLogger.error('IoTService', 'Automation execution failed', error as Error);
      throw error;
    }
  }

  // Get all devices
  getDevices(): IoTDevice[] {
    return Array.from(this.devices.values());
  }

  // Get device by ID
  getDevice(deviceId: string): IoTDevice | undefined {
    return this.devices.get(deviceId);
  }

  // Get devices by category
  getDevicesByCategory(category: DeviceCategory): IoTDevice[] {
    return Array.from(this.devices.values()).filter(d => d.category === category);
  }

  // Get devices by protocol
  getDevicesByProtocol(protocol: IoTProtocol): IoTDevice[] {
    return Array.from(this.devices.values()).filter(d => d.protocol === protocol);
  }

  // Get all automations
  getAutomations(): AutomationRule[] {
    return Array.from(this.automations.values());
  }

  // Get automation by ID
  getAutomation(automationId: string): AutomationRule | undefined {
    return this.automations.get(automationId);
  }

  // Start device discovery interval
  private startDiscovery(): void {
    // Initial discovery
    this.discoverDevices().catch(error => {
      EventLogger.error('IoTService', 'Initial discovery failed', error);
    });

    // Periodic discovery (every 30 seconds)
    this.discoveryInterval = setInterval(() => {
      this.discoverDevices().catch(error => {
        EventLogger.error('IoTService', 'Periodic discovery failed', error);
      });
    }, 30000);
  }

  // Start sync service
  private startSync(): void {
    this.syncInterval = setInterval(() => {
      this.syncWithCloud().catch(error => {
        EventLogger.error('IoTService', 'Cloud sync failed', error);
      });
    }, 60000); // Every minute
  }

  // Sync with cloud
  private async syncWithCloud(): Promise<void> {
    if (!this.cloudConfig) return;

    EventLogger.debug('IoTService', 'Syncing with cloud');
    // Implementation would sync device states and automations with cloud
  }

  // Helper methods
  private mapMatterDeviceType(type: number): DeviceCategory {
    // Map Matter device types to categories
    const typeMap: Record<number, DeviceCategory> = {
      0x0100: 'light',
      0x0101: 'switch',
      0x010A: 'lock',
      0x0201: 'thermostat',
      0x0106: 'sensor',
      // Add more mappings as needed
    };
    return typeMap[type] || 'switch';
  }

  private mapHomeKitCategory(category: number): DeviceCategory {
    // Map HomeKit categories
    const categoryMap: Record<number, DeviceCategory> = {
      5: 'light',
      8: 'switch',
      6: 'lock',
      9: 'thermostat',
      10: 'sensor',
      // Add more mappings
    };
    return categoryMap[category] || 'switch';
  }

  private mapZigbeeDeviceType(type: string): DeviceCategory {
    // Map Zigbee device types
    if (type.includes('light')) return 'light';
    if (type.includes('switch')) return 'switch';
    if (type.includes('sensor')) return 'sensor';
    if (type.includes('lock')) return 'lock';
    return 'switch';
  }

  private extractMatterCapabilities(clusters: any[]): DeviceCapabilities {
    const capabilities: DeviceCapabilities = {};
    
    clusters?.forEach(cluster => {
      switch (cluster.id) {
        case 0x0006: capabilities.onOff = true; break;
        case 0x0008: capabilities.dimming = true; break;
        case 0x0300: capabilities.colorControl = true; break;
        case 0x0201: capabilities.temperatureControl = true; break;
        // Add more cluster mappings
      }
    });

    return capabilities;
  }

  private extractHomeKitCapabilities(services: any[]): DeviceCapabilities {
    const capabilities: DeviceCapabilities = {};
    
    services?.forEach(service => {
      switch (service.type) {
        case 'Lightbulb': 
          capabilities.onOff = true;
          capabilities.dimming = true;
          break;
        case 'ColorLight':
          capabilities.colorControl = true;
          break;
        case 'Thermostat':
          capabilities.temperatureControl = true;
          break;
        // Add more service mappings
      }
    });

    return capabilities;
  }

  private extractZigbeeCapabilities(device: any): DeviceCapabilities {
    const capabilities: DeviceCapabilities = {};
    
    if (device.features?.includes('state')) capabilities.onOff = true;
    if (device.features?.includes('brightness')) capabilities.dimming = true;
    if (device.features?.includes('color')) capabilities.colorControl = true;
    if (device.features?.includes('temperature')) capabilities.temperatureControl = true;

    return capabilities;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Storage methods
  private async loadFromStorage(): Promise<void> {
    try {
      const devicesJson = await AsyncStorage.getItem('iot_devices');
      const automationsJson = await AsyncStorage.getItem('iot_automations');

      if (devicesJson) {
        const devices = JSON.parse(devicesJson);
        devices.forEach((device: IoTDevice) => {
          device.lastSeen = new Date(device.lastSeen);
          this.devices.set(device.id, device);
        });
      }

      if (automationsJson) {
        const automations = JSON.parse(automationsJson);
        automations.forEach((automation: AutomationRule) => {
          automation.createdAt = new Date(automation.createdAt);
          automation.updatedAt = new Date(automation.updatedAt);
          if (automation.lastExecuted) {
            automation.lastExecuted = new Date(automation.lastExecuted);
          }
          this.automations.set(automation.id, automation);
        });
      }

      EventLogger.info('IoTService', 'Loaded from storage', {
        devices: this.devices.size,
        automations: this.automations.size,
      });
    } catch (error) {
      EventLogger.error('IoTService', 'Failed to load from storage', error as Error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const devices = Array.from(this.devices.values());
      const automations = Array.from(this.automations.values());

      await AsyncStorage.setItem('iot_devices', JSON.stringify(devices));
      await AsyncStorage.setItem('iot_automations', JSON.stringify(automations));

      EventLogger.debug('IoTService', 'Saved to storage', {
        devices: devices.length,
        automations: automations.length,
      });
    } catch (error) {
      EventLogger.error('IoTService', 'Failed to save to storage', error as Error);
    }
  }

  // Cleanup
  dispose(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.devices.clear();
    this.automations.clear();
    this.bridges.clear();
    
    EventLogger.info('IoTService', 'Service disposed');
  }
}

// Export singleton instance
export const iotService = IoTIntegrationService.getInstance();