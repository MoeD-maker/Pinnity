import { forwardRef, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Cloud, X, Lock, Shield } from "lucide-react";

export interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  onFileChange?: (file: File | null) => void;
  showSecurityInfo?: boolean;
}

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  ({ label, className, error, onFileChange, showSecurityInfo = true, ...props }, ref) => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0] || null;
      setFile(selectedFile);

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }

      if (onFileChange) {
        onFileChange(selectedFile);
      }
    };

    const removeFile = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      setFile(null);
      setPreview(null);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      if (onFileChange) {
        onFileChange(null);
      }
    };

    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border border-dashed rounded-md p-4 bg-gray-50 cursor-pointer",
            error ? "border-red-500" : "border-gray-200",
            className
          )}
        >
          {preview ? (
            <div className="relative">
              <button
                onClick={removeFile}
                className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
              <div className="flex justify-center">
                <img
                  src={preview}
                  alt="File preview"
                  className="max-h-24 object-contain"
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-2 truncate">
                {file?.name}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2 py-4">
              <Cloud className="h-8 w-8 text-gray-300" />
              <span className="text-xs text-gray-500">Click to upload or drag and drop</span>
              <span className="text-xs text-gray-400">PNG, JPG, PDF up to 5MB</span>
            </div>
          )}
          <input
            // Use only local ref - the component is already forwarded
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png,.pdf"
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        
        {/* Security information */}
        {showSecurityInfo && (
          <div className="mt-2 flex items-start space-x-2 bg-blue-50 p-2 rounded-md">
            <Lock className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-blue-800">
                Your documents are encrypted and securely stored. We use bank-level security to protect your information.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

export default FileUpload;
