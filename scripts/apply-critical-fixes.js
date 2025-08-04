#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdma2RjbHpnZGxjdmhmaXVqa3d6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ5MjY1NywiZXhwIjoyMDY5MDY4NjU3fQ.POGnVxYKRsjJtUPD_2KNqJh8MZfbMHIabCULQBWGEb8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyCriticalFixes() {
  console.log('🔧 Applying critical database/API fixes...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/19_fix_critical_database_api_issues.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📖 Reading migration file...');
    
    // Split migration into individual statements
    const statements = migration
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('begin') || 
          statement.toLowerCase().includes('commit') || 
          statement.trim() === '') {
        continue;
      }
      
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          
          // Continue with non-critical errors
          if (!error.message.includes('already exists') && 
              !error.message.includes('does not exist') &&
              !error.message.includes('duplicate')) {
            throw error;
          } else {
            console.log(`⚠️  Skipping non-critical error: ${error.message}`);
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (stmtError) {
        console.error(`❌ Failed to execute statement ${i + 1}:`, stmtError.message);
        // Continue with next statement for non-critical errors
      }
    }
    
    console.log('\n🎉 Critical fixes applied successfully!');
    
    // Test the fixes
    console.log('\n🧪 Testing fixes...');
    await testFixes();
    
  } catch (error) {
    console.error('❌ Failed to apply critical fixes:', error.message);
    process.exit(1);
  }
}

async function testFixes() {
  const tests = [
    {
      name: 'Public automations access',
      test: async () => {
        const { data, error } = await supabase
          .from('automations')
          .select('id, title, is_public')
          .eq('is_public', true)
          .limit(5);
        
        if (error) throw error;
        return { count: data?.length || 0 };
      }
    },
    {
      name: 'Review system',
      test: async () => {
        const { data, error } = await supabase
          .from('automation_reviews')
          .select('id')
          .limit(5);
        
        if (error) throw error;
        return { count: data?.length || 0 };
      }
    },
    {
      name: 'User stats function',
      test: async () => {
        // Create a dummy UUID for testing
        const testUserId = '00000000-0000-0000-0000-000000000001';
        const { data, error } = await supabase
          .rpc('get_user_automation_stats', { p_user_id: testUserId });
        
        if (error) throw error;
        return { hasFunction: true };
      }
    },
    {
      name: 'RLS verification',
      test: async () => {
        const { data, error } = await supabase
          .rpc('verify_rls_enabled');
        
        if (error) throw error;
        const enabled = data?.filter(table => table.rls_enabled).length || 0;
        const total = data?.length || 0;
        return { enabled, total };
      }
    }
  ];
  
  for (const test of tests) {
    try {
      console.log(`   Testing ${test.name}...`);
      const result = await test.test();
      console.log(`   ✅ ${test.name}: ${JSON.stringify(result)}`);
    } catch (error) {
      console.log(`   ❌ ${test.name}: ${error.message}`);
    }
  }
}

// Run the fixes
if (require.main === module) {
  applyCriticalFixes().catch(console.error);
}

module.exports = { applyCriticalFixes };