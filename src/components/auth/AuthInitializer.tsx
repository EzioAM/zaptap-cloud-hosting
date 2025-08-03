import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { supabase } from '../../services/supabase/client';
import authSlice from '../../store/slices/authSlice';

export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check for existing session on app startup
    checkSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        // Update Redux state when user signs in
        dispatch(authSlice.actions.setTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }));
      } else if (event === 'SIGNED_OUT') {
        // Clear Redux state when user signs out
        dispatch(authSlice.actions.clearError());
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [dispatch]);

  const checkSession = async () => {
    try {
      console.log('Checking for existing session...');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error checking session:', error);
        return;
      }

      if (session) {
        console.log('Found existing session for:', session.user.email);
        
        // Restore the session in Redux
        dispatch(authSlice.actions.setTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
        }));

        // You might also want to fetch user profile data here
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          console.log('User profile loaded:', profile);
        }
      } else {
        console.log('No existing session found');
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    }
  };

  return <>{children}</>;
};