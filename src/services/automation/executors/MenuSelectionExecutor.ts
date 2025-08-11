import { Alert, ActionSheetIOS, Platform } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionResult, MenuSelectionStepConfig } from '../../../types';
import { SecurityService } from '../../security/SecurityService';
import { EventLogger } from '../../../utils/EventLogger';
import { VariableManager } from '../../variables/VariableManager';

/**
 * MenuSelectionExecutor provides interactive menu selection for user input
 * 
 * Features:
 * - Cross-platform menu display (ActionSheet on iOS, Alert on Android)
 * - Configurable options with titles, values, and icons
 * - Store selected value in variable
 * - Cancel handling
 * - Input validation and sanitization
 * 
 * Security Notes:
 * - All option titles and values are sanitized
 * - Maximum number of options to prevent UI overflow
 * - Variable names are validated for security
 * - Prevents execution without user interaction
 */
export class MenuSelectionExecutor extends BaseExecutor {
  private readonly MAX_OPTIONS = 20; // Maximum number of menu options
  private readonly MAX_TITLE_LENGTH = 100;
  private readonly MAX_MESSAGE_LENGTH = 500;
  
  async execute(step: AutomationStep): Promise<ExecutionResult> {
    try {
      EventLogger.debug('MenuSelectionExecutor', 'Starting menu selection execution', step.config);
      
      const config = step.config as MenuSelectionStepConfig;
      
      // Validate required configuration
      if (!config.title) {
        return {
          success: false,
          error: 'Menu title is required'
        };
      }
      
      if (!config.options || config.options.length === 0) {
        return {
          success: false,
          error: 'Menu options are required'
        };
      }
      
      if (config.options.length > this.MAX_OPTIONS) {
        return {
          success: false,
          error: `Too many options. Maximum is ${this.MAX_OPTIONS} options`
        };
      }
      
      if (!config.outputVariable) {
        return {
          success: false,
          error: 'Output variable name is required'
        };
      }
      
      // Sanitize inputs
      const sanitizedTitle = SecurityService.sanitizeInput(config.title.substring(0, this.MAX_TITLE_LENGTH));
      const sanitizedMessage = config.message ? 
        SecurityService.sanitizeInput(config.message.substring(0, this.MAX_MESSAGE_LENGTH)) : 
        undefined;
      
      // Sanitize options
      const sanitizedOptions = config.options.map((option, index) => ({
        title: SecurityService.sanitizeInput(option.title || `Option ${index + 1}`),
        value: SecurityService.sanitizeInput(option.value || option.title || `option_${index}`),
        icon: option.icon ? SecurityService.sanitizeInput(option.icon) : undefined
      }));
      
      EventLogger.debug('MenuSelectionExecutor', 'Showing menu selection dialog', {
        title: sanitizedTitle,
        optionsCount: sanitizedOptions.length,
        allowCancel: config.allowCancel
      });
      
      // Show platform-appropriate menu
      let selectedValue: string | null;
      
      if (Platform.OS === 'ios') {
        selectedValue = await this.showIOSActionSheet(
          sanitizedTitle,
          sanitizedMessage,
          sanitizedOptions,
          config.allowCancel !== false
        );
      } else {
        selectedValue = await this.showAndroidAlert(
          sanitizedTitle,
          sanitizedMessage,
          sanitizedOptions,
          config.allowCancel !== false
        );
      }
      
      // Handle cancellation
      if (selectedValue === null) {
        if (config.allowCancel === false) {
          return {
            success: false,
            error: 'Menu selection was cancelled but cancellation is not allowed'
          };
        }
        
        EventLogger.info('MenuSelectionExecutor', 'Menu selection was cancelled by user');
        return {
          success: false,
          error: 'Menu selection cancelled by user'
        };
      }
      
      // Store selected value in variable
      const variableManager = VariableManager.getInstance();
      variableManager.setVariable(config.outputVariable, selectedValue);
      
      // Find the selected option for additional data
      const selectedOption = sanitizedOptions.find(option => option.value === selectedValue);
      
      EventLogger.info('MenuSelectionExecutor', 'Menu selection completed successfully', {
        selectedValue: selectedValue,
        selectedTitle: selectedOption?.title,
        outputVariable: config.outputVariable
      });
      
      return {
        success: true,
        data: {
          selectedValue: selectedValue,
          selectedTitle: selectedOption?.title,
          selectedIcon: selectedOption?.icon,
          outputVariable: config.outputVariable,
          totalOptions: sanitizedOptions.length,
          wasCancelled: false,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      EventLogger.error('MenuSelectionExecutor', 'Menu selection failed:', error as Error);
      return {
        success: false,
        error: `Menu selection failed: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Shows iOS ActionSheet
   */
  private showIOSActionSheet(
    title: string,
    message: string | undefined,
    options: Array<{ title: string; value: string; icon?: string }>,
    allowCancel: boolean
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const optionTitles = options.map(option => option.title);
      
      if (allowCancel) {
        optionTitles.push('Cancel');
      }
      
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: title,
          message: message,
          options: optionTitles,
          cancelButtonIndex: allowCancel ? optionTitles.length - 1 : undefined,
        },
        (buttonIndex) => {
          if (allowCancel && buttonIndex === optionTitles.length - 1) {
            resolve(null); // Cancelled
          } else if (buttonIndex >= 0 && buttonIndex < options.length) {
            resolve(options[buttonIndex].value);
          } else {
            resolve(null); // Invalid selection
          }
        }
      );
    });
  }
  
  /**
   * Shows Android Alert dialog
   */
  private showAndroidAlert(
    title: string,
    message: string | undefined,
    options: Array<{ title: string; value: string; icon?: string }>,
    allowCancel: boolean
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const buttons = options.map(option => ({
        text: option.title,
        onPress: () => resolve(option.value)
      }));
      
      if (allowCancel) {
        buttons.push({
          text: 'Cancel',
          onPress: () => resolve(null),
          style: 'cancel' as any
        });
      }
      
      Alert.alert(
        title,
        message,
        buttons,
        {
          cancelable: allowCancel,
          onDismiss: () => {
            if (allowCancel) {
              resolve(null);
            }
          }
        }
      );
    });
  }
  
  /**
   * Validates the step configuration
   */
  validateConfig(config: any): string[] {
    const errors: string[] = [];
    
    if (!config.title) {
      errors.push('Menu title is required');
    } else if (typeof config.title !== 'string' || !config.title.trim()) {
      errors.push('Menu title must be a non-empty string');
    } else if (config.title.length > this.MAX_TITLE_LENGTH) {
      errors.push(`Menu title too long. Maximum length is ${this.MAX_TITLE_LENGTH} characters`);
    }
    
    if (config.message && typeof config.message !== 'string') {
      errors.push('Menu message must be a string');
    } else if (config.message && config.message.length > this.MAX_MESSAGE_LENGTH) {
      errors.push(`Menu message too long. Maximum length is ${this.MAX_MESSAGE_LENGTH} characters`);
    }
    
    if (!config.options) {
      errors.push('Menu options are required');
    } else if (!Array.isArray(config.options)) {
      errors.push('Menu options must be an array');
    } else {
      if (config.options.length === 0) {
        errors.push('At least one menu option is required');
      } else if (config.options.length > this.MAX_OPTIONS) {
        errors.push(`Too many options. Maximum is ${this.MAX_OPTIONS} options`);
      }
      
      // Validate each option
      config.options.forEach((option: any, index: number) => {
        if (!option || typeof option !== 'object') {
          errors.push(`Option ${index + 1} must be an object`);
        } else {
          if (!option.title) {
            errors.push(`Option ${index + 1} must have a title`);
          } else if (typeof option.title !== 'string') {
            errors.push(`Option ${index + 1} title must be a string`);
          }
          
          if (option.value && typeof option.value !== 'string') {
            errors.push(`Option ${index + 1} value must be a string`);
          }
          
          if (option.icon && typeof option.icon !== 'string') {
            errors.push(`Option ${index + 1} icon must be a string`);
          }
        }
      });
    }
    
    if (!config.outputVariable) {
      errors.push('Output variable name is required');
    } else if (typeof config.outputVariable !== 'string' || !config.outputVariable.trim()) {
      errors.push('Output variable name must be a non-empty string');
    } else if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(config.outputVariable)) {
      errors.push('Output variable name must be a valid identifier');
    }
    
    if (config.allowCancel !== undefined && typeof config.allowCancel !== 'boolean') {
      errors.push('Allow cancel must be a boolean');
    }
    
    return errors;
  }
  
  /**
   * Returns example configuration for documentation
   */
  getExampleConfig(): MenuSelectionStepConfig {
    return {
      title: 'Choose Your Preference',
      message: 'Select one of the following options to continue:',
      options: [
        {
          title: 'High Priority',
          value: 'high',
          icon: 'exclamation-triangle'
        },
        {
          title: 'Medium Priority',
          value: 'medium',
          icon: 'minus-circle'
        },
        {
          title: 'Low Priority',
          value: 'low',
          icon: 'check-circle'
        }
      ],
      outputVariable: 'selectedPriority',
      allowCancel: true
    };
  }
}