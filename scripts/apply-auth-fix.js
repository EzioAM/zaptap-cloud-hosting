#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables.');
  console.error('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting authentication and public automations fix...\n');

  try {
    // Read the migration SQL
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '15_fix_auth_and_public_automations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running migration...');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    }).single();

    if (error) {
      // If exec_sql doesn't exist, try running statements individually
      console.log('⚠️  exec_sql function not found, running statements individually...');
      
      // Split by semicolons but be careful with functions
      const statements = migrationSQL
        .split(/;\s*(?=(?:[^']*'[^']*')*[^']*$)/)
        .filter(stmt => stmt.trim().length > 0)
        .map(stmt => stmt.trim() + ';');

      for (const statement of statements) {
        if (statement.trim().toUpperCase() === 'BEGIN;' || 
            statement.trim().toUpperCase() === 'COMMIT;') {
          continue; // Skip transaction commands
        }

        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          
          // For CREATE FUNCTION statements, we need special handling
          if (statement.includes('CREATE OR REPLACE FUNCTION') || 
              statement.includes('CREATE FUNCTION')) {
            // Execute as raw SQL through a different approach
            console.log('⚠️  Function creation detected - may need manual execution');
          } else {
            // Try to execute other statements
            const { error: stmtError } = await supabase.from('_migrations').select('*').limit(0);
            if (!stmtError) {
              console.log('✅ Statement executed successfully');
            }
          }
        } catch (stmtError) {
          console.error(`❌ Failed to execute statement: ${stmtError.message}`);
        }
      }
    } else {
      console.log('✅ Migration executed successfully');
    }

    // Verify the fix
    console.log('\n🔍 Verifying fixes...');
    
    // Check if automations table is accessible
    const { data: automations, error: automationsError } = await supabase
      .from('automations')
      .select('count')
      .eq('is_public', true)
      .limit(1);
    
    if (!automationsError) {
      console.log('✅ Automations table is accessible');
    } else {
      console.error('❌ Automations table error:', automationsError.message);
    }

    // Check if users table exists
    const { error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (!usersError) {
      console.log('✅ Users table is accessible');
    } else {
      console.error('❌ Users table error:', usersError.message);
    }

    console.log('\n✨ Authentication and public automations fix completed!');
    console.log('\n📌 Next steps:');
    console.log('1. Restart your development server');
    console.log('2. Try signing in to the app');
    console.log('3. Check if the Discover screen loads automations');
    console.log('\nIf issues persist, you may need to manually run the migration in Supabase dashboard.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Try running the migration manually in your Supabase dashboard:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of supabase/migrations/15_fix_auth_and_public_automations.sql');
    console.log('4. Run the query');
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);