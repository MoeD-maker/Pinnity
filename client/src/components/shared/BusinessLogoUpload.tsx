import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Edit2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface BusinessLogoUploadProps {
  currentImage: string | null;
  onImageChange: (fileOrBase64: File | string | null) => void;
}

export default function BusinessLogoUpload({ currentImage, onImageChange }: BusinessLogoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Add debug logging for image state
  useEffect(() => {
    console.log("Current image state:", {
      hasSelectedFile: !!selectedFile,
      hasPreviewUrl: !!previewUrl,
      previewUrlType: previewUrl ? 
        (previewUrl.startsWith('data:') ? 'data URL' : 
         previewUrl.startsWith('blob:') ? 'blob URL' : 'other URL') : 'none',
      previewUrlLength: previewUrl ? previewUrl.length : 0
    });
  }, [selectedFile, previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    try {
      // Validate file size
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
      
      console.log("File selected:", file.name, file.type, file.size);
      
      // Set file and reset scale
      setSelectedFile(file);
      setScale(1);
      
      // Create a FileReader to load the image as a data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          // Store as data URL rather than object URL
          const dataUrl = event.target.result as string;
          setPreviewUrl(dataUrl);
          console.log("Image loaded as data URL");
          setCropperOpen(true);
        }
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        toast({
          title: "Error",
          description: "Failed to load the image. Please try another file.",
          variant: "destructive"
        });
      };
      
      // Read as data URL instead of using URL.createObjectURL
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: "Failed to process the image. Please try another file.",
        variant: "destructive"
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Final version of cropImage with precise aspect ratio preservation and background removal
  const cropImage = async (): Promise<string | null> => {
    // If there's no file or preview URL, return early
    if (!selectedFile || !previewUrl) {
      return previewUrl;
    }
    
    try {
      return new Promise((resolve) => {
        // First, create a new image to get the original dimensions
        const img = new Image();
        
        img.onload = () => {
          console.log('Original image loaded:', {
            width: img.width,
            height: img.height,
            scale
          });
          
          // *** Step 1: Create an intermediate canvas to extract just the logo ***
          // This step will remove the background pattern
          const extractCanvas = document.createElement('canvas');
          const extractSize = Math.min(img.width, img.height); // Use the smaller dimension for square extraction
          extractCanvas.width = extractSize;
          extractCanvas.height = extractSize;
          
          const extractCtx = extractCanvas.getContext('2d');
          if (!extractCtx) {
            console.error("Could not get extract canvas context");
            resolve(null);
            return;
          }
          
          // Clear the canvas with a white background (will replace the pattern)
          extractCtx.fillStyle = '#FFFFFF';
          extractCtx.fillRect(0, 0, extractSize, extractSize);
          
          // Calculate the source area (centered square from original image)
          const sourceX = (img.width - extractSize) / 2;
          const sourceY = (img.height - extractSize) / 2;
          
          // Extract the central square portion of the image
          extractCtx.drawImage(
            img,
            sourceX, sourceY, extractSize, extractSize,
            0, 0, extractSize, extractSize
          );
          
          // *** Step 2: Create a new image from the extracted logo ***
          const extractedImg = new Image();
          extractedImg.onload = () => {
            // *** Step 3: Create the final output canvas ***
            const finalCanvas = document.createElement('canvas');
            const finalSize = 500; // High-quality square output
            finalCanvas.width = finalSize;
            finalCanvas.height = finalSize;
            
            const finalCtx = finalCanvas.getContext('2d');
            if (!finalCtx) {
              console.error("Could not get final canvas context");
              resolve(null);
              return;
            }
            
            // Start with white background
            finalCtx.fillStyle = '#FFFFFF';
            finalCtx.fillRect(0, 0, finalSize, finalSize);
            
            // Calculate how much to zoom in based on scale
            const zoomFactor = 1 / scale;
            
            // Calculate the dimensions to capture from the extracted image
            const captureSize = extractedImg.width * zoomFactor;
            
            // Center the capture area
            const captureX = (extractedImg.width - captureSize) / 2; 
            const captureY = (extractedImg.height - captureSize) / 2;
            
            console.log('Final crop calculation:', {
              extractedSize: extractedImg.width,
              zoomFactor,
              captureSize,
              captureX,
              captureY
            });
            
            // Draw the zoomed portion onto the final canvas
            finalCtx.drawImage(
              extractedImg,
              captureX, captureY, captureSize, captureSize,  // Source: zoomed center of extracted image
              0, 0, finalSize, finalSize                     // Destination: fill the canvas evenly
            );
            
            // Get the final result
            const dataUrl = finalCanvas.toDataURL('image/png');
            
            // Test the output image dimensions
            const testImg = new Image();
            testImg.onload = () => {
              console.log('Final output dimensions:', {
                width: testImg.width,
                height: testImg.height
              });
            };
            testImg.src = dataUrl;
            
            resolve(dataUrl);
          };
          
          // Load the extracted image
          extractedImg.src = extractCanvas.toDataURL('image/png');
        };
        
        img.onerror = (err) => {
          console.error("Error loading image for cropping:", err);
          toast({
            title: "Error",
            description: "Failed to process the image. Please try again.",
            variant: "destructive"
          });
          resolve(null);
        };
        
        // Use the dataURL we already have
        img.src = previewUrl;
      });
    } catch (error) {
      console.error("Error in cropImage:", error);
      toast({
        title: "Error",
        description: "An error occurred while processing your image.",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    
    try {
      // Get the cropped image data
      const croppedImageData = await cropImage();
      
      if (croppedImageData) {
        // Add debugging to check the image dimensions
        const debugImg = new Image();
        debugImg.onload = () => {
          console.log("Final cropped image dimensions:", {
            width: debugImg.width,
            height: debugImg.height
          });
        };
        debugImg.src = croppedImageData;
        
        // Pass the cropped image data to the parent component
        onImageChange(croppedImageData);
        
        // Clean up old URL if it exists
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
        
        setPreviewUrl(croppedImageData);
        
        toast({
          title: "Logo updated",
          description: "Your business logo has been updated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to process the image. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      toast({
        title: "Error",
        description: "An error occurred while saving your logo.",
        variant: "destructive"
      });
    } finally {
      // Close dialog and reset states
      setCropperOpen(false);
      setUploading(false);
    }
  };
  
  const handleRemoveImage = () => {
    // Clean up URL if needed
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setPreviewUrl(null);
    setSelectedFile(null);
    onImageChange(null);
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
      />
      
      {previewUrl ? (
        <div className="relative group aspect-square w-40 h-40 mx-auto">
          <img 
            src={previewUrl} 
            alt="Business logo" 
            className="w-full h-full object-contain rounded-md border"
            onLoad={() => console.log("Main profile image loaded successfully")}
            onError={(e) => console.error("Error loading main profile preview:", e)}
          />
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
      
      <Dialog open={cropperOpen} onOpenChange={setCropperOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Adjust Your Logo</DialogTitle>
          
          <div className="mt-4 flex flex-col items-center">
            {selectedFile && (
              <>
                {/* Simple preview */}
                <div className="relative">
                  <div 
                    ref={cropContainerRef}
                    className="w-[250px] h-[250px] overflow-hidden border-2 border-gray-200 rounded-md bg-gray-50 flex items-center justify-center"
                  >
                    {previewUrl ? (
                      <img
                        ref={imageRef}
                        src={previewUrl}
                        alt="Logo preview"
                        style={{
                          maxWidth: `${scale * 100}%`,
                          maxHeight: `${scale * 100}%`,
                          objectFit: 'contain'
                        }}
                        onLoad={() => console.log("Main preview image loaded successfully")}
                        onError={(e) => console.error("Error loading main preview:", e)}
                      />
                    ) : (
                      <div className="text-gray-400 text-sm">No image available</div>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Square format logo for optimal display
                </div>
                
                <div className="w-full mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Logo Size</label>
                    <span className="text-xs text-muted-foreground">{Math.round(scale * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Multi-size preview with real-time updates */}
                <div className="bg-gray-50 p-3 rounded-md w-full mt-6">
                  <h4 className="text-sm font-medium mb-2">Preview at different sizes</h4>
                  <div className="flex items-end justify-between">
                    <div className="text-center">
                      <div className="mx-auto w-[40px] h-[40px] border rounded overflow-hidden bg-white flex items-center justify-center">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Small preview"
                            style={{
                              maxWidth: `${scale * 100}%`,
                              maxHeight: `${scale * 100}%`,
                              objectFit: 'contain'
                            }}
                            onError={(e) => console.error("Small preview error:", e)}
                          />
                        ) : (
                          <span className="text-[8px] text-gray-400">No image</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">Deal Card</span>
                    </div>
                    
                    <div className="text-center">
                      <div className="mx-auto w-[80px] h-[80px] border rounded overflow-hidden bg-white flex items-center justify-center">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Medium preview"
                            style={{
                              maxWidth: `${scale * 100}%`,
                              maxHeight: `${scale * 100}%`,
                              objectFit: 'contain'
                            }}
                            onError={(e) => console.error("Medium preview error:", e)}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No image</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">Deal Detail</span>
                    </div>
                    
                    <div className="text-center">
                      <div className="mx-auto w-[140px] h-[140px] border rounded overflow-hidden bg-white flex items-center justify-center">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Large preview"
                            style={{
                              maxWidth: `${scale * 100}%`,
                              maxHeight: `${scale * 100}%`,
                              objectFit: 'contain'
                            }}
                            onError={(e) => console.error("Large preview error:", e)}
                          />
                        ) : (
                          <span className="text-sm text-gray-400">No image</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">Profile</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCropperOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={uploading}
              className="bg-[#00796B] hover:bg-[#004D40]"
            >
              {uploading ? "Processing..." : "Save Logo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}