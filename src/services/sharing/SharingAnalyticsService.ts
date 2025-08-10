import { supabase } from '../supabase/client';
import { EventLogger } from '../../utils/EventLogger';

export interface ShareAnalytics {
  automationId: string;
  totalShares: number;
  totalViews: number;
  uniqueViewers: number;
  sharesByMethod: Record<string, number>;
  viewsByPlatform: Record<string, number>;
  viewsByLocation: Record<string, number>;
  conversionRate: number;
  engagementRate: number;
  recentShares: ShareEvent[];
  popularShareTimes: HourlyStats[];
  shareGrowth: DailyStats[];
}

export interface ShareEvent {
  id: string;
  automationId: string;
  shareId?: string;
  method: 'link' | 'qr' | 'nfc' | 'email' | 'sms' | 'social';
  sharedBy: string;
  sharedAt: Date;
  recipients?: string[];
  metadata?: Record<string, any>;
}

export interface ShareView {
  id: string;
  shareId: string;
  viewedAt: Date;
  viewerInfo?: {
    platform?: string;
    browser?: string;
    location?: {
      country?: string;
      city?: string;
    };
  };
  executed: boolean;
  executionTime?: number;
}

export interface HourlyStats {
  hour: number;
  shares: number;
  views: number;
}

export interface DailyStats {
  date: string;
  shares: number;
  views: number;
  executions: number;
}

export class SharingAnalyticsService {
  private static instance: SharingAnalyticsService;

  private constructor() {}

  static getInstance(): SharingAnalyticsService {
    if (!SharingAnalyticsService.instance) {
      SharingAnalyticsService.instance = new SharingAnalyticsService();
    }
    return SharingAnalyticsService.instance;
  }

