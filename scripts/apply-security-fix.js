#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
  console.error('This script requires service role access to apply security fixes.');
  console.error('\nTo get your service role key:');
  console.error('1. Go to https://app.supabase.com');
  console.error('2. Navigate to your project');
  console.error('3. Go to Settings → API');
  console.error('4. Copy the "service_role" key (keep it secret!)');
  console.error('5. Add it to your .env file as SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applySecurityFix() {
  console.log('🔒 Applying Comprehensive Security Fix...\n');

  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '16_comprehensive_security_fix.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Security issues to fix:');
    console.log('   - SECURITY DEFINER view (user_roles_summary)');
    console.log('   - Enable RLS on 8 tables:');
    console.log('     • user_collections');
    console.log('     • automation_reviews');
    console.log('     • feature_flags');
    console.log('     • automation_executions');
    console.log('     • step_executions');
    console.log('     • shares');
    console.log('     • reviews');
    console.log('     • comments\n');

    // For security fixes, we need to run this directly in Supabase
    console.log('⚠️  Security fixes must be applied directly in Supabase dashboard');
    console.log('\n📋 Steps to apply the fix:');
    console.log('1. Go to https://app.supabase.com');
    console.log('2. Navigate to your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy the contents of: supabase/migrations/16_comprehensive_security_fix.sql');
    console.log('5. Paste and run the query\n');

    // Let's at least verify the current state
    console.log('🔍 Checking current security status...\n');

    // Check RLS status for each table
    const tables = [
      'user_collections',
      'automation_reviews',
      'feature_flags',
      'automation_executions',
      'step_executions',
      'shares',
      'reviews',
      'comments'
    ];

    for (const table of tables) {
      try {
        // Try to query the table
        const { error } = await supabase
          .from(table)
          .select('count')
          .limit(0);

        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`⚠️  ${table}: Accessible (RLS may be disabled)`);
        }
      } catch (err) {
        console.log(`❓ ${table}: Unknown status`);
      }
    }

    console.log('\n✨ Next Steps:');
    console.log('1. Apply the migration in Supabase dashboard');
    console.log('2. Run "npm run verify-security" to check if fixes were applied');
    console.log('3. The Supabase linter should show all errors resolved');

    // Create a quick SQL snippet for easy copying
    const quickFixPath = path.join(__dirname, '..', 'quick-security-fix.sql');
    fs.writeFileSync(quickFixPath, migrationSQL);
    console.log(`\n💡 Full SQL saved to: ${quickFixPath}`);
    console.log('   You can copy this file\'s contents to run in Supabase SQL Editor');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the security fix check
applySecurityFix().catch(console.error);