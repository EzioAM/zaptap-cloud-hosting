import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { EventLogger } from '../../utils/EventLogger';
  import { supabase } from '../../services/supabase/client';
  import { OnboardingService } from '../../services/onboarding/OnboardingService';
  import { DEFAULT_AVATAR } from '../../constants/defaults';

  interface User {
    id: string;
    email: string;
    name: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    role?: string;
    company?: string;
    phone?: string;
    bio?: string;
    location?: string;
    website?: string;
    created_at?: string;
    user_metadata?: any;
  }

  interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    // Add recovery state
    isRecovering: boolean;
    lastErrorTimestamp: number | null;
    consecutiveErrors: number;
    sessionValid: boolean;
  }

  const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    accessToken: null,
    refreshToken: null,
    // Initialize recovery state
    isRecovering: false,
    lastErrorTimestamp: null,
    consecutiveErrors: 0,
    sessionValid: true, // Assume valid until proven otherwise
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

      // Build the name using the best available data
      let userName = 'User';
      const metadata = data.user.user_metadata || {};
      
      // Try full_name first
      if (metadata.full_name) {
        userName = metadata.full_name;
      }
      // Try first and last name combination
      else if (metadata.first_name || metadata.last_name) {
        const firstName = metadata.first_name || '';
        const lastName = metadata.last_name || '';
        userName = `${firstName} ${lastName}`.trim() || 'User';
      }
      // Try name field
      else if (metadata.name) {
        userName = metadata.name;
      }
      // Fall back to email prefix only as last resort
      else if (data.user.email) {
        userName = data.user.email.split('@')[0];
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email!,
          name: userName,
          first_name: metadata.first_name,
          last_name: metadata.last_name,
          avatar_url: metadata.avatar_url || DEFAULT_AVATAR,
          role: metadata.role,
          company: metadata.company,
          phone: metadata.phone,
          bio: metadata.bio,
          location: metadata.location,
          website: metadata.website,
          user_metadata: metadata,
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
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            avatar_url: session.user.user_metadata?.avatar_url || DEFAULT_AVATAR,
            role: session.user.user_metadata?.role || 'user',
            created_at: session.user.created_at
          };
        }
        
        return profile || {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
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
        redirectTo: 'zaptap://reset-password',
      });
      
      if (error) throw error;
      
      return { email };
    }
  );

  // Update password after reset
  export const updatePassword = createAsyncThunk(
    'auth/updatePassword',
    async ({ password }: { password: string }) => {
      const { data, error } = await supabase.auth.updateUser({
        password
      });
      
      if (error) throw error;
      
      return { success: true };
    }
  );

  const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
      clearError: (state) => {
        state.error = null;
        state.consecutiveErrors = 0;
        state.lastErrorTimestamp = null;
        state.isRecovering = false;
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
          // Also update user_metadata with the new profile data
          state.user.user_metadata = {
            ...state.user.user_metadata,
            ...action.payload.user_metadata,
          };
          // Ensure first_name and last_name are also in user_metadata for consistency
          if (action.payload.first_name !== undefined) {
            state.user.user_metadata.first_name = action.payload.first_name;
          }
          if (action.payload.last_name !== undefined) {
            state.user.user_metadata.last_name = action.payload.last_name;
          }
          if (action.payload.avatar_url !== undefined) {
            state.user.user_metadata.avatar_url = action.payload.avatar_url;
          }
          EventLogger.debug('Authentication', '👤 Profile updated:', action.payload);
        }
      },
      signOutSuccess: (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null;
        // Reset recovery state on successful sign out
        state.isRecovering = false;
        state.consecutiveErrors = 0;
        state.lastErrorTimestamp = null;
        state.sessionValid = true; // Reset for next session
      },
      
      // Add recovery actions
      startRecovery: (state) => {
        state.isRecovering = true;
        state.error = null;
        EventLogger.debug('Authentication', '🔄 Starting auth recovery...');
      },
      
      endRecovery: (state, action: PayloadAction<{ success: boolean; error?: string }>) => {
        state.isRecovering = false;
        if (action.payload.success) {
          state.consecutiveErrors = 0;
          state.lastErrorTimestamp = null;
          EventLogger.debug('Authentication', '✅ Auth recovery successful');
        } else {
          state.consecutiveErrors++;
          state.lastErrorTimestamp = Date.now();
          state.error = action.payload.error || 'Recovery failed';
          EventLogger.warn('Authentication', '❌ Auth recovery failed:', action.payload.error);
        }
      },
      
      setSessionValidity: (state, action: PayloadAction<boolean>) => {
        state.sessionValid = action.payload;
        if (!action.payload) {
          EventLogger.warn('Authentication', '⚠️ Session marked as invalid');
        }
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
          // Track consecutive errors for recovery logic
          state.consecutiveErrors++;
          state.lastErrorTimestamp = Date.now();
          state.sessionValid = false;
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
          // Track consecutive errors
          state.consecutiveErrors++;
          state.lastErrorTimestamp = Date.now();
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
          // Reset recovery state even on sign out failure
          state.isRecovering = false;
          state.consecutiveErrors = 0;
          state.lastErrorTimestamp = null;
          state.sessionValid = true;
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
          
          // Handle specific error types
          const errorMessage = action.payload as string;
          if (errorMessage === 'JWT_ERROR' || errorMessage?.includes('JWT')) {
            state.sessionValid = false;
            state.consecutiveErrors++;
            state.lastErrorTimestamp = Date.now();
          }
          
          EventLogger.error('Authentication', '❌ Profile refresh failed:', new Error(state.error));
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

  // Recovery thunk for handling auth errors
  export const recoverAuthState = createAsyncThunk(
    'auth/recover',
    async (_, { dispatch, getState, rejectWithValue }) => {
      try {
        EventLogger.debug('Authentication', '🔄 Starting auth state recovery...');
        dispatch(authSlice.actions.startRecovery());
        
        const state = getState() as { auth: AuthState };
        const { consecutiveErrors, lastErrorTimestamp } = state.auth;
        
        // If too many consecutive errors recently, wait before retrying
        if (consecutiveErrors >= 3 && lastErrorTimestamp) {
          const timeSinceLastError = Date.now() - lastErrorTimestamp;
          const minWaitTime = Math.min(consecutiveErrors * 5000, 30000); // Max 30s
          
          if (timeSinceLastError < minWaitTime) {
            const remainingWait = minWaitTime - timeSinceLastError;
            EventLogger.debug('Authentication', `⏳ Waiting ${remainingWait}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, remainingWait));
          }
        }
        
        // Attempt to refresh the session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
          EventLogger.debug('Authentication', '❌ No valid session for recovery');
          dispatch(authSlice.actions.endRecovery({ success: false, error: 'No valid session' }));
          dispatch(authSlice.actions.signOutSuccess());
          return rejectWithValue('No valid session');
        }
        
        // Try to refresh the profile
        try {
          await dispatch(refreshProfile()).unwrap();
          dispatch(authSlice.actions.endRecovery({ success: true }));
          EventLogger.debug('Authentication', '✅ Auth recovery completed successfully');
          return { recovered: true };
        } catch (profileError: any) {
          EventLogger.warn('Authentication', '⚠️ Profile refresh failed during recovery:', profileError);
          // Still consider it a partial success if we have a session
          dispatch(authSlice.actions.endRecovery({ success: true }));
          return { recovered: true, warning: 'Profile refresh failed' };
        }
      } catch (error: any) {
        EventLogger.error('Authentication', '❌ Auth recovery failed:', error as Error);
        dispatch(authSlice.actions.endRecovery({ success: false, error: error.message }));
        return rejectWithValue(error.message || 'Recovery failed');
      }
    }
  );
  
  export const { 
    clearError, 
    setTokens, 
    setUser, 
    restoreSession, 
    signOutSuccess, 
    updateTokens, 
    updateProfile,
    startRecovery,
    endRecovery,
    setSessionValidity
  } = authSlice.actions;
  
  // Export thunks (avoiding re-declaration conflicts)
  export { recoverAuthState };
  
  // Utility function to determine if recovery is needed
  export const shouldAttemptRecovery = (state: AuthState): boolean => {
    const { consecutiveErrors, lastErrorTimestamp, isRecovering, sessionValid } = state;
    
    // Don't attempt recovery if already recovering
    if (isRecovering) return false;
    
    // Don't attempt if session is known to be invalid
    if (!sessionValid) return false;
    
    // Attempt recovery if there are errors but not too many too quickly
    if (consecutiveErrors > 0 && consecutiveErrors < 5) {
      if (!lastErrorTimestamp) return true;
      
      const timeSinceError = Date.now() - lastErrorTimestamp;
      const minInterval = Math.min(consecutiveErrors * 2000, 10000); // Max 10s
      return timeSinceError > minInterval;
    }
    
    return false;
  };
  
  export default authSlice;