import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '../../services/supabase/client';
import authSlice from '../../store/slices/authSlice';
import { AppDispatch } from '../../store';

export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Check for existing session on app startup
    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        // Update Redux state when user signs in with full user data
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
      } else if (event === 'SIGNED_OUT') {
        // Clear Redux state when user signs out
        dispatch(authSlice.actions.signOutSuccess());
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Update tokens when refreshed
        dispatch(authSlice.actions.setTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }));
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [dispatch]);

  const checkSession = async () => {
    try {
      console.log('🔍 Checking for existing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error checking session:', error);
        return;
      }

      if (session) {
        console.log('✅ Found existing session for:', session.user.email);
        
        // Get user profile data
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        // Prepare user data
        const userData = {
          id: session.user.id,
          email: session.user.email!,
          name: profile?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
          avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
          role: profile?.role || 'user',
          created_at: profile?.created_at || session.user.created_at
        };

        // Restore the complete session in Redux
        dispatch(authSlice.actions.restoreSession({
          user: userData,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }));

        console.log('✅ Session restored successfully');
      } else {
        console.log('ℹ️ No existing session found');
      }
    } catch (error) {
      console.error('❌ Failed to check session:', error);
    }
  };

  return <>{children}</>;
};