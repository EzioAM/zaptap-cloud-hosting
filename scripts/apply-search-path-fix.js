#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
  console.error('\nThis fix requires the service role key to update functions.');
  process.exit(1);
}

async function applySearchPathFix() {
  console.log('🔧 Applying Function Search Path Security Fix...\n');

  const functionList = [
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

  console.log('📋 Functions to fix:');
  console.log(`   Total: ${functionList.length} functions\n`);

  console.log('⚠️  Important: This fix must be applied via Supabase SQL Editor\n');
  
  console.log('📝 Steps to apply:');
  console.log('1. Go to https://app.supabase.com');
  console.log('2. Navigate to your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Copy contents of: supabase/migrations/18_fix_function_search_paths.sql');
  console.log('5. Paste and run the query\n');

  console.log('🔍 What this fix does:');
  console.log('- Sets "search_path = public, pg_catalog" for all functions');
  console.log('- Prevents SQL injection via search_path manipulation');
  console.log('- Improves function security and predictability\n');

  console.log('📊 Functions by category:');
  console.log('- Admin/Developer: exec_sql, get_rls_status, grant_developer_access');
  console.log('- User Management: get_user_role, user_has_permission');
  console.log('- Statistics: get_user_automation_stats, get_trending_automations');
  console.log('- Tracking: track_automation_view, track_automation_download');
  console.log('- Utilities: handle_updated_at, cleanup_expired_shares');
  console.log('- Analytics: get_daily_execution_stats, get_automation_trends\n');

  // Generate a summary file
  const summaryPath = path.join(__dirname, '..', 'function-search-path-summary.txt');
  const summary = `Function Search Path Fix Summary
================================

Total Functions to Fix: ${functionList.length}

Functions:
${functionList.map(f => `- ${f}`).join('\n')}

Migration File: supabase/migrations/18_fix_function_search_paths.sql

To Apply:
1. Run the migration in Supabase SQL Editor
2. All functions will have search_path set to "public, pg_catalog"
3. This prevents search_path injection attacks

Generated: ${new Date().toISOString()}
`;

  fs.writeFileSync(summaryPath, summary);
  console.log(`💾 Summary saved to: ${summaryPath}`);

  console.log('\n✅ Next steps:');
  console.log('1. Apply the migration in Supabase');
  console.log('2. Run "npm run verify:search-paths" to confirm fixes');
  console.log('3. Check Supabase Linter - warnings should be resolved');
}

applySearchPathFix().catch(console.error);