import multer, { FileFilterCallback } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import fs from 'fs';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
import sanitizeFilename from 'sanitize-filename';

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Security-focused configuration
interface FileConfig {
  extensions: string[];
  mimeTypes: string[];
  maxSize: number; // in bytes
  category: 'image' | 'document';
}

// Define file type configurations with size limits by type
const FILE_CONFIGS: { [key: string]: FileConfig } = {
  'jpg': {
    extensions: ['jpg', 'jpeg'],
    mimeTypes: ['image/jpeg'],
    maxSize: 5 * 1024 * 1024, // 5MB for JPEGs
    category: 'image'
  },
  'png': {
    extensions: ['png'],
    mimeTypes: ['image/png'],
    maxSize: 5 * 1024 * 1024, // 5MB for PNGs
    category: 'image'
  },
  'webp': {
    extensions: ['webp'],
    mimeTypes: ['image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB for WebP
    category: 'image'
  },
  'gif': {
    extensions: ['gif'],
    mimeTypes: ['image/gif'],
    maxSize: 5 * 1024 * 1024, // 5MB for GIFs
    category: 'image'
  },
  'pdf': {
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    maxSize: 5 * 1024 * 1024, // 5MB for PDFs
    category: 'document'
  }
};

// Flatten allowed formats for quick lookup
const ALLOWED_EXTENSIONS = Object.values(FILE_CONFIGS).flatMap(config => config.extensions);
const ALLOWED_MIME_TYPES = Object.values(FILE_CONFIGS).flatMap(config => config.mimeTypes);
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB absolute maximum

// Security logging configuration
const UPLOAD_LOG_DIR = './logs/uploads/';
if (!fs.existsSync(UPLOAD_LOG_DIR)) {
  fs.mkdirSync(UPLOAD_LOG_DIR, { recursive: true });
}

// Error codes for client-friendly errors
enum UploadErrorCode {
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  MALICIOUS_CONTENT = 'MALICIOUS_CONTENT',
  INVALID_FILE_STRUCTURE = 'INVALID_FILE_STRUCTURE',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  FILE_NAME_INVALID = 'FILE_NAME_INVALID'
}

// Custom error class with error codes
class FileValidationError extends Error {
  code: UploadErrorCode;
  
  constructor(message: string, code: UploadErrorCode) {
    super(message);
    this.name = 'FileValidationError';
    this.code = code;
  }
}

// Ensure upload directory exists
const UPLOAD_DIR = './uploads/business-documents/';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Log upload attempts to a secure log file
 * @param req Request object
 * @param file File being uploaded
 * @param success Whether validation passed
 * @param errorDetail Optional error details
 */
function logFileUpload(req: Request, file: Express.Multer.File, success: boolean, errorDetail?: string): void {
  const userId = req.user?.userId || 'unauthenticated';
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId,
    clientIp,
    userAgent: userAgent.substring(0, 200), // Limit length
    fileName: sanitizeFilename(file.originalname),
    fileSize: file.size,
    fileType: file.mimetype,
    success,
    errorDetail: errorDetail ? errorDetail.substring(0, 500) : undefined // Limit length
  };
  
  // Write to log file - append mode
  const logPath = path.join(UPLOAD_LOG_DIR, `upload_log_${new Date().toISOString().split('T')[0]}.log`);
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  
  // Also log to console with appropriate level
  if (success) {
    console.info(`[UPLOAD] File received: ${file.originalname}, size: ${file.size} bytes, user: ${userId}`);
  } else {
    console.warn(`[UPLOAD] Rejected file: ${file.originalname}, error: ${errorDetail}, user: ${userId}, IP: ${clientIp}`);
  }
}

/**
 * Deep validation of file content to verify it matches claimed type
 * @param buffer File buffer to check
 * @param file File metadata from multer
 * @returns Promise resolving to boolean indicating validity
 */
async function checkFileContent(buffer: Buffer, file: Express.Multer.File): Promise<boolean> {
  try {
    // Use file-type to detect MIME type from actual content
    const fileTypeResult = await fileTypeFromBuffer(buffer);
    
    // If we couldn't detect a type but the file has content, it's suspicious
    if (!fileTypeResult && buffer.length > 0) {
      if (file.mimetype === 'application/pdf') {
        // For PDFs, try more specific validation
        try {
          // Use a more robust PDF validation approach
          // This tries to parse the PDF structure without relying on test files
          const pdfHeader = buffer.toString('ascii', 0, 8);
          if (pdfHeader.startsWith('%PDF-')) {
            // It has a valid PDF header, let's try to parse it
            try {
              // Create a simple PDF parser that doesn't rely on test files
              const hasEOF = buffer.toString().includes('%%EOF');
              return hasEOF; // A valid PDF should have an EOF marker
            } catch (err) {
              console.warn(`PDF structure validation failed: ${err instanceof Error ? err.message : String(err)}`);
              return false;
            }
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
    
    // If no result and empty file, assume it's invalid
    if (!fileTypeResult) {
      console.warn(`Empty or unrecognized file: ${file.originalname}`);
      return false;
    }
    
    // Check if detected type matches allowed types
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
 * Check for potentially malicious content in PDFs
 * @param buffer PDF file buffer
 * @param file File metadata from multer
 * @returns Promise resolving to validation result
 */
async function validatePdfSecurity(buffer: Buffer, file: Express.Multer.File): Promise<{valid: boolean, reason?: string}> {
  try {
    // Only process PDFs
    if (file.mimetype !== 'application/pdf') {
      return { valid: true };
    }
    
    // Convert buffer to string for simple pattern checking
    const pdfText = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
    
    // Check for JavaScript which can be malicious in PDFs
    if (pdfText.includes('/JavaScript') || 
        pdfText.includes('/JS ') || 
        pdfText.includes('/Launch')) {
      return { 
        valid: false, 
        reason: 'PDF contains potentially malicious JavaScript' 
      };
    }
    
    // Check for potentially dangerous embedded files
    if (pdfText.includes('/EmbeddedFile') || 
        pdfText.includes('/FileAttachment')) {
      return { 
        valid: false, 
        reason: 'PDF contains embedded files which are not allowed' 
      };
    }
    
    // Check for potential XFA forms (can contain code)
    if (pdfText.includes('/XFA')) {
      return { 
        valid: false, 
        reason: 'PDF contains XFA forms which are not allowed'
      };
    }
    
    return { valid: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Error validating PDF security for ${file.originalname}:`, errMsg);
    return { 
      valid: false, 
      reason: 'Could not validate PDF structure' 
    };
  }
}

/**
 * Validate file size against limits for its specific type
 * @param file File metadata from multer
 * @returns Validation result with optional error
 */
function validateFileSize(file: Express.Multer.File): {valid: boolean, error?: FileValidationError} {
  // Get the specific file type configuration
  const extension = path.extname(file.originalname).toLowerCase().substring(1);
  
  // Find matching file type config
  let fileConfig: FileConfig | undefined;
  for (const config of Object.values(FILE_CONFIGS)) {
    if (config.extensions.includes(extension) || config.mimeTypes.includes(file.mimetype)) {
      fileConfig = config;
      break;
    }
  }
  
  // If no specific config found, use default max size
  const maxSize = fileConfig?.maxSize || DEFAULT_MAX_FILE_SIZE;
  
  if (file.size > maxSize) {
    const readableSize = Math.round(maxSize / 1024 / 1024);
    return {
      valid: false,
      error: new FileValidationError(
        `File too large. Maximum size for this file type is ${readableSize}MB.`,
        UploadErrorCode.FILE_TOO_LARGE
      )
    };
  }
  
  return { valid: true };
}

// Enhanced file filter with deep content inspection
const secureFileFilter = async (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  try {
    // Step 1: Check if the file extension is allowed
    const extension = path.extname(file.originalname).toLowerCase().substring(1);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      logFileUpload(req, file, false, `File extension '${extension}' not allowed`);
      return cb(new FileValidationError(
        `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
        UploadErrorCode.INVALID_FILE_TYPE
      ));
    }
    
    // Step 2: Check if the MIME type is allowed
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      logFileUpload(req, file, false, `MIME type '${file.mimetype}' not allowed`);
      return cb(new FileValidationError(
        `File type not allowed. Invalid MIME type: ${file.mimetype}`,
        UploadErrorCode.INVALID_FILE_TYPE
      ));
    }
    
    // Step 3: Validate file size
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      logFileUpload(req, file, false, sizeValidation.error?.message || 'File too large');
      // Ensure we always pass a valid Error to the callback
      return cb(sizeValidation.error || new FileValidationError('File too large', UploadErrorCode.FILE_TOO_LARGE));
    }
    
    // Step 4: Sanitize filename to prevent path traversal and injection attacks
    const sanitizedFilename = sanitizeFilename(file.originalname);
    if (sanitizedFilename !== file.originalname) {
      logFileUpload(req, file, false, 'Filename contained potentially malicious characters');
      return cb(new FileValidationError(
        'Filename contains invalid characters',
        UploadErrorCode.FILE_NAME_INVALID
      ));
    }
    
    // Success path: Accept the file
    logFileUpload(req, file, true);
    cb(null, true);
  } catch (error) {
    // Handle unexpected errors
    console.error(`Unexpected error in file filter for ${file.originalname}:`, error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    logFileUpload(req, file, false, `Unexpected error: ${errorMessage}`);
    cb(new FileValidationError('Error processing file', UploadErrorCode.PROCESSING_ERROR));
  }
};

// Configure Cloudinary storage with enhanced security
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    const sanitizedFilename = sanitizeFilename(file.originalname);
    return {
      resource_type: 'auto',
      public_id: `business-documents/${Date.now()}-${sanitizedFilename}`,
      allowed_formats: ALLOWED_EXTENSIONS,
      // Add validation tags for tracking
      tags: ['business_verification', `user_${req.user?.userId || 'anonymous'}`]
    };
  }
});

// Middleware to validate file content before it gets to Cloudinary or local storage
export function validateFileContentMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if no file is present
    if (!req.file) {
      return next();
    }
    
    try {
      // Read the file buffer
      const buffer = req.file.buffer || await fs.promises.readFile(req.file.path);
      
      // Validate file content matches claimed type
      const isValidContent = await checkFileContent(buffer, req.file);
      if (!isValidContent) {
        // Remove the temp file if it exists on disk
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        logFileUpload(req, req.file, false, 'File content does not match claimed type');
        return res.status(400).json({
          error: {
            code: UploadErrorCode.INVALID_FILE_STRUCTURE,
            message: 'File content validation failed'
          }
        });
      }
      
      // For PDFs, validate for potentially malicious content
      if (req.file.mimetype === 'application/pdf') {
        const pdfValidation = await validatePdfSecurity(buffer, req.file);
        if (!pdfValidation.valid) {
          // Remove the temp file if it exists on disk
          if (req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          
          logFileUpload(req, req.file, false, `Malicious PDF content: ${pdfValidation.reason}`);
          return res.status(400).json({
            error: {
              code: UploadErrorCode.MALICIOUS_CONTENT,
              message: pdfValidation.reason || 'PDF security check failed'
            }
          });
        }
      }
      
      // All validations passed
      next();
    } catch (error) {
      // Handle unexpected errors
      console.error(`Error in content validation for ${req.file.originalname}:`, error);
      
      // Remove the temp file if it exists on disk
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      logFileUpload(req, req.file, false, `Validation error: ${errorMessage}`);
      res.status(500).json({
        error: {
          code: UploadErrorCode.PROCESSING_ERROR,
          message: 'Error processing file'
        }
      });
    }
  };
}

// Create multer upload middleware with enhanced validation
export const uploadBusinessDocs = multer({
  storage: storage,
  fileFilter: secureFileFilter,
  // We handle size validation in our own filter for type-specific limits
  limits: { fileSize: DEFAULT_MAX_FILE_SIZE * 2 } // Failsafe limit
});

// Helper function to check if cloudinary is properly configured
export function isCloudinaryConfigured(): boolean {
  try {
    return !!(process.env.CLOUDINARY_CLOUD_NAME && 
              process.env.CLOUDINARY_API_KEY && 
              process.env.CLOUDINARY_API_SECRET);
  } catch (error) {
    console.warn('Error checking Cloudinary configuration:', error);
    return false;
  }
}

// Enhanced local disk storage for development/testing
const diskStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Sanitize the filename
    const sanitizedFilename = sanitizeFilename(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(sanitizedFilename);
    const filename = path.basename(sanitizedFilename, extension);
    
    // Remove special characters and limit the base filename length
    const safeFilename = filename.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 100);
    cb(null, `${safeFilename}-${uniqueSuffix}${extension}`);
  }
});

// Create a fallback middleware that stores files locally with enhanced security
export const localUploadBusinessDocs = multer({
  storage: diskStorage,
  fileFilter: secureFileFilter,
  // We handle size validation in our own filter for type-specific limits
  limits: { fileSize: DEFAULT_MAX_FILE_SIZE * 2 } // Failsafe limit
});

// Function to get the appropriate upload middleware based on configuration
export function getUploadMiddleware() {
  return isCloudinaryConfigured() ? uploadBusinessDocs : localUploadBusinessDocs;
}

// Error handler specifically for file upload errors
export function handleUploadErrors() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof FileValidationError) {
      return res.status(400).json({
        error: {
          code: err.code,
          message: err.message
        }
      });
    }
    
    if (err instanceof multer.MulterError) {
      // Map Multer errors to our error codes
      let code = UploadErrorCode.PROCESSING_ERROR;
      if (err.code === 'LIMIT_FILE_SIZE') {
        code = UploadErrorCode.FILE_TOO_LARGE;
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        code = UploadErrorCode.INVALID_FILE_TYPE;
      }
      
      return res.status(400).json({
        error: {
          code,
          message: err.message
        }
      });
    }
    
    // For any other errors, pass to the next error handler
    next(err);
  };
}