import * as SMS from 'expo-sms';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';

export class SMSExecutor extends BaseExecutor {
  readonly stepType = 'sms';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const phoneNumber = this.replaceVariables(
        step.config.phoneNumber || '',
        context.variables || {}
      );
      const message = this.replaceVariables(
        step.config.message || '',
        context.variables || {}
      );
      
      if (!phoneNumber || !message) {
        throw new Error('Phone number and message are required for SMS step');
      }
      
      // Check if SMS is available on this device
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('SMS is not available on this device');
      }
      
      // Send SMS using device's SMS app
      const result = await SMS.sendSMSAsync([phoneNumber], message);
      
      const executionResult: ExecutionResult = {
        success: true,
        duration: Date.now() - startTime,
        output: {
          type: 'sms',
          phoneNumber,
          messageLength: message.length,
          result,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, executionResult);
      return executionResult;
      
    } catch (error) {
      return this.handleError(error, startTime);
    }
  }
}