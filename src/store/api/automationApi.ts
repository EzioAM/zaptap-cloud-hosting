import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
  import { supabase } from '../../services/supabase/client';
  import { AutomationData } from '../../types';

  // Custom base query for Supabase
  const supabaseBaseQuery = fetchBaseQuery({
    baseUrl: '/',
    prepareHeaders: async (headers, { getState }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.set('authorization', `Bearer ${session.access_token}`);
      }
      return headers;
    },
  });

  export const automationApi = createApi({
    reducerPath: 'automationApi',
    baseQuery: supabaseBaseQuery,
    tagTypes: ['Automation'],
    endpoints: (builder) => ({
      // Get user's automations
      getMyAutomations: builder.query<AutomationData[], void>({
        queryFn: async () => {
          try {
            const { data, error } = await supabase
              .from('automations')
              .select('*')
              .order('created_at', { ascending: false });

            if (error) throw error;

            return { data: data || [] };
          } catch (error: any) {
            return { error: error.message };
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
    }),
  });

  export const {
    useGetMyAutomationsQuery,
    useCreateAutomationMutation,
    useUpdateAutomationMutation,
    useDeleteAutomationMutation,
  } = automationApi;