import { AutomationData, AutomationStep, ExecutionResult, ExecutionContext } from '../../types';
import { Logger } from '../../utils/Logger';
import { BaseExecutor } from './executors/BaseExecutor';
import { executorMap } from './executors';
import { supabase } from '../supabase/client';

export class AutomationEngineRefactored {
  private logger: Logger;
  private isExecuting: boolean = false;
  private executors: Map<string, BaseExecutor>;
  
  constructor() {
    this.logger = new Logger('AutomationEngine');
    this.executors = executorMap;
  }
  
  async execute(
    automationData: AutomationData,
    inputs: Record<string, any> = {},
    context: Partial<ExecutionContext> = {}
  ): Promise<ExecutionResult> {
    if (this.isExecuting) {
      throw new Error('Another automation is already executing');
    }
    
    // Validate automation data
    if (!automationData) {
      throw new Error('Automation data is required');
    }
    
    if (!automationData.steps || !Array.isArray(automationData.steps)) {
      throw new Error('Automation must have steps array');
    }
    
    this.isExecuting = true;
    const startTime = Date.now();
    let stepsCompleted = 0;
    
    try {
      // Create execution context with variables
      const executionContext: ExecutionContext = {
        ...context,
        variables: { ...inputs }
      };
      
      this.logger.info('Starting automation execution', {
        automationId: automationData.id,
        title: automationData.title,
        stepCount: automationData.steps.length,
      });
      
      // Execute each step in sequence
      for (let i = 0; i < automationData.steps.length; i++) {
        const step = automationData.steps[i];
        
        if (!step.enabled) {
          this.logger.info(`Skipping disabled step: ${step.title}`);
          continue;
        }
        
        try {
          // Notify step start
          context.onStepStart?.(i, step);
          
          // Execute the step
          this.logger.info(`Executing step ${i}: ${step.title}`);
          const result = await this.executeStep(step, executionContext);
          this.logger.info(`Step ${i} completed:`, result);
          
          // Update context variables if step produces output
          if (result.output) {
            executionContext.variables = {
              ...executionContext.variables,
              [`step_${i}_output`]: result.output
            };
          }
          
          // Notify step complete
          context.onStepComplete?.(i, result);
          
          stepsCompleted++;
          
        } catch (stepError) {
          const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error';
          this.logger.error(`Step ${i} failed: ${step.title}`, { error: errorMessage });
          
          // Notify step error
          context.onStepError?.(i, errorMessage);
          
          return {
            success: false,
            error: `Step "${step.title}" failed: ${errorMessage}`,
            executionTime: Date.now() - startTime,
            stepsCompleted,
            totalSteps: automationData.steps.length,
            timestamp: new Date().toISOString(),
            failedStep: i,
          };
        }
      }
      
      const executionTime = Date.now() - startTime;
      
      this.logger.info('Automation completed successfully', {
        executionTime,
        stepsCompleted,
        totalSteps: automationData.steps.length,
      });
      
      // Update execution count in database
      if (automationData.id) {
        this.updateExecutionCount(automationData.id).catch(error => {
          this.logger.error('Failed to update execution count', { error });
        });
      }
      
      return {
        success: true,
        executionTime,
        stepsCompleted,
        totalSteps: automationData.steps.length,
        timestamp: new Date().toISOString(),
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Automation execution failed', { error: errorMessage });
      
      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        stepsCompleted,
        totalSteps: automationData.steps.length,
        timestamp: new Date().toISOString(),
      };
    } finally {
      this.isExecuting = false;
    }
  }
  
  private async executeStep(
    step: AutomationStep,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const executor = this.executors.get(step.type);
    
    if (!executor) {
      this.logger.warn(`Unknown step type: ${step.type}`);
      return {
        success: false,
        error: `Step type "${step.type}" not implemented yet`,
        duration: 0
      };
    }
    
    return executor.execute(step, context);
  }
  
  private async updateExecutionCount(automationId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_automation_execution_count', {
        automation_id: automationId
      });
      
      if (error) {
        this.logger.error('Failed to update execution count', { error });
      }
    } catch (error) {
      this.logger.error('Failed to update execution count', { error });
    }
  }
  
  registerExecutor(stepType: string, executor: BaseExecutor): void {
    this.executors.set(stepType, executor);
    this.logger.info(`Registered executor for step type: ${stepType}`);
  }
  
  hasExecutor(stepType: string): boolean {
    return this.executors.has(stepType);
  }
  
  getRegisteredStepTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}