-- =============================================================================
-- ZapTap Cloud Storage RLS Policies
-- =============================================================================
-- Run this script in your Supabase SQL editor to set up proper storage policies
-- This ensures secure, user-scoped access to cloud storage buckets
-- =============================================================================

-- Enable RLS on storage.objects table (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USER-FILES BUCKET POLICIES
-- Personal file storage for each user's automations
-- =============================================================================

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Policy: Users can upload files to their own directory
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- AUTOMATION-FILES BUCKET POLICIES
-- Files used in automation workflows
-- =============================================================================

DROP POLICY IF EXISTS "Users can manage automation files" ON storage.objects;

-- Policy: Users can manage all operations on their automation files
CREATE POLICY "Users can manage automation files" ON storage.objects
FOR ALL 
TO authenticated
USING (
  bucket_id = 'automation-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'automation-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- PUBLIC-AUTOMATION-ASSETS BUCKET POLICIES
-- Publicly accessible assets for shared automations
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view public automation assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload public automation assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their public assets" ON storage.objects;

-- Policy: Anyone can view public assets
CREATE POLICY "Anyone can view public automation assets" ON storage.objects
FOR SELECT 
TO public
USING (
  bucket_id = 'public-automation-assets'
);

-- Policy: Authenticated users can upload public assets
CREATE POLICY "Authenticated users can upload public automation assets" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'public-automation-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update/delete their own public assets
CREATE POLICY "Users can manage their public assets" ON storage.objects
FOR ALL 
TO authenticated
USING (
  bucket_id = 'public-automation-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'public-automation-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- PROFILE-IMAGES BUCKET POLICIES
-- User profile images
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their profile image" ON storage.objects;

-- Policy: Anyone can view profile images (public bucket)
CREATE POLICY "Anyone can view profile images" ON storage.objects
FOR SELECT 
TO public
USING (
  bucket_id = 'profile-images'
);

-- Policy: Users can upload their profile image
CREATE POLICY "Users can upload their profile image" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their profile image
CREATE POLICY "Users can update their profile image" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'profile-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their profile image
CREATE POLICY "Users can delete their profile image" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'profile-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get user's storage usage (optional, for quota management)
CREATE OR REPLACE FUNCTION get_user_storage_usage(user_id UUID)
RETURNS TABLE(
  bucket_name TEXT,
  file_count BIGINT,
  total_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bucket_id::TEXT as bucket_name,
    COUNT(*) as file_count,
    COALESCE(SUM((metadata->>'size')::BIGINT), 0) as total_size
  FROM storage.objects
  WHERE owner = user_id
  GROUP BY bucket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old files (optional, for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_files(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM storage.objects
  WHERE 
    bucket_id IN ('user-files', 'automation-files') AND
    created_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- VERIFICATION QUERIES
-- Run these to verify policies are set up correctly
-- =============================================================================

-- Check all policies on storage.objects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- =============================================================================
-- GRANT PERMISSIONS (if needed)
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Grant read permissions to anon users for public buckets
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
SELECT 'Storage policies setup completed successfully!' as message;