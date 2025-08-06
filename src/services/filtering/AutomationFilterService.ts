import { supabase } from '../supabase/client';
import { AutomationData } from '../../types';
import { EventLogger } from '../../utils/EventLogger';

export interface FilterOptions {
  category: string | null;
  sortBy: 'created_at' | 'title' | 'rating' | 'popularity' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  minRating: number;
  isPublic: boolean | null;
  hasSteps: boolean | null;
  tags: string[];
  dateRange: 'all' | 'week' | 'month' | 'year';
  searchQuery?: string;
}

export interface FilterResult {
  automations: AutomationData[];
  totalCount: number;
  filteredCount: number;
  categories: Array<{ id: string; name: string; count: number }>;
  tags: Array<{ tag: string; count: number }>;
}

export class AutomationFilterService {
  private static instance: AutomationFilterService;

  private constructor() {}

  static getInstance(): AutomationFilterService {
    if (!AutomationFilterService.instance) {
      AutomationFilterService.instance = new AutomationFilterService();
    }
    return AutomationFilterService.instance;
  }

  /**
   * Get filtered and sorted automations from Supabase
   */
  async getFilteredAutomations(
    filters: FilterOptions,
    page: number = 1,
    limit: number = 20
  ): Promise<FilterResult> {
    try {
      let query = supabase
        .from('automations')
        .select('*', { count: 'exact' });

      // Apply visibility filter
      if (filters.isPublic !== null) {
        query = query.eq('is_public', filters.isPublic);
      } else {
        // Default to public automations for gallery
        query = query.eq('is_public', true);
      }

      // Apply category filter
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      // Apply minimum rating filter
      if (filters.minRating > 0) {
        query = query.gte('average_rating', filters.minRating);
      }

      // Apply date range filter
      if (filters.dateRange !== 'all') {
        const dateLimit = this.getDateLimit(filters.dateRange);
        query = query.gte('created_at', dateLimit.toISOString());
      }

      // Apply search query filter
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const searchTerm = filters.searchQuery.trim();
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply tags filter
      if (filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      // Apply has steps filter
      if (filters.hasSteps === true) {
        query = query.not('steps', 'is', null);
      }

      // Apply sorting
      const sortColumn = this.getSortColumn(filters.sortBy);
      query = query.order(sortColumn, { ascending: filters.sortOrder === 'asc' });

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch automations: ${error.message}`);
      }

      // Get total count for pagination
      const totalCount = count || 0;

      // Process automations (calculate derived fields, etc.)
      const processedAutomations = this.processAutomations(data || []);

      // Get metadata (categories and tags)
      const metadata = await this.getFilterMetadata(filters);

      return {
        automations: processedAutomations,
        totalCount,
        filteredCount: processedAutomations.length,
        categories: metadata.categories,
        tags: metadata.tags,
      };

    } catch (error) {
      EventLogger.error('Automation', 'Failed to get filtered automations:', error as Error);
      throw error;
    }
  }

  /**
   * Get available filter options (categories, tags, etc.)
   */
  async getAvailableFilters(): Promise<{
    categories: Array<{ id: string; name: string; icon: string; color: string; count: number }>;
    tags: string[];
    dateRangeOptions: Array<{ value: string; label: string; count: number }>;
  }> {
    try {
      // Get categories with counts
      const { data: categoryData, error: categoryError } = await supabase
        .from('automations')
        .select('category')
        .eq('is_public', true);

      if (categoryError) throw categoryError;

      // Get all available tags
      const { data: tagData, error: tagError } = await supabase
        .from('automations')
        .select('tags')
        .eq('is_public', true);

      if (tagError) throw tagError;

      // Process categories
      const categoryMap = new Map<string, number>();
      categoryData?.forEach(item => {
        const count = categoryMap.get(item.category) || 0;
        categoryMap.set(item.category, count + 1);
      });

      const categories = Array.from(categoryMap.entries()).map(([id, count]) => ({
        id,
        name: this.getCategoryDisplayName(id),
        icon: this.getCategoryIcon(id),
        color: this.getCategoryColor(id),
        count,
      }));

      // Process tags
      const tagSet = new Set<string>();
      tagData?.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => tagSet.add(tag));
        }
      });

      const tags = Array.from(tagSet).sort();

      // Date range options (would need to query for actual counts)
      const dateRangeOptions = [
        { value: 'all', label: 'All Time', count: categoryData?.length || 0 },
        { value: 'week', label: 'This Week', count: 0 },
        { value: 'month', label: 'This Month', count: 0 },
        { value: 'year', label: 'This Year', count: 0 },
      ];

      return {
        categories,
        tags,
        dateRangeOptions,
      };

    } catch (error) {
      EventLogger.error('Automation', 'Failed to get available filters:', error as Error);
      throw error;
    }
  }

  /**
   * Get popular automations (trending, most used, etc.)
   */
  async getPopularAutomations(limit: number = 10): Promise<AutomationData[]> {
    try {
      const { data, error } = await supabase
        .from('automations')
        .select('*')
        .eq('is_public', true)
        .order('execution_count', { ascending: false })
        .order('average_rating', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch popular automations: ${error.message}`);
      }

      return this.processAutomations(data || []);
    } catch (error) {
      EventLogger.error('Automation', 'Failed to get popular automations:', error as Error);
      throw error;
    }
  }

  /**
   * Get recommended automations based on user behavior
   */
  async getRecommendedAutomations(
    userId: string,
    limit: number = 10
  ): Promise<AutomationData[]> {
    try {
      // Simple recommendation: get automations from categories the user has created
      const { data: userAutomations, error: userError } = await supabase
        .from('automations')
        .select('category')
        .eq('created_by', userId)
        .limit(5);

      if (userError) throw userError;

      const userCategories = [...new Set(userAutomations?.map(a => a.category) || [])];

      let query = supabase
        .from('automations')
        .select('*')
        .eq('is_public', true)
        .neq('created_by', userId);

      if (userCategories.length > 0) {
        query = query.in('category', userCategories);
      }

      const { data, error } = await query
        .order('average_rating', { ascending: false })
        .order('execution_count', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch recommended automations: ${error.message}`);
      }

      return this.processAutomations(data || []);
    } catch (error) {
      EventLogger.error('Automation', 'Failed to get recommended automations:', error as Error);
      throw error;
    }
  }

  /**
   * Search automations with advanced text search
   */
  async searchAutomations(
    query: string,
    filters: Partial<FilterOptions> = {},
    limit: number = 20
  ): Promise<AutomationData[]> {
    try {
      if (!query.trim()) return [];

      const searchTerm = query.trim();
      
      let supabaseQuery = supabase
        .from('automations')
        .select('*')
        .eq('is_public', true);

      // Text search across multiple fields
      supabaseQuery = supabaseQuery.or(
        `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`
      );

      // Apply additional filters if provided
      if (filters.category) {
        supabaseQuery = supabaseQuery.eq('category', filters.category);
      }

      if (filters.minRating && filters.minRating > 0) {
        supabaseQuery = supabaseQuery.gte('average_rating', filters.minRating);
      }

      const { data, error } = await supabaseQuery
        .order('average_rating', { ascending: false })
        .order('execution_count', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      return this.processAutomations(data || []);
    } catch (error) {
      EventLogger.error('Automation', 'Failed to search automations:', error as Error);
      throw error;
    }
  }

  // Private helper methods

  private getSortColumn(sortBy: FilterOptions['sortBy']): string {
    switch (sortBy) {
      case 'title': return 'title';
      case 'rating': return 'average_rating';
      case 'popularity': return 'execution_count';
      case 'updated_at': return 'updated_at';
      case 'created_at':
      default: return 'created_at';
    }
  }

  private getDateLimit(dateRange: string): Date {
    const now = new Date();
    switch (dateRange) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'year':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(0);
    }
  }

  private processAutomations(automations: any[]): AutomationData[] {
    return automations.map(automation => ({
      ...automation,
      // Ensure steps is always an array
      steps: automation.steps || [],
      // Ensure tags is always an array
      tags: automation.tags || [],
      // Calculate derived fields
      step_count: automation.steps?.length || 0,
      has_reviews: automation.rating_count > 0,
    }));
  }

  private async getFilterMetadata(filters: FilterOptions): Promise<{
    categories: Array<{ id: string; name: string; count: number }>;
    tags: Array<{ tag: string; count: number }>;
  }> {
    // Simplified metadata - in a real app, you'd want to get actual counts
    // based on current filters
    return {
      categories: [],
      tags: [],
    };
  }

  private getCategoryDisplayName(categoryId: string): string {
    const categoryNames: Record<string, string> = {
      'essentials': 'Essentials',
      'productivity': 'Productivity',
      'morning-routine': 'Morning Routine',
      'travel': 'Travel',
      'emergency': 'Emergency',
      'home': 'Home',
      'social': 'Social',
      'health': 'Health',
      'entertainment': 'Entertainment',
      'general': 'General',
    };
    return categoryNames[categoryId] || categoryId;
  }

  private getCategoryIcon(categoryId: string): string {
    const categoryIcons: Record<string, string> = {
      'essentials': 'star',
      'productivity': 'briefcase',
      'morning-routine': 'weather-sunny',
      'travel': 'airplane',
      'emergency': 'alert-circle',
      'home': 'home',
      'social': 'account-group',
      'health': 'heart',
      'entertainment': 'movie',
      'general': 'apps',
    };
    return categoryIcons[categoryId] || 'apps';
  }

  private getCategoryColor(categoryId: string): string {
    const categoryColors: Record<string, string> = {
      'essentials': '#6200ee',
      'productivity': '#03dac6',
      'morning-routine': '#ff6b00',
      'travel': '#e91e63',
      'emergency': '#f44336',
      'home': '#4caf50',
      'social': '#2196f3',
      'health': '#ff9800',
      'entertainment': '#9c27b0',
      'general': '#757575',
    };
    return categoryColors[categoryId] || '#757575';
  }
}

export const automationFilterService = AutomationFilterService.getInstance();