import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Alert } from 'react-native';
import { Logger } from '../../utils/Logger';
import { AutomationData, AutomationTrigger, LocationTriggerConfig } from '../../types';
// Dynamic import to prevent circular dependency
// import { AutomationEngine } from '../automation/AutomationEngine';

const LOCATION_TASK_NAME = 'background-location-task';
const GEOFENCING_TASK_NAME = 'geofencing-task';

export interface GeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  automationId: string;
  triggerId: string;
  triggerType: 'location_enter' | 'location_exit';
}

export class LocationTriggerService {
  private logger: Logger;
  private activeRegions: Map<string, GeofenceRegion> = new Map();
  private isMonitoring: boolean = false;

  constructor() {
    this.logger = new Logger('LocationTriggerService');
    this.setupTaskManager();
  }

  private setupTaskManager() {
    // Define the background location task
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
      if (error) {
        this.logger.error('Background location task error', { error: error.message });
        return;
      }
      
      if (data) {
        const { locations } = data;
        this.processLocationUpdate(locations[0]);
      }
    });

    // Define the geofencing task
    TaskManager.defineTask(GEOFENCING_TASK_NAME, async ({ data, error }: any) => {
      if (error) {
        this.logger.error('Geofencing task error', { error: error.message });
        return;
      }
      
      if (data) {
        const { eventType, region } = data;
        await this.processGeofenceEvent(eventType, region);
      }
    });
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Request foreground location permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Location-based automations require location access to work properly.'
        );
        return false;
      }

      // Request background location permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        Alert.alert(
          'Background Location Required',
          'To trigger automations when you arrive or leave locations, background location access is required.'
        );
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error('Permission request failed', { error: error.message });
      return false;
    }
  }

  async addLocationTrigger(
    automation: AutomationData,
    trigger: AutomationTrigger
  ): Promise<boolean> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return false;
      }

      const config = trigger.config as LocationTriggerConfig;
      const region: GeofenceRegion = {
        identifier: `${automation.id}_${trigger.id}`,
        latitude: config.latitude,
        longitude: config.longitude,
        radius: config.radius,
        automationId: automation.id,
        triggerId: trigger.id,
        triggerType: trigger.type as 'location_enter' | 'location_exit'
      };

      // Start geofencing for this region
      await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, [
        {
          identifier: region.identifier,
          latitude: region.latitude,
          longitude: region.longitude,
          radius: region.radius,
          notifyOnEnter: trigger.type === 'location_enter',
          notifyOnExit: trigger.type === 'location_exit',
        }
      ]);

      this.activeRegions.set(region.identifier, region);
      this.logger.info('Location trigger added', {
        automationId: automation.id,
        triggerId: trigger.id,
        location: config.name
      });

      if (!this.isMonitoring) {
        await this.startLocationMonitoring();
      }

      return true;
    } catch (error: any) {
      this.logger.error('Failed to add location trigger', { error: error.message });
      Alert.alert('Error', `Failed to add location trigger: ${error.message}`);
      return false;
    }
  }

  async removeLocationTrigger(automationId: string, triggerId: string): Promise<void> {
    try {
      const identifier = `${automationId}_${triggerId}`;
      
      if (this.activeRegions.has(identifier)) {
        await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
        
        // Remove this region and restart geofencing with remaining regions
        this.activeRegions.delete(identifier);
        
        if (this.activeRegions.size > 0) {
          const remainingRegions = Array.from(this.activeRegions.values()).map(region => ({
            identifier: region.identifier,
            latitude: region.latitude,
            longitude: region.longitude,
            radius: region.radius,
            notifyOnEnter: region.triggerType === 'location_enter',
            notifyOnExit: region.triggerType === 'location_exit',
          }));
          
          await Location.startGeofencingAsync(GEOFENCING_TASK_NAME, remainingRegions);
        } else {
          await this.stopLocationMonitoring();
        }

        this.logger.info('Location trigger removed', { automationId, triggerId });
      }
    } catch (error: any) {
      this.logger.error('Failed to remove location trigger', { error: error.message });
    }
  }

  private async startLocationMonitoring(): Promise<void> {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // 30 seconds
        distanceInterval: 100, // 100 meters
        deferredUpdatesInterval: 60000, // 1 minute
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'Shortcuts Like',
          notificationBody: 'Location-based automations are active',
        },
      });

      this.isMonitoring = true;
      this.logger.info('Location monitoring started');
    } catch (error: any) {
      this.logger.error('Failed to start location monitoring', { error: error.message });
    }
  }

  private async stopLocationMonitoring(): Promise<void> {
    try {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      await Location.stopGeofencingAsync(GEOFENCING_TASK_NAME);
      this.isMonitoring = false;
      this.logger.info('Location monitoring stopped');
    } catch (error: any) {
      this.logger.error('Failed to stop location monitoring', { error: error.message });
    }
  }

  private processLocationUpdate(location: Location.LocationObject): void {
    this.logger.debug('Location update received', {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy
    });

    // Manual geofence checking as fallback
    for (const region of this.activeRegions.values()) {
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        region.latitude,
        region.longitude
      );

      if (distance <= region.radius) {
        this.logger.info('Manual geofence triggered', {
          regionId: region.identifier,
          distance,
          radius: region.radius
        });
        // This could trigger enter events for manual checking
      }
    }
  }

  private async processGeofenceEvent(eventType: string, region: any): Promise<void> {
    try {
      const regionData = this.activeRegions.get(region.identifier);
      if (!regionData) {
        this.logger.warn('Unknown geofence region', { identifier: region.identifier });
        return;
      }

      this.logger.info('Geofence event triggered', {
        eventType,
        regionId: region.identifier,
        automationId: regionData.automationId
      });

      // Check if this is the right event type for this trigger
      const shouldTrigger = 
        (eventType === 'enter' && regionData.triggerType === 'location_enter') ||
        (eventType === 'exit' && regionData.triggerType === 'location_exit');

      if (shouldTrigger) {
        await this.executeTriggeredAutomation(regionData);
      }
    } catch (error: any) {
      this.logger.error('Failed to process geofence event', { error: error.message });
    }
  }

  private async executeTriggeredAutomation(region: GeofenceRegion): Promise<void> {
    try {
      // In a real implementation, you would fetch the automation from storage
      // For now, we'll show a notification that the trigger fired
      Alert.alert(
        'Location Trigger Activated! 🎯',
        `Automation triggered at location. Region: ${region.identifier}`,
        [{ text: 'OK' }]
      );

      this.logger.info('Location-triggered automation executed', {
        automationId: region.automationId,
        triggerId: region.triggerId,
        triggerType: region.triggerType
      });
    } catch (error: any) {
      this.logger.error('Failed to execute triggered automation', { error: error.message });
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return location;
    } catch (error: any) {
      this.logger.error('Failed to get current location', { error: error.message });
      return null;
    }
  }

  getActiveRegions(): GeofenceRegion[] {
    return Array.from(this.activeRegions.values());
  }

  async isLocationServicesEnabled(): Promise<boolean> {
    return await Location.hasServicesEnabledAsync();
  }

  async stopAllLocationTriggers(): Promise<void> {
    try {
      await this.stopLocationMonitoring();
      this.activeRegions.clear();
      this.logger.info('All location triggers stopped');
    } catch (error: any) {
      this.logger.error('Failed to stop all location triggers', { error: error.message });
    }
  }
}

export const locationTriggerService = new LocationTriggerService();