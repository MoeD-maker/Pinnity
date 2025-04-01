import React, { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
// Define the Area type locally to avoid import issues
interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Info, Lock } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  aspectRatio?: number;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
  cropShape?: 'rect' | 'round';
  minWidth?: number;
  minHeight?: number;
  recommendedWidth?: number;
  recommendedHeight?: number;
  imageType?: 'logo' | 'deal' | 'general';
}

export default function ImageCropper({ 
  image, 
  aspectRatio = 1, 
  onCropComplete, 
  onCancel,
  cropShape = 'rect',
  minWidth = 300,
  minHeight = 300,
  recommendedWidth = 500,
  recommendedHeight = 500,
  imageType = 'general'
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [currentDimensions, setCurrentDimensions] = useState<{width: number, height: number} | null>(null);
  const [dimensionsOK, setDimensionsOK] = useState(false);
  const [isRecommendedSize, setIsRecommendedSize] = useState(false);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{width: number, height: number} | null>(null);
  
  // Get original image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setOriginalImageDimensions({
        width: img.width,
        height: img.height
      });
    };
    img.src = image;
  }, [image]);
  
  // Get aspect ratio label
  const getAspectRatioLabel = () => {
    if (aspectRatio === 1) return "1:1 (Square)";
    if (aspectRatio === 4/3) return "4:3 (Landscape)";
    if (aspectRatio === 16/9) return "16:9 (Widescreen)";
    return `${aspectRatio}:1`;
  };
  
  // Determine the requirement text based on image type
  const getRequirementsText = () => {
    if (imageType === 'logo') {
      return `Logo must be square (1:1 ratio) and at least ${minWidth}×${minHeight}px.`;
    } else if (imageType === 'deal') {
      return `Deal image must be landscape (4:3 ratio) and at least ${minWidth}×${minHeight}px.`;
    } else {
      return `Image must be at least ${minWidth}×${minHeight}px.`;
    }
  };

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onRotationChange = useCallback((newRotation: number) => {
    setRotation(newRotation);
  }, []);

  const onCropAreaChange = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
    
    // Calculate actual pixel dimensions after cropping
    if (originalImageDimensions) {
      // Factor in the original image dimensions to get actual pixel values
      const widthRatio = originalImageDimensions.width / 100;
      const heightRatio = originalImageDimensions.height / 100;
      
      const actualWidth = Math.round(croppedAreaPixels.width * widthRatio);
      const actualHeight = Math.round(croppedAreaPixels.height * heightRatio);
      
      setCurrentDimensions({ width: actualWidth, height: actualHeight });
      
      // Check if dimensions meet minimum requirements
      const meetsMinimum = actualWidth >= minWidth && actualHeight >= minHeight;
      setDimensionsOK(meetsMinimum);
      
      // Check if dimensions meet recommended requirements
      const meetsRecommended = actualWidth >= recommendedWidth && actualHeight >= recommendedHeight;
      setIsRecommendedSize(meetsRecommended);
    }
  }, [originalImageDimensions, minWidth, minHeight, recommendedWidth, recommendedHeight]);

  const createCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels) return;
    
    // Verify dimensions before allowing crop
    if (!dimensionsOK) {
      return; // Button should be disabled anyway, but extra safety
    }

    try {
      const croppedImage = await getCroppedImg(
        image,
        croppedAreaPixels,
        rotation
      );
      onCropComplete(croppedImage);
    } catch (e) {
      console.error('Error creating cropped image:', e);
    }
  }, [croppedAreaPixels, rotation, image, onCropComplete, dimensionsOK]);

  return (
    <DialogContent className="sm:max-w-md lg:max-w-lg xl:max-w-xl">
      <DialogHeader>
        <DialogTitle>Edit Image</DialogTitle>
        <DialogDescription>
          {getRequirementsText()}
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <Lock className="h-3 w-3 mr-1" /> 
              {getAspectRatioLabel()}
            </Badge>
            
            {currentDimensions && (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                {currentDimensions.width} × {currentDimensions.height}px
              </Badge>
            )}
          </div>
          
          {currentDimensions && (
            <div>
              {!dimensionsOK && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Too small
                </Badge>
              )}
              
              {dimensionsOK && !isRecommendedSize && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  <Info className="h-3 w-3 mr-1" /> OK
                </Badge>
              )}
              
              {isRecommendedSize && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Perfect
                </Badge>
              )}
            </div>
          )}
        </div>
        
        <div className="relative w-full h-64 sm:h-80">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspectRatio}
            cropShape={cropShape}
            onCropChange={onCropChange}
            onCropComplete={onCropAreaChange}
            onZoomChange={onZoomChange}
            onRotationChange={onRotationChange}
            showGrid={true}
          />
          
          {currentDimensions && (
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {currentDimensions.width} × {currentDimensions.height}px
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zoom</span>
              <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
            </div>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={(value) => setZoom(value[0])}
              className="py-2"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rotate</span>
              <span className="text-sm text-muted-foreground">{rotation}°</span>
            </div>
            <Slider
              value={[rotation]}
              min={0}
              max={360}
              step={1}
              onValueChange={(value) => setRotation(value[0])}
              className="py-2"
            />
          </div>
        </div>
        
        {currentDimensions && !dimensionsOK && (
          <Alert variant="destructive" className="p-3">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription className="text-sm">
              Current selection is too small ({currentDimensions.width}×{currentDimensions.height}px). 
              Minimum required is {minWidth}×{minHeight}px.
            </AlertDescription>
          </Alert>
        )}
        
        {currentDimensions && dimensionsOK && !isRecommendedSize && (
          <Alert className="p-3 bg-amber-50 border-amber-200">
            <Info className="h-4 w-4 mr-2 text-amber-600" />
            <AlertDescription className="text-sm text-amber-700">
              Current size is acceptable but smaller than recommended.
              For best quality, use at least {recommendedWidth}×{recommendedHeight}px.
            </AlertDescription>
          </Alert>
        )}
        
        {imageType === 'logo' && (
          <Alert className="p-3 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 mr-2 text-blue-500" />
            <AlertDescription className="text-xs text-blue-700">
              Your logo will appear in multiple places across the app in different sizes:
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Profile page (160×160px)</li>
                <li>Deal cards (40×40px)</li>
                <li>Navigation bar (32×32px)</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {imageType === 'deal' && (
          <Alert className="p-3 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 mr-2 text-blue-500" />
            <AlertDescription className="text-xs text-blue-700">
              Deal images appear in various sizes across the app:
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Featured carousel (800×600px)</li>
                <li>Deal cards (400×300px)</li>
                <li>Deal detail view (800×600px)</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </div>
      
      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="button" 
          onClick={createCroppedImage}
          disabled={!dimensionsOK}
          className={!dimensionsOK ? "opacity-50 cursor-not-allowed" : ""}
        >
          Apply Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// Helper function to create cropped image from canvas
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    // Important for handling CORS issues
    image.crossOrigin = 'anonymous';
    image.src = url;
  });

function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No 2d context');
  }

  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  // set canvas size to match the bounding box
  canvas.width = safeArea;
  canvas.height = safeArea;

  // translate canvas context to center of the canvas
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);

  // draw rotated image and extract cropped area
  ctx.drawImage(
    image,
    safeArea / 2 - image.width * 0.5,
    safeArea / 2 - image.height * 0.5
  );
  
  const data = ctx.getImageData(0, 0, safeArea, safeArea);

  // set canvas width to the final desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  
  // draw cropped image
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
  );

  // Return as data URL (base64 string)
  return canvas.toDataURL('image/jpeg');
}