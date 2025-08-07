import { Alert } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { variableManager } from '../../variables/VariableManager';
import { securityService } from '../../security/SecurityService';

export class PromptInputExecutor extends BaseExecutor {
  readonly stepType = 'prompt_input';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const promptTitle = this.replaceVariables(
        step.config.title || 'Input Required',
        context.variables || {}
      );
      const promptMessage = this.replaceVariables(
        step.config.message || 'Please enter a value:',
        context.variables || {}
      );
      const defaultValue = this.replaceVariables(
        step.config.defaultValue || '',
        context.variables || {}
      );
      const variableName = step.config.variableName || 'userInput';

      if (!variableName) {
        throw new Error('Variable name is required for prompt input');
      }

      // Security validation
      const titleValidation = securityService.sanitizeTextInput(promptTitle, 100);
      const messageValidation = securityService.sanitizeTextInput(promptMessage, 500);
      
      if (!titleValidation.isValid || !messageValidation.isValid) {
        throw new Error('Invalid prompt content detected');
      }

      // For now, simulate user input with default value
      // In a real implementation, this would show a modal input dialog
      const simulatedInput = defaultValue || 'Sample Input';
      
      // Validate user input
      const inputValidation = securityService.sanitizeTextInput(simulatedInput, 1000);
      const sanitizedInput = inputValidation.sanitizedInput || simulatedInput;
      
      // Set variable in variable manager and context
      variableManager.setVariable(variableName, sanitizedInput, 'user', 'execution');
      if (context.variables) {
        context.variables[variableName] = sanitizedInput;
      }

      // Show alert to simulate prompt
      await new Promise<void>((resolve) => {
        Alert.alert(
          titleValidation.sanitizedInput || promptTitle,
          `${messageValidation.sanitizedInput || promptMessage}\n\nUsing value: "${sanitizedInput}"`,
          [{ text: 'OK', onPress: () => resolve() }]
        );
      });

      const result: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'prompt_input',
          variableName,
          value: sanitizedInput,
          prompt: {
            title: titleValidation.sanitizedInput || promptTitle,
            message: messageValidation.sanitizedInput || promptMessage
          },
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, result);
      return result;
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }
}