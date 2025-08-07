import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';

export class ConditionExecutor extends BaseExecutor {
  readonly stepType = 'condition';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const variableName = step.config.variable;
      const condition = step.config.condition;
      const compareValue = this.replaceVariables(
        step.config.value,
        context.variables || {}
      );

      if (!variableName || !condition || compareValue === undefined) {
        throw new Error('Variable name, condition, and value are required for condition step');
      }

      // Get variable value from context
      const variableValue = context.variables?.[variableName];
      let conditionMet = false;

      switch (condition) {
        case 'equals':
          conditionMet = String(variableValue) === String(compareValue);
          break;
        case 'contains':
          conditionMet = String(variableValue).includes(String(compareValue));
          break;
        case 'greater':
          const numVar1 = parseFloat(String(variableValue));
          const numCompare1 = parseFloat(String(compareValue));
          conditionMet = !isNaN(numVar1) && !isNaN(numCompare1) && numVar1 > numCompare1;
          break;
        case 'less':
          const numVar2 = parseFloat(String(variableValue));
          const numCompare2 = parseFloat(String(compareValue));
          conditionMet = !isNaN(numVar2) && !isNaN(numCompare2) && numVar2 < numCompare2;
          break;
        case 'greater_equal':
          const numVar3 = parseFloat(String(variableValue));
          const numCompare3 = parseFloat(String(compareValue));
          conditionMet = !isNaN(numVar3) && !isNaN(numCompare3) && numVar3 >= numCompare3;
          break;
        case 'less_equal':
          const numVar4 = parseFloat(String(variableValue));
          const numCompare4 = parseFloat(String(compareValue));
          conditionMet = !isNaN(numVar4) && !isNaN(numCompare4) && numVar4 <= numCompare4;
          break;
        case 'not_equals':
          conditionMet = String(variableValue) !== String(compareValue);
          break;
        case 'is_empty':
          conditionMet = !variableValue || String(variableValue).trim() === '';
          break;
        case 'is_not_empty':
          conditionMet = !!variableValue && String(variableValue).trim() !== '';
          break;
        default:
          throw new Error(`Unknown condition type: ${condition}`);
      }

      const result: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'condition',
          variable: variableName,
          condition,
          compareValue,
          variableValue,
          conditionMet,
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