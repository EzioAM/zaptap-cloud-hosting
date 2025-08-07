import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';

export class MathExecutor extends BaseExecutor {
  readonly stepType = 'math';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const operation = step.config.operation;
      const number1Str = this.replaceVariables(String(step.config.number1 || 0), context.variables || {});
      const number2Str = this.replaceVariables(String(step.config.number2 || 0), context.variables || {});
      const variableName = step.config.variableName || 'mathResult';

      if (!operation) {
        throw new Error('Math operation is required');
      }

      const num1 = parseFloat(number1Str);
      const num2 = parseFloat(number2Str);

      if (isNaN(num1) || isNaN(num2)) {
        throw new Error('Both numbers must be valid numbers');
      }

      let result = 0;

      switch (operation) {
        case 'add':
          result = num1 + num2;
          break;
        case 'subtract':
          result = num1 - num2;
          break;
        case 'multiply':
          result = num1 * num2;
          break;
        case 'divide':
          if (num2 === 0) {
            throw new Error('Cannot divide by zero');
          }
          result = num1 / num2;
          break;
        case 'power':
          result = Math.pow(num1, num2);
          break;
        case 'modulo':
          if (num2 === 0) {
            throw new Error('Cannot calculate modulo with zero divisor');
          }
          result = num1 % num2;
          break;
        case 'sqrt':
          if (num1 < 0) {
            throw new Error('Cannot calculate square root of negative number');
          }
          result = Math.sqrt(num1);
          break;
        case 'abs':
          result = Math.abs(num1);
          break;
        case 'round':
          result = Math.round(num1);
          break;
        case 'floor':
          result = Math.floor(num1);
          break;
        case 'ceil':
          result = Math.ceil(num1);
          break;
        case 'min':
          result = Math.min(num1, num2);
          break;
        case 'max':
          result = Math.max(num1, num2);
          break;
        case 'random':
          // Generate random number between num1 and num2
          result = Math.random() * (num2 - num1) + num1;
          break;
        default:
          throw new Error(`Unknown math operation: ${operation}`);
      }

      // Handle precision issues for floating point arithmetic
      if (!Number.isInteger(result) && result.toString().includes('.')) {
        result = parseFloat(result.toFixed(10));
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
          type: 'math',
          operation,
          number1: num1,
          number2: num2,
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