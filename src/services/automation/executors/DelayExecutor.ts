import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';

export class DelayExecutor extends BaseExecutor {
  readonly stepType = 'delay';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const delay = parseInt(
        this.replaceVariables(
          String(step.config.delay || 1000),
          context.variables || {}
        )
      );
      
      if (isNaN(delay) || delay < 0) {
        throw new Error('Delay must be a positive number in milliseconds');
      }
      
      // Maximum delay of 5 minutes
      if (delay > 300000) {
        throw new Error('Delay cannot exceed 5 minutes (300000ms)');
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const result: ExecutionResult = {
        success: true,
        duration: Date.now() - startTime,
        output: {
          type: 'delay',
          delay,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, result);
      return result;
      
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }
}