import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import { EventLogger } from '../../utils/EventLogger';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

// Create a custom storage implementation with error handling
const customStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      EventLogger.error('client', 'Storage getItem error:', error as Error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      EventLogger.error('client', 'Storage setItem error:', error as Error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      EventLogger.error('client', 'Storage removeItem error:', error as Error);
    }
  },
};

// Enhanced Supabase client with retry logic
class SupabaseClientWithRetry {
  private client: SupabaseClient;
  private isOnline: boolean = true;
  private retryCount: number = 3;
  private retryDelay: number = 1000;
  private networkUnsubscribe: (() => void) | null = null;

  constructor() {
    this.client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storageKey: 'supabase.auth.token',
      },
      global: {
        headers: {
          'X-Client-Info': 'zaptap-mobile',
        },
      },
      db: {
        schema: 'public',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    // Initialize network monitoring
    this.initializeNetworkMonitoring();
  }

  private initializeNetworkMonitoring() {
    try {
      // Configure NetInfo for consistent behavior with main network service
      NetInfo.configure({
        reachabilityUrl: 'https://clients3.google.com/generate_204',
        reachabilityTest: async (response) => response.status === 204,
        reachabilityLongTimeout: 60 * 1000, // 60s
        reachabilityShortTimeout: 5 * 1000, // 5s
        reachabilityRequestTimeout: 15 * 1000, // 15s
        reachabilityShouldRun: () => true,
      });

      // Monitor network connectivity
      this.networkUnsubscribe = NetInfo.addEventListener(state => {
        const wasOnline = this.isOnline;
        this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
        
        if (wasOnline !== this.isOnline) {
          EventLogger.info('SupabaseClient', 'Network status changed:', {
            isOnline: this.isOnline,
            connectionType: state.type,
            isInternetReachable: state.isInternetReachable
          });
        }
      });

      // Get initial network state
      NetInfo.fetch().then(state => {
        this.isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
        EventLogger.debug('SupabaseClient', 'Initial network status:', {
          isOnline: this.isOnline,
          connectionType: state.type,
          isInternetReachable: state.isInternetReachable
        });
      }).catch(error => {
        EventLogger.error('SupabaseClient', 'Failed to get initial network status:', error as Error);
      });
    } catch (error) {
      EventLogger.error('SupabaseClient', 'Failed to initialize network monitoring:', error as Error);
    }
  }

  // Method to get network status
  getNetworkStatus() {
    return this.isOnline;
  }

  // Cleanup method
  cleanup() {
    try {
      if (this.networkUnsubscribe) {
        this.networkUnsubscribe();
        this.networkUnsubscribe = null;
      }
    } catch (error) {
      EventLogger.error('SupabaseClient', 'Error during cleanup:', error as Error);
    }
  }

  // Get the underlying Supabase client
  get supabase() {
    return this.client;
  }

  // Retry wrapper for database operations
  async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      try {
        // Check network status before attempting
        if (!this.isOnline) {
          throw new Error('No network connection - offline mode');
        }

        const result = await operation();
        
        // If we succeeded after retries, log it
        if (attempt > 0) {
          EventLogger.info('SupabaseClient', `Operation succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || 'Unknown error';
        
        EventLogger.warn('SupabaseClient', `Attempt ${attempt + 1}/${this.retryCount} failed:`, {
          error: errorMessage,
          code: error.code,
          isOnline: this.isOnline
        });

        // Don't retry on specific error conditions
        const nonRetryableErrors = [
          '42501', // permission denied
          '23503', // foreign key violation
          '23505', // unique violation
          '23514', // check violation
          'PGRST301', // JWT expired
        ];
        
        const isAuthError = error.message?.includes('JWT') || error.message?.includes('auth');
        const isValidationError = nonRetryableErrors.includes(error.code);
        const isNetworkOffline = !this.isOnline;
        
        if (isAuthError || isValidationError) {
          EventLogger.info('SupabaseClient', 'Non-retryable error, failing immediately:', {
            error: errorMessage,
            isAuthError,
            isValidationError
          });
          throw error;
        }

        // If network went offline during operation, don't retry
        if (isNetworkOffline) {
          EventLogger.info('SupabaseClient', 'Network went offline, not retrying');
          throw new Error('Network connection lost during operation');
        }

        // Wait before retrying with exponential backoff
        if (attempt < this.retryCount - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          EventLogger.debug('SupabaseClient', `Waiting ${delay}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Check network status again after delay
          if (!this.isOnline) {
            EventLogger.info('SupabaseClient', 'Network offline after delay, not retrying');
            throw new Error('Network connection lost during retry delay');
          }
        }
      }
    }

    EventLogger.error('SupabaseClient', `All ${this.retryCount} attempts failed, giving up`);
    throw lastError;
  }
}

// Create singleton instance
const supabaseClientWithRetry = new SupabaseClientWithRetry();
export const supabase = supabaseClientWithRetry.supabase;
export const supabaseWithRetry = supabaseClientWithRetry;

