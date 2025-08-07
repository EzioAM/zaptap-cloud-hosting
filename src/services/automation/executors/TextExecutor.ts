import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

export class TextExecutor extends BaseExecutor {
  readonly stepType = 'text';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const action = step.config.action || 'combine';
      const text1 = this.replaceVariables(step.config.text1 || '', context.variables || {});
      const text2 = this.replaceVariables(step.config.text2 || '', context.variables || {});
      const separator = this.replaceVariables(step.config.separator || ' ', context.variables || {});
      const variableName = step.config.variableName || 'textResult';

      // Security validation
      const text1Validation = securityService.sanitizeTextInput(text1, 10000);
      const text2Validation = securityService.sanitizeTextInput(text2, 10000);
      const separatorValidation = securityService.sanitizeTextInput(separator, 100);

      const sanitizedText1 = text1Validation.sanitizedInput || text1;
      const sanitizedText2 = text2Validation.sanitizedInput || text2;
      const sanitizedSeparator = separatorValidation.sanitizedInput || separator;

      let result = '';

      switch (action) {
        case 'combine':
          result = `${sanitizedText1}${sanitizedSeparator}${sanitizedText2}`;
          break;
        case 'replace':
          if (!sanitizedText2) {
            throw new Error('Search text is required for replace action');
          }
          result = sanitizedText1.replace(new RegExp(sanitizedText2, 'g'), sanitizedSeparator);
          break;
        case 'uppercase':
          result = sanitizedText1.toUpperCase();
          break;
        case 'lowercase':
          result = sanitizedText1.toLowerCase();
          break;
        case 'trim':
          result = sanitizedText1.trim();
          break;
        case 'substring':
          const start = parseInt(sanitizedText2) || 0;
          const end = parseInt(sanitizedSeparator) || sanitizedText1.length;
          result = sanitizedText1.substring(start, end);
          break;
        case 'length':
          result = sanitizedText1.length.toString();
          break;
        case 'split':
          const splitResult = sanitizedText1.split(sanitizedText2 || ' ');
          result = JSON.stringify(splitResult);
          break;
        default:
          throw new Error(`Unknown text action: ${action}`);
      }

      // Store result in variables if specified
      if (variableName && context.variables) {
        context.variables[variableName] = result;
      }

      const executionResult: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'text',
          action,
          input1: sanitizedText1,
          input2: sanitizedText2,
          separator: sanitizedSeparator,
          result,
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
}