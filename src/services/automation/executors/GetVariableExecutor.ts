import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { variableManager } from '../../variables/VariableManager';

export class GetVariableExecutor extends BaseExecutor {
  readonly stepType = 'get_variable';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const variableName = this.replaceVariables(
        step.config.name || '',
        context.variables || {}
      );
      const defaultValue = step.config.defaultValue || '';

      if (!variableName) {
        throw new Error('Variable name is required');
      }

      // Get variable from variable manager with scope precedence
      const variable = variableManager.getVariable(variableName);
      const value = variable ? variable.value : defaultValue;

      const result: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'get_variable',
          name: variableName,
          value,
          found: !!variable,
          source: variable?.source || 'default',
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