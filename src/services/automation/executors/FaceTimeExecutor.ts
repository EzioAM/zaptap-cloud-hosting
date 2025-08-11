import { Linking, Platform, Alert } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionResult } from '../../../types';
import { SecurityService } from '../../security/SecurityService';
import { EventLogger } from '../../../utils/EventLogger';

export interface FaceTimeConfig {
  /** Contact identifier - can be phone number or email */
  contact: string;
  /** Type of FaceTime call - video or audio */
  callType: 'video' | 'audio';
  /** Optional display name for the contact */
  displayName?: string;
  /** Whether to show confirmation dialog before calling */
  showConfirmation?: boolean;
  /** Custom message for confirmation dialog */
  confirmationMessage?: string;
}

/**
 * FaceTimeExecutor handles initiating FaceTime calls through URL schemes
 * 
 * Features:
 * - Video and audio FaceTime calls
 * - Phone number and email support
 * - Contact validation and sanitization
 * - Confirmation dialogs for safety
 * - iOS-specific implementation with fallbacks
 * 
 * URL Schemes Used:
 * - facetime://contact - Video FaceTime
 * - facetime-audio://contact - Audio-only FaceTime
 * 
 * Security Notes:
 * - All contacts are sanitized to prevent malicious URLs
 * - Only allows valid phone numbers and email formats
 * - Confirmation dialogs prevent accidental calls
 * - iOS 9+ requires LSApplicationQueriesSchemes configuration
 */
export class FaceTimeExecutor extends BaseExecutor {
  async execute(step: AutomationStep): Promise<ExecutionResult> {
    try {
      EventLogger.debug('FaceTimeExecutor', 'Starting FaceTime call execution', step.config);
      
      const config = step.config as FaceTimeConfig;
      
      // Validate required configuration
      if (!config.contact) {
        return {
          success: false,
          error: 'Contact (phone number or email) is required for FaceTime calls'
        };
      }
      
      // Check if we're on iOS (FaceTime is iOS-only)
      if (Platform.OS !== 'ios') {
        return {
          success: false,
          error: 'FaceTime is only available on iOS devices'
        };
      }
      
      // Sanitize and validate contact information
      const sanitizedContact = this.sanitizeContact(config.contact);
      if (!sanitizedContact) {
        return {
          success: false,
          error: 'Invalid contact format. Please provide a valid phone number or email address.'
        };
      }
      
      // Build FaceTime URL based on call type
      const callType = config.callType || 'video';
      const scheme = callType === 'audio' ? 'facetime-audio' : 'facetime';
      const faceTimeUrl = `${scheme}:${sanitizedContact}`;
      
      EventLogger.debug('FaceTimeExecutor', 'Generated FaceTime URL', { 
        url: faceTimeUrl, 
        type: callType,
        contact: sanitizedContact 
      });
      
      // Check if FaceTime URL can be opened
      const canOpenURL = await Linking.canOpenURL(faceTimeUrl);
      if (!canOpenURL) {
        return {
          success: false,
          error: 'FaceTime is not available or not configured on this device'
        };
      }
      
      // Show confirmation dialog if requested
      if (config.showConfirmation !== false) { // Default to true
        const displayName = config.displayName || sanitizedContact;
        const callTypeText = callType === 'audio' ? 'Audio FaceTime' : 'Video FaceTime';
        const message = config.confirmationMessage || 
          `Do you want to start a ${callTypeText} call with ${displayName}?`;
        
        const confirmed = await this.showConfirmationDialog('FaceTime Call', message);
        if (!confirmed) {
          return {
            success: false,
            error: 'FaceTime call cancelled by user'
          };
        }
      }
      
      // Initiate the FaceTime call
      await Linking.openURL(faceTimeUrl);
      
      EventLogger.info('FaceTimeExecutor', 'FaceTime call initiated successfully', {
        contact: sanitizedContact,
        type: callType
      });
      
      return {
        success: true,
        data: {
          contact: sanitizedContact,
          callType: callType,
          displayName: config.displayName,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      EventLogger.error('FaceTimeExecutor', 'FaceTime call failed:', error as Error);
      return {
        success: false,
        error: `FaceTime call failed: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Sanitizes and validates contact information
   * Supports phone numbers and email addresses
   */
  private sanitizeContact(contact: string): string | null {
    if (!contact || typeof contact !== 'string') {
      return null;
    }
    
    const trimmed = contact.trim();
    
    // Phone number validation and sanitization
    if (this.isPhoneNumber(trimmed)) {
      return this.sanitizePhoneNumber(trimmed);
    }
    
    // Email validation and sanitization
    if (this.isEmail(trimmed)) {
      return SecurityService.sanitizeInput(trimmed, { allowedChars: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ });
    }
    
    return null;
  }
  
  /**
   * Checks if the input looks like a phone number
   */
  private isPhoneNumber(input: string): boolean {
    // Match phone numbers with optional country code, spaces, dashes, parentheses
    const phoneRegex = /^[\+]?[1-9]?[\d\s\-\(\)\.]{6,15}$/;
    return phoneRegex.test(input.replace(/\s/g, ''));
  }
  
  /**
   * Checks if the input looks like an email address
   */
  private isEmail(input: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(input);
  }
  
  /**
   * Sanitizes phone number for FaceTime URL
   */
  private sanitizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except + at the beginning
    let sanitized = phone.replace(/[^\d+]/g, '');
    
    // Ensure + is only at the beginning
    if (sanitized.includes('+')) {
      const parts = sanitized.split('+');
      sanitized = '+' + parts.join('');
    }
    
    // Basic validation - should have at least 7 digits
    const digitCount = sanitized.replace(/\D/g, '').length;
    if (digitCount < 7) {
      return '';
    }
    
    return sanitized;
  }
  
  /**
   * Shows a confirmation dialog to the user
   */
  private showConfirmationDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Call',
            style: 'default',
            onPress: () => resolve(true)
          }
        ]
      );
    });
  }
  
  /**
   * Validates the step configuration
   */
  validateConfig(config: any): string[] {
    const errors: string[] = [];
    
    if (!config.contact) {
      errors.push('Contact is required');
    } else if (typeof config.contact !== 'string' || !config.contact.trim()) {
      errors.push('Contact must be a non-empty string');
    } else {
      const sanitized = this.sanitizeContact(config.contact);
      if (!sanitized) {
        errors.push('Contact must be a valid phone number or email address');
      }
    }
    
    if (config.callType && !['video', 'audio'].includes(config.callType)) {
      errors.push('Call type must be either "video" or "audio"');
    }
    
    if (config.displayName && typeof config.displayName !== 'string') {
      errors.push('Display name must be a string');
    }
    
    return errors;
  }
  
  /**
   * Returns example configuration for documentation
   */
  getExampleConfig(): FaceTimeConfig {
    return {
      contact: '+1234567890',
      callType: 'video',
      displayName: 'John Doe',
      showConfirmation: true,
      confirmationMessage: 'Start video call with John Doe?'
    };
  }
}