import React, { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ImageCropper from './ImageCropper';
import { X, Upload, Edit2, AlertCircle, Info, FileType, Wand2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ImageUploadWithCropperProps {
  onImageChange: (image: string | null) => void;
  currentImage?: string | null;
  aspectRatio?: number;
  buttonText?: string;
  cropShape?: 'rect' | 'round';
  className?: string;
  imageClassName?: string;
  maxSizeKB?: number;
  minWidth?: number;
  minHeight?: number;
  recommendedWidth?: number;
  recommendedHeight?: number;
  imageType?: 'logo' | 'deal' | 'general';
}

export default function ImageUploadWithCropper({
  onImageChange,
  currentImage = null,
  aspectRatio = 1,
  buttonText = 'Upload Image',
  cropShape = 'rect',
  className = '',
  imageClassName = 'w-40 h-40 object-cover',
  maxSizeKB = 5000, // 5MB default
  minWidth = 300,
  minHeight = 300,
  recommendedWidth = 500,
  recommendedHeight = 500,
  imageType = 'general'
}: ImageUploadWithCropperProps) {
  const [image, setImage] = useState<string | null>(currentImage);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper function to compress an image with progress updates
  const compressImage = async (imageDataUrl: string, quality = 0.8, format = 'image/jpeg'): Promise<string> => {
    setCompressing(true);
    setCompressionProgress(0);
    
    // Calculate original size
    const originalSizeInKB = Math.round(imageDataUrl.length / 1.37 / 1024); // Approximate Base64 to file size conversion
    setOriginalSize(originalSizeInKB);
    
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setCompressing(false);
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw white background (to convert transparent to white)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update progress
        setCompressionProgress(30);
        
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        // Update progress
        setCompressionProgress(60);
        
        // Convert to the desired format with compression
        try {
          const compressedDataUrl = canvas.toDataURL(format, quality);
          
          // Calculate compressed size
          const compressedSizeInKB = Math.round(compressedDataUrl.length / 1.37 / 1024);
          setCompressedSize(compressedSizeInKB);
          
          // Update progress
          setCompressionProgress(100);
          
          // Slight delay to show 100% completion
          setTimeout(() => {
            setCompressing(false);
            resolve(compressedDataUrl);
          }, 300);
        } catch (error) {
          setCompressing(false);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        setCompressing(false);
        reject(error);
      };
      
      img.src = imageDataUrl;
    });
  };
  
  // Helper function to check if an image needs conversion
  const needsConversion = (fileType: string): boolean => {
    // Convert non-web-friendly formats or large files
    const formatsNeedingConversion = ['image/bmp', 'image/tiff', 'image/x-icon'];
    return formatsNeedingConversion.includes(fileType);
  };
  
  // Helper function to automatically fix images that don't meet requirements
  const autoFixImage = async (imageData: string): Promise<string> => {
    setCompressing(true);
    setCompressionProgress(10);
    
    try {
      // Load the image to get dimensions
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for auto-fix'));
        img.src = imageData;
      });
      
      const { width, height } = img;
      setCompressionProgress(30);
      
      // Check if resize is needed
      const needsResize = width < minWidth || height < minHeight;
      
      // If no resize needed and format is already JPEG, just return the original
      if (!needsResize && imageData.startsWith('data:image/jpeg')) {
        setCompressionProgress(100);
        setCompressing(false);
        return imageData;
      }
      
      // Create canvas for processing
      const canvas = document.createElement('canvas');
      
      // Determine new dimensions that meet minimum requirements while maintaining aspect ratio
      let newWidth = width;
      let newHeight = height;
      
      if (needsResize) {
        // Calculate scaling factor
        const scaleX = minWidth / width;
        const scaleY = minHeight / height;
        const scale = Math.max(scaleX, scaleY) * 1.05; // Add 5% to ensure we meet requirements
        
        newWidth = Math.round(width * scale);
        newHeight = Math.round(height * scale);
        
        // For recommended size - scale up to match if the image is too small
        if (recommendedWidth > 0 && recommendedHeight > 0) {
          const recScaleX = recommendedWidth / width;
          const recScaleY = recommendedHeight / height;
          const recScale = Math.max(recScaleX, recScaleY);
          
          // If the recommended scale is significantly larger, use it instead
          if (recScale > scale * 1.5) {
            newWidth = Math.round(width * recScale);
            newHeight = Math.round(height * recScale);
          }
        }
      }
      
      // Set canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Get context and draw image
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Draw white background to eliminate transparency
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      setCompressionProgress(60);
      
      // Draw image at new size
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      setCompressionProgress(80);
      
      // Convert to JPEG with good quality
      const newImageData = canvas.toDataURL('image/jpeg', 0.92);
      
      setCompressionProgress(100);
      
      // Get optimized image size
      const finalSize = Math.round(newImageData.length / 1.37 / 1024);
      setCompressedSize(finalSize);
      
      // Show message about what was done
      let message = '';
      if (needsResize) {
        message += `Image automatically resized from ${width}×${height}px to ${newWidth}×${newHeight}px. `;
      }
      if (!imageData.startsWith('data:image/jpeg')) {
        message += 'Image converted to JPEG format for better compatibility. ';
      }
      setWarning(message.trim());
      
      setCompressing(false);
      return newImageData;
      
    } catch (error) {
      console.error('Error in autoFixImage:', error);
      setCompressing(false);
      setError('Failed to auto-fix image. Please try uploading a different file.');
      return imageData; // Return original on error
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setWarning('');
    setImageDimensions(null);
    setCompressing(false);
    setCompressionProgress(0);
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Store original file size for comparison
      const originalFileSizeKB = Math.round(file.size / 1024);
      setOriginalSize(originalFileSizeKB);
      
      // File size initial check - for extremely large files, show warning but continue
      if (file.size > maxSizeKB * 1024) {
        setWarning(`Image size (${originalFileSizeKB}KB) exceeds the limit of ${maxSizeKB}KB. We'll try to compress it automatically.`);
      }
      
      // File type validation with conversion support
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const convertibleTypes = ['image/bmp', 'image/tiff', 'image/x-icon'];
      const needsFormatConversion = !validImageTypes.includes(file.type);
      
      if (needsFormatConversion && !convertibleTypes.includes(file.type)) {
        setError('Unsupported file format. Please upload a JPEG, PNG, GIF, WEBP, BMP, TIFF, or ICO file.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      
      try {
        // Read file as data URL
        const reader = new FileReader();
        
        // Create a promise to handle the FileReader
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
        
        // Get image dimensions and check if compression or conversion is needed
        const img = new Image();
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            const width = img.width;
            const height = img.height;
            setImageDimensions({ width, height });
            resolve();
          };
          img.onerror = () => {
            reject(new Error('Failed to load image'));
          };
          img.src = fileData;
        });
        
        const { width, height } = img;
        
        // Check minimum dimensions - show warning but don't reject
        // The auto-fix button in the cropper can handle this later
        if (width < minWidth || height < minHeight) {
          setWarning(`Image is smaller than the minimum ${minWidth}×${minHeight}px. You can resize it in the editor.`);
        }
        
        // Determine if we need to compress or convert the image
        const needsCompression = file.size > 2 * 1024 * 1024; // Compress if over 2MB
        const qualityToUse = needsCompression ? 0.8 : 0.92;
        
        let processedImage = fileData;
        
        // Apply compression and/or format conversion if needed
        if (needsCompression || needsFormatConversion) {
          setCompressing(true);
          
          try {
            // Compress and potentially convert the image format
            processedImage = await compressImage(fileData, qualityToUse, 'image/jpeg');
            
            // Show compression result
            const newSize = Math.round(processedImage.length / 1.37 / 1024); // Approximate Base64 to KB
            const percentReduction = Math.round((1 - (newSize / originalFileSizeKB)) * 100);
            
            if (percentReduction > 0) {
              setWarning(`Image automatically compressed by ${percentReduction}% (${originalFileSizeKB}KB → ${newSize}KB)`);
            }
            
            // If format was converted, show a notice
            if (needsFormatConversion) {
              setWarning(prev => prev + ` Image format converted to JPEG.`);
            }
          } catch (compressionError) {
            console.error('Image compression failed:', compressionError);
            // Continue with the original image if compression fails
            setWarning('Automatic compression failed. The original image will be used.');
          } finally {
            setCompressing(false);
          }
        }
        
        // Open the image cropper with the possibly compressed/converted image
        setOriginalImage(processedImage);
        setDialogOpen(true);
      } catch (error) {
        console.error('Error processing image:', error);
        setError('Failed to process the image. Please try another file.');
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    // When crop is complete, set the new image
    setImage(croppedImage);
    setDialogOpen(false);
    
    // Create an image to get the final dimensions after cropping
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      
      // Verify that the cropped image meets minimum dimensions
      if (img.width < minWidth || img.height < minHeight) {
        setError(`Cropped image is too small (${img.width}×${img.height}px). Minimum dimensions: ${minWidth}×${minHeight}px`);
        return;
      }
      
      // Check if below recommended size
      if (img.width < recommendedWidth || img.height < recommendedHeight) {
        setWarning(`Image size (${img.width}×${img.height}px) is smaller than recommended (${recommendedWidth}×${recommendedHeight}px)`);
      } else {
        setWarning('');
      }
      
      // Pass the image to the parent component
      onImageChange(croppedImage);
    };
    img.src = croppedImage;
  };

  const handleCropCancel = () => {
    setDialogOpen(false);
  };

  const removeImage = () => {
    setImage(null);
    setOriginalImage(null);
    onImageChange(null);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const editExistingImage = () => {
    if (image) {
      setOriginalImage(image);
      setDialogOpen(true);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {error && (
        <Alert variant="destructive" className="p-3">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription className="text-sm flex justify-between items-center">
            <span>{error}</span>
            {image && imageDimensions && (imageDimensions.width < minWidth || imageDimensions.height < minHeight) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-2 bg-white border-red-300 text-red-700 hover:bg-red-50"
                      onClick={async () => {
                        if (image) {
                          const fixedImage = await autoFixImage(image);
                          setImage(fixedImage);
                          onImageChange(fixedImage);
                        }
                      }}
                    >
                      <Wand2 className="h-3 w-3 mr-1" /> Auto-Fix
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Resize image to meet minimum requirements</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {warning && (
        <Alert className="bg-amber-50 border-amber-200 p-3">
          <Info className="h-4 w-4 mr-2 text-amber-600" />
          <AlertDescription className="text-sm text-amber-700 flex justify-between items-center">
            <span>{warning}</span>
            {image && imageDimensions && imageDimensions.width < recommendedWidth && imageDimensions.height < recommendedHeight && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-2 bg-white border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={async () => {
                        if (image) {
                          const fixedImage = await autoFixImage(image);
                          setImage(fixedImage);
                          onImageChange(fixedImage);
                        }
                      }}
                    >
                      <Wand2 className="h-3 w-3 mr-1" /> Auto-Fix
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Optimize image for better quality</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {compressing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Optimizing image...</span>
            <span>{compressionProgress}%</span>
          </div>
          <Progress value={compressionProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Original: {originalSize}KB</span>
            {compressedSize > 0 && (
              <span>Compressed: {compressedSize}KB ({Math.round((1 - compressedSize/originalSize) * 100)}% smaller)</span>
            )}
          </div>
        </div>
      )}
      
      {image ? (
        <div className="space-y-2">
          <div className="relative group">
            <img 
              src={image} 
              alt="Uploaded" 
              className={`${imageClassName} rounded-md`} 
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <Button 
                size="icon" 
                variant="secondary"
                onClick={editExistingImage}
                className="h-8 w-8"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="destructive"
                onClick={removeImage}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {imageDimensions && (
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <span className={`inline-flex items-center px-2 py-1 rounded ${
                imageDimensions.width >= recommendedWidth && imageDimensions.height >= recommendedHeight 
                  ? "bg-green-50 text-green-700 border border-green-200" 
                  : imageDimensions.width >= minWidth && imageDimensions.height >= minHeight
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-red-50 text-red-700 border border-red-200"
              }`}>
                {imageDimensions.width} × {imageDimensions.height}px
              </span>
              <span className="ml-2">
                {imageType === 'logo' && "Logo will display at various sizes across the app"}
                {imageType === 'deal' && "Deal images are displayed in feature carousels and listing cards"}
                {imageType === 'general' && "Image will be displayed as shown"}
              </span>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground mt-1">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                imageDimensions && imageDimensions.width >= minWidth && imageDimensions.height >= minHeight 
                  ? "bg-green-600" : "bg-gray-300"
              }`}></div>
              <span>Minimum size: {minWidth}×{minHeight}px</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                imageDimensions && imageDimensions.width >= recommendedWidth && imageDimensions.height >= recommendedHeight 
                  ? "bg-green-600" : "bg-gray-300"
              }`}></div>
              <span>Recommended size: {recommendedWidth}×{recommendedHeight}px</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Button 
            onClick={triggerFileInput} 
            className="w-full h-40 border-dashed border-2 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50"
            variant="outline"
          >
            <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
            <span className="text-sm font-medium">{buttonText}</span>
            <span className="text-xs text-muted-foreground mt-1">
              JPEG, PNG, GIF or WEBP (max. {maxSizeKB / 1000}MB)
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {imageType === 'logo' 
                ? `Square format (1:1) - ${recommendedWidth}×${recommendedHeight}px recommended` 
                : imageType === 'deal' 
                ? `Landscape format (4:3) - ${recommendedWidth}×${recommendedHeight}px recommended` 
                : `Recommended size: ${recommendedWidth}×${recommendedHeight}px`}
            </span>
            <span className="text-xs font-medium text-amber-600 mt-1">
              {imageType === 'logo' 
                ? `Minimum size: ${minWidth}×${minHeight}px` 
                : imageType === 'deal' 
                ? `Minimum size: ${minWidth}×${minHeight}px` 
                : `Minimum size: ${minWidth}×${minHeight}px`}
            </span>
          </Button>
          
          <Alert className="bg-blue-50 border-blue-200 p-3">
            <Info className="h-4 w-4 mr-2 text-blue-500" />
            <AlertDescription className="text-xs text-blue-700">
              {imageType === 'logo' && 
                `Your business logo must be square (1:1 ratio) and at least ${minWidth}×${minHeight}px. For best quality across all app locations, we recommend ${recommendedWidth}×${recommendedHeight}px or larger. The logo will appear in profile pages, deal cards, and navigation bars.`
              }
              {imageType === 'deal' && 
                `Deal images must be in landscape format (4:3 ratio) and at least ${minWidth}×${minHeight}px. For best quality in featured promotions and deal detail pages, we recommend ${recommendedWidth}×${recommendedHeight}px or larger.`
              }
              {imageType === 'general' && 
                `For best quality across all devices, use images that are at least ${recommendedWidth}×${recommendedHeight} pixels.`
              }
              
              <div className="mt-2 pt-2 border-t border-blue-200">
                <p className="font-medium mb-1">Automatic image enhancements:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Images are automatically compressed if larger than 2MB</li>
                  <li>Non-web formats (BMP, TIFF) will be converted to JPEG</li>
                  <li>The Auto-Fix button can resize smaller images to meet requirements</li>
                  <li>Image adjustments like brightness and contrast are available</li>
                  <li>Preview shows how your image will look in different contexts</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {originalImage && (
          <ImageCropper
            key={originalImage} // Add key prop to force remount when image changes
            image={originalImage}
            aspectRatio={aspectRatio}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
            cropShape={cropShape}
            minWidth={minWidth}
            minHeight={minHeight}
            recommendedWidth={recommendedWidth}
            recommendedHeight={recommendedHeight}
            imageType={imageType}
          />
        )}
      </Dialog>
    </div>
  );
}