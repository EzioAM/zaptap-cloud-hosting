// Verify Supabase database setup
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyDatabase() {
  console.log('🔍 Verifying Supabase database setup...\n');

  // Tables to verify
  const requiredTables = [
    'users',
    'automations', 
    'deployments',
    'automation_executions',
    'automation_likes',
    'reviews',
    'comments'
  ];
  
  // Note: automation_steps table is deprecated - steps are now stored as JSON in automations.steps column

  // Check if tables exist
  console.log('📋 Checking tables...');
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Table '${table}' - Error: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    } catch (error) {
      console.error(`❌ Table '${table}' - Failed to check: ${error.message}`);
    }
  }

  // Check RLS policies
  console.log('\n🔐 Checking RLS policies...');
  let policies = null;
  let policiesError = null;
  
  try {
    const result = await supabase.rpc('get_policies', { schema_name: 'public' });
    policies = result.data;
    policiesError = result.error;
  } catch (error) {
    policiesError = 'Function not available';
  }

  if (policiesError || !policies) {
    console.log('⚠️  Could not check RLS policies (function may not exist)');
  } else {
    const tableWithPolicies = new Set(policies.map(p => p.tablename));
    for (const table of requiredTables) {
      if (tableWithPolicies.has(table)) {
        console.log(`✅ Table '${table}' has RLS policies`);
      } else {
        console.log(`⚠️  Table '${table}' may not have RLS policies`);
      }
    }
  }

  // Test authentication
  console.log('\n🔑 Testing authentication...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'test123456'
  });

  if (authError) {
    if (authError.message.includes('Invalid login credentials')) {
      console.log('✅ Auth service is working (test user does not exist)');
    } else {
      console.error(`❌ Auth service error: ${authError.message}`);
    }
  } else {
    console.log('✅ Auth service is working');
    await supabase.auth.signOut();
  }

  // Test public automations query
  console.log('\n📊 Testing public automations query...');
  const { data: automations, error: automationsError } = await supabase
    .from('automations')
    .select('*')
    .eq('is_public', true)
    .limit(5);

  if (automationsError) {
    console.error(`❌ Public automations query failed: ${automationsError.message}`);
  } else {
    console.log(`✅ Public automations query successful (found ${automations?.length || 0} automations)`);
  }

  console.log('\n✨ Database verification complete!');
}

// Run verification
verifyDatabase().catch(console.error);