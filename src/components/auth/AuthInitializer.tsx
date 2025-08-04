import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, ensureValidSession } from '../../services/supabase/client';
import authSlice from '../../store/slices/authSlice';
import { AppDispatch, RootState, resetApiState } from '../../store';
import { automationApi } from '../../store/api/automationApi';
import { analyticsApi } from '../../store/api/analyticsApi';

export const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);
  const hasInitialized = useRef(false);
  const tokenRefreshAttempted = useRef(false);

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
          console.log('🚪 User signed out');
          dispatch(authSlice.actions.signOutSuccess());
          
          // Clear API caches on sign out
          resetApiState();
          
          // Reset refresh attempt flag
          tokenRefreshAttempted.current = false;
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('🔄 Token refreshed successfully');
          dispatch(authSlice.actions.updateTokens({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          }));
          
          // Clear any API errors that might have been caused by expired tokens
          resetApiState();
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
      // Validate session before processing
      if (!session || !session.user || !session.access_token) {
        console.error('❌ Invalid session data received');
        dispatch(authSlice.actions.signOutSuccess());
        return;
      }

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
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError) {
          // Handle specific auth errors
          if (profileError.message?.includes('JWT') || profileError.code === 'PGRST301') {
            console.warn('⚠️ JWT error during profile fetch, attempting token refresh...');
            if (!tokenRefreshAttempted.current) {
              tokenRefreshAttempted.current = true;
              const refreshedSession = await supabase.auth.refreshSession();
              if (refreshedSession.data.session) {
                // Retry profile fetch with new token
                const { data: retryProfile } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single();
                
                if (retryProfile) {
                  const enhancedUserData = {
                    ...basicUserData,
                    name: retryProfile.name || basicUserData.name,
                    avatar_url: retryProfile.avatar_url || basicUserData.avatar_url,
                    role: retryProfile.role || basicUserData.role,
                    created_at: retryProfile.created_at || basicUserData.created_at
                  };
                  
                  dispatch(authSlice.actions.updateProfile(enhancedUserData));
                  console.log('✅ Profile data loaded after token refresh');
                  return;
                }
              }
            }
            throw profileError;
          }
          throw profileError;
        }
        
        if (profile) {
          const enhancedUserData = {
            id: profile.id,
            email: profile.email,
            name: profile.name || basicUserData.name,
            avatar_url: profile.avatar_url || basicUserData.avatar_url,
            role: profile.role || basicUserData.role,
            created_at: profile.created_at || basicUserData.created_at
          };

          dispatch(authSlice.actions.updateProfile(enhancedUserData));
          console.log('✅ Profile data loaded and updated');
        }
      } catch (profileError: any) {
        console.warn('⚠️ Failed to fetch profile, using basic data:', profileError?.message || profileError);
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
      
      // First try to ensure we have a valid session (handles token refresh if needed)
      const validSession = await ensureValidSession();
      
      if (validSession) {
        console.log('✅ Found valid session for:', validSession.user.email);
        // NON-BLOCKING: Handle sign in without waiting for profile fetch
        handleSignIn(validSession).catch(error => {
          console.warn('Profile fetch failed, continuing with basic auth:', error);
        });
        console.log('✅ Session restored successfully');
      } else {
        console.log('ℹ️ No valid session found');
        dispatch(authSlice.actions.signOutSuccess());
        
        // Clear any stale API data
        resetApiState();
      }
    } catch (error: any) {
      console.error('❌ Failed to check session:', error?.message || error);
      // Don't block startup - clear auth state and continue
      dispatch(authSlice.actions.signOutSuccess());
      
      // Clear any stale API data
      resetApiState();
    }
  };

  return <>{children}</>;
};