import { Linking, Alert } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionResult } from '../../../types';
import { SecurityService } from '../../security/SecurityService';
import { EventLogger } from '../../../utils/EventLogger';

export interface CallConfig {
  /** Phone number to call */
  phoneNumber: string;
  /** Optional display name for the contact */
  displayName?: string;
  /** Whether to show confirmation dialog before calling */
  showConfirmation?: boolean;
  /** Custom message for confirmation dialog */
  confirmationMessage?: string;
}

/**
 * CallExecutor handles initiating phone calls through URL schemes
 * 
 * Features:
 * - Phone number validation and sanitization
 * - Confirmation dialogs for safety
 * - Support for various phone number formats
 * - Secure handling of contact information
 * 
 * URL Scheme: tel:${phoneNumber}
 */
export class CallExecutor extends BaseExecutor {
  async execute(step: AutomationStep): Promise<ExecutionResult> {
    try {
      EventLogger.debug('CallExecutor', 'Starting phone call execution', step.config);
      
      const config = step.config as CallConfig;
      
      // Validate required configuration
      if (!config.phoneNumber) {
        return {
          success: false,
          error: 'Phone number is required for making calls'
        };
      }
      
      // Sanitize and validate phone number
      const sanitizedPhone = this.sanitizePhoneNumber(config.phoneNumber);
      if (!sanitizedPhone) {
        return {
          success: false,
          error: 'Invalid phone number format. Please provide a valid phone number.'
        };
      }
      
      // Build phone call URL
      const phoneUrl = `tel:${sanitizedPhone}`;
      
      EventLogger.debug('CallExecutor', 'Generated phone URL', { 
        url: phoneUrl, 
        contact: sanitizedPhone 
      });
      
      // Check if phone URL can be opened
      const canOpenURL = await Linking.canOpenURL(phoneUrl);
      if (!canOpenURL) {
        return {
          success: false,
          error: 'Phone calls are not supported on this device'
        };
      }
      
      // Show confirmation dialog if requested
      if (config.showConfirmation !== false) { // Default to true
        const displayName = config.displayName || sanitizedPhone;
        const message = config.confirmationMessage || 
          `Do you want to call ${displayName}?`;
        
        const confirmed = await this.showConfirmationDialog('Make Phone Call', message);
        if (!confirmed) {
          return {
            success: false,
            error: 'Phone call cancelled by user'
          };
        }
      }
      
      // Initiate the phone call
      await Linking.openURL(phoneUrl);
      
      EventLogger.info('CallExecutor', 'Phone call initiated successfully', {
        contact: sanitizedPhone
      });
      
      return {
        success: true,
        data: {
          phoneNumber: sanitizedPhone,
          displayName: config.displayName,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      EventLogger.error('CallExecutor', 'Phone call failed:', error as Error);
      return {
        success: false,
        error: `Phone call failed: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Sanitizes phone number for tel: URL scheme
   */
  private sanitizePhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') {
      return null;
    }
    
    // Remove all non-digit characters except + at the beginning
    let sanitized = phone.trim().replace(/[^\d+]/g, '');
    
    // Ensure + is only at the beginning
    if (sanitized.includes('+')) {
      const parts = sanitized.split('+');
      sanitized = '+' + parts.join('');
    }
    
    // Basic validation - should have at least 7 digits
    const digitCount = sanitized.replace(/\D/g, '').length;
    if (digitCount < 7 || digitCount > 15) {
      return null;
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
    
    if (!config.phoneNumber) {
      errors.push('Phone number is required');
    } else if (typeof config.phoneNumber !== 'string' || !config.phoneNumber.trim()) {
      errors.push('Phone number must be a non-empty string');
    } else {
      const sanitized = this.sanitizePhoneNumber(config.phoneNumber);
      if (!sanitized) {
        errors.push('Phone number must be a valid format (7-15 digits, optional country code)');
      }
    }
    
    if (config.displayName && typeof config.displayName !== 'string') {
      errors.push('Display name must be a string');
    }
    
    return errors;
  }
  
  /**
   * Returns example configuration for documentation
   */
  getExampleConfig(): CallConfig {
    return {
      phoneNumber: '+1234567890',
      displayName: 'John Doe',
      showConfirmation: true,
      confirmationMessage: 'Call John Doe?'
    };
  }
}