import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionResult, HttpRequestStepConfig } from '../../../types';
import { SecurityService } from '../../security/SecurityService';
import { EventLogger } from '../../../utils/EventLogger';
import { VariableManager } from '../../variables/VariableManager';

/**
 * HttpRequestExecutor handles making HTTP requests to external APIs
 * 
 * Features:
 * - Support for GET, POST, PUT, DELETE, PATCH methods
 * - Custom headers and request body
 * - Response data capture in variables
 * - Timeout configuration
 * - URL validation and sanitization
 * - JSON response parsing
 * 
 * Security Notes:
 * - All URLs are validated to be HTTPS (except localhost for development)
 * - Request headers and body are sanitized
 * - Prevents requests to local/private network ranges
 * - Configurable timeout to prevent hanging requests
 */
export class HttpRequestExecutor extends BaseExecutor {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RESPONSE_SIZE = 1024 * 1024; // 1MB
  
  async execute(step: AutomationStep): Promise<ExecutionResult> {
    try {
      EventLogger.debug('HttpRequestExecutor', 'Starting HTTP request execution', step.config);
      
      const config = step.config as HttpRequestStepConfig;
      
      // Validate required configuration
      if (!config.url) {
        return {
          success: false,
          error: 'URL is required for HTTP requests'
        };
      }
      
      // Sanitize and validate URL
      const sanitizedUrl = this.sanitizeUrl(config.url);
      if (!sanitizedUrl) {
        return {
          success: false,
          error: 'Invalid URL format. Only HTTPS URLs are allowed.'
        };
      }
      
      // Validate HTTP method
      const method = config.method || 'GET';
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        return {
          success: false,
          error: 'Invalid HTTP method. Supported methods: GET, POST, PUT, DELETE, PATCH'
        };
      }
      
      // Prepare request options
      const requestOptions: RequestInit = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ZapTap-Automation/1.0',
          ...this.sanitizeHeaders(config.headers || {})
        },
        timeout: config.timeout || this.DEFAULT_TIMEOUT
      };
      
      // Add request body for methods that support it
      if (['POST', 'PUT', 'PATCH'].includes(method) && config.body) {
        const sanitizedBody = SecurityService.sanitizeInput(config.body);
        requestOptions.body = sanitizedBody;
      }
      
      EventLogger.debug('HttpRequestExecutor', 'Making HTTP request', {
        url: sanitizedUrl,
        method: method,
        hasBody: !!requestOptions.body
      });
      
      // Make the HTTP request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestOptions.timeout as number);
      
      try {
        const response = await fetch(sanitizedUrl, {
          ...requestOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if request was successful
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP request failed with status ${response.status}: ${response.statusText}`
          };
        }
        
        // Parse response based on content type
        let responseData: any;
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          responseData = await response.json();
        } else if (contentType.includes('text/')) {
          responseData = await response.text();
        } else {
          // For binary data, get as blob info
          const blob = await response.blob();
          responseData = {
            type: blob.type,
            size: blob.size,
            data: '[Binary Data]'
          };
        }
        
        // Store response in variable if specified
        if (config.responseVariable) {
          const variableManager = VariableManager.getInstance();
          variableManager.setVariable(config.responseVariable, responseData);
          
          EventLogger.debug('HttpRequestExecutor', 'Response stored in variable', {
            variable: config.responseVariable,
            dataType: typeof responseData
          });
        }
        
        EventLogger.info('HttpRequestExecutor', 'HTTP request completed successfully', {
          url: sanitizedUrl,
          method: method,
          status: response.status,
          responseSize: JSON.stringify(responseData).length
        });
        
        return {
          success: true,
          data: {
            url: sanitizedUrl,
            method: method,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData,
            responseVariable: config.responseVariable,
            timestamp: new Date().toISOString()
          }
        };
        
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          return {
            success: false,
            error: `HTTP request timed out after ${requestOptions.timeout}ms`
          };
        }
        
        throw fetchError;
      }
      
    } catch (error) {
      EventLogger.error('HttpRequestExecutor', 'HTTP request failed:', error as Error);
      return {
        success: false,
        error: `HTTP request failed: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Sanitizes and validates URL for security
   */
  private sanitizeUrl(url: string): string | null {
    try {
      const sanitized = SecurityService.sanitizeInput(url.trim());
      const urlObj = new URL(sanitized);
      
      // Only allow HTTPS (except localhost for development)
      if (urlObj.protocol !== 'https:' && !this.isLocalhost(urlObj.hostname)) {
        return null;
      }
      
      // Block private/local network ranges
      if (this.isPrivateNetwork(urlObj.hostname)) {
        return null;
      }
      
      return urlObj.toString();
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Checks if hostname is localhost
   */
  private isLocalhost(hostname: string): boolean {
    return hostname === 'localhost' || 
           hostname === '127.0.0.1' || 
           hostname === '::1' ||
           hostname.endsWith('.localhost');
  }
  
  /**
   * Checks if hostname is in private network range
   */
  private isPrivateNetwork(hostname: string): boolean {
    // Block common private network ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^224\./, // Multicast
      /^fd[0-9a-f]{2}:/i, // IPv6 ULA
      /^fe[8-9a-b][0-9a-f]:/i // IPv6 link-local
    ];
    
    return privateRanges.some(range => range.test(hostname));
  }
  
  /**
   * Sanitizes HTTP headers
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const sanitizedKey = SecurityService.sanitizeInput(key);
      const sanitizedValue = SecurityService.sanitizeInput(value);
      
      // Skip potentially dangerous headers
      const lowerKey = sanitizedKey.toLowerCase();
      if (!['authorization', 'cookie', 'set-cookie', 'x-forwarded-for'].includes(lowerKey)) {
        sanitized[sanitizedKey] = sanitizedValue;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Validates the step configuration
   */
  validateConfig(config: any): string[] {
    const errors: string[] = [];
    
    if (!config.url) {
      errors.push('URL is required');
    } else if (typeof config.url !== 'string' || !config.url.trim()) {
      errors.push('URL must be a non-empty string');
    } else {
      const sanitizedUrl = this.sanitizeUrl(config.url);
      if (!sanitizedUrl) {
        errors.push('URL must be a valid HTTPS URL');
      }
    }
    
    if (config.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)) {
      errors.push('Method must be one of: GET, POST, PUT, DELETE, PATCH');
    }
    
    if (config.headers && typeof config.headers !== 'object') {
      errors.push('Headers must be an object');
    }
    
    if (config.body && typeof config.body !== 'string') {
      errors.push('Request body must be a string');
    }
    
    if (config.responseVariable && typeof config.responseVariable !== 'string') {
      errors.push('Response variable name must be a string');
    }
    
    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 300000)) {
      errors.push('Timeout must be a number between 1000ms and 300000ms (5 minutes)');
    }
    
    return errors;
  }
  
  /**
   * Returns example configuration for documentation
   */
  getExampleConfig(): HttpRequestStepConfig {
    return {
      url: 'https://api.example.com/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'your-api-key'
      },
      body: JSON.stringify({
        message: 'Hello from ZapTap',
        timestamp: new Date().toISOString()
      }),
      responseVariable: 'apiResponse',
      timeout: 30000
    };
  }
}