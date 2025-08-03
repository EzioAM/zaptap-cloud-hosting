import ChangeHistoryService from './ChangeHistoryService';

/**
 * Helper class to integrate change history tracking with other developer tools
 * This ensures all code modifications are properly tracked and can be reverted
 */
export class ChangeHistoryIntegration {
  /**
   * Track changes made by the UI Redesign Tool
   */
  static async trackUIRedesign(params: {
    screenName: string;
    changes: Array<{
      filepath: string;
      description: string;
      content?: string;
    }>;
    aiModel?: 'claude' | 'chatgpt';
  }): Promise<void> {
    const service = ChangeHistoryService.getInstance();
    
    const codeChanges = params.changes.map(change => 
      service.createCodeChange({
        type: 'file_modified',
        filepath: change.filepath,
        description: change.description,
        newContent: change.content,
        metadata: {
          feature: `${params.screenName} Redesign`,
          source: 'redesign',
          aiModel: params.aiModel,
          fileSize: change.content?.length,
          lineCount: change.content?.split('\n').length,
        },
      })
    );
    
    await service.recordChange({
      feature: `${params.screenName} UI Redesign`,
      description: `Applied AI-generated UI improvements to ${params.screenName}`,
      changes: codeChanges,
    });
  }

  /**
   * Track changes made by the Research Assistant
   */
  static async trackResearchImplementation(params: {
    feature: string;
    description: string;
    files: Array<{
      path: string;
      action: 'create' | 'modify' | 'delete';
      content?: string;
    }>;
    aiModel?: 'claude' | 'chatgpt';
  }): Promise<void> {
    const service = ChangeHistoryService.getInstance();
    
    const codeChanges = params.files.map(file => 
      service.createCodeChange({
        type: file.action === 'create' ? 'file_created' : 
              file.action === 'modify' ? 'file_modified' : 'file_deleted',
        filepath: file.path,
        description: `${file.action} file for ${params.feature}`,
        newContent: file.content,
        metadata: {
          feature: params.feature,
          source: 'research',
          aiModel: params.aiModel,
        },
      })
    );
    
    await service.recordChange({
      feature: params.feature,
      description: params.description,
      changes: codeChanges,
    });
  }

  /**
   * Track dependency changes
   */
  static async trackDependencyChange(params: {
    dependency: string;
    version: string;
    action: 'add' | 'update' | 'remove';
    reason: string;
  }): Promise<void> {
    const service = ChangeHistoryService.getInstance();
    
    const change = service.createCodeChange({
      type: 'dependency_added',
      filepath: 'package.json',
      description: `${params.action} ${params.dependency}@${params.version}`,
      metadata: {
        feature: 'Dependencies',
        source: 'manual',
      },
    });
    
    await service.recordChange({
      feature: 'Dependency Management',
      description: params.reason,
      changes: [change],
    });
  }

  /**
   * Track configuration changes
   */
  static async trackConfigChange(params: {
    configFile: string;
    setting: string;
    previousValue?: string;
    newValue: string;
    reason: string;
  }): Promise<void> {
    const service = ChangeHistoryService.getInstance();
    
    const change = service.createCodeChange({
      type: 'config_changed',
      filepath: params.configFile,
      description: `Updated ${params.setting}`,
      previousContent: params.previousValue,
      newContent: params.newValue,
      metadata: {
        feature: 'Configuration',
        source: 'manual',
      },
    });
    
    await service.recordChange({
      feature: 'Configuration Update',
      description: params.reason,
      changes: [change],
    });
  }

  /**
   * Create a snapshot before making major changes
   */
  static async createSnapshot(description: string): Promise<string> {
    const service = ChangeHistoryService.getInstance();
    return await service.createSnapshot(description);
  }

  /**
   * Example usage in UI Redesign Tool:
   * 
   * // After generating redesign
   * await ChangeHistoryIntegration.trackUIRedesign({
   *   screenName: 'HomeScreen',
   *   changes: [
   *     {
   *       filepath: 'src/screens/HomeScreen.tsx',
   *       description: 'Updated layout and styling',
   *       content: newComponentCode,
   *     },
   *     {
   *       filepath: 'src/styles/HomeScreen.styles.ts',
   *       description: 'Created new style definitions',
   *       content: newStyleCode,
   *     }
   *   ],
   *   aiModel: 'claude',
   * });
   */
}

export default ChangeHistoryIntegration;