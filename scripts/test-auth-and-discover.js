#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

console.log('🔍 Testing Supabase Authentication and Discover Screen Data...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthentication() {
  console.log('📋 Test 1: Authentication Flow');
  console.log('================================');
  
  try {
    // Test sign up (will fail if user exists, which is fine)
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`Testing sign up with: ${testEmail}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: 'Test User'
        }
      }
    });
    
    if (signUpError) {
      console.log('⚠️  Sign up error (expected if email exists):', signUpError.message);
    } else {
      console.log('✅ Sign up successful!');
      console.log('   User ID:', signUpData.user?.id);
    }
    
    // Test sign in
    console.log('\nTesting sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com', // Use a known test account
      password: 'test123'
    });
    
    if (signInError) {
      console.log('❌ Sign in failed:', signInError.message);
      console.log('   This is expected if the test account does not exist.');
    } else {
      console.log('✅ Sign in successful!');
      console.log('   Session token:', signInData.session?.access_token?.substring(0, 20) + '...');
    }
    
  } catch (error) {
    console.error('❌ Authentication test error:', error);
  }
}

async function testPublicAutomations() {
  console.log('\n\n📋 Test 2: Public Automations Query');
  console.log('=====================================');
  
  try {
    // Test fetching public automations (as anonymous user)
    console.log('Fetching public automations...');
    const { data, error, count } = await supabase
      .from('automations')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .limit(5);
    
    if (error) {
      console.error('❌ Failed to fetch public automations:', error);
      console.log('   Error code:', error.code);
      console.log('   Error details:', error.details);
      console.log('   Error hint:', error.hint);
    } else {
      console.log(`✅ Successfully fetched ${data?.length || 0} public automations`);
      console.log(`   Total count: ${count || 'unknown'}`);
      
      if (data && data.length > 0) {
        console.log('\n   Sample automations:');
        data.forEach((automation, index) => {
          console.log(`   ${index + 1}. ${automation.title} (${automation.category})`);
        });
      }
    }
    
    // Test automation engagement function
    console.log('\nTesting automation engagement function...');
    if (data && data.length > 0) {
      const testAutomationId = data[0].id;
      const { data: engagementData, error: engagementError } = await supabase
        .rpc('get_automation_engagement', { p_automation_id: testAutomationId });
      
      if (engagementError) {
        console.log('⚠️  Engagement function error:', engagementError.message);
        console.log('   This is expected if the function is not yet created.');
      } else {
        console.log('✅ Engagement data retrieved:', engagementData);
      }
    }
    
  } catch (error) {
    console.error('❌ Public automations test error:', error);
  }
}

async function testDatabaseSchema() {
  console.log('\n\n📋 Test 3: Database Schema Verification');
  console.log('=========================================');
  
  try {
    // Check if required tables exist
    const tables = ['automations', 'users', 'automation_likes'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(0);
      
      if (error) {
        console.log(`❌ Table '${table}' is not accessible:`, error.message);
      } else {
        console.log(`✅ Table '${table}' exists and is accessible`);
      }
    }
    
  } catch (error) {
    console.error('❌ Schema verification error:', error);
  }
}

async function testTrendingAutomations() {
  console.log('\n\n📋 Test 4: Trending Automations');
  console.log('=================================');
  
  try {
    const { data, error } = await supabase
      .rpc('get_trending_automations', { 
        p_limit: 5,
        p_time_window: '7 days' 
      });
    
    if (error) {
      console.log('⚠️  Trending function error:', error.message);
      console.log('   Falling back to regular public automations query...');
      
      // Fallback test
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('automations')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (fallbackError) {
        console.log('❌ Fallback query also failed:', fallbackError.message);
      } else {
        console.log(`✅ Fallback query successful: ${fallbackData?.length || 0} automations`);
      }
    } else {
      console.log(`✅ Trending automations retrieved: ${data?.length || 0} items`);
    }
    
  } catch (error) {
    console.error('❌ Trending automations test error:', error);
  }
}

// Run all tests
async function runAllTests() {
  await testAuthentication();
  await testPublicAutomations();
  await testDatabaseSchema();
  await testTrendingAutomations();
  
  console.log('\n\n✨ All tests completed!');
  console.log('\n📌 Summary:');
  console.log('- If authentication tests passed: Sign-in should work in the app');
  console.log('- If public automations query passed: Discover screen should load');
  console.log('- If schema tests passed: Database structure is correct');
  console.log('- If any tests failed: Run the migration script first');
  console.log('\nTo apply fixes, run: npm run apply-auth-fix');
}

runAllTests().catch(console.error);