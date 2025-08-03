import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { testConnection, supabase } from '../services/supabase/client';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

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
    checkConnection();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkConnection();
      }
    });

    // Listen for network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && !connectionState.isConnected) {
        checkConnection();
      } else if (!state.isConnected) {
        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          error: 'No internet connection',
          details: 'network_offline',
        }));
      }
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkConnection();
      } else if (event === 'SIGNED_OUT') {
        setConnectionState(prev => ({
          ...prev,
          isAuthenticated: false,
        }));
      }
    });

    return () => {
      subscription.remove();
      unsubscribe();
      authListener?.subscription?.unsubscribe();
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