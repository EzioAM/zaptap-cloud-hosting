import { Logger } from '../../utils/Logger';

export type VariableType = 'text' | 'number' | 'boolean' | 'date' | 'location' | 'file' | 'list' | 'object';

export interface VariableDefinition {
  name: string;
  type: VariableType;
  description?: string;
  defaultValue?: any;
  required?: boolean;
  validation?: VariableValidation;
}

export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  options?: string[]; // For enum/select values
}

export interface Variable {
  name: string;
  type: VariableType;
  value: any;
  timestamp: string;
  source: 'user' | 'automation' | 'system' | 'input';
}

export interface VariableScope {
  global: Record<string, Variable>;
  automation: Record<string, Variable>;
  execution: Record<string, Variable>;
}

/**
 * Enhanced variable management system for automations
 */
export class VariableManager {
  private logger: Logger;
  private scope: VariableScope;

  constructor() {
    this.logger = new Logger('VariableManager');
    this.scope = {
      global: {},
      automation: {},
      execution: {}
    };
  }

  /**
   * Initialize variables for an automation execution
   */
  initializeExecution(inputs: Record<string, any> = {}, automationVariables: VariableDefinition[] = []): void {
    // Clear execution scope
    this.scope.execution = {};

    // Process input variables
    for (const [name, value] of Object.entries(inputs)) {
      this.setVariable(name, value, 'input', 'execution');
    }

    // Initialize automation-defined variables
    for (const varDef of automationVariables) {
      if (!this.hasVariable(varDef.name, 'execution') && varDef.defaultValue !== undefined) {
        this.setVariable(varDef.name, varDef.defaultValue, 'automation', 'execution');
      }
    }

    this.logger.info('Variable execution initialized', {
      inputCount: Object.keys(inputs).length,
      automationVarCount: automationVariables.length,
      totalVars: Object.keys(this.scope.execution).length
    });
  }

  /**
   * Set a variable value
   */
  setVariable(
    name: string, 
    value: any, 
    source: Variable['source'] = 'automation',
    scopeLevel: keyof VariableScope = 'execution'
  ): Variable {
    const variable: Variable = {
      name,
      type: this.inferType(value),
      value: this.processValue(value),
      timestamp: new Date().toISOString(),
      source
    };

    this.scope[scopeLevel][name] = variable;

    this.logger.debug('Variable set', { name, type: variable.type, source, scopeLevel });
    return variable;
  }

  /**
   * Get a variable value with scope precedence: execution > automation > global
   */
  getVariable(name: string): Variable | undefined {
    return this.scope.execution[name] || 
           this.scope.automation[name] || 
           this.scope.global[name];
  }

  /**
   * Get variable value only
   */
  getVariableValue(name: string, defaultValue?: any): any {
    const variable = this.getVariable(name);
    return variable ? variable.value : defaultValue;
  }

  /**
   * Check if variable exists in any scope
   */
  hasVariable(name: string, scopeLevel?: keyof VariableScope): boolean {
    if (scopeLevel) {
      return name in this.scope[scopeLevel];
    }
    return !!(this.scope.execution[name] || this.scope.automation[name] || this.scope.global[name]);
  }

  /**
   * Get all variables in a specific scope
   */
  getVariablesByScope(scopeLevel: keyof VariableScope): Record<string, Variable> {
    return { ...this.scope[scopeLevel] };
  }

  /**
   * Get all variables across all scopes
   */
  getAllVariables(): Record<string, Variable> {
    return {
      ...this.scope.global,
      ...this.scope.automation,
      ...this.scope.execution
    };
  }

