import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { EventLogger } from '../../utils/EventLogger';
  import { supabase } from '../../services/supabase/client';
  import { OnboardingService } from '../../services/onboarding/OnboardingService';
  import { DEFAULT_AVATAR } from '../../constants/defaults';

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
          avatar_url: data.user.user_metadata?.avatar_url || DEFAULT_AVATAR,
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
          EventLogger.warn('Authentication', 'Profile creation failed:', profileError);
        }
        
        // Create sample automations for new user
        try {
          await OnboardingService.initializeNewUser(data.user.id);
        } catch (error) {
          EventLogger.warn('Authentication', 'Failed to create sample automations:', error);
        }
      }

      return {
        user: {
          id: data.user!.id,
          email: data.user!.email!,
          name,
          avatar_url: DEFAULT_AVATAR,
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
        EventLogger.debug('Authentication', '🔄 Starting sign out process...');
        
        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();
        if (error) {
          EventLogger.error('Authentication', '⚠️ Supabase sign out error:', error as Error);
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
          
          EventLogger.debug('Authentication', '✅ API caches cleared');
        } catch (apiError) {
          EventLogger.warn('Authentication', '⚠️ Failed to clear API caches:', apiError);
        }
        
        // Clear all persisted data
        try {
          const { clearPersistedData } = await import('../index');
          await clearPersistedData();
          EventLogger.debug('Authentication', '✅ Persisted data cleared');
        } catch (storageError) {
          EventLogger.warn('Authentication', '⚠️ Failed to clear persisted data:', storageError);
        }
        
        EventLogger.debug('Authentication', '✅ Sign out completed successfully');
        return true;
      } catch (error: any) {
        EventLogger.error('Authentication', '❌ Sign out process failed:', error as Error);
        // Even if everything fails, we should clear local state
        // Don't reject - this ensures reducers still clear local state
        return true;
      }
    }
  );

  // Refresh user profile data with enhanced error handling
  export const refreshProfile = createAsyncThunk(
    'auth/refreshProfile',
    async (_, { getState, rejectWithValue }) => {
      try {
        // Ensure we have a valid session first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          EventLogger.warn('Authentication', 'No valid session found during profile refresh');
          return rejectWithValue('No valid session');
        }
        
        EventLogger.debug('Authentication', '🔄 Refreshing profile for user:', session.user.email);
        
        // Fetch latest profile data from database with timeout
        const profilePromise = supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 10000);
        });
        
        const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;
        
        if (error) {
          EventLogger.error('Authentication', 'Profile fetch error:', error as Error);
          
          // For JWT errors, don't retry here - let auth initializer handle it
          if (error.message?.includes('JWT') || error.code === 'PGRST301') {
            return rejectWithValue('JWT_ERROR');
          }
          
          // For other errors, return basic profile data
          return {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || DEFAULT_AVATAR,
            role: session.user.user_metadata?.role || 'user',
            created_at: session.user.created_at
          };
        }
        
        return profile || {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          avatar_url: session.user.user_metadata?.avatar_url || DEFAULT_AVATAR,
          role: session.user.user_metadata?.role || 'user',
          created_at: session.user.created_at
        };
      } catch (error: any) {
        EventLogger.error('Authentication', '❌ Profile refresh failed:', error as Error);
        
        if (error.message === 'Profile fetch timeout') {
          return rejectWithValue('Request timeout - please try again');
        }
        
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
        EventLogger.debug('Authentication', '📝 Session restored for user:', action.payload.user.email);
      },
      updateTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        EventLogger.debug('Authentication', '🔄 Tokens updated successfully');
      },
      updateProfile: (state, action: PayloadAction<Partial<User>>) => {
        if (state.user) {
          state.user = { ...state.user, ...action.payload };
          EventLogger.debug('Authentication', '👤 Profile updated:', action.payload);
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
            EventLogger.debug('Authentication', '✅ Profile refreshed successfully');
          }
        })
        .addCase(refreshProfile.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.payload as string || 'Failed to refresh profile';
          EventLogger.error('Authentication', '❌ Profile refresh failed:', state.error as Error);
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