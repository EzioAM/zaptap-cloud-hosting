-- Fix Storage Policies for profile-images bucket
-- Run this in your Supabase SQL Editor

-- First, ensure the bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-images';

-- Drop existing policies if they exist (to start fresh)
DROP POLICY IF EXISTS "Users can upload own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public profile image access" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;

-- Create new, simpler policies

-- 1. Allow authenticated users to upload to their own folder
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- 2. Allow anyone to view/download images (since it's a public bucket)
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'profile-images');

-- 3. Allow users to update their own images
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- 4. Allow users to delete their own images
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-images' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Verify the policies are created
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%upload%' OR policyname LIKE '%download%';