import { supabase } from '../supabase/client';
import { AutomationData, AutomationStep } from '../../types';
import { EventLogger } from '../../utils/EventLogger';

export interface AutomationVersion {
  id: string;
  automation_id: string;
  version_number: number;
  title: string;
  description: string | null;
  steps: AutomationStep[];
  category: string | null;
  tags: string[];
  changes_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export interface VersionComparison {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

export class VersionHistoryService {
  /**
   * Get all versions for an automation
   */
  static async getVersions(automationId: string): Promise<AutomationVersion[]> {
    try {
      const { data, error } = await supabase
        .from('automation_versions')
        .select('*')
        .eq('automation_id', automationId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      EventLogger.error('VersionHistory', 'Failed to get version history:', error as Error);
      return [];
    }
  }

  /**
   * Create a new version manually
   */
  static async createVersion(
    automationId: string, 
    changesSummary: string,
    automation: AutomationData
  ): Promise<AutomationVersion | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the next version number
      const { data: maxVersion } = await supabase
        .from('automation_versions')
        .select('version_number')
        .eq('automation_id', automationId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (maxVersion?.version_number || 0) + 1;

      const versionData = {
        automation_id: automationId,
        version_number: nextVersion,
        title: automation.title,
        description: automation.description,
        steps: automation.steps,
        category: automation.category,
        tags: automation.tags,
        changes_summary: changesSummary,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('automation_versions')
        .insert(versionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      EventLogger.error('VersionHistory', 'Failed to create version:', error as Error);
      return null;
    }
  }

  /**
   * Restore an automation to a specific version
   */
  static async restoreVersion(
    automationId: string, 
    versionId: string
  ): Promise<boolean> {
    try {
      // Get the version data
      const { data: version, error: versionError } = await supabase
        .from('automation_versions')
        .select('*')
        .eq('id', versionId)
        .eq('automation_id', automationId)
        .single();

      if (versionError || !version) {
        throw new Error('Version not found');
      }

      // Update the main automation
      const { error: updateError } = await supabase
        .from('automations')
        .update({
          title: version.title,
          description: version.description,
          steps: version.steps,
          category: version.category,
          tags: version.tags,
          updated_at: new Date().toISOString(),
        })
        .eq('id', automationId);

      if (updateError) throw updateError;

      // Create a new version entry for the restoration
      await this.createVersion(
        automationId,
        `Restored to version ${version.version_number}`,
        {
          id: automationId,
          title: version.title,
          description: version.description || '',
          steps: version.steps,
          category: version.category || 'General',
          tags: version.tags,
        } as AutomationData
      );

      return true;
    } catch (error) {
      EventLogger.error('VersionHistory', 'Failed to restore version:', error as Error);
      return false;
    }
  }

  /**
   * Compare two versions
   */
  static compareVersions(
    oldVersion: AutomationVersion, 
    newVersion: AutomationVersion
  ): VersionComparison[] {
    const changes: VersionComparison[] = [];

    // Compare title
    if (oldVersion.title !== newVersion.title) {
      changes.push({
        field: 'title',
        oldValue: oldVersion.title,
        newValue: newVersion.title,
        changeType: 'modified',
      });
    }

    // Compare description
    if (oldVersion.description !== newVersion.description) {
      changes.push({
        field: 'description',
        oldValue: oldVersion.description,
        newValue: newVersion.description,
        changeType: 'modified',
      });
    }

    // Compare steps (simplified comparison)
    if (JSON.stringify(oldVersion.steps) !== JSON.stringify(newVersion.steps)) {
      const oldStepCount = oldVersion.steps.length;
      const newStepCount = newVersion.steps.length;
      
      if (oldStepCount !== newStepCount) {
        changes.push({
          field: 'steps',
          oldValue: `${oldStepCount} steps`,
          newValue: `${newStepCount} steps`,
          changeType: oldStepCount < newStepCount ? 'added' : 'removed',
        });
      } else {
        changes.push({
          field: 'steps',
          oldValue: 'Steps modified',
          newValue: 'Step configuration changed',
          changeType: 'modified',
        });
      }
    }

    // Compare category
    if (oldVersion.category !== newVersion.category) {
      changes.push({
        field: 'category',
        oldValue: oldVersion.category,
        newValue: newVersion.category,
        changeType: 'modified',
      });
    }

    // Compare tags
    const oldTags = (oldVersion.tags || []).sort();
    const newTags = (newVersion.tags || []).sort();
    if (JSON.stringify(oldTags) !== JSON.stringify(newTags)) {
      changes.push({
        field: 'tags',
        oldValue: oldTags,
        newValue: newTags,
        changeType: 'modified',
      });
    }

    return changes;
  }

  /**
   * Get version statistics
   */
  static async getVersionStats(automationId: string): Promise<{
    totalVersions: number;
    lastModified: string | null;
    mostActiveDay: string | null;
    averageChangesPerVersion: number;
  }> {
    try {
      const versions = await this.getVersions(automationId);
      
      if (versions.length === 0) {
        return {
          totalVersions: 0,
          lastModified: null,
          mostActiveDay: null,
          averageChangesPerVersion: 0,
        };
      }

      // Group by day to find most active day
      const dayGroups: Record<string, number> = {};
      versions.forEach(version => {
        const day = new Date(version.created_at).toISOString().split('T')[0];
        dayGroups[day] = (dayGroups[day] || 0) + 1;
      });

      const mostActiveDay = Object.entries(dayGroups)
        .reduce((max, [day, count]) => count > max.count ? { day, count } : max, { day: '', count: 0 })
        .day;

      return {
        totalVersions: versions.length,
        lastModified: versions[0]?.created_at || null,
        mostActiveDay: mostActiveDay || null,
        averageChangesPerVersion: versions.length > 1 ? Math.round((versions.length - 1) / versions.length * 100) / 100 : 0,
      };
    } catch (error) {
      EventLogger.error('VersionHistory', 'Failed to get version stats:', error as Error);
      return {
        totalVersions: 0,
        lastModified: null,
        mostActiveDay: null,
        averageChangesPerVersion: 0,
      };
    }
  }

  /**
   * Delete a specific version
   */
  static async deleteVersion(versionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('automation_versions')
        .delete()
        .eq('id', versionId);

      if (error) throw error;
      return true;
    } catch (error) {
      EventLogger.error('VersionHistory', 'Failed to delete version:', error as Error);
      return false;
    }
  }
}