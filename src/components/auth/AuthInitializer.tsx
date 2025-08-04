import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { supabase, ensureValidSession, testConnection, supabaseWithRetry } from '../../services/supabase/client';
import authSlice from '../../store/slices/authSlice';
import { AppDispatch } from '../../store';

export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    // Check for existing session on app startup
    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        // Fetch user profile with retry logic
        await handleSignIn(session);
      } else if (event === 'SIGNED_OUT') {
        // Clear Redux state when user signs out
        dispatch(authSlice.actions.signOutSuccess());
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Update tokens when refreshed
        dispatch(authSlice.actions.setTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }));
      } else if (event === 'USER_UPDATED' && session) {
        // Handle user updates
        await handleSignIn(session);
      }
    });

    // Set up periodic connection check
    const connectionCheckInterval = setInterval(async () => {
      const connectionStatus = await testConnection();
      if (!connectionStatus.connected) {
        console.warn('⚠️ Connection lost, will retry on next check');
      }
    }, 30000); // Check every 30 seconds

    return () => {
      authListener?.subscription?.unsubscribe();
      clearInterval(connectionCheckInterval);
    };
  }, [dispatch]);

  const handleSignIn = async (session: any) => {
    try {
      // Get user profile data with retry
      const profile = await supabaseWithRetry.withRetry(async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
          throw error;
        }
        return data;
      });

      // Prepare user data
      const userData = {
        id: session.user.id,
        email: session.user.email!,
        name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
        role: profile?.role || session.user.user_metadata?.role || 'user',
        created_at: profile?.created_at || session.user.created_at
      };

      // Update Redux state
      dispatch(authSlice.actions.restoreSession({
        user: userData,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      }));

      console.log('✅ User session updated successfully');
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error);
      
      // Still update auth state with basic info
      const userData = {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        avatar_url: session.user.user_metadata?.avatar_url,
        role: session.user.user_metadata?.role || 'user',
        created_at: session.user.created_at
      };

      dispatch(authSlice.actions.restoreSession({
        user: userData,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      }));
    }
  };

  const checkSession = async () => {
    try {
      console.log('🔍 Checking for existing session...');
      
      // Test connection first
      const connectionStatus = await testConnection();
      if (!connectionStatus.connected) {
        console.warn('⚠️ No connection to Supabase, will retry when online');
        return;
      }

      // Ensure we have a valid session
      const session = await ensureValidSession();
      
      if (session) {
        console.log('✅ Found existing session for:', session.user.email);
        await handleSignIn(session);
        console.log('✅ Session restored successfully');
      } else {
        console.log('ℹ️ No existing session found');
        // Clear any stale auth state
        dispatch(authSlice.actions.signOutSuccess());
      }
    } catch (error) {
      console.error('❌ Failed to check session:', error);
      // Clear auth state on error
      dispatch(authSlice.actions.signOutSuccess());
    }
  };

  return <>{children}</>;
};