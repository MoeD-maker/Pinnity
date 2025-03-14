import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import fs from 'fs';
import path from 'path';

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Define allowed file types
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directory exists
const UPLOAD_DIR = './uploads/business-documents/';
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    return {
      resource_type: 'auto',
      public_id: `business-documents/${Date.now()}-${file.originalname}`,
      allowed_formats: ALLOWED_FORMATS
    };
  }
});

// File filter function
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  // Check file type
  if (!file.mimetype.match(/(jpeg|jpg|png|pdf)$/)) {
    return cb(new Error('Only image and PDF files are allowed'));
  }
  cb(null, true);
};

// Create multer upload middleware with validation
export const uploadBusinessDocs = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter
});

// Helper function to check if cloudinary is properly configured
export function isCloudinaryConfigured(): boolean {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && 
            process.env.CLOUDINARY_API_KEY && 
            process.env.CLOUDINARY_API_SECRET);
}

// Fallback storage for development/testing when cloudinary isn't configured
const diskStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create a fallback middleware that stores files locally
export const localUploadBusinessDocs = multer({
  storage: diskStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: fileFilter
});

// Function to get the appropriate upload middleware based on configuration
export function getUploadMiddleware() {
  return isCloudinaryConfigured() ? uploadBusinessDocs : localUploadBusinessDocs;
}