import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { supabase } from '../../services/supabase/client';
import Constants from 'expo-constants';

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

// Simplified base query without complex auth handling
const supabaseBaseQuery = fetchBaseQuery({
  baseUrl: '/',
  timeout: 10000, // 10 second timeout
  prepareHeaders: async (headers, { getState }) => {
    try {
      // Only add auth headers if we have a token in Redux state
      const state = getState() as any;
      const accessToken = state.auth?.accessToken;
      
      if (accessToken) {
        headers.set('authorization', `Bearer ${accessToken}`);
      }
      
      // Always add the anon key for public access
      headers.set('apikey', supabaseAnonKey);
      
      return headers;
    } catch (error) {
      console.warn('Failed to prepare headers:', error);
      headers.set('apikey', supabaseAnonKey);
      return headers;
    }
  },
});

// Simplified base query without retry logic to prevent infinite loops
const enhancedBaseQuery = supabaseBaseQuery;

export type TimeRange = '24h' | '7d' | '30d' | 'all';

interface AnalyticsData {
  executionTimeline: Array<{ x: number; y: number }>;
  successRate: number;
  totalExecutions: number;
  avgExecutionTime: number;
  timeSaved: number;
  activeAutomations: number;
  topAutomations: Array<{
    name: string;
    executions: number;
    avgTime: number;
  }>;
}

interface ExecutionStats {
  date: string;
  count: number;
  successful: number;
  failed: number;
  avg_duration: number;
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: enhancedBaseQuery,
  tagTypes: ['Analytics'],
  endpoints: (builder) => ({
    getAnalytics: builder.query<AnalyticsData, { timeRange: TimeRange }>({
      async queryFn({ timeRange }, { getState }, extraOptions, baseQuery) {
        try {
          // Calculate date range
          const endDate = new Date();
          const startDate = new Date();
          
          switch (timeRange) {
            case '24h':
              startDate.setHours(startDate.getHours() - 24);
              break;
            case '7d':
              startDate.setDate(startDate.getDate() - 7);
              break;
            case '30d':
              startDate.setDate(startDate.getDate() - 30);
              break;
            case 'all':
              startDate.setFullYear(startDate.getFullYear() - 10); // Effectively all time
              break;
          }
          
          // Get execution stats
          const { data: executions, error: executionsError } = await baseQuery({
            url: 'automation_executions',
            params: {
              select: '*,automation:automations(name)',
              created_at: `gte.${startDate.toISOString()}`,
              order: 'created_at.desc',
            },
          });
          
          if (executionsError) throw executionsError;
          
          // Calculate analytics
          const totalExecutions = executions?.length || 0;
          const successfulExecutions = executions?.filter((e: any) => e.status === 'success').length || 0;
          const successRate = totalExecutions > 0 ? Math.round((successfulExecutions / totalExecutions) * 100) : 100;
          
          // Calculate execution timeline
          const executionsByDay = new Map<string, number>();
          executions?.forEach((execution: any) => {
            const date = new Date(execution.created_at).toLocaleDateString();
            executionsByDay.set(date, (executionsByDay.get(date) || 0) + 1);
          });
          
          const executionTimeline = Array.from(executionsByDay.entries())
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map((entry, index) => ({ x: index + 1, y: entry[1] }));
          
          // Calculate top automations
          const automationCounts = new Map<string, { count: number; totalTime: number }>();
          executions?.forEach((execution: any) => {
            const name = execution.automation?.name || 'Unknown';
            const current = automationCounts.get(name) || { count: 0, totalTime: 0 };
            automationCounts.set(name, {
              count: current.count + 1,
              totalTime: current.totalTime + (execution.execution_time || 0),
            });
          });
          
          const topAutomations = Array.from(automationCounts.entries())
            .map(([name, stats]) => ({
              name,
              executions: stats.count,
              avgTime: Math.round((stats.totalTime / stats.count) * 10) / 10,
            }))
            .sort((a, b) => b.executions - a.executions)
            .slice(0, 5);
          
          // Calculate average execution time and time saved
          const totalExecutionTime = executions?.reduce((sum: number, e: any) => sum + (e.execution_time || 0), 0) || 0;
          const avgExecutionTime = totalExecutions > 0 ? Math.round((totalExecutionTime / totalExecutions) * 10) / 10 : 0;
          const timeSaved = Math.round(totalExecutions * 2); // Assume each automation saves 2 minutes on average
          
          // Get active automations count
          const { data: automations } = await baseQuery({
            url: 'automations',
            params: {
              select: 'id',
              is_active: 'eq.true',
            },
          });
          
          const activeAutomations = automations?.length || 0;
          
          return {
            data: {
              executionTimeline,
              successRate,
              totalExecutions,
              avgExecutionTime,
              timeSaved,
              activeAutomations,
              topAutomations,
            },
          };
        } catch (error) {
          return { error };
        }
      },
      providesTags: ['Analytics'],
    }),
    
    getExecutionStats: builder.query<ExecutionStats[], { timeRange: TimeRange }>({
      query: ({ timeRange }) => ({
        url: 'rpc/get_execution_stats',
        method: 'POST',
        body: { time_range: timeRange },
      }),
      providesTags: ['Analytics'],
    }),
    
    getAutomationMetrics: builder.query<any, { automationId: string }>({
      query: ({ automationId }) => ({
        url: 'automation_executions',
        params: {
          select: '*',
          automation_id: `eq.${automationId}`,
          order: 'created_at.desc',
          limit: 100,
        },
      }),
      transformResponse: (response: any[]) => {
        const total = response.length;
        const successful = response.filter(e => e.status === 'success').length;
        const totalTime = response.reduce((sum, e) => sum + (e.execution_time || 0), 0);
        
        return {
          totalRuns: total,
          successRate: total > 0 ? (successful / total) * 100 : 0,
          avgExecutionTime: total > 0 ? totalTime / total : 0,
          lastRun: response[0]?.created_at,
          executions: response.slice(0, 10), // Last 10 executions
        };
      },
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetAnalyticsQuery,
  useGetExecutionStatsQuery,
  useGetAutomationMetricsQuery,
} = analyticsApi;