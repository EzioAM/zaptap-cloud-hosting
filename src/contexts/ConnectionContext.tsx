import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { testConnection, supabase } from '../services/supabase/client';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { logApiError } from '../store/api/networkAwareApi';
import { EventLogger } from '../utils/EventLogger';

interface ConnectionState {
  isConnected: boolean;
  isAuthenticated: boolean;
  isChecking: boolean;
  error: string | null;
  lastChecked: Date | null;
  details: string;
}

interface ConnectionContextType {
  connectionState: ConnectionState;
  checkConnection: () => Promise<void>;
  resetError: () => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: true,
    isAuthenticated: false,
    isChecking: false,
    error: null,
    lastChecked: null,
    details: 'initializing',
  });

  const checkConnection = useCallback(async () => {
    setConnectionState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      // First check network connectivity
      const netState = await NetInfo.fetch();
      
      if (!netState.isConnected) {
        setConnectionState({
          isConnected: false,
          isAuthenticated: false,
          isChecking: false,
          error: 'No internet connection',
          lastChecked: new Date(),
          details: 'network_offline',
        });
        return;
      }

      // Then check Supabase connection
      const result = await testConnection();
      
      setConnectionState({
        isConnected: result.connected,
        isAuthenticated: result.authenticated || false,
        isChecking: false,
        error: result.error || null,
        lastChecked: new Date(),
        details: result.details || 'unknown',
      });
    } catch (error: any) {
      // Don't spam network errors
      if (!error?.message?.includes('Network request failed')) {
        logApiError(error, 'ConnectionContext.checkConnection');
      }
      
      setConnectionState({
        isConnected: false,
        isAuthenticated: false,
        isChecking: false,
        error: error.message || 'Connection check failed',
        lastChecked: new Date(),
        details: 'error',
      });
    }
  }, []);

  const resetError = useCallback(() => {
    setConnectionState(prev => ({ ...prev, error: null }));
  }, []);

  // Check connection on mount and when app comes to foreground
  useEffect(() => {
    // MUCH longer delay to prevent blocking app startup completely
    const initialCheckTimer = setTimeout(() => {
      checkConnection().catch(error => {
        EventLogger.warn('ConnectionContext', 'Initial connection check failed, app will continue offline:', error);
      });
    }, 3000); // 3 second delay to let app fully initialize

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Add delay to prevent blocking app resume
        setTimeout(() => {
          checkConnection().catch(error => {
            EventLogger.warn('ConnectionContext', 'Connection check on app resume failed:', error);
          });
        }, 500);
      }
    });

    // Listen for network state changes with error handling
    const unsubscribe = NetInfo.addEventListener((state) => {
      try {
        if (state.isConnected && !connectionState.isConnected) {
          // Delay connection check after network reconnects
          setTimeout(() => {
            checkConnection().catch(error => {
              EventLogger.warn('ConnectionContext', 'Network reconnect check failed:', error);
            });
          }, 1000);
        } else if (!state.isConnected) {
          setConnectionState(prev => ({
            ...prev,
            isConnected: false,
            error: 'No internet connection',
            details: 'network_offline',
          }));
        }
      } catch (error) {
        EventLogger.warn('ConnectionContext', 'Network state change handler error:', error);
      }
    });

    // Listen for auth state changes with error handling
    let authListener: any;
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        try {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Delay connection check to prevent blocking auth flow
            setTimeout(() => {
              checkConnection().catch(error => {
                EventLogger.warn('ConnectionContext', 'Auth state change connection check failed:', error);
              });
            }, 1000);
          } else if (event === 'SIGNED_OUT') {
            setConnectionState(prev => ({
              ...prev,
              isAuthenticated: false,
            }));
          }
        } catch (error) {
          EventLogger.warn('ConnectionContext', 'Auth state change handler error:', error);
        }
      });
      authListener = data;
    } catch (error) {
      EventLogger.warn('ConnectionContext', 'Failed to set up auth listener:', error);
    }

    return () => {
      clearTimeout(initialCheckTimer);
      try {
        subscription.remove();
        unsubscribe();
        authListener?.subscription?.unsubscribe();
      } catch (error) {
        EventLogger.warn('ConnectionContext', 'Cleanup error in ConnectionProvider:', error);
      }
    };
  }, [checkConnection]);

  // Periodic connection check every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!connectionState.isChecking) {
        checkConnection();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [checkConnection, connectionState.isChecking]);

  return (
    <ConnectionContext.Provider value={{ connectionState, checkConnection, resetError }}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider');
  }
  return context;
};