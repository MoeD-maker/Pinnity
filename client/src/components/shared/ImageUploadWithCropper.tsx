import React, { useState, useRef, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import ImageCropper from './ImageCropper';
import { X, Upload, Edit2 } from 'lucide-react';

interface ImageUploadWithCropperProps {
  onImageChange: (image: string | null) => void;
  currentImage?: string | null;
  aspectRatio?: number;
  buttonText?: string;
  cropShape?: 'rect' | 'round';
  className?: string;
  imageClassName?: string;
  maxSizeKB?: number;
}

export default function ImageUploadWithCropper({
  onImageChange,
  currentImage = null,
  aspectRatio = 1,
  buttonText = 'Upload Image',
  cropShape = 'rect',
  className = '',
  imageClassName = 'w-40 h-40 object-cover',
  maxSizeKB = 5000 // 5MB default
}: ImageUploadWithCropperProps) {
  const [image, setImage] = useState<string | null>(currentImage);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError('');
    
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
        setOriginalImage(result);
        setDialogOpen(true);
      };
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setImage(croppedImage);
    setDialogOpen(false);
    onImageChange(croppedImage);
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
        <div className="text-sm text-red-500 font-medium">{error}</div>
      )}
      
      {image ? (
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
      ) : (
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
        </Button>
      )}
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {originalImage && (
          <ImageCropper
            image={originalImage}
            aspectRatio={aspectRatio}
            onCropComplete={handleCropComplete}
            onCancel={handleCropCancel}
            cropShape={cropShape}
          />
        )}
      </Dialog>
    </div>
  );
}