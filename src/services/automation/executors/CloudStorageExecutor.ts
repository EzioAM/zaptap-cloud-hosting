import * as FileSystem from 'expo-file-system';
import { BaseExecutor } from './BaseExecutor';
import { AutomationStep, ExecutionContext, ExecutionResult } from '../../../types';
import { cloudStorageService } from '../../storage/CloudStorageService';
import { securityService } from '../../security/SecurityService';

export class CloudStorageExecutor extends BaseExecutor {
  readonly stepType = 'cloud_storage';
  
  async execute(step: AutomationStep, context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.validateConfig(step.config);
      
      const action = step.config.action || 'upload';
      
      switch (action) {
        case 'upload':
          return await this.uploadToCloud(step, context, startTime);
        case 'download':
          return await this.downloadFromCloud(step, context, startTime);
        case 'list':
          return await this.listCloudFiles(step, context, startTime);
        case 'delete':
          return await this.deleteFromCloud(step, context, startTime);
        default:
          throw new Error(`Unknown cloud storage action: ${action}`);
      }
      
    } catch (error) {
      return this.handleError(error, startTime, 1, 0);
    }
  }

  private async uploadToCloud(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const fileName = this.replaceVariables(
      step.config.fileName || `file_${Date.now()}.txt`,
      context.variables || {}
    );
    const content = this.replaceVariables(
      step.config.content || '',
      context.variables || {}
    );
    const bucket = step.config.bucket || 'user-files';
    const isPublic = step.config.isPublic || false;
    const immediate = step.config.immediate !== false; // Default to immediate upload

    // Security validation
    const fileNameValidation = securityService.sanitizeTextInput(fileName, 100);
    if (!fileNameValidation.isValid) {
      throw new Error(`Invalid file name: ${fileNameValidation.errors.join(', ')}`);
    }

    const sanitizedFileName = fileNameValidation.sanitizedInput || fileName;
    
    // Use the cloud storage service for robust upload with offline support
    const uploadResult = await cloudStorageService.uploadFile(
      sanitizedFileName,
      content,
      bucket,
      { immediate, isPublic }
    );

    if (!uploadResult.success && immediate) {
      throw new Error(uploadResult.error || 'Failed to upload file');
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'cloud_storage',
        action: 'upload',
        fileName: sanitizedFileName,
        bucket,
        size: content.length,
        publicUrl: uploadResult.publicUrl,
        queued: !immediate || !uploadResult.success,
        timestamp: new Date().toISOString()
      }
    };

    // Store file path in variables for later use
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = sanitizedFileName;
      if (uploadResult.publicUrl) {
        context.variables[`${step.config.variableName}_url`] = uploadResult.publicUrl;
      }
    }

    this.logExecution(step, result);
    return result;
  }

  private async downloadFromCloud(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const fileName = this.replaceVariables(
      step.config.fileName || step.config.filePath || '',
      context.variables || {}
    );
    const bucket = step.config.bucket || 'user-files';
    const forceRefresh = step.config.forceRefresh || false;

    if (!fileName) {
      throw new Error('File name is required for download');
    }

    // Use the cloud storage service for robust download with caching
    const downloadResult = await cloudStorageService.downloadFile(
      fileName,
      bucket,
      { forceRefresh }
    );

    if (!downloadResult.success) {
      throw new Error(downloadResult.error || 'Failed to download file');
    }

    const content = downloadResult.content || '';

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'cloud_storage',
        action: 'download',
        fileName,
        bucket,
        size: content.length,
        content,
        fromCache: !forceRefresh,
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

  private async listCloudFiles(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const folder = this.replaceVariables(
      step.config.folder || '',
      context.variables || {}
    );
    const bucket = step.config.bucket || 'user-files';
    const limit = step.config.limit || 100;
    const offset = step.config.offset || 0;

    // Use the cloud storage service for robust listing with caching
    const listResult = await cloudStorageService.listFiles(
      folder,
      bucket,
      { limit, offset }
    );

    if (!listResult.success) {
      throw new Error(listResult.error || 'Failed to list files');
    }

    const files = listResult.files || [];

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'cloud_storage',
        action: 'list',
        folder,
        bucket,
        fileCount: files.length,
        files: files.map(f => ({
          name: f.name,
          size: f.metadata?.size,
          lastModified: f.updated_at
        })),
        timestamp: new Date().toISOString()
      }
    };

    // Store file list in variable if requested
    if (context.variables && step.config.variableName) {
      context.variables[step.config.variableName] = files;
    }

    this.logExecution(step, result);
    return result;
  }

  private async deleteFromCloud(step: AutomationStep, context: ExecutionContext, startTime: number): Promise<ExecutionResult> {
    const fileName = this.replaceVariables(
      step.config.fileName || step.config.filePath || '',
      context.variables || {}
    );
    const bucket = step.config.bucket || 'user-files';

    if (!fileName) {
      throw new Error('File name is required for deletion');
    }

    // Use the cloud storage service for robust deletion with offline support
    const deleteResult = await cloudStorageService.deleteFile(
      fileName,
      bucket
    );

    if (!deleteResult.success) {
      throw new Error(deleteResult.error || 'Failed to delete file');
    }

    const result: ExecutionResult = {
      success: true,
      executionTime: Date.now() - startTime,
      stepsCompleted: 1,
      totalSteps: 1,
      timestamp: new Date().toISOString(),
      output: {
        type: 'cloud_storage',
        action: 'delete',
        fileName,
        bucket,
        timestamp: new Date().toISOString()
      }
    };

    this.logExecution(step, result);
    return result;
  }
}