const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY not found in environment variables');
  console.log('For full fixes, set SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const isServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ? true : false;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 Fixing App Linking Setup (Safe Mode)...');
console.log(`📌 Using ${isServiceRole ? 'Service Role' : 'Anon'} Key\n`);

// Check if a table exists
async function tableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // If no error or error is about empty table, table exists
    return !error || error.code === 'PGRST116';
  } catch (err) {
    return false;
  }
}

// Add SQL to migration array instead of executing
const migrationSteps = [];

function addMigrationStep(sql, description) {
  console.log(`\n📝 ${description}...`);
  migrationSteps.push({ sql, description });
  console.log('✅ Added to migration');
  return true;
}

async function createPublicSharesTable() {
  // Check if table already exists
  const exists = await tableExists('public_shares');
  if (exists) {
    console.log('\n✅ public_shares table already exists');
    return true;
  }
  
  const sql = `
-- Create public_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.public_shares (
    id text PRIMARY KEY,
    automation_id uuid NOT NULL,
    automation_data jsonb NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    access_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_accessed_at timestamp with time zone,
    metadata jsonb DEFAULT '{}' NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public.public_shares(automation_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public.public_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_shares_is_active ON public.public_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public.public_shares(created_by);

-- Add comments
COMMENT ON TABLE public.public_shares IS 'Stores publicly shareable links for automations';
COMMENT ON COLUMN public.public_shares.id IS 'Unique short ID for the share URL';
COMMENT ON COLUMN public.public_shares.automation_data IS 'Full automation data snapshot at share time';
COMMENT ON COLUMN public.public_shares.access_count IS 'Number of times this share has been accessed';
`;

  return addMigrationStep(sql, 'Creating public_shares table');
}

async function createSharingLogsTable() {
  // Check if table already exists
  const exists = await tableExists('sharing_logs');
  if (exists) {
    console.log('\n✅ sharing_logs table already exists');
    return true;
  }
  
  const sql = `
-- Create sharing_logs table for analytics
CREATE TABLE IF NOT EXISTS public.sharing_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id uuid NOT NULL,
    share_id text REFERENCES public.public_shares(id) ON DELETE CASCADE,
    method text NOT NULL CHECK (method IN ('link', 'email', 'sms', 'qr', 'nfc')),
    recipients text[] DEFAULT '{}',
    shared_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    shared_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}' NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sharing_logs_automation_id ON public.sharing_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_share_id ON public.sharing_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_by ON public.sharing_logs(shared_by);
CREATE INDEX IF NOT EXISTS idx_sharing_logs_shared_at ON public.sharing_logs(shared_at DESC);
`;

  return addMigrationStep(sql, 'Creating sharing_logs table');
}

async function enableRLS() {
  const sql = `
-- Enable RLS on tables
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public shares are viewable by anyone" ON public.public_shares;
DROP POLICY IF EXISTS "Users can create their own public shares" ON public.public_shares;
DROP POLICY IF EXISTS "Users can update their own public shares" ON public.public_shares;
DROP POLICY IF EXISTS "Users can delete their own public shares" ON public.public_shares;
DROP POLICY IF EXISTS "Anyone can increment access count" ON public.public_shares;
DROP POLICY IF EXISTS "Service role can manage all shares" ON public.public_shares;

-- Create RLS policies for public_shares
CREATE POLICY "Public shares are viewable by anyone"
    ON public.public_shares FOR SELECT
    USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can create their own public shares"
    ON public.public_shares FOR INSERT
    WITH CHECK (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can update their own public shares"
    ON public.public_shares FOR UPDATE
    USING (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can delete their own public shares"
    ON public.public_shares FOR DELETE
    USING (auth.uid() = created_by OR auth.jwt() ->> 'role' = 'service_role');

-- Special policy to allow anonymous users to increment access count
CREATE POLICY "Anyone can increment access count"
    ON public.public_shares FOR UPDATE
    USING (is_active = true AND expires_at > now())
    WITH CHECK (
        -- Only allow updating access_count and last_accessed_at
        (access_count = (OLD.access_count + 1)) AND
        (last_accessed_at = now()) AND
        -- Ensure other fields remain unchanged
        (id = OLD.id) AND
        (automation_id = OLD.automation_id) AND
        (automation_data = OLD.automation_data) AND
        (created_by IS NOT DISTINCT FROM OLD.created_by) AND
        (created_at = OLD.created_at) AND
        (expires_at = OLD.expires_at) AND
        (is_active = OLD.is_active) AND
        (metadata = OLD.metadata)
    );

-- Service role bypass for testing
CREATE POLICY "Service role can manage all shares"
    ON public.public_shares FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Drop existing policies for sharing_logs if they exist
DROP POLICY IF EXISTS "Users can view their own sharing logs" ON public.sharing_logs;
DROP POLICY IF EXISTS "Users can create sharing logs" ON public.sharing_logs;

-- Create RLS policies for sharing_logs
CREATE POLICY "Users can view their own sharing logs"
    ON public.sharing_logs FOR SELECT
    USING (auth.uid() = shared_by OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Users can create sharing logs"
    ON public.sharing_logs FOR INSERT
    WITH CHECK (auth.uid() = shared_by OR auth.jwt() ->> 'role' = 'service_role');
`;

  return addMigrationStep(sql, 'Setting up RLS policies');
}

