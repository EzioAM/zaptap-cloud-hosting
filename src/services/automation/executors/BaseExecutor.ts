import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { Logger } from '../../../utils/Logger';

export abstract class BaseExecutor {
  abstract readonly stepType: string;
  
  abstract execute(
    step: AutomationStep,
    context: ExecutionContext
  ): Promise<ExecutionResult>;
  
  protected validateConfig(config: any): void {
    if (!config) {
      throw new Error(`Missing configuration for ${this.stepType} step`);
    }
  }
  
  protected logExecution(step: AutomationStep, result: ExecutionResult): void {
    const logger = new Logger(this.stepType);
    logger.info(`Executed ${this.stepType} step`, {
      stepId: step.id,
      success: result.success,
      executionTime: result.executionTime
    });
  }
  
  protected replaceVariables(text: string, variables: Record<string, any>): string {
    if (!text || typeof text !== 'string') return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
  
  protected async handleError(error: any, startTime: number, totalSteps: number = 1, stepsCompleted: number = 0): Promise<ExecutionResult> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const logger = new Logger(this.stepType);
    logger.error(`${this.stepType} step failed`, { error: errorMessage });
    
    return {
      success: false,
      error: errorMessage,
      executionTime: Date.now() - startTime,
      stepsCompleted,
      totalSteps,
      timestamp: new Date().toISOString()
    };
  }
}