import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult, AutomationData } from '../../../types';
import { supabase } from '../../supabase/client';
import { AutomationEngine } from '../AutomationEngine';

export class ExternalAutomationExecutor extends BaseExecutor {
  readonly stepType = 'external_automation';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const automationId = this.replaceVariables(
        step.config.automationId || '',
        context.variables || {}
      );
      const automationName = this.replaceVariables(
        step.config.automationName || '',
        context.variables || {}
      );
      const inputVariables = step.config.inputVariables || {};
      const waitForCompletion = step.config.waitForCompletion !== false;
      const timeout = step.config.timeout || 60000; // 60 seconds default timeout
      
      if (!automationId && !automationName) {
        throw new Error('Either automation ID or name is required');
      }

      // Fetch the automation
      let automation: AutomationData | null = null;
      
      if (automationId) {
        automation = await this.fetchAutomationById(automationId);
      } else if (automationName) {
        automation = await this.fetchAutomationByName(automationName);
      }

      if (!automation) {
        throw new Error(`Automation not found: ${automationId || automationName}`);
      }

      // Prepare input variables by replacing any variable references
      const processedInputs: Record<string, any> = {};
      for (const [key, value] of Object.entries(inputVariables)) {
        if (typeof value === 'string') {
          processedInputs[key] = this.replaceVariables(value, context.variables || {});
        } else {
          processedInputs[key] = value;
        }
      }

      // Execute the external automation
      let executionResult: ExecutionResult;
      
      if (waitForCompletion) {
        // Execute synchronously with timeout
        executionResult = await this.executeWithTimeout(
          automation,
          processedInputs,
          context,
          timeout
        );
      } else {
        // Execute asynchronously (fire and forget)
        this.executeAsync(automation, processedInputs, context);
        executionResult = {
          success: true,
          executionTime: Date.now() - startTime,
          stepsCompleted: 1,
          totalSteps: 1,
          timestamp: new Date().toISOString(),
          output: {
            type: 'external_automation',
            automationId: automation.id,
            automationTitle: automation.title,
            async: true,
            message: 'Automation triggered asynchronously',
            timestamp: new Date().toISOString()
          }
        };
      }

      // Store result in variable if requested
      if (context.variables && step.config.outputVariable) {
        context.variables[step.config.outputVariable] = executionResult.output;
        
        // If the external automation returned output, store it
        if (executionResult.output?.result) {
          context.variables[`${step.config.outputVariable}_result`] = executionResult.output.result;
        }
      }

      this.logExecution(step, executionResult);
      return executionResult;
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }

  private async fetchAutomationById(automationId: string): Promise<AutomationData | null> {
    const { data, error } = await supabase
      .from('automations')
      .select(`
        *,
        automation_steps!automation_steps_automation_id_fkey (*)
      `)
      .eq('id', automationId)
      .single();

    if (error || !data) {
      console.error('Failed to fetch automation by ID:', error);
      return null;
    }

    return this.transformDatabaseAutomation(data);
  }

  private async fetchAutomationByName(automationName: string): Promise<AutomationData | null> {
    const { data, error } = await supabase
      .from('automations')
      .select(`
        *,
        automation_steps!automation_steps_automation_id_fkey (*)
      `)
      .eq('title', automationName)
      .limit(1)
      .single();

    if (error || !data) {
      console.error('Failed to fetch automation by name:', error);
      return null;
    }

    return this.transformDatabaseAutomation(data);
  }

  private transformDatabaseAutomation(data: any): AutomationData {
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      is_public: data.is_public || false,
      category: data.category || 'general',
      tags: data.tags || [],
      execution_count: data.execution_count || 0,
      average_rating: data.average_rating || 0,
      rating_count: data.rating_count || 0,
      steps: (data.automation_steps || []).map((step: any) => ({
        id: step.id,
        type: step.type,
        title: step.title || step.type,
        config: step.config || {},
        enabled: step.is_active !== false
      }))
    };
  }

  private async executeWithTimeout(
    automation: AutomationData,
    inputs: Record<string, any>,
    context: ExecutionContext,
    timeout: number
  ): Promise<ExecutionResult> {
    const engine = new AutomationEngine();
    
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<ExecutionResult>((_, reject) => {
      setTimeout(() => reject(new Error(`External automation timed out after ${timeout}ms`)), timeout);
    });

    // Execute the automation with timeout
    try {
      const result = await Promise.race([
        engine.execute(automation, inputs, context),
        timeoutPromise
      ]);

      return {
        success: result.success,
        executionTime: result.executionTime,
        stepsCompleted: result.stepsCompleted,
        totalSteps: result.totalSteps,
        timestamp: new Date().toISOString(),
        output: {
          type: 'external_automation',
          automationId: automation.id,
          automationTitle: automation.title,
          async: false,
          result: result.output,
          error: result.error,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  private async executeAsync(
    automation: AutomationData,
    inputs: Record<string, any>,
    context: ExecutionContext
  ): Promise<void> {
    const engine = new AutomationEngine();
    
    // Execute in the background
    engine.execute(automation, inputs, context)
      .then(result => {
        console.log(`External automation ${automation.title} completed:`, result);
      })
      .catch(error => {
        console.error(`External automation ${automation.title} failed:`, error);
      });
  }
}