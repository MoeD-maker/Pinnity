import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Edit2, X, ZoomIn, ZoomOut, MoveHorizontal, MoveVertical, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

interface BusinessLogoUploadProps {
  currentImage: string | null;
  onImageChange: (fileOrBase64: File | string | null) => void;
}

// Image adjustment state interface
interface ImageAdjustments {
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

export default function BusinessLogoUpload({ currentImage, onImageChange }: BusinessLogoUploadProps) {
  // Main states
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  
  // Image adjustment states
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    rotation: 0
  });
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Reset adjustments when a new file is selected
  useEffect(() => {
    if (selectedFile) {
      setAdjustments({
        scale: 1.0,
        offsetX: 0,
        offsetY: 0,
        rotation: 0
      });
    }
  }, [selectedFile]);

  /**
   * Handle file input change
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  /**
   * Handle file drop
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  /**
   * Drag over handler
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  /**
   * Drag leave handler
   */
  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  /**
   * Validate and process the selected file
   */
  const validateAndProcessFile = (file: File) => {
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPG, PNG, GIF, or WEBP image",
        variant: "destructive"
      });
      return;
    }

    // Store the file
    setSelectedFile(file);
    
    // Read the file
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewUrl(event.target.result as string);
        setIsEditorOpen(true);
      }
    };
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read the image file. Please try again.",
        variant: "destructive"
      });
    };
    reader.readAsDataURL(file);
  };

  /**
   * Update a specific adjustment value
   */
  const updateAdjustment = (type: keyof ImageAdjustments, value: number) => {
    setAdjustments(prev => ({
      ...prev,
      [type]: value
    }));
  };

  /**
   * Process and save the image
   */
  const handleSaveImage = async () => {
    if (!selectedFile || !previewUrl) return;
    
    setIsUploading(true);
    
    try {
      // Create a new image from the preview URL
      const img = new Image();
      
      // Set up a promise to handle the image loading
      const processedImage = await new Promise<string | null>((resolve) => {
        img.onload = () => {
          // Create a square canvas with fixed dimensions
          const canvas = document.createElement('canvas');
          canvas.width = 500;  // Final output size
          canvas.height = 500;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          
          // Fill with white background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Get the smaller dimension to maintain aspect ratio
          const minDimension = Math.min(img.width, img.height);
          
          // Calculate dimensions for the CSS-style transformation we want to match
          // Determine the size that will be equivalent to our preview image size
          // when applying adjustments.scale
          const originalScale = 1 / adjustments.scale;
          const scaledSize = minDimension * originalScale;
          
          // Calculate crop area based on scale and offsets
          // This mimics the CSS transform behavior
          const cropSize = scaledSize;
          
          // Center point calculations
          const centerPointX = img.width / 2;
          const centerPointY = img.height / 2;
          
          // Adjust center point based on offset (converted from CSS px to image px)
          // We invert the offset direction to match CSS transform behavior
          const adjustedCenterX = centerPointX - (adjustments.offsetX / adjustments.scale);
          const adjustedCenterY = centerPointY - (adjustments.offsetY / adjustments.scale);
          
          // Calculate top-left corner of crop area
          const cropX = adjustedCenterX - (cropSize / 2);
          const cropY = adjustedCenterY - (cropSize / 2);
          
          // Save canvas state
          ctx.save();
          
          // Move to center for rotation
          ctx.translate(canvas.width / 2, canvas.height / 2);
          
          // Apply rotation
          ctx.rotate(adjustments.rotation * Math.PI / 180);
          
          // Draw the image with the same crop and scaling as in the preview
          ctx.drawImage(
            img,
            cropX, cropY, cropSize, cropSize, // Source: exactly match the preview crop
            -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height // Destination: fill canvas
          );
          
          // Restore canvas state
          ctx.restore();
          
          // Convert to PNG for optimal quality
          resolve(canvas.toDataURL('image/png'));
        };
        
        img.onerror = () => {
          resolve(null);
        };
        
        img.src = previewUrl;
      });
      
      // Handle the processed image
      if (processedImage) {
        // Update state and notify parent
        setPreviewUrl(processedImage);
        onImageChange(processedImage);
        
        toast({
          title: "Success",
          description: "Your business logo has been updated.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to process the image. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
      console.error('Error processing image:', error);
    } finally {
      setIsEditorOpen(false);
      setIsUploading(false);
    }
  };

  /**
   * Remove the current image
   */
  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    onImageChange(null);
  };

  /**
   * Generate a CSS transform string based on current adjustments
   */
  const getImageTransform = () => {
    return `scale(${adjustments.scale}) 
            translate(${adjustments.offsetX / adjustments.scale}px, ${adjustments.offsetY / adjustments.scale}px) 
            rotate(${adjustments.rotation}deg)`;
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
      />
      
      {/* Image preview or upload area */}
      {previewUrl ? (
        <div className="relative group aspect-square w-40 h-40 mx-auto">
          <img 
            src={previewUrl} 
            alt="Business logo" 
            className="w-full h-full object-contain rounded-md border"
          />
          {/* Hover overlay with actions */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button 
              size="icon" 
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              title="Change logo"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="destructive"
              onClick={handleRemoveImage}
              title="Remove logo"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div 
          className={`aspect-square max-w-[250px] mx-auto border-2 ${isDragOver ? 'border-[#00796B]' : 'border-dashed border-gray-300'} 
                    rounded-lg p-6 text-center transition-colors`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center h-full">
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <h3 className="text-sm font-medium mb-1">Upload Your Business Logo</h3>
            <p className="text-xs text-muted-foreground mb-2">Drag and drop or click to browse</p>
            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
              Square format (1:1) recommended
            </Badge>
          </div>
        </div>
      )}
      
      {/* Editor dialog with adjustment controls */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Adjust Your Logo</DialogTitle>
          
          <div className="mt-4 flex flex-col items-center">
            {selectedFile && previewUrl && (
              <>
                {/* Main preview with adjusted position */}
                <div className="relative mb-4">
                  <div className="w-[250px] h-[250px] overflow-hidden border-2 border-gray-200 rounded-md bg-gray-50 flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Logo preview"
                        className="max-w-[80%] max-h-[80%] object-contain origin-center transition-transform"
                        style={{ transform: getImageTransform() }}
                      />
                    </div>
                  </div>
                </div>

                {/* Adjustment controls */}
                <div className="w-full bg-gray-100 p-4 rounded-md mb-4">
                  <h4 className="text-sm font-medium mb-3">Adjust Your Logo</h4>
                  
                  {/* Zoom control */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <ZoomOut className="h-4 w-4 mr-1" />
                        <span className="text-xs">Zoom</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(adjustments.scale * 100)}%</span>
                    </div>
                    <Slider 
                      value={[adjustments.scale]} 
                      min={0.5} 
                      max={2} 
                      step={0.05} 
                      onValueChange={([value]) => updateAdjustment('scale', value)} 
                    />
                  </div>
                  
                  {/* Horizontal position */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <MoveHorizontal className="h-4 w-4 mr-1" />
                        <span className="text-xs">Horizontal Position</span>
                      </div>
                    </div>
                    <Slider 
                      value={[adjustments.offsetX]} 
                      min={-50} 
                      max={50} 
                      step={1} 
                      onValueChange={([value]) => updateAdjustment('offsetX', value)} 
                    />
                  </div>
                  
                  {/* Vertical position */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <MoveVertical className="h-4 w-4 mr-1" />
                        <span className="text-xs">Vertical Position</span>
                      </div>
                    </div>
                    <Slider 
                      value={[adjustments.offsetY]} 
                      min={-50} 
                      max={50} 
                      step={1} 
                      onValueChange={([value]) => updateAdjustment('offsetY', value)} 
                    />
                  </div>
                  
                  {/* Rotation control */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <RotateCw className="h-4 w-4 mr-1" />
                        <span className="text-xs">Rotation</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{adjustments.rotation}°</span>
                    </div>
                    <Slider 
                      value={[adjustments.rotation]} 
                      min={-180} 
                      max={180} 
                      step={5} 
                      onValueChange={([value]) => updateAdjustment('rotation', value)} 
                    />
                  </div>
                </div>
                
                {/* Size previews */}
                <div className="w-full bg-gray-50 p-4 rounded-md mb-4">
                  <h4 className="text-sm font-medium mb-3 text-center">Preview at different sizes</h4>
                  <div className="flex items-end justify-between">
                    {/* Small - Deal Card */}
                    <div className="text-center">
                      <div className="mx-auto w-[40px] h-[40px] border rounded overflow-hidden bg-white flex items-center justify-center">
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt="Small preview"
                            className="max-w-[80%] max-h-[80%] object-contain origin-center"
                            style={{ transform: getImageTransform() }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">Deal Card</span>
                    </div>
                    
                    {/* Medium - Deal Detail */}
                    <div className="text-center">
                      <div className="mx-auto w-[80px] h-[80px] border rounded overflow-hidden bg-white flex items-center justify-center">
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt="Medium preview"
                            className="max-w-[80%] max-h-[80%] object-contain origin-center"
                            style={{ transform: getImageTransform() }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">Deal Detail</span>
                    </div>
                    
                    {/* Large - Profile */}
                    <div className="text-center">
                      <div className="mx-auto w-[140px] h-[140px] border rounded overflow-hidden bg-white flex items-center justify-center">
                        <div className="w-full h-full flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt="Large preview"
                            className="max-w-[80%] max-h-[80%] object-contain origin-center"
                            style={{ transform: getImageTransform() }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 block">Profile</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-center text-muted-foreground">
                  Your logo will appear exactly as shown in these previews.
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveImage}
              disabled={isUploading}
              className="bg-[#00796B] hover:bg-[#004D40]"
            >
              {isUploading ? "Saving..." : "Save Logo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}