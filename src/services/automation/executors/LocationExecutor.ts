import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

export class LocationExecutor extends BaseExecutor {
  readonly stepType = 'location';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const action = step.config.action || 'get_current';
      
      switch (action) {
        case 'get_current':
          return await this.getCurrentLocation(step, context, startTime);
        case 'share_location':
          return await this.shareLocation(step, context, startTime);
        case 'open_maps':
          return await this.openInMaps(step, context, startTime);
        default:
          throw new Error(`Unknown location action: ${action}`);
      }
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }

  private async getCurrentLocation(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
    });

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'location',
        action: 'get_current',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        timestamp: new Date(location.timestamp).toISOString()
      }
    };

    // If configured to show result, display it
    if (step.config.showResult) {
      Alert.alert(
        'Current Location',
        `Latitude: ${location.coords.latitude.toFixed(6)}\nLongitude: ${location.coords.longitude.toFixed(6)}\nAccuracy: ${location.coords.accuracy?.toFixed(0)}m`
      );
    }

    this.logExecution(step, result);
    return result;
  }

  private async shareLocation(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    // Get current location first
    const locationResult = await this.getCurrentLocation(step, context, startTime);
    
    if (!locationResult.success || !locationResult.output) {
      throw new Error('Failed to get current location');
    }

    const { latitude, longitude } = locationResult.output;
    const message = this.replaceVariables(
      step.config.message || 'My current location',
      context.variables || {}
    );
    const phoneNumber = this.replaceVariables(
      step.config.phoneNumber || '',
      context.variables || {}
    );

    // Security validation
    const messageValidation = securityService.sanitizeTextInput(message, 500);
    if (!messageValidation.isValid) {
      throw new Error(`Invalid message: ${messageValidation.errors.join(', ')}`);
    }

    const sanitizedMessage = messageValidation.sanitizedInput || message;
    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    
    // If SMS number is provided, send location via SMS
    if (phoneNumber) {
      const phoneValidation = securityService.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        throw new Error(`Invalid phone number: ${phoneValidation.errors.join(', ')}`);
      }

      const smsMessage = `${sanitizedMessage}\n${locationUrl}`;
      
      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        await SMS.sendSMSAsync([phoneValidation.sanitizedInput || phoneNumber], smsMessage);
      } else {
        throw new Error('SMS is not available on this device');
      }
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'location',
        action: 'share_location',
        latitude,
        longitude,
        message: sanitizedMessage,
        locationUrl,
        phoneNumber: phoneNumber || undefined,
        timestamp: new Date().toISOString()
      }
    };

    this.logExecution(step, result);
    return result;
  }

  private async openInMaps(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    let latitude, longitude;

    if (step.config.useCurrentLocation) {
      const locationResult = await this.getCurrentLocation(step, context, startTime);
      if (!locationResult.success || !locationResult.output) {
        throw new Error('Failed to get current location');
      }
      latitude = locationResult.output.latitude;
      longitude = locationResult.output.longitude;
    } else {
      latitude = step.config.latitude;
      longitude = step.config.longitude;
    }

    if (!latitude || !longitude) {
      throw new Error('No coordinates provided for maps');
    }

    // Validate coordinates
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('Invalid coordinates - must be numbers');
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Invalid coordinate values');
    }

    const label = this.replaceVariables(
      step.config.label || 'Location',
      context.variables || {}
    );

    // Security validation for label
    const labelValidation = securityService.sanitizeTextInput(label, 100);
    const sanitizedLabel = labelValidation.sanitizedInput || label;

    const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}&label=${encodeURIComponent(sanitizedLabel)}`;
    
    const canOpen = await Linking.canOpenURL(mapsUrl);
    if (canOpen) {
      await Linking.openURL(mapsUrl);
    } else {
      throw new Error('Cannot open maps application');
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'location',
        action: 'open_maps',
        latitude,
        longitude,
        label: sanitizedLabel,
        mapsUrl,
        timestamp: new Date().toISOString()
      }
    };

    this.logExecution(step, result);
    return result;
  }
}