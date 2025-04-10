import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Edit2, X, Move } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

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
      if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPG, PNG, or GIF image",
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

  const handleCropComplete = () => {
    if (selectedFile) {
      setUploading(true);
      
      // In a real implementation, you'd want to actually crop the image based on 
      // position and zoom, but for now, we'll just use the original file
      
      onImageChange(selectedFile);
      
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
        accept="image/jpeg,image/png,image/gif"
        className="hidden"
      />
      
      {previewUrl ? (
        <div className="relative group">
          <img 
            src={previewUrl} 
            alt="Business logo" 
            className="w-40 h-40 object-cover rounded-md border" 
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
          className={`border-2 ${isDragOver ? 'border-[#00796B]' : 'border-dashed border-gray-300'} 
                    rounded-lg text-center transition-colors`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div 
            className="flex flex-col items-center justify-center py-8 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
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
                    className="relative w-[250px] h-[250px] overflow-hidden border-2 border-gray-200 rounded-md bg-gray-50"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: dragging ? 'grabbing' : 'grab' }}
                  >
                    <img
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
                
                <div className="w-full mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Zoom</label>
                    <span className="text-xs text-gray-500">{Math.round(zoom * 100)}%</span>
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