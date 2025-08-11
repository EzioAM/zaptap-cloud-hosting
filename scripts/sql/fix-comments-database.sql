-- Fix Comments System Database
-- Run this in your Supabase SQL Editor

-- 1. Create automation_comments table if it doesn't exist
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

-- 2. Create comment_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID REFERENCES public.automation_comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_automation_id ON automation_comments(automation_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON automation_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON automation_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON automation_comments(created_at);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- 4. Enable Row Level Security
ALTER TABLE public.automation_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view comments on public automations" ON public.automation_comments;
DROP POLICY IF EXISTS "Authenticated users can comment on public automations" ON public.automation_comments;
DROP POLICY IF EXISTS "Users can manage their own comments" ON public.automation_comments;
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Authenticated users can like/unlike comments" ON public.comment_likes;

-- 6. Create RLS policies for automation_comments
-- Allow viewing comments on public automations
CREATE POLICY "Users can view comments on public automations" ON public.automation_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_comments.automation_id AND a.is_public = true
    )
  );

-- Allow authenticated users to create comments on public automations
CREATE POLICY "Authenticated users can comment on public automations" ON public.automation_comments
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.automations a 
      WHERE a.id = automation_id AND a.is_public = true
    )
  );

-- Allow users to update/delete their own comments
CREATE POLICY "Users can manage their own comments" ON public.automation_comments
  FOR ALL USING (auth.uid() = user_id);

-- 7. Create RLS policies for comment_likes
CREATE POLICY "Anyone can view comment likes" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like/unlike comments" ON public.comment_likes
  FOR ALL USING (auth.uid() = user_id);

-- 8. Create or replace trigger function for updating likes count
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

-- 9. Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_comment_likes_count_trigger ON public.comment_likes;
CREATE TRIGGER update_comment_likes_count_trigger
AFTER INSERT OR DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_comments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_likes TO anon, authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 11. Test the setup (optional - will show if tables exist)
SELECT 
  'automation_comments' as table_name,
  COUNT(*) as row_count,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'automation_comments'
  ) as table_exists
FROM public.automation_comments
UNION ALL
SELECT 
  'comment_likes' as table_name,
  COUNT(*) as row_count,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'comment_likes'
  ) as table_exists
FROM public.comment_likes;

-- Success message
SELECT 'Comments system setup complete!' as status;