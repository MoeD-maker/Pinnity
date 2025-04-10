import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Edit2, X, Move } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import html2canvas from 'html2canvas';

interface BusinessLogoUploadProps {
  currentImage: string | null;
  onImageChange: (fileOrBase64: File | string | null) => void;
}

interface Position {
  x: number;
  y: number;
}

export default function BusinessLogoUpload({ currentImage, onImageChange }: BusinessLogoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(0.8); // Start with slightly zoomed out
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const urlRef = useRef<string[]>([]);
  const { toast } = useToast();

  // Base size for the editor and preview containers
  const BASE_SIZE = 250;
  const SMALL_SIZE = 40;
  const MEDIUM_SIZE = 80;
  const LARGE_SIZE = 140;

  // Function to scale position values based on container size
  const scalePosition = (basePosition: Position, baseSize: number, targetSize: number): Position => {
    const scaleFactor = targetSize / baseSize;
    return {
      x: basePosition.x * scaleFactor,
      y: basePosition.y * scaleFactor
    };
  };

  // Cleanup function to revoke object URLs when component unmounts
  useEffect(() => {
    return () => {
      urlRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Reset position when a new file is selected
  useEffect(() => {
    if (selectedFile) {
      setPosition({ x: 0, y: 0 });
      setZoom(0.8); // Default to slightly zoomed out to fit most logos
    }
  }, [selectedFile]);

  // Debug logging to help track the state
  useEffect(() => {
    if (selectedFile && cropContainerRef.current) {
      console.log("Current state:", {
        containerSize: {
          width: cropContainerRef.current.clientWidth,
          height: cropContainerRef.current.clientHeight
        },
        position,
        zoom
      });
    }
  }, [selectedFile, position, zoom]);

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
      
      // Set file and show cropper
      setSelectedFile(file);
      
      // Use FileReader for maximum compatibility
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const base64Data = event.target.result as string;
          setImageBase64(base64Data);
          setPreviewUrl(base64Data);
          setCropperOpen(true);
          
          // Additional check to verify image loads
          const testImg = new Image();
          testImg.onload = () => console.log("✅ Image loads successfully!");
          testImg.onerror = (err) => console.error("❌ Image failed to load:", err);
          testImg.src = base64Data;
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error handling file:", error);
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
  
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Optional: Add limits to prevent dragging too far
      // This would be based on the zoom level and container size
      
      setPosition({
        x: newX,
        y: newY
      });
    }
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  // Using html2canvas to capture exactly what the user sees
  const cropImage = async (): Promise<string | null> => {
    if (!cropContainerRef.current) {
      console.error("Missing container ref for cropping");
      return null;
    }
    
    try {
      // Use html2canvas to capture exactly what's visible
      const canvas = await html2canvas(cropContainerRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        scale: 2, // Higher resolution
        logging: false,
        onclone: (clonedDoc) => {
          // Find the image in the cloned document
          const clonedContainer = clonedDoc.querySelector('[data-crop-container="true"]');
          if (clonedContainer) {
            // Remove helper text from the cloned document
            const helpText = clonedContainer.querySelector('[data-helper-text="true"]');
            if (helpText) {
              helpText.remove();
            }
            
            // Remove crosshairs from the cloned document if present
            const crosshairs = clonedContainer.querySelector('[data-crosshairs="true"]');
            if (crosshairs) {
              crosshairs.remove();
            }
          }
        }
      });
      
      // Convert canvas to data URL
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error("Error capturing image:", error);
      return null;
    }
  };

  const handleCropComplete = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    
    try {
      // Get the cropped image data
      const croppedImageData = await cropImage();
      
      if (croppedImageData) {
        // Pass the cropped image data to the parent component
        onImageChange(croppedImageData);
        setPreviewUrl(croppedImageData);
        
        toast({
          title: "Logo updated",
          description: "Your business logo has been updated successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to crop the image. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error in handleCropComplete:", error);
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
    setPreviewUrl(null);
    setSelectedFile(null);
    setImageBase64(null);
    onImageChange(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Scale positions for the different preview sizes
  const smallScaledPosition = scalePosition(position, BASE_SIZE, SMALL_SIZE);
  const mediumScaledPosition = scalePosition(position, BASE_SIZE, MEDIUM_SIZE);
  const largeScaledPosition = scalePosition(position, BASE_SIZE, LARGE_SIZE);
  
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
            className="w-full h-full object-cover rounded-md border" 
            onError={(e) => console.error("Error loading main preview:", e)}
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
            {imageBase64 && (
              <>
                <div className="relative">
                  <div 
                    ref={cropContainerRef}
                    data-crop-container="true"
                    className="relative w-[250px] h-[250px] overflow-hidden border-2 border-gray-200 rounded-md bg-gray-50"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                  >
                    {/* Debugging crosshairs to show center */}
                    <div data-crosshairs="true" className="absolute inset-0 pointer-events-none">
                      <div className="absolute left-0 right-0 top-1/2 h-px bg-red-500 opacity-30" />
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-red-500 opacity-30" />
                    </div>
                    
                    {/* Position helper text */}
                    <div data-helper-text="true" className="absolute top-2 left-2 right-2 text-center z-10">
                      <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                        <Move className="h-3 w-3 inline mr-1" /> Drag to position
                      </span>
                    </div>

                    <img
                      ref={imageRef}
                      src={imageBase64}
                      alt="Logo preview"
                      className="absolute inset-0"
                      style={{
                        width: `${zoom * 100}%`,
                        height: `${zoom * 100}%`,
                        objectFit: 'contain',
                        top: '50%',
                        left: '50%',
                        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                        userSelect: 'none'
                      }}
                      draggable="false"
                      onError={(e) => console.error("Image failed to load in cropper:", e)}
                    />
                  </div>
                  
                  <div className="absolute -bottom-4 -right-4 bg-white rounded-full p-2 shadow-md">
                    <Move size={18} className="text-gray-500" />
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  The editor maintains a 1:1 aspect ratio (square)
                </div>
                
                <div className="w-full mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Zoom</label>
                    <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.3" // Allow zooming out more
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Multi-size preview with real-time updates */}
                <div className="bg-gray-50 p-3 rounded-md w-full mt-6">
                  <h4 className="text-sm font-medium mb-2">Preview at different sizes</h4>
                  <div className="flex items-end justify-between">
                    <div className="text-center">
                      <div className="mx-auto w-[40px] h-[40px] border rounded overflow-hidden bg-white relative">
                        {imageBase64 ? (
                          <img
                            src={imageBase64}
                            alt="Small preview"
                            className="absolute"
                            style={{
                              width: `${zoom * 100}%`,
                              height: `${zoom * 100}%`,
                              objectFit: 'contain',
                              top: '50%',
                              left: '50%',
                              transform: `translate(calc(-50% + ${smallScaledPosition.x}px), calc(-50% + ${smallScaledPosition.y}px))`,
                              maxWidth: 'none',
                              maxHeight: 'none'
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
                      <div className="mx-auto w-[80px] h-[80px] border rounded overflow-hidden bg-white relative">
                        {imageBase64 ? (
                          <img
                            src={imageBase64}
                            alt="Medium preview"
                            className="absolute"
                            style={{
                              width: `${zoom * 100}%`,
                              height: `${zoom * 100}%`,
                              objectFit: 'contain',
                              top: '50%',
                              left: '50%',
                              transform: `translate(calc(-50% + ${mediumScaledPosition.x}px), calc(-50% + ${mediumScaledPosition.y}px))`,
                              maxWidth: 'none',
                              maxHeight: 'none'
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
                      <div className="mx-auto w-[140px] h-[140px] border rounded overflow-hidden bg-white relative">
                        {imageBase64 ? (
                          <img
                            src={imageBase64}
                            alt="Large preview"
                            className="absolute"
                            style={{
                              width: `${zoom * 100}%`,
                              height: `${zoom * 100}%`,
                              objectFit: 'contain',
                              top: '50%',
                              left: '50%',
                              transform: `translate(calc(-50% + ${largeScaledPosition.x}px), calc(-50% + ${largeScaledPosition.y}px))`,
                              maxWidth: 'none',
                              maxHeight: 'none'
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
              onClick={handleCropComplete}
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