import { Share, Alert } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

export class ShareTextExecutor extends BaseExecutor {
  readonly stepType = 'share_text';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const text = this.replaceVariables(step.config.text || '', context.variables || {});
      const title = this.replaceVariables(step.config.title || 'Share', context.variables || {});
      const url = this.replaceVariables(step.config.url || '', context.variables || {});

      if (!text && !url) {
        throw new Error('Either text or URL is required for share_text step');
      }

      // Security validation
      let sanitizedText = '';
      let sanitizedTitle = title;
      let sanitizedUrl = '';

      if (text) {
        const textValidation = securityService.sanitizeTextInput(text, 10000);
        if (!textValidation.isValid) {
          throw new Error(`Invalid text to share: ${textValidation.errors.join(', ')}`);
        }
        sanitizedText = textValidation.sanitizedInput || text;
      }

      if (title) {
        const titleValidation = securityService.sanitizeTextInput(title, 200);
        sanitizedTitle = titleValidation.sanitizedInput || title;
      }

      if (url) {
        const urlValidation = securityService.validateURL(url);
        if (!urlValidation.isValid) {
          throw new Error(`Invalid URL to share: ${urlValidation.errors.join(', ')}`);
        }
        sanitizedUrl = urlValidation.sanitizedInput || url;
      }

      // Prepare share content
      const shareContent: {
        title?: string;
        message?: string;
        url?: string;
      } = {};

      if (sanitizedTitle) {
        shareContent.title = sanitizedTitle;
      }

      if (sanitizedText) {
        shareContent.message = sanitizedText;
      }

      if (sanitizedUrl) {
        shareContent.url = sanitizedUrl;
      }

      // If we have both text and URL, combine them
      if (sanitizedText && sanitizedUrl) {
        shareContent.message = `${sanitizedText}\n\n${sanitizedUrl}`;
        delete shareContent.url; // Use message instead to avoid duplication
      } else if (sanitizedUrl && !sanitizedText) {
        shareContent.message = sanitizedUrl;
        delete shareContent.url;
      }

      // Share the content
      const shareResult = await Share.share(shareContent);

      let shareStatus = 'unknown';
      if (shareResult.action === Share.sharedAction) {
        shareStatus = 'shared';
      } else if (shareResult.action === Share.dismissedAction) {
        shareStatus = 'dismissed';
      }

      const result: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'share_text',
          title: sanitizedTitle,
          text: sanitizedText,
          url: sanitizedUrl,
          shareStatus,
          shareResult,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, result);
      return result;
      
    } catch (error) {
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Share Error', `Could not share content: ${errorMessage}`);
      
      return this.handleError(error, startTime, 1, 0);
    }
  }
}