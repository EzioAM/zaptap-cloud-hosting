import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

// Create a custom storage implementation with error handling
const customStorage = {
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },
};

// Enhanced Supabase client with retry logic
class SupabaseClientWithRetry {
  private client: SupabaseClient;
  private isOnline: boolean = true;
  private retryCount: number = 3;
  private retryDelay: number = 1000;

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

    // Monitor network connectivity
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? true;
      console.log('Network status:', this.isOnline ? 'Online' : 'Offline');
    });
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
          throw new Error('No network connection');
        }

        return await operation();
      } catch (error: any) {
        lastError = error;
        console.error(`Attempt ${attempt + 1} failed:`, error.message);

        // Don't retry on auth errors or validation errors
        if (error.code === '42501' || // permission denied
            error.code === '23503' || // foreign key violation
            error.code === '23505' || // unique violation
            error.code === '23514' || // check violation
            error.code === 'PGRST301' || // JWT expired
            error.message?.includes('JWT')) {
          throw error;
        }

        // Wait before retrying
        if (attempt < this.retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (attempt + 1)));
        }
      }
    }

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
      console.error('❌ Database connection failed:', healthError);
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
      console.error('❌ Auth service error:', sessionError);
      return { 
        connected: false,
        authenticated: false, 
        error: sessionError.message, 
        details: 'auth',
        networkStatus: true,
      };
    }

    console.log('✅ Supabase connected successfully');
    console.log('✅ Session status:', session ? 'Authenticated' : 'Not authenticated');
    
    return { 
      connected: true, 
      authenticated: !!session,
      user: session?.user?.email,
      details: 'all_services_operational',
      networkStatus: true,
    };
  } catch (error: any) {
    console.error('❌ Supabase connection failed:', error);
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
      console.error('Failed to refresh session:', error);
      
      // If refresh fails, try to get the current session
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      return currentSession;
    }
    return session;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    return null;
  }
};

// Helper to ensure session is valid
export const ensureValidSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return null;
  }

  // Check if token is expired
  const expiresAt = session.expires_at;
  if (expiresAt && expiresAt * 1000 < Date.now()) {
    // Token expired, try to refresh
    return await refreshSession();
  }

  return session;
};

// Helper to handle auth errors globally
export const handleAuthError = async (error: any) => {
  if (error.message?.includes('JWT') || error.code === 'PGRST301') {
    // JWT error, try to refresh session
    const newSession = await refreshSession();
    if (newSession) {
      console.log('✅ Session refreshed successfully');
      return true;
    } else {
      console.error('❌ Failed to refresh session, user needs to login again');
      return false;
    }
  }
  return false;
};