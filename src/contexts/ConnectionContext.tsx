/**
 * ConnectionContext - Fixed Version
 * Manages network connectivity state and backend connection monitoring
 */

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { EventLogger } from '../utils/EventLogger';
import { testConnection } from '../services/supabase/client';

interface ConnectionContextType {
  isOnline: boolean;
  isBackendConnected: boolean;
  connectionDetails: {
    networkType: string | null;
    isInternetReachable: boolean | null;
    backendStatus: string;
    lastChecked: Date | null;
  };
  checkConnection: () => Promise<void>;
  retryConnection: () => Promise<void>;
}

const ConnectionContext = createContext<ConnectionContextType>({
  isOnline: true,
  isBackendConnected: true,
  connectionDetails: {
    networkType: null,
    isInternetReachable: null,
    backendStatus: 'unknown',
    lastChecked: null,
  },
  checkConnection: async () => {},
  retryConnection: async () => {},
});

export const useConnection = () => useContext(ConnectionContext);

interface ConnectionProviderProps {
  children: React.ReactNode;
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isBackendConnected, setIsBackendConnected] = useState(true);
  const [networkType, setNetworkType] = useState<string | null>(null);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  // Check backend connection
  const checkBackendConnection = async () => {
    if (isCheckingRef.current) {
      EventLogger.debug('ConnectionContext', 'Backend check already in progress, skipping');
      return;
    }

    isCheckingRef.current = true;
    
    try {
      EventLogger.debug('ConnectionContext', 'Checking backend connection...');
      
      const result = await testConnection();
      
      setIsBackendConnected(result.connected);
      setBackendStatus(result.details || 'unknown');
      setLastChecked(new Date());
      
      if (result.connected) {
        EventLogger.debug('ConnectionContext', 'Backend connected successfully', {
          authenticated: result.authenticated,
          user: result.user,
        });
      } else {
        EventLogger.warn('ConnectionContext', 'Backend connection failed', {
          error: result.error,
          details: result.details,
        });
      }
    } catch (error) {
      EventLogger.error('ConnectionContext', 'Failed to check backend connection:', error as Error);
      setIsBackendConnected(false);
      setBackendStatus('error');
      setLastChecked(new Date());
    } finally {
      isCheckingRef.current = false;
    }
  };

  // Check overall connection status
  const checkConnection = async () => {
    try {
      const state = await NetInfo.fetch();
      handleNetworkChange(state);
      
      if (state.isConnected && state.isInternetReachable !== false) {
        await checkBackendConnection();
      }
    } catch (error) {
      EventLogger.error('ConnectionContext', 'Failed to check connection:', error as Error);
    }
  };

  // Retry connection
  const retryConnection = async () => {
    EventLogger.info('ConnectionContext', 'Retrying connection...');
    await checkConnection();
  };

  // Handle network state changes
  const handleNetworkChange = (state: NetInfoState) => {
    const wasOnline = isOnline;
    const nowOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    
    setIsOnline(nowOnline);
    setNetworkType(state.type);
    setIsInternetReachable(state.isInternetReachable);
    
    if (wasOnline !== nowOnline) {
      EventLogger.info('ConnectionContext', `Network status changed: ${nowOnline ? 'ONLINE' : 'OFFLINE'}`, {
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });
      
      if (nowOnline) {
        // When coming back online, check backend connection
        checkBackendConnection();
      } else {
        // When going offline, mark backend as disconnected
        setIsBackendConnected(false);
        setBackendStatus('offline');
      }
    }
  };

  useEffect(() => {
    // Configure NetInfo
    NetInfo.configure({
      reachabilityUrl: 'https://clients3.google.com/generate_204',
      reachabilityTest: async (response) => response.status === 204,
      reachabilityLongTimeout: 60 * 1000, // 60s
      reachabilityShortTimeout: 5 * 1000, // 5s
      reachabilityRequestTimeout: 15 * 1000, // 15s
      reachabilityShouldRun: () => true,
    });

    // Set up network monitoring
    const unsubscribe = NetInfo.addEventListener(handleNetworkChange);
    unsubscribeRef.current = unsubscribe;

    // Initial connection check
    checkConnection();

    // Set up periodic backend checks (every 30 seconds when online)
    checkIntervalRef.current = setInterval(() => {
      if (isOnline && !isCheckingRef.current) {
        checkBackendConnection();
      }
    }, 30000);

    // Cleanup
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isOnline]);

  const value: ConnectionContextType = {
    isOnline,
    isBackendConnected,
    connectionDetails: {
      networkType,
      isInternetReachable,
      backendStatus,
      lastChecked,
    },
    checkConnection,
    retryConnection,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export default ConnectionContext;