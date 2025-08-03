#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixCommentsTables() {
  console.log('🔍 Checking comments system...\n');

  try {
    // 1. Check if automation_comments table exists
    console.log('1️⃣ Checking automation_comments table...');
    const { data: commentsTable, error: commentsError } = await supabase
      .from('automation_comments')
      .select('id')
      .limit(1);
    
    if (commentsError) {
      console.log('❌ automation_comments table not found or has issues:', commentsError.message);
      console.log('Creating automation_comments table...');
      
      // Create the table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.automation_comments (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
          parent_comment_id UUID REFERENCES public.automation_comments(id) ON DELETE CASCADE,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          content TEXT NOT NULL,
          is_edited BOOLEAN DEFAULT false,
          is_pinned BOOLEAN DEFAULT false,
          likes_count INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_comments_automation_id ON automation_comments(automation_id);
        CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON automation_comments(parent_comment_id);
        CREATE INDEX IF NOT EXISTS idx_comments_user_id ON automation_comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_comments_created_at ON automation_comments(created_at);
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      if (createError) {
        console.log('❌ Failed to create table. Please run this SQL manually in Supabase SQL editor:\n');
        console.log(createTableSQL);
      } else {
        console.log('✅ automation_comments table created');
      }
    } else {
      console.log('✅ automation_comments table exists');
    }

    // 2. Check if comment_likes table exists
    console.log('\n2️⃣ Checking comment_likes table...');
    const { data: likesTable, error: likesError } = await supabase
      .from('comment_likes')
      .select('id')
      .limit(1);
    
    if (likesError) {
      console.log('❌ comment_likes table not found:', likesError.message);
      console.log('Creating comment_likes table...');
      
      const createLikesTableSQL = `
        CREATE TABLE IF NOT EXISTS public.comment_likes (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          comment_id UUID REFERENCES public.automation_comments(id) ON DELETE CASCADE NOT NULL,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
          UNIQUE(comment_id, user_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
        CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);
      `;
      
      const { error: createLikesError } = await supabase.rpc('exec_sql', { sql: createLikesTableSQL });
      if (createLikesError) {
        console.log('❌ Failed to create table. Please run this SQL manually in Supabase SQL editor:\n');
        console.log(createLikesTableSQL);
      } else {
        console.log('✅ comment_likes table created');
      }
    } else {
      console.log('✅ comment_likes table exists');
    }

    // 3. Check RLS policies
    console.log('\n3️⃣ Checking RLS policies...');
    const { data: rlsStatus } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['automation_comments', 'comment_likes']);
    
    console.log('RLS Status:', rlsStatus);

    // 4. Test comment insertion
    console.log('\n4️⃣ Testing comment insertion...');
    
    // First, get a test automation
    const { data: testAutomation } = await supabase
      .from('automations')
      .select('id')
      .limit(1)
      .single();
    
    if (testAutomation) {
      console.log('Testing with automation ID:', testAutomation.id);
      
      // Try to insert a test comment
      const { data: testComment, error: insertError } = await supabase
        .from('automation_comments')
        .insert({
          automation_id: testAutomation.id,
          content: 'Test comment from fix script',
          user_id: '00000000-0000-0000-0000-000000000000', // This will fail, but we want to see the error
        })
        .select();
      
      if (insertError) {
        console.log('⚠️ Insert test failed (expected):', insertError.message);
        console.log('This is normal - the test used a fake user_id');
      }
    }

    // 5. Provide SQL for manual setup if needed
    console.log('\n📋 If you need to set up the comments system manually, run this SQL in Supabase:');
    console.log(`
-- Create tables
CREATE TABLE IF NOT EXISTS public.automation_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID REFERENCES public.automations(id) ON DELETE CASCADE NOT NULL,
  parent_comment_id UUID REFERENCES public.automation_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES public.automation_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE public.automation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Create policies for automation_comments
CREATE POLICY "Users can view comments on public automations" ON public.automation_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_comments.automation_id AND a.is_public = true
    )
  );

CREATE POLICY "Authenticated users can comment on public automations" ON public.automation_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.is_public = true
    )
  );

CREATE POLICY "Users can manage their own comments" ON public.automation_comments
  FOR ALL USING (auth.uid() = user_id);

-- Create policies for comment_likes
CREATE POLICY "Anyone can view comment likes" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like/unlike comments" ON public.comment_likes
  FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updating likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.automation_comments 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.automation_comments 
    SET likes_count = GREATEST(0, likes_count - 1) 
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_likes_count_trigger
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();
    `);

  } catch (error) {
    console.error('❌ Error checking comments system:', error);
  }
}

async function main() {
  await checkAndFixCommentsTables();
  console.log('\n✅ Comments system check complete!');
  console.log('\nNext steps:');
  console.log('1. If tables were missing, run the SQL commands in your Supabase SQL editor');
  console.log('2. Make sure you are logged in when trying to post comments');
  console.log('3. Check that the automation you are commenting on has is_public = true');
}

main().catch(console.error);