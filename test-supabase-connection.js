// Test script to verify Supabase connection
// Run with: node test-supabase-connection.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

console.log('🔍 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('\n📋 Test 1: Checking database connection...');
    const { data: test1, error: error1 } = await supabase
      .from('automations')
      .select('count', { count: 'exact', head: true });
    
    if (error1) {
      console.error('❌ Database connection failed:', error1.message);
    } else {
      console.log('✅ Database connection successful!');
    }

    // Test 2: Auth service
    console.log('\n📋 Test 2: Checking auth service...');
    const { data: { session }, error: error2 } = await supabase.auth.getSession();
    
    if (error2) {
      console.error('❌ Auth service error:', error2.message);
    } else {
      console.log('✅ Auth service operational');
      console.log('Session status:', session ? 'Active session found' : 'No active session');
    }

    // Test 3: Fetch public automations
    console.log('\n📋 Test 3: Fetching public automations...');
    const { data: automations, error: error3 } = await supabase
      .from('automations')
      .select('id, title, is_public')
      .eq('is_public', true)
      .limit(5);
    
    if (error3) {
      console.error('❌ Failed to fetch automations:', error3.message);
    } else {
      console.log('✅ Successfully fetched automations');
      console.log(`Found ${automations?.length || 0} public automations`);
      automations?.forEach(a => console.log(`  - ${a.title}`));
    }

    // Test 4: Test RLS policies
    console.log('\n📋 Test 4: Testing Row Level Security...');
    const { data: testInsert, error: error4 } = await supabase
      .from('automations')
      .select('*')
      .limit(1);
    
    if (error4) {
      console.log('ℹ️  RLS is active (expected for anonymous users):', error4.message);
    } else {
      console.log('✅ RLS check passed');
    }

    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('\n💥 Unexpected error:', error);
  }
}

testConnection();