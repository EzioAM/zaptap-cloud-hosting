import type { 
  StepType, 
  StepConfig,
  NotificationStepConfig,
  SMSStepConfig,
  EmailStepConfig,
  WebhookStepConfig,
  DelayStepConfig,
  VariableStepConfig,
  GetVariableStepConfig,
  PromptInputStepConfig,
  LocationStepConfig,
  ConditionStepConfig,
  LoopStepConfig,
  TextStepConfig,
  MathStepConfig,
  PhotoStepConfig,
  ClipboardStepConfig,
  AppStepConfig,
  ValidationError
} from '../../types';

/**
 * Type guards and validation for step configurations
 */
export class StepValidation {
  
  static validateStepConfig(stepType: StepType, config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    switch (stepType) {
      case 'notification':
        return this.validateNotificationConfig(config);
      case 'sms':
        return this.validateSMSConfig(config);
      case 'email':
        return this.validateEmailConfig(config);
      case 'webhook':
        return this.validateWebhookConfig(config);
      case 'delay':
        return this.validateDelayConfig(config);
      case 'variable':
        return this.validateVariableConfig(config);
      case 'get_variable':
        return this.validateGetVariableConfig(config);
      case 'prompt_input':
        return this.validatePromptInputConfig(config);
      case 'location':
        return this.validateLocationConfig(config);
      case 'condition':
        return this.validateConditionConfig(config);
      case 'loop':
        return this.validateLoopConfig(config);
      case 'text':
        return this.validateTextConfig(config);
      case 'math':
        return this.validateMathConfig(config);
      case 'photo':
        return this.validatePhotoConfig(config);
      case 'clipboard':
        return this.validateClipboardConfig(config);
      case 'app':
        return this.validateAppConfig(config);
      default:
        errors.push({
          field: 'type',
          message: `Unknown step type: ${stepType}`,
          value: stepType
        });
    }
    
    return errors;
  }

  static validateNotificationConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.message || typeof config.message !== 'string') {
      errors.push({
        field: 'message',
        message: 'Message is required and must be a string',
        value: config.message
      });
    }
    
    return errors;
  }

  static validateSMSConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.phoneNumber || typeof config.phoneNumber !== 'string') {
      errors.push({
        field: 'phoneNumber',
        message: 'Phone number is required and must be a string',
        value: config.phoneNumber
      });
    }
    
    if (!config.message || typeof config.message !== 'string') {
      errors.push({
        field: 'message',
        message: 'Message is required and must be a string',
        value: config.message
      });
    }
    
    return errors;
  }

  static validateEmailConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.email || typeof config.email !== 'string') {
      errors.push({
        field: 'email',
        message: 'Email is required and must be a string',
        value: config.email
      });
    } else if (!this.isValidEmail(config.email)) {
      errors.push({
        field: 'email',
        message: 'Email must be a valid email address',
        value: config.email
      });
    }
    
    if (!config.subject || typeof config.subject !== 'string') {
      errors.push({
        field: 'subject',
        message: 'Subject is required and must be a string',
        value: config.subject
      });
    }
    
    if (!config.message || typeof config.message !== 'string') {
      errors.push({
        field: 'message',
        message: 'Message is required and must be a string',
        value: config.message
      });
    }
    
    return errors;
  }

  static validateWebhookConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.url || typeof config.url !== 'string') {
      errors.push({
        field: 'url',
        message: 'URL is required and must be a string',
        value: config.url
      });
    } else if (!this.isValidUrl(config.url)) {
      errors.push({
        field: 'url',
        message: 'URL must be a valid HTTP/HTTPS URL',
        value: config.url
      });
    }
    
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE'];
    if (!config.method || !validMethods.includes(config.method)) {
      errors.push({
        field: 'method',
        message: 'Method must be one of: GET, POST, PUT, DELETE',
        value: config.method
      });
    }
    
    return errors;
  }

  static validateDelayConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (typeof config.delay !== 'number' || config.delay < 0) {
      errors.push({
        field: 'delay',
        message: 'Delay must be a positive number (milliseconds)',
        value: config.delay
      });
    }
    
    return errors;
  }

  static validateVariableConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.name || typeof config.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Variable name is required and must be a string',
        value: config.name
      });
    }
    
    if (config.value === undefined || config.value === null) {
      errors.push({
        field: 'value',
        message: 'Variable value is required',
        value: config.value
      });
    }
    
    return errors;
  }

  static validateGetVariableConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.name || typeof config.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Variable name is required and must be a string',
        value: config.name
      });
    }
    
    return errors;
  }

  static validatePromptInputConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.title || typeof config.title !== 'string') {
      errors.push({
        field: 'title',
        message: 'Title is required and must be a string',
        value: config.title
      });
    }
    
    if (!config.message || typeof config.message !== 'string') {
      errors.push({
        field: 'message',
        message: 'Message is required and must be a string',
        value: config.message
      });
    }
    
    if (!config.variableName || typeof config.variableName !== 'string') {
      errors.push({
        field: 'variableName',
        message: 'Variable name is required and must be a string',
        value: config.variableName
      });
    }
    
    return errors;
  }

  static validateLocationConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const validActions = ['get_current', 'share_location', 'open_maps'];
    if (!config.action || !validActions.includes(config.action)) {
      errors.push({
        field: 'action',
        message: 'Action must be one of: get_current, share_location, open_maps',
        value: config.action
      });
    }
    
    // Validate coordinates for open_maps action when not using current location
    if (config.action === 'open_maps' && !config.useCurrentLocation) {
      if (typeof config.latitude !== 'number') {
        errors.push({
          field: 'latitude',
          message: 'Latitude must be a number',
          value: config.latitude
        });
      }
      
      if (typeof config.longitude !== 'number') {
        errors.push({
          field: 'longitude',
          message: 'Longitude must be a number',
          value: config.longitude
        });
      }
    }
    
    return errors;
  }

  static validateConditionConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.variable || typeof config.variable !== 'string') {
      errors.push({
        field: 'variable',
        message: 'Variable name is required and must be a string',
        value: config.variable
      });
    }
    
    const validConditions = ['equals', 'contains', 'greater', 'less'];
    if (!config.condition || !validConditions.includes(config.condition)) {
      errors.push({
        field: 'condition',
        message: 'Condition must be one of: equals, contains, greater, less',
        value: config.condition
      });
    }
    
    if (config.value === undefined || config.value === null) {
      errors.push({
        field: 'value',
        message: 'Comparison value is required',
        value: config.value
      });
    }
    
    return errors;
  }

  static validateLoopConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const validTypes = ['count', 'while', 'foreach'];
    if (!config.type || !validTypes.includes(config.type)) {
      errors.push({
        field: 'type',
        message: 'Loop type must be one of: count, while, foreach',
        value: config.type
      });
    }
    
    if (config.type === 'count' && (typeof config.count !== 'number' || config.count <= 0)) {
      errors.push({
        field: 'count',
        message: 'Count must be a positive number',
        value: config.count
      });
    }
    
    return errors;
  }

  static validateTextConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const validActions = ['combine', 'replace', 'format'];
    if (!config.action || !validActions.includes(config.action)) {
      errors.push({
        field: 'action',
        message: 'Text action must be one of: combine, replace, format',
        value: config.action
      });
    }
    
    if (!config.text1 || typeof config.text1 !== 'string') {
      errors.push({
        field: 'text1',
        message: 'Text1 is required and must be a string',
        value: config.text1
      });
    }
    
    return errors;
  }

  static validateMathConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const validOperations = ['add', 'subtract', 'multiply', 'divide'];
    if (!config.operation || !validOperations.includes(config.operation)) {
      errors.push({
        field: 'operation',
        message: 'Operation must be one of: add, subtract, multiply, divide',
        value: config.operation
      });
    }
    
    if (typeof config.number1 !== 'number') {
      errors.push({
        field: 'number1',
        message: 'Number1 must be a number',
        value: config.number1
      });
    }
    
    if (typeof config.number2 !== 'number') {
      errors.push({
        field: 'number2',
        message: 'Number2 must be a number',
        value: config.number2
      });
    }
    
    if (config.operation === 'divide' && config.number2 === 0) {
      errors.push({
        field: 'number2',
        message: 'Cannot divide by zero',
        value: config.number2
      });
    }
    
    return errors;
  }

  static validatePhotoConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const validActions = ['take', 'select'];
    if (!config.action || !validActions.includes(config.action)) {
      errors.push({
        field: 'action',
        message: 'Photo action must be one of: take, select',
        value: config.action
      });
    }
    
    return errors;
  }

  static validateClipboardConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const validActions = ['copy', 'paste'];
    if (!config.action || !validActions.includes(config.action)) {
      errors.push({
        field: 'action',
        message: 'Clipboard action must be one of: copy, paste',
        value: config.action
      });
    }
    
    if (config.action === 'copy' && (!config.text || typeof config.text !== 'string')) {
      errors.push({
        field: 'text',
        message: 'Text is required for copy action and must be a string',
        value: config.text
      });
    }
    
    return errors;
  }

  static validateAppConfig(config: any): ValidationError[] {
    const errors: ValidationError[] = [];
    
    if (!config.appName || typeof config.appName !== 'string') {
      errors.push({
        field: 'appName',
        message: 'App name is required and must be a string',
        value: config.appName
      });
    }
    
    return errors;
  }

  // Helper methods
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
}