import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { fileTypeFromBuffer } from 'file-type';

/**
 * Secure upload middleware for business registration documents
 * Enforces strict size and MIME type limits
 */

// Allowed MIME types for business documents
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png', 
  'image/jpeg',
  'image/webp'
];

// Maximum file size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Custom error for file validation
export class SecureUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecureUploadError';
  }
}

// File filter for secure uploads
const secureFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new SecureUploadError('Invalid file type'));
  }
  
  // Accept the file
  cb(null, true);
};

// Memory storage for secure uploads
const memoryStorage = multer.memoryStorage();

// Create secure multer instance
export const secureUploadMiddleware = multer({
  storage: memoryStorage,
  fileFilter: secureFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Error handler for secure uploads
export const handleSecureUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SecureUploadError) {
    return res.status(400).json({ error: err.message });
  }
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Invalid file type' });
    }
  }
  
  next(err);
};

// Validate file content matches MIME type
export const validateFileContent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files) {
      return next();
    }
    
    // Validate each uploaded file
    for (const fieldName in files) {
      const fieldFiles = files[fieldName];
      for (const file of fieldFiles) {
        if (!file.buffer) {
          return res.status(400).json({ error: 'Invalid file type' });
        }
        
        // Check file content matches claimed MIME type
        const fileTypeResult = await fileTypeFromBuffer(file.buffer);
        
        if (file.mimetype === 'application/pdf') {
          // For PDFs, check the header
          const pdfHeader = file.buffer.toString('ascii', 0, 8);
          if (!pdfHeader.startsWith('%PDF-')) {
            return res.status(400).json({ error: 'Invalid file type' });
          }
        } else if (file.mimetype.startsWith('image/')) {
          // For images, verify with file-type library
          if (!fileTypeResult || !fileTypeResult.mime.startsWith('image/')) {
            return res.status(400).json({ error: 'Invalid file type' });
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('File content validation error:', error);
    res.status(400).json({ error: 'Invalid file type' });
  }
};