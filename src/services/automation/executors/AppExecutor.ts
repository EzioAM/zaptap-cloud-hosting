import { Alert, Linking } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

export class AppExecutor extends BaseExecutor {
  readonly stepType = 'app';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const appName = this.replaceVariables(step.config.appName || '', context.variables || {});
      const customUrl = this.replaceVariables(step.config.url || '', context.variables || {});

      if (!appName && !customUrl) {
        throw new Error('App name or custom URL is required');
      }

      // Security validation for app name and URL
      if (appName) {
        const appNameValidation = securityService.sanitizeTextInput(appName, 100);
        if (!appNameValidation.isValid) {
          throw new Error(`Invalid app name: ${appNameValidation.errors.join(', ')}`);
        }
      }

      let targetUrl = customUrl;

      // If no URL provided, try common app URL schemes
      if (!targetUrl && appName) {
        const sanitizedAppName = appName.toLowerCase().replace(/[^a-z0-9\-]/g, '');
        
        const commonApps: Record<string, string> = {
          'settings': 'app-settings:',
          'camera': 'camera:',
          'photos': 'photos-redirect:',
          'mail': 'message:',
          'messages': 'sms:',
          'phone': 'tel:',
          'contacts': 'contacts:',
          'calendar': 'calshow:',
          'maps': 'maps:',
          'safari': 'x-web-search:',
          'music': 'music:',
          'appstore': 'itms-apps:',
          'facetime': 'facetime:',
          'notes': 'mobilenotes:',
          'reminders': 'x-apple-reminderkit:',
          'weather': 'weather:',
          'clock': 'clock-worldclock:',
          'wallet': 'shoebox:',
          'health': 'x-apple-health:',
          'shortcuts': 'shortcuts:',
        };

        targetUrl = commonApps[sanitizedAppName] || `${sanitizedAppName}://`;
      }

      if (!targetUrl) {
        throw new Error('Could not determine app URL');
      }

      // Validate the target URL
      try {
        const url = new URL(targetUrl);
        // Only allow certain protocols for security
        const allowedProtocols = [
          'http:', 'https:', 'tel:', 'sms:', 'mailto:', 'maps:', 'app-settings:',
          'camera:', 'photos-redirect:', 'message:', 'contacts:', 'calshow:',
          'x-web-search:', 'music:', 'itms-apps:', 'facetime:', 'mobilenotes:',
          'x-apple-reminderkit:', 'weather:', 'clock-worldclock:', 'shoebox:',
          'x-apple-health:', 'shortcuts:'
        ];
        
        if (!allowedProtocols.includes(url.protocol)) {
          throw new Error(`Protocol ${url.protocol} is not allowed for security reasons`);
        }
      } catch (urlError) {
        // If it's not a valid URL, it might be a custom scheme
        if (!targetUrl.includes('://')) {
          throw new Error('Invalid URL format');
        }
      }

      // Check if we can open the URL
      const canOpen = await Linking.canOpenURL(targetUrl);
      if (!canOpen) {
        throw new Error(`Cannot open app: ${appName || 'Unknown'}. App may not be installed.`);
      }

      // Open the app
      await Linking.openURL(targetUrl);

      const executionResult: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'app',
          appName: appName || 'Custom URL',
          url: targetUrl,
          opened: true,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, executionResult);
      return executionResult;
      
    } catch (error) {
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('App Launch Error', `Could not open ${step.config.appName || 'app'}: ${errorMessage}`);
      
      return this.handleError(error, startTime, 1, 0);
    }
  }
}