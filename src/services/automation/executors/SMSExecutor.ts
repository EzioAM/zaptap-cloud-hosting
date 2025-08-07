import * as SMS from 'expo-sms';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

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

      // Security validation
      const phoneValidation = securityService.validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        throw new Error(`Invalid phone number: ${phoneValidation.errors.join(', ')}`);
      }

      const messageValidation = securityService.sanitizeTextInput(message, 1600);
      if (!messageValidation.isValid) {
        throw new Error(`Invalid message: ${messageValidation.errors.join(', ')}`);
      }

      const sanitizedPhone = phoneValidation.sanitizedInput || phoneNumber;
      const sanitizedMessage = messageValidation.sanitizedInput || message;
      
      // Check if SMS is available on this device
      const isAvailable = await SMS.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('SMS is not available on this device');
      }
      
      // Send SMS using device's SMS app
      const result = await SMS.sendSMSAsync([sanitizedPhone], sanitizedMessage);
      
      const executionResult: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'sms',
          phoneNumber: sanitizedPhone,
          messageLength: sanitizedMessage.length,
          result,
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