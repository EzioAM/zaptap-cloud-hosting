#!/usr/bin/env node

/**
 * Sets up all required storage buckets in Supabase for ZapTap
 * Includes buckets for profile images, automation files, and user storage
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY in .env file');
  console.log('\nPlease add the following to your .env file:');
  console.log('SUPABASE_URL=your_supabase_url');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.log('\n⚠️  Note: Service role key is required for bucket creation');
  console.log('Get it from: Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bucket configurations
const bucketsConfig = [
  {
    name: 'profile-images',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    description: 'User profile images'
  },
  {
    name: 'user-files',
    public: false,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: null, // Allow all types for user files
    description: 'Personal user file storage for automations'
  },
  {
    name: 'automation-files',
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: [
      'text/plain',
      'application/json',
      'text/csv',
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif'
    ],
    description: 'Files used in automation workflows'
  },
  {
    name: 'public-automation-assets',
    public: true,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: [
      'image/png',
      'image/jpeg',
      'image/gif',
      'text/plain',
      'application/json'
    ],
    description: 'Public assets for shared automations'
  }
];

async function setupStorageBuckets() {
  try {
    console.log('🚀 Setting up Supabase storage buckets for ZapTap...\n');

    // Check if we can list buckets (requires proper permissions)
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      console.log('\n⚠️  You need a service role key for this operation.');
      console.log('The anon key does not have permissions to create buckets.');
      console.log('\nGet your service role key from:');
      console.log('Supabase Dashboard > Settings > API > service_role key');
      process.exit(1);
    }

    // Create each bucket if it doesn't exist
    for (const bucketConfig of bucketsConfig) {
      const bucketExists = buckets?.some(bucket => bucket.name === bucketConfig.name);

      if (bucketExists) {
        console.log(`✅ Bucket "${bucketConfig.name}" already exists`);
      } else {
        console.log(`📦 Creating bucket "${bucketConfig.name}"...`);
        
        const { data, error: createError } = await supabase.storage.createBucket(
          bucketConfig.name,
          {
            public: bucketConfig.public,
            fileSizeLimit: bucketConfig.fileSizeLimit,
            allowedMimeTypes: bucketConfig.allowedMimeTypes
          }
        );

        if (createError) {
          console.error(`❌ Error creating bucket "${bucketConfig.name}":`, createError.message);
        } else {
          console.log(`✅ Created bucket "${bucketConfig.name}" - ${bucketConfig.description}`);
        }
      }
    }

    // Display storage policies SQL
    console.log('\n📋 Next step: Set up RLS policies');
    console.log('Run the following SQL in your Supabase SQL editor:\n');
    console.log(generateStoragePoliciesSQL());

    console.log('\n✨ Storage bucket setup complete!');
    console.log('\nTest your setup with:');
    console.log('  npm run test:cloud-storage');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

function generateStoragePoliciesSQL() {
  return `
-- Storage Policies for ZapTap Cloud Storage

-- Policy for user-files bucket: Users can manage their own files
CREATE POLICY "Users can upload their own files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for automation-files bucket: Similar user-based access
CREATE POLICY "Users can manage automation files" ON storage.objects
FOR ALL USING (
  bucket_id = 'automation-files' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy for public buckets: Anyone can read, authenticated users can write
CREATE POLICY "Anyone can view public assets" ON storage.objects
FOR SELECT USING (
  bucket_id IN ('public-automation-assets', 'profile-images')
);

CREATE POLICY "Authenticated users can upload public assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id IN ('public-automation-assets', 'profile-images') AND 
  auth.role() = 'authenticated'
);
`;
}

// Run the setup
setupStorageBuckets();