import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
  import { supabase } from '../../services/supabase/client';
  import { AutomationData, UserStats, AutomationExecution } from '../../types';
  import Constants from 'expo-constants';
  
  const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

  // Enhanced base query with token refresh handling
  const supabaseBaseQuery = fetchBaseQuery({
    baseUrl: '/',
    prepareHeaders: async (headers, { getState, dispatch }) => {
      try {
        // Get session from Redux state first (faster)
        const state = getState() as any;
        let accessToken = state.auth?.accessToken;
        
        // If no token in Redux, try to get from Supabase
        if (!accessToken) {
          const { data: { session } } = await supabase.auth.getSession();
          accessToken = session?.access_token;
          
          // Update Redux if we found a session
          if (session?.access_token && session?.refresh_token) {
            const { updateTokens } = await import('../slices/authSlice');
            dispatch(updateTokens({
              accessToken: session.access_token,
              refreshToken: session.refresh_token,
            }));
          }
        }
        
        if (accessToken) {
          headers.set('authorization', `Bearer ${accessToken}`);
          headers.set('apikey', supabaseAnonKey);
        }
      } catch (error) {
        console.warn('Failed to get auth token for API request:', error);
        // Continue without auth - API will handle unauthorized requests
      }
      return headers;
    },
  });

  // Enhanced base query with retry logic for auth errors
  const enhancedBaseQuery = async (args: any, api: any, extraOptions: any) => {
    let result = await supabaseBaseQuery(args, api, extraOptions);
    
    // Handle 401 errors by attempting token refresh
    if (result.error && (result.error as any).status === 401) {
      console.log('🔄 API request unauthorized, attempting token refresh...');
      
      try {
        const { data: refreshResult, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshResult.session) {
          console.error('❌ Token refresh failed:', refreshError);
          // Sign out user if refresh fails
          const { signOut } = await import('../slices/authSlice');
          api.dispatch(signOut());
          return result;
        }
        
        // Update tokens in Redux
        const { updateTokens } = await import('../slices/authSlice');
        api.dispatch(updateTokens({
          accessToken: refreshResult.session.access_token,
          refreshToken: refreshResult.session.refresh_token,
        }));
        
        console.log('✅ Token refreshed, retrying API request');
        
        // Retry the original request with new token
        result = await supabaseBaseQuery(args, api, extraOptions);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        // Sign out user if refresh fails
        const { signOut } = await import('../slices/authSlice');
        api.dispatch(signOut());
      }
    }
    
    return result;
  };

  export const automationApi = createApi({
    reducerPath: 'automationApi',
    baseQuery: enhancedBaseQuery,
    tagTypes: ['Automation'],
    endpoints: (builder) => ({
      // Get user's automations
      getMyAutomations: builder.query<AutomationData[], void>({
        queryFn: async () => {
          try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              console.log('No authenticated user found');
              // Return empty data for unauthenticated users
              return { data: [] };
            }

            console.log('Fetching automations for user:', user.id);

            const { data, error } = await supabase
              .from('automations')
              .select('*')
              .eq('created_by', user.id)
              .order('created_at', { ascending: false });

            if (error) {
              console.error('Error fetching user automations:', error);
              // Return error properly so UI can handle it
              return { error: { status: 'CUSTOM_ERROR', error: error.message, data: null } };
            }

            console.log(`Found ${data?.length || 0} automations for user`);
            return { data: data || [] };
          } catch (error: any) {
            console.error('Failed to fetch user automations:', error);
            // Return error properly so UI can handle it
            return { error: { status: 'CUSTOM_ERROR', error: error.message || 'Failed to fetch automations', data: null } };
          }
        },
        providesTags: ['Automation'],
      }),

      // Create new automation
  createAutomation: builder.mutation<AutomationData, Partial<AutomationData>>({
    queryFn: async (automation) => {
      try {
        console.log('🔍 Starting automation creation...');

        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 Current user:', user);

        if (!user) throw new Error('Not authenticated');

        const automationToInsert = {
          title: automation.title || 'Untitled Automation',
          description: automation.description || 'Created with builder',
          steps: automation.steps || [],
          created_by: user.id,
          category: automation.category || 'Productivity',
          is_public: false,
          tags: automation.tags || ['custom'],
        };

        console.log('📝 Inserting automation:', automationToInsert);

        const { data, error } = await supabase
          .from('automations')
          .insert(automationToInsert)
          .select()
          .single();

        console.log('✅ Supabase response:', { data, error });

        if (error) {
          console.error('❌ Supabase error:', error);
          throw error;
        }

        return { data };
      } catch (error: any) {
        console.error('❌ Full error:', error);
        return { error: error.message || 'Unknown error' };
      }
    },
    invalidatesTags: ['Automation'],
  }),

      // Update automation
      updateAutomation: builder.mutation<AutomationData, { id: string; updates: Partial<AutomationData> }>({
        queryFn: async ({ id, updates }) => {
          try {
            const { data, error } = await supabase
              .from('automations')
              .update(updates)
              .eq('id', id)
              .select()
              .single();

            if (error) throw error;

            return { data };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        invalidatesTags: ['Automation'],
      }),

      // Delete automation
      deleteAutomation: builder.mutation<void, string>({
        queryFn: async (id) => {
          try {
            const { error } = await supabase
              .from('automations')
              .delete()
              .eq('id', id);

            if (error) throw error;

            return { data: undefined };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        invalidatesTags: ['Automation'],
      }),

      // Get public automations for gallery
      getPublicAutomations: builder.query<AutomationData[], void>({
        queryFn: async () => {
          try {
            console.log('Fetching public automations for gallery...');

            const { data, error } = await supabase
              .from('automations')
              .select('*')
              .eq('is_public', true)
              .order('created_at', { ascending: false })
              .limit(50);

            if (error) {
              console.error('Error fetching public automations:', error);
              // Return error properly so UI can handle it
              return { error: { status: 'CUSTOM_ERROR', error: error.message, data: null } };
            }

            console.log(`Found ${data?.length || 0} public automations`);
            return { data: data || [] };
          } catch (error: any) {
            console.error('Failed to fetch public automations:', error);
            // Return error properly so UI can handle it
            return { error: { status: 'CUSTOM_ERROR', error: error.message || 'Failed to fetch automations', data: null } };
          }
        },
        providesTags: ['Automation'],
      }),

      // Get user statistics
      getUserStats: builder.query<UserStats, void>({
        queryFn: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              console.log('No authenticated user found');
              return { data: { total_automations: 0, total_runs: 0, successful_runs: 0, failed_runs: 0, total_time_saved: 0 } };
            }

            const { data, error } = await supabase
              .rpc('get_user_automation_stats', { p_user_id: user.id });

            if (error) {
              console.warn('get_user_automation_stats function not found, using default values');
              
              // Fallback: manually count automations
              const { data: automations } = await supabase
                .from('automations')
                .select('id')
                .eq('created_by', user.id);
              
              return { 
                data: { 
                  total_automations: automations?.length || 0, 
                  total_runs: 0, 
                  successful_runs: 0, 
                  failed_runs: 0, 
                  total_time_saved: 0 
                } 
              };
            }

            // Ensure we return a properly typed object
            const stats = data?.[0] || { total_automations: 0, total_runs: 0, successful_runs: 0, failed_runs: 0, total_time_saved: 0 };
            
            return { 
              data: {
                total_automations: Number(stats.total_automations) || 0,
                total_runs: Number(stats.total_runs) || 0,
                successful_runs: Number(stats.successful_runs) || 0,
                failed_runs: Number(stats.failed_runs) || 0,
                total_time_saved: Number(stats.total_time_saved) || 0
              }
            };
          } catch (error: any) {
            console.error('Failed to fetch user stats:', error);
            return { error: error.message };
          }
        },
        providesTags: ['Automation'],
      }),

      // Get recent executions
      getRecentExecutions: builder.query<AutomationExecution[], { limit?: number }>({
        queryFn: async ({ limit = 10 }) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              console.log('No authenticated user found');
              return { data: [] };
            }

            const { data, error } = await supabase
              .from('automation_executions')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(limit);

            if (error) {
              console.error('Error fetching recent executions:', error);
              throw error;
            }

            return { data: data || [] };
          } catch (error: any) {
            console.error('Failed to fetch recent executions:', error);
            return { error: error.message };
          }
        },
        providesTags: ['Automation'],
      }),

      // Get automation executions
      getAutomationExecutions: builder.query<AutomationExecution[], string>({
        queryFn: async (automationId) => {
          try {
            const { data, error } = await supabase
              .from('automation_executions')
              .select('*')
              .eq('automation_id', automationId)
              .order('created_at', { ascending: false });

            if (error) {
              console.error('Error fetching automation executions:', error);
              throw error;
            }

            return { data: data || [] };
          } catch (error: any) {
            console.error('Failed to fetch automation executions:', error);
            return { error: error.message };
          }
        },
        providesTags: ['Automation'],
      }),

      // Get single automation
      getAutomation: builder.query<AutomationData, string>({
        queryFn: async (id) => {
          try {
            const { data, error } = await supabase
              .from('automations')
              .select('*')
              .eq('id', id)
              .single();

            if (error) {
              console.error('Error fetching automation:', error);
              throw error;
            }

            return { data };
          } catch (error: any) {
            console.error('Failed to fetch automation:', error);
            return { error: error.message };
          }
        },
        providesTags: ['Automation'],
      }),

      // Clone automation
      cloneAutomation: builder.mutation<AutomationData, string>({
        queryFn: async (automationId) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) throw new Error('Not authenticated');

            // First, get the automation to clone
            const { data: originalAutomation, error: fetchError } = await supabase
              .from('automations')
              .select('*')
              .eq('id', automationId)
              .single();

            if (fetchError) throw fetchError;

            // Create a new automation with the same data
            const { data, error } = await supabase
              .from('automations')
              .insert({
                ...originalAutomation,
                id: undefined, // Let the database generate a new ID
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

            if (error) throw error;

            return { data };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        invalidatesTags: ['Automation'],
      }),

      // Get automation engagement metrics
      getAutomationEngagement: builder.query<any, string>({
        queryFn: async (automationId) => {
          try {
            const { data, error } = await supabase
              .rpc('get_automation_engagement', { p_automation_id: automationId });

            if (error) {
              // If the function doesn't exist, return default values
              console.warn('get_automation_engagement function not found, using default values');
              
              // Try to get basic data from automations table
              const { data: automationData } = await supabase
                .from('automations')
                .select('likes_count, downloads_count, views_count')
                .eq('id', automationId)
                .single();
              
              return { 
                data: {
                  likes_count: automationData?.likes_count || 0,
                  downloads_count: automationData?.downloads_count || 0,
                  executions_count: 0,
                  user_has_liked: false
                }
              };
            }

            return { data: data?.[0] || { likes_count: 0, downloads_count: 0, executions_count: 0, user_has_liked: false } };
          } catch (error: any) {
            console.error('Failed to fetch automation engagement:', error);
            // Return default values instead of error
            return { 
              data: { 
                likes_count: 0, 
                downloads_count: 0, 
                executions_count: 0, 
                user_has_liked: false 
              } 
            };
          }
        },
        providesTags: ['Automation'],
      }),

      // Get trending automations
      getTrendingAutomations: builder.query<any[], { limit?: number; timeWindow?: string }>({
        queryFn: async ({ limit = 10, timeWindow = '7 days' }) => {
          try {
            const { data, error } = await supabase
              .rpc('get_trending_automations', { 
                p_limit: limit,
                p_time_window: timeWindow 
              });

            if (error) {
              // If the function doesn't exist, fallback to regular public automations
              console.warn('get_trending_automations function not found, falling back to public automations');
              
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('automations')
                .select('*')
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .limit(limit);
              
              if (fallbackError) throw fallbackError;
              
              return { data: fallbackData || [] };
            }

            return { data: data || [] };
          } catch (error: any) {
            console.error('Failed to fetch trending automations:', error);
            // Return empty array instead of error to prevent UI from getting stuck
            return { data: [] };
          }
        },
        providesTags: ['Automation'],
      }),

      // Like automation
      likeAutomation: builder.mutation<void, string>({
        queryFn: async (automationId) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
              .from('automation_likes')
              .insert({ 
                automation_id: automationId,
                user_id: user.id 
              });

            if (error) {
              // If already liked, that's okay
              if (!error.message.includes('duplicate')) {
                throw error;
              }
            }

            return { data: undefined };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        invalidatesTags: ['Automation'],
      }),

      // Unlike automation
      unlikeAutomation: builder.mutation<void, string>({
        queryFn: async (automationId) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
              .from('automation_likes')
              .delete()
              .match({ 
                automation_id: automationId,
                user_id: user.id 
              });

            if (error) throw error;

            return { data: undefined };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        invalidatesTags: ['Automation'],
      }),

      // Track automation download
      trackAutomationDownload: builder.mutation<void, string>({
        queryFn: async (automationId) => {
          try {
            const { error } = await supabase
              .rpc('track_automation_download', { p_automation_id: automationId });

            if (error) throw error;

            return { data: undefined };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        invalidatesTags: ['Automation'],
      }),

      // Get execution history
      getExecutionHistory: builder.query<AutomationExecution[], { limit?: number }>({
        queryFn: async ({ limit = 50 }) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
              console.log('No authenticated user found');
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
              .limit(limit);

            if (error) {
              console.error('Error fetching execution history:', error);
              throw error;
            }

            return { data: data || [] };
          } catch (error: any) {
            console.error('Failed to fetch execution history:', error);
            return { error: error.message };
          }
        },
        providesTags: ['Automation'],
      }),

      // Clear execution history
      clearHistory: builder.mutation<void, void>({
        queryFn: async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { error } = await supabase
              .from('automation_executions')
              .delete()
              .eq('user_id', user.id);

            if (error) throw error;

            return { data: undefined };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        invalidatesTags: ['Automation'],
      }),

      // Track automation view
      trackAutomationView: builder.mutation<void, string>({
        queryFn: async (automationId) => {
          try {
            const { error } = await supabase
              .rpc('track_automation_view', { p_automation_id: automationId });

            if (error) throw error;

            return { data: undefined };
          } catch (error: any) {
            return { error: error.message };
          }
        },
      }),

      // Submit a review
      submitReview: builder.mutation<any, { automationId: string; rating: number; comment?: string }>({
        queryFn: async ({ automationId, rating, comment }) => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
              .from('automation_reviews')
              .upsert({
                automation_id: automationId,
                user_id: user.id,
                rating,
                comment: comment || null,
              })
              .select()
              .single();

            if (error) throw error;

            return { data };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        invalidatesTags: ['Automation'],
      }),

      // Get reviews for an automation
      getAutomationReviews: builder.query<any[], string>({
        queryFn: async (automationId) => {
          try {
            const { data, error } = await supabase
              .from('automation_reviews')
              .select(`
                *,
                users!inner(name, email)
              `)
              .eq('automation_id', automationId)
              .order('created_at', { ascending: false });

            if (error) throw error;

            return { data: data || [] };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        providesTags: ['Automation'],
      }),

      // Get all reviews
      getAllReviews: builder.query<any[], void>({
        queryFn: async () => {
          try {
            const { data, error } = await supabase
              .from('automation_reviews')
              .select(`
                *,
                users!inner(name, email, avatar_url),
                automations!inner(title)
              `)
              .order('created_at', { ascending: false })
              .limit(100);

            if (error) throw error;

            return { data: data || [] };
          } catch (error: any) {
            return { error: error.message };
          }
        },
        providesTags: ['Automation'],
      }),
    }),
  });

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
    useGetAutomationEngagementQuery,
    useGetTrendingAutomationsQuery,
    useLikeAutomationMutation,
    useUnlikeAutomationMutation,
    useTrackAutomationDownloadMutation,
    useTrackAutomationViewMutation,
    useGetExecutionHistoryQuery,
    useClearHistoryMutation,
    useSubmitReviewMutation,
    useGetAutomationReviewsQuery,
    useGetAllReviewsQuery,
  } = automationApi;