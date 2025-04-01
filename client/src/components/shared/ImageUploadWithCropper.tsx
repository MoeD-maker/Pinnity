import React, { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ImageCropper from './ImageCropper';
import { X, Upload, Edit2, AlertCircle, Info } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    setWarning('');
    setImageDimensions(null);
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // File size validation
      if (file.size > maxSizeKB * 1024) {
        setError(`Image size exceeds the limit of ${maxSizeKB / 1000}MB`);
        e.target.value = '';
        return;
      }
      
      // File type validation
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPEG, PNG, GIF, or WEBP)');
        e.target.value = '';
        return;
      }
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        
        // Check image dimensions
        const img = new Image();
        img.onload = () => {
          const width = img.width;
          const height = img.height;
          setImageDimensions({ width, height });
          
          // Check minimum dimensions
          if (width < minWidth || height < minHeight) {
            setError(`Image is too small. Minimum dimensions: ${minWidth}×${minHeight}px`);
            return;
          }
          
          // Display warning if below recommended size
          if (width < recommendedWidth || height < recommendedHeight) {
            setWarning(`For best quality, use an image of at least ${recommendedWidth}×${recommendedHeight}px`);
          }
          
          // All checks passed, open cropper
          setOriginalImage(result);
          setDialogOpen(true);
        };
        
        img.onerror = () => {
          setError('Failed to load image. Please try another file.');
        };
        
        img.src = result;
      };
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
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
      
      {warning && (
        <Alert className="bg-amber-50 border-amber-200 p-3">
          <Info className="h-4 w-4 mr-2 text-amber-600" />
          <AlertDescription className="text-sm text-amber-700">{warning}</AlertDescription>
        </Alert>
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
            </AlertDescription>
          </Alert>
        </div>
      )}
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {originalImage && (
          <ImageCropper
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