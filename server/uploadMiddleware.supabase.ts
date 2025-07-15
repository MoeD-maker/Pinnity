import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import sanitizeFilename from 'sanitize-filename';
import { 
  uploadFileToSupabase, 
  STORAGE_CONFIG,
  BUCKET_NAME,
  deleteFileFromSupabase,
  extractFilePathFromUrl
} from './supabaseStorage';

/**
 * Enhanced file upload middleware using Supabase Storage
 * Replaces the Cloudinary-based uploadMiddleware.ts
 */

// File validation errors
export class FileValidationError extends Error {
  public code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = 'FileValidationError';
    this.code = code;
  }
}

export enum UploadErrorCode {
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_NAME_INVALID = 'FILE_NAME_INVALID',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  VIRUS_DETECTED = 'VIRUS_DETECTED',
  CONTENT_MISMATCH = 'CONTENT_MISMATCH'
}

// Constants from original middleware
const ALLOWED_EXTENSIONS = STORAGE_CONFIG.allowedExtensions;
const ALLOWED_MIME_TYPES = STORAGE_CONFIG.allowedMimeTypes;
const DEFAULT_MAX_FILE_SIZE = STORAGE_CONFIG.maxFileSize;

/**
 * Enhanced logging for file upload operations
 */
function logFileUpload(req: Request, file: Express.Multer.File, success: boolean, details?: string) {
  const userId = (req as any).user?.userId || 'anonymous';
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] File Upload - User: ${userId}, File: ${file.originalname}, Success: ${success}, Details: ${details || 'N/A'}`);
  
  if (!success) {
    console.warn(`❌ Upload failed for ${file.originalname}: ${details}`);
  }
}

/**
 * Deep validation of file content to verify it matches claimed type
 */
async function checkFileContent(buffer: Buffer, file: Express.Multer.File): Promise<boolean> {
  try {
    const fileTypeResult = await fileTypeFromBuffer(buffer);
    
    if (!fileTypeResult && buffer.length > 0) {
      if (file.mimetype === 'application/pdf') {
        try {
          const pdfHeader = buffer.toString('ascii', 0, 8);
          if (pdfHeader.startsWith('%PDF-')) {
            const hasEOF = buffer.toString().includes('%%EOF');
            return hasEOF;
          } else {
            console.warn(`Invalid PDF header in file ${file.originalname}`);
            return false;
          }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          console.warn(`PDF validation failed for file ${file.originalname}: ${errMsg}`);
          return false;
        }
      }
      
      console.warn(`Could not verify content type for file: ${file.originalname}`);
      return false;
    }
    
    if (!fileTypeResult) {
      console.warn(`Empty or unrecognized file: ${file.originalname}`);
      return false;
    }
    
    const isAllowedMimeType = ALLOWED_MIME_TYPES.includes(fileTypeResult.mime);
    const declaredMimeMatches = file.mimetype === fileTypeResult.mime;
    
    if (!isAllowedMimeType) {
      console.warn(`Detected MIME type ${fileTypeResult.mime} not in allowed types for file: ${file.originalname}`);
      return false;
    }
    
    if (!declaredMimeMatches) {
      console.warn(`Declared MIME type ${file.mimetype} doesn't match actual type ${fileTypeResult.mime} for file: ${file.originalname}`);
      return false;
    }
    
    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error validating file content for ${file.originalname}:`, errMsg);
    return false;
  }
}

/**
 * Validate file size against limits
 */
function validateFileSize(file: Express.Multer.File): {valid: boolean, error?: FileValidationError} {
  if (file.size > DEFAULT_MAX_FILE_SIZE) {
    const readableSize = Math.round(DEFAULT_MAX_FILE_SIZE / 1024 / 1024);
    return {
      valid: false,
      error: new FileValidationError(
        `File too large. Maximum size is ${readableSize}MB.`,
        UploadErrorCode.FILE_TOO_LARGE
      )
    };
  }
  
  return { valid: true };
}

/**
 * Enhanced file filter with deep content inspection
 */
const secureFileFilter = async (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Check file extension
    const extension = path.extname(file.originalname).toLowerCase().substring(1);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      logFileUpload(req, file, false, `File extension '${extension}' not allowed`);
      return cb(new FileValidationError(
        `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
        UploadErrorCode.INVALID_FILE_TYPE
      ));
    }
    
    // Check MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      logFileUpload(req, file, false, `MIME type '${file.mimetype}' not allowed`);
      return cb(new FileValidationError(
        `File type not allowed. Invalid MIME type: ${file.mimetype}`,
        UploadErrorCode.INVALID_FILE_TYPE
      ));
    }
    
    // Validate file size
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      logFileUpload(req, file, false, sizeValidation.error?.message || 'File too large');
      return cb(sizeValidation.error || new FileValidationError('File too large', UploadErrorCode.FILE_TOO_LARGE));
    }
    
    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.originalname);
    if (sanitizedFilename !== file.originalname) {
      logFileUpload(req, file, false, 'Filename contained potentially malicious characters');
      return cb(new FileValidationError(
        'Filename contains invalid characters',
        UploadErrorCode.FILE_NAME_INVALID
      ));
    }
    
    // File passes all checks
    logFileUpload(req, file, true, 'File passed initial validation');
    cb(null, true);
    
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error in file filter for ${file.originalname}:`, errMsg);
    logFileUpload(req, file, false, errMsg);
    cb(new FileValidationError('File validation failed', UploadErrorCode.UPLOAD_FAILED));
  }
};

/**
 * Configure Multer with memory storage for Supabase upload
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for Supabase upload
  fileFilter: secureFileFilter,
  limits: {
    fileSize: DEFAULT_MAX_FILE_SIZE,
    files: 10 // Maximum number of files per request
  }
});

/**
 * Enhanced middleware that performs additional security checks and uploads to Supabase
 */
export function getUploadMiddleware() {
  return {
    fields: (fields: { name: string; maxCount: number }[]) => {
      return [
        upload.fields(fields),
        async (req: Request, res: Response, next: NextFunction) => {
          try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            
            if (!files || Object.keys(files).length === 0) {
              return next();
            }

            // Process each file group
            for (const [fieldName, fileList] of Object.entries(files)) {
              for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                
                console.log(`🔍 Processing file: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
                
                // Deep content validation
                const isValidContent = await checkFileContent(file.buffer, file);
                if (!isValidContent) {
                  console.error(`❌ Content validation failed for ${file.originalname}`);
                  return res.status(400).json({
                    message: 'File content validation failed',
                    file: file.originalname
                  });
                }

                console.log(`✅ Content validation passed for ${file.originalname}`);
                
                // Upload to Supabase Storage
                try {
                  // For business registration, use 'pending' as temporary folder
                  // Override default 'anonymous' behavior for business registration
                  const userId = 'pending';
                  const result = await uploadFileToSupabase(file, userId, 'business-documents');
                  
                  // Replace file object with Supabase result
                  fileList[i] = {
                    ...file,
                    filename: result.path,
                    path: result.signedUrl,
                    // Add Supabase-specific fields
                    supabasePath: result.path,
                    signedUrl: result.signedUrl
                  } as any;
                  
                  console.log(`✅ File uploaded to Supabase: ${file.originalname} -> ${result.path}`);
                  
                } catch (uploadError) {
                  console.error(`❌ Supabase upload failed for ${file.originalname}:`, uploadError);
                  return res.status(500).json({
                    message: 'File upload failed',
                    file: file.originalname,
                    error: uploadError instanceof Error ? uploadError.message : String(uploadError)
                  });
                }
              }
            }
            
            console.log(`✅ All files processed successfully`);
            next();
            
          } catch (error) {
            console.error('❌ Upload middleware error:', error);
            return res.status(500).json({
              message: 'Upload processing failed',
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      ];
    },
    
    single: (fieldName: string) => {
      return [
        upload.single(fieldName),
        async (req: Request, res: Response, next: NextFunction) => {
          try {
            if (!req.file) {
              return next();
            }

            const file = req.file;
            console.log(`🔍 Processing single file: ${file.originalname}`);
            
            // Deep content validation
            const isValidContent = await checkFileContent(file.buffer, file);
            if (!isValidContent) {
              console.error(`❌ Content validation failed for ${file.originalname}`);
              return res.status(400).json({
                message: 'File content validation failed',
                file: file.originalname
              });
            }

            // Upload to Supabase Storage
            const userId = (req as any).user?.userId;
            const result = await uploadFileToSupabase(file, userId);
            
            // Replace file object with Supabase result
            req.file = {
              ...file,
              filename: result.path,
              path: result.signedUrl,
              supabasePath: result.path,
              signedUrl: result.signedUrl
            } as any;
            
            console.log(`✅ Single file uploaded to Supabase: ${file.originalname} -> ${result.path}`);
            next();
            
          } catch (error) {
            console.error('❌ Single upload middleware error:', error);
            return res.status(500).json({
              message: 'Upload processing failed',
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      ];
    }
  };
}

/**
 * Cleanup utility for failed uploads
 */
export async function cleanupFailedUploads(files: string[]): Promise<void> {
  for (const fileUrl of files) {
    try {
      const filePath = extractFilePathFromUrl(fileUrl);
      if (filePath) {
        await deleteFileFromSupabase(filePath);
        console.log(`🧹 Cleaned up failed upload: ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to cleanup file ${fileUrl}:`, error);
    }
  }
}

// Exports already declared above