import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { Logger } from '../../../utils/logger';

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
    Logger.info(`Executed ${this.stepType} step`, {
      stepId: step.id,
      success: result.success,
      duration: result.duration
    });
  }
  
  protected replaceVariables(text: string, variables: Record<string, any>): string {
    if (!text || typeof text !== 'string') return text;
    
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }
  
  protected async handleError(error: any, startTime: number): Promise<ExecutionResult> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    Logger.error(`${this.stepType} step failed`, { error: errorMessage });
    
    return {
      success: false,
      error: errorMessage,
      duration: Date.now() - startTime
    };
  }
}