# Supabase Storage Setup for Profile Images

## Manual Setup Required

The app needs a storage bucket for profile images. Due to Supabase security policies, this must be created manually.

## Steps to Create Storage Bucket

1. **Login to Supabase Dashboard**
   - Go to https://supabase.com
   - Navigate to your project

2. **Create Storage Bucket**
   - Go to **Storage** in the left sidebar
   - Click **New bucket**
   - Configure as follows:
     - **Name:** `profile-images`
     - **Public bucket:** Toggle ON ✅
     - **File size limit:** 5MB
     - **Allowed MIME types:** 
       - image/jpeg
       - image/png
       - image/gif
       - image/webp
   - Click **Save**

3. **Configure RLS Policies (Optional but Recommended)**
   
   After creating the bucket, set up these policies:

   **INSERT Policy - Allow users to upload their own images:**
   ```sql
   -- Policy name: Users can upload their own profile images
   (auth.uid() = storage.foldername[1]::uuid)
   ```

   **SELECT Policy - Allow public read access:**
   ```sql
   -- Policy name: Public read access
   true
   ```

   **UPDATE Policy - Allow users to update their own images:**
   ```sql
   -- Policy name: Users can update their own profile images
   (auth.uid() = storage.foldername[1]::uuid)
   ```

   **DELETE Policy - Allow users to delete their own images:**
   ```sql
   -- Policy name: Users can delete their own profile images
   (auth.uid() = storage.foldername[1]::uuid)
   ```

## Alternative: SQL Commands

If you have database access, run these SQL commands:

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create RLS policies
CREATE POLICY "Users can upload own profile images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-images' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "Public profile image access" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'profile-images');

CREATE POLICY "Users can update own profile images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-images' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "Users can delete own profile images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'profile-images' AND (auth.uid()::text = (storage.foldername(name))[1]));
```

## Verification

After setup, test by:
1. Going to the Profile tab in the app
2. Tapping on the profile image
3. Selecting a new image
4. The image should upload and display successfully

## Troubleshooting

If uploads still fail:
1. Ensure the bucket is set to **public**
2. Check that your Supabase project has storage enabled
3. Verify your authentication is working (user must be logged in)
4. Check the Supabase dashboard logs for specific errors