  /**
   * Track a share event
   */
  async trackShareEvent(event: Omit<ShareEvent, 'id' | 'sharedAt'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('sharing_logs')
        .insert({
          automation_id: event.automationId,
          method: event.method,
          shared_by: event.sharedBy,
          recipients: event.recipients || [],
          share_data: {
            shareId: event.shareId,
            metadata: event.metadata || {}
          }
        });

      if (error) {
        EventLogger.error('Analytics', 'Failed to track share event:', error as Error);
      }
    } catch (error) {
      EventLogger.error('Analytics', 'Error tracking share event:', error as Error);
    }
  }

  /**
   * Track a view event for a shared automation
   */
  async trackViewEvent(shareId: string, viewerInfo?: any): Promise<void> {
    try {
      // Increment view count in public_shares
      await supabase.rpc('increment_share_access_count', { p_share_id: shareId });

      // Log detailed view event if we have a view_logs table
      const { error } = await supabase
        .from('share_views')
        .insert({
          share_id: shareId,
          viewer_info: viewerInfo || {},
          viewed_at: new Date().toISOString()
        });

      if (error && !error.message.includes('does not exist')) {
        EventLogger.error('Analytics', 'Failed to track view event:', error as Error);
      }
    } catch (error) {
      EventLogger.error('Analytics', 'Error tracking view event:', error as Error);
    }
  }

  /**
   * Get comprehensive analytics for an automation
   */
  async getAutomationAnalytics(automationId: string): Promise<ShareAnalytics> {
    try {
      // Get all shares for this automation
      const { data: shares, error: sharesError } = await supabase
        .from('public_shares')
        .select('*')
        .eq('automation_id', automationId);

      if (sharesError) throw sharesError;

      // Get sharing logs
      const { data: logs, error: logsError } = await supabase
        .from('sharing_logs')
        .select('*')
        .eq('automation_id', automationId)
        .order('shared_at', { ascending: false });

      if (logsError) throw logsError;

      // Calculate analytics
      const totalShares = logs?.length || 0;
      const totalViews = (shares || []).reduce((sum, share) => sum + (share.access_count || 0), 0);
      
      // Share methods breakdown
      const sharesByMethod = (logs || []).reduce((acc, log) => {
        acc[log.method] = (acc[log.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get execution data
      const { data: executions } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('automation_id', automationId)
        .eq('source', 'web');

      const webExecutions = executions?.length || 0;
      const conversionRate = totalViews > 0 ? (webExecutions / totalViews) * 100 : 0;

      // Calculate hourly statistics
      const hourlyStats = this.calculateHourlyStats(logs || []);

      // Calculate daily growth
      const dailyStats = await this.calculateDailyStats(automationId);

      // Recent shares
      const recentShares = (logs || []).slice(0, 10).map(log => ({
        id: log.id,
        automationId: log.automation_id,
        method: log.method,
        sharedBy: log.shared_by,
        sharedAt: new Date(log.shared_at),
        recipients: log.recipients,
        metadata: log.share_data
      }));

      return {
        automationId,
        totalShares,
        totalViews,
        uniqueViewers: Math.floor(totalViews * 0.7), // Estimate unique viewers
        sharesByMethod,
        viewsByPlatform: {}, // Would need view tracking to populate
        viewsByLocation: {}, // Would need geo tracking to populate
        conversionRate,
        engagementRate: totalViews > 0 ? (webExecutions / totalViews) * 100 : 0,
        recentShares,
        popularShareTimes: hourlyStats,
        shareGrowth: dailyStats
      };

    } catch (error) {
      EventLogger.error('Analytics', 'Failed to get automation analytics:', error as Error);
      return this.getEmptyAnalytics(automationId);
    }
  }

  /**
   * Get analytics for all user's shared automations
   */
  async getUserSharingAnalytics(userId: string): Promise<{
    totalShares: number;
    totalViews: number;
    topAutomations: Array<{
      automationId: string;
      title: string;
      shares: number;
      views: number;
    }>;
    sharesByMethod: Record<string, number>;
  }> {
    try {
      // Get all user's automations
      const { data: automations } = await supabase
        .from('automations')
        .select('id, title')
        .eq('created_by', userId);

      if (!automations || automations.length === 0) {
        return {
          totalShares: 0,
          totalViews: 0,
          topAutomations: [],
          sharesByMethod: {}
        };
      }

      const automationIds = automations.map(a => a.id);

      // Get all shares for user's automations
      const { data: shares } = await supabase
        .from('public_shares')
        .select('automation_id, access_count')
        .in('automation_id', automationIds);

      // Get all sharing logs
      const { data: logs } = await supabase
        .from('sharing_logs')
        .select('automation_id, method')
        .in('automation_id', automationIds);

      // Calculate totals
      const totalViews = (shares || []).reduce((sum, share) => sum + (share.access_count || 0), 0);
      const totalShares = logs?.length || 0;

      // Share methods breakdown
      const sharesByMethod = (logs || []).reduce((acc, log) => {
        acc[log.method] = (acc[log.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Top automations by views
      const automationStats = new Map<string, { shares: number; views: number }>();
      
      (shares || []).forEach(share => {
        const stats = automationStats.get(share.automation_id) || { shares: 0, views: 0 };
        stats.views += share.access_count || 0;
        automationStats.set(share.automation_id, stats);
      });

      (logs || []).forEach(log => {
        const stats = automationStats.get(log.automation_id) || { shares: 0, views: 0 };
        stats.shares += 1;
        automationStats.set(log.automation_id, stats);
      });

      const topAutomations = Array.from(automationStats.entries())
        .map(([automationId, stats]) => {
          const automation = automations.find(a => a.id === automationId);
          return {
            automationId,
            title: automation?.title || 'Unknown',
            shares: stats.shares,
            views: stats.views
          };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);

      return {
        totalShares,
        totalViews,
        topAutomations,
        sharesByMethod
      };

    } catch (error) {
      EventLogger.error('Analytics', 'Failed to get user sharing analytics:', error as Error);
      return {
        totalShares: 0,
        totalViews: 0,
        topAutomations: [],
        sharesByMethod: {}
      };
    }
  }

  /**
   * Get share performance metrics
   */
  async getSharePerformance(shareId: string): Promise<{
    views: number;
    executions: number;
    lastViewed?: Date;
    viewsByDay: DailyStats[];
  }> {
    try {
      // Get share data
      const { data: share, error } = await supabase
        .from('public_shares')
        .select('*')
        .eq('id', shareId)
        .single();

      if (error || !share) {
        throw new Error('Share not found');
      }

      // Get executions from this share
      const { data: executions } = await supabase
        .from('automation_executions')
        .select('*')
        .eq('automation_id', share.automation_id)
        .gte('created_at', share.created_at);

      return {
        views: share.access_count || 0,
        executions: executions?.length || 0,
        lastViewed: share.last_accessed_at ? new Date(share.last_accessed_at) : undefined,
        viewsByDay: [] // Would need daily tracking to populate
      };

    } catch (error) {
      EventLogger.error('Analytics', 'Failed to get share performance:', error as Error);
      return {
        views: 0,
        executions: 0,
        viewsByDay: []
      };
    }
  }

  // Private helper methods

  private calculateHourlyStats(logs: any[]): HourlyStats[] {
    const hourlyMap = new Map<number, { shares: number; views: number }>();

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, { shares: 0, views: 0 });
    }

    // Count shares by hour
    logs.forEach(log => {
      const hour = new Date(log.shared_at).getHours();
      const stats = hourlyMap.get(hour)!;
      stats.shares += 1;
    });

    return Array.from(hourlyMap.entries()).map(([hour, stats]) => ({
      hour,
      shares: stats.shares,
      views: stats.views
    }));
  }

  private async calculateDailyStats(automationId: string): Promise<DailyStats[]> {
    try {
      // Get last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: logs } = await supabase
        .from('sharing_logs')
        .select('shared_at')
        .eq('automation_id', automationId)
        .gte('shared_at', thirtyDaysAgo.toISOString());

      const { data: executions } = await supabase
        .from('automation_executions')
        .select('created_at')
        .eq('automation_id', automationId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Group by day
      const dailyMap = new Map<string, DailyStats>();

      // Initialize last 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyMap.set(dateStr, {
          date: dateStr,
          shares: 0,
          views: 0,
          executions: 0
        });
      }

      // Count shares
      (logs || []).forEach(log => {
        const dateStr = new Date(log.shared_at).toISOString().split('T')[0];
        const stats = dailyMap.get(dateStr);
        if (stats) stats.shares += 1;
      });

      // Count executions
      (executions || []).forEach(exec => {
        const dateStr = new Date(exec.created_at).toISOString().split('T')[0];
        const stats = dailyMap.get(dateStr);
        if (stats) stats.executions += 1;
      });

      return Array.from(dailyMap.values())
        .sort((a, b) => a.date.localeCompare(b.date));

    } catch (error) {
      EventLogger.error('Analytics', 'Failed to calculate daily stats:', error as Error);
      return [];
    }
  }

  private getEmptyAnalytics(automationId: string): ShareAnalytics {
    return {
      automationId,
      totalShares: 0,
      totalViews: 0,
      uniqueViewers: 0,
      sharesByMethod: {},
      viewsByPlatform: {},
      viewsByLocation: {},
      conversionRate: 0,
      engagementRate: 0,
      recentShares: [],
      popularShareTimes: [],
      shareGrowth: []
    };
  }
}

export const sharingAnalyticsService = SharingAnalyticsService.getInstance();