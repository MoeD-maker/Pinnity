import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Edit2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AvatarEditor from 'react-avatar-editor'; // Import the avatar editor

interface BusinessLogoUploadProps {
  currentImage: string | null;
  onImageChange: (fileOrBase64: File | string | null) => void;
}

export default function BusinessLogoUpload({ currentImage, onImageChange }: BusinessLogoUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<AvatarEditor | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // Simple validation
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive"
        });
        return;
      }
      
      // Set file and show cropper
      setSelectedFile(file);
      
      // Preview immediately for user feedback
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
        setCropperOpen(true); // Open cropper dialog
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleCropComplete = () => {
    if (editorRef.current) {
      setUploading(true);
      
      // Get canvas data from the editor
      const canvasScaled = editorRef.current.getImageScaledToCanvas();
      const croppedImage = canvasScaled.toDataURL('image/jpeg', 0.9);
      
      // Pass the cropped image back to parent
      onImageChange(croppedImage);
      
      // Close dialog and reset states
      setCropperOpen(false);
      setUploading(false);
    }
  };
  
  const handleRemoveImage = () => {
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
        accept="image/jpeg,image/png,image/gif"
        className="hidden"
      />
      
      {previewUrl ? (
        <div className="relative group">
          <img 
            src={previewUrl} 
            alt="Business logo" 
            className="w-40 h-40 object-cover rounded-md border" 
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button 
              size="icon" 
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              size="icon" 
              variant="destructive"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          className="w-full h-40 border-dashed border-2 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50"
          variant="outline"
        >
          <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
          <span className="text-sm font-medium">Upload Business Logo</span>
          <span className="text-xs text-muted-foreground mt-1">
            JPG, PNG or GIF (max. 5MB)
          </span>
        </Button>
      )}
      
      <Dialog open={cropperOpen} onOpenChange={setCropperOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Adjust Your Logo</DialogTitle>
          
          <div className="mt-4 flex flex-col items-center">
            {selectedFile && (
              <AvatarEditor
                ref={editorRef}
                image={URL.createObjectURL(selectedFile)}
                width={250}
                height={250}
                border={50}
                color={[255, 255, 255, 0.6]} // RGBA
                scale={zoom}
                borderRadius={100} // Make it round
              />
            )}
            
            <div className="w-full mt-4">
              <label className="text-sm mb-2 block">Zoom</label>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
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