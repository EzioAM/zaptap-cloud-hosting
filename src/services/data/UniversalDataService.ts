import { supabase } from '../supabase/client';
import { EventLogger } from '../../utils/EventLogger';

class UniversalDataService {
  private static instance: UniversalDataService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  static getInstance(): UniversalDataService {
    if (!UniversalDataService.instance) {
      UniversalDataService.instance = new UniversalDataService();
    }
    return UniversalDataService.instance;
  }

  // ========== AUTOMATION DATA ==========
  
  async getAutomation(id: string) {
    const cacheKey = `automation_${id}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      EventLogger.error('UniversalDataService', 'Failed to get automation', error as Error);
      throw error;
    }
  }

  async getAutomations(filters?: {
    category?: string;
    isPublic?: boolean;
    userId?: string;
    search?: string;
    limit?: number;
    offset?: number;
    orderBy?: string;
    trending?: boolean;
  }) {
    const cacheKey = `automations_${JSON.stringify(filters)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      let query = supabase
        .from('automations')
        .select('*, profiles(*)', { count: 'exact' });

      // Apply filters
      if (filters?.category && filters.category !== 'all') {
        if (filters.category === 'popular') {
          query = query.or('likes_count.gte.50,average_rating.gte.4.5');
        } else if (filters.category === 'new') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          query = query.gte('created_at', sevenDaysAgo.toISOString());
        } else {
          query = query.eq('category', filters.category);
        }
      }
      
      if (filters?.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }
      
      if (filters?.userId) {
        query = query.eq('created_by', filters.userId);
      }
      
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      if (filters?.trending) {
        query = query.order('likes_count', { ascending: false })
                     .order('execution_count', { ascending: false });
      } else if (filters?.orderBy) {
        query = query.order(filters.orderBy, { ascending: false });
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      const result = { data: data || [], count: count || 0 };
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      EventLogger.error('UniversalDataService', 'Failed to get automations', error as Error);
      return { data: [], count: 0 };
    }
  }

  async getAutomationStats(automationId: string) {
    const cacheKey = `stats_${automationId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('automations')
        .select('likes_count, downloads_count, execution_count, average_rating, rating_count, view_count')
        .eq('id', automationId)
        .single();

      if (error) throw error;
      
      const stats = {
        likes: data?.likes_count || 0,
        downloads: data?.downloads_count || 0,
        runs: data?.execution_count || 0,
        rating: data?.average_rating || 0,
        ratingCount: data?.rating_count || 0,
        views: data?.view_count || 0,
      };
      
      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      EventLogger.error('UniversalDataService', 'Failed to get automation stats', error as Error);
      return { likes: 0, downloads: 0, runs: 0, rating: 0, ratingCount: 0, views: 0 };
    }
  }

  async getCategoryCounts() {
    const cacheKey = 'category_counts';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('automations')
        .select('category, created_at, likes_count, average_rating')
        .eq('is_public', true);

      if (error) throw error;

      const counts: Record<string, number> = {
        all: data?.length || 0,
        popular: 0,
        new: 0,
      };

      if (data && data.length > 0) {
        // Count by category
        data.forEach((item) => {
          const category = item.category || 'other';
          counts[category] = (counts[category] || 0) + 1;
        });

        // Count popular
        counts.popular = data.filter(item => 
          (item.likes_count && item.likes_count >= 50) || 
          (item.average_rating && item.average_rating >= 4.5)
        ).length;

        // Count new (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        counts.new = data.filter(item => 
          new Date(item.created_at) >= sevenDaysAgo
        ).length;
      }

      this.setCache(cacheKey, counts);
      return counts;
    } catch (error) {
      EventLogger.error('UniversalDataService', 'Failed to get category counts', error as Error);
      return {};
    }
  }

  // ========== USER DATA ==========

  async getUserProfile(userId: string) {
    const cacheKey = `profile_${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      EventLogger.error('UniversalDataService', 'Failed to get user profile', error as Error);
      return null;
    }
  }