async function createHelperFunctions() {
  const sql = `
-- Function to get public share data (works for anonymous users)
CREATE OR REPLACE FUNCTION public.get_public_share(share_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    share_data jsonb;
BEGIN
    -- Get share data and increment access count
    UPDATE public.public_shares
    SET 
        access_count = access_count + 1,
        last_accessed_at = now()
    WHERE 
        id = share_id AND
        is_active = true AND
        expires_at > now()
    RETURNING jsonb_build_object(
        'id', id,
        'automation_id', automation_id,
        'automation_data', automation_data,
        'created_at', created_at,
        'expires_at', expires_at,
        'access_count', access_count
    ) INTO share_data;
    
    RETURN share_data;
END;
$$;

-- Function to clean up expired shares
CREATE OR REPLACE FUNCTION public.cleanup_expired_shares()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.public_shares
    WHERE expires_at < now() - INTERVAL '7 days'
    RETURNING COUNT(*) INTO deleted_count;
    
    RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_public_share(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_shares() TO authenticated;
`;

  return addMigrationStep(sql, 'Creating helper functions');
}

async function createTestData() {
  console.log('\n🧪 Attempting to create test share link...');
  
  // Check if public_shares table exists
  const sharesExists = await tableExists('public_shares');
  if (!sharesExists) {
    console.log('❌ public_shares table does not exist yet');
    console.log('   Please run the migration SQL first');
    return false;
  }
  
  try {
    // Create a test automation
    const testAutomation = {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'Test Welcome Automation',
      description: 'A test automation for verifying share links work',
      steps: [
        {
          id: 'step1',
          type: 'notification',
          title: 'Welcome Message',
          enabled: true,
          config: {
            title: 'Welcome!',
            message: 'Share links are working correctly!'
          }
        }
      ],
      triggers: [],
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: true,
      category: 'test',
      tags: ['test', 'share']
    };
    
    const shareId = 'test' + Math.random().toString(36).substring(2, 9);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
    
    const shareData = {
      id: shareId,
      automation_id: testAutomation.id,
      automation_data: testAutomation,
      expires_at: expiresAt.toISOString(),
      access_count: 0,
      is_active: true,
      metadata: { test: true }
    };
    
    // Add created_by if not using service role
    if (!isServiceRole) {
      console.log('⚠️  Not using service role, test data creation may fail due to RLS');
      shareData.created_by = null; // This will likely fail with anon key
    }
    
    const { data, error } = await supabase
      .from('public_shares')
      .insert(shareData)
      .select()
      .single();
    
    if (error) {
      console.log('❌ Could not create test share:', error.message);
      if (error.message.includes('row-level security')) {
        console.log('\n💡 To create test data, use SUPABASE_SERVICE_ROLE_KEY in .env');
        console.log('   Or manually insert test data in Supabase dashboard');
      }
      return false;
    }
    
    console.log('✅ Test share created successfully!');
    console.log('\n📱 Test these share links:');
    console.log(`\nDeep Link (for app):`);
    console.log(`  zaptap://share/${data.id}`);
    console.log(`\nWeb Links (for browser):`);
    console.log(`  https://www.zaptap.cloud/share/${data.id}`);
    console.log(`  https://zaptap.cloud/share/${data.id}`);
    console.log(`  https://www.zaptap.cloud/s/${data.id}`);
    console.log(`\nShare ID: ${data.id}`);
    console.log('\n💡 Tip: Copy one of these links and test it in your app!');
    
    return true;
  } catch (err) {
    console.log('❌ Error creating test data:', err.message);
    return false;
  }
}

