#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 Testing Authentication Flow...\n');

async function testAuthFlow() {
  console.log('📋 Test 1: Check Supabase Connection');
  console.log('=====================================');
  
  try {
    // Test basic connection
    const { error: healthError } = await supabase
      .from('automations')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    if (healthError) {
      console.error('❌ Supabase connection failed:', healthError);
      return;
    }
    
    console.log('✅ Supabase connection successful\n');
    
  } catch (error) {
    console.error('❌ Connection test error:', error);
    return;
  }

  console.log('📋 Test 2: Create Test User');
  console.log('===========================');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // Create a test user
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
      console.error('❌ Sign up failed:', signUpError);
    } else {
      console.log('✅ Test user created successfully');
      console.log('   Email:', testEmail);
      console.log('   User ID:', signUpData.user?.id);
    }
    
  } catch (error) {
    console.error('❌ Sign up error:', error);
  }

  console.log('\n📋 Test 3: Sign In Flow');
  console.log('=======================');
  
  try {
    // Test sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError);
    } else {
      console.log('✅ Sign in successful');
      console.log('   Session exists:', !!signInData.session);
      console.log('   Access token:', signInData.session?.access_token?.substring(0, 20) + '...');
    }
    
  } catch (error) {
    console.error('❌ Sign in error:', error);
  }

  console.log('\n📋 Test 4: Check User Profile');
  console.log('==============================');
  
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.log('⚠️  User profile not found (will be created on first sign-in)');
      } else {
        console.log('✅ User profile exists');
        console.log('   Name:', profile.name);
        console.log('   Email:', profile.email);
        console.log('   Role:', profile.role);
      }
    }
    
  } catch (error) {
    console.error('❌ Profile check error:', error);
  }

  console.log('\n📋 Test 5: Create Automation (Auth Required)');
  console.log('============================================');
  
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('❌ No session - cannot create automation');
      return;
    }
    
    // Try to create an automation
    const { data: automation, error: createError } = await supabase
      .from('automations')
      .insert({
        title: 'Test Automation',
        description: 'Created by auth flow test',
        category: 'Productivity',
        created_by: session.user.id,
        steps: [{ type: 'webhook', config: { url: 'https://example.com' } }],
        tags: ['test'],
        is_public: false
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Failed to create automation:', createError);
    } else {
      console.log('✅ Automation created successfully');
      console.log('   ID:', automation.id);
      console.log('   Title:', automation.title);
      
      // Clean up - delete test automation
      await supabase
        .from('automations')
        .delete()
        .eq('id', automation.id);
    }
    
  } catch (error) {
    console.error('❌ Automation test error:', error);
  }

  console.log('\n📋 Test 6: Sign Out');
  console.log('===================');
  
  try {
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('❌ Sign out failed:', signOutError);
    } else {
      console.log('✅ Sign out successful');
    }
    
  } catch (error) {
    console.error('❌ Sign out error:', error);
  }

  console.log('\n✨ Authentication Flow Test Complete!');
  console.log('\n📌 Summary:');
  console.log('- If all tests passed: Authentication is working correctly');
  console.log('- If sign-in fails: Check Supabase Auth settings');
  console.log('- If automation creation fails: Check RLS policies');
  console.log('\n💡 Common Issues:');
  console.log('1. "Invalid email or password" - User doesn\'t exist or wrong credentials');
  console.log('2. "JWT expired" - Clear app cache and try again');
  console.log('3. "permission denied" - RLS policies need adjustment');
}

// Run all tests
testAuthFlow().catch(console.error);