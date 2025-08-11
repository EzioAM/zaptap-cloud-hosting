-- =============================================================================
-- ZapTap Cloud Storage RLS Policies (Fixed for Supabase)
-- =============================================================================
-- Run this script in your Supabase SQL editor to set up proper storage policies
-- This version works within Supabase's permission constraints
-- =============================================================================

-- Note: RLS is already enabled on storage.objects in Supabase by default
-- We cannot ALTER the table, but we can create policies

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
WITH CHECK (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE 
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
USING (
  bucket_id = 'public-automation-assets'
);

-- Policy: Authenticated users can upload public assets
CREATE POLICY "Authenticated users can upload public automation assets" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'public-automation-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update/delete their own public assets
CREATE POLICY "Users can manage their public assets" ON storage.objects
FOR ALL 
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
USING (
  bucket_id = 'profile-images'
);

-- Policy: Users can upload their profile image
CREATE POLICY "Users can upload their profile image" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their profile image
CREATE POLICY "Users can update their profile image" ON storage.objects
FOR UPDATE 
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
USING (
  bucket_id = 'profile-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

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

-- Check if RLS is enabled (should be true by default in Supabase)
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Count policies created
SELECT COUNT(*) as policy_count, 'policies created for storage.objects' as description
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================
SELECT 'Storage policies setup completed successfully!' as message;