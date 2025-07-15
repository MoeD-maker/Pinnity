/**
 * File management utilities for moving and organizing uploaded files
 */

import { deleteFileFromSupabase, uploadFileToSupabase, BUCKET_NAME } from './supabaseStorage';
import { supabaseAdmin } from './supabaseAdmin';

/**
 * Move files from pending folder to user-specific folder after user creation
 */
export async function moveFilesToUserFolder(
  filePaths: string[],
  userIdentifier: string | number,
  folder: string = 'business-documents'
): Promise<{ [originalPath: string]: string }> {
  const movedFiles: { [originalPath: string]: string } = {};
  
  try {
    for (const filePath of filePaths) {
      if (!filePath.includes('/pending/')) {
        // File is not in pending folder, skip
        movedFiles[filePath] = filePath;
        continue;
      }
      
      console.log(`📦 Moving file from pending to user folder: ${filePath}`);
      
      // Download the file from pending location
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .download(filePath);
        
      if (downloadError) {
        console.error(`❌ Failed to download file ${filePath}:`, downloadError);
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }
      
      // Generate new path with user identifier (business name or user ID)
      const fileName = filePath.split('/').pop(); // Get filename
      const newPath = `${folder}/${userIdentifier}/${fileName}`;
      
      // Upload to new location
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(newPath, fileData, {
          contentType: 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) {
        console.error(`❌ Failed to upload file to ${newPath}:`, uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }
      
      // Delete the old pending file
      const { error: deleteError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .remove([filePath]);
        
      if (deleteError) {
        console.warn(`⚠️ Failed to delete pending file ${filePath}:`, deleteError);
        // Don't throw error here as the main operation succeeded
      }
      
      console.log(`✅ File moved successfully: ${filePath} → ${newPath}`);
      movedFiles[filePath] = newPath;
    }
    
    return movedFiles;
    
  } catch (error) {
    console.error('❌ Error moving files to user folder:', error);
    throw error;
  }
}

/**
 * Generate signed URLs for file paths
 */
export async function generateSignedUrlsForPaths(
  filePaths: string[],
  expiresIn: number = 3600
): Promise<{ [filePath: string]: string }> {
  const signedUrls: { [filePath: string]: string } = {};
  
  try {
    for (const filePath of filePaths) {
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, expiresIn);
        
      if (error) {
        console.error(`❌ Failed to generate signed URL for ${filePath}:`, error);
        throw new Error(`Failed to generate signed URL: ${error.message}`);
      }
      
      signedUrls[filePath] = data.signedUrl;
    }
    
    return signedUrls;
    
  } catch (error) {
    console.error('❌ Error generating signed URLs:', error);
    throw error;
  }
}