// Enhanced test connection function
export const testConnection = async (): Promise<{
  connected: boolean;
  authenticated: boolean;
  error?: string;
  details: string;
  user?: string;
  networkStatus?: boolean;
}> => {
  try {
    // Check network connectivity first
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return {
        connected: false,
        authenticated: false,
        error: 'No network connection',
        details: 'network_offline',
        networkStatus: false,
      };
    }

    // Test database connection with retry
    const { error: healthError } = await supabaseWithRetry.withRetry(async () => {
      const result = await supabase
        .from('automations')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      if (result.error) throw result.error;
      return result;
    });
    
    if (healthError) {
      EventLogger.error('client', '❌ Database connection failed:', healthError as Error);
      return { 
        connected: false, 
        authenticated: false,
        error: healthError.message, 
        details: 'database',
        networkStatus: true,
      };
    }

    // Test authentication status
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      EventLogger.error('client', '❌ Auth service error:', sessionError as Error);
      return { 
        connected: false,
        authenticated: false, 
        error: sessionError.message, 
        details: 'auth',
        networkStatus: true,
      };
    }

    EventLogger.debug('client', '✅ Supabase connected successfully');
    EventLogger.debug('client', '✅ Session status:', session ? 'Authenticated' : 'Not authenticated');
    
    return { 
      connected: true, 
      authenticated: !!session,
      user: session?.user?.email,
      details: 'all_services_operational',
      networkStatus: true,
    };
  } catch (error: any) {
    // Don't log network errors as errors
    if (error?.message?.includes('Network request failed') || 
        error?.name === 'NetworkError') {
      EventLogger.debug('client', '📴 Network unavailable for connection test');
    } else {
      EventLogger.error('client', '❌ Supabase connection failed:', error as Error);
    }
    
    return { 
      connected: false,
      authenticated: false, 
      error: error.message || 'Unknown error',
      details: 'network_or_config',
      networkStatus: false,
    };
  }
};

// Helper to refresh session if needed
export const refreshSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    if (error) {
      // Don't log network errors as errors
      if (error?.message?.includes('Network request failed') || 
          error?.name === 'NetworkError' ||
          error?.name === 'AuthRetryableFetchError') {
        EventLogger.debug('client', '📴 Network unavailable - cannot refresh session');
        return null;
      }
      
      EventLogger.error('client', 'Failed to refresh session:', error as Error);
      
      // If refresh fails, try to get the current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return currentSession;
    }
    return session;
  } catch (error: any) {
    // Handle network errors gracefully
    if (error?.message?.includes('Network request failed') || 
        error?.name === 'NetworkError' ||
        error?.name === 'AuthRetryableFetchError') {
      EventLogger.debug('client', '📴 Network unavailable - cannot refresh session');
      return null;
    }
    
    EventLogger.error('client', 'Failed to refresh session:', error as Error);
    return null;
  }
};

// Helper to ensure session is valid (gracefully handles no session)
export const ensureValidSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Handle auth service errors gracefully
    if (error) {
      if (error?.message?.includes('Network request failed') || 
          error?.name === 'NetworkError' ||
          error?.name === 'AuthRetryableFetchError') {
        EventLogger.debug('client', '📴 Network unavailable - cannot validate session');
        return null;
      }
      // For other auth errors, log and continue without session
      EventLogger.debug('client', 'Auth service error:', error.message);
      return null;
    }
    
    if (!session) {
      return null;
    }

    // Check if token is expired
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt * 1000 < Date.now()) {
      // Token expired, try to refresh
      EventLogger.debug('client', 'Token expired, attempting refresh...');
      return await refreshSession();
    }

    return session;
  } catch (error: any) {
    // Handle network errors gracefully
    if (error?.message?.includes('Network request failed') || 
        error?.name === 'NetworkError' ||
        error?.name === 'AuthRetryableFetchError') {
      EventLogger.debug('client', '📴 Network unavailable - cannot validate session');
      return null;
    }
    
    // Log other errors but don't throw them to avoid breaking the app
    EventLogger.warn('client', 'Session validation error:', error.message);
    return null;
  }
};

// Helper to check if we should allow public access for this request
export const shouldAllowPublicAccess = (url?: string): boolean => {
  if (!url) return false;
  
  // Allow public access for certain endpoints
  const publicEndpoints = [
    'automations?is_public=eq.true', // Public automations
    'automations?select=*&is_public=eq.true', // Public automations with select
  ];
  
  return publicEndpoints.some(endpoint => url.includes(endpoint));
};

// Helper to handle auth errors globally
export const handleAuthError = async (error: any, requestUrl?: string) => {
  // If this is a public endpoint and we get an auth error, it might be expected
  if (shouldAllowPublicAccess(requestUrl)) {
    EventLogger.debug('client', 'Auth error on public endpoint - this may be expected for demo mode');
    return false;
  }
  
  if (error.message?.includes('JWT') || error.code === 'PGRST301') {
    // JWT error, try to refresh session
    const newSession = await refreshSession();
    if (newSession) {
      EventLogger.debug('client', '✅ Session refreshed successfully');
      return true;
    } else {
      EventLogger.debug('client', '❌ Failed to refresh session, user needs to login again');
      return false;
    }
  }
  return false;
};