/**
 * SecurityService.ts
 * Core security service for input validation, sanitization, and safety checks
 * Provides comprehensive security validation for all user inputs and operations
 */

import { Alert, Linking } from 'react-native';
import { Logger } from '../../utils/Logger';
import { AutomationStep, AutomationData } from '../../types';

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedInput?: any;
}

export interface SecurityConfig {
  allowLocalNetwork: boolean;
  allowDangerousOperations: boolean;
  maxSMSLength: number;
  maxEmailLength: number;
  maxWebhookTimeout: number;
  allowedDomains: string[];
  blockedDomains: string[];
}

class SecurityService {
  private static instance: SecurityService;
  private logger: Logger;
  
  private readonly DEFAULT_CONFIG: SecurityConfig = {
    allowLocalNetwork: false,
    allowDangerousOperations: false,
    maxSMSLength: 1600,
    maxEmailLength: 10000,
    maxWebhookTimeout: 30000,
    allowedDomains: [],
    blockedDomains: [
      'localhost',
      '127.0.0.1',
      '192.168.',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
    ],
  };

  private config: SecurityConfig;

  private constructor() {
    this.logger = new Logger('SecurityService');
    this.config = { ...this.DEFAULT_CONFIG };
  }

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Security configuration updated');
  }

  /**
   * Get current security configuration
   */
  public getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Sanitize and validate text input
   */
  public sanitizeTextInput(input: string, maxLength?: number): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof input !== 'string') {
      errors.push('Input must be a string');
      return { isValid: false, errors, warnings };
    }

    // Remove potentially dangerous characters and control characters
    let sanitized = input
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript protocols
      .replace(/data:/gi, '') // Remove data URLs
      .replace(/vbscript:/gi, '') // Remove vbscript protocols
      .trim();

    // Check length
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      warnings.push(`Text truncated to ${maxLength} characters`);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\beval\b/i,
      /\bexec\b/i,
      /\bsystem\b/i,
      /\bshell\b/i,
      /\brequire\b/i,
      /\bimport\b/i,
      /__.*__/,
      /\$\{.*\}/,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(sanitized)) {
        warnings.push('Input contains potentially suspicious content');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedInput: sanitized,
    };
  }

  /**
   * Validate email address format
   */
  public validateEmailAddress(email: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!email || typeof email !== 'string') {
      errors.push('Email address is required');
      return { isValid: false, errors, warnings };
    }

    // Basic email regex - not perfect but good enough for security validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(email)) {
      errors.push('Invalid email address format');
    }

    // Check length
    if (email.length > 254) {
      errors.push('Email address too long');
    }

    // Check for suspicious patterns
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      errors.push('Email address contains invalid patterns');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedInput: email.toLowerCase().trim(),
    };
  }

  /**
   * Validate phone number format
   */
  public validatePhoneNumber(phone: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!phone || typeof phone !== 'string') {
      errors.push('Phone number is required');
      return { isValid: false, errors, warnings };
    }

    // Remove common formatting characters
    const sanitized = phone.replace(/[\s\-\(\)\+\.]/g, '');

    // Check if only digits remain (with optional leading + for international)
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    
    if (!phoneRegex.test(sanitized)) {
      errors.push('Invalid phone number format');
    }

    // Check length
    if (sanitized.length < 7 || sanitized.length > 15) {
      errors.push('Phone number must be between 7 and 15 digits');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedInput: sanitized,
    };
  }

  /**
   * Validate URL and check for security issues
   */
  public validateURL(url: string, allowLocal: boolean = false): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!url || typeof url !== 'string') {
      errors.push('URL is required');
      return { isValid: false, errors, warnings };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch (error) {
      errors.push('Invalid URL format');
      return { isValid: false, errors, warnings };
    }

    // Only allow HTTP(S) protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      errors.push('Only HTTP and HTTPS URLs are allowed');
    }

    // Check for local/private network addresses unless explicitly allowed
    if (!allowLocal && !this.config.allowLocalNetwork) {
      const hostname = parsedUrl.hostname;
      
      // Check for blocked domains/IPs
      for (const blocked of this.config.blockedDomains) {
        if (hostname.includes(blocked)) {
          errors.push('Local network URLs are not allowed');
          break;
        }
      }

      // Additional checks for private IP ranges
      if (this.isPrivateIP(hostname)) {
        errors.push('Private IP addresses are not allowed');
      }
    }

    // Check against allowed domains if configured
    if (this.config.allowedDomains.length > 0) {
      const isAllowed = this.config.allowedDomains.some(domain => 
        parsedUrl.hostname.endsWith(domain)
      );
      if (!isAllowed) {
        errors.push('Domain not in allowed list');
      }
    }

    // Check for suspicious URL patterns
    if (url.includes('..') || url.includes('%2e%2e')) {
      warnings.push('URL contains path traversal patterns');
    }

    if (parsedUrl.username || parsedUrl.password) {
      warnings.push('URL contains embedded credentials');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedInput: parsedUrl.toString(),
    };
  }

  /**
   * Validate automation step for security issues
   */
  public validateAutomationStep(step: AutomationStep): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!step || !step.type) {
      errors.push('Invalid step configuration');
      return { isValid: false, errors, warnings };
    }

    // Validate step-specific configurations
    switch (step.type) {
      case 'sms':
        if (step.config.phoneNumber) {
          const phoneValidation = this.validatePhoneNumber(step.config.phoneNumber);
          errors.push(...phoneValidation.errors);
          warnings.push(...phoneValidation.warnings);
        }
        if (step.config.message) {
          const messageValidation = this.sanitizeTextInput(step.config.message, this.config.maxSMSLength);
          errors.push(...messageValidation.errors);
          warnings.push(...messageValidation.warnings);
        }
        break;

      case 'email':
        if (step.config.email) {
          const emailValidation = this.validateEmailAddress(step.config.email);
          errors.push(...emailValidation.errors);
          warnings.push(...emailValidation.warnings);
        }
        if (step.config.message) {
          const messageValidation = this.sanitizeTextInput(step.config.message, this.config.maxEmailLength);
          errors.push(...messageValidation.errors);
          warnings.push(...messageValidation.warnings);
        }
        break;

      case 'webhook':
        if (step.config.url) {
          const urlValidation = this.validateURL(step.config.url);
          errors.push(...urlValidation.errors);
          warnings.push(...urlValidation.warnings);
        }
        if (!this.config.allowDangerousOperations) {
          warnings.push('Webhook operations require user confirmation');
        }
        break;

      case 'notification':
        if (step.config.message) {
          const messageValidation = this.sanitizeTextInput(step.config.message, 500);
          errors.push(...messageValidation.errors);
          warnings.push(...messageValidation.warnings);
        }
        break;

      default:
        // Generic validation for other step types
        if (step.config) {
          for (const [key, value] of Object.entries(step.config)) {
            if (typeof value === 'string') {
              const textValidation = this.sanitizeTextInput(value, 10000);
              if (!textValidation.isValid) {
                warnings.push(`Invalid content in ${key}: ${textValidation.errors.join(', ')}`);
              }
            }
          }
        }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate entire automation for security issues
   */
  public validateAutomation(automation: AutomationData): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!automation || !automation.steps) {
      errors.push('Invalid automation configuration');
      return { isValid: false, errors, warnings };
    }

    // Validate title and description
    if (automation.title) {
      const titleValidation = this.sanitizeTextInput(automation.title, 200);
      errors.push(...titleValidation.errors);
      warnings.push(...titleValidation.warnings);
    }

    if (automation.description) {
      const descValidation = this.sanitizeTextInput(automation.description, 1000);
      errors.push(...descValidation.errors);
      warnings.push(...descValidation.warnings);
    }

    // Validate each step
    for (let i = 0; i < automation.steps.length; i++) {
      const step = automation.steps[i];
      const stepValidation = this.validateAutomationStep(step);
      
      if (!stepValidation.isValid) {
        errors.push(...stepValidation.errors.map(err => `Step ${i + 1}: ${err}`));
      }
      warnings.push(...stepValidation.warnings.map(warn => `Step ${i + 1}: ${warn}`));
    }

    // Check for dangerous step combinations
    const dangerousSteps = automation.steps.filter(step => 
      ['sms', 'email', 'webhook'].includes(step.type)
    );

    if (dangerousSteps.length > 0 && !this.config.allowDangerousOperations) {
      warnings.push('This automation contains operations that require user confirmation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Show security warning dialog to user
   */
  public async showSecurityWarning(
    title: string, 
    message: string, 
    warnings: string[]
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const warningText = warnings.length > 0 
        ? `\n\nWarnings:\n• ${warnings.join('\n• ')}`
        : '';

      Alert.alert(
        title,
        message + warningText,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Continue',
            style: 'destructive',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  /**
   * Check if an IP address is in a private range
   */
  private isPrivateIP(hostname: string): boolean {
    // IPv4 private ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./, // Link-local
      /^224\./, // Multicast
    ];

    return privateRanges.some(range => range.test(hostname));
  }

  /**
   * Sanitize object by recursively validating all string properties
   */
  public sanitizeObject(obj: any, maxDepth: number = 10): any {
    if (maxDepth <= 0 || obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      const validation = this.sanitizeTextInput(obj);
      return validation.sanitizedInput || obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, maxDepth - 1));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize the key as well
        const keyValidation = this.sanitizeTextInput(key, 100);
        const sanitizedKey = keyValidation.sanitizedInput || key;
        sanitized[sanitizedKey] = this.sanitizeObject(value, maxDepth - 1);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Check if operation requires user confirmation
   */
  public requiresConfirmation(stepType: string): boolean {
    const dangerousSteps = ['sms', 'email', 'webhook', 'photo', 'location'];
    return dangerousSteps.includes(stepType) && !this.config.allowDangerousOperations;
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: string, details: any): void {
    this.logger.warn(`Security event: ${event}`, details);
  }
}

export const securityService = SecurityService.getInstance();
export default securityService;