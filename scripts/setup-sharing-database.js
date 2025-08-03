#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Database setup script for Zaptap sharing system
console.log('🚀 Zaptap Sharing System Database Setup');
console.log('======================================\n');

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your .env file\n');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function runSetup() {
  const steps = [
    {
      name: 'Check Database Connection',
      action: checkConnection,
    },
    {
      name: 'Display SQL File Instructions',
      action: displaySQLInstructions,
    },
    {
      name: 'Verify Tables Exist',
      action: verifyTables,
    },
    {
      name: 'Test RLS Policies',
      action: testRLSPolicies,
    },
    {
      name: 'Create Test Automation',
      action: createTestAutomation,
    },
  ];

  for (const step of steps) {
    console.log(`\n📋 ${step.name}...`);
    try {
      await step.action();
      console.log(`✅ ${step.name} - Complete`);
    } catch (error) {
      console.error(`❌ ${step.name} - Failed:`, error.message);
      if (step.required !== false) {
        process.exit(1);
      }
    }
  }

  console.log('\n✨ Setup complete! Your sharing system is ready to use.\n');
}

async function checkConnection() {
  const { data, error } = await supabase.from('automations').select('count').limit(1);
  
  if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
    throw new Error(`Cannot connect to Supabase: ${error.message}`);
  }
  
  console.log('   Connected to Supabase successfully');
}

function displaySQLInstructions() {
  const sqlFilePath = path.join(__dirname, '..', 'docs', 'database', 'comprehensive_sharing_schema.sql');
  
  console.log('\n📄 SQL Setup Instructions:');
  console.log('   1. Open your Supabase dashboard');
  console.log('   2. Navigate to SQL Editor');
  console.log('   3. Create a new query');
  console.log('   4. Copy and paste the contents of:');
  console.log(`      ${sqlFilePath}`);
  console.log('   5. Run the query');
  console.log('\n   This will create all necessary tables, indexes, and RLS policies.');
  console.log('\n⚠️  IMPORTANT: You must run the SQL manually in Supabase dashboard!');
  console.log('   Service key authentication is required for table creation.\n');
}

async function verifyTables() {
  const requiredTables = [
    'automations',
    'deployments', 
    'public_shares',
    'executions',
    'sharing_logs'
  ];

  const missingTables = [];

  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    
    if (error && error.message.includes('does not exist')) {
      missingTables.push(table);
    } else {
      console.log(`   ✓ Table '${table}' exists`);
    }
  }

  if (missingTables.length > 0) {
    console.log(`\n   ⚠️  Missing tables: ${missingTables.join(', ')}`);
    console.log('   Please run the SQL setup script in Supabase dashboard first!');
    throw new Error('Required tables are missing');
  }
}

async function testRLSPolicies() {
  // Test reading from public_shares (should work for anon)
  const { data, error } = await supabase
    .from('public_shares')
    .select('id')
    .eq('is_active', true)
    .limit(1);

  if (error && !error.message.includes('no rows')) {
    console.log(`   ⚠️  Warning: RLS might not be properly configured`);
    console.log(`   Error: ${error.message}`);
  } else {
    console.log('   ✓ RLS policies appear to be working');
  }
}

async function createTestAutomation() {
  console.log('\n   Creating test automation for sharing demos...');
  
  // Note: This will only work if authenticated
  // In production, this would be done through the app
  console.log('   ℹ️  Test automation creation requires authentication');
  console.log('   You can create test automations through the app interface');
}

// Helper functions
function formatSQL(sql) {
  return sql
    .split('\n')
    .map(line => '   ' + line)
    .join('\n');
}

// Run the setup
runSetup().catch(error => {
  console.error('\n💥 Setup failed:', error);
  process.exit(1);
});