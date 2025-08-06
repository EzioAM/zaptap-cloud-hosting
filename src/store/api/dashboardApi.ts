import { createApi } from '@reduxjs/toolkit/query/react';
import { supabase } from '../../services/supabase/client';
import { DEFAULT_AVATAR } from '../../constants/defaults';
import { EventLogger } from '../../utils/EventLogger';

interface TodayStats {
  totalExecutions: number;
  successRate: number;
  averageTime: number;
  timeSaved: number;
}

interface RecentActivity {
  id: string;
  status: 'success' | 'failed' | 'running' | 'cancelled';
  executionTime: number;
  createdAt: string;
  automation: {
    title: string;
    icon?: string;
  };
}

interface FeaturedAutomation {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  likesCount: number;
  downloadsCount: number;
  createdBy: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
}

const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: async ({ url, method = 'GET', body, params }) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: { status: 401, data: 'Not authenticated' } };
      }

      // Handle RPC calls
      if (url.startsWith('rpc/')) {
        const functionName = url.replace('rpc/', '');
        const { data, error } = await supabase.rpc(functionName, body);
        
        if (error) {
          return { error: { status: 500, data: error.message } };
        }
        
        return { data };
      }

      // Handle regular queries
      let query = supabase.from(url);
      
      // Apply params
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (key === 'select') {
            query = query.select(value as string);
          } else if (key === 'order') {
            const [column, direction] = (value as string).split('.');
            query = query.order(column, { ascending: direction === 'asc' });
          } else if (key === 'limit') {
            query = query.limit(value as number);
          } else {
            // Handle filter params like user_id: 'eq.${userId}'
            const [operator, filterValue] = (value as string).split('.');
            if (operator === 'eq') {
              query = query.eq(key, filterValue);
            }
          }
        });
      }

      const { data, error } = await query;
      
      if (error) {
        return { error: { status: 500, data: error.message } };
      }
      
      return { data };
    } catch (error) {
      return { error: { status: 500, data: 'An unexpected error occurred' } };
    }
  },
  tagTypes: ['Dashboard', 'Stats', 'Activity', 'Featured'],
  endpoints: (builder) => ({
    getTodayStats: builder.query<TodayStats, void>({
      queryFn: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            return { data: { totalExecutions: 0, successRate: 0, averageTime: 0, timeSaved: 0 } };
          }

          const today = new Date().toISOString().split('T')[0];
          
          const { data: executions, error } = await supabase
            .from('automation_executions')
            .select('status, execution_time')
            .eq('user_id', user.id)
            .gte('created_at', `${today}T00:00:00`)
            .lte('created_at', `${today}T23:59:59`);

          if (error) {
            EventLogger.error('API', 'Error fetching today stats:', error as Error);
            // Return default values on error instead of throwing
            return { data: { totalExecutions: 0, successRate: 0, averageTime: 0, timeSaved: 0 } };
          }

          if (!executions || executions.length === 0) {
            return { data: { totalExecutions: 0, successRate: 0, averageTime: 0, timeSaved: 0 } };
          }

          const successful = executions.filter(e => e.status === 'success');
          const totalTime = successful.reduce((acc, e) => acc + (e.execution_time || 0), 0);
          
          return {
            data: {
              totalExecutions: executions.length,
              successRate: Math.round((successful.length / executions.length) * 100),
              averageTime: successful.length > 0 ? Math.round(totalTime / successful.length) : 0,
              timeSaved: Math.round(totalTime / 1000 * 5) // Estimate 5x time saved
            }
          };
        } catch (error) {
          EventLogger.error('API', 'Failed to fetch today stats:', error as Error);
          // Return default values on any error
          return { data: { totalExecutions: 0, successRate: 0, averageTime: 0, timeSaved: 0 } };
        }
      },
      providesTags: ['Stats'],
    }),

    getRecentActivity: builder.query<RecentActivity[], void>({
      queryFn: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            return { data: [] };
          }

          const { data: executions, error } = await supabase
            .from('automation_executions')
            .select('id,status,execution_time,created_at,automation_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

          if (error) {
            EventLogger.error('API', 'Error fetching recent activity:', error as Error);
            return { data: [] };
          }

          if (!executions || executions.length === 0) {
            return { data: [] };
          }

          // Fetch automation details
          const automationIds = executions.map(r => r.automation_id).filter(Boolean);
          if (automationIds.length === 0) {
            return { data: [] };
          }

          const { data: automations, error: automationsError } = await supabase
            .from('automations')
            .select('id, title')
            .in('id', automationIds);

          if (automationsError) {
            EventLogger.error('API', 'Error fetching automation details:', automationsError as Error);
          }

          const automationMap = new Map(automations?.map(a => [a.id, a]) || []);
          
          return {
            data: executions.map(execution => ({
              id: execution.id,
              status: execution.status,
              executionTime: execution.execution_time || 0,
              createdAt: execution.created_at,
              automation: automationMap.get(execution.automation_id) || {
                title: 'Unknown Automation',
                icon: 'help-circle'
              }
            }))
          };
        } catch (error) {
          EventLogger.error('API', 'Failed to fetch recent activity:', error as Error);
          return { data: [] };
        }
      },
      providesTags: ['Activity'],
    }),

    getFeaturedAutomation: builder.query<FeaturedAutomation | null, void>({
      queryFn: async () => {
        try {
          const { data: automations, error } = await supabase
            .from('automations')
            .select('id,title,description,category,tags,likes_count,downloads_count,created_by')
            .eq('is_public', true)
            .eq('is_template', true)
            .order('likes_count', { ascending: false })
            .limit(1);

          if (error) {
            EventLogger.error('API', 'Error fetching featured automation:', error as Error);
            return { data: null };
          }

          if (!automations || automations.length === 0) {
            return { data: null };
          }

          const automation = automations[0];
          
          // Fetch user details
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', automation.created_by)
            .single();

          if (userError) {
            EventLogger.error('API', 'Error fetching user details:', userError as Error);
          }
          
          return {
            data: {
              id: automation.id,
              title: automation.title,
              description: automation.description,
              category: automation.category || 'Productivity',
              tags: automation.tags || [],
              likesCount: automation.likes_count || 0,
              downloadsCount: automation.downloads_count || 0,
              createdBy: automation.created_by,
              user: {
                name: userData?.name || 'Anonymous',
                avatarUrl: userData?.avatar_url || DEFAULT_AVATAR
              }
            }
          };
        } catch (error) {
          EventLogger.error('API', 'Failed to fetch featured automation:', error as Error);
          return { data: null };
        }
      },
      providesTags: ['Featured'],
    }),

    refreshDashboard: builder.mutation<void, void>({
      queryFn: () => ({ data: null }),
      invalidatesTags: ['Stats', 'Activity', 'Featured'],
    }),
  }),
});

export const {
  useGetTodayStatsQuery,
  useGetRecentActivityQuery,
  useGetFeaturedAutomationQuery,
  useRefreshDashboardMutation,
} = dashboardApi;

export default dashboardApi;