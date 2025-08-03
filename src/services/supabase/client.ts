import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  // Enhanced test connection function
  export const testConnection = async () => {
    try {
      // Test 1: Check if we can reach Supabase
      const { data: healthCheck, error: healthError } = await supabase
        .from('automations')
        .select('count', { count: 'exact', head: true });
      
      if (healthError) {
        console.error('❌ Database connection failed:', healthError);
        return { connected: false, error: healthError.message, details: 'database' };
      }

      // Test 2: Check authentication status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Auth service error:', sessionError);
        return { connected: false, error: sessionError.message, details: 'auth' };
      }

      console.log('✅ Supabase connected successfully');
      console.log('✅ Session status:', session ? 'Authenticated' : 'Not authenticated');
      
      return { 
        connected: true, 
        authenticated: !!session,
        user: session?.user?.email,
        details: 'all_services_operational'
      };
    } catch (error: any) {
      console.error('❌ Supabase connection failed:', error);
      return { 
        connected: false, 
        error: error.message || 'Unknown error',
        details: 'network_or_config'
      };
    }
  };

  // Helper to refresh session if needed
  export const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return null;
    }
  };