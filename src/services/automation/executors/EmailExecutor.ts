import { Linking } from 'react-native';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';

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
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        throw new Error('Invalid email address format');
      }
      
      // Construct mailto URL
      const mailtoUrl = this.constructMailtoUrl(to, subject, body);
      
      // Check if we can open the URL
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (!canOpen) {
        throw new Error('No email app available on this device');
      }
      
      // Open email client
      await Linking.openURL(mailtoUrl);
      
      const result: ExecutionResult = {
        success: true,
        duration: Date.now() - startTime,
        output: {
          type: 'email',
          to,
          subject,
          bodyLength: body.length,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, result);
      return result;
      
    } catch (error) {
      return this.handleError(error, startTime);
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