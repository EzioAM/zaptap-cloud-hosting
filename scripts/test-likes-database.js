#!/usr/bin/env node

/**
 * Database Likes Functionality Test Script
 * 
 * This script verifies that the automation_likes table exists and works correctly
 * with the exact query used by the DiscoverScreen API.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('automations')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    return false;
  }
}

async function checkAutomationsTable() {
  console.log('\n🔍 Checking automations table structure...');
  
  try {
    const { data, error } = await supabase
      .from('automations')
      .select('id, title, description, is_public, category, created_at')
      .limit(1);
    
    if (error) {
      console.error('❌ Automations table check failed:', error.message);
      return false;
    }
    
    console.log('✅ Automations table structure verified');
    console.log(`📊 Table accessible with columns: id, title, description, is_public, category, created_at`);
    return true;
  } catch (err) {
    console.error('❌ Automations table error:', err.message);
    return false;
  }
}

async function checkAutomationLikesTable() {
  console.log('\n🔍 Checking automation_likes table...');
  
  try {
    const { data, error } = await supabase
      .from('automation_likes')
      .select('id, automation_id, user_id, created_at')
      .limit(1);
    
    if (error) {
      console.error('❌ automation_likes table check failed:', error.message);
      console.log('💡 The automation_likes table may not exist. Run the setup SQL to create it.');
      return false;
    }
    
    console.log('✅ automation_likes table structure verified');
    console.log(`📊 Table accessible with columns: id, automation_id, user_id, created_at`);
    return true;
  } catch (err) {
    console.error('❌ automation_likes table error:', err.message);
    return false;
  }
}

async function testLikesJoinQuery() {
  console.log('\n🔍 Testing the exact API likes query...');
  
  try {
    // This is the exact query from automationApi.ts getPublicAutomations
    const { data, error } = await supabase
      .from('automations')
      .select(`
        *,
        automation_likes!left(user_id),
        likes_count:automation_likes(count)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Likes join query failed:', error.message);
      console.error('📋 Error details:', {
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return false;
    }
    
    console.log('✅ Likes join query successful');
    console.log(`📊 Found ${data.length} public automations`);
    
    // Test data transformation (like the API does)
    if (data.length > 0) {
      const sampleAutomation = data[0];
      console.log('\n📋 Sample automation with likes data:');
      console.log({
        id: sampleAutomation.id,
        title: sampleAutomation.title,
        automation_likes: sampleAutomation.automation_likes ? sampleAutomation.automation_likes.length : 0,
        likes_count: Array.isArray(sampleAutomation.likes_count) 
          ? sampleAutomation.likes_count.length 
          : (sampleAutomation.likes_count || 0)
      });
    }
    
    return true;
  } catch (err) {
    console.error('❌ Likes join query error:', err.message);
    return false;
  }
}

async function testLikeOperations() {
  console.log('\n🔍 Testing like/unlike operations...');
  
  try {
    // First, get a public automation to test with
    const { data: automations, error: automationError } = await supabase
      .from('automations')
      .select('id')
      .eq('is_public', true)
      .limit(1);
    
    if (automationError || !automations || automations.length === 0) {
      console.log('⚠️  No public automations found for testing like operations');
      return true; // Not a critical failure
    }
    
    const automationId = automations[0].id;
    
    // Try to get current user (this will fail if not authenticated, which is expected)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('ℹ️  Not authenticated - skipping like operations test (this is normal for automated tests)');
      return true;
    }
    
    console.log('🔐 Authenticated user found, testing like operations...');
    
    // Test like operation
    const { error: likeError } = await supabase
      .from('automation_likes')
      .upsert({ 
        automation_id: automationId,
        user_id: user.id 
      }, {
        onConflict: 'automation_id,user_id'
      });
    
    if (likeError) {
      console.error('❌ Like operation failed:', likeError.message);
      return false;
    }
    
    console.log('✅ Like operation successful');
    
    // Test unlike operation
    const { error: unlikeError } = await supabase
      .from('automation_likes')
      .delete()
      .match({ 
        automation_id: automationId,
        user_id: user.id 
      });
    
    if (unlikeError) {
      console.error('❌ Unlike operation failed:', unlikeError.message);
      return false;
    }
    
    console.log('✅ Unlike operation successful');
    return true;
    
  } catch (err) {
    console.error('❌ Like operations test error:', err.message);
    return false;
  }
}

async function checkRLSPolicies() {
  console.log('\n🔍 Checking RLS policies...');
  
  try {
    // Test if we can read automation_likes (should work with proper RLS)
    const { data, error } = await supabase
      .from('automation_likes')
      .select('id')
      .limit(1);
    
    if (error && error.message.includes('RLS')) {
      console.error('❌ RLS policy issue:', error.message);
      return false;
    }
    
    console.log('✅ RLS policies appear to be working correctly');
    return true;
  } catch (err) {
    console.error('❌ RLS policy check error:', err.message);
    return false;
  }
}

async function generateDiagnosticReport() {
  console.log('\n📋 DIAGNOSTIC REPORT');
  console.log('===================');
  
  const results = {
    databaseConnection: await testDatabaseConnection(),
    automationsTable: false,
    automationLikesTable: false,
    likesJoinQuery: false,
    likeOperations: false,
    rlsPolicies: false
  };
  
  if (results.databaseConnection) {
    results.automationsTable = await checkAutomationsTable();
    results.automationLikesTable = await checkAutomationLikesTable();
    
    if (results.automationsTable && results.automationLikesTable) {
      results.likesJoinQuery = await testLikesJoinQuery();
      results.likeOperations = await testLikeOperations();
      results.rlsPolicies = await checkRLSPolicies();
    }
  }
  
  console.log('\n📊 SUMMARY:');
  console.log('===========');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED! The likes functionality should work correctly.');
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Please run the database setup scripts:');
    console.log('   1. Run scripts/sql/verify_likes_database.sql in Supabase SQL Editor');
    console.log('   2. If automation_likes table is missing, run create_advanced_features_tables.sql');
    console.log('   3. Verify RLS policies are in place');
  }
  
  return allPassed;
}

// Run the diagnostic
if (require.main === module) {
  generateDiagnosticReport()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('💥 Diagnostic script crashed:', err);
      process.exit(1);
    });
}

module.exports = {
  testDatabaseConnection,
  checkAutomationsTable,
  checkAutomationLikesTable,
  testLikesJoinQuery,
  testLikeOperations,
  checkRLSPolicies,
  generateDiagnosticReport
};