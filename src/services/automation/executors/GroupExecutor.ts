import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { getExecutor, isStepTypeSupported } from './index';

export class GroupExecutor extends BaseExecutor {
  readonly stepType = 'group';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const mode = step.config.mode || 'sequential'; // sequential, parallel, conditional
      const steps = step.config.steps || [];
      const continueOnError = step.config.continueOnError !== false;
      
      if (!Array.isArray(steps) || steps.length === 0) {
        throw new Error('Group must contain at least one step');
      }

      let results: ExecutionResult[];
      
      switch (mode) {
        case 'sequential':
          results = await this.executeSequential(steps, context, continueOnError);
          break;
        case 'parallel':
          results = await this.executeParallel(steps, context, continueOnError);
          break;
        case 'conditional':
          results = await this.executeConditional(steps, context, step.config);
          break;
        default:
          throw new Error(`Unknown group execution mode: ${mode}`);
      }

      // Aggregate results
      const totalSteps = results.length;
      const successfulSteps = results.filter(r => r.success).length;
      const failedSteps = results.filter(r => !r.success).length;
      const totalExecutionTime = results.reduce((sum, r) => sum + (r.executionTime || 0), 0);
      
      const success = failedSteps === 0 || (continueOnError && successfulSteps > 0);

      const result: ExecutionResult = {
        success,
        executionTime: Date.now() - startTime,
        stepsCompleted: successfulSteps,
        totalSteps,
        timestamp: new Date().toISOString(),
        output: {
          type: 'group',
          mode,
          totalSteps,
          successfulSteps,
          failedSteps,
          totalExecutionTime,
          results: results.map((r, i) => ({
            step: steps[i].title || steps[i].type,
            success: r.success,
            executionTime: r.executionTime,
            output: r.output,
            error: r.error
          })),
          timestamp: new Date().toISOString()
        }
      };

      // Store group result in variable if requested
      if (context.variables && step.config.variableName) {
        context.variables[step.config.variableName] = {
          success,
          successfulSteps,
          failedSteps,
          results: results.map(r => r.output)
        };
      }

      this.logExecution(step, result);
      return result;
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }

  private async executeSequential(
    steps: AutomationStep[], 
    context: ExecutionContext, 
    continueOnError: boolean
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    
    for (const step of steps) {
      try {
        if (!step.enabled) {
          console.log(`Skipping disabled step: ${step.title}`);
          continue;
        }

        if (!isStepTypeSupported(step.type)) {
          throw new Error(`Unsupported step type in group: ${step.type}`);
        }

        const executor = getExecutor(step.type);
        const result = await executor.execute(step, context);
        results.push(result);

        if (!result.success && !continueOnError) {
          break; // Stop execution on first error
        }
      } catch (error) {
        const errorResult: ExecutionResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: 0,
          stepsCompleted: 0,
          totalSteps: 1,
          timestamp: new Date().toISOString()
        };
        results.push(errorResult);
        
        if (!continueOnError) {
          break;
        }
      }
    }
    
    return results;
  }

  private async executeParallel(
    steps: AutomationStep[], 
    context: ExecutionContext, 
    continueOnError: boolean
  ): Promise<ExecutionResult[]> {
    // Create a copy of context for each parallel execution to avoid conflicts
    const contextCopies = steps.map(() => ({
      ...context,
      variables: { ...context.variables }
    }));

    const promises = steps.map(async (step, index) => {
      try {
        if (!step.enabled) {
          return {
            success: true,
            executionTime: 0,
            stepsCompleted: 0,
            totalSteps: 1,
            timestamp: new Date().toISOString(),
            output: { skipped: true }
          };
        }

        if (!isStepTypeSupported(step.type)) {
          throw new Error(`Unsupported step type in group: ${step.type}`);
        }

        const executor = getExecutor(step.type);
        return await executor.execute(step, contextCopies[index]);
      } catch (error) {
        if (!continueOnError) {
          throw error;
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTime: 0,
          stepsCompleted: 0,
          totalSteps: 1,
          timestamp: new Date().toISOString()
        };
      }
    });

    const results = await Promise.all(promises);
    
    // Merge variable changes from parallel executions
    if (context.variables) {
      for (const contextCopy of contextCopies) {
        Object.assign(context.variables, contextCopy.variables);
      }
    }
    
    return results;
  }

  private async executeConditional(
    steps: AutomationStep[], 
    context: ExecutionContext,
    config: any
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];
    const condition = config.condition || 'all'; // all, any, none, custom
    const customCondition = config.customCondition; // Variable name or expression
    
    for (const step of steps) {
      let shouldExecute = false;
      
      switch (condition) {
        case 'all':
          // Execute only if all previous steps succeeded
          shouldExecute = results.length === 0 || results.every(r => r.success);
          break;
        case 'any':
          // Execute if any previous step succeeded
          shouldExecute = results.length === 0 || results.some(r => r.success);
          break;
        case 'none':
          // Execute only if all previous steps failed
          shouldExecute = results.length === 0 || results.every(r => !r.success);
          break;
        case 'custom':
          // Evaluate custom condition from variables
          if (customCondition && context.variables) {
            const conditionValue = context.variables[customCondition];
            shouldExecute = !!conditionValue;
          } else {
            shouldExecute = true;
          }
          break;
        default:
          shouldExecute = true;
      }
      
      if (shouldExecute && step.enabled) {
        try {
          if (!isStepTypeSupported(step.type)) {
            throw new Error(`Unsupported step type in group: ${step.type}`);
          }

          const executor = getExecutor(step.type);
          const result = await executor.execute(step, context);
          results.push(result);
        } catch (error) {
          const errorResult: ExecutionResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            executionTime: 0,
            stepsCompleted: 0,
            totalSteps: 1,
            timestamp: new Date().toISOString()
          };
          results.push(errorResult);
        }
      } else {
        // Add skipped result
        results.push({
          success: true,
          executionTime: 0,
          stepsCompleted: 0,
          totalSteps: 1,
          timestamp: new Date().toISOString(),
          output: { skipped: true, reason: shouldExecute ? 'disabled' : 'condition not met' }
        });
      }
    }
    
    return results;
  }
}