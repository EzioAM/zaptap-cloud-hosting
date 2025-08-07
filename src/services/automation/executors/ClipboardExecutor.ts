import * as Clipboard from 'expo-clipboard';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

export class ClipboardExecutor extends BaseExecutor {
  readonly stepType = 'clipboard';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const action = step.config.action;
      const variableName = step.config.variableName || 'clipboardResult';

      if (!['copy', 'paste'].includes(action)) {
        throw new Error('Clipboard action must be "copy" or "paste"');
      }

      let result: string = '';

      if (action === 'copy') {
        const text = this.replaceVariables(step.config.text || '', context.variables || {});
        
        if (!text) {
          throw new Error('Text is required for copy action');
        }

        // Security validation
        const textValidation = securityService.sanitizeTextInput(text, 10000);
        if (!textValidation.isValid) {
          throw new Error(`Invalid text for clipboard: ${textValidation.errors.join(', ')}`);
        }

        const sanitizedText = textValidation.sanitizedInput || text;
        await Clipboard.setStringAsync(sanitizedText);
        result = sanitizedText;

        // Store in variables if specified
        if (variableName && context.variables) {
          context.variables[variableName] = sanitizedText;
        }

      } else if (action === 'paste') {
        const clipboardText = await Clipboard.getStringAsync();
        
        // Security validation of clipboard content
        const clipboardValidation = securityService.sanitizeTextInput(clipboardText, 10000);
        const sanitizedClipboard = clipboardValidation.sanitizedInput || clipboardText;
        
        result = sanitizedClipboard;

        // Store in variables if specified
        if (variableName && context.variables) {
          context.variables[variableName] = sanitizedClipboard;
        }

        // Log warnings if clipboard content was sanitized
        if (clipboardValidation.warnings.length > 0) {
          const logger = this.createLogger();
          logger.warn('Clipboard content sanitized', { warnings: clipboardValidation.warnings });
        }
      }

      const executionResult: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'clipboard',
          action,
          text: result,
          textLength: result.length,
          variableName,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, executionResult);
      return executionResult;
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }

  private createLogger() {
    // Helper method to create logger since it's not directly accessible
    const { Logger } = require('../../../utils/Logger');
    return new Logger(this.stepType);
  }
}