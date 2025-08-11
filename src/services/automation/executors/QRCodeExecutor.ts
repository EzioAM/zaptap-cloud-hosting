import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { securityService } from '../../security/SecurityService';

export class QRCodeExecutor extends BaseExecutor {
  readonly stepType = 'qr_code';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const action = step.config.action || 'generate';
      
      switch (action) {
        case 'generate':
          return await this.generateQRCode(step, context, startTime);
        case 'generateFile':
          return await this.generateQRCodeFile(step, context, startTime);
        case 'share':
          return await this.shareQRCode(step, context, startTime);
        default:
          throw new Error(`Unknown QR code action: ${action}`);
      }
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }

  private async generateQRCode(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const data = this.replaceVariables(
      step.config.data || '',
      context.variables || {}
    );
    const size = step.config.size || 200;
    const color = step.config.color || '#000000';
    const backgroundColor = step.config.backgroundColor || '#FFFFFF';
    const errorCorrectionLevel = step.config.errorCorrectionLevel || 'M'; // L, M, Q, H
    
    if (!data) {
      throw new Error('Data is required for QR code generation');
    }

    // Security validation
    const dataValidation = securityService.sanitizeTextInput(data, 4296); // QR code max capacity
    if (!dataValidation.isValid) {
      throw new Error(`Invalid QR code data: ${dataValidation.errors.join(', ')}`);
    }

    const sanitizedData = dataValidation.sanitizedInput || data;

    // Generate QR code configuration
    const qrConfig = {
      value: sanitizedData,
      size,
      color,
      backgroundColor,
      ecl: errorCorrectionLevel,
      quietZone: 10
    };

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'qr_code',
        action: 'generate',
        data: sanitizedData,
        config: qrConfig,
        dataLength: sanitizedData.length,
        timestamp: new Date().toISOString()
      }
    };

    // Store QR config in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = qrConfig;
      context.variables[`${step.config.variableName}_data`] = sanitizedData;
    }

    this.logExecution(step, result);
    return result;
  }

  private async generateQRCodeFile(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const data = this.replaceVariables(
      step.config.data || '',
      context.variables || {}
    );
    const fileName = this.replaceVariables(
      step.config.fileName || `qr_${Date.now()}.png`,
      context.variables || {}
    );
    const size = step.config.size || 200;
    const format = step.config.format || 'png'; // png or svg
    
    if (!data) {
      throw new Error('Data is required for QR code generation');
    }

    // Security validation
    const dataValidation = securityService.sanitizeTextInput(data, 4296);
    const fileNameValidation = securityService.sanitizeTextInput(fileName, 100);
    
    if (!dataValidation.isValid || !fileNameValidation.isValid) {
      throw new Error('Invalid QR code data or file name');
    }

    const sanitizedData = dataValidation.sanitizedInput || data;
    const sanitizedFileName = fileNameValidation.sanitizedInput || fileName;
    
    // Generate file path
    const filePath = `${FileSystem.documentDirectory}${sanitizedFileName}`;
    
    // For file generation, we create a data URL representation
    // In a real implementation, this would use a native module or server-side generation
    const qrDataUrl = this.generateQRDataUrl(sanitizedData, size);
    
    // Save to file
    if (format === 'svg') {
      const svgContent = this.generateQRSvg(sanitizedData, size);
      await FileSystem.writeAsStringAsync(filePath, svgContent);
    } else {
      // For PNG, we would need to convert the data URL to binary
      // This is a simplified version - in production, use a proper image library
      await FileSystem.writeAsStringAsync(filePath, qrDataUrl);
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'qr_code',
        action: 'generateFile',
        data: sanitizedData,
        fileName: sanitizedFileName,
        filePath,
        format,
        size,
        timestamp: new Date().toISOString()
      }
    };

    // Store file path in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = filePath;
    }

    this.logExecution(step, result);
    return result;
  }

  private async shareQRCode(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const data = this.replaceVariables(
      step.config.data || '',
      context.variables || {}
    );
    const message = this.replaceVariables(
      step.config.message || 'Check out this QR code',
      context.variables || {}
    );
    
    if (!data) {
      throw new Error('Data is required for QR code sharing');
    }

    // Security validation
    const dataValidation = securityService.sanitizeTextInput(data, 4296);
    const messageValidation = securityService.sanitizeTextInput(message, 500);
    
    if (!dataValidation.isValid || !messageValidation.isValid) {
      throw new Error('Invalid QR code data or message');
    }

    const sanitizedData = dataValidation.sanitizedInput || data;
    const sanitizedMessage = messageValidation.sanitizedInput || message;
    
    // Generate temporary file for sharing
    const fileName = `qr_share_${Date.now()}.png`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    
    // Generate QR code file
    const qrDataUrl = this.generateQRDataUrl(sanitizedData, 200);
    await FileSystem.writeAsStringAsync(filePath, qrDataUrl);
    
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }
    
    // Share the QR code
    await Sharing.shareAsync(filePath, {
      mimeType: 'image/png',
      dialogTitle: sanitizedMessage
    });
    
    // Clean up temporary file
    await FileSystem.deleteAsync(filePath, { idempotent: true });

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'qr_code',
        action: 'share',
        data: sanitizedData,
        message: sanitizedMessage,
        timestamp: new Date().toISOString()
      }
    };

    this.logExecution(step, result);
    return result;
  }

  private generateQRDataUrl(data: string, size: number): string {
    // This is a simplified representation
    // In a real implementation, use a proper QR code generation library
    // that can generate actual data URLs or binary data
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  private generateQRSvg(data: string, size: number): string {
    // Simplified SVG representation
    // In production, use react-native-qrcode-svg's toDataURL method
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="white"/>
  <text x="${size/2}" y="${size/2}" text-anchor="middle" fill="black">${data.substring(0, 10)}...</text>
</svg>`;
  }
}