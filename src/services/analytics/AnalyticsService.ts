import { supabase } from '../supabase/client';

export interface AnalyticsEvent {
  automation_id: string;
  event_type: 'view' | 'execution' | 'share' | 'download' | 'like' | 'comment' | 'edit' | 'duplicate';
  event_data?: Record<string, any>;
  user_id?: string;
  session_id?: string;
  user_agent?: string;
  ip_address?: string;
  location_data?: Record<string, any>;
}

export interface AnalyticsStats {
  views: number;
  executions: number;
  shares: number;
  downloads: number;
  likes: number;
  comments: number;
  unique_users: number;
  last_activity: string | null;
  daily_stats: Array<{
    date: string;
    views: number;
    executions: number;
    shares: number;
  }>;
  top_countries: Array<{
    country: string;
    count: number;
  }>;
}

export class AnalyticsService {
  /**
   * Track an analytics event
   */
  static async trackEvent(event: AnalyticsEvent): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const eventData = {
        automation_id: event.automation_id,
        event_type: event.event_type,
        event_data: event.event_data || {},
        user_id: user?.id || event.user_id,
        session_id: event.session_id || this.generateSessionId(),
        user_agent: event.user_agent || navigator.userAgent,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('automation_analytics')
        .insert(eventData);

      if (error) {
        console.error('Failed to track analytics event:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Analytics tracking error:', error);
      return false;
    }
  }

  /**
   * Get analytics stats for an automation
   */
  static async getAutomationStats(automationId: string): Promise<AnalyticsStats> {
    try {
      // Get basic stats
      const { data: analytics, error } = await supabase
        .from('automation_analytics')
        .select('event_type, user_id, created_at, location_data')
        .eq('automation_id', automationId);

      if (error) throw error;

      // Process the data
      const stats: AnalyticsStats = {
        views: analytics?.filter(a => a.event_type === 'view').length || 0,
        executions: analytics?.filter(a => a.event_type === 'execution').length || 0,
        shares: analytics?.filter(a => a.event_type === 'share').length || 0,
        downloads: analytics?.filter(a => a.event_type === 'download').length || 0,
        likes: analytics?.filter(a => a.event_type === 'like').length || 0,
        comments: analytics?.filter(a => a.event_type === 'comment').length || 0,
        unique_users: new Set(analytics?.map(a => a.user_id).filter(Boolean)).size || 0,
        last_activity: analytics?.length ? analytics[analytics.length - 1].created_at : null,
        daily_stats: this.generateDailyStats(analytics || []),
        top_countries: this.generateCountryStats(analytics || []),
      };

      return stats;
    } catch (error) {
      console.error('Failed to get analytics stats:', error);
      return {
        views: 0,
        executions: 0,
        shares: 0,
        downloads: 0,
        likes: 0,
        comments: 0,
        unique_users: 0,
        last_activity: null,
        daily_stats: [],
        top_countries: [],
      };
    }
  }

  /**
   * Track automation view
   */
  static async trackView(automationId: string, metadata?: Record<string, any>): Promise<void> {
    await this.trackEvent({
      automation_id: automationId,
      event_type: 'view',
      event_data: metadata,
    });
  }

  /**
   * Track automation execution
   */
  static async trackExecution(automationId: string, result: Record<string, any>): Promise<void> {
    await this.trackEvent({
      automation_id: automationId,
      event_type: 'execution',
      event_data: {
        success: result.success,
        execution_time: result.executionTime,
        steps_completed: result.stepsCompleted,
        total_steps: result.totalSteps,
      },
    });
  }

  /**
   * Track automation share
   */
  static async trackShare(automationId: string, shareMethod: string): Promise<void> {
    await this.trackEvent({
      automation_id: automationId,
      event_type: 'share',
      event_data: { method: shareMethod },
    });
  }

  /**
   * Generate a simple session ID
   */
  private static generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Generate daily stats from analytics data
   */
  private static generateDailyStats(analytics: any[]): Array<{ date: string; views: number; executions: number; shares: number }> {
    const daily: Record<string, { views: number; executions: number; shares: number }> = {};
    
    analytics.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      if (!daily[date]) {
        daily[date] = { views: 0, executions: 0, shares: 0 };
      }
      
      if (event.event_type === 'view') daily[date].views++;
      if (event.event_type === 'execution') daily[date].executions++;
      if (event.event_type === 'share') daily[date].shares++;
    });

    return Object.entries(daily)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days
  }

  /**
   * Generate country stats from location data
   */
  private static generateCountryStats(analytics: any[]): Array<{ country: string; count: number }> {
    const countries: Record<string, number> = {};
    
    analytics.forEach(event => {
      const country = event.location_data?.country || 'Unknown';
      countries[country] = (countries[country] || 0) + 1;
    });

    return Object.entries(countries)
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 countries
  }

  /**
   * Get popular automations based on analytics
   */
  static async getPopularAutomations(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('automation_stats_detailed')
        .select('*')
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get popular automations:', error);
      return [];
    }
  }
}