  /**
   * Process variable references in text ({{variableName}})
   */
  processVariableReferences(text: string): string {
    if (typeof text !== 'string') return text;

    return text.replace(/\{\{([^}]+)\}\}/g, (match, variableName) => {
      const trimmedName = variableName.trim();
      const value = this.getVariableValue(trimmedName);
      
      if (value === undefined || value === null) {
        this.logger.warn('Variable reference not found', { variableName: trimmedName, text });
        return match; // Keep original placeholder if variable not found
      }

      return String(value);
    });
  }

  /**
   * Process an entire configuration object for variable references
   */
  processConfigVariables(config: Record<string, any>): Record<string, any> {
    const processedConfig = { ...config };
    
    for (const [key, value] of Object.entries(processedConfig)) {
      if (typeof value === 'string') {
        processedConfig[key] = this.processVariableReferences(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        processedConfig[key] = this.processConfigVariables(value);
      } else if (Array.isArray(value)) {
        processedConfig[key] = value.map(item => 
          typeof item === 'string' ? this.processVariableReferences(item) :
          typeof item === 'object' && item !== null ? this.processConfigVariables(item) :
          item
        );
      }
    }
    
    return processedConfig;
  }

  /**
   * Validate variable against definition
   */
  validateVariable(value: any, definition: VariableDefinition): { valid: boolean; error?: string } {
    // Check required
    if (definition.required && (value === undefined || value === null || value === '')) {
      return { valid: false, error: `Variable '${definition.name}' is required` };
    }

    // Skip validation if value is empty and not required
    if (!definition.required && (value === undefined || value === null || value === '')) {
      return { valid: true };
    }

    // Type validation
    const expectedType = definition.type;
    const actualType = this.inferType(value);
    
    if (actualType !== expectedType) {
      // Allow some type coercion
      if (expectedType === 'text' && actualType !== 'object') {
        // Convert to string
        return { valid: true };
      } else if (expectedType === 'number' && typeof value === 'string' && !isNaN(Number(value))) {
        // Convert string to number
        return { valid: true };
      } else {
        return { valid: false, error: `Expected ${expectedType} but got ${actualType}` };
      }
    }

    // Additional validation
    if (definition.validation) {
      const validation = definition.validation;
      
      if (expectedType === 'text') {
        const strValue = String(value);
        
        if (validation.minLength && strValue.length < validation.minLength) {
          return { valid: false, error: `Must be at least ${validation.minLength} characters` };
        }
        
        if (validation.maxLength && strValue.length > validation.maxLength) {
          return { valid: false, error: `Must be no more than ${validation.maxLength} characters` };
        }
        
        if (validation.pattern && !new RegExp(validation.pattern).test(strValue)) {
          return { valid: false, error: 'Does not match required pattern' };
        }
        
        if (validation.options && !validation.options.includes(strValue)) {
          return { valid: false, error: `Must be one of: ${validation.options.join(', ')}` };
        }
      }
      
      if (expectedType === 'number') {
        const numValue = Number(value);
        
        if (validation.min !== undefined && numValue < validation.min) {
          return { valid: false, error: `Must be at least ${validation.min}` };
        }
        
        if (validation.max !== undefined && numValue > validation.max) {
          return { valid: false, error: `Must be no more than ${validation.max}` };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Infer variable type from value
   */
  private inferType(value: any): VariableType {
    if (value === null || value === undefined) return 'text';
    
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') {
      // Check if it's a date string
      if (/^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(Date.parse(value))) {
        return 'date';
      }
      return 'text';
    }
    if (Array.isArray(value)) return 'list';
    if (typeof value === 'object') {
      // Check for location-like objects
      if (value.latitude !== undefined && value.longitude !== undefined) {
        return 'location';
      }
      return 'object';
    }
    
    return 'text';
  }

  /**
   * Process and normalize value based on its type
   */
  private processValue(value: any): any {
    if (value === null || value === undefined) return value;
    
    const type = this.inferType(value);
    
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
      case 'date':
        if (typeof value === 'string') {
          return new Date(value).toISOString();
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      default:
        return value;
    }
  }

  /**
   * Clear all variables in execution scope
   */
  clearExecutionScope(): void {
    this.scope.execution = {};
    this.logger.debug('Execution scope cleared');
  }

  /**
   * Export variables for debugging or persistence
   */
  exportVariables(): VariableScope {
    return JSON.parse(JSON.stringify(this.scope));
  }

  /**
   * Import variables from external source
   */
  importVariables(variables: Partial<VariableScope>): void {
    if (variables.global) {
      this.scope.global = { ...this.scope.global, ...variables.global };
    }
    if (variables.automation) {
      this.scope.automation = { ...this.scope.automation, ...variables.automation };
    }
    if (variables.execution) {
      this.scope.execution = { ...this.scope.execution, ...variables.execution };
    }
    
    this.logger.info('Variables imported', {
      global: Object.keys(variables.global || {}).length,
      automation: Object.keys(variables.automation || {}).length,
      execution: Object.keys(variables.execution || {}).length
    });
  }

  /**
   * Create a summary of all variables for display
   */
  getVariableSummary(): Array<{
    name: string;
    type: VariableType;
    value: string;
    scope: keyof VariableScope;
    source: Variable['source'];
  }> {
    const summary: Array<{
      name: string;
      type: VariableType;
      value: string;
      scope: keyof VariableScope;
      source: Variable['source'];
    }> = [];

    // Add variables from each scope
    (['execution', 'automation', 'global'] as const).forEach(scopeLevel => {
      Object.values(this.scope[scopeLevel]).forEach(variable => {
        // Only add if not already added from higher precedence scope
        if (!summary.find(v => v.name === variable.name)) {
          summary.push({
            name: variable.name,
            type: variable.type,
            value: this.formatValueForDisplay(variable.value),
            scope: scopeLevel,
            source: variable.source
          });
        }
      });
    });

    return summary.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Format variable value for display
   */
  private formatValueForDisplay(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toString();
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  }
}

// Export singleton instance
export const variableManager = new VariableManager();