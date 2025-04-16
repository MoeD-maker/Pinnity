import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Info, Upload, Edit2, CheckCircle2, AlertTriangle, Wand2, Maximize2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { cn } from '@/lib/utils';

// Define the Area type for cropping
interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SimpleDealImageUploaderProps {
  onImageChange: (image: string | null) => void;
  currentImage?: string | null;
  className?: string;
}

export default function SimpleDealImageUploader({
  onImageChange,
  currentImage = null,
  className = '',
}: SimpleDealImageUploaderProps) {
  // State for the image and dialog
  const [image, setImage] = useState<string | null>(currentImage);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [activeTab, setActiveTab] = useState("crop");
  
  // Cropping related state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [currentDimensions, setCurrentDimensions] = useState<{width: number, height: number} | null>(null);
  const [dimensionsOK, setDimensionsOK] = useState(false);
  const [originalImageDimensions, setOriginalImageDimensions] = useState<{width: number, height: number} | null>(null);
  
  // Constants for image requirements
  const aspectRatio = 4/3; // Deal images use 4:3 ratio
  const minWidth = 600;
  const minHeight = 450;
  const recommendedWidth = 800;
  const recommendedHeight = 600;
  
  // Input ref for file uploader
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to create an image object from a URL
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  // Helper to convert angles to radians
  const getRadianAngle = (degreeValue: number) => {
    return (degreeValue * Math.PI) / 180;
  };

  // Reset crop settings when original image changes
  useEffect(() => {
    if (originalImage) {
      // Reset crop state whenever a new original image is set
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      
      // Get original image dimensions
      const img = new Image();
      img.onload = () => {
        setOriginalImageDimensions({
          width: img.width,
          height: img.height
        });
        
        // Auto-set the zoom to best fit the image to crop area
        // Calculate what zoom level makes the image fit well in the crop area
        const widthRatio = minWidth / img.width;
        const heightRatio = minHeight / img.height;
        const fitZoom = Math.max(widthRatio, heightRatio) * 1.2; // Add 20% extra zoom
        
        // Set a reasonable zoom level - not too zoomed in or out
        setZoom(Math.min(Math.max(fitZoom, 0.8), 3));
      };
      img.src = originalImage;
    }
  }, [originalImage, minWidth, minHeight]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setWarning('');
    
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Basic validation for file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Basic size validation
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setWarning('Image is larger than 5MB, which may cause slow loading');
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setOriginalImage(result);
        setDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
    
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle crop change
  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  // Handle zoom change
  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  // Handle rotation change
  const onRotationChange = useCallback((newRotation: number) => {
    setRotation(newRotation);
  }, []);

  // Handle crop complete
  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
    
    // Calculate actual dimensions
    if (originalImageDimensions) {
      const actualWidth = Math.round((croppedAreaPixels.width / 100) * originalImageDimensions.width);
      const actualHeight = Math.round((croppedAreaPixels.height / 100) * originalImageDimensions.height);
      
      setCurrentDimensions({ width: actualWidth, height: actualHeight });
      
      // Check if dimensions meet minimum requirements
      const meetsMinimum = actualWidth >= minWidth && actualHeight >= minHeight;
      setDimensionsOK(meetsMinimum);
      
      if (!meetsMinimum) {
        setWarning(`Selected area is too small (${actualWidth}×${actualHeight}px). Minimum requirements: ${minWidth}×${minHeight}px.`);
      } else {
        setWarning('');
      }
    }
  }, [originalImageDimensions, minWidth, minHeight]);

  // Get cropped image
  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0,
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    // Calculate proper canvas size for the cropped image
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Create a larger canvas if we need to apply rotation
    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
    
    if (rotation !== 0) {
      // For rotation, use a larger canvas initially
      const rotCanvas = document.createElement('canvas');
      const rotCtx = rotCanvas.getContext('2d');
      
      if (!rotCtx) {
        throw new Error('No 2d context for rotation canvas');
      }
      
      rotCanvas.width = safeArea;
      rotCanvas.height = safeArea;
      
      // Translate and rotate
      rotCtx.translate(safeArea / 2, safeArea / 2);
      rotCtx.rotate(getRadianAngle(rotation));
      rotCtx.translate(-safeArea / 2, -safeArea / 2);
      
      // Draw the rotated image
      rotCtx.drawImage(
        image,
        safeArea / 2 - image.width / 2,
        safeArea / 2 - image.height / 2
      );
      
      // Draw from the rotated canvas to our final canvas
      ctx.drawImage(
        rotCanvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
    } else {
      // No rotation, simpler approach
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
    }

    // Return as data URL (base64 string)
    return canvas.toDataURL('image/jpeg', 0.92);
  };

  // Auto-fit/fix the image
  const autoFixImage = async () => {
    if (!originalImage || !originalImageDimensions) return;
    
    try {
      const img = await createImage(originalImage);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('No 2d context');
      }
      
      // Determine the target dimensions maintaining the 4:3 aspect ratio
      let newWidth = img.width;
      let newHeight = img.height;
      
      // Calculate the current aspect ratio
      const currentRatio = img.width / img.height;
      
      if (currentRatio > aspectRatio) {
        // Image is wider than 4:3, crop the width
        newWidth = img.height * aspectRatio;
        newHeight = img.height;
      } else {
        // Image is taller than 4:3, crop the height
        newWidth = img.width;
        newHeight = img.width / aspectRatio;
      }
      
      // Ensure minimum dimensions
      if (newWidth < minWidth || newHeight < minHeight) {
        const scaleX = minWidth / newWidth;
        const scaleY = minHeight / newHeight;
        const scale = Math.max(scaleX, scaleY);
        
        newWidth = Math.round(newWidth * scale);
        newHeight = Math.round(newHeight * scale);
      }
      
      // Set canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Calculate the center of the original image
      const centerX = img.width / 2;
      const centerY = img.height / 2;
      
      // Calculate the source coordinates to crop from the center
      const sourceX = centerX - (newWidth / 2);
      const sourceY = centerY - (newHeight / 2);
      
      // Draw the cropped portion
      ctx.drawImage(
        img,
        Math.max(0, sourceX),
        Math.max(0, sourceY),
        Math.min(img.width, newWidth),
        Math.min(img.height, newHeight),
        0,
        0,
        newWidth,
        newHeight
      );
      
      // Get the optimized image
      const optimizedImage = canvas.toDataURL('image/jpeg', 0.9);
      
      // Update our image states
      setImage(optimizedImage);
      setPreviewUrl(optimizedImage);
      setCurrentDimensions({ width: newWidth, height: newHeight });
      setDimensionsOK(true);
      setDialogOpen(false);
      
      // Pass the optimized image back to the parent
      onImageChange(optimizedImage);
      
    } catch (error) {
      console.error('Error auto-fixing image:', error);
      setError('Failed to auto-fix image. Please try a different image.');
    }
  };

  // Apply the crop
  const handleCropComplete = async () => {
    if (!originalImage || !croppedAreaPixels) return;
    
    try {
      const croppedImage = await getCroppedImg(
        originalImage,
        croppedAreaPixels,
        rotation
      );
      
      // Set the final image
      setImage(croppedImage);
      setPreviewUrl(croppedImage);
      setDialogOpen(false);
      
      // Pass the cropped image to the parent
      onImageChange(croppedImage);
      
    } catch (error) {
      console.error('Error creating cropped image:', error);
      setError('Failed to crop image. Please try again.');
    }
  };

  // Edit the existing image
  const editImage = () => {
    if (image) {
      setOriginalImage(image);
      setDialogOpen(true);
    }
  };

  // Remove the image
  const removeImage = () => {
    setImage(null);
    setOriginalImage(null);
    setPreviewUrl(null);
    onImageChange(null);
  };

  // Trigger file input
  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Close the dialog
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {/* Upload/Preview area */}
      <div className="relative border-2 border-dashed rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors">
        {image ? (
          // Image preview
          <div className="relative group">
            <img 
              src={image} 
              alt="Deal preview" 
              className="w-full aspect-[4/3] object-cover" 
            />
            
            {/* Overlay with edit/remove buttons */}
            <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={editImage}
                >
                  <Edit2 className="h-4 w-4 mr-1" /> Edit Image
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={removeImage}
                >
                  Remove
                </Button>
              </div>
            </div>
            
            {/* Dimensions indicator */}
            {currentDimensions && (
              <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                {currentDimensions.width} × {currentDimensions.height}px
              </div>
            )}
          </div>
        ) : (
          // Upload prompt
          <div 
            className="flex flex-col items-center justify-center cursor-pointer py-10 px-6 aspect-[4/3]"
            onClick={triggerUpload}
          >
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Upload className="h-8 w-8 text-primary/60" />
            </div>
            <div className="text-center space-y-1 max-w-xs">
              <h3 className="font-medium">Upload Deal Image</h3>
              <p className="text-sm text-muted-foreground">
                Drag and drop or click to upload a deal image (4:3 ratio)
              </p>
              <p className="text-xs text-muted-foreground">
                Recommended size: 800×600px • Min: 600×450px • Max: 5MB
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Error display */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Warning display */}
      {warning && (
        <Alert variant="warning" className="py-2 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" />
          <AlertDescription className="text-sm text-amber-700">{warning}</AlertDescription>
        </Alert>
      )}
      
      {/* Image editor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Deal Image</DialogTitle>
            <DialogDescription>
              Deal image must be landscape (4:3 ratio) and at least 600×450px.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="crop" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-2">
              <TabsTrigger value="crop">Crop & Rotate</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="crop" className="space-y-4">
              {/* Aspect ratio and dimensions indicator */}
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  4:3 (Landscape)
                </Badge>
                
                {currentDimensions && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      {currentDimensions.width} × {currentDimensions.height}px
                    </Badge>
                    
                    {!dimensionsOK ? (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Too small
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Good size
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {/* Cropper area */}
              <div className="relative w-full h-[300px] bg-muted/30">
                {originalImage && (
                  <Cropper
                    image={originalImage}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspectRatio}
                    onCropChange={onCropChange}
                    onCropComplete={onCropComplete}
                    onZoomChange={onZoomChange}
                    onRotationChange={onRotationChange}
                    showGrid={true}
                  />
                )}
                
                {currentDimensions && (
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                    {currentDimensions.width} × {currentDimensions.height}px
                  </div>
                )}
              </div>
              
              {/* Controls */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Zoom</span>
                    <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                  </div>
                  <Slider
                    value={[zoom]}
                    min={0.5}
                    max={3}
                    step={0.01}
                    onValueChange={(value) => setZoom(value[0])}
                  />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Rotate</span>
                    <span className="text-xs text-muted-foreground">{rotation}°</span>
                  </div>
                  <Slider
                    value={[rotation]}
                    min={0}
                    max={360}
                    step={1}
                    onValueChange={(value) => setRotation(value[0])}
                  />
                </div>
              </div>
              
              {/* Auto-fix button */}
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  onClick={autoFixImage} 
                  className="w-full"
                >
                  <Wand2 className="h-4 w-4 mr-2" /> Auto-Fit to 4:3 Ratio
                </Button>
              </div>
              
              {/* Requirements info */}
              <Alert className="bg-blue-50 border-blue-200 py-2">
                <Info className="h-4 w-4 mr-2 text-blue-500" />
                <AlertDescription className="text-xs text-blue-700">
                  Deal images appear in multiple places:
                  <ul className="mt-1 space-y-0.5 list-disc pl-4">
                    <li>Featured carousel (800×600px)</li>
                    <li>Deal cards (400×300px)</li>
                    <li>Deal detail view (800×600px)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-4">
              {/* Preview tabs for different view types */}
              <Tabs defaultValue="featured">
                <TabsList className="grid grid-cols-3 mb-2">
                  <TabsTrigger value="featured">Featured</TabsTrigger>
                  <TabsTrigger value="card">Card</TabsTrigger>
                  <TabsTrigger value="detail">Detail</TabsTrigger>
                </TabsList>
                
                <TabsContent value="featured" className="pt-2">
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-primary/10 text-primary text-center py-1 text-xs font-medium">
                      Featured Carousel View (800×600px)
                    </div>
                    <div className="p-4 flex justify-center bg-muted/20">
                      {originalImage && croppedAreaPixels && (
                        <img 
                          src={previewUrl || originalImage} 
                          alt="Featured preview" 
                          className="h-[200px] w-[266px] object-cover rounded-md"
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="card" className="pt-2">
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-primary/10 text-primary text-center py-1 text-xs font-medium">
                      Deal Card View (400×300px)
                    </div>
                    <div className="p-4 flex justify-center bg-muted/20">
                      {originalImage && croppedAreaPixels && (
                        <div className="border rounded-md overflow-hidden shadow-sm" style={{width: '200px'}}>
                          <img 
                            src={previewUrl || originalImage} 
                            alt="Card preview" 
                            className="h-[150px] w-[200px] object-cover"
                          />
                          <div className="p-2 bg-white">
                            <div className="h-4 w-3/4 bg-gray-200 rounded mb-1"></div>
                            <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="detail" className="pt-2">
                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-primary/10 text-primary text-center py-1 text-xs font-medium">
                      Detail View (800×600px)
                    </div>
                    <div className="p-4 flex justify-center bg-muted/20">
                      {originalImage && croppedAreaPixels && (
                        <img 
                          src={previewUrl || originalImage} 
                          alt="Detail preview" 
                          className="max-h-[250px] max-w-full object-cover rounded-md"
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Update preview */}
              <Button 
                variant="outline" 
                onClick={async () => {
                  if (originalImage && croppedAreaPixels) {
                    try {
                      const previewImage = await getCroppedImg(
                        originalImage,
                        croppedAreaPixels,
                        rotation
                      );
                      setPreviewUrl(previewImage);
                    } catch (error) {
                      console.error('Error generating preview:', error);
                    }
                  }
                }}
                className="w-full"
              >
                <Maximize2 className="h-4 w-4 mr-2" /> Update Preview
              </Button>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleCropComplete} 
              disabled={!dimensionsOK || !croppedAreaPixels}
            >
              Save & Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}