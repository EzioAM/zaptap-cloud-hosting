import { supabase } from '../supabase/client';
import { sampleAutomations } from '../../data/sampleAutomations';

export class OnboardingService {
  /**
   * Create sample automations for a new user
   */
  static async createSampleAutomations(userId: string) {
    try {
      // Prepare sample automations with user ID
      const automationsToInsert = sampleAutomations.map(automation => ({
        title: automation.title,
        description: automation.description,
        category: automation.category,
        is_public: automation.is_public,
        is_template: automation.is_template,
        icon: automation.icon,
        color: automation.color,
        tags: automation.tags,
        user_id: userId,
        steps: automation.steps,
        execution_count: 0,
        rating: 5,
        likes_count: Math.floor(Math.random() * 50) + 10, // Random likes between 10-60
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Insert automations
      const { data: insertedAutomations, error: automationError } = await supabase
        .from('automations')
        .insert(automationsToInsert)
        .select();

      if (automationError) {
        console.error('Error creating sample automations:', automationError);
        return { success: false, error: automationError };
      }

      // Note: Steps are now stored as JSON in the automations table
      // No need to insert them separately

      return { 
        success: true, 
        count: insertedAutomations?.length || 0,
        automations: insertedAutomations 
      };
    } catch (error) {
      console.error('Failed to create sample automations:', error);
      return { success: false, error };
    }
  }

  /**
   * Check if user already has sample automations
   */
  static async hasSampleAutomations(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('id')
        .eq('user_id', userId)
        .eq('is_template', true)
        .limit(1);

      if (error) {
        console.error('Error checking sample automations:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Failed to check sample automations:', error);
      return false;
    }
  }

  /**
   * Initialize new user with sample data
   */
  static async initializeNewUser(userId: string) {
    try {
      // Check if user already has sample automations
      const hasSamples = await this.hasSampleAutomations(userId);
      
      if (!hasSamples) {
        // Create sample automations
        const result = await this.createSampleAutomations(userId);
        
        if (result.success) {
          console.log(`Created ${result.count} sample automations for user ${userId}`);
        }
        
        return result;
      }

      return { success: true, message: 'User already has sample automations' };
    } catch (error) {
      console.error('Failed to initialize new user:', error);
      return { success: false, error };
    }
  }
}