async function generateMigrationFile() {
  // Build migration SQL from collected steps
  let migrationSql = `-- App Linking Fix Migration (Safe Mode)
-- Generated on ${new Date().toISOString()}
-- Run this in Supabase SQL Editor

BEGIN;

`;
  
  // Add all collected migration steps
  migrationSteps.forEach((step, index) => {
    migrationSql += `-- Step ${index + 1}: ${step.description}\n`;
    migrationSql += step.sql;
    migrationSql += '\n\n';
  });
  
  // Add test data insertion
  migrationSql += `-- Test Data: Create a test share
INSERT INTO public.public_shares (
    id,
    automation_id,
    automation_data,
    expires_at,
    access_count,
    is_active,
    metadata
) VALUES (
    'testshare' || substr(md5(random()::text), 1, 7),
    '11111111-1111-1111-1111-111111111111',
    '{
        "id": "11111111-1111-1111-1111-111111111111",
        "title": "Test Welcome Automation",
        "description": "A test automation for verifying share links work",
        "steps": [{
            "id": "step1",
            "type": "notification",
            "title": "Welcome Message",
            "enabled": true,
            "config": {
                "title": "Welcome!",
                "message": "Share links are working correctly!"
            }
        }],
        "triggers": [],
        "is_public": true,
        "category": "test",
        "tags": ["test", "share"]
    }'::jsonb,
    now() + INTERVAL '30 days',
    0,
    true,
    '{"test": true}'::jsonb
) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- After running this migration:
-- 1. Check that tables were created: SELECT * FROM public_shares LIMIT 1;
-- 2. Test share links in your app
-- 3. Run the RPC functions migration if needed
`;

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '11_fix_app_linking_safe.sql');
  
  try {
    fs.writeFileSync(migrationPath, migrationSql);
    console.log(`\n✅ Migration file created: ${migrationPath}`);
    console.log('\n📝 Migration includes:');
    migrationSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step.description}`);
    });
  } catch (err) {
    console.log('\n❌ Could not save migration file:', err.message);
    console.log('\n📋 Manual Migration SQL (copy and run in Supabase SQL Editor):');
    console.log(migrationSql);
  }
}

async function runFixes() {
  console.log('🚀 Starting App Linking Fixes (Safe Mode)...\n');
  
  // Check existing tables
  console.log('📋 Checking existing tables...');
  const publicSharesExists = await tableExists('public_shares');
  const sharingLogsExists = await tableExists('sharing_logs');
  
  console.log(`\n${publicSharesExists ? '✅' : '❌'} public_shares table ${publicSharesExists ? 'exists' : 'missing'}`);
  console.log(`${sharingLogsExists ? '✅' : '❌'} sharing_logs table ${sharingLogsExists ? 'exists' : 'missing'}`);
  
  // Build migration steps
  const steps = [
    { name: 'Create public_shares table', fn: createPublicSharesTable, skip: publicSharesExists },
    { name: 'Create sharing_logs table', fn: createSharingLogsTable, skip: sharingLogsExists },
    { name: 'Enable RLS and create policies', fn: enableRLS, skip: false },
    { name: 'Create helper functions', fn: createHelperFunctions, skip: false }
  ];
  
  let addedSteps = 0;
  
  for (const step of steps) {
    if (step.skip) {
      console.log(`\n⏭️  Skipping: ${step.name} (already exists)`);
    } else {
      console.log(`\n📍 Step: ${step.name}`);
      const success = await step.fn();
      if (success) addedSteps++;
    }
  }
  
  // Always generate migration file
  await generateMigrationFile();
  
  console.log('\n\n📊 Migration Summary:');
  console.log(`✅ ${addedSteps} migration steps prepared`);
  
  if (migrationSteps.length > 0) {
    console.log('\n⚠️  Cannot execute SQL directly without RPC functions');
    console.log('\n📝 Next steps:');
    console.log('1. Run the generated migration SQL in Supabase SQL Editor');
    console.log('2. Run the missing RPC functions migration (12_create_missing_rpc_functions.sql)');
    console.log('3. Re-run this script to create test data');
  } else {
    console.log('\n✅ All tables already exist!');
    
    // Try to create test data
    console.log('\n📍 Step: Create test data');
    const testSuccess = await createTestData();
    
    if (testSuccess) {
      console.log('\n🎉 Setup complete! Test the share links in your app.');
    } else {
      console.log('\n💡 To create test data:');
      console.log('1. Add SUPABASE_SERVICE_ROLE_KEY to .env');
      console.log('2. Re-run: npm run fix:linking');
    }
  }
}

// Run all fixes
runFixes().catch(error => {
  console.error('\n❌ Fix script failed:', error.message);
  process.exit(1);
});