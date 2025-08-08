import { supabase } from '../supabase/client';
import { EventLogger } from '../../utils/EventLogger';

export class AutomationQueries {
  static async validateAutomationId(id: string | undefined): Promise<boolean> {
    if (!id || id === 'undefined' || id === 'null' || id === '') {
      EventLogger.warn('AutomationQueries', `Invalid automation ID: ${id}`);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('automations')
        .select('id')
        .eq('id', id)
        .single();

      if (error) {
        EventLogger.error('AutomationQueries', 'ID validation error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      EventLogger.error('AutomationQueries', 'ID validation exception:', error as Error);
      return false;
    }
  }

  static async getAutomationWithValidation(id: string) {
    const isValid = await this.validateAutomationId(id);
    
    if (!isValid) {
      throw new Error(`Invalid automation ID: ${id}`);
    }

    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  static async getAutomationsSafe(filters?: {
    category?: string;
    isPublic?: boolean;
    userId?: string;
  }) {
    try {
      let query = supabase.from('automations').select('*');

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      if (filters?.userId) {
        query = query.eq('created_by', filters.userId);
      }

      const { data, error } = await query;

      if (error) {
        EventLogger.error('AutomationQueries', 'Failed to get automations:', error);
        return [];
      }

      // Filter out any automations with invalid IDs
      return (data || []).filter(automation => 
        automation.id && 
        automation.id !== 'undefined' && 
        automation.id !== 'null'
      );
    } catch (error) {
      EventLogger.error('AutomationQueries', 'Exception getting automations:', error as Error);
      return [];
    }
  }

  static async createAutomation(automation: any) {
    try {
      const { data, error } = await supabase
        .from('automations')
        .insert(automation)
        .select()
        .single();

      if (error) {
        EventLogger.error('AutomationQueries', 'Failed to create automation:', error);
        throw error;
      }

      return data;
    } catch (error) {
      EventLogger.error('AutomationQueries', 'Exception creating automation:', error as Error);
      throw error;
    }
  }

  static async updateAutomation(id: string, updates: any) {
    const isValid = await this.validateAutomationId(id);
    
    if (!isValid) {
      throw new Error(`Cannot update - invalid automation ID: ${id}`);
    }

    try {
      const { data, error } = await supabase
        .from('automations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        EventLogger.error('AutomationQueries', 'Failed to update automation:', error);
        throw error;
      }

      return data;
    } catch (error) {
      EventLogger.error('AutomationQueries', 'Exception updating automation:', error as Error);
      throw error;
    }
  }

  static async deleteAutomation(id: string) {
    const isValid = await this.validateAutomationId(id);
    
    if (!isValid) {
      throw new Error(`Cannot delete - invalid automation ID: ${id}`);
    }

    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) {
        EventLogger.error('AutomationQueries', 'Failed to delete automation:', error);
        throw error;
      }

      return true;
    } catch (error) {
      EventLogger.error('AutomationQueries', 'Exception deleting automation:', error as Error);
      throw error;
    }
  }
}
