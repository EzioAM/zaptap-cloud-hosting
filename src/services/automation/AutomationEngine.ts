import { AutomationData, AutomationStep, ExecutionResult, ExecutionContext } from '../../types';
import { Logger } from '../../utils/Logger';
import { variableManager } from '../variables/VariableManager';
import { securityService } from '../security/SecurityService';
import { StepValidation } from './StepValidation';
import { getExecutor, isStepTypeSupported } from './executors';
import { supabase } from '../supabase/client';

/**
 * Enhanced AutomationEngine with proper executor delegation, security validation,
 * variable management, and comprehensive error handling
 */
export class AutomationEngine {
  private logger: Logger;
  private isExecuting: boolean = false;
  private executionId: string | null = null;
  private executionStartTime: number = 0;

  constructor() {
    this.logger = new Logger('AutomationEngine');
  }

  /**
   * Execute an automation with proper validation, security checks, and error handling
   */
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
    this.executionStartTime = startTime;
    let stepsCompleted = 0;

    try {
      // Security validation of entire automation
      const securityValidation = securityService.validateAutomation(automationData);
      if (!securityValidation.isValid) {
        throw new Error(`Automation security validation failed: ${securityValidation.errors.join(', ')}`);
      }

      // Show security warnings if present
      if (securityValidation.warnings.length > 0) {
        const shouldContinue = await securityService.showSecurityWarning(
          'Security Warning',
          'This automation contains operations that may require confirmation.',
          securityValidation.warnings
        );
        
        if (!shouldContinue) {
          throw new Error('Automation cancelled by user due to security concerns');
        }
      }

      // Initialize variable manager for this execution
      variableManager.initializeExecution(inputs, automationData.variables || []);

      // Create execution context
      const executionContext: ExecutionContext = {
        ...context,
        variables: { ...inputs },
        userId: context.userId,
        deploymentKey: context.deploymentKey,
        timestamp: new Date().toISOString(),
      };

      // Create execution record if automation has an ID
      if (automationData.id) {
        try {
          this.executionId = await this.createExecutionRecord(automationData);
        } catch (error) {
          this.logger.error('Failed to create execution record:', error);
          // Continue execution even if tracking fails
        }
      }

      this.logger.info('Starting automation execution', {
        automationId: automationData.id,
        title: automationData.title,
        stepCount: automationData.steps.length,
        executionId: this.executionId,
      });

      // Execute each step in sequence
      for (let i = 0; i < automationData.steps.length; i++) {
        const step = automationData.steps[i];

        if (!step.enabled) {
          this.logger.info(`Skipping disabled step: ${step.title}`);
          continue;
        }

        const stepStartTime = Date.now();

        try {
          // Validate step configuration
          const stepValidationErrors = StepValidation.validateStepConfig(step.type, step.config);
          if (stepValidationErrors.length > 0) {
            throw new Error(`Step validation failed: ${stepValidationErrors.map(e => e.message).join(', ')}`);
          }

          // Check if step type is supported
          if (!isStepTypeSupported(step.type)) {
            throw new Error(`Unsupported step type: ${step.type}`);
          }

          // Security validation for individual step
          const stepSecurityValidation = securityService.validateAutomationStep(step);
          if (!stepSecurityValidation.isValid) {
            throw new Error(`Step security validation failed: ${stepSecurityValidation.errors.join(', ')}`);
          }

          // Show step security warnings if needed
          if (stepSecurityValidation.warnings.length > 0 && securityService.requiresConfirmation(step.type)) {
            const shouldContinue = await securityService.showSecurityWarning(
              `${step.type} Step Warning`,
              `The ${step.type} step requires confirmation.`,
              stepSecurityValidation.warnings
            );
            
            if (!shouldContinue) {
              throw new Error(`${step.type} step cancelled by user`);
            }
          }

          // Process variables in step configuration
          const processedConfig = variableManager.processConfigVariables(step.config);
          const processedStep = { ...step, config: processedConfig };

          // Update execution context with current variable state
          executionContext.variables = variableManager.getAllVariables();

          // Notify step start
          context.onStepStart?.(i, processedStep);

          // Execute the step using dedicated executor
          this.logger.info(`Executing step ${i}: ${step.title} (${step.type})`);
          const executor = getExecutor(step.type);
          const result = await executor.execute(processedStep, executionContext);
          this.logger.info(`Step ${i} completed successfully`, { 
            stepType: step.type, 
            executionTime: result.executionTime 
          });

          // Track step execution in database
          const stepExecutionTime = Date.now() - stepStartTime;
          await this.updateStepExecution(i, step, 'success', stepExecutionTime, result.output);

          // Notify step complete
          context.onStepComplete?.(i, result);

          stepsCompleted++;

        } catch (stepError) {
          const errorMessage = stepError instanceof Error ? stepError.message : 'Unknown error';
          this.logger.error(`Step ${i} failed: ${step.title}`, { error: errorMessage });

          // Track failed step
          const stepExecutionTime = Date.now() - stepStartTime;
          await this.updateStepExecution(i, step, 'failed', stepExecutionTime, null, errorMessage);

          // Notify step error
          context.onStepError?.(i, errorMessage);

          // Mark execution as failed
          await this.completeExecution('failed', `Step "${step.title}" failed: ${errorMessage}`);

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

      // Mark execution as successful
      await this.completeExecution('success');

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

      // Mark execution as failed
      await this.completeExecution('failed', errorMessage);

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
      // Clear execution tracking
      this.executionId = null;
      this.executionStartTime = 0;
      // Clear variable execution scope
      variableManager.clearExecutionScope();
    }
  }

  /**
   * Create database record for automation execution tracking
   */
  private async createExecutionRecord(automationData: AutomationData): Promise<string> {
    try {
      // Skip database operations for test automations
      if (automationData.id?.startsWith('test-')) {
        console.log('[AutomationEngine] Skipping execution record for test automation');
        return `test-exec-${Date.now()}`;
      }

      // Get the current user who is running the automation
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[AutomationEngine] Creating execution record for user:', user?.id);
      
      // If no user is authenticated and automation doesn't have an ID, skip database
      if (!user?.id && !automationData.id) {
        console.log('[AutomationEngine] No user or automation ID, skipping execution record');
        return `local-exec-${Date.now()}`;
      }
      
      const executionData = {
        automation_id: automationData.id,
        user_id: user?.id || automationData.created_by, // Use current user ID or fallback to creator
        status: 'running',
        total_steps: automationData.steps.filter(s => s.enabled).length,
        steps_completed: 0,
        created_at: new Date().toISOString(),
      };
      
      console.log('[AutomationEngine] Execution data:', executionData);
      
      const { data, error } = await supabase
        .from('automation_executions')
        .insert(executionData)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      this.logger.error('Failed to create execution record:', { error });
      // Don't throw - return a temporary ID so execution can continue
      return `temp-exec-${Date.now()}`;
    }
  }

  /**
   * Update step execution record in database
   */
  private async updateStepExecution(
    stepIndex: number,
    step: AutomationStep,
    status: 'success' | 'failed',
    executionTime: number,
    output?: any,
    error?: string
  ): Promise<void> {
    if (!this.executionId) return;

    // Skip database operations for test/local executions
    if (this.executionId.startsWith('test-') || this.executionId.startsWith('local-') || this.executionId.startsWith('temp-')) {
      console.log('[AutomationEngine] Skipping step execution update for test/local automation');
      return;
    }

    try {
      await supabase
        .from('step_executions')
        .insert({
          execution_id: this.executionId,
          step_index: stepIndex,
          step_type: step.type,
          step_title: step.title,
          status,
          execution_time: executionTime,
          input_data: step.config,
          output_data: output,
          error_message: error,
          timestamp: new Date().toISOString(),
        });

      // Update parent execution progress
      await supabase
        .from('automation_executions')
        .update({
          steps_completed: stepIndex + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.executionId);
    } catch (error) {
      this.logger.error('Failed to update step execution', { error });
      // Don't throw - let execution continue
    }
  }

  /**
   * Complete execution record in database
   */
  private async completeExecution(status: 'success' | 'failed' | 'cancelled', error?: string): Promise<void> {
    if (!this.executionId) {
      console.log('[AutomationEngine] No executionId, skipping completeExecution');
      return;
    }

    // Skip database operations for test/local executions
    if (this.executionId.startsWith('test-') || this.executionId.startsWith('local-') || this.executionId.startsWith('temp-')) {
      console.log('[AutomationEngine] Skipping execution completion for test/local automation');
      return;
    }

    try {
      const executionTime = Date.now() - this.executionStartTime;
      
      console.log('[AutomationEngine] Completing execution:', {
        executionId: this.executionId,
        status,
        executionTime,
        error
      });
      
      // Try updating without changing status to avoid trigger
      // First update the time and completion fields
      const { error: timeUpdateError } = await supabase
        .from('automation_executions')
        .update({
          execution_time: executionTime,
          completed_at: new Date().toISOString(),
          error_message: error,
        })
        .eq('id', this.executionId);
      
      if (timeUpdateError) {
        console.error('[AutomationEngine] Failed to update execution time:', timeUpdateError);
      } else {
        console.log('[AutomationEngine] Execution time updated successfully');
      }
      
      // Then try to update status separately (this might fail due to trigger)
      const { error: statusUpdateError } = await supabase
        .from('automation_executions')
        .update({
          status,
        })
        .eq('id', this.executionId);
      
      if (statusUpdateError) {
        // Check if this is the known RLS issue with automation_execution_summary
        if (statusUpdateError.code === '42501' && statusUpdateError.message?.includes('automation_execution_summary')) {
          console.warn('[AutomationEngine] Known RLS issue with summary table trigger, status update failed but execution times were recorded');
          // Don't throw the error - at least the execution times were recorded
        } else {
          console.error('[AutomationEngine] Failed to update execution status:', statusUpdateError);
          throw statusUpdateError;
        }
      } else {
        console.log('[AutomationEngine] Execution status updated successfully');
      }
    } catch (error) {
      this.logger.error('Failed to complete execution record', { error });
      console.error('[AutomationEngine] Failed to complete execution record:', error);
    }
  }

  /**
   * Update execution count for an automation
   */
  private async updateExecutionCount(automationId: string): Promise<void> {
    try {
      // Skip database operations for test automations
      if (automationId?.startsWith('test-')) {
        console.log('[AutomationEngine] Skipping execution count update for test automation');
        return;
      }

      // Use atomic increment operation
      const { error } = await supabase.rpc('increment_execution_count', {
        automation_id: automationId
      });

      if (error) {
        // Fallback to manual increment if RPC not available
        const { data: automation, error: fetchError } = await supabase
          .from('automations')
          .select('execution_count')
          .eq('id', automationId)
          .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
          .from('automations')
          .update({ 
            execution_count: (automation?.execution_count || 0) + 1,
            last_run_at: new Date().toISOString()
          })
          .eq('id', automationId);

        if (updateError) throw updateError;
      }

      this.logger.info('Updated execution count', { automationId });
    } catch (error) {
      this.logger.error('Failed to update execution count', { automationId, error });
      // Don't throw - let execution continue even if count update fails
    }
  }

  /**
   * Check if engine is currently executing an automation
   */
  get isCurrentlyExecuting(): boolean {
    return this.isExecuting;
  }

  /**
   * Get current execution ID if running
   */
  get currentExecutionId(): string | null {
    return this.executionId;
  }

  /**
   * Cancel current execution if running
   */
  async cancelExecution(reason: string = 'User cancelled'): Promise<boolean> {
    if (!this.isExecuting) {
      return false;
    }

    try {
      await this.completeExecution('cancelled', reason);
      this.logger.info('Execution cancelled', { reason });
      return true;
    } catch (error) {
      this.logger.error('Failed to cancel execution', { error });
      return false;
    } finally {
      this.isExecuting = false;
      this.executionId = null;
      this.executionStartTime = 0;
      variableManager.clearExecutionScope();
    }
  }
}