  async getUserStats(userId: string) {
    const cacheKey = `user_stats_${userId}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Get user's automations
      const { data: automations } = await supabase
        .from('automations')
        .select('likes_count, downloads_count, execution_count, is_public')
        .eq('created_by', userId);

      const stats = {
        totalAutomations: automations?.length || 0,
        publicAutomations: automations?.filter(a => a.is_public).length || 0,
        totalLikes: automations?.reduce((sum, a) => sum + (a.likes_count || 0), 0) || 0,
        totalDownloads: automations?.reduce((sum, a) => sum + (a.downloads_count || 0), 0) || 0,
        totalRuns: automations?.reduce((sum, a) => sum + (a.execution_count || 0), 0) || 0,
      };

      this.setCache(cacheKey, stats);
      return stats;
    } catch (error) {
      EventLogger.error('UniversalDataService', 'Failed to get user stats', error as Error);
      return {
        totalAutomations: 0,
        publicAutomations: 0,
        totalLikes: 0,
        totalDownloads: 0,
        totalRuns: 0,
      };
    }
  }

  // ========== FEATURED & TRENDING ==========

  async getFeaturedAutomations() {
    return this.getAutomations({
      isPublic: true,
      trending: true,
      limit: 10,
    });
  }

  async getTrendingAutomations() {
    return this.getAutomations({
      isPublic: true,
      orderBy: 'likes_count',
      limit: 20,
    });
  }

  async getRecentAutomations() {
    return this.getAutomations({
      isPublic: true,
      orderBy: 'created_at',
      limit: 20,
    });
  }

  // ========== TEMPLATES ==========

  async getTemplates(category?: string) {
    return this.getAutomations({
      isPublic: true,
      category: category,
      orderBy: 'downloads_count',
      limit: 50,
    });
  }

  // ========== REAL-TIME SUBSCRIPTIONS ==========

  subscribeToAutomation(automationId: string, callback: (data: any) => void) {
    const subscription = supabase
      .channel(`automation_${automationId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'automations',
          filter: `id=eq.${automationId}`
        }, 
        (payload) => {
          this.invalidateCache(`automation_${automationId}`);
          this.invalidateCache(`stats_${automationId}`);
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  subscribeToCategories(callback: () => void) {
    const subscription = supabase
      .channel('category_updates')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'automations',
        },
        () => {
          this.invalidateCache('category_counts');
          callback();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }

  // ========== CACHE MANAGEMENT ==========

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidateCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      EventLogger.debug('UniversalDataService', 'Cache cleared');
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
    EventLogger.debug('UniversalDataService', `Cache invalidated for pattern: ${pattern}`);
  }

  // ========== MUTATIONS ==========

  async incrementStat(automationId: string, stat: 'likes' | 'downloads' | 'runs' | 'views') {
    const columnMap = {
      likes: 'likes_count',
      downloads: 'downloads_count',
      runs: 'execution_count',
      views: 'view_count',
    };

    try {
      // Simple increment without RPC for now
      const { data: current } = await supabase
        .from('automations')
        .select(columnMap[stat])
        .eq('id', automationId)
        .single();

      const currentValue = current?.[columnMap[stat]] || 0;

      const { error } = await supabase
        .from('automations')
        .update({ [columnMap[stat]]: currentValue + 1 })
        .eq('id', automationId);

      if (error) throw error;

      // Invalidate related caches
      this.invalidateCache(`automation_${automationId}`);
      this.invalidateCache(`stats_${automationId}`);
      
      return true;
    } catch (error) {
      EventLogger.error('UniversalDataService', `Failed to increment ${stat}`, error as Error);
      return false;
    }
  }

  async createAutomation(automation: any) {
    try {
      const { data, error } = await supabase
        .from('automations')
        .insert(automation)
        .select()
        .single();

      if (error) throw error;

      // Invalidate caches
      this.invalidateCache('automations');
      this.invalidateCache('category_counts');
      
      return data;
    } catch (error) {
      EventLogger.error('UniversalDataService', 'Failed to create automation', error as Error);
      throw error;
    }
  }

  async updateAutomation(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('automations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Invalidate caches
      this.invalidateCache(`automation_${id}`);
      this.invalidateCache('automations');
      
      return data;
    } catch (error) {
      EventLogger.error('UniversalDataService', 'Failed to update automation', error as Error);
      throw error;
    }
  }

  async deleteAutomation(id: string) {
    try {
      const { error } = await supabase
        .from('automations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Invalidate caches
      this.invalidateCache(`automation_${id}`);
      this.invalidateCache('automations');
      this.invalidateCache('category_counts');
      
      return true;
    } catch (error) {
      EventLogger.error('UniversalDataService', 'Failed to delete automation', error as Error);
      throw error;
    }
  }
}

export const dataService = UniversalDataService.getInstance();