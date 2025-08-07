import { Alert, Linking } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

export class OpenUrlExecutor extends BaseExecutor {
  readonly stepType = 'open_url';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const url = this.replaceVariables(step.config.url || '', context.variables || {});
      const openInBrowser = step.config.openInBrowser !== false; // Default to true

      if (!url) {
        throw new Error('URL is required for open_url step');
      }

      // Security validation
      const urlValidation = securityService.validateURL(url);
      if (!urlValidation.isValid) {
        throw new Error(`Invalid URL: ${urlValidation.errors.join(', ')}`);
      }

      const sanitizedUrl = urlValidation.sanitizedInput || url;

      // Additional validation for URL opening
      try {
        const parsedUrl = new URL(sanitizedUrl);
        
        // Only allow certain protocols for security
        const allowedProtocols = ['http:', 'https:', 'tel:', 'sms:', 'mailto:'];
        if (!allowedProtocols.includes(parsedUrl.protocol)) {
          throw new Error(`Protocol ${parsedUrl.protocol} is not allowed for security reasons`);
        }
      } catch (urlError) {
        throw new Error(`Invalid URL format: ${urlError instanceof Error ? urlError.message : 'Unknown error'}`);
      }

      // Check if we can open the URL
      const canOpen = await Linking.canOpenURL(sanitizedUrl);
      if (!canOpen) {
        throw new Error(`Cannot open URL: ${sanitizedUrl}. No app available to handle this URL.`);
      }

      // Open the URL
      await Linking.openURL(sanitizedUrl);

      const result: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'open_url',
          url: sanitizedUrl,
          openInBrowser,
          opened: true,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, result);
      return result;
      
    } catch (error) {
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('URL Open Error', `Could not open URL: ${errorMessage}`);
      
      return this.handleError(error, startTime, 1, 0);
    }
  }
}