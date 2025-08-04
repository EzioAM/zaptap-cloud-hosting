/**
 * Analytics API - Unified and Optimized
 * 
 * This module provides consistent API endpoints for analytics and metrics
 * with proper error handling, caching, and fallback strategies.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { supabase } from '../../services/supabase/client';
import { baseApiConfig, rpcApiConfig, ApiError } from './baseApi';

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

interface AutomationMetrics {
  totalRuns: number;
  successRate: number;
  avgExecutionTime: number;
  lastRun?: string;
  executions: any[];
}

/**
 * Enhanced analytics API with unified configuration
 */
export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  ...baseApiConfig,
  tagTypes: ['Analytics', 'Metrics'],
  endpoints: (builder) => ({
    /**
     * Get comprehensive analytics data
     */
    getAnalytics: builder.query<AnalyticsData, { timeRange: TimeRange }>({
      queryFn: async ({ timeRange }, { signal }) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            // Return empty analytics for unauthenticated users
            return {
              data: {
                executionTimeline: [],
                successRate: 100,
                totalExecutions: 0,
                avgExecutionTime: 0,
                timeSaved: 0,
                activeAutomations: 0,
                topAutomations: [],
              }
            };
          }

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
              startDate.setFullYear(startDate.getFullYear() - 10);
              break;
          }
          
          // Get execution data with proper filtering
          const { data: executions, error: executionsError } = await supabase
            .from('automation_executions')
            .select(`
              *,
              automation:automations(name, title)
            `)
            .eq('user_id', user.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false })
            .abortSignal(signal);
          
          if (executionsError) {
            console.error('Error fetching executions:', executionsError);
            return {
              error: {
                status: 'FETCH_ERROR',
                message: executionsError.message || 'Failed to fetch analytics data',
                code: executionsError.code,
              }
            };
          }
          
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
            const name = execution.automation?.name || execution.automation?.title || 'Unknown';
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
              avgTime: stats.count > 0 ? Math.round((stats.totalTime / stats.count) * 10) / 10 : 0,
            }))
            .sort((a, b) => b.executions - a.executions)
            .slice(0, 5);
          
          // Calculate average execution time and time saved
          const totalExecutionTime = executions?.reduce((sum: number, e: any) => sum + (e.execution_time || 0), 0) || 0;
          const avgExecutionTime = totalExecutions > 0 ? Math.round((totalExecutionTime / totalExecutions) * 10) / 10 : 0;
          const timeSaved = Math.round(totalExecutions * 2); // Assume each automation saves 2 minutes on average
          
          // Get active automations count
          const { data: automations, error: automationsError } = await supabase
            .from('automations')
            .select('id')
            .eq('created_by', user.id)
            .eq('is_active', true)
            .abortSignal(signal);
          
          if (automationsError) {
            console.warn('Failed to fetch active automations count:', automationsError);
          }
          
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
            }
          };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          console.error('Failed to fetch analytics:', error);
          return {
            error: {
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch analytics data',
            }
          };
        }
      },
      providesTags: (result, error, { timeRange }) => [
        { type: 'Analytics', id: `OVERVIEW_${timeRange}` },
      ],
    }),
    
    /**
     * Get execution statistics using RPC function with fallback
     */
    getExecutionStats: builder.query<ExecutionStats[], { timeRange: TimeRange }>({
      queryFn: async ({ timeRange }, { signal }) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            return { data: [] };
          }

          // Try RPC function first
          const { data, error } = await supabase
            .rpc('get_execution_stats', { 
              p_user_id: user.id,
              p_time_range: timeRange 
            })
            .abortSignal(signal);

          if (error) {
            console.warn('RPC function not available, using fallback:', error.message);
            
            // Fallback: calculate stats manually
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
                startDate.setFullYear(startDate.getFullYear() - 10);
                break;
            }

            const { data: executions, error: fallbackError } = await supabase
              .from('automation_executions')
              .select('*')
              .eq('user_id', user.id)
              .gte('created_at', startDate.toISOString())
              .lte('created_at', endDate.toISOString())
              .abortSignal(signal);

            if (fallbackError) {
              return {
                error: {
                  status: 'FETCH_ERROR',
                  message: fallbackError.message || 'Failed to fetch execution stats',
                  code: fallbackError.code,
                }
              };
            }

            // Group by date and calculate stats
            const statsByDate = new Map<string, ExecutionStats>();
            
            executions?.forEach((execution: any) => {
              const date = new Date(execution.created_at).toDateString();
              const existing = statsByDate.get(date) || {
                date,
                count: 0,
                successful: 0,
                failed: 0,
                avg_duration: 0,
              };

              existing.count += 1;
              if (execution.status === 'success') {
                existing.successful += 1;
              } else {
                existing.failed += 1;
              }

              statsByDate.set(date, existing);
            });

            return { data: Array.from(statsByDate.values()) };
          }

          return { data: data || [] };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          console.error('Failed to fetch execution stats:', error);
          return {
            error: {
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch execution stats',
            }
          };
        }
      },
      providesTags: (result, error, { timeRange }) => [
        { type: 'Analytics', id: `STATS_${timeRange}` },
      ],
    }),
    
    /**
     * Get metrics for a specific automation
     */
    getAutomationMetrics: builder.query<AutomationMetrics, { automationId: string }>({
      queryFn: async ({ automationId }, { signal }) => {
        try {
          const { data: executions, error } = await supabase
            .from('automation_executions')
            .select('*')
            .eq('automation_id', automationId)
            .order('created_at', { ascending: false })
            .limit(100)
            .abortSignal(signal);

          if (error) {
            console.error('Error fetching automation metrics:', error);
            return {
              error: {
                status: 'FETCH_ERROR',
                message: error.message || 'Failed to fetch automation metrics',
                code: error.code,
              }
            };
          }

          const total = executions?.length || 0;
          const successful = executions?.filter(e => e.status === 'success').length || 0;
          const totalTime = executions?.reduce((sum, e) => sum + (e.execution_time || 0), 0) || 0;
          
          return {
            data: {
              totalRuns: total,
              successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
              avgExecutionTime: total > 0 ? Math.round((totalTime / total) * 10) / 10 : 0,
              lastRun: executions?.[0]?.created_at,
              executions: executions?.slice(0, 10) || [], // Last 10 executions
            }
          };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          console.error('Failed to fetch automation metrics:', error);
          return {
            error: {
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch automation metrics',
            }
          };
        }
      },
      providesTags: (result, error, { automationId }) => [
        { type: 'Metrics', id: automationId },
      ],
    }),

    /**
     * Get system-wide analytics (admin only)
     */
    getSystemAnalytics: builder.query<any, void>({
      queryFn: async (_, { signal }) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            return {
              error: {
                status: 'UNAUTHORIZED',
                message: 'Not authenticated',
              }
            };
          }

          // Try RPC function for system analytics
          const { data, error } = await supabase
            .rpc('get_system_analytics')
            .abortSignal(signal);

          if (error) {
            console.warn('System analytics RPC not available:', error.message);
            return {
              error: {
                status: 'FETCH_ERROR',
                message: 'System analytics not available',
                code: error.code,
              }
            };
          }

          return { data: data || {} };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          console.error('Failed to fetch system analytics:', error);
          return {
            error: {
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch system analytics',
            }
          };
        }
      },
      providesTags: [{ type: 'Analytics', id: 'SYSTEM' }],
    }),
  }),
});

// Export hooks
export const {
  useGetAnalyticsQuery,
  useGetExecutionStatsQuery,
  useGetAutomationMetricsQuery,
  useGetSystemAnalyticsQuery,
} = analyticsApi;

export type { AnalyticsData, ExecutionStats, AutomationMetrics };