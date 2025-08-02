#!/usr/bin/env node

/**
 * Database Connection and Table Communication Test
 * Tests Supabase database connectivity and table accessibility
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0OTI2NTcsImV4cCI6MjA2OTA2ODY1N30.lJpGLp14e_9ku8n3WN8i61jYPohfx7htTEmTrnje-uE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expected table schemas
const expectedTables = {
  'automations': {
    columns: ['id', 'title', 'description', 'steps', 'created_by', 'created_at', 'updated_at', 'is_public', 'category', 'tags'],
    description: 'Main automations table storing workflow definitions'
  },
  'profiles': {
    columns: ['id', 'email', 'display_name', 'avatar_url', 'created_at', 'updated_at'],
    description: 'User profiles linked to auth.users'
  },
  'categories': {
    columns: ['id', 'name', 'description', 'icon', 'color'],
    description: 'Automation categories for organization'
  },
  'executions': {
    columns: ['id', 'automation_id', 'executed_by', 'execution_result', 'executed_at'],
    description: 'Automation execution history and results'
  },
  'deployments': {
    columns: ['id', 'automation_id', 'deployment_type', 'deployment_data', 'created_at'],
    description: 'NFC/QR deployment tracking'
  }
};

// Test functions
async function testConnection() {
  console.log('🔍 Testing Supabase connection...');
  try {
    const { data, error } = await supabase
      .from('automations')
      .select('count')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('✅ Connection established (table may be empty)');
        return true;
      }
      throw error;
    }

    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.log('❌ Supabase connection failed:', error.message);
    return false;
  }
}

async function testTableAccess(tableName, schema) {
  console.log(`\n📊 Testing table: ${tableName}`);
  console.log(`   Description: ${schema.description}`);
  
  try {
    // Test basic read access
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`   ✅ Table accessible (empty or no matching records)`);
        return { accessible: true, recordCount: 0, sampleData: [] };
      }
      throw error;
    }

    console.log(`   ✅ Table accessible with ${count || data?.length || 0} records`);
    
    if (data && data.length > 0) {
      console.log(`   📝 Sample columns found: ${Object.keys(data[0]).join(', ')}`);
      
      // Check if expected columns exist
      const missingColumns = schema.columns.filter(col => 
        !Object.keys(data[0]).includes(col)
      );
      
      if (missingColumns.length > 0) {
        console.log(`   ⚠️  Missing expected columns: ${missingColumns.join(', ')}`);
      } else {
        console.log(`   ✅ All expected columns present`);
      }
    }

    return { 
      accessible: true, 
      recordCount: count || data?.length || 0, 
      sampleData: data || [],
      columns: data && data.length > 0 ? Object.keys(data[0]) : []
    };

  } catch (error) {
    console.log(`   ❌ Table access failed: ${error.message}`);
    console.log(`   🔍 Error code: ${error.code}`);
    return { accessible: false, error: error.message };
  }
}

async function testRLS() {
  console.log('\n🔒 Testing Row Level Security (RLS)...');
  
  try {
    // Test without authentication (should be limited)
    const { data: publicData, error: publicError } = await supabase
      .from('automations')
      .select('*')
      .eq('is_public', true)
      .limit(3);

    if (publicError && publicError.code !== 'PGRST116') {
      console.log(`   ⚠️  Public access error: ${publicError.message}`);
    } else {
      console.log(`   ✅ Public automations accessible: ${publicData?.length || 0} found`);
    }

    // Test auth.users access (should fail without proper auth)
    const { data: authData, error: authError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (authError) {
      console.log(`   ✅ RLS working - profiles protected: ${authError.message}`);
    } else {
      console.log(`   ⚠️  Profiles accessible without auth (RLS may be disabled)`);
    }

  } catch (error) {
    console.log(`   ❌ RLS test failed: ${error.message}`);
  }
}

async function testCRUDOperations() {
  console.log('\n🛠️  Testing CRUD operations...');
  
  try {
    // Test categories (usually publicly readable)
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .limit(5);

    if (catError) {
      console.log(`   ❌ Read test failed: ${catError.message}`);
    } else {
      console.log(`   ✅ Read operation successful: ${categories.length} categories found`);
      if (categories.length > 0) {
        console.log(`   📋 Sample category: ${categories[0].name || 'Unnamed'}`);
      }
    }

    // Test insert (should fail without auth for protected tables)
    const testAutomation = {
      title: 'Database Test Automation',
      description: 'Testing database connectivity',
      steps: [],
      category: 'Test',
      is_public: false,
      tags: ['test']
    };

    const { data: insertData, error: insertError } = await supabase
      .from('automations')
      .insert(testAutomation)
      .select();

    if (insertError) {
      if (insertError.code === '23503' || insertError.message.includes('auth')) {
        console.log(`   ✅ Insert protection working: ${insertError.message}`);
      } else {
        console.log(`   ⚠️  Unexpected insert error: ${insertError.message}`);
      }
    } else {
      console.log(`   ⚠️  Insert succeeded without auth (may need to clean up)`);
      
      // Clean up test record
      if (insertData && insertData[0]) {
        await supabase
          .from('automations')
          .delete()
          .eq('id', insertData[0].id);
        console.log(`   🧹 Cleaned up test record`);
      }
    }

  } catch (error) {
    console.log(`   ❌ CRUD test failed: ${error.message}`);
  }
}

async function testRealTimeFeatures() {
  console.log('\n📡 Testing Real-time features...');
  
  try {
    // Test if real-time is available
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'automations' },
        (payload) => {
          console.log('   📨 Real-time event received:', payload.eventType);
        }
      );

    const channelResponse = await channel.subscribe();
    
    if (channelResponse === 'SUBSCRIBED') {
      console.log('   ✅ Real-time subscriptions available');
      
      // Unsubscribe to clean up
      setTimeout(() => {
        supabase.removeChannel(channel);
        console.log('   🧹 Real-time subscription cleaned up');
      }, 1000);
      
    } else {
      console.log('   ⚠️  Real-time subscription failed');
    }

  } catch (error) {
    console.log(`   ❌ Real-time test failed: ${error.message}`);
  }
}

async function generateReport(results) {
  console.log('\n📊 DATABASE TEST REPORT');
  console.log('=' .repeat(50));
  
  const accessibleTables = Object.keys(results.tables).filter(
    table => results.tables[table].accessible
  );
  
  const totalRecords = Object.values(results.tables)
    .filter(t => t.accessible)
    .reduce((sum, t) => sum + (t.recordCount || 0), 0);

  console.log(`Database URL: ${supabaseUrl}`);
  console.log(`Connection Status: ${results.connectionOk ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Tables Accessible: ${accessibleTables.length}/${Object.keys(expectedTables).length}`);
  console.log(`Total Records: ${totalRecords}`);
  
  console.log('\nTable Details:');
  Object.keys(expectedTables).forEach(tableName => {
    const result = results.tables[tableName];
    if (result) {
      const status = result.accessible ? '✅' : '❌';
      const count = result.recordCount || 0;
      console.log(`  ${status} ${tableName}: ${count} records`);
      
      if (result.columns && result.columns.length > 0) {
        console.log(`     Columns: ${result.columns.slice(0, 5).join(', ')}${result.columns.length > 5 ? '...' : ''}`);
      }
    }
  });

  console.log('\nRecommendations:');
  if (results.connectionOk) {
    console.log('✅ Database connection is working properly');
  } else {
    console.log('❌ Fix database connection issues first');
  }

  if (accessibleTables.length === Object.keys(expectedTables).length) {
    console.log('✅ All expected tables are accessible');
  } else {
    const missingTables = Object.keys(expectedTables).filter(
      table => !results.tables[table]?.accessible
    );
    console.log(`❌ Missing/inaccessible tables: ${missingTables.join(', ')}`);
  }

  if (totalRecords > 0) {
    console.log('✅ Database contains data and is ready for use');
  } else {
    console.log('⚠️  Database tables are empty - consider adding seed data');
  }
}

// Main test execution
async function runDatabaseTests() {
  console.log('🧪 ZAPTAP DATABASE CONNECTIVITY TEST');
  console.log('=' .repeat(40));
  console.log(`Testing database: ${supabaseUrl}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const results = {
    connectionOk: false,
    tables: {}
  };

  // Test connection
  results.connectionOk = await testConnection();
  
  if (!results.connectionOk) {
    console.log('\n❌ Cannot proceed with table tests - connection failed');
    return;
  }

  // Test each table
  for (const [tableName, schema] of Object.entries(expectedTables)) {
    results.tables[tableName] = await testTableAccess(tableName, schema);
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Test security
  await testRLS();

  // Test CRUD operations
  await testCRUDOperations();

  // Test real-time features
  await testRealTimeFeatures();

  // Generate final report
  await generateReport(results);

  console.log('\n🎯 Test completed!');
  console.log('Check the results above to verify all tables are communicating properly.');
}

// Run the tests
if (require.main === module) {
  runDatabaseTests().catch(console.error);
}

module.exports = { runDatabaseTests, testConnection };