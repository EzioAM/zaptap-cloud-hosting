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

async function verifySecurityFixes() {
  console.log('🔍 Verifying Security Fixes...\n');

  const issues = [];
  const fixed = [];

  try {
    // 1. Check if user_roles_summary view exists and is not SECURITY DEFINER
    console.log('Checking user_roles_summary view...');
    const { data: viewData, error: viewError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname,
            viewname,
            definition
          FROM pg_views 
          WHERE viewname = 'user_roles_summary' 
          AND schemaname = 'public'
        `
      });

    if (viewError || !viewData) {
      console.log('⚠️  Could not check view status');
    } else if (viewData.length > 0) {
      const definition = viewData[0].definition || '';
      if (definition.includes('SECURITY DEFINER')) {
        issues.push('user_roles_summary view still has SECURITY DEFINER');
        console.log('❌ user_roles_summary: SECURITY DEFINER still present');
      } else {
        fixed.push('user_roles_summary view fixed');
        console.log('✅ user_roles_summary: No SECURITY DEFINER');
      }
    }

    // 2. Check RLS status for all tables
    console.log('\nChecking RLS status for tables...');
    
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

    // Try to get RLS status using pg_class
    const { data: rlsData, error: rlsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            c.relname as table_name,
            c.relrowsecurity as rls_enabled
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname = ANY($1::text[])
        `,
        args: [tables]
      });

    if (rlsError || !rlsData) {
      // Fallback: check each table individually
      for (const table of tables) {
        try {
          // Try to query without auth
          const { error } = await supabase
            .from(table)
            .select('count')
            .limit(0);

          if (!error) {
            issues.push(`${table}: RLS might be disabled (table is accessible)`);
            console.log(`❌ ${table}: RLS possibly disabled`);
          } else if (error.code === '42501') {
            fixed.push(`${table}: RLS enabled`);
            console.log(`✅ ${table}: RLS enabled (permission denied)`);
          } else {
            console.log(`⚠️  ${table}: Unknown status (${error.code})`);
          }
        } catch (err) {
          console.log(`❓ ${table}: Could not check`);
        }
      }
    } else {
      // Process RLS data
      rlsData.forEach(row => {
        if (row.rls_enabled) {
          fixed.push(`${row.table_name}: RLS enabled`);
          console.log(`✅ ${row.table_name}: RLS enabled`);
        } else {
          issues.push(`${row.table_name}: RLS disabled`);
          console.log(`❌ ${row.table_name}: RLS disabled`);
        }
      });
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   ✅ Fixed: ${fixed.length} issues`);
    console.log(`   ❌ Remaining: ${issues.length} issues`);

    if (issues.length > 0) {
      console.log('\n⚠️  Remaining issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\n💡 Run the migration in Supabase SQL Editor to fix these issues');
    } else {
      console.log('\n✨ All security issues have been fixed!');
    }

  } catch (error) {
    console.error('❌ Verification error:', error.message);
    console.log('\n💡 If exec_sql is not available, check manually in Supabase dashboard:');
    console.log('   1. Go to Database → Tables');
    console.log('   2. Check each table for the RLS shield icon');
    console.log('   3. Go to Database → Views');
    console.log('   4. Check user_roles_summary view properties');
  }
}

// Run verification
verifySecurityFixes().catch(console.error);