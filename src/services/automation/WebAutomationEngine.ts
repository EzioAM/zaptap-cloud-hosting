import { AutomationData, AutomationStep } from '../../types';
import { EventLogger } from '../../utils/EventLogger';

export interface WebExecutionResult {
  success: boolean;
  error?: string;
  stepResults: any[];
  incompatibleSteps: string[];
}

export interface WebStepExecutor {
  canExecute(step: AutomationStep): boolean;
  execute(step: AutomationStep, context: any): Promise<any>;
}

export class WebAutomationEngine {
  private stepExecutors: Map<string, WebStepExecutor> = new Map();
  private variables: Map<string, any> = new Map();

  constructor() {
    this.registerDefaultExecutors();
  }

  private registerDefaultExecutors() {
    // SMS Step Executor
    this.stepExecutors.set('sms', {
      canExecute: (step) => !!(step.config.phoneNumber),
      execute: async (step, context) => {
        const { phoneNumber, message } = step.config;
        const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message || '')}`;
        window.open(smsUrl);
        return { success: true, action: 'sms_opened', phoneNumber, message };
      }
    });

    // Call Step Executor
    this.stepExecutors.set('call', {
      canExecute: (step) => !!(step.config.phoneNumber),
      execute: async (step, context) => {
        const { phoneNumber } = step.config;
        const telUrl = `tel:${phoneNumber}`;
        window.open(telUrl);
        return { success: true, action: 'call_initiated', phoneNumber };
      }
    });

    // Email Step Executor
    this.stepExecutors.set('email', {
      canExecute: (step) => !!(step.config.recipient),
      execute: async (step, context) => {
        const { recipient, subject, body } = step.config;
        const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body || '')}`;
        window.open(mailtoUrl);
        return { success: true, action: 'email_opened', recipient, subject };
      }
    });

    // URL Step Executor
    this.stepExecutors.set('open_url', {
      canExecute: (step) => !!(step.config.url),
      execute: async (step, context) => {
        const { url, openInNewTab = true } = step.config;
        if (openInNewTab) {
          window.open(url, '_blank');
        } else {
          window.location.href = url;
        }
        return { success: true, action: 'url_opened', url };
      }
    });

    // App Step Executor (limited web support)
    this.stepExecutors.set('app', {
      canExecute: (step) => {
        const { url, appName } = step.config;
        return !!(url || (appName && this.getAppUrl(appName)));
      },
      execute: async (step, context) => {
        const { url, appName } = step.config;
        const targetUrl = url || this.getAppUrl(appName);
        if (targetUrl) {
          window.open(targetUrl);
          return { success: true, action: 'app_opened', url: targetUrl, appName };
        }
        throw new Error(`Cannot open app: ${appName}`);
      }
    });

    // Location Step Executor
    this.stepExecutors.set('location', {
      canExecute: (step) => 'geolocation' in navigator,
      execute: async (step, context) => {
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const { action, phoneNumber, message } = step.config;
              
              if (action === 'share_location' && phoneNumber) {
                const locationMessage = `${message || 'My location'}: https://maps.google.com/?q=${latitude},${longitude}`;
                const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(locationMessage)}`;
                window.open(smsUrl);
              }
              
              resolve({ 
                success: true, 
                action: 'location_obtained', 
                latitude, 
                longitude,
                shared: !!(action === 'share_location' && phoneNumber)
              });
            },
            (error) => {
              reject(new Error(`Location error: ${error.message}`));
            },
            { timeout: 10000, enableHighAccuracy: true }
          );
        });
      }
    });

    // Notification/Display Step Executor
    this.stepExecutors.set('notification', {
      canExecute: () => true,
      execute: async (step, context) => {
        const { title, message } = step.config;
        const displayMessage = `${title ? title + '\n' : ''}${message || ''}`;
        
        // Try browser notification first
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title || 'Automation', { body: message });
        } else {
          // Fallback to alert
          alert(displayMessage);
        }
        
        return { success: true, action: 'notification_shown', title, message };
      }
    });

    // Delay Step Executor
    this.stepExecutors.set('delay', {
      canExecute: () => true,
      execute: async (step, context) => {
        const { duration = 1000 } = step.config;
        await new Promise(resolve => setTimeout(resolve, duration));
        return { success: true, action: 'delay_completed', duration };
      }
    });

    // Variable Step Executor
    this.stepExecutors.set('variable', {
      canExecute: () => true,
      execute: async (step, context) => {
        const { name, value } = step.config;
        this.variables.set(name, value);
        return { success: true, action: 'variable_set', name, value };
      }
    });

    // Get Variable Step Executor
    this.stepExecutors.set('get_variable', {
      canExecute: () => true,
      execute: async (step, context) => {
        const { name } = step.config;
        const value = this.variables.get(name);
        return { success: true, action: 'variable_retrieved', name, value };
      }
    });

    // Text Step Executor
    this.stepExecutors.set('text', {
      canExecute: () => true,
      execute: async (step, context) => {
        const { text, action = 'display' } = step.config;
        
        if (action === 'copy' && navigator.clipboard) {
          await navigator.clipboard.writeText(text);
          return { success: true, action: 'text_copied', text };
        } else {
          alert(text);
          return { success: true, action: 'text_displayed', text };
        }
      }
    });

    // Clipboard Step Executor
    this.stepExecutors.set('clipboard', {
      canExecute: () => 'clipboard' in navigator,
      execute: async (step, context) => {
        const { action, text } = step.config;
        
        if (action === 'copy' && text) {
          await navigator.clipboard.writeText(text);
          return { success: true, action: 'clipboard_copied', text };
        } else if (action === 'get') {
          const clipboardText = await navigator.clipboard.readText();
          return { success: true, action: 'clipboard_read', text: clipboardText };
        }
        
        throw new Error(`Unsupported clipboard action: ${action}`);
      }
    });

    // Math Step Executor
    this.stepExecutors.set('math', {
      canExecute: () => true,
      execute: async (step, context) => {
        const { operation, operand1, operand2, variable } = step.config;
        let result: number;
        
        switch (operation) {
          case 'add':
            result = Number(operand1) + Number(operand2);
            break;
          case 'subtract':
            result = Number(operand1) - Number(operand2);
            break;
          case 'multiply':
            result = Number(operand1) * Number(operand2);
            break;
          case 'divide':
            result = Number(operand1) / Number(operand2);
            break;
          default:
            throw new Error(`Unsupported math operation: ${operation}`);
        }
        
        if (variable) {
          this.variables.set(variable, result);
        }
        
        return { success: true, action: 'math_calculated', operation, result };
      }
    });
  }

  private getAppUrl(appName: string): string | null {
    const appUrls: Record<string, string> = {
      'phone': 'tel:',
      'messages': 'sms:',
      'mail': 'mailto:',
      'maps': 'https://maps.google.com',
      'calendar': 'https://calendar.google.com',
      'contacts': 'https://contacts.google.com',
      'notes': 'https://keep.google.com',
      'photos': 'https://photos.google.com',
      'drive': 'https://drive.google.com',
      'youtube': 'https://youtube.com',
      'twitter': 'https://twitter.com',
      'facebook': 'https://facebook.com',
      'instagram': 'https://instagram.com',
      'linkedin': 'https://linkedin.com',
      'github': 'https://github.com',
      'spotify': 'https://open.spotify.com',
      'netflix': 'https://netflix.com',
      'whatsapp': 'https://web.whatsapp.com',
      'telegram': 'https://web.telegram.org',
      'discord': 'https://discord.com/app',
      'slack': 'https://app.slack.com'
    };

    return appUrls[appName.toLowerCase()] || null;
  }

  async execute(automation: AutomationData): Promise<WebExecutionResult> {
    const result: WebExecutionResult = {
      success: true,
      stepResults: [],
      incompatibleSteps: []
    };

    console.log(`🚀 Starting web execution of "${automation.title}"`);

    for (const step of automation.steps) {
      if (!step.enabled) {
        EventLogger.debug('Automation', '⏭️ Skipping disabled step: ${step.title}');
        continue;
      }

      const executor = this.stepExecutors.get(step.type);
      
      if (!executor) {
        EventLogger.warn('Automation', '❌ No executor found for step type: ${step.type}');
        result.incompatibleSteps.push(step.type);
        result.stepResults.push({
          stepId: step.id,
          success: false,
          error: `Unsupported step type: ${step.type}`
        });
        continue;
      }

      if (!executor.canExecute(step)) {
        EventLogger.warn('Automation', '❌ Step cannot be executed in web: ${step.title}');
        result.incompatibleSteps.push(step.type);
        result.stepResults.push({
          stepId: step.id,
          success: false,
          error: 'Step not compatible with web execution'
        });
        continue;
      }

      try {
        EventLogger.debug('Automation', '▶️ Executing step: ${step.title} (${step.type})');
        const stepResult = await executor.execute(step, { variables: this.variables });
        
        result.stepResults.push({
          stepId: step.id,
          success: true,
          result: stepResult
        });
        
        EventLogger.debug('Automation', '✅ Step completed: ${step.title}');
      } catch (error: any) {
        EventLogger.error('Automation', '❌ Step failed: ${step.title}', error as Error);
        result.stepResults.push({
          stepId: step.id,
          success: false,
          error: error.message
        });
        
        // Continue with other steps instead of failing entirely
        result.success = false;
      }
    }

    EventLogger.debug('Automation', '🏁 Web execution completed. Success: ${result.success}');
    return result;
  }

  getIncompatibleSteps(automation: AutomationData): AutomationStep[] {
    return automation.steps.filter(step => {
      if (!step.enabled) return false;
      
      const executor = this.stepExecutors.get(step.type);
      return !executor || !executor.canExecute(step);
    });
  }

  canExecute(automation: AutomationData): boolean {
    const enabledSteps = automation.steps.filter(step => step.enabled);
    const compatibleSteps = enabledSteps.filter(step => {
      const executor = this.stepExecutors.get(step.type);
      return executor && executor.canExecute(step);
    });

    return compatibleSteps.length > 0;
  }

  requestPermissions(): Promise<boolean> {
    return new Promise((resolve) => {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          resolve(permission === 'granted');
        });
      } else {
        resolve(true);
      }
    });
  }
}

// Global instance for web pages
(window as any).WebAutomationEngine = WebAutomationEngine;