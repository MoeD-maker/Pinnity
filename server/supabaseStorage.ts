import { supabaseAdmin } from './supabaseAdmin';
import fs from 'fs';
import path from 'path';

/**
 * Supabase Storage configuration and utilities
 * Replaces Cloudinary for file upload and management
 */

export const BUCKET_NAME = 'user-docs';

/**
 * Supported file types for Supabase Storage
 */
export const STORAGE_CONFIG = {
  allowedMimeTypes: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    'application/pdf'
  ],
  allowedExtensions: [
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'
  ],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  bucketConfig: {
    public: false, // Private bucket requiring signed URLs
    allowedMimeTypes: [
      'image/jpeg',
      'image/png', 
      'image/webp',
      'image/gif',
      'application/pdf'
    ],
    fileSizeLimit: 5 * 1024 * 1024 // 5MB
  }
};

/**
 * Initialize the user-docs bucket if it doesn't exist
 */
export async function initializeBucket(): Promise<void> {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Creating private bucket: ${BUCKET_NAME}`);
      
      const { data, error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: false,
        allowedMimeTypes: STORAGE_CONFIG.bucketConfig.allowedMimeTypes,
        fileSizeLimit: STORAGE_CONFIG.bucketConfig.fileSizeLimit
      });

      if (error) {
        console.error('Error creating bucket:', error);
        throw error;
      }

      console.log(`✅ Private bucket '${BUCKET_NAME}' created successfully with CDN enabled`);
    } else {
      console.log(`✅ Bucket '${BUCKET_NAME}' already exists`);
    }
  } catch (error) {
    console.error('Failed to initialize bucket:', error);
    throw error;
  }
}

/**
 * Upload file to Supabase Storage with security validation
 */
export async function uploadFileToSupabase(
  file: Express.Multer.File,
  userId?: string | number,
  folder: string = 'documents'
): Promise<{ path: string; signedUrl: string }> {
  try {
    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}-${sanitizedOriginalName}`;
    const filePath = `${folder}/${userId || 'anonymous'}/${fileName}`;

    console.log(`📤 Uploading file to Supabase Storage: ${filePath}`);

    // Upload file buffer to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600', // 1 hour cache
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log(`✅ File uploaded successfully: ${data.path}`);

    // Generate signed URL for access (valid for 1 hour)
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 3600); // 1 hour expiry

    if (urlError) {
      console.error('Error generating signed URL:', urlError);
      throw new Error(`Failed to generate signed URL: ${urlError.message}`);
    }

    console.log(`🔗 Generated signed URL for: ${data.path}`);

    return {
      path: data.path,
      signedUrl: signedUrlData.signedUrl
    };

  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    throw error;
  }
}

/**
 * Generate new signed URL for existing file
 */
export async function generateSignedUrl(
  filePath: string,
  expiresIn: number = 3600 // Default 1 hour
): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFileFromSupabase(filePath: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file from Supabase:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log(`🗑️ File deleted successfully: ${filePath}`);
  } catch (error) {
    console.error('Error deleting file from Supabase Storage:', error);
    throw error;
  }
}

/**
 * List files in a specific folder
 */
export async function listFiles(folder: string = ''): Promise<any[]> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(folder);

    if (error) {
      console.error('Error listing files:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error listing files from Supabase Storage:', error);
    throw error;
  }
}

/**
 * Get file info without downloading
 */
export async function getFileInfo(filePath: string): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(path.dirname(filePath), {
        search: path.basename(filePath)
      });

    if (error) {
      console.error('Error getting file info:', error);
      throw new Error(`Failed to get file info: ${error.message}`);
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error getting file info from Supabase Storage:', error);
    throw error;
  }
}

/**
 * Extract file path from Supabase Storage URL for cleanup
 */
export function extractFilePathFromUrl(url: string): string | null {
  try {
    // Extract path from Supabase signed URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/object\/sign\/([^/]+)\/(.+)$/);
    if (pathMatch && pathMatch[1] === BUCKET_NAME) {
      return pathMatch[2];
    }
    return null;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
}

/**
 * Initialize Supabase Storage on startup
 */
export async function initializeSupabaseStorage(): Promise<void> {
  try {
    console.log('🚀 Initializing Supabase Storage...');
    await initializeBucket();
    console.log('✅ Supabase Storage initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase Storage:', error);
    throw error;
  }
}