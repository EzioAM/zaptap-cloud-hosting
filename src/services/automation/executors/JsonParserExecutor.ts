import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionResult, JsonParserStepConfig } from '../../../types';
import { SecurityService } from '../../security/SecurityService';
import { EventLogger } from '../../../utils/EventLogger';
import { VariableManager } from '../../variables/VariableManager';

/**
 * JsonParserExecutor handles parsing and extracting data from JSON strings
 * 
 * Features:
 * - Parse JSON strings into objects
 * - Extract specific values using JSONPath-like syntax
 * - Support for nested object access (e.g., "user.profile.name")
 * - Array indexing (e.g., "items[0].title")
 * - Default values for missing paths
 * - Variable storage for extracted data
 * 
 * Security Notes:
 * - Input JSON is sanitized to prevent injection attacks
 * - Path traversal is limited to safe object property access
 * - Maximum parsing depth to prevent stack overflow
 * - Size limits to prevent memory exhaustion
 */
export class JsonParserExecutor extends BaseExecutor {
  private readonly MAX_JSON_SIZE = 1024 * 1024; // 1MB max JSON size
  private readonly MAX_DEPTH = 10; // Maximum nesting depth for path traversal
  
  async execute(step: AutomationStep): Promise<ExecutionResult> {
    try {
      EventLogger.debug('JsonParserExecutor', 'Starting JSON parsing execution', step.config);
      
      const config = step.config as JsonParserStepConfig;
      
      // Validate required configuration
      if (!config.jsonData) {
        return {
          success: false,
          error: 'JSON data is required for parsing'
        };
      }
      
      if (!config.outputVariable) {
        return {
          success: false,
          error: 'Output variable name is required'
        };
      }
      
      // Check JSON size
      if (config.jsonData.length > this.MAX_JSON_SIZE) {
        return {
          success: false,
          error: `JSON data too large. Maximum size is ${this.MAX_JSON_SIZE / 1024}KB`
        };
      }
      
      // Sanitize JSON input
      const sanitizedJsonData = SecurityService.sanitizeInput(config.jsonData);
      
      // Parse JSON
      let parsedData: any;
      try {
        parsedData = JSON.parse(sanitizedJsonData);
      } catch (parseError) {
        return {
          success: false,
          error: `Invalid JSON format: ${(parseError as Error).message}`
        };
      }
      
      EventLogger.debug('JsonParserExecutor', 'JSON parsed successfully', {
        dataType: typeof parsedData,
        hasPath: !!config.path
      });
      
      // Extract specific value if path is provided
      let extractedValue: any;
      if (config.path) {
        extractedValue = this.extractValueByPath(parsedData, config.path);
        
        // Use default value if extraction failed
        if (extractedValue === undefined && config.defaultValue !== undefined) {
          extractedValue = config.defaultValue;
          EventLogger.debug('JsonParserExecutor', 'Using default value for missing path', {
            path: config.path,
            defaultValue: config.defaultValue
          });
        }
      } else {
        extractedValue = parsedData;
      }
      
      // Store extracted value in variable
      const variableManager = VariableManager.getInstance();
      variableManager.setVariable(config.outputVariable, extractedValue);
      
      EventLogger.info('JsonParserExecutor', 'JSON parsing completed successfully', {
        path: config.path,
        outputVariable: config.outputVariable,
        extractedType: typeof extractedValue,
        hasValue: extractedValue !== undefined
      });
      
      return {
        success: true,
        data: {
          parsedData: parsedData,
          extractedValue: extractedValue,
          path: config.path,
          outputVariable: config.outputVariable,
          dataSize: sanitizedJsonData.length,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      EventLogger.error('JsonParserExecutor', 'JSON parsing failed:', error as Error);
      return {
        success: false,
        error: `JSON parsing failed: ${(error as Error).message}`
      };
    }
  }
  
  /**
   * Extracts value from object using a dot-notation path
   * Supports:
   * - Simple properties: "name"
   * - Nested properties: "user.profile.name"
   * - Array indices: "items[0]" or "items.0"
   * - Mixed: "user.items[2].title"
   */
  private extractValueByPath(data: any, path: string): any {
    try {
      // Sanitize the path
      const sanitizedPath = SecurityService.sanitizeInput(path.trim());
      if (!sanitizedPath) {
        return undefined;
      }
      
      // Split path into segments, handling both dot notation and bracket notation
      const segments = this.parsePath(sanitizedPath);
      
      if (segments.length > this.MAX_DEPTH) {
        EventLogger.warn('JsonParserExecutor', `Path depth exceeds maximum of ${this.MAX_DEPTH}`, { path });
        return undefined;
      }
      
      let current = data;
      
      for (const segment of segments) {
        if (current == null) {
          return undefined;
        }
        
        if (segment.type === 'property') {
          current = current[segment.key];
        } else if (segment.type === 'index') {
          const index = parseInt(segment.key, 10);
          if (isNaN(index) || index < 0) {
            return undefined;
          }
          current = Array.isArray(current) ? current[index] : undefined;
        }
      }
      
      return current;
      
    } catch (error) {
      EventLogger.warn('JsonParserExecutor', 'Path extraction failed:', error as Error);
      return undefined;
    }
  }
  
  /**
   * Parses a path string into segments
   */
  private parsePath(path: string): Array<{ type: 'property' | 'index'; key: string }> {
    const segments: Array<{ type: 'property' | 'index'; key: string }> = [];
    
    // Replace bracket notation with dot notation for easier parsing
    const normalizedPath = path
      .replace(/\[(\d+)\]/g, '.$1') // Convert [0] to .0
      .replace(/^\./g, ''); // Remove leading dot
    
    const parts = normalizedPath.split('.');
    
    for (const part of parts) {
      if (!part) continue;
      
      // Check if this part is a numeric index
      if (/^\d+$/.test(part)) {
        segments.push({ type: 'index', key: part });
      } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(part)) {
        // Valid JavaScript property name
        segments.push({ type: 'property', key: part });
      } else {
        // Invalid segment, return empty to indicate error
        return [];
      }
    }
    
    return segments;
  }
  
  /**
   * Validates the step configuration
   */
  validateConfig(config: any): string[] {
    const errors: string[] = [];
    
    if (!config.jsonData) {
      errors.push('JSON data is required');
    } else if (typeof config.jsonData !== 'string') {
      errors.push('JSON data must be a string');
    } else {
      // Try to parse JSON to validate format
      try {
        JSON.parse(config.jsonData);
      } catch (error) {
        errors.push('JSON data must be valid JSON format');
      }
      
      // Check size
      if (config.jsonData.length > this.MAX_JSON_SIZE) {
        errors.push(`JSON data too large. Maximum size is ${this.MAX_JSON_SIZE / 1024}KB`);
      }
    }
    
    if (!config.outputVariable) {
      errors.push('Output variable name is required');
    } else if (typeof config.outputVariable !== 'string' || !config.outputVariable.trim()) {
      errors.push('Output variable name must be a non-empty string');
    } else if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(config.outputVariable)) {
      errors.push('Output variable name must be a valid identifier');
    }
    
    if (config.path && typeof config.path !== 'string') {
      errors.push('Path must be a string');
    }
    
    // Validate path format if provided
    if (config.path && typeof config.path === 'string') {
      const segments = this.parsePath(config.path);
      if (segments.length === 0 && config.path.trim() !== '') {
        errors.push('Path contains invalid characters. Use dot notation (e.g., "user.name") or bracket notation (e.g., "items[0]")');
      }
      
      if (segments.length > this.MAX_DEPTH) {
        errors.push(`Path depth exceeds maximum of ${this.MAX_DEPTH} levels`);
      }
    }
    
    return errors;
  }
  
  /**
   * Returns example configuration for documentation
   */
  getExampleConfig(): JsonParserStepConfig {
    return {
      jsonData: JSON.stringify({
        user: {
          id: 123,
          profile: {
            name: 'John Doe',
            email: 'john@example.com'
          },
          orders: [
            { id: 1, total: 29.99, status: 'completed' },
            { id: 2, total: 15.50, status: 'pending' }
          ]
        },
        timestamp: new Date().toISOString()
      }, null, 2),
      path: 'user.profile.name',
      outputVariable: 'userName',
      defaultValue: 'Unknown User'
    };
  }
}