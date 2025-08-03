-- Supabase Change History Table Setup
-- This stores AI-generated code changes for tracking and reverting

-- Create the change history table
CREATE TABLE IF NOT EXISTS public.change_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'reverted')),
  reverted_at TIMESTAMP WITH TIME ZONE,
  reverted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create the code changes table (detailed changes for each history entry)
CREATE TABLE IF NOT EXISTS public.code_changes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  history_id UUID REFERENCES public.change_history(id) ON DELETE CASCADE NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('file_created', 'file_modified', 'file_deleted', 'dependency_added', 'config_changed')),
  filepath TEXT NOT NULL,
  description TEXT NOT NULL,
  previous_content TEXT, -- Store previous content for reverting
  new_content TEXT, -- Store new content
  metadata JSONB, -- Store additional metadata (source, ai_model, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_change_history_user_id ON public.change_history(user_id);
CREATE INDEX idx_change_history_status ON public.change_history(status);
CREATE INDEX idx_change_history_created_at ON public.change_history(created_at DESC);
CREATE INDEX idx_code_changes_history_id ON public.code_changes(history_id);
CREATE INDEX idx_code_changes_type ON public.code_changes(change_type);

-- Enable Row Level Security
ALTER TABLE public.change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_changes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for change_history
CREATE POLICY "Users can view their own change history" ON public.change_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own change history" ON public.change_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own change history" ON public.change_history
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Developers can view all change history" ON public.change_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.role = 'developer' OR p.role = 'super_admin')
    )
  );

-- RLS Policies for code_changes
CREATE POLICY "Users can view code changes for their history" ON public.code_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.change_history ch
      WHERE ch.id = code_changes.history_id
      AND ch.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert code changes for their history" ON public.code_changes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.change_history ch
      WHERE ch.id = code_changes.history_id
      AND ch.user_id = auth.uid()
    )
  );

CREATE POLICY "Developers can view all code changes" ON public.code_changes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.role = 'developer' OR p.role = 'super_admin')
    )
  );

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER handle_change_history_updated_at
  BEFORE UPDATE ON public.change_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to revert a change
CREATE OR REPLACE FUNCTION public.revert_change(change_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  change_owner UUID;
  change_status TEXT;
BEGIN
  -- Check if the change exists and belongs to the user
  SELECT user_id, status INTO change_owner, change_status
  FROM public.change_history
  WHERE id = change_id;

  IF change_owner IS NULL THEN
    RAISE EXCEPTION 'Change not found';
  END IF;

  IF change_owner != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('developer', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized to revert this change';
  END IF;

  IF change_status = 'reverted' THEN
    RAISE EXCEPTION 'Change already reverted';
  END IF;

  -- Update the change status
  UPDATE public.change_history
  SET 
    status = 'reverted',
    reverted_at = NOW(),
    reverted_by = auth.uid()
  WHERE id = change_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get change statistics
CREATE OR REPLACE FUNCTION public.get_change_statistics(user_filter UUID DEFAULT NULL)
RETURNS TABLE (
  total_changes BIGINT,
  active_changes BIGINT,
  reverted_changes BIGINT,
  changes_by_type JSONB,
  changes_by_source JSONB,
  oldest_change TIMESTAMP WITH TIME ZONE,
  newest_change TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ch.status = 'active') as active,
      COUNT(*) FILTER (WHERE ch.status = 'reverted') as reverted,
      MIN(ch.created_at) as oldest,
      MAX(ch.created_at) as newest
    FROM public.change_history ch
    WHERE (user_filter IS NULL OR ch.user_id = user_filter)
      AND (
        auth.uid() = ch.user_id 
        OR EXISTS (
          SELECT 1 FROM public.profiles p 
          WHERE p.id = auth.uid() 
          AND p.role IN ('developer', 'super_admin')
        )
      )
  ),
  type_counts AS (
    SELECT jsonb_object_agg(change_type, cnt) as by_type
    FROM (
      SELECT cc.change_type, COUNT(*) as cnt
      FROM public.code_changes cc
      JOIN public.change_history ch ON ch.id = cc.history_id
      WHERE (user_filter IS NULL OR ch.user_id = user_filter)
        AND (
          auth.uid() = ch.user_id 
          OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('developer', 'super_admin')
          )
        )
      GROUP BY cc.change_type
    ) t
  ),
  source_counts AS (
    SELECT jsonb_object_agg(source, cnt) as by_source
    FROM (
      SELECT cc.metadata->>'source' as source, COUNT(*) as cnt
      FROM public.code_changes cc
      JOIN public.change_history ch ON ch.id = cc.history_id
      WHERE (user_filter IS NULL OR ch.user_id = user_filter)
        AND cc.metadata->>'source' IS NOT NULL
        AND (
          auth.uid() = ch.user_id 
          OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('developer', 'super_admin')
          )
        )
      GROUP BY cc.metadata->>'source'
    ) t
  )
  SELECT 
    stats.total,
    stats.active,
    stats.reverted,
    COALESCE(type_counts.by_type, '{}'::jsonb),
    COALESCE(source_counts.by_source, '{}'::jsonb),
    stats.oldest,
    stats.newest
  FROM stats, type_counts, source_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for easy access to change history with details
CREATE OR REPLACE VIEW public.change_history_with_details AS
SELECT 
  ch.id,
  ch.user_id,
  ch.feature,
  ch.description,
  ch.status,
  ch.reverted_at,
  ch.reverted_by,
  ch.created_at,
  ch.updated_at,
  u.email as user_email,
  ru.email as reverted_by_email,
  COUNT(cc.id) as change_count,
  jsonb_agg(
    jsonb_build_object(
      'id', cc.id,
      'type', cc.change_type,
      'filepath', cc.filepath,
      'description', cc.description,
      'metadata', cc.metadata
    ) ORDER BY cc.created_at
  ) as changes
FROM public.change_history ch
LEFT JOIN auth.users u ON u.id = ch.user_id
LEFT JOIN auth.users ru ON ru.id = ch.reverted_by
LEFT JOIN public.code_changes cc ON cc.history_id = ch.id
WHERE ch.user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('developer', 'super_admin')
  )
GROUP BY ch.id, u.email, ru.email;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.change_history TO authenticated;
GRANT SELECT, INSERT ON public.code_changes TO authenticated;
GRANT SELECT ON public.change_history_with_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_change(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_change_statistics(UUID) TO authenticated;

-- Sample data for testing (optional - remove in production)
-- INSERT INTO public.change_history (user_id, feature, description)
-- SELECT 
--   auth.uid(),
--   'AI Research Integration',
--   'Added Claude and ChatGPT research capabilities'
-- WHERE EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid());

-- Verification queries
-- SELECT * FROM public.change_history WHERE user_id = auth.uid();
-- SELECT * FROM public.change_history_with_details;
-- SELECT * FROM public.get_change_statistics();