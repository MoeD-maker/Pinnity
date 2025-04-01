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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [zoom, setZoom] = useState(0.8); // Start slightly zoomed out for better overview
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

  // Forward declaration of the fallback cropping function to fix reference issue
  const getFallbackCroppedImgFunc = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<string> => {
    try {
      // Create a new image element
      const image = new Image();
      image.crossOrigin = "anonymous";
      
      // Wait for the image to load
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = imageSrc;
      });
      
      // Create a canvas to draw the cropped image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Set the canvas size to the crop area
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      
      // Apply rotation if needed
      if (rotation !== 0) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(getRadianAngle(rotation));
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }
      
      // Draw the cropped portion
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
      
      // Restore context if rotated
      if (rotation !== 0) {
        ctx.restore();
      }
      
      // Return the cropped image as data URL
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (err) {
      console.error('Error in fallback crop method:', err);
      throw err;
    }
  };

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
      
      // Validate the result before returning
      if (!croppedImage || croppedImage.length < 100) {
        throw new Error("Invalid cropped image data");
      }
      
      onCropComplete(croppedImage);
    } catch (e) {
      console.error('Error creating cropped image:', e);
      
      // Create a fallback cropped image using a different method
      try {
        console.log("Attempting fallback cropping method...");
        const fallbackCroppedImage = await getFallbackCroppedImgFunc(
          image,
          croppedAreaPixels,
          rotation
        );
        onCropComplete(fallbackCroppedImage);
      } catch (fallbackError) {
        console.error('Fallback crop method failed:', fallbackError);
        // At this point, we need to inform the user about the error
        alert("Failed to process the image. Please try uploading a different image.");
      }
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
      
      <Tabs value="crop" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="crop" className="w-full">Crop & Rotate</TabsTrigger>
        </TabsList>
        
        <TabsContent value="crop" className="space-y-4">
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
          
          {/* Pixel dimension display with requirements */}
          <div className="bg-muted p-2 rounded text-sm text-center">
            <div className="font-medium">Current dimensions: 
              <span className={`ml-1 ${
                dimensionsOK ? (isRecommendedSize ? "text-green-600" : "text-amber-600") : "text-red-600"
              }`}>
                {currentDimensions ? `${currentDimensions.width} × ${currentDimensions.height}px` : "Unknown"}
              </span>
            </div>
            
            {/* Show minimum requirements */}
            <div className="text-xs text-muted-foreground">
              Minimum: {minWidth} × {minHeight}px | Recommended: {recommendedWidth} × {recommendedHeight}px
            </div>
            
            {/* Warning if below minimum */}
            {currentDimensions && !dimensionsOK && (
              <div className="mt-1 text-xs font-medium text-red-600">
                Warning: Image is below the minimum required size
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
                min={0.1}
                max={5}
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
        </TabsContent>
      </Tabs>
      
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

// Fallback method that uses a different approach to crop the image
// This is used when the primary method fails
async function getFallbackCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<string> {
  try {
    // Create a new image element
    const image = new Image();
    image.crossOrigin = "anonymous";
    
    // Wait for the image to load
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = imageSrc;
    });
    
    // Create a canvas to draw the cropped image
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Set the canvas size to the crop area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    
    // Apply rotation if needed
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(getRadianAngle(rotation));
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }
    
    // Draw the cropped portion
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );
    
    // Restore context if rotated
    if (rotation !== 0) {
      ctx.restore();
    }
    
    // Return the cropped image as data URL
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch (err) {
    console.error('Error in fallback crop method:', err);
    throw err;
  }
}