const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY not found in environment variables');
  console.log('\n💡 For best results, use SUPABASE_SERVICE_ROLE_KEY for admin operations');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 Safe Migration Runner\n');

// Utility functions
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

async function checkMissingTables() {
  const requiredTables = [
    'automations',
    'automation_steps', 
    'users',
    'deployments',
    'executions',
    'reviews',
    'public_shares',
    'sharing_logs',
    'categories',
    'tags',
    'automation_tags'
  ];
  
  console.log('📋 Checking for required tables:\n');
  
  const missingTables = [];
  
  for (const table of requiredTables) {
    const exists = await tableExists(table);
    if (exists) {
      console.log(`✅ ${table}`);
    } else {
      console.log(`❌ ${table} - MISSING`);
      missingTables.push(table);
    }
  }
  
  return missingTables;
}

async function generateMigrationSQL(missingTables) {
  let sql = `-- Safe Migration SQL
-- Generated on ${new Date().toISOString()}
-- Missing tables: ${missingTables.join(', ')}

BEGIN;

`;

  // Add CREATE TABLE statements for missing tables
  for (const table of missingTables) {
    sql += generateTableSQL(table);
    sql += '\n\n';
  }
  
  sql += 'COMMIT;\n';
  
  return sql;
}

function generateTableSQL(tableName) {
  switch (tableName) {
    case 'public_shares':
      return `-- Create public_shares table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_public_shares_automation_id ON public.public_shares(automation_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires_at ON public.public_shares(expires_at);
CREATE INDEX IF NOT EXISTS idx_public_shares_is_active ON public.public_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_public_shares_created_by ON public.public_shares(created_by);

-- Enable RLS
ALTER TABLE public.public_shares ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Public shares are viewable by anyone"
    ON public.public_shares FOR SELECT
    USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can create their own public shares"
    ON public.public_shares FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own public shares"
    ON public.public_shares FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own public shares"
    ON public.public_shares FOR DELETE
    USING (auth.uid() = created_by);`;

    case 'sharing_logs':
      return `-- Create sharing_logs table
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

-- Enable RLS
ALTER TABLE public.sharing_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own sharing logs"
    ON public.sharing_logs FOR SELECT
    USING (auth.uid() = shared_by);

CREATE POLICY "Users can create sharing logs"
    ON public.sharing_logs FOR INSERT
    WITH CHECK (auth.uid() = shared_by);`;

    case 'categories':
      return `-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text,
    icon text,
    color text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Insert default categories
INSERT INTO public.categories (name, description, icon, color) VALUES
    ('productivity', 'Boost your productivity', 'briefcase', '#4CAF50'),
    ('social', 'Social media and communication', 'users', '#2196F3'),
    ('smart-home', 'Home automation', 'home', '#FF9800'),
    ('health', 'Health and fitness', 'heart', '#F44336'),
    ('entertainment', 'Fun and entertainment', 'play', '#9C27B0'),
    ('utility', 'General utilities', 'tool', '#607D8B')
ON CONFLICT (name) DO NOTHING;`;

    case 'tags':
      return `-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);`;

    case 'automation_tags':
      return `-- Create automation_tags junction table
CREATE TABLE IF NOT EXISTS public.automation_tags (
    automation_id uuid REFERENCES public.automations(id) ON DELETE CASCADE,
    tag_id uuid REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (automation_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_automation_tags_automation_id ON public.automation_tags(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_tags_tag_id ON public.automation_tags(tag_id);`;

    default:
      return `-- Table: ${tableName}
-- TODO: Add CREATE TABLE statement for ${tableName}`;
  }
}

async function runMigrationFile(filePath) {
  console.log(`\n📂 Running migration file: ${path.basename(filePath)}\n`);
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log('📋 Migration SQL loaded successfully');
    console.log(`📏 SQL length: ${sql.length} characters\n`);
    
    // Since we can't execute SQL directly, save it for manual execution
    const outputPath = path.join(__dirname, `migration_output_${Date.now()}.sql`);
    fs.writeFileSync(outputPath, sql);
    
    console.log('⚠️  Cannot execute SQL directly without exec_sql function');
    console.log(`✅ Migration SQL saved to: ${outputPath}`);
    console.log('\n📝 Next steps:');
    console.log('1. Copy the SQL from the output file');
    console.log('2. Run it in Supabase SQL Editor');
    console.log('3. Verify tables were created successfully');
    
    return true;
  } catch (err) {
    console.error('❌ Error processing migration:', err.message);
    return false;
  }
}

async function createTestData() {
  console.log('\n🧪 Attempting to create test data...\n');
  
  // Check if public_shares table exists
  const sharesExists = await tableExists('public_shares');
  if (!sharesExists) {
    console.log('❌ public_shares table does not exist yet');
    console.log('   Run the migration SQL first');
    return;
  }
  
  // Try to create test share with service role
  const testShare = {
    id: 'test_' + Math.random().toString(36).substring(2, 9),
    automation_id: '00000000-0000-0000-0000-000000000000',
    automation_data: {
      id: '00000000-0000-0000-0000-000000000000',
      title: 'Test Automation',
      description: 'Created by safe-migration-runner',
      steps: [],
      triggers: [],
      is_public: true
    },
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    created_by: null // No auth user for test
  };
  
  const { data, error } = await supabase
    .from('public_shares')
    .insert(testShare)
    .select()
    .single();
  
  if (error) {
    console.log('❌ Could not create test share:', error.message);
    if (error.message.includes('row-level security')) {
      console.log('\n💡 Tip: Use SUPABASE_SERVICE_ROLE_KEY for admin operations');
    }
  } else {
    console.log('✅ Test share created successfully!');
    console.log(`\n🔗 Test link: https://www.zaptap.cloud/share/${data.id}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Default behavior: check tables and generate migration
    const missingTables = await checkMissingTables();
    
    if (missingTables.length > 0) {
      console.log(`\n⚠️  Found ${missingTables.length} missing tables\n`);
      
      const sql = await generateMigrationSQL(missingTables);
      const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', `13_create_missing_tables_${Date.now()}.sql`);
      
      fs.writeFileSync(outputPath, sql);
      console.log(`✅ Migration SQL generated: ${outputPath}`);
      console.log('\n📝 Run this SQL in Supabase SQL Editor to create missing tables');
    } else {
      console.log('\n✅ All required tables exist!');
      
      // Try to create test data
      await createTestData();
    }
  } else if (args[0] === 'run' && args[1]) {
    // Run a specific migration file
    const migrationPath = path.resolve(args[1]);
    await runMigrationFile(migrationPath);
  } else if (args[0] === 'test') {
    // Just create test data
    await createTestData();
  } else {
    console.log('Usage:');
    console.log('  node safe-migration-runner.js              # Check tables and generate migration');
    console.log('  node safe-migration-runner.js run <file>   # Process a migration file');
    console.log('  node safe-migration-runner.js test         # Create test data');
  }
}

// Run the script
main().catch(err => {
  console.error('\n❌ Script failed:', err.message);
  process.exit(1);
});