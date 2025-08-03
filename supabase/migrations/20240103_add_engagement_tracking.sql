-- Add engagement tracking to automations table
ALTER TABLE automations 
ADD COLUMN IF NOT EXISTS downloads_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for engagement metrics
CREATE INDEX IF NOT EXISTS idx_automations_likes_count ON automations(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_automations_downloads_count ON automations(downloads_count DESC);
CREATE INDEX IF NOT EXISTS idx_automations_updated_at ON automations(updated_at DESC);

-- Update likes count when automation_likes changes
CREATE OR REPLACE FUNCTION update_automation_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE automations 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.automation_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE automations 
    SET likes_count = GREATEST(likes_count - 1, 0) 
    WHERE id = OLD.automation_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for likes count
DROP TRIGGER IF EXISTS update_likes_count_trigger ON automation_likes;
CREATE TRIGGER update_likes_count_trigger
AFTER INSERT OR DELETE ON automation_likes
FOR EACH ROW
EXECUTE FUNCTION update_automation_likes_count();

-- Function to get automation engagement metrics
CREATE OR REPLACE FUNCTION get_automation_engagement(p_automation_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  likes_count BIGINT,
  downloads_count BIGINT,
  executions_count BIGINT,
  views_count BIGINT,
  user_has_liked BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(a.likes_count, 0)::BIGINT as likes_count,
    COALESCE(a.downloads_count, 0)::BIGINT as downloads_count,
    COALESCE(a.execution_count, 0)::BIGINT as executions_count,
    COALESCE(a.views_count, 0)::BIGINT as views_count,
    EXISTS(
      SELECT 1 FROM automation_likes al 
      WHERE al.automation_id = p_automation_id 
      AND al.user_id = p_user_id
    ) as user_has_liked
  FROM automations a
  WHERE a.id = p_automation_id;
END;
$$;

-- Function to get trending automations based on real metrics
CREATE OR REPLACE FUNCTION get_trending_automations(
  p_limit INTEGER DEFAULT 10,
  p_time_window INTERVAL DEFAULT '7 days'
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  created_by UUID,
  engagement_score NUMERIC,
  likes_count BIGINT,
  downloads_count BIGINT,
  executions_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.description,
    a.category,
    a.created_by,
    -- Calculate engagement score (weighted sum)
    (
      (COALESCE(a.likes_count, 0) * 3) + 
      (COALESCE(a.downloads_count, 0) * 5) + 
      (COALESCE(a.execution_count, 0) * 2) +
      (COALESCE(a.views_count, 0) * 1)
    )::NUMERIC as engagement_score,
    COALESCE(a.likes_count, 0)::BIGINT as likes_count,
    COALESCE(a.downloads_count, 0)::BIGINT as downloads_count,
    COALESCE(a.execution_count, 0)::BIGINT as executions_count,
    a.created_at
  FROM automations a
  WHERE a.is_public = true
    AND a.created_at >= NOW() - p_time_window
  ORDER BY engagement_score DESC, a.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to track automation download/clone
CREATE OR REPLACE FUNCTION track_automation_download(p_automation_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update download count
  UPDATE automations 
  SET downloads_count = downloads_count + 1 
  WHERE id = p_automation_id;
  
  -- Log in analytics table
  INSERT INTO automation_analytics (
    automation_id,
    user_id,
    event_type,
    event_data
  ) VALUES (
    p_automation_id,
    p_user_id,
    'download',
    jsonb_build_object('timestamp', NOW())
  );
END;
$$;

-- Function to track automation view
CREATE OR REPLACE FUNCTION track_automation_view(p_automation_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update view count and last viewed timestamp
  UPDATE automations 
  SET 
    views_count = views_count + 1,
    last_viewed_at = NOW()
  WHERE id = p_automation_id;
  
  -- Log in analytics table (optional, can be heavy for high traffic)
  -- Uncomment if you want detailed view tracking
  /*
  INSERT INTO automation_analytics (
    automation_id,
    user_id,
    event_type,
    event_data
  ) VALUES (
    p_automation_id,
    p_user_id,
    'view',
    jsonb_build_object('timestamp', NOW())
  );
  */
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_automation_engagement TO authenticated;
GRANT EXECUTE ON FUNCTION get_trending_automations TO authenticated;
GRANT EXECUTE ON FUNCTION track_automation_download TO authenticated;
GRANT EXECUTE ON FUNCTION track_automation_view TO authenticated;