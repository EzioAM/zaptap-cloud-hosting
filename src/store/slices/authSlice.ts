import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
  import { supabase } from '../../services/supabase/client';
  import { OnboardingService } from '../../services/onboarding/OnboardingService';

  interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    role?: string;
    created_at?: string;
  }

  interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    accessToken: string | null;
    refreshToken: string | null;
  }

  const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    accessToken: null,
    refreshToken: null,
  };

  // Real Supabase sign in
  export const signIn = createAsyncThunk(
    'auth/signIn',
    async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata?.name || 'User',
        },
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    }
  );

  // Real Supabase sign up
  export const signUp = createAsyncThunk(
    'auth/signUp',
    async ({ email, password, name }: { email: string; password: string; name: string }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) throw error;

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email!,
          name,
        });

        if (profileError) {
          console.warn('Profile creation failed:', profileError);
        }
        
        // Create sample automations for new user
        try {
          await OnboardingService.initializeNewUser(data.user.id);
        } catch (error) {
          console.warn('Failed to create sample automations:', error);
        }
      }

      return {
        user: {
          id: data.user!.id,
          email: data.user!.email!,
          name,
        },
        accessToken: data.session?.access_token || null,
        refreshToken: data.session?.refresh_token || null,
      };
    }
  );

  // Real Supabase sign out
  export const signOut = createAsyncThunk(
    'auth/signOut',
    async (_, { dispatch, rejectWithValue }) => {
      try {
        console.log('🔄 Starting sign out process...');
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('⚠️ Supabase sign out error:', error);
          // Continue with local cleanup even if server sign out fails
        }
        
        // Clear any cached API data by dispatching reset actions
        // This ensures API caches are cleared on sign out
        try {
          // Import APIs dynamically to avoid circular dependencies
          const { automationApi } = await import('../api/automationApi');
          const { analyticsApi } = await import('../api/analyticsApi');
          
          dispatch(automationApi.util.resetApiState());
          dispatch(analyticsApi.util.resetApiState());
          
          console.log('✅ API caches cleared');
        } catch (apiError) {
          console.warn('⚠️ Failed to clear API caches:', apiError);
        }
        
        // Clear all persisted data
        try {
          const { clearPersistedData } = await import('../index');
          await clearPersistedData();
          console.log('✅ Persisted data cleared');
        } catch (storageError) {
          console.warn('⚠️ Failed to clear persisted data:', storageError);
        }
        
        console.log('✅ Sign out completed successfully');
        return true;
      } catch (error: any) {
        console.error('❌ Sign out process failed:', error);
        // Even if everything fails, we should clear local state
        // Don't reject - this ensures reducers still clear local state
        return true;
      }
    }
  );

  // Refresh user profile data
  export const refreshProfile = createAsyncThunk(
    'auth/refreshProfile',
    async (_, { getState, rejectWithValue }) => {
      try {
        const state = getState() as any;
        const currentUser = state.auth.user;
        
        if (!currentUser) {
          throw new Error('No authenticated user found');
        }
        
        console.log('🔄 Refreshing profile for user:', currentUser.email);
        
        // Fetch latest profile data from database
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        if (error) {
          // Handle auth errors by attempting token refresh
          if (error.message?.includes('JWT') || error.code === 'PGRST301') {
            const { data: refreshResult } = await supabase.auth.refreshSession();
            if (refreshResult.session) {
              // Retry with refreshed token
              const { data: retryProfile, error: retryError } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUser.id)
                .single();
              
              if (retryError) throw retryError;
              return retryProfile;
            }
          }
          throw error;
        }
        
        return profile;
      } catch (error: any) {
        console.error('❌ Profile refresh failed:', error);
        return rejectWithValue(error.message || 'Failed to refresh profile');
      }
    }
  );

  // Forgot password
  export const resetPassword = createAsyncThunk(
    'auth/resetPassword',
    async ({ email }: { email: string }) => {
      // For mobile apps, we need to handle password reset differently
      // The redirect URL should be your app's deep link
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'shortcuts-like://reset-password',
      });
      
      if (error) throw error;
      
      return { email };
    }
  );

  const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
      clearError: (state) => {
        state.error = null;
      },
      setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      },
      setUser: (state, action: PayloadAction<User>) => {
        state.user = action.payload;
      },
      restoreSession: (state, action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>) => {
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
        console.log('📝 Session restored for user:', action.payload.user.email);
      },
      updateTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        console.log('🔄 Tokens updated successfully');
      },
      updateProfile: (state, action: PayloadAction<Partial<User>>) => {
        if (state.user) {
          state.user = { ...state.user, ...action.payload };
          console.log('👤 Profile updated:', action.payload);
        }
      },
      signOutSuccess: (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null;
      },
    },
    extraReducers: (builder) => {
      builder
        // Sign In
        .addCase(signIn.pending, (state) => {
          state.isLoading = true;
          state.error = null;
        })
        .addCase(signIn.fulfilled, (state, action) => {
          state.isLoading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
        })
        .addCase(signIn.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Sign in failed';
        })
        // Sign Up
        .addCase(signUp.pending, (state) => {
          state.isLoading = true;
          state.error = null;
        })
        .addCase(signUp.fulfilled, (state, action) => {
          state.isLoading = false;
          state.isAuthenticated = !!action.payload.accessToken;
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
          state.refreshToken = action.payload.refreshToken;
        })
        .addCase(signUp.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Sign up failed';
        })
        // Sign Out
        .addCase(signOut.pending, (state) => {
          state.isLoading = true;
        })
        .addCase(signOut.fulfilled, (state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.accessToken = null;
          state.refreshToken = null;
          state.isLoading = false;
          state.error = null;
        })
        .addCase(signOut.rejected, (state, action) => {
          // Even on error, clear the local state
          state.user = null;
          state.isAuthenticated = false;
          state.accessToken = null;
          state.refreshToken = null;
          state.isLoading = false;
          state.error = action.error.message || 'Sign out failed';
        })
        // Refresh Profile
        .addCase(refreshProfile.pending, (state) => {
          state.isLoading = true;
          state.error = null;
        })
        .addCase(refreshProfile.fulfilled, (state, action) => {
          state.isLoading = false;
          if (state.user && action.payload) {
            state.user = {
              ...state.user,
              ...action.payload,
            };
            console.log('✅ Profile refreshed successfully');
          }
        })
        .addCase(refreshProfile.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string || 'Failed to refresh profile';
          console.error('❌ Profile refresh failed:', state.error);
        })
        // Reset Password
        .addCase(resetPassword.pending, (state) => {
          state.isLoading = true;
          state.error = null;
        })
        .addCase(resetPassword.fulfilled, (state) => {
          state.isLoading = false;
        })
        .addCase(resetPassword.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Failed to send reset email';
        });
    },
  });

  export const { clearError, setTokens, setUser, restoreSession, signOutSuccess, updateTokens, updateProfile } = authSlice.actions;
  export { signIn, signUp, signOut, refreshProfile, resetPassword };
  export default authSlice;