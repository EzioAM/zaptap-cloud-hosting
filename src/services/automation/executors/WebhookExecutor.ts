import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

export class WebhookExecutor extends BaseExecutor {
  readonly stepType = 'webhook';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const url = this.replaceVariables(
        step.config.url || '',
        context.variables || {}
      );
      const method = (step.config.method || 'POST').toUpperCase();
      const headers = this.processHeaders(step.config.headers || {}, context.variables || {});
      const body = this.processBody(step.config.body, context.variables || {});
      
      if (!url) {
        throw new Error('URL is required for webhook step');
      }
      
      // Security validation
      const urlValidation = securityService.validateURL(url);
      if (!urlValidation.isValid) {
        throw new Error(`Invalid webhook URL: ${urlValidation.errors.join(', ')}`);
      }
      
      const sanitizedUrl = urlValidation.sanitizedInput || url;
      
      // Additional webhook-specific validation
      this.validateUrl(sanitizedUrl);
      
      // Sanitize headers and body
      const sanitizedHeaders = this.sanitizeHeaders(headers);
      const sanitizedBody = this.sanitizeBody(body);
      
      // Make the webhook request
      const response = await fetch(sanitizedUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...sanitizedHeaders
        },
        body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(sanitizedBody) : undefined,
        timeout: 30000 // 30 second timeout
      });
      
      const responseData = await response.text();
      let parsedResponse;
      
      try {
        parsedResponse = JSON.parse(responseData);
      } catch {
        parsedResponse = responseData;
      }
      
      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}: ${response.statusText}`);
      }
      
      const result: ExecutionResult = {
        success: true,
        executionTime: Date.now() - startTime,
        stepsCompleted: 1,
        totalSteps: 1,
        timestamp: new Date().toISOString(),
        output: {
          type: 'webhook',
          url: sanitizedUrl,
          method,
          status: response.status,
          statusText: response.statusText,
          response: parsedResponse,
          timestamp: new Date().toISOString()
        }
      };
      
      this.logExecution(step, result);
      return result;
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }
  
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      
      // Only allow http and https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only HTTP(S) protocols are allowed');
      }
      
      // Block local/private networks for security
      const hostname = parsed.hostname;
      if (
        hostname === 'localhost' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.') ||
        hostname === '127.0.0.1'
      ) {
        throw new Error('Local network addresses are not allowed');
      }
    } catch (error) {
      throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const keyValidation = securityService.sanitizeTextInput(key, 100);
      const valueValidation = securityService.sanitizeTextInput(value, 500);
      
      if (keyValidation.isValid && valueValidation.isValid) {
        sanitized[keyValidation.sanitizedInput || key] = valueValidation.sanitizedInput || value;
      }
    }
    
    return sanitized;
  }
  
  private sanitizeBody(body: any): any {
    return securityService.sanitizeObject(body, 5);
  }

  private processHeaders(headers: Record<string, string>, variables: Record<string, any>): Record<string, string> {
    const processed: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      processed[key] = this.replaceVariables(value, variables);
    }
    
    return processed;
  }
  
  private processBody(body: any, variables: Record<string, any>): any {
    if (typeof body === 'string') {
      return this.replaceVariables(body, variables);
    }
    
    if (typeof body === 'object' && body !== null) {
      const processed: any = Array.isArray(body) ? [] : {};
      
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === 'string') {
          processed[key] = this.replaceVariables(value, variables);
        } else if (typeof value === 'object' && value !== null) {
          processed[key] = this.processBody(value, variables);
        } else {
          processed[key] = value;
        }
      }
      
      return processed;
    }
    
    return body;
  }
}