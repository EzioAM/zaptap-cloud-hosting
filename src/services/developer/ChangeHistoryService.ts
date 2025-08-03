import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CodeChange {
  id: string;
  timestamp: string;
  type: 'file_created' | 'file_modified' | 'file_deleted' | 'dependency_added' | 'config_changed';
  filepath: string;
  description: string;
  previousContent?: string;
  newContent?: string;
  metadata?: {
    feature?: string;
    source?: 'research' | 'redesign' | 'manual';
    aiModel?: 'claude' | 'chatgpt' | 'both';
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

  static getInstance(): ChangeHistoryService {
    if (!ChangeHistoryService.instance) {
      ChangeHistoryService.instance = new ChangeHistoryService();
    }
    return ChangeHistoryService.instance;
  }

  async recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'timestamp' | 'status'>): Promise<string> {
    try {
      const history = await this.getHistory();
      const newEntry: ChangeHistoryEntry = {
        ...entry,
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        status: 'active',
      };

      // Add to beginning of array (newest first)
      history.unshift(newEntry);

      // Keep only the latest entries
      if (history.length > this.MAX_HISTORY_ENTRIES) {
        history.splice(this.MAX_HISTORY_ENTRIES);
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
      return newEntry.id;
    } catch (error) {
      console.error('Failed to record change:', error);
      throw error;
    }
  }

  async getHistory(): Promise<ChangeHistoryEntry[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get history:', error);
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
      const history = await this.getHistory();
      const entryIndex = history.findIndex(entry => entry.id === id);
      
      if (entryIndex === -1) {
        throw new Error('Change entry not found');
      }

      const entry = history[entryIndex];
      if (entry.status === 'reverted') {
        throw new Error('Change already reverted');
      }

      // Update entry status
      history[entryIndex] = {
        ...entry,
        status: 'reverted',
        revertedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));

      // Generate revert instructions
      this.generateRevertInstructions(entry);
      
      return true;
    } catch (error) {
      console.error('Failed to revert change:', error);
      return false;
    }
  }

  private generateRevertInstructions(entry: ChangeHistoryEntry): void {
    console.log('=== REVERT INSTRUCTIONS ===');
    console.log(`Feature: ${entry.feature}`);
    console.log(`Description: ${entry.description}`);
    console.log('\nChanges to revert:');
    
    entry.changes.forEach((change, index) => {
      console.log(`\n${index + 1}. ${change.type}: ${change.filepath}`);
      
      switch (change.type) {
        case 'file_created':
          console.log(`   Action: Delete file ${change.filepath}`);
          break;
        case 'file_modified':
          if (change.previousContent) {
            console.log(`   Action: Restore previous content`);
            console.log(`   Previous content available: ${change.previousContent.length} characters`);
          }
          break;
        case 'file_deleted':
          if (change.previousContent) {
            console.log(`   Action: Restore file with previous content`);
          }
          break;
        case 'dependency_added':
          console.log(`   Action: Remove dependency: ${change.description}`);
          break;
        case 'config_changed':
          console.log(`   Action: Restore configuration: ${change.description}`);
          break;
      }
    });
    
    console.log('\n=== END REVERT INSTRUCTIONS ===');
  }

  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear history:', error);
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
      console.error('Failed to import history:', error);
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
    
    history.forEach(entry => {
      entry.changes.forEach(change => {
        changesByType[change.type] = (changesByType[change.type] || 0) + 1;
        if (change.metadata?.source) {
          changesBySource[change.metadata.source] = (changesBySource[change.metadata.source] || 0) + 1;
        }
      });
    });

    return {
      total: history.length,
      active,
      reverted,
      changesByType,
      changesBySource,
      oldestChange: history[history.length - 1]?.timestamp,
      newestChange: history[0]?.timestamp,
    };
  }
}

export default ChangeHistoryService;