#!/usr/bin/env node

/**
 * Fix Sharing Database Script
 * This script applies all necessary database fixes to enable the sharing system
 * Run this with your Supabase service key to fix database errors
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔧 Zaptap Sharing System Database Fix Script');
console.log('===========================================\n');

// Check for required environment variables
if (!process.env.SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL environment variable!');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_KEY environment variable!');
  console.error('⚠️  This script requires a service key to create tables and policies.');
  console.error('\nTo get your service key:');
  console.error('1. Go to your Supabase project dashboard');
  console.error('2. Navigate to Settings > API');
  console.error('3. Copy the "service_role" key (NOT the anon key)');
  console.error('4. Add it to your .env file as SUPABASE_SERVICE_KEY=your_key_here\n');
  process.exit(1);
}

// Initialize Supabase client with service key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

async function executeSQL(sql, description) {
  try {
    console.log(`\n📋 ${description}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct execution if RPC doesn't exist
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sql_query: sql })
      });
      
      if (!response.ok) {
        throw new Error(`SQL execution failed: ${description}`);
      }
    }
    
    console.log(`✅ ${description} - Complete`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} - Failed:`, error.message);
    return false;
  }
}

async function runFixes() {
  console.log('🔍 Starting database fixes...\n');

  // Step 1: Create public_shares table if it doesn't exist
  const createPublicSharesSQL = `
    CREATE TABLE IF NOT EXISTS public.public_shares (
      id VARCHAR(255) PRIMARY KEY,
      automation_id UUID NOT NULL,
      automation_data JSONB NOT NULL,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      access_count INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      share_type VARCHAR(50) DEFAULT 'link' CHECK (share_type IN ('link', 'qr', 'nfc', 'emergency')),
      metadata JSONB DEFAULT '{}'
    );
  `;
  
  await executeSQL(createPublicSharesSQL, 'Creating public_shares table');

  // Step 2: Add foreign key constraint if missing
  const addForeignKeySQL = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'public_shares_automation_id_fkey'
      ) THEN
        ALTER TABLE public.public_shares 
        ADD CONSTRAINT public_shares_automation_id_fkey 
        FOREIGN KEY (automation_id) REFERENCES automations(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `;
  
  await executeSQL(addForeignKeySQL, 'Adding foreign key constraint');

  // Step 3: Create indexes
  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public_shares(automation_id);
    CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public_shares(created_by);
    CREATE INDEX IF NOT EXISTS idx_public_shares_is_active ON public_shares(is_active);
    CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public_shares(expires_at);
    CREATE INDEX IF NOT EXISTS idx_public_shares_share_type ON public_shares(share_type);
  `;
  
  await executeSQL(createIndexesSQL, 'Creating indexes on public_shares');

  // Step 4: Enable Row Level Security
  const enableRLSSQL = `
    ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;
  `;
  
  await executeSQL(enableRLSSQL, 'Enabling Row Level Security');

  // Step 5: Create RLS Policies
  const createPoliciesSQL = `
    -- Drop existing policies first
    DROP POLICY IF EXISTS "Public shares are readable by anyone" ON public_shares;
    DROP POLICY IF EXISTS "Users can create public shares" ON public_shares;
    DROP POLICY IF EXISTS "Users can update their own shares" ON public_shares;
    DROP POLICY IF EXISTS "Users can delete their own shares" ON public_shares;

    -- Create new policies
    CREATE POLICY "Public shares are readable by anyone" ON public_shares
      FOR SELECT USING (is_active = true AND expires_at > NOW());

    CREATE POLICY "Users can create public shares" ON public_shares
      FOR INSERT WITH CHECK (auth.uid() = created_by);

    CREATE POLICY "Users can update their own shares" ON public_shares
      FOR UPDATE USING (auth.uid() = created_by);

    CREATE POLICY "Users can delete their own shares" ON public_shares
      FOR DELETE USING (auth.uid() = created_by);
  `;
  
  await executeSQL(createPoliciesSQL, 'Creating RLS policies');

  // Step 6: Grant permissions
  const grantPermissionsSQL = `
    GRANT SELECT ON public_shares TO anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public_shares TO authenticated;
  `;
  
  await executeSQL(grantPermissionsSQL, 'Granting permissions');

  // Step 7: Create helper function for incrementing access count
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION increment_share_access_count(p_share_id VARCHAR)
    RETURNS void AS $$
    BEGIN
      UPDATE public_shares 
      SET access_count = access_count + 1
      WHERE id = p_share_id AND is_active = true AND expires_at > NOW();
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION increment_share_access_count TO anon, authenticated;
  `;
  
  await executeSQL(createFunctionSQL, 'Creating helper functions');

  // Step 8: Create sharing_logs table if missing
  const createSharingLogsSQL = `
    CREATE TABLE IF NOT EXISTS public.sharing_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
      method VARCHAR(50) NOT NULL CHECK (method IN ('link', 'qr', 'nfc', 'email', 'sms', 'social')),
      recipients TEXT[],
      shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      shared_by UUID REFERENCES auth.users(id),
      share_data JSONB DEFAULT '{}'
    );
    
    CREATE INDEX IF NOT EXISTS idx_sharing_logs_automation_id ON sharing_logs(automation_id);
    CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_by ON sharing_logs(shared_by);
    CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_at ON sharing_logs(shared_at DESC);
    
    ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view their own sharing logs" ON sharing_logs;
    DROP POLICY IF EXISTS "Users can create sharing logs" ON sharing_logs;
    
    CREATE POLICY "Users can view their own sharing logs" ON sharing_logs
      FOR SELECT USING (auth.uid() = shared_by);
    
    CREATE POLICY "Users can create sharing logs" ON sharing_logs
      FOR INSERT WITH CHECK (auth.uid() = shared_by);
    
    GRANT SELECT, INSERT ON sharing_logs TO authenticated;
  `;
  
  await executeSQL(createSharingLogsSQL, 'Creating sharing_logs table');

  // Step 9: Verify tables exist
  console.log('\n🔍 Verifying database structure...');
  
  const tables = ['public_shares', 'sharing_logs'];
  let allTablesExist = true;
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('count(*)', { count: 'exact', head: true });
    
    if (error && error.message.includes('does not exist')) {
      console.error(`❌ Table '${table}' still doesn't exist`);
      allTablesExist = false;
    } else {
      console.log(`✅ Table '${table}' exists and is accessible`);
    }
  }
  
  if (!allTablesExist) {
    console.error('\n❌ Some tables could not be created.');
    console.error('Please run the SQL commands manually in Supabase SQL Editor.\n');
    return false;
  }
  
  return true;
}

// Alternative approach: Generate SQL file for manual execution
async function generateSQLFile() {
  console.log('\n📄 Generating SQL file for manual execution...');
  
  const sqlContent = `-- Zaptap Sharing System Database Fix
-- Run this script in Supabase SQL Editor to fix sharing system issues

-- Create public_shares table
CREATE TABLE IF NOT EXISTS public.public_shares (
  id VARCHAR(255) PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  automation_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  share_type VARCHAR(50) DEFAULT 'link' CHECK (share_type IN ('link', 'qr', 'nfc', 'emergency')),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public_shares(automation_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public_shares(created_by);
CREATE INDEX IF NOT EXISTS idx_public_shares_is_active ON public_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_shares_share_type ON public_shares(share_type);

-- Enable RLS
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
DROP POLICY IF EXISTS "Public shares are readable by anyone" ON public_shares;
DROP POLICY IF EXISTS "Users can create public shares" ON public_shares;
DROP POLICY IF EXISTS "Users can update their own shares" ON public_shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON public_shares;

CREATE POLICY "Public shares are readable by anyone" ON public_shares
  FOR SELECT USING (is_active = true AND expires_at > NOW());

CREATE POLICY "Users can create public shares" ON public_shares
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own shares" ON public_shares
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own shares" ON public_shares
  FOR DELETE USING (auth.uid() = created_by);

-- Grant permissions
GRANT SELECT ON public_shares TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public_shares TO authenticated;

-- Create helper function
CREATE OR REPLACE FUNCTION increment_share_access_count(p_share_id VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE public_shares 
  SET access_count = access_count + 1
  WHERE id = p_share_id AND is_active = true AND expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_share_access_count TO anon, authenticated;

-- Create sharing_logs table
CREATE TABLE IF NOT EXISTS public.sharing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  method VARCHAR(50) NOT NULL CHECK (method IN ('link', 'qr', 'nfc', 'email', 'sms', 'social')),
  recipients TEXT[],
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shared_by UUID REFERENCES auth.users(id),
  share_data JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sharing_logs_automation_id ON sharing_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_by ON sharing_logs(shared_by);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_at ON sharing_logs(shared_at DESC);

ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sharing logs" ON sharing_logs;
DROP POLICY IF EXISTS "Users can create sharing logs" ON sharing_logs;

CREATE POLICY "Users can view their own sharing logs" ON sharing_logs
  FOR SELECT USING (auth.uid() = shared_by);

CREATE POLICY "Users can create sharing logs" ON sharing_logs
  FOR INSERT WITH CHECK (auth.uid() = shared_by);

GRANT SELECT, INSERT ON sharing_logs TO authenticated;

-- Verify tables
SELECT 'public_shares' as table_name, COUNT(*) as row_count FROM public_shares
UNION ALL
SELECT 'sharing_logs' as table_name, COUNT(*) as row_count FROM sharing_logs;
`;

  const outputPath = path.join(__dirname, '..', 'fix-sharing-database.sql');
  fs.writeFileSync(outputPath, sqlContent);
  
  console.log(`✅ SQL file generated: ${outputPath}`);
  console.log('\n📌 Next steps:');
  console.log('1. Open your Supabase dashboard');
  console.log('2. Go to SQL Editor');
  console.log('3. Create a new query');
  console.log('4. Copy and paste the contents of fix-sharing-database.sql');
  console.log('5. Run the query');
  
  return outputPath;
}

// Main execution
async function main() {
  try {
    // Try to run fixes automatically
    const success = await runFixes();
    
    if (!success) {
      // Generate SQL file as fallback
      await generateSQLFile();
    } else {
      console.log('\n✨ Database fixes applied successfully!');
      console.log('Your sharing system should now work correctly.\n');
    }
    
  } catch (error) {
    console.error('\n💥 An unexpected error occurred:', error);
    
    // Generate SQL file as fallback
    await generateSQLFile();
  }
}

// Run the script
main();