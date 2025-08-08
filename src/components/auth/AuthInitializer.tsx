/**
 * AuthInitializer Component - Fixed Version
 * Handles authentication initialization and recovery
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { restoreSession, refreshProfile, signOutSuccess, clearError } from '../../store/slices/authSlice';
import { supabase, ensureValidSession } from '../../services/supabase/client';
import { EventLogger } from '../../utils/EventLogger';

interface AuthInitializerProps {
  children: React.ReactNode;
}

export const AuthInitializer: React.FC<AuthInitializerProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const initAttempted = useRef(false);
  const authListenerRef = useRef<any>(null);

  const { isAuthenticated, error: authError } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Only initialize once
    if (initAttempted.current) {
      return;
    }
    initAttempted.current = true;

    const initializeAuth = async () => {
      try {
        EventLogger.debug('AuthInitializer', 'Starting auth initialization...');
        setInitError(null);

        // Clear any previous auth errors
        dispatch(clearError());

        // Check for existing session
        const session = await ensureValidSession();
        
        if (session && session.user) {
          EventLogger.debug('AuthInitializer', 'Found existing session for:', session.user.email);
          
          // Restore session in Redux
          dispatch(restoreSession({
            user: {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              avatar_url: session.user.user_metadata?.avatar_url,
              role: session.user.user_metadata?.role || 'user',
            },
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
          }));

          // Try to refresh profile data
          try {
            await dispatch(refreshProfile()).unwrap();
            EventLogger.debug('AuthInitializer', 'Profile refreshed successfully');
          } catch (profileError: any) {
            // Profile refresh failure is not critical
            EventLogger.warn('AuthInitializer', 'Profile refresh failed:', profileError);
          }
        } else {
          EventLogger.debug('AuthInitializer', 'No existing session found');
          // Ensure clean state
          dispatch(signOutSuccess());
        }

        // Set up auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          EventLogger.debug('AuthInitializer', `Auth event: ${event}`);
          
          switch (event) {
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
              if (session) {
                dispatch(restoreSession({
                  user: {
                    id: session.user.id,
                    email: session.user.email!,
                    name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
                    avatar_url: session.user.user_metadata?.avatar_url,
                    role: session.user.user_metadata?.role || 'user',
                  },
                  accessToken: session.access_token,
                  refreshToken: session.refresh_token,
                }));
              }
              break;
            
            case 'SIGNED_OUT':
              dispatch(signOutSuccess());
              break;
            
            case 'USER_UPDATED':
              if (session) {
                try {
                  await dispatch(refreshProfile()).unwrap();
                } catch (error) {
                  EventLogger.warn('AuthInitializer', 'Failed to refresh profile after user update:', error);
                }
              }
              break;
          }
        });

        authListenerRef.current = authListener;
        
        EventLogger.info('AuthInitializer', 'Auth initialization completed');
        setIsInitializing(false);
      } catch (error: any) {
        EventLogger.error('AuthInitializer', 'Auth initialization failed:', error);
        
        // Handle specific error types
        if (error?.message?.includes('Network')) {
          setInitError('Network connection unavailable. Some features may be limited.');
        } else {
          setInitError('Failed to initialize authentication. Please try again.');
        }
        
        // Still allow app to load in offline/error mode
        setIsInitializing(false);
      }
    };

    initializeAuth();

    // Cleanup on unmount
    return () => {
      if (authListenerRef.current) {
        authListenerRef.current.subscription?.unsubscribe();
      }
    };
  }, [dispatch]);

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  // Show error screen if critical error occurred
  if (initError && !isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{initError}</Text>
        <Text style={styles.continueText}>Continuing in offline mode...</Text>
        {children}
      </View>
    );
  }

  // Render children when ready
  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6200ee',
  },
  errorText: {
    fontSize: 14,
    color: '#B00020',
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 8,
  },
  continueText: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
});