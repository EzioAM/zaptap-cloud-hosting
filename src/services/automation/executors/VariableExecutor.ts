import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { variableManager } from '../../variables/VariableManager';

export class VariableExecutor extends BaseExecutor {
  readonly stepType = 'variable';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const variableName = this.replaceVariables(
        step.config.name || '',
        context.variables || {}
      );
      const variableValue = this.replaceVariables(
        step.config.value || '',
        context.variables || {}
      );

      if (!variableName) {
        throw new Error('Variable name is required');
      }

      // Set variable in variable manager
      variableManager.setVariable(variableName, variableValue, 'automation', 'execution');
      
      // Also set in context for immediate use
      if (context.variables) {
        context.variables[variableName] = variableValue;
      }

      const result: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'variable',
          name: variableName,
          value: variableValue,
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