import { AutomationData, AutomationStep, ExecutionResult } from '../../types';
import { Logger } from '../../utils/Logger';

/**
 * Web-based automation execution engine for browser environments
 * Executes automations that can run without the mobile app
 */
export class WebAutomationEngine {
  private logger: Logger;
  private variables: Record<string, any> = {};

  constructor() {
    this.logger = new Logger('WebAutomationEngine');
  }

  /**
   * Execute an automation in a web environment
   */
  async execute(
    automationData: AutomationData,
    inputs: Record<string, any> = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let stepsCompleted = 0;

    try {
      this.variables = { ...inputs };
      
      this.logger.info('Starting web automation execution', {
        automationId: automationData.id,
        title: automationData.title,
        stepCount: automationData.steps.length,
      });

      // Filter steps that can run in web environment
      const webCompatibleSteps = this.filterWebCompatibleSteps(automationData.steps);
      
      if (webCompatibleSteps.length === 0) {
        return {
          success: false,
          error: 'No web-compatible steps found in automation',
          executionTime: Date.now() - startTime,
          stepsCompleted: 0,
          totalSteps: automationData.steps.length,
          timestamp: new Date().toISOString(),
        };
      }

      // Execute each compatible step
      for (let i = 0; i < webCompatibleSteps.length; i++) {
        const step = webCompatibleSteps[i];

        if (!step.enabled) {
          this.logger.info(`Skipping disabled step: ${step.title}`);
          continue;
        }

        try {
          this.logger.info(`Executing web step ${i}: ${step.title}`);
          await this.executeWebStep(step);
          stepsCompleted++;
        } catch (stepError) {
          const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error';
          this.logger.error(`Web step ${i} failed: ${step.title}`, { error: errorMessage });

          return {
            success: false,
            error: `Step "${step.title}" failed: ${errorMessage}`,
            executionTime: Date.now() - startTime,
            stepsCompleted,
            totalSteps: webCompatibleSteps.length,
            timestamp: new Date().toISOString(),
            failedStep: i,
          };
        }
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        executionTime,
        stepsCompleted,
        totalSteps: webCompatibleSteps.length,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Web automation execution failed', { error: errorMessage });

      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        stepsCompleted,
        totalSteps: automationData.steps.length,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Filter steps that can be executed in a web environment
   */
  private filterWebCompatibleSteps(steps: AutomationStep[]): AutomationStep[] {
    const webCompatibleTypes = [
      'notification', // Can show as alert
      'sms', // Can open SMS app
      'email', // Can open email client
      'delay', // Simple delay
      'variable', // Variable assignment
      'get_variable', // Variable retrieval
      'text', // Text manipulation
      'math', // Math operations
      'clipboard', // Clipboard operations (with limitations)
      'open_url', // Can open URLs
      'location', // Can get location and open maps
      'app', // Can open some apps via URL schemes
    ];

    return steps.filter(step => webCompatibleTypes.includes(step.type));
  }

  /**
   * Execute a single step in web environment
   */
  private async executeWebStep(step: AutomationStep): Promise<any> {
    const processedConfig = this.processVariableReferences(step.config);
    const processedStep = { ...step, config: processedConfig };

    switch (step.type) {
      case 'notification':
        return this.executeWebNotificationStep(processedStep);
      case 'delay':
        return this.executeWebDelayStep(processedStep);
      case 'variable':
        return this.executeWebVariableStep(processedStep);
      case 'get_variable':
        return this.executeWebGetVariableStep(processedStep);
      case 'text':
        return this.executeWebTextStep(processedStep);
      case 'math':
        return this.executeWebMathStep(processedStep);
      case 'sms':
        return this.executeWebSMSStep(processedStep);
      case 'email':
        return this.executeWebEmailStep(processedStep);
      case 'open_url':
        return this.executeWebOpenUrlStep(processedStep);
      case 'location':
        return this.executeWebLocationStep(processedStep);
      case 'clipboard':
        return this.executeWebClipboardStep(processedStep);
      case 'app':
        return this.executeWebAppStep(processedStep);
      default:
        throw new Error(`Web execution not supported for step type: ${step.type}`);
    }
  }

  private executeWebNotificationStep(step: AutomationStep): Promise<any> {
    const message = step.config.message || 'Web automation notification';
    
    // Show browser notification if supported, otherwise use alert
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(step.config.title || 'Shortcuts Like', {
        body: message,
        icon: '/favicon.ico'
      });
    } else {
      alert(message);
    }

    return Promise.resolve({
      type: 'notification',
      message: message,
      success: true,
    });
  }

  private executeWebDelayStep(step: AutomationStep): Promise<any> {
    const delay = step.config.delay || 1000;
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          type: 'delay',
          delay,
          success: true,
        });
      }, delay);
    });
  }

  private executeWebVariableStep(step: AutomationStep): Promise<any> {
    const variableName = step.config.name;
    const variableValue = step.config.value;

    if (variableName) {
      this.variables[variableName] = variableValue;
    }

    return Promise.resolve({
      type: 'variable',
      name: variableName,
      value: variableValue,
      success: true,
    });
  }

  private executeWebGetVariableStep(step: AutomationStep): Promise<any> {
    const variableName = step.config.name;
    const defaultValue = step.config.defaultValue || '';
    const value = this.variables[variableName] || defaultValue;

    return Promise.resolve({
      type: 'get_variable',
      name: variableName,
      value: value,
      success: true,
    });
  }

  private executeWebTextStep(step: AutomationStep): Promise<any> {
    const { action, text1, text2, separator } = step.config;
    let result = '';

    switch (action) {
      case 'combine':
        result = `${text1 || ''}${separator || ' '}${text2 || ''}`;
        break;
      case 'replace':
        result = (text1 || '').replace(text2 || '', separator || '');
        break;
      case 'format':
        result = (text1 || '').toUpperCase();
        break;
      default:
        result = text1 || '';
    }

    return Promise.resolve({
      type: 'text',
      action,
      result,
      success: true,
    });
  }

  private executeWebMathStep(step: AutomationStep): Promise<any> {
    const { operation, number1, number2 } = step.config;
    const num1 = parseFloat(number1) || 0;
    const num2 = parseFloat(number2) || 0;
    let result = 0;

    switch (operation) {
      case 'add':
        result = num1 + num2;
        break;
      case 'subtract':
        result = num1 - num2;
        break;
      case 'multiply':
        result = num1 * num2;
        break;
      case 'divide':
        result = num2 !== 0 ? num1 / num2 : 0;
        break;
    }

    return Promise.resolve({
      type: 'math',
      operation,
      result,
      success: true,
    });
  }

  private executeWebSMSStep(step: AutomationStep): Promise<any> {
    const phoneNumber = step.config.phoneNumber;
    const message = step.config.message;

    if (!phoneNumber || !message) {
      throw new Error('Phone number and message are required for SMS step');
    }

    // Open SMS app with pre-filled message
    const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, '_self');

    return Promise.resolve({
      type: 'sms',
      phoneNumber,
      message,
      success: true,
    });
  }

  private executeWebEmailStep(step: AutomationStep): Promise<any> {
    const email = step.config.email;
    const subject = step.config.subject || '';
    const message = step.config.message || '';

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailtoUrl, '_self');

    return Promise.resolve({
      type: 'email',
      email,
      subject,
      message,
      success: true,
    });
  }

  private executeWebOpenUrlStep(step: AutomationStep): Promise<any> {
    const url = step.config.url;
    if (!url) {
      throw new Error('URL is required for open URL step');
    }

    window.open(url, '_blank');

    return Promise.resolve({
      type: 'open_url',
      url,
      success: true,
    });
  }

  private async executeWebLocationStep(step: AutomationStep): Promise<any> {
    const action = step.config.action || 'get_current';

    if (action === 'get_current' || action === 'share_location') {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation is not supported by this browser'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            
            if (action === 'share_location' && step.config.phoneNumber) {
              const message = step.config.message || 'My current location';
              const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
              const smsMessage = `${message}\n${locationUrl}`;
              
              // Open SMS with location
              const smsUrl = `sms:${step.config.phoneNumber}?body=${encodeURIComponent(smsMessage)}`;
              window.open(smsUrl, '_self');
            }

            resolve({
              type: 'location',
              action,
              latitude,
              longitude,
              success: true,
            });
          },
          (error) => {
            reject(new Error(`Failed to get location: ${error.message}`));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });
    } else if (action === 'open_maps') {
      let latitude, longitude;

      if (step.config.useCurrentLocation) {
        // Would need to get current location first
        throw new Error('Current location mapping not yet implemented in web');
      } else {
        latitude = step.config.latitude;
        longitude = step.config.longitude;
      }

      if (!latitude || !longitude) {
        throw new Error('No coordinates provided for maps');
      }

      const label = step.config.label || 'Location';
      const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}&label=${encodeURIComponent(label)}`;
      window.open(mapsUrl, '_blank');

      return Promise.resolve({
        type: 'location',
        action: 'open_maps',
        latitude,
        longitude,
        success: true,
      });
    }

    throw new Error(`Unsupported location action: ${action}`);
  }

  private async executeWebClipboardStep(step: AutomationStep): Promise<any> {
    const { action, text } = step.config;
    
    if (action === 'copy') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text || '');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text || '';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      return {
        type: 'clipboard',
        action: 'copy',
        text,
        success: true,
      };
    } else if (action === 'paste') {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        return {
          type: 'clipboard',
          action: 'paste',
          text: clipboardText,
          success: true,
        };
      } else {
        throw new Error('Clipboard reading not supported in this browser');
      }
    }

    throw new Error(`Unsupported clipboard action: ${action}`);
  }

  private executeWebAppStep(step: AutomationStep): Promise<any> {
    const { appName, url } = step.config;
    let targetUrl = url;

    // If no URL provided, try common app URL schemes
    if (!targetUrl) {
      const commonApps: Record<string, string> = {
        'whatsapp': 'https://web.whatsapp.com/',
        'telegram': 'https://web.telegram.org/',
        'twitter': 'https://twitter.com/',
        'facebook': 'https://facebook.com/',
        'instagram': 'https://instagram.com/',
        'youtube': 'https://youtube.com/',
        'gmail': 'https://gmail.com/',
        'maps': 'https://maps.google.com/',
      };
      
      targetUrl = commonApps[appName.toLowerCase()] || `https://${appName.toLowerCase()}.com/`;
    }

    window.open(targetUrl, '_blank');

    return Promise.resolve({
      type: 'app',
      appName,
      url: targetUrl,
      success: true,
    });
  }

  /**
   * Process variable references in configuration
   */
  private processVariableReferences(config: Record<string, any>): Record<string, any> {
    const processedConfig = { ...config };
    
    for (const [key, value] of Object.entries(processedConfig)) {
      if (typeof value === 'string' && value.includes('{{')) {
        let processedValue = value;
        const variableMatches = value.match(/\{\{([^}]+)\}\}/g);
        
        if (variableMatches) {
          for (const match of variableMatches) {
            const variableName = match.slice(2, -2).trim();
            const variableValue = this.variables[variableName] || '';
            processedValue = processedValue.replace(match, String(variableValue));
          }
        }
        
        processedConfig[key] = processedValue;
      }
    }
    
    return processedConfig;
  }

  /**
   * Check if automation can run in web environment
   */
  static canExecuteInWeb(automation: AutomationData): boolean {
    const webCompatibleTypes = [
      'notification', 'sms', 'email', 'delay', 'variable', 'get_variable',
      'text', 'math', 'clipboard', 'open_url', 'location', 'app'
    ];

    return automation.steps.some(step => 
      step.enabled && webCompatibleTypes.includes(step.type)
    );
  }

  /**
   * Get steps that cannot run in web environment
   */
  static getIncompatibleSteps(automation: AutomationData): AutomationStep[] {
    const webCompatibleTypes = [
      'notification', 'sms', 'email', 'delay', 'variable', 'get_variable',
      'text', 'math', 'clipboard', 'open_url', 'location', 'app'
    ];

    return automation.steps.filter(step => 
      step.enabled && !webCompatibleTypes.includes(step.type)
    );
  }
}

// Export singleton instance
export const webAutomationEngine = new WebAutomationEngine();