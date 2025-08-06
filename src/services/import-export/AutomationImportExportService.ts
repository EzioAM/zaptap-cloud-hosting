import { AutomationData } from '../../types';
import { supabase } from '../supabase/client';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { EventLogger } from '../../utils/EventLogger';

export interface ExportFormat {
  type: 'json' | 'shortcuts' | 'backup';
  extension: string;
  mimeType: string;
  description: string;
}

export interface ImportResult {
  success: boolean;
  automations?: AutomationData[];
  skipped?: number;
  errors?: string[];
  message?: string;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  message?: string;
  error?: string;
}

export class AutomationImportExportService {
  private static instance: AutomationImportExportService;

  private constructor() {}

  static getInstance(): AutomationImportExportService {
    if (!AutomationImportExportService.instance) {
      AutomationImportExportService.instance = new AutomationImportExportService();
    }
    return AutomationImportExportService.instance;
  }

  /**
   * Export automations in various formats
   */
  async exportAutomations(
    automations: AutomationData[],
    format: ExportFormat['type'] = 'json',
    includeMetadata: boolean = true
  ): Promise<ExportResult> {
    try {
      if (!automations.length) {
        return {
          success: false,
          message: 'No automations to export',
        };
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `shortcutslike-export-${timestamp}`;
      
      let exportData: any;
      let fileExtension: string;
      let mimeType: string;

      switch (format) {
        case 'json':
          exportData = this.createJSONExport(automations, includeMetadata);
          fileExtension = 'json';
          mimeType = 'application/json';
          break;
          
        case 'shortcuts':
          exportData = this.createShortcutsFormat(automations);
          fileExtension = 'shortcuts';
          mimeType = 'application/json';
          break;
          
        case 'backup':
          exportData = await this.createBackupFormat(automations);
          fileExtension = 'slbackup';
          mimeType = 'application/json';
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Write file to temporary directory
      const fullFileName = `${fileName}.${fileExtension}`;
      const filePath = `${FileSystem.documentDirectory}${fullFileName}`;
      
      await FileSystem.writeAsStringAsync(
        filePath, 
        JSON.stringify(exportData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType,
          dialogTitle: 'Export Automations',
        });
      }

      return {
        success: true,
        filePath,
        fileName: fullFileName,
        message: `Successfully exported ${automations.length} automation${automations.length !== 1 ? 's' : ''}`,
      };

    } catch (error: any) {
      EventLogger.error('Automation', 'Export failed:', error as Error);
      return {
        success: false,
        error: error.message || 'Export failed',
      };
    }
  }

  /**
   * Import automations from various formats
   */
  async importAutomations(userId: string): Promise<ImportResult> {
    try {
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return {
          success: false,
          message: 'Import cancelled',
        };
      }

      const file = result.assets[0];
      if (!file) {
        throw new Error('No file selected');
      }

      // Read file content
      const content = await FileSystem.readAsStringAsync(file.uri);
      let importData: any;

      try {
        importData = JSON.parse(content);
      } catch (parseError) {
        throw new Error('Invalid file format. Please select a valid automation export file.');
      }

      // Determine import format and process
      let automations: AutomationData[];
      
      if (this.isShortcutsLikeExport(importData)) {
        automations = this.processShortcutsLikeImport(importData, userId);
      } else if (this.isShortcutsFormat(importData)) {
        automations = this.processShortcutsImport(importData, userId);
      } else if (this.isBackupFormat(importData)) {
        automations = this.processBackupImport(importData, userId);
      } else {
        throw new Error('Unrecognized file format. Please select a valid automation export file.');
      }

      // Import to database
      const importResult = await this.saveImportedAutomations(automations, userId);

      return {
        success: true,
        automations: importResult.imported,
        skipped: importResult.skipped,
        errors: importResult.errors,
        message: `Successfully imported ${importResult.imported.length} automation${importResult.imported.length !== 1 ? 's' : ''}${
          importResult.skipped > 0 ? ` (${importResult.skipped} skipped)` : ''
        }`,
      };

    } catch (error: any) {
      EventLogger.error('Automation', 'Import failed:', error as Error);
      return {
        success: false,
        message: error.message || 'Import failed',
      };
    }
  }

  /**
   * Export user's entire automation library
   */
  async exportUserLibrary(userId: string, format: ExportFormat['type'] = 'backup'): Promise<ExportResult> {
    try {
      // Fetch all user automations
      const { data: automations, error } = await supabase
        .from('automations')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch automations: ${error.message}`);
      }

      if (!automations?.length) {
        return {
          success: false,
          message: 'No automations found to export',
        };
      }

      return await this.exportAutomations(automations, format, true);

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to export library',
      };
    }
  }

  /**
   * Create a shareable automation package
   */
  async createAutomationPackage(
    automations: AutomationData[],
    packageName: string,
    description?: string
  ): Promise<ExportResult> {
    try {
      const packageData = {
        name: packageName,
        description: description || `Package containing ${automations.length} automation${automations.length !== 1 ? 's' : ''}`,
        version: '1.0.0',
        created_at: new Date().toISOString(),
        app_version: '2.0.0',
        automations: automations.map(automation => ({
          ...automation,
          // Remove user-specific data
          id: undefined,
          created_by: undefined,
          is_public: false,
          execution_count: 0,
          average_rating: 0,
          rating_count: 0,
        })),
        metadata: {
          total_steps: automations.reduce((sum, a) => sum + (a.steps?.length || 0), 0),
          categories: [...new Set(automations.map(a => a.category))],
          tags: [...new Set(automations.flatMap(a => a.tags || []))],
        },
      };

      const fileName = `${packageName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-package.slpkg`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(packageData, null, 2),
        { encoding: FileSystem.EncodingType.UTF8 }
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/json',
          dialogTitle: 'Share Automation Package',
        });
      }

      return {
        success: true,
        filePath,
        fileName,
        message: 'Automation package created successfully',
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create package',
      };
    }
  }

  /**
   * Get available export formats
   */
  getExportFormats(): ExportFormat[] {
    return [
      {
        type: 'json',
        extension: 'json',
        mimeType: 'application/json',
        description: 'Standard JSON format for easy sharing and backup',
      },
      {
        type: 'shortcuts',
        extension: 'shortcuts',
        mimeType: 'application/json',
        description: 'Apple Shortcuts compatible format',
      },
      {
        type: 'backup',
        extension: 'slbackup',
        mimeType: 'application/json',
        description: 'Complete backup including metadata and settings',
      },
    ];
  }

  // Private helper methods

  private createJSONExport(automations: AutomationData[], includeMetadata: boolean): any {
    const baseExport = {
      format: 'shortcutslike-json',
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      automations: automations.map(automation => ({
        ...automation,
        // Clean up for export
        id: includeMetadata ? automation.id : undefined,
        created_by: includeMetadata ? automation.created_by : undefined,
      })),
    };

    if (includeMetadata) {
      return {
        ...baseExport,
        metadata: {
          total_automations: automations.length,
          total_steps: automations.reduce((sum, a) => sum + (a.steps?.length || 0), 0),
          categories: [...new Set(automations.map(a => a.category))],
          average_rating: automations.reduce((sum, a) => sum + (a.average_rating || 0), 0) / automations.length,
        },
      };
    }

    return baseExport;
  }

  private createShortcutsFormat(automations: AutomationData[]): any {
    return {
      format: 'shortcuts-compatible',
      version: '1.0.0',
      shortcuts: automations.map(automation => ({
        name: automation.title,
        description: automation.description,
        actions: automation.steps?.map(step => ({
          identifier: step.type,
          parameters: step.config || {},
          enabled: step.enabled,
        })) || [],
        metadata: {
          category: automation.category,
          tags: automation.tags,
        },
      })),
    };
  }

  private async createBackupFormat(automations: AutomationData[]): Promise<any> {
    return {
      format: 'shortcutslike-backup',
      version: '2.0.0',
      created_at: new Date().toISOString(),
      app_version: '2.0.0',
      backup_type: 'full',
      data: {
        automations,
        preferences: {
          // Could include user preferences here
        },
        metadata: {
          total_automations: automations.length,
          backup_size: JSON.stringify(automations).length,
        },
      },
    };
  }

  private isShortcutsLikeExport(data: any): boolean {
    return data?.format === 'shortcutslike-json' || data?.format === 'shortcutslike-backup';
  }

  private isShortcutsFormat(data: any): boolean {
    return data?.format === 'shortcuts-compatible' || Array.isArray(data?.shortcuts);
  }

  private isBackupFormat(data: any): boolean {
    return data?.format === 'shortcutslike-backup' && data?.backup_type;
  }

  private processShortcutsLikeImport(data: any, userId: string): AutomationData[] {
    const automations = data.automations || data.data?.automations || [];
    
    return automations.map((automation: any) => ({
      ...automation,
      id: undefined, // Will be generated by database
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      execution_count: 0,
      average_rating: 0,
      rating_count: 0,
    }));
  }

  private processShortcutsImport(data: any, userId: string): AutomationData[] {
    const shortcuts = data.shortcuts || [];
    
    return shortcuts.map((shortcut: any) => ({
      title: shortcut.name || 'Imported Shortcut',
      description: shortcut.description || 'Imported from Shortcuts',
      steps: shortcut.actions?.map((action: any, index: number) => ({
        id: `step_${index}`,
        type: this.mapShortcutActionType(action.identifier),
        title: action.identifier,
        enabled: action.enabled !== false,
        config: action.parameters || {},
      })) || [],
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      category: shortcut.metadata?.category || 'general',
      tags: shortcut.metadata?.tags || ['imported'],
      execution_count: 0,
      average_rating: 0,
      rating_count: 0,
    }));
  }

  private processBackupImport(data: any, userId: string): AutomationData[] {
    return this.processShortcutsLikeImport(data, userId);
  }

  private mapShortcutActionType(identifier: string): string {
    const mapping: Record<string, string> = {
      'is.workflow.actions.notification': 'notification',
      'is.workflow.actions.delay': 'delay',
      'is.workflow.actions.text': 'text',
      'is.workflow.actions.sms': 'sms',
      'is.workflow.actions.email': 'email',
      'is.workflow.actions.url': 'webhook',
      'is.workflow.actions.location': 'location',
      'is.workflow.actions.photo': 'photo',
      'is.workflow.actions.clipboard': 'clipboard',
      'is.workflow.actions.openapp': 'app',
    };
    
    return mapping[identifier] || 'text';
  }

  private async saveImportedAutomations(
    automations: AutomationData[],
    userId: string
  ): Promise<{
    imported: AutomationData[];
    skipped: number;
    errors: string[];
  }> {
    const imported: AutomationData[] = [];
    const errors: string[] = [];
    let skipped = 0;

    for (const automation of automations) {
      try {
        // Check for duplicates (by title and user)
        const { data: existing } = await supabase
          .from('automations')
          .select('id')
          .eq('title', automation.title)
          .eq('created_by', userId)
          .limit(1);

        if (existing?.length) {
          skipped++;
          continue;
        }

        // Insert automation
        const { data, error } = await supabase
          .from('automations')
          .insert(automation)
          .select()
          .single();

        if (error) {
          errors.push(`Failed to import "${automation.title}": ${error.message}`);
        } else if (data) {
          imported.push(data);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        errors.push(`Failed to import "${automation.title}": ${error.message}`);
      }
    }

    return { imported, skipped, errors };
  }
}

export const automationImportExportService = AutomationImportExportService.getInstance();