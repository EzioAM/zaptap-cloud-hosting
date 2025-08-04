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

    // NON-BLOCKING: Check for existing session with delay to prevent startup blocking
    const initTimer = setTimeout(() => {
      checkSession().catch(error => {
        console.warn('Session check failed during startup, continuing without auth:', error);
      });
    }, 100); // Small delay to let UI render first

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      try {
        if (event === 'SIGNED_IN' && session) {
          // Non-blocking profile fetch
          handleSignIn(session).catch(error => {
            console.warn('Profile fetch failed after sign in:', error);
          });
        } else if (event === 'SIGNED_OUT') {
          dispatch(authSlice.actions.signOutSuccess());
        } else if (event === 'TOKEN_REFRESHED' && session) {
          dispatch(authSlice.actions.setTokens({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          }));
        } else if (event === 'USER_UPDATED' && session) {
          handleSignIn(session).catch(error => {
            console.warn('Profile update failed:', error);
          });
        }
      } catch (error) {
        console.error('Auth state change handler error:', error);
      }
    });

    return () => {
      clearTimeout(initTimer);
      authListener?.subscription?.unsubscribe();
    };
  }, [dispatch]);

  const handleSignIn = async (session: any) => {
    try {
      // Immediately update Redux with basic session info - don't wait for profile
      const basicUserData = {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        avatar_url: session.user.user_metadata?.avatar_url,
        role: session.user.user_metadata?.role || 'user',
        created_at: session.user.created_at
      };

      dispatch(authSlice.actions.restoreSession({
        user: basicUserData,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      }));

      console.log('✅ User session updated successfully (basic)');

      // Background profile fetch - don't block UI
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          const enhancedUserData = {
            ...basicUserData,
            name: profile.name || basicUserData.name,
            avatar_url: profile.avatar_url || basicUserData.avatar_url,
            role: profile.role || basicUserData.role,
            created_at: profile.created_at || basicUserData.created_at
          };

          dispatch(authSlice.actions.restoreSession({
            user: enhancedUserData,
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          }));
          
          console.log('✅ Profile data loaded and updated');
        }
      } catch (profileError) {
        console.warn('⚠️ Failed to fetch profile, using basic data:', profileError);
      }
    } catch (error) {
      console.error('❌ Failed to handle sign in:', error);
      // Even if everything fails, try basic session restore
      const fallbackUserData = {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.email?.split('@')[0] || 'User',
        avatar_url: null,
        role: 'user',
        created_at: session.user.created_at
      };

      dispatch(authSlice.actions.restoreSession({
        user: fallbackUserData,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      }));
    }
  };

  const checkSession = async () => {
    try {
      console.log('🔍 Checking for existing session...');
      
      // NON-BLOCKING: Get session directly from local storage first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('⚠️ Session check error:', sessionError);
        dispatch(authSlice.actions.signOutSuccess());
        return;
      }
      
      if (session) {
        console.log('✅ Found existing session for:', session.user.email);
        // NON-BLOCKING: Handle sign in without waiting for profile fetch
        handleSignIn(session).catch(error => {
          console.warn('Profile fetch failed, continuing with basic auth:', error);
        });
        console.log('✅ Session restored successfully');
      } else {
        console.log('ℹ️ No existing session found');
        dispatch(authSlice.actions.signOutSuccess());
      }
    } catch (error) {
      console.error('❌ Failed to check session:', error);
      // Don't block startup - clear auth state and continue
      dispatch(authSlice.actions.signOutSuccess());
    }
  };

  return <>{children}</>;
};