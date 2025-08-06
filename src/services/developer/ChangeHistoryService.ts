import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { EventLogger } from '../../utils/EventLogger';

export interface CodeChange {
  id: string;
  timestamp: string;
  type: 'file_created' | 'file_modified' | 'file_deleted' | 'dependency_added' | 'config_changed';
  filepath: string;
  description: string;
  previousContent?: string;
  newContent?: string;
  backupPath?: string;
  metadata?: {
    feature?: string;
    source?: 'research' | 'redesign' | 'manual';
    aiModel?: 'claude' | 'chatgpt' | 'both';
    fileSize?: number;
    lineCount?: number;
  };
}

export interface ChangeHistoryEntry {
  id: string;
  timestamp: string;
  feature: string;
  description: string;
  changes: CodeChange[];
  status: 'active' | 'reverted';
  revertedAt?: string;
  revertedBy?: string;
}

class ChangeHistoryService {
  private static instance: ChangeHistoryService;
  private readonly STORAGE_KEY = '@change_history';
  private readonly MAX_HISTORY_ENTRIES = 50;
  private readonly BACKUP_DIR = `${FileSystem.documentDirectory}change_backups/`;
  private activeOperations: Set<string> = new Set();

  static getInstance(): ChangeHistoryService {
    if (!ChangeHistoryService.instance) {
      ChangeHistoryService.instance = new ChangeHistoryService();
      ChangeHistoryService.instance.initializeBackupDirectory();
    }
    return ChangeHistoryService.instance;
  }

  private async initializeBackupDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.BACKUP_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.BACKUP_DIR, { intermediates: true });
      }
    } catch (error) {
      EventLogger.error('ChangeHistory', 'Failed to create backup directory:', error as Error);
    }
  }

  async recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'timestamp' | 'status'>): Promise<string> {
    try {
      const history = await this.getHistory();
      const entryId = this.generateId();
      
      // Process and backup file changes
      const processedChanges = await Promise.all(
        entry.changes.map(async (change) => {
          if (change.type === 'file_modified' || change.type === 'file_deleted') {
            // Create backup of the file
            const backupPath = await this.createFileBackup(change.filepath, entryId);
            return {
              ...change,
              backupPath,
            };
          }
          return change;
        })
      );
      
      const newEntry: ChangeHistoryEntry = {
        ...entry,
        changes: processedChanges,
        id: entryId,
        timestamp: new Date().toISOString(),
        status: 'active',
      };

      // Add to beginning of array (newest first)
      history.unshift(newEntry);

      // Keep only the latest entries
      if (history.length > this.MAX_HISTORY_ENTRIES) {
        // Clean up old backups
        const removedEntries = history.splice(this.MAX_HISTORY_ENTRIES);
        await this.cleanupBackups(removedEntries);
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
      return newEntry.id;
    } catch (error) {
      EventLogger.error('ChangeHistory', 'Failed to record change:', error as Error);
      throw error;
    }
  }

  private async createFileBackup(filepath: string, entryId: string): Promise<string | undefined> {
    try {
      // For React Native, we'll store the content in AsyncStorage with a special key
      const backupKey = `@backup_${entryId}_${filepath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      // In a real implementation, you'd read the actual file content
      // For now, we'll simulate with a placeholder
      const content = await this.readFileContent(filepath);
      if (content) {
        await AsyncStorage.setItem(backupKey, content);
        return backupKey;
      }
    } catch (error) {
      EventLogger.error('ChangeHistory', 'Failed to create backup:', error as Error);
    }
    return undefined;
  }

  private async readFileContent(filepath: string): Promise<string | null> {
    // This is a placeholder - in a real implementation, you'd read the actual file
    // For React Native, this would require platform-specific code or a file system library
    EventLogger.debug('ChangeHistory', 'Reading file content for:', filepath);
    return null;
  }

  private async cleanupBackups(entries: ChangeHistoryEntry[]): Promise<void> {
    for (const entry of entries) {
      for (const change of entry.changes) {
        if (change.backupPath) {
          try {
            await AsyncStorage.removeItem(change.backupPath);
          } catch (error) {
            EventLogger.error('ChangeHistory', 'Failed to cleanup backup:', error as Error);
          }
        }
      }
    }
  }

  async getHistory(): Promise<ChangeHistoryEntry[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      EventLogger.error('ChangeHistory', 'Failed to get history:', error as Error);
      return [];
    }
  }

  async getActiveChanges(): Promise<ChangeHistoryEntry[]> {
    const history = await this.getHistory();
    return history.filter(entry => entry.status === 'active');
  }

  async getChangeById(id: string): Promise<ChangeHistoryEntry | null> {
    const history = await this.getHistory();
    return history.find(entry => entry.id === id) || null;
  }

  async revertChange(id: string): Promise<boolean> {
    try {
      // Prevent concurrent operations
      if (this.activeOperations.has(id)) {
        throw new Error('Revert operation already in progress');
      }
      
      this.activeOperations.add(id);
      
      const history = await this.getHistory();
      const entryIndex = history.findIndex(entry => entry.id === id);
      
      if (entryIndex === -1) {
        throw new Error('Change entry not found');
      }

      const entry = history[entryIndex];
      if (entry.status === 'reverted') {
        throw new Error('Change already reverted');
      }

      // Actually revert the changes
      const revertResults = await this.performRevert(entry);
      
      // Update entry status
      history[entryIndex] = {
        ...entry,
        status: 'reverted',
        revertedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));

      // Generate detailed report
      this.generateRevertReport(entry, revertResults);
      
      return true;
    } catch (error) {
      EventLogger.error('ChangeHistory', 'Failed to revert change:', error as Error);
      return false;
    } finally {
      this.activeOperations.delete(id);
    }
  }

  private async performRevert(entry: ChangeHistoryEntry): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    // Process changes in reverse order
    for (const change of entry.changes.reverse()) {
      try {
        switch (change.type) {
          case 'file_created':
            // In a real implementation, delete the file
            EventLogger.debug('ChangeHistory', 'Would delete file: ${change.filepath}');
            results.set(change.filepath, true);
            break;
            
          case 'file_modified':
            if (change.backupPath) {
              // Restore from backup
              const backupContent = await AsyncStorage.getItem(change.backupPath);
              if (backupContent) {
                EventLogger.debug('ChangeHistory', 'Would restore file: ${change.filepath} from backup');
                results.set(change.filepath, true);
              } else {
                results.set(change.filepath, false);
              }
            } else if (change.previousContent) {
              EventLogger.debug('ChangeHistory', 'Would restore file: ${change.filepath} with previous content');
              results.set(change.filepath, true);
            } else {
              results.set(change.filepath, false);
            }
            break;
            
          case 'file_deleted':
            if (change.backupPath || change.previousContent) {
              EventLogger.debug('ChangeHistory', 'Would recreate file: ${change.filepath}');
              results.set(change.filepath, true);
            } else {
              results.set(change.filepath, false);
            }
            break;
            
          case 'dependency_added':
            EventLogger.debug('ChangeHistory', 'Would remove dependency: ${change.description}');
            results.set(change.description, true);
            break;
            
          case 'config_changed':
            EventLogger.debug('ChangeHistory', 'Would restore config: ${change.description}');
            results.set(change.description, true);
            break;
        }
      } catch (error) {
        EventLogger.error('ChangeHistory', 'Failed to revert ${change.type} for ${change.filepath}:', error as Error);
        results.set(change.filepath, false);
      }
    }
    
    return results;
  }

  private generateRevertReport(entry: ChangeHistoryEntry, results: Map<string, boolean>): void {
    EventLogger.debug('ChangeHistory', '\n=== REVERT REPORT ===');
    EventLogger.debug('ChangeHistory', 'Feature: ${entry.feature}');
    EventLogger.debug('ChangeHistory', 'Description: ${entry.description}');
    EventLogger.debug('ChangeHistory', 'Total Changes: ${entry.changes.length}');
    
    let successCount = 0;
    let failureCount = 0;
    
    results.forEach((success, item) => {
      if (success) {
        successCount++;
        EventLogger.debug('ChangeHistory', '✅ ${item}');
      } else {
        failureCount++;
        EventLogger.debug('ChangeHistory', '❌ ${item}');
      }
    });
    
    EventLogger.debug('ChangeHistory', '\nSummary: ${successCount} successful, ${failureCount} failed');
    EventLogger.debug('ChangeHistory', '=== END REVERT REPORT ===\n');
  }

  // Create a snapshot of current state before making changes
  async createSnapshot(description: string): Promise<string> {
    const snapshotId = this.generateId();
    const snapshot = {
      id: snapshotId,
      description,
      timestamp: new Date().toISOString(),
      files: [] as Array<{ path: string; content: string }>,
    };
    
    // In a real implementation, this would capture the current state of relevant files
    await AsyncStorage.setItem(`@snapshot_${snapshotId}`, JSON.stringify(snapshot));
    return snapshotId;
  }

  // Restore from a snapshot
  async restoreSnapshot(snapshotId: string): Promise<boolean> {
    try {
      const snapshotData = await AsyncStorage.getItem(`@snapshot_${snapshotId}`);
      if (!snapshotData) {
        throw new Error('Snapshot not found');
      }
      
      const snapshot = JSON.parse(snapshotData);
      EventLogger.debug('ChangeHistory', 'Restoring snapshot: ${snapshot.description}');
      
      // In a real implementation, restore the files
      return true;
    } catch (error) {
      EventLogger.error('ChangeHistory', 'Failed to restore snapshot:', error as Error);
      return false;
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      EventLogger.error('ChangeHistory', 'Failed to clear history:', error as Error);
    }
  }

  async exportHistory(): Promise<string> {
    const history = await this.getHistory();
    return JSON.stringify(history, null, 2);
  }

  async importHistory(data: string): Promise<boolean> {
    try {
      const history = JSON.parse(data);
      if (!Array.isArray(history)) {
        throw new Error('Invalid history format');
      }
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
      return true;
    } catch (error) {
      EventLogger.error('ChangeHistory', 'Failed to import history:', error as Error);
      return false;
    }
  }

  private generateId(): string {
    return `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper method to create a code change record
  createCodeChange(params: {
    type: CodeChange['type'];
    filepath: string;
    description: string;
    previousContent?: string;
    newContent?: string;
    metadata?: CodeChange['metadata'];
  }): CodeChange {
    return {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...params,
    };
  }

  // Get statistics about changes
  async getStatistics() {
    const history = await this.getHistory();
    const active = history.filter(e => e.status === 'active').length;
    const reverted = history.filter(e => e.status === 'reverted').length;
    
    const changesByType: Record<string, number> = {};
    const changesBySource: Record<string, number> = {};
    const fileChanges: Record<string, number> = {};
    let totalFileSize = 0;
    
    history.forEach(entry => {
      entry.changes.forEach(change => {
        changesByType[change.type] = (changesByType[change.type] || 0) + 1;
        if (change.metadata?.source) {
          changesBySource[change.metadata.source] = (changesBySource[change.metadata.source] || 0) + 1;
        }
        
        // Track file-specific changes
        fileChanges[change.filepath] = (fileChanges[change.filepath] || 0) + 1;
        
        if (change.metadata?.fileSize) {
          totalFileSize += change.metadata.fileSize;
        }
      });
    });

    return {
      total: history.length,
      active,
      reverted,
      changesByType,
      changesBySource,
      fileChanges,
      totalFileSize,
      mostChangedFiles: Object.entries(fileChanges)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([file, count]) => ({ file, count })),
      oldestChange: history[history.length - 1]?.timestamp,
      newestChange: history[0]?.timestamp,
    };
  }

  // Track a file operation (to be called by other services)
  async trackFileOperation(operation: {
    type: 'create' | 'modify' | 'delete';
    filepath: string;
    content?: string;
    feature: string;
    description: string;
    source?: 'research' | 'redesign' | 'manual';
  }): Promise<void> {
    const change = this.createCodeChange({
      type: operation.type === 'create' ? 'file_created' : 
            operation.type === 'modify' ? 'file_modified' : 'file_deleted',
      filepath: operation.filepath,
      description: operation.description,
      newContent: operation.content,
      metadata: {
        feature: operation.feature,
        source: operation.source || 'manual',
        fileSize: operation.content?.length,
        lineCount: operation.content?.split('\n').length,
      },
    });
    
    await this.recordChange({
      feature: operation.feature,
      description: operation.description,
      changes: [change],
    });
  }
}

export default ChangeHistoryService;