import { NativeModules, Platform } from 'react-native';
import { EventLogger } from '../../utils/EventLogger';

// Type definitions for native modules
interface MatterBridgeModule {
  initialize: (config: any) => Promise<any>;
  discover: () => Promise<any[]>;
  commission: (deviceId: string, pairingCode: string) => Promise<any>;
  sendCommand: (deviceId: string, command: any) => Promise<any>;
  getDeviceState: (deviceId: string) => Promise<any>;
}

interface HomeKitBridgeModule {
  initialize: () => Promise<any>;
  discover: () => Promise<any[]>;
  setCharacteristic: (accessoryId: string, command: any) => Promise<any>;
  addAccessory: (name: string) => Promise<any>;
}

// Safely get native modules with fallbacks
class NativeModuleWrapper {
  private matterBridge: MatterBridgeModule | null = null;
  private homeKitBridge: HomeKitBridgeModule | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.checkNativeModules();
  }

  private checkNativeModules() {
    try {
      // Check for Matter Bridge
      if (NativeModules.MatterBridge) {
        this.matterBridge = NativeModules.MatterBridge as MatterBridgeModule;
        EventLogger.info('NativeModuleWrapper', 'MatterBridge module available');
      } else {
        EventLogger.warn('NativeModuleWrapper', 'MatterBridge module not available');
      }

      // Check for HomeKit Bridge (iOS only)
      if (Platform.OS === 'ios' && NativeModules.HomeKitBridge) {
        this.homeKitBridge = NativeModules.HomeKitBridge as HomeKitBridgeModule;
        EventLogger.info('NativeModuleWrapper', 'HomeKitBridge module available');
      } else if (Platform.OS === 'ios') {
        EventLogger.warn('NativeModuleWrapper', 'HomeKitBridge module not available on iOS');
      }
    } catch (error) {
      EventLogger.error('NativeModuleWrapper', 'Error checking native modules', error as Error);
    }
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.isInitialized;
    }

    this.initPromise = this.performInitialization();
    await this.initPromise;
    return this.isInitialized;
  }

  private async performInitialization(): Promise<void> {
    const promises: Promise<any>[] = [];

    // Initialize Matter Bridge if available
    if (this.matterBridge) {
      promises.push(
        this.matterBridge.initialize({
          vendorId: 0xFFF1,
          productId: 0x8000,
          deviceName: 'ZapTap Hub',
          passcode: 20202021,
          discriminator: 3840
        }).catch(error => {
          EventLogger.error('NativeModuleWrapper', 'Failed to initialize MatterBridge', error);
          return null;
        })
      );
    }

    // Initialize HomeKit Bridge if available
    if (this.homeKitBridge) {
      promises.push(
        this.homeKitBridge.initialize().catch(error => {
          EventLogger.error('NativeModuleWrapper', 'Failed to initialize HomeKitBridge', error);
          return null;
        })
      );
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      this.isInitialized = true;
      EventLogger.info('NativeModuleWrapper', 'Native modules initialized successfully');
    } else {
      EventLogger.warn('NativeModuleWrapper', 'No native modules to initialize');
      this.isInitialized = true; // Mark as initialized even if no modules
    }
  }

  // Matter Bridge methods with fallbacks
  async discoverMatterDevices(): Promise<any[]> {
    if (!this.matterBridge) {
      EventLogger.warn('NativeModuleWrapper', 'MatterBridge not available, returning mock devices');
      return this.getMockMatterDevices();
    }

    try {
      await this.initialize();
      return await this.matterBridge.discover();
    } catch (error) {
      EventLogger.error('NativeModuleWrapper', 'Failed to discover Matter devices', error as Error);
      return this.getMockMatterDevices();
    }
  }

  async commissionMatterDevice(deviceId: string, pairingCode: string): Promise<any> {
    if (!this.matterBridge) {
      EventLogger.warn('NativeModuleWrapper', 'MatterBridge not available');
      return { success: false, error: 'Matter not available' };
    }

    try {
      await this.initialize();
      return await this.matterBridge.commission(deviceId, pairingCode);
    } catch (error) {
      EventLogger.error('NativeModuleWrapper', 'Failed to commission Matter device', error as Error);
      throw error;
    }
  }

  async sendMatterCommand(deviceId: string, command: any): Promise<any> {
    if (!this.matterBridge) {
      EventLogger.warn('NativeModuleWrapper', 'MatterBridge not available');
      return { success: false, error: 'Matter not available' };
    }

    try {
      await this.initialize();
      return await this.matterBridge.sendCommand(deviceId, command);
    } catch (error) {
      EventLogger.error('NativeModuleWrapper', 'Failed to send Matter command', error as Error);
      throw error;
    }
  }

  // HomeKit Bridge methods with fallbacks
  async discoverHomeKitDevices(): Promise<any[]> {
    if (!this.homeKitBridge) {
      EventLogger.warn('NativeModuleWrapper', 'HomeKitBridge not available, returning mock devices');
      return this.getMockHomeKitDevices();
    }

    try {
      await this.initialize();
      return await this.homeKitBridge.discover();
    } catch (error) {
      EventLogger.error('NativeModuleWrapper', 'Failed to discover HomeKit devices', error as Error);
      return this.getMockHomeKitDevices();
    }
  }

  async setHomeKitCharacteristic(accessoryId: string, command: any): Promise<any> {
    if (!this.homeKitBridge) {
      EventLogger.warn('NativeModuleWrapper', 'HomeKitBridge not available');
      return { success: false, error: 'HomeKit not available' };
    }

    try {
      await this.initialize();
      return await this.homeKitBridge.setCharacteristic(accessoryId, command);
    } catch (error) {
      EventLogger.error('NativeModuleWrapper', 'Failed to set HomeKit characteristic', error as Error);
      throw error;
    }
  }

  async addHomeKitAccessory(name: string): Promise<any> {
    if (!this.homeKitBridge) {
      EventLogger.warn('NativeModuleWrapper', 'HomeKitBridge not available');
      return { success: false, error: 'HomeKit not available' };
    }

    try {
      await this.initialize();
      return await this.homeKitBridge.addAccessory(name);
    } catch (error) {
      EventLogger.error('NativeModuleWrapper', 'Failed to add HomeKit accessory', error as Error);
      throw error;
    }
  }

  // Check if native modules are available
  isMatterAvailable(): boolean {
    return this.matterBridge !== null;
  }

  isHomeKitAvailable(): boolean {
    return this.homeKitBridge !== null && Platform.OS === 'ios';
  }

  hasNativeModules(): boolean {
    return this.matterBridge !== null || this.homeKitBridge !== null;
  }

  // Mock data for development/testing
  private getMockMatterDevices(): any[] {
    return [
      {
        id: 'mock-matter-1',
        name: 'Mock Matter Light',
        type: 'light',
        manufacturer: 'Mock Devices Inc.',
        model: 'ML-100',
        protocol: 'matter',
        online: true,
        state: { on: false, level: 100 }
      },
      {
        id: 'mock-matter-2',
        name: 'Mock Matter Switch',
        type: 'switch',
        manufacturer: 'Mock Devices Inc.',
        model: 'MS-200',
        protocol: 'matter',
        online: true,
        state: { on: false }
      }
    ];
  }

  private getMockHomeKitDevices(): any[] {
    if (Platform.OS !== 'ios') {
      return [];
    }

    return [
      {
        uniqueId: 'mock-homekit-1',
        name: 'Mock HomeKit Bulb',
        manufacturer: 'Mock Home',
        model: 'HKB-100',
        category: 'light',
        reachable: true,
        services: [
          {
            type: 'lightbulb',
            name: 'Light',
            characteristics: [
              { type: 'power', readable: true, writable: true, value: false },
              { type: 'brightness', readable: true, writable: true, value: 100 }
            ]
          }
        ]
      },
      {
        uniqueId: 'mock-homekit-2',
        name: 'Mock HomeKit Lock',
        manufacturer: 'Mock Home',
        model: 'HKL-200',
        category: 'lock',
        reachable: true,
        services: [
          {
            type: 'lock',
            name: 'Lock',
            characteristics: [
              { type: 'lockState', readable: true, writable: true, value: 'locked' }
            ]
          }
        ]
      }
    ];
  }
}

// Export singleton instance
export const nativeModuleWrapper = new NativeModuleWrapper();

// Export for testing
export default nativeModuleWrapper;