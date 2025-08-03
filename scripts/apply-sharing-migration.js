#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🚀 Starting Zaptap Sharing System Migration...\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'sharing_schema_migrations_fixed.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Loaded migration script');
    console.log('🔄 Executing migration...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution through the REST API
      console.log('ℹ️  exec_sql not available, using direct API...\n');
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .filter(stmt => stmt.trim())
        .map(stmt => stmt.trim() + ';');

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        // Skip comments and empty statements
        if (statement.startsWith('--') || statement.length < 5) continue;

        try {
          // Use fetch to directly call Supabase's REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
            method: 'POST',
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ query: statement })
          });

          if (response.ok) {
            successCount++;
          } else {
            const errorText = await response.text();
            console.error(`❌ Error executing statement: ${errorText}`);
            errorCount++;
          }
        } catch (err) {
          console.error(`❌ Error: ${err.message}`);
          errorCount++;
        }
      }

      console.log(`\n✅ Executed ${successCount} statements successfully`);
      if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} statements failed`);
      }
    } else {
      console.log('✅ Migration executed successfully!');
    }

    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    await verifyMigration();

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

async function verifyMigration() {
  try {
    // Check if tables exist
    const tables = ['automations', 'deployments', 'public_shares', 'executions', 'sharing_logs'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.log(`❌ Table ${table} check failed:`, error.message);
      } else {
        console.log(`✅ Table ${table} exists`);
      }
    }

    // Check specific columns in automations table
    const { data: automationSample, error: automationError } = await supabase
      .from('automations')
      .select('id, access_type, share_settings, execution_count')
      .limit(1);

    if (!automationError || automationError.code === 'PGRST116') {
      console.log('✅ Automations table has required columns');
    } else {
      console.log('⚠️  Some automation columns might be missing');
    }

    console.log('\n🎉 Migration verification complete!');
    console.log('\nNext steps:');
    console.log('1. Test sharing features in your app');
    console.log('2. Try creating a public share link');
    console.log('3. Test NFC/QR deployment features');

  } catch (err) {
    console.error('❌ Verification failed:', err.message);
  }
}

// Alternative approach using direct SQL execution
async function runMigrationDirect() {
  console.log('🚀 Attempting direct SQL migration...\n');

  const migrationPath = path.join(__dirname, '..', 'sharing_schema_migrations_fixed.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📋 Migration script loaded');
  console.log('ℹ️  Please run the following SQL directly in your Supabase SQL Editor:\n');
  console.log('1. Go to your Supabase project dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Create a new query');
  console.log('4. Copy and paste the contents of sharing_schema_migrations_fixed.sql');
  console.log('5. Click "Run" to execute the migration\n');
  
  console.log('The migration script has been saved to:');
  console.log(migrationPath);
}

// Check if we can connect to Supabase
async function checkConnection() {
  try {
    const { data, error } = await supabase
      .from('automations')
      .select('count')
      .limit(1);
    
    return !error || error.code === 'PGRST116'; // No error or just "no rows"
  } catch {
    return false;
  }
}

// Main execution
async function main() {
  const isConnected = await checkConnection();
  
  if (!isConnected) {
    console.error('❌ Could not connect to Supabase');
    console.log('\nPlease check your .env file has:');
    console.log('- SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY\n');
    
    runMigrationDirect();
  } else {
    await runMigration();
  }
}

// Run the migration
main().catch(console.error);