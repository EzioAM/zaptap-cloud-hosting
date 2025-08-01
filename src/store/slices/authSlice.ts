import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
  import { supabase } from '../../services/supabase/client';

  interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
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
  export const signOut = createAsyncThunk('auth/signOut', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  });

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
        .addCase(signOut.fulfilled, (state) => {
          state.user = null;
          state.isAuthenticated = false;
          state.accessToken = null;
          state.refreshToken = null;
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

  export const { clearError, setTokens } = authSlice.actions;
  export default authSlice;