import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { supabase, ensureValidSession } from '../../services/supabase/client';
import authSlice, { recoverAuthState, shouldAttemptRecovery } from '../../store/slices/authSlice';
import { AppDispatch, RootState, resetApiState } from '../../store';
import { automationApi } from '../../store/api/automationApi';
import { analyticsApi } from '../../store/api/analyticsApi';
import NetInfo from '@react-native-community/netinfo';
import { DEFAULT_AVATAR } from '../../constants/defaults';
import { EventLogger } from '../../utils/EventLogger';

export const AuthInitializer: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const authState = useSelector((state: RootState) => state.auth);
  const hasInitialized = useRef(false);
  const tokenRefreshAttempted = useRef(false);
  const recoveryCheckInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    EventLogger.debug('Authentication', '🔐 AuthInitializer: Starting session restoration check...');

    // DEFERRED: Check for existing session after UI renders to improve startup time
    const initTimer = setTimeout(() => {
      checkSession().catch(error => {
        EventLogger.warn('Authentication', 'Session check failed during startup, continuing without auth:', error);
      });
    }, 500); // Reduced delay for faster session restoration

    // Listen for auth state changes
    let authListener: any;
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        EventLogger.debug('Authentication', 'Auth state changed:', event, session?.user?.email);
        
        try {
          if (event === 'SIGNED_IN' && session) {
            // Non-blocking profile fetch
            handleSignIn(session).catch(error => {
              EventLogger.warn('Authentication', 'Profile fetch failed after sign in:', error);
            });
        } else if (event === 'SIGNED_OUT') {
          EventLogger.debug('Authentication', '🚪 User signed out');
          dispatch(authSlice.actions.signOutSuccess());
          
          // Clear API caches on sign out
          resetApiState();
          
          // Reset refresh attempt flag
          tokenRefreshAttempted.current = false;
        } else if (event === 'TOKEN_REFRESHED' && session) {
          EventLogger.debug('Authentication', '🔄 Token refreshed successfully');
          dispatch(authSlice.actions.updateTokens({
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          }));
          
          // Clear any API errors that might have been caused by expired tokens
          resetApiState();
        } else if (event === 'USER_UPDATED' && session) {
          handleSignIn(session).catch(error => {
            EventLogger.warn('Authentication', 'Profile update failed:', error);
          });
          }
        } catch (error) {
          EventLogger.error('Authentication', 'Auth state change handler error:', error as Error);
        }
      });
      authListener = data;
    } catch (error) {
      EventLogger.warn('Authentication', 'Failed to set up auth listener:', error);
    }

    // Set up recovery monitoring
    const startRecoveryMonitoring = () => {
      recoveryCheckInterval.current = setInterval(() => {
        try {
          const currentAuthState = authState;
          if (shouldAttemptRecovery(currentAuthState)) {
            EventLogger.debug('Authentication', '🔄 Auto-recovery needed, attempting...');
            dispatch(recoverAuthState()).catch(error => {
              EventLogger.warn('Authentication', 'Auto-recovery failed:', error);
            });
          }
        } catch (error) {
          EventLogger.error('Authentication', 'Recovery monitoring error:', error as Error);
        }
      }, 30000); // Check every 30 seconds
    };

    // Start monitoring after initialization
    setTimeout(startRecoveryMonitoring, 10000);

    return () => {
      clearTimeout(initTimer);
      authListener?.subscription?.unsubscribe();
      if (recoveryCheckInterval.current) {
        clearInterval(recoveryCheckInterval.current);
      }
    };
  }, [dispatch, authState]);

  const handleSignIn = async (session: any) => {
    try {
      // Validate session before processing
      if (!session || !session.user || !session.access_token) {
        EventLogger.error('Authentication', '❌ Invalid session data received');
        dispatch(authSlice.actions.signOutSuccess());
        return;
      }

      // Immediately update Redux with basic session info - don't wait for profile
      const basicUserData = {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        avatar_url: session.user.user_metadata?.avatar_url || DEFAULT_AVATAR,
        role: session.user.user_metadata?.role || 'user',
        created_at: session.user.created_at
      };

      dispatch(authSlice.actions.restoreSession({
        user: basicUserData,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      }));

      EventLogger.debug('Authentication', '✅ User session updated successfully (basic)');

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
            EventLogger.warn('Authentication', '⚠️ JWT error during profile fetch, attempting token refresh...');
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
                    avatar_url: retryProfile.avatar_url || DEFAULT_AVATAR,
                    role: retryProfile.role || basicUserData.role,
                    created_at: retryProfile.created_at || basicUserData.created_at
                  };
                  
                  dispatch(authSlice.actions.updateProfile(enhancedUserData));
                  EventLogger.debug('Authentication', '✅ Profile data loaded after token refresh');
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
            avatar_url: profile.avatar_url || DEFAULT_AVATAR,
            role: profile.role || basicUserData.role,
            created_at: profile.created_at || basicUserData.created_at
          };

          dispatch(authSlice.actions.updateProfile(enhancedUserData));
          EventLogger.debug('Authentication', '✅ Profile data loaded and updated');
        }
      } catch (profileError: any) {
        EventLogger.warn('Authentication', '⚠️ Failed to fetch profile, using basic data:', profileError?.message || profileError);
      }
    } catch (error) {
      EventLogger.error('Authentication', '❌ Failed to handle sign in:', error as Error);
      // Even if everything fails, try basic session restore
      const fallbackUserData = {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.email?.split('@')[0] || 'User',
        avatar_url: DEFAULT_AVATAR,
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
      EventLogger.debug('Authentication', '🔍 Checking for existing session...');
      
      // Check network connectivity first to avoid unnecessary errors
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        EventLogger.debug('Authentication', '📴 No network connection - skipping session check');
        // Don't clear auth state when offline - user might have valid cached session
        return;
      }
      
      // First try to get the session directly (faster than ensureValidSession)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        EventLogger.warn('Authentication', 'Session fetch error:', sessionError.message);
        // Don't clear auth state on error - might be temporary
        return;
      }
      
      if (session) {
        EventLogger.debug('Authentication', '✅ Found valid session for:', session.user.email);
        
        // Check if token needs refresh
        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt ? expiresAt - now : 0;
        
        if (timeUntilExpiry < 300) { // Less than 5 minutes until expiry
          EventLogger.debug('Authentication', '🔄 Token expiring soon, refreshing...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            await handleSignIn(refreshData.session);
          } else {
            await handleSignIn(session); // Use existing session if refresh fails
          }
        } else {
          EventLogger.debug('Authentication', '🔐 Restoring user session automatically...');
          await handleSignIn(session);
        }
        
        EventLogger.debug('Authentication', '✅ Session restored successfully - user will remain signed in!');
      } else {
        EventLogger.debug('Authentication', 'ℹ️ No valid session found - user needs to sign in');
        dispatch(authSlice.actions.signOutSuccess());
        
        // Mark session as invalid to prevent unnecessary recovery attempts
        dispatch(authSlice.actions.setSessionValidity(false));
        
        // Clear any stale API data
        resetApiState();
      }
    } catch (error: any) {
      // Only log network errors once, not as errors
      if (error?.message?.includes('Network request failed') || 
          error?.message?.includes('Failed to fetch') ||
          error?.name === 'NetworkError' ||
          error?.name === 'AuthRetryableFetchError') {
        EventLogger.debug('Authentication', '📴 Network unavailable for session check');
        // Don't clear auth state when network is down
        return;
      }
      
      EventLogger.warn('Authentication', '⚠️ Session check failed:', error?.message || 'Unknown error');
      // For non-network errors, clear auth state
      dispatch(authSlice.actions.signOutSuccess());
      
      // Mark session as invalid and track the error
      dispatch(authSlice.actions.setSessionValidity(false));
      
      // Clear any stale API data
      resetApiState();
    }
  };

  return <>{children}</>;
});