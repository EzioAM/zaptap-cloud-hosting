import { Linking } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

export class EmailExecutor extends BaseExecutor {
  readonly stepType = 'email';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const to = this.replaceVariables(
        step.config.to || step.config.email || '',
        context.variables || {}
      );
      const subject = this.replaceVariables(
        step.config.subject || '',
        context.variables || {}
      );
      const body = this.replaceVariables(
        step.config.body || step.config.message || '',
        context.variables || {}
      );
      
      if (!to) {
        throw new Error('Email address is required for email step');
      }
      
      // Security validation
      const emailValidation = securityService.validateEmailAddress(to);
      if (!emailValidation.isValid) {
        throw new Error(`Invalid email: ${emailValidation.errors.join(', ')}`);
      }

      const subjectValidation = securityService.sanitizeTextInput(subject, 200);
      const bodyValidation = securityService.sanitizeTextInput(body, 10000);

      const sanitizedTo = emailValidation.sanitizedInput || to;
      const sanitizedSubject = subjectValidation.sanitizedInput || subject;
      const sanitizedBody = bodyValidation.sanitizedInput || body;
      
      // Construct mailto URL
      const mailtoUrl = this.constructMailtoUrl(sanitizedTo, sanitizedSubject, sanitizedBody);
      
      // Check if we can open the URL
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (!canOpen) {
        throw new Error('No email app available on this device');
      }
      
      // Open email client
      await Linking.openURL(mailtoUrl);
      
      const result: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'email',
          to: sanitizedTo,
          subject: sanitizedSubject,
          bodyLength: sanitizedBody.length,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, result);
      return result;
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }
  
  private constructMailtoUrl(to: string, subject: string, body: string): string {
    const params = new URLSearchParams();
    
    if (subject) {
      params.append('subject', subject);
    }
    
    if (body) {
      params.append('body', body);
    }
    
    const queryString = params.toString();
    return `mailto:${to}${queryString ? '?' + queryString : ''}`;
  }
}