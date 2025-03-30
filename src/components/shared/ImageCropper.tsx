import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Area } from 'react-easy-crop/types';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ImageCropperProps {
  image: string;
  aspectRatio?: number;
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
  cropShape?: 'rect' | 'round';
}

export default function ImageCropper({ 
  image, 
  aspectRatio = 1, 
  onCropComplete, 
  onCancel,
  cropShape = 'rect'
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [activeTab, setActiveTab] = useState<string>('crop');
  
  // Predefined aspect ratios for common use cases
  const aspectRatios = {
    '1:1': 1,
    '4:3': 4/3,
    '16:9': 16/9,
    '3:2': 3/2,
    '3:4': 3/4,
    '2:3': 2/3,
  };
  
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<number>(aspectRatio);

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
  }, []);

  const createCroppedImage = useCallback(async () => {
    if (!croppedAreaPixels) return;

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
  }, [croppedAreaPixels, rotation, image, onCropComplete]);

  const handleAspectRatioChange = (ratio: number) => {
    setSelectedAspectRatio(ratio);
  };

  return (
    <DialogContent className="sm:max-w-md lg:max-w-lg xl:max-w-xl">
      <DialogHeader>
        <DialogTitle>Edit Image</DialogTitle>
        <DialogDescription>
          Adjust your image to fit perfectly.
        </DialogDescription>
      </DialogHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="crop">Crop & Rotate</TabsTrigger>
          <TabsTrigger value="ratios">Aspect Ratio</TabsTrigger>
        </TabsList>
        
        <TabsContent value="crop" className="space-y-4">
          <div className="relative w-full h-64 sm:h-80">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={selectedAspectRatio}
              cropShape={cropShape}
              onCropChange={onCropChange}
              onCropComplete={onCropAreaChange}
              onZoomChange={onZoomChange}
              onRotationChange={onRotationChange}
            />
          </div>
          
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
        </TabsContent>
        
        <TabsContent value="ratios" className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(aspectRatios).map(([name, ratio]) => (
              <Button
                key={name}
                variant={selectedAspectRatio === ratio ? "default" : "outline"}
                onClick={() => handleAspectRatioChange(ratio)}
                className="w-full"
              >
                {name}
              </Button>
            ))}
          </div>
          <div className="relative w-full h-64 sm:h-80">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={selectedAspectRatio}
              cropShape={cropShape}
              onCropChange={onCropChange}
              onCropComplete={onCropAreaChange}
              onZoomChange={onZoomChange}
              onRotationChange={onRotationChange}
            />
          </div>
        </TabsContent>
      </Tabs>
      
      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={createCroppedImage}>
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