import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { securityService } from '../../security/SecurityService';

export class FileExecutor extends BaseExecutor {
  readonly stepType = 'file';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const action = step.config.action || 'read';
      
      switch (action) {
        case 'read':
          return await this.readFile(step, context, startTime);
        case 'write':
          return await this.writeFile(step, context, startTime);
        case 'append':
          return await this.appendFile(step, context, startTime);
        case 'delete':
          return await this.deleteFile(step, context, startTime);
        case 'pick':
          return await this.pickFile(step, context, startTime);
        case 'info':
          return await this.getFileInfo(step, context, startTime);
        default:
          throw new Error(`Unknown file action: ${action}`);
      }
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }

  private getFilePath(fileName: string): string {
    // Use app's document directory for file operations
    return `${FileSystem.documentDirectory}${fileName}`;
  }

  private async readFile(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const fileName = this.replaceVariables(
      step.config.fileName || '',
      context.variables || {}
    );
    const encoding = step.config.encoding || FileSystem.EncodingType.UTF8;

    if (!fileName) {
      throw new Error('File name is required for read operation');
    }

    // Security validation
    const fileNameValidation = securityService.sanitizeTextInput(fileName, 100);
    if (!fileNameValidation.isValid) {
      throw new Error(`Invalid file name: ${fileNameValidation.errors.join(', ')}`);
    }

    const sanitizedFileName = fileNameValidation.sanitizedInput || fileName;
    const filePath = this.getFilePath(sanitizedFileName);

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error(`File not found: ${sanitizedFileName}`);
    }

    // Read file content
    const content = await FileSystem.readAsStringAsync(filePath, {
      encoding
    });

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'file',
        action: 'read',
        fileName: sanitizedFileName,
        filePath,
        size: fileInfo.size,
        content,
        timestamp: new Date().toISOString()
      }
    };

    // Store content in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = content;
    }

    this.logExecution(step, result);
    return result;
  }

  private async writeFile(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const fileName = this.replaceVariables(
      step.config.fileName || `file_${Date.now()}.txt`,
      context.variables || {}
    );
    const content = this.replaceVariables(
      step.config.content || '',
      context.variables || {}
    );
    const encoding = step.config.encoding || FileSystem.EncodingType.UTF8;

    // Security validation
    const fileNameValidation = securityService.sanitizeTextInput(fileName, 100);
    if (!fileNameValidation.isValid) {
      throw new Error(`Invalid file name: ${fileNameValidation.errors.join(', ')}`);
    }

    const contentValidation = securityService.sanitizeTextInput(content, 1000000); // 1MB limit
    if (!contentValidation.isValid) {
      throw new Error(`Invalid content: ${contentValidation.errors.join(', ')}`);
    }

    const sanitizedFileName = fileNameValidation.sanitizedInput || fileName;
    const sanitizedContent = contentValidation.sanitizedInput || content;
    const filePath = this.getFilePath(sanitizedFileName);

    // Write file
    await FileSystem.writeAsStringAsync(filePath, sanitizedContent, {
      encoding
    });

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'file',
        action: 'write',
        fileName: sanitizedFileName,
        filePath,
        size: fileInfo.size,
        contentLength: sanitizedContent.length,
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

  private async appendFile(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const fileName = this.replaceVariables(
      step.config.fileName || '',
      context.variables || {}
    );
    const content = this.replaceVariables(
      step.config.content || '',
      context.variables || {}
    );
    const encoding = step.config.encoding || FileSystem.EncodingType.UTF8;

    if (!fileName) {
      throw new Error('File name is required for append operation');
    }

    // Security validation
    const fileNameValidation = securityService.sanitizeTextInput(fileName, 100);
    const contentValidation = securityService.sanitizeTextInput(content, 100000); // 100KB limit for append

    if (!fileNameValidation.isValid || !contentValidation.isValid) {
      throw new Error('Invalid file name or content');
    }

    const sanitizedFileName = fileNameValidation.sanitizedInput || fileName;
    const sanitizedContent = contentValidation.sanitizedInput || content;
    const filePath = this.getFilePath(sanitizedFileName);

    // Check if file exists, create if not
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    let existingContent = '';
    
    if (fileInfo.exists) {
      existingContent = await FileSystem.readAsStringAsync(filePath, { encoding });
    }

    // Append content
    const newContent = existingContent + sanitizedContent;
    await FileSystem.writeAsStringAsync(filePath, newContent, { encoding });

    // Get updated file info
    const updatedFileInfo = await FileSystem.getInfoAsync(filePath);

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'file',
        action: 'append',
        fileName: sanitizedFileName,
        filePath,
        size: updatedFileInfo.size,
        appendedLength: sanitizedContent.length,
        timestamp: new Date().toISOString()
      }
    };

    this.logExecution(step, result);
    return result;
  }

  private async deleteFile(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const fileName = this.replaceVariables(
      step.config.fileName || '',
      context.variables || {}
    );

    if (!fileName) {
      throw new Error('File name is required for delete operation');
    }

    // Security validation
    const fileNameValidation = securityService.sanitizeTextInput(fileName, 100);
    if (!fileNameValidation.isValid) {
      throw new Error(`Invalid file name: ${fileNameValidation.errors.join(', ')}`);
    }

    const sanitizedFileName = fileNameValidation.sanitizedInput || fileName;
    const filePath = this.getFilePath(sanitizedFileName);

    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error(`File not found: ${sanitizedFileName}`);
    }

    // Delete file
    await FileSystem.deleteAsync(filePath);

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'file',
        action: 'delete',
        fileName: sanitizedFileName,
        filePath,
        timestamp: new Date().toISOString()
      }
    };

    this.logExecution(step, result);
    return result;
  }

  private async pickFile(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const fileType = step.config.fileType || '*/*';
    const copyToCacheDirectory = step.config.copyToCacheDirectory !== false;

    // Use document picker to let user select a file
    const result = await DocumentPicker.getDocumentAsync({
      type: fileType,
      copyToCacheDirectory
    });

    if (result.canceled) {
      throw new Error('File selection was cancelled');
    }

    const file = result.assets[0];
    
    // Read file content if requested
    let content = null;
    if (step.config.readContent) {
      content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8
      });
    }

    const executionResult: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'file',
        action: 'pick',
        fileName: file.name,
        fileUri: file.uri,
        mimeType: file.mimeType,
        size: file.size,
        content,
        timestamp: new Date().toISOString()
      }
    };

    // Store file info in variables
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = file.uri;
      context.variables[`${step.config.variableName}_name`] = file.name;
      if (content) {
        context.variables[`${step.config.variableName}_content`] = content;
      }
    }

    this.logExecution(step, executionResult);
    return executionResult;
  }

  private async getFileInfo(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const fileName = this.replaceVariables(
      step.config.fileName || '',
      context.variables || {}
    );

    if (!fileName) {
      throw new Error('File name is required for info operation');
    }

    // Security validation
    const fileNameValidation = securityService.sanitizeTextInput(fileName, 100);
    if (!fileNameValidation.isValid) {
      throw new Error(`Invalid file name: ${fileNameValidation.errors.join(', ')}`);
    }

    const sanitizedFileName = fileNameValidation.sanitizedInput || fileName;
    const filePath = this.getFilePath(sanitizedFileName);

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'file',
        action: 'info',
        fileName: sanitizedFileName,
        filePath,
        exists: fileInfo.exists,
        size: fileInfo.size,
        modificationTime: fileInfo.modificationTime,
        isDirectory: fileInfo.isDirectory,
        timestamp: new Date().toISOString()
      }
    };

    // Store info in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = fileInfo;
    }

    this.logExecution(step, result);
    return result;
  }
}