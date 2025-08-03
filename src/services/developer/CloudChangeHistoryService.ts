import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase/client';
import ChangeHistoryService, { ChangeHistoryEntry, CodeChange } from './ChangeHistoryService';

export class CloudChangeHistoryService extends ChangeHistoryService {
  private static cloudInstance: CloudChangeHistoryService;
  private syncInProgress = false;

  static getInstance(): CloudChangeHistoryService {
    if (!CloudChangeHistoryService.cloudInstance) {
      CloudChangeHistoryService.cloudInstance = new CloudChangeHistoryService();
    }
    return CloudChangeHistoryService.cloudInstance;
  }

  async recordChange(entry: Omit<ChangeHistoryEntry, 'id' | 'timestamp' | 'status'>): Promise<string> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First save locally
      const localId = await super.recordChange(entry);

      // Then sync to cloud
      const { data: historyData, error: historyError } = await supabase
        .from('change_history')
        .insert({
          user_id: user.id,
          feature: entry.feature,
          description: entry.description,
          status: 'active',
        })
        .select()
        .single();

      if (historyError) {
        console.error('Failed to sync change history to cloud:', historyError);
        // Continue with local storage even if cloud sync fails
        return localId;
      }

      // Insert individual code changes
      if (historyData && entry.changes.length > 0) {
        const codeChanges = entry.changes.map(change => ({
          history_id: historyData.id,
          change_type: change.type,
          filepath: change.filepath,
          description: change.description,
          previous_content: change.previousContent,
          new_content: change.newContent,
          metadata: change.metadata || {},
        }));

        const { error: changesError } = await supabase
          .from('code_changes')
          .insert(codeChanges);

        if (changesError) {
          console.error('Failed to sync code changes to cloud:', changesError);
        }
      }

      // Store cloud ID mapping
      await this.storeCloudMapping(localId, historyData.id);

      return localId;
    } catch (error) {
      console.error('Failed to record change in cloud:', error);
      // Fall back to local storage
      return super.recordChange(entry);
    }
  }

  async syncWithCloud(): Promise<void> {
    if (this.syncInProgress) return;
    
    try {
      this.syncInProgress = true;
      console.log('Starting cloud sync...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping sync');
        return;
      }

      // Fetch cloud history
      const { data: cloudHistory, error } = await supabase
        .from('change_history_with_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch cloud history:', error);
        return;
      }

      // Convert cloud data to local format
      const cloudEntries: ChangeHistoryEntry[] = cloudHistory.map(item => ({
        id: item.id,
        timestamp: item.created_at,
        feature: item.feature,
        description: item.description,
        status: item.status as 'active' | 'reverted',
        revertedAt: item.reverted_at,
        revertedBy: item.reverted_by,
        changes: (item.changes || []).map((change: any) => ({
          id: change.id,
          timestamp: new Date().toISOString(),
          type: change.type,
          filepath: change.filepath,
          description: change.description,
          metadata: change.metadata,
        })),
      }));

      // Merge with local data
      const localHistory = await this.getHistory();
      const mergedHistory = this.mergeHistories(localHistory, cloudEntries);

      // Save merged history locally
      await AsyncStorage.setItem('@change_history', JSON.stringify(mergedHistory));

      console.log('Cloud sync completed successfully');
    } catch (error) {
      console.error('Cloud sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async revertChange(id: string): Promise<boolean> {
    try {
      // First revert locally
      const localSuccess = await super.revertChange(id);
      if (!localSuccess) return false;

      // Then sync to cloud
      const cloudId = await this.getCloudId(id);
      if (cloudId) {
        const { error } = await supabase.rpc('revert_change', {
          change_id: cloudId,
        });

        if (error) {
          console.error('Failed to revert in cloud:', error);
          // Continue even if cloud sync fails
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to revert change:', error);
      return false;
    }
  }

  async getStatistics() {
    try {
      // Try to get cloud statistics first
      const { data, error } = await supabase.rpc('get_change_statistics');

      if (!error && data && data.length > 0) {
        const cloudStats = data[0];
        return {
          total: Number(cloudStats.total_changes) || 0,
          active: Number(cloudStats.active_changes) || 0,
          reverted: Number(cloudStats.reverted_changes) || 0,
          changesByType: cloudStats.changes_by_type || {},
          changesBySource: cloudStats.changes_by_source || {},
          oldestChange: cloudStats.oldest_change,
          newestChange: cloudStats.newest_change,
        };
      }
    } catch (error) {
      console.error('Failed to get cloud statistics:', error);
    }

    // Fall back to local statistics
    return super.getStatistics();
  }

  private async storeCloudMapping(localId: string, cloudId: string): Promise<void> {
    const mappings = await this.getCloudMappings();
    mappings[localId] = cloudId;
    await AsyncStorage.setItem('@change_history_cloud_mappings', JSON.stringify(mappings));
  }

  private async getCloudMappings(): Promise<Record<string, string>> {
    try {
      const data = await AsyncStorage.getItem('@change_history_cloud_mappings');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  private async getCloudId(localId: string): Promise<string | null> {
    const mappings = await this.getCloudMappings();
    return mappings[localId] || null;
  }

  private mergeHistories(local: ChangeHistoryEntry[], cloud: ChangeHistoryEntry[]): ChangeHistoryEntry[] {
    const merged = new Map<string, ChangeHistoryEntry>();

    // Add all cloud entries
    cloud.forEach(entry => {
      merged.set(entry.id, entry);
    });

    // Add local entries that don't exist in cloud
    local.forEach(entry => {
      if (!merged.has(entry.id)) {
        merged.set(entry.id, entry);
      }
    });

    // Sort by timestamp (newest first)
    return Array.from(merged.values()).sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Auto-sync on initialization
  async initialize(): Promise<void> {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Sync in the background
      this.syncWithCloud().catch(console.error);
    }

    // Set up auth state listener for auto-sync
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        this.syncWithCloud().catch(console.error);
      }
    });
  }
}

export default CloudChangeHistoryService;