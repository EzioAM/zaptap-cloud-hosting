// Test authentication flow
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true
  }
});

// Test user credentials
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Test123456!';
const TEST_NAME = 'Test User';

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow...\n');

  // Step 1: Test connection
  console.log('1️⃣ Testing Supabase connection...');
  try {
    const { data, error } = await supabase
      .from('automations')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return;
    }
    console.log('✅ Supabase connection successful');
  } catch (error) {
    console.error('❌ Connection error:', error);
    return;
  }

  // Step 2: Test sign up
  console.log('\n2️⃣ Testing sign up flow...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: {
      data: {
        name: TEST_NAME,
      }
    }
  });

  if (signUpError) {
    if (signUpError.message.includes('already registered')) {
      console.log('ℹ️  Test user already exists, skipping to sign in');
    } else {
      console.error('❌ Sign up failed:', signUpError.message);
      return;
    }
  } else {
    console.log('✅ Sign up successful');
    console.log('   User ID:', signUpData.user?.id);
    console.log('   Email:', signUpData.user?.email);
  }

  // Step 3: Test sign in
  console.log('\n3️⃣ Testing sign in flow...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (signInError) {
    console.error('❌ Sign in failed:', signInError.message);
    return;
  }

  console.log('✅ Sign in successful');
  console.log('   User ID:', signInData.user?.id);
  console.log('   Session:', signInData.session ? 'Active' : 'None');
  console.log('   Access Token:', signInData.session?.access_token ? 'Present' : 'Missing');

  // Step 4: Test authenticated queries
  console.log('\n4️⃣ Testing authenticated queries...');
  
  // Test fetching user's automations
  const { data: myAutomations, error: myAutomationsError } = await supabase
    .from('automations')
    .select('*')
    .eq('created_by', signInData.user.id);

  if (myAutomationsError) {
    console.error('❌ Failed to fetch user automations:', myAutomationsError.message);
  } else {
    console.log(`✅ Fetched ${myAutomations?.length || 0} user automations`);
  }

  // Test fetching public automations
  const { data: publicAutomations, error: publicError } = await supabase
    .from('automations')
    .select('*')
    .eq('is_public', true)
    .limit(5);

  if (publicError) {
    console.error('❌ Failed to fetch public automations:', publicError.message);
  } else {
    console.log(`✅ Fetched ${publicAutomations?.length || 0} public automations`);
  }

  // Step 5: Test session refresh
  console.log('\n5️⃣ Testing session refresh...');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('❌ Failed to get session:', sessionError.message);
  } else if (sessionData.session) {
    console.log('✅ Session is active');
    
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('❌ Failed to refresh session:', refreshError.message);
    } else {
      console.log('✅ Session refreshed successfully');
    }
  }

  // Step 6: Test sign out
  console.log('\n6️⃣ Testing sign out...');
  const { error: signOutError } = await supabase.auth.signOut();
  
  if (signOutError) {
    console.error('❌ Sign out failed:', signOutError.message);
  } else {
    console.log('✅ Sign out successful');
  }

  // Verify sign out
  const { data: finalSession } = await supabase.auth.getSession();
  console.log('   Session after sign out:', finalSession.session ? 'Still active' : 'Cleared');

  console.log('\n✨ Authentication flow test complete!');
}

// Run test
testAuthFlow().catch(console.error);