import { supabase } from './client';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const PROFILE_IMAGES_BUCKET = 'profile-images';

export class StorageService {
  /**
   * Initialize storage bucket for profile images
   * This should be called once during app initialization
   */
  static async initializeStorage() {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('[StorageService] Error listing buckets:', listError);
        return;
      }

      const profileBucketExists = buckets?.some(bucket => bucket.name === PROFILE_IMAGES_BUCKET);

      if (!profileBucketExists) {
        const { error: createError } = await supabase.storage.createBucket(PROFILE_IMAGES_BUCKET, {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
          fileSizeLimit: 5242880, // 5MB
        });

        if (createError) {
          if (createError.message.includes('already exists')) {
            console.log('[StorageService] Profile images bucket already exists');
          } else if (createError.message.includes('row-level security policy')) {
            console.warn('[StorageService] Cannot create bucket due to RLS policies. Please create the "profile-images" bucket manually in Supabase dashboard.');
          } else {
            console.error('[StorageService] Error creating bucket:', createError);
          }
        } else {
          console.log('[StorageService] Profile images bucket created successfully');
        }
      }
    } catch (error) {
      console.error('[StorageService] Error initializing storage:', error);
    }
  }

  /**
   * Upload profile image to Supabase storage
   */
  static async uploadProfileImage(userId: string, imageUri: string): Promise<string | null> {
    try {
      console.log('[StorageService] Starting image upload for user:', userId);
      console.log('[StorageService] Image URI:', imageUri);
      
      // Generate unique filename
      const fileExt = imageUri.toLowerCase().includes('.png') ? 'png' : 'jpg';
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;
      const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
      
      // Check if this is a local file URI (for React Native)
      if (imageUri.startsWith('file://') || imageUri.startsWith('/')) {
        console.log('[StorageService] Detected local file URI, using direct fetch approach');
        
        // Use fetch to get the file as a blob directly
        // This works because React Native's fetch can handle file:// URIs
        console.log('[StorageService] Fetching file as blob...');
        
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        console.log('[StorageService] Blob size:', blob.size, 'type:', blob.type || contentType);
        
        // Create a File object from the blob
        // This ensures proper handling by Supabase
        const file = new File([blob], `avatar-${Date.now()}.${fileExt}`, {
          type: contentType,
          lastModified: Date.now(),
        });
        
        console.log('[StorageService] File created, size:', file.size, 'type:', file.type);
        console.log('[StorageService] Uploading to path:', fileName);
        
        // Upload the file to Supabase
        const { data, error } = await supabase.storage
          .from(PROFILE_IMAGES_BUCKET)
          .upload(fileName, file, {
            contentType: contentType,
            upsert: false,
          });
        
        if (error) {
          if (error.message?.includes('Bucket not found')) {
            console.warn('[StorageService] Storage bucket not found. Please create a "profile-images" bucket in your Supabase dashboard with public access.');
          } else if (error.message?.includes('row-level security policy')) {
            console.warn('[StorageService] Storage RLS policy error. The bucket exists but needs proper configuration.');
          } else {
            console.error('[StorageService] Upload error:', error);
          }
          return null;
        }
        
        console.log('[StorageService] Upload successful:', data.path);
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(PROFILE_IMAGES_BUCKET)
          .getPublicUrl(data.path);

        console.log('[StorageService] Public URL generated:', urlData.publicUrl);
        return urlData.publicUrl;
      } else {
        // For remote URLs, use fetch
        console.log('[StorageService] Using fetch for remote URL');
        const response = await fetch(imageUri);
        
        if (!response.ok) {
          console.error('[StorageService] Failed to fetch image:', response.status, response.statusText);
          return null;
        }
        
        const blob = await response.blob();
        
        console.log('[StorageService] Blob size:', blob.size);
        console.log('[StorageService] Blob type:', blob.type || contentType);
        
        // If blob is empty, something went wrong
        if (blob.size === 0) {
          console.error('[StorageService] Blob is empty! Image processing failed.');
          return null;
        }
        
        console.log('[StorageService] Uploading to path:', fileName);
        
        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from(PROFILE_IMAGES_BUCKET)
          .upload(fileName, blob, {
            contentType: contentType,
            upsert: false,
          });

        if (error) {
          if (error.message?.includes('Bucket not found')) {
            console.warn('[StorageService] Storage bucket not found. Please create a "profile-images" bucket in your Supabase dashboard with public access.');
          } else if (error.message?.includes('row-level security policy')) {
            console.warn('[StorageService] Storage RLS policy error. The bucket exists but needs proper configuration.');
          } else {
            console.error('[StorageService] Upload error:', error);
          }
          return null;
        }

        console.log('[StorageService] Upload successful:', data.path);
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(PROFILE_IMAGES_BUCKET)
          .getPublicUrl(data.path);

        console.log('[StorageService] Public URL generated:', urlData.publicUrl);
        return urlData.publicUrl;
      }
    } catch (error) {
      console.error('[StorageService] Error uploading profile image:', error);
      return null;
    }
  }

  /**
   * Delete old profile images for a user
   */
  static async deleteOldProfileImages(userId: string, keepLatest: boolean = true) {
    try {
      const { data: files, error: listError } = await supabase.storage
        .from(PROFILE_IMAGES_BUCKET)
        .list(userId, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (listError) {
        console.error('[StorageService] Error listing files:', listError);
        return;
      }

      if (!files || files.length === 0) return;

      // Keep the latest file if requested
      const filesToDelete = keepLatest ? files.slice(1) : files;
      
      if (filesToDelete.length === 0) return;

      const paths = filesToDelete.map(file => `${userId}/${file.name}`);
      
      const { error: deleteError } = await supabase.storage
        .from(PROFILE_IMAGES_BUCKET)
        .remove(paths);

      if (deleteError) {
        console.error('[StorageService] Error deleting old images:', deleteError);
      } else {
        console.log(`[StorageService] Deleted ${paths.length} old profile images`);
      }
    } catch (error) {
      console.error('[StorageService] Error cleaning up old images:', error);
    }
  }

  /**
   * Update user profile with new image URL
   */
  static async updateUserProfileImage(userId: string, imageUrl: string | null) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          avatar_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('[StorageService] Error updating profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[StorageService] Error updating user profile:', error);
      return false;
    }
  }

  /**
   * Remove profile image
   */
  static async removeProfileImage(userId: string) {
    try {
      // Delete all profile images for the user
      await this.deleteOldProfileImages(userId, false);
      
      // Update profile to remove avatar URL
      await this.updateUserProfileImage(userId, null);
      
      return true;
    } catch (error) {
      console.error('[StorageService] Error removing profile image:', error);
      return false;
    }
  }
}