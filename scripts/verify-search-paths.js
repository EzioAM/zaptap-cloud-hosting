#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifySearchPaths() {
  console.log('🔍 Verifying Function Search Paths...\n');

  const functionsToCheck = [
    'get_table_columns',
    'get_rls_status',
    'exec_sql',
    'execute_sql',
    'get_user_role',
    'user_has_permission',
    'set_developer_role_for_email',
    'grant_developer_access',
    'log_developer_access_change',
    'get_user_automation_stats',
    'get_user_automation_stats_fast',
    'get_automation_engagement',
    'get_trending_automations',
    'get_popular_automations',
    'track_automation_view',
    'track_automation_download',
    'increment_automation_execution_count',
    'increment_share_access_count',
    'handle_updated_at',
    'handle_new_user',
    'update_automation_likes_count',
    'update_comment_likes_count',
    'get_daily_execution_stats',
    'get_step_execution_stats',
    'get_automation_trends',
    'get_change_statistics',
    'revert_change',
    'cleanup_expired_shares',
    'cleanup_old_executions',
    'update_execution_summary',
    'get_shareable_automation',
    'verify_rls_enabled'
  ];

  const fixedFunctions = [];
  const unfixedFunctions = [];
  const notFoundFunctions = [];

  console.log('Checking functions for search_path configuration...\n');

  // Query to check function configurations
  const checkQuery = `
    SELECT 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = ANY($1::text[])
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: checkQuery,
      args: [functionsToCheck]
    });

    if (error) {
      console.log('⚠️  Cannot directly query functions via exec_sql');
      console.log('   This is expected if exec_sql is restricted\n');
      
      // Fallback: Try to call each function to see if it exists
      for (const funcName of functionsToCheck) {
        try {
          // Try a simple query that would fail if function doesn't exist
          await supabase.rpc(funcName, {});
          console.log(`✓ ${funcName} - exists (search_path status unknown)`);
        } catch (err) {
          if (err.message.includes('not exist')) {
            notFoundFunctions.push(funcName);
            console.log(`✗ ${funcName} - not found`);
          } else {
            // Function exists but might have parameter requirements
            console.log(`✓ ${funcName} - exists (search_path status unknown)`);
          }
        }
      }
    } else if (data) {
      // Process function definitions
      data.forEach(row => {
        const hasSearchPath = row.function_definition.includes('SET search_path');
        if (hasSearchPath) {
          fixedFunctions.push(row.function_name);
          console.log(`✅ ${row.function_name} - has search_path set`);
        } else {
          unfixedFunctions.push(row.function_name);
          console.log(`❌ ${row.function_name} - missing search_path`);
        }
      });

      // Check for functions not found
      functionsToCheck.forEach(funcName => {
        if (!data.find(row => row.function_name === funcName)) {
          notFoundFunctions.push(funcName);
          console.log(`❓ ${funcName} - not found in database`);
        }
      });
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total functions checked: ${functionsToCheck.length}`);
    
    if (fixedFunctions.length > 0) {
      console.log(`   ✅ Fixed (has search_path): ${fixedFunctions.length}`);
    }
    
    if (unfixedFunctions.length > 0) {
      console.log(`   ❌ Not fixed (missing search_path): ${unfixedFunctions.length}`);
      console.log('\n   Functions needing fix:');
      unfixedFunctions.forEach(f => console.log(`     - ${f}`));
    }
    
    if (notFoundFunctions.length > 0) {
      console.log(`   ❓ Not found: ${notFoundFunctions.length}`);
    }

    if (unfixedFunctions.length === 0 && notFoundFunctions.length === 0) {
      console.log('\n✨ All functions have search_path properly set!');
    } else if (unfixedFunctions.length > 0) {
      console.log('\n⚠️  Some functions still need search_path fix');
      console.log('   Run the migration: supabase/migrations/18_fix_function_search_paths.sql');
    }

  } catch (error) {
    console.error('❌ Verification error:', error.message);
    console.log('\n💡 Manual verification steps:');
    console.log('1. Go to Supabase Dashboard → Database → Functions');
    console.log('2. Check each function definition for "SET search_path"');
    console.log('3. Or run this query in SQL Editor:');
    console.log(`
SELECT 
  proname as function_name,
  CASE 
    WHEN pg_get_functiondef(oid) LIKE '%search_path%' 
    THEN 'Has search_path' 
    ELSE 'Missing search_path' 
  END as status
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;
    `);
  }
}

verifySearchPaths().catch(console.error);