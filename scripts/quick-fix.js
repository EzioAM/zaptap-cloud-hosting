#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://gfkdclzgdlcvhfiujkwz.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.log('⚠️  No service role key found. This script will attempt basic fixes only.');
  console.log('For full fixes, add SUPABASE_SERVICE_ROLE_KEY to your .env file.\n');
}

async function quickFix() {
  console.log('🚀 Running Quick Fix for Auth and Discover Issues\n');

  // Instructions for manual fixes
  console.log('📋 Manual Steps Required:');
  console.log('==========================\n');
  
  console.log('1. Go to your Supabase Dashboard: https://app.supabase.com');
  console.log('2. Navigate to your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Run these queries one by one:\n');
  
  console.log('-- Query 1: Enable public access to automations');
  console.log(`
ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public automations" ON automations;
CREATE POLICY "Anyone can view public automations"
    ON automations FOR SELECT
    USING (is_public = true);
  `);
  
  console.log('\n-- Query 2: Create sample public automations');
  console.log(`
INSERT INTO automations (
    title, 
    description, 
    category, 
    is_public, 
    created_by,
    steps,
    tags
) 
SELECT 
    'Sample ' || category || ' Automation',
    'This is a sample automation for testing',
    category,
    true,
    (SELECT id FROM auth.users LIMIT 1),
    '[{"type": "webhook", "config": {"url": "https://example.com", "method": "GET"}}]'::jsonb,
    ARRAY['sample', 'test']
FROM (
    VALUES 
    ('Productivity'),
    ('Smart Home'),
    ('Social')
) AS categories(category)
WHERE NOT EXISTS (
    SELECT 1 FROM automations WHERE is_public = true
);
  `);
  
  console.log('\n-- Query 3: Fix user profile creation');
  console.log(`
CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text,
    name text,
    avatar_url text,
    role text DEFAULT 'user',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
    ON public.users FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);
  `);
  
  console.log('\n5. After running these queries, restart your app');
  console.log('6. Try signing in and checking the Discover screen\n');
  
  console.log('💡 Alternative: Run the full migration');
  console.log('   npm run apply:auth-fix\n');
  
  console.log('📌 Common Issues and Solutions:');
  console.log('================================');
  console.log('❌ "Invalid email or password"');
  console.log('   → Check that your test account exists in Supabase Auth');
  console.log('   → Try creating a new account first\n');
  
  console.log('❌ "No automations found" on Discover');
  console.log('   → Run Query 1 above to enable public access');
  console.log('   → Run Query 2 to create sample automations\n');
  
  console.log('❌ "JWT expired" errors');
  console.log('   → Clear app data/cache and restart');
  console.log('   → Sign out and sign in again\n');
}

quickFix().catch(console.error);