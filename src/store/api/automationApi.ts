/**
 * Automation API - Unified and Optimized
 * 
 * This module provides consistent API endpoints for automation management
 * with proper error handling, caching, and authentication.
 */

import { createApi } from '@reduxjs/toolkit/query/react';
import { supabase } from '../../services/supabase/client';
import { AutomationData, UserStats, AutomationExecution } from '../../types';
import { baseApiConfig, createQueryConfig, createCacheTags, ApiError } from './baseApi';
import { networkAwareQuery, logApiError } from './networkAwareApi';
import { EventLogger } from '../../utils/EventLogger';

/**
 * Enhanced automation API with unified configuration
 */
export const automationApi = createApi({
  reducerPath: 'automationApi',
  ...baseApiConfig,
  tagTypes: ['Automation', 'User', 'Execution'],
  endpoints: (builder) => ({
    // ===== AUTOMATION MANAGEMENT =====

    /**
     * Get user's automations with proper error handling
     */
    getMyAutomations: builder.query<AutomationData[], void>({
      queryFn: async (_, { signal }) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            return { data: [] };
          }

          const { data, error } = await supabase
            .from('automations')
            .select('*')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
            .abortSignal(signal);

          if (error) {
            EventLogger.error('API', 'Error fetching user automations:', error as Error);
            return { 
              error: { 
                status: 'FETCH_ERROR',
                message: error.message || 'Failed to fetch automations',
                code: error.code,
              } 
            };
          }

          return { data: data || [] };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          EventLogger.error('API', 'Failed to fetch user automations:', error as Error);
          return { 
            error: { 
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch automations',
            } 
          };
        }
      },
      providesTags: (result) => 
        result 
          ? [...result.map(({ id }) => ({ type: 'Automation' as const, id })), { type: 'Automation', id: 'LIST' }]
          : [{ type: 'Automation', id: 'LIST' }],
    }),

    /**
     * Get single automation by ID
     */
    getAutomation: builder.query<AutomationData, string>({
      queryFn: async (id, { signal }) => {
        try {
          // Validate ID parameter before making request
          if (!id || typeof id !== 'string') {
            EventLogger.error('API', 'Invalid automation ID provided:', id as Error);
            return {
              error: {
                status: 'INVALID_REQUEST',
                message: 'Invalid automation ID provided',
                code: 'INVALID_PARAMS',
              }
            };
          }

          // Check for string literals that shouldn't be passed as UUIDs
          if (id === 'undefined' || id === 'null' || id === '') {
            EventLogger.error('API', 'Invalid automation ID value:', id as Error);
            return {
              error: {
                status: 'INVALID_REQUEST',
                message: `Invalid automation ID: "${id}"`,
                code: 'INVALID_UUID',
              }
            };
          }

          // Validate UUID format (optional but recommended for better error handling)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(id)) {
            EventLogger.error('API', 'Invalid UUID format:', id as Error);
            return {
              error: {
                status: 'INVALID_REQUEST',
                message: `Invalid UUID format: ${id}`,
                code: 'INVALID_UUID_FORMAT',
              }
            };
          }

          const { data, error } = await supabase
            .from('automations')
            .select('*')
            .eq('id', id)
            .single()
            .abortSignal(signal);

          if (error) {
            EventLogger.error('API', 'Error fetching automation:', error as Error);
            return {
              error: {
                status: error.code === 'PGRST116' ? 'NOT_FOUND' : 'FETCH_ERROR',
                message: error.code === 'PGRST116' ? 'Automation not found' : error.message,
                code: error.code,
              }
            };
          }

          return { data };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          EventLogger.error('API', 'Failed to fetch automation:', error as Error);
          return {
            error: {
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch automation',
            }
          };
        }
      },
      providesTags: (result, error, id) => [{ type: 'Automation', id }],
    }),

    /**
     * Get public automations for gallery
     */
    getPublicAutomations: builder.query<AutomationData[], { limit?: number }>({
      queryFn: async ({ limit = 50 }, { signal }) => {
        try {
          // Use network-aware wrapper to prevent calls when offline
          const data = await networkAwareQuery(
            async () => {
              const { data, error } = await supabase
                .from('automations')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .limit(limit)
                .abortSignal(signal);

              if (error) {
                logApiError(error, 'getPublicAutomations');
                throw error;
              }

              return data || [];
            },
            {
              offlineData: [], // Return empty array when offline
            }
          );

          return { data };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          // Check if it's an offline error
          if (error.status === 'OFFLINE' || error.code === 'NETWORK_OFFLINE') {
            return { data: [] }; // Return empty data instead of error for offline
          }
          
          logApiError(error, 'getPublicAutomations');
          return {
            error: {
              status: error.status || 'FETCH_ERROR',
              message: error.message || 'Failed to fetch public automations',
              code: error.code,
            }
          };
        }
      },
      providesTags: [{ type: 'Automation', id: 'PUBLIC' }],
    }),

    /**
     * Create new automation
     */
    createAutomation: builder.mutation<AutomationData, Partial<AutomationData>>({
      queryFn: async (automation) => {
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

          const automationToInsert = {
            title: automation.title || 'Untitled Automation',
            description: automation.description || 'Created with builder',
            steps: automation.steps || [],
            created_by: user.id,
            category: automation.category || 'Productivity',
            is_public: automation.is_public || false,
            tags: automation.tags || ['custom'],
          };

          const { data, error } = await supabase
            .from('automations')
            .insert(automationToInsert)
            .select()
            .single();

          if (error) {
            EventLogger.error('API', 'Error creating automation:', error as Error);
            return {
              error: {
                status: 'CREATE_ERROR',
                message: error.message || 'Failed to create automation',
                code: error.code,
              }
            };
          }

          return { data };
        } catch (error: any) {
          EventLogger.error('API', 'Failed to create automation:', error as Error);
          return {
            error: {
              status: 'CREATE_ERROR',
              message: error.message || 'Failed to create automation',
            }
          };
        }
      },
      invalidatesTags: [
        { type: 'Automation', id: 'LIST' },
        { type: 'User', id: 'STATS' },
      ],
    }),

    /**
     * Update automation
     */
    updateAutomation: builder.mutation<AutomationData, { id: string; updates: Partial<AutomationData> }>({
      queryFn: async ({ id, updates }) => {
        try {
          // Validate ID parameter
          if (!id || id === 'undefined' || id === 'null') {
            EventLogger.error('API', 'Invalid automation ID for update:', id as Error);
            return {
              error: {
                status: 'INVALID_REQUEST',
                message: 'Invalid automation ID provided for update',
                code: 'INVALID_PARAMS',
              }
            };
          }

          const { data, error } = await supabase
            .from('automations')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

          if (error) {
            EventLogger.error('API', 'Error updating automation:', error as Error);
            return {
              error: {
                status: 'UPDATE_ERROR',
                message: error.message || 'Failed to update automation',
                code: error.code,
              }
            };
          }

          return { data };
        } catch (error: any) {
          EventLogger.error('API', 'Failed to update automation:', error as Error);
          return {
            error: {
              status: 'UPDATE_ERROR',
              message: error.message || 'Failed to update automation',
            }
          };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Automation', id },
        { type: 'Automation', id: 'LIST' },
        { type: 'Automation', id: 'PUBLIC' },
      ],
    }),

    /**
     * Delete automation
     */
    deleteAutomation: builder.mutation<void, string>({
      queryFn: async (id) => {
        try {
          // Validate ID parameter
          if (!id || id === 'undefined' || id === 'null') {
            EventLogger.error('API', 'Invalid automation ID for deletion:', id as Error);
            return {
              error: {
                status: 'INVALID_REQUEST',
                message: 'Invalid automation ID provided for deletion',
                code: 'INVALID_PARAMS',
              }
            };
          }

          const { error } = await supabase
            .from('automations')
            .delete()
            .eq('id', id);

          if (error) {
            EventLogger.error('API', 'Error deleting automation:', error as Error);
            return {
              error: {
                status: 'DELETE_ERROR',
                message: error.message || 'Failed to delete automation',
                code: error.code,
              }
            };
          }

          return { data: null };
        } catch (error: any) {
          EventLogger.error('API', 'Failed to delete automation:', error as Error);
          return {
            error: {
              status: 'DELETE_ERROR',
              message: error.message || 'Failed to delete automation',
            }
          };
        }
      },
      invalidatesTags: (result, error, id) => [
        { type: 'Automation', id },
        { type: 'Automation', id: 'LIST' },
        { type: 'User', id: 'STATS' },
      ],
    }),

    /**
     * Clone automation
     */
    cloneAutomation: builder.mutation<AutomationData, string>({
      queryFn: async (automationId) => {
        try {
          // Validate automationId parameter
          if (!automationId || automationId === 'undefined' || automationId === 'null') {
            EventLogger.error('API', 'Invalid automation ID for cloning:', automationId as Error);
            return {
              error: {
                status: 'INVALID_REQUEST',
                message: 'Invalid automation ID provided for cloning',
                code: 'INVALID_PARAMS',
              }
            };
          }

          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            return {
              error: {
                status: 'UNAUTHORIZED',
                message: 'Not authenticated',
              }
            };
          }

          // Get the automation to clone
          const { data: originalAutomation, error: fetchError } = await supabase
            .from('automations')
            .select('*')
            .eq('id', automationId)
            .single();

          if (fetchError) {
            return {
              error: {
                status: fetchError.code === 'PGRST116' ? 'NOT_FOUND' : 'FETCH_ERROR',
                message: fetchError.code === 'PGRST116' ? 'Automation not found' : fetchError.message,
                code: fetchError.code,
              }
            };
          }

          // Create a new automation with the same data
          const { data, error } = await supabase
            .from('automations')
            .insert({
              ...originalAutomation,
              id: undefined,
              title: `${originalAutomation.title} (Copy)`,
              created_by: user.id,
              created_at: undefined,
              updated_at: undefined,
              is_public: false,
              execution_count: 0,
              average_rating: null,
              rating_count: 0
            })
            .select()
            .single();

          if (error) {
            return {
              error: {
                status: 'CREATE_ERROR',
                message: error.message || 'Failed to clone automation',
                code: error.code,
              }
            };
          }

          return { data };
        } catch (error: any) {
          EventLogger.error('API', 'Failed to clone automation:', error as Error);
          return {
            error: {
              status: 'CREATE_ERROR',
              message: error.message || 'Failed to clone automation',
            }
          };
        }
      },
      invalidatesTags: [
        { type: 'Automation', id: 'LIST' },
        { type: 'User', id: 'STATS' },
      ],
    }),

    // ===== USER STATISTICS =====

    /**
     * Get user statistics with fallback handling
     */
    getUserStats: builder.query<UserStats, void>({
      queryFn: async (_, { signal }) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            return { 
              data: { 
                total_automations: 0, 
                total_runs: 0, 
                successful_runs: 0, 
                failed_runs: 0, 
                total_time_saved: 0 
              } 
            };
          }

          // Skip RPC function to avoid download_count error, use fallback directly
          const { data: automations, error: countError } = await supabase
            .from('automations')
            .select('id')
            .eq('created_by', user.id)
            .abortSignal(signal);
          
          if (countError) {
            EventLogger.error('API', 'Failed to fetch automation count:', countError as Error);
            return {
              error: {
                status: 'FETCH_ERROR',
                message: countError.message || 'Failed to fetch user statistics',
                code: countError.code,
              }
            };
          }
          
          return { 
            data: { 
              total_automations: automations?.length || 0, 
              total_runs: 0, 
              successful_runs: 0, 
              failed_runs: 0, 
              total_time_saved: 0 
            } 
          };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          EventLogger.error('API', 'Failed to fetch user stats:', error as Error);
          return {
            error: {
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch user statistics',
            }
          };
        }
      },
      providesTags: [{ type: 'User', id: 'STATS' }],
    }),

    // ===== EXECUTION MANAGEMENT =====

    /**
     * Get recent executions
     */
    getRecentExecutions: builder.query<AutomationExecution[], { limit?: number }>({
      queryFn: async ({ limit = 10 }, { signal }) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            return { data: [] };
          }

          const { data, error } = await supabase
            .from('automation_executions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)
            .abortSignal(signal);

          if (error) {
            EventLogger.error('API', 'Error fetching recent executions:', error as Error);
            return {
              error: {
                status: 'FETCH_ERROR',
                message: error.message || 'Failed to fetch recent executions',
                code: error.code,
              }
            };
          }

          return { data: data || [] };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          EventLogger.error('API', 'Failed to fetch recent executions:', error as Error);
          return {
            error: {
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch recent executions',
            }
          };
        }
      },
      providesTags: [{ type: 'Execution', id: 'RECENT' }],
    }),

    /**
     * Get automation executions
     */
    getAutomationExecutions: builder.query<AutomationExecution[], string>({
      queryFn: async (automationId, { signal }) => {
        try {
          // Validate automationId parameter
          if (!automationId || automationId === 'undefined' || automationId === 'null') {
            EventLogger.error('API', 'Invalid automation ID for executions:', automationId as Error);
            return {
              error: {
                status: 'INVALID_REQUEST',
                message: 'Invalid automation ID provided for executions',
                code: 'INVALID_PARAMS',
              }
            };
          }

          const { data, error } = await supabase
            .from('automation_executions')
            .select('*')
            .eq('automation_id', automationId)
            .order('created_at', { ascending: false })
            .abortSignal(signal);

          if (error) {
            EventLogger.error('API', 'Error fetching automation executions:', error as Error);
            return {
              error: {
                status: 'FETCH_ERROR',
                message: error.message || 'Failed to fetch automation executions',
                code: error.code,
              }
            };
          }

          return { data: data || [] };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          EventLogger.error('API', 'Failed to fetch automation executions:', error as Error);
          return {
            error: {
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch automation executions',
            }
          };
        }
      },
      providesTags: (result, error, automationId) => [
        { type: 'Execution', id: automationId },
      ],
    }),

    /**
     * Get execution history with enhanced data
     */
    getExecutionHistory: builder.query<AutomationExecution[], { limit?: number }>({
      queryFn: async ({ limit = 50 }, { signal }) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            return { data: [] };
          }

          const { data, error } = await supabase
            .from('automation_executions')
            .select(`
              *,
              automation:automations(id, name, title)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit)
            .abortSignal(signal);

          if (error) {
            EventLogger.error('API', 'Error fetching execution history:', error as Error);
            return {
              error: {
                status: 'FETCH_ERROR',
                message: error.message || 'Failed to fetch execution history',
                code: error.code,
              }
            };
          }

          return { data: data || [] };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          EventLogger.error('API', 'Failed to fetch execution history:', error as Error);
          return {
            error: {
              status: 'FETCH_ERROR',
              message: error.message || 'Failed to fetch execution history',
            }
          };
        }
      },
      providesTags: [{ type: 'Execution', id: 'HISTORY' }],
    }),

    /**
     * Clear execution history
     */
    clearHistory: builder.mutation<void, void>({
      queryFn: async () => {
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

          const { error } = await supabase
            .from('automation_executions')
            .delete()
            .eq('user_id', user.id);

          if (error) {
            EventLogger.error('API', 'Error clearing history:', error as Error);
            return {
              error: {
                status: 'DELETE_ERROR',
                message: error.message || 'Failed to clear history',
                code: error.code,
              }
            };
          }

          return { data: null };
        } catch (error: any) {
          EventLogger.error('API', 'Failed to clear history:', error as Error);
          return {
            error: {
              status: 'DELETE_ERROR',
              message: error.message || 'Failed to clear history',
            }
          };
        }
      },
      invalidatesTags: [
        { type: 'Execution', id: 'RECENT' },
        { type: 'Execution', id: 'HISTORY' },
        { type: 'User', id: 'STATS' },
      ],
    }),

    // ===== TRENDING AND ENGAGEMENT =====

    /**
     * Get trending automations with fallback
     */
    getTrendingAutomations: builder.query<AutomationData[], { limit?: number; timeWindow?: string }>({
      queryFn: async ({ limit = 10, timeWindow = '7 days' }, { signal }) => {
        try {
          // Use network-aware wrapper to prevent calls when offline
          const data = await networkAwareQuery(
            async () => {
              // Skip RPC function and use direct query to avoid download_count error
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('automations')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .limit(limit)
                .abortSignal(signal);
              
              if (fallbackError) {
                logApiError(fallbackError, 'getTrendingAutomations');
                throw fallbackError;
              }
              
              return fallbackData || [];
            },
            {
              offlineData: [], // Return empty array when offline
            }
          );
          
          return { data };
        } catch (error: any) {
          if (error.name === 'AbortError') {
            return { error: { status: 'CANCELLED', message: 'Request cancelled' } };
          }
          
          // Check if it's an offline error
          if (error.status === 'OFFLINE' || error.code === 'NETWORK_OFFLINE') {
            return { data: [] }; // Return empty data instead of error for offline
          }
          
          logApiError(error, 'getTrendingAutomations');
          return {
            error: {
              status: error.status || 'FETCH_ERROR',
              message: error.message || 'Failed to fetch trending automations',
              code: error.code,
            }
          };
        }
      },
      providesTags: [{ type: 'Automation', id: 'TRENDING' }],
    }),

    // ===== ENGAGEMENT ACTIONS =====

    /**
     * Like automation
     */
    likeAutomation: builder.mutation<void, string>({
      queryFn: async (automationId) => {
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

          const { error } = await supabase
            .from('automation_likes')
            .insert({ 
              automation_id: automationId,
              user_id: user.id 
            });

          if (error && !error.message.includes('duplicate')) {
            EventLogger.error('API', 'Error liking automation:', error as Error);
            return {
              error: {
                status: 'ACTION_ERROR',
                message: error.message || 'Failed to like automation',
                code: error.code,
              }
            };
          }

          return { data: null };
        } catch (error: any) {
          EventLogger.error('API', 'Failed to like automation:', error as Error);
          return {
            error: {
              status: 'ACTION_ERROR',
              message: error.message || 'Failed to like automation',
            }
          };
        }
      },
      invalidatesTags: (result, error, automationId) => [
        { type: 'Automation', id: automationId },
        { type: 'Automation', id: 'LIST' },
        { type: 'Automation', id: 'PUBLIC' },
      ],
    }),

    /**
     * Unlike automation
     */
    unlikeAutomation: builder.mutation<void, string>({
      queryFn: async (automationId) => {
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

          const { error } = await supabase
            .from('automation_likes')
            .delete()
            .match({ 
              automation_id: automationId,
              user_id: user.id 
            });

          if (error) {
            EventLogger.error('API', 'Error unliking automation:', error as Error);
            return {
              error: {
                status: 'ACTION_ERROR',
                message: error.message || 'Failed to unlike automation',
                code: error.code,
              }
            };
          }

          return { data: null };
        } catch (error: any) {
          EventLogger.error('API', 'Failed to unlike automation:', error as Error);
          return {
            error: {
              status: 'ACTION_ERROR',
              message: error.message || 'Failed to unlike automation',
            }
          };
        }
      },
      invalidatesTags: (result, error, automationId) => [
        { type: 'Automation', id: automationId },
        { type: 'Automation', id: 'LIST' },
        { type: 'Automation', id: 'PUBLIC' },
      ],
    }),

    /**
     * Track automation download/clone
     */
    trackAutomationDownload: builder.mutation<void, string>({
      queryFn: async (automationId) => {
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

          // Insert a download/clone tracking record
          const { error } = await supabase
            .from('automation_downloads')
            .insert({ 
              automation_id: automationId,
              user_id: user.id,
              download_type: 'clone'
            });

          if (error && !error.message.includes('duplicate')) {
            EventLogger.error('API', 'Error tracking download:', error as Error);
            return {
              error: {
                status: 'ACTION_ERROR',
                message: error.message || 'Failed to track download',
                code: error.code,
              }
            };
          }

          return { data: null };
        } catch (error: any) {
          EventLogger.error('API', 'Failed to track download:', error as Error);
          return {
            error: {
              status: 'ACTION_ERROR',
              message: error.message || 'Failed to track download',
            }
          };
        }
      },
      invalidatesTags: (result, error, automationId) => [
        { type: 'Automation', id: automationId },
        { type: 'Automation', id: 'LIST' },
        { type: 'Automation', id: 'PUBLIC' },
      ],
    }),
  }),
});

// Export hooks
export const {
  useGetMyAutomationsQuery,
  useGetAutomationQuery,
  useGetPublicAutomationsQuery,
  useCreateAutomationMutation,
  useUpdateAutomationMutation,
  useDeleteAutomationMutation,
  useCloneAutomationMutation,
  useGetUserStatsQuery,
  useGetRecentExecutionsQuery,
  useGetAutomationExecutionsQuery,
  useGetExecutionHistoryQuery,
  useClearHistoryMutation,
  useGetTrendingAutomationsQuery,
  useLikeAutomationMutation,
  useUnlikeAutomationMutation,
  useTrackAutomationDownloadMutation,
} = automationApi;