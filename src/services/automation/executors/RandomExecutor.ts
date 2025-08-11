import * as Crypto from 'expo-crypto';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';

export class RandomExecutor extends BaseExecutor {
  readonly stepType = 'random';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const type = step.config.type || 'number';
      
      switch (type) {
        case 'number':
          return await this.generateRandomNumber(step, context, startTime);
        case 'uuid':
          return await this.generateUUID(step, context, startTime);
        case 'string':
          return await this.generateRandomString(step, context, startTime);
        case 'choice':
          return await this.randomChoice(step, context, startTime);
        case 'shuffle':
          return await this.shuffleArray(step, context, startTime);
        case 'color':
          return await this.generateRandomColor(step, context, startTime);
        default:
          throw new Error(`Unknown random type: ${type}`);
      }
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }

  private async generateRandomNumber(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const min = parseInt(this.replaceVariables(
      step.config.min?.toString() || '0',
      context.variables || {}
    ));
    const max = parseInt(this.replaceVariables(
      step.config.max?.toString() || '100',
      context.variables || {}
    ));
    const decimals = step.config.decimals || 0;

    if (min >= max) {
      throw new Error('Minimum value must be less than maximum value');
    }

    let randomValue: number;
    
    if (decimals > 0) {
      // Generate random decimal number
      randomValue = Math.random() * (max - min) + min;
      randomValue = parseFloat(randomValue.toFixed(decimals));
    } else {
      // Generate random integer using crypto for better randomness
      const range = max - min + 1;
      const randomBytes = await Crypto.getRandomBytesAsync(4);
      const randomInt = new DataView(randomBytes.buffer).getUint32(0);
      randomValue = min + (randomInt % range);
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'random',
        subType: 'number',
        value: randomValue,
        min,
        max,
        decimals,
        timestamp: new Date().toISOString()
      }
    };

    // Store value in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = randomValue;
    }

    this.logExecution(step, result);
    return result;
  }

  private async generateUUID(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const version = step.config.version || 'v4';
    
    let uuid: string;
    if (version === 'v4') {
      uuid = Crypto.randomUUID();
    } else {
      // Fallback to custom implementation for other versions
      const randomBytes = await Crypto.getRandomBytesAsync(16);
      const hex = Array.from(new Uint8Array(randomBytes))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'random',
        subType: 'uuid',
        value: uuid,
        version,
        timestamp: new Date().toISOString()
      }
    };

    // Store UUID in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = uuid;
    }

    this.logExecution(step, result);
    return result;
  }

  private async generateRandomString(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const length = parseInt(this.replaceVariables(
      step.config.length?.toString() || '10',
      context.variables || {}
    ));
    const charset = step.config.charset || 'alphanumeric';
    const includeUppercase = step.config.includeUppercase !== false;
    const includeLowercase = step.config.includeLowercase !== false;
    const includeNumbers = step.config.includeNumbers !== false;
    const includeSymbols = step.config.includeSymbols || false;

    let characters = '';
    
    if (charset === 'custom') {
      characters = step.config.customCharset || 'abcdefghijklmnopqrstuvwxyz';
    } else {
      if (includeLowercase) characters += 'abcdefghijklmnopqrstuvwxyz';
      if (includeUppercase) characters += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (includeNumbers) characters += '0123456789';
      if (includeSymbols) characters += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    }

    if (!characters) {
      throw new Error('No characters available for random string generation');
    }

    // Generate random string using crypto for better randomness
    const randomBytes = await Crypto.getRandomBytesAsync(length);
    const randomString = Array.from(new Uint8Array(randomBytes))
      .map(byte => characters[byte % characters.length])
      .join('');

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'random',
        subType: 'string',
        value: randomString,
        length,
        charset,
        timestamp: new Date().toISOString()
      }
    };

    // Store string in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = randomString;
    }

    this.logExecution(step, result);
    return result;
  }

  private async randomChoice(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const choices = step.config.choices || [];
    
    if (choices.length === 0) {
      // Try to get choices from variable
      const choicesVar = step.config.choicesVariable;
      if (choicesVar && context.variables?.[choicesVar]) {
        const varValue = context.variables[choicesVar];
        if (Array.isArray(varValue)) {
          choices.push(...varValue);
        } else if (typeof varValue === 'string') {
          choices.push(...varValue.split(',').map(s => s.trim()));
        }
      }
    }

    if (choices.length === 0) {
      throw new Error('No choices available for random selection');
    }

    // Use crypto for better randomness
    const randomBytes = await Crypto.getRandomBytesAsync(4);
    const randomInt = new DataView(randomBytes.buffer).getUint32(0);
    const randomIndex = randomInt % choices.length;
    const selectedChoice = choices[randomIndex];

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'random',
        subType: 'choice',
        value: selectedChoice,
        choices,
        selectedIndex: randomIndex,
        timestamp: new Date().toISOString()
      }
    };

    // Store choice in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = selectedChoice;
    }

    this.logExecution(step, result);
    return result;
  }

  private async shuffleArray(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    let array = step.config.array || [];
    
    if (array.length === 0) {
      // Try to get array from variable
      const arrayVar = step.config.arrayVariable;
      if (arrayVar && context.variables?.[arrayVar]) {
        const varValue = context.variables[arrayVar];
        if (Array.isArray(varValue)) {
          array = [...varValue]; // Create copy to avoid mutating original
        } else if (typeof varValue === 'string') {
          array = varValue.split(',').map(s => s.trim());
        }
      }
    }

    if (array.length === 0) {
      throw new Error('No array available for shuffling');
    }

    // Fisher-Yates shuffle with crypto randomness
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const randomBytes = await Crypto.getRandomBytesAsync(4);
      const randomInt = new DataView(randomBytes.buffer).getUint32(0);
      const j = randomInt % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'random',
        subType: 'shuffle',
        value: shuffled,
        originalLength: array.length,
        timestamp: new Date().toISOString()
      }
    };

    // Store shuffled array in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = shuffled;
    }

    this.logExecution(step, result);
    return result;
  }

  private async generateRandomColor(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const format = step.config.format || 'hex';
    const includeAlpha = step.config.includeAlpha || false;

    // Generate random RGB values
    const randomBytes = await Crypto.getRandomBytesAsync(includeAlpha ? 4 : 3);
    const r = randomBytes[0];
    const g = randomBytes[1];
    const b = randomBytes[2];
    const a = includeAlpha ? randomBytes[3] / 255 : 1;

    let colorValue: string;
    
    switch (format) {
      case 'hex':
        colorValue = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        if (includeAlpha) {
          colorValue += Math.round(a * 255).toString(16).padStart(2, '0');
        }
        break;
      case 'rgb':
        colorValue = includeAlpha 
          ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
          : `rgb(${r}, ${g}, ${b})`;
        break;
      case 'hsl':
        // Convert RGB to HSL
        const rNorm = r / 255;
        const gNorm = g / 255;
        const bNorm = b / 255;
        const max = Math.max(rNorm, gNorm, bNorm);
        const min = Math.min(rNorm, gNorm, bNorm);
        const l = (max + min) / 2;
        let h = 0;
        let s = 0;
        
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case rNorm:
              h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
              break;
            case gNorm:
              h = ((bNorm - rNorm) / d + 2) / 6;
              break;
            case bNorm:
              h = ((rNorm - gNorm) / d + 4) / 6;
              break;
          }
        }
        
        const hDeg = Math.round(h * 360);
        const sPercent = Math.round(s * 100);
        const lPercent = Math.round(l * 100);
        
        colorValue = includeAlpha
          ? `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${a.toFixed(2)})`
          : `hsl(${hDeg}, ${sPercent}%, ${lPercent}%)`;
        break;
      default:
        colorValue = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'random',
        subType: 'color',
        value: colorValue,
        format,
        rgb: { r, g, b, a },
        timestamp: new Date().toISOString()
      }
    };

    // Store color in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = colorValue;
    }

    this.logExecution(step, result);
    return result;
  }
}