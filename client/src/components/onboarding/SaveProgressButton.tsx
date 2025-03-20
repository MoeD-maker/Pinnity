import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FormPersistenceMetadata } from '@/hooks/useFormPersistence';

interface SaveProgressButtonProps {
  onClick: () => Promise<boolean>;
  metadata: FormPersistenceMetadata;
  showLabel?: boolean;
  variant?: 'default' | 'secondary' | 'outline';
  className?: string;
}

export function SaveProgressButton({
  onClick,
  metadata,
  showLabel = true,
  variant = 'outline',
  className = ''
}: SaveProgressButtonProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const success = await onClick();
      
      if (success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Format the last saved date/time
  const getLastSavedText = () => {
    if (!metadata.lastSaved) return 'Not saved yet';
    
    const date = new Date(metadata.lastSaved);
    return `Last saved: ${date.toLocaleTimeString()}`;
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={variant}
            size="sm"
            onClick={handleSave}
            disabled={isSaving || metadata.saveStatus === 'saving' || !metadata.isDirty}
            className={`relative ${className}`}
          >
            {isSaving || metadata.saveStatus === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showSuccess ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            
            {showLabel && (
              <span className="ml-2">
                {isSaving ? 'Saving...' : showSuccess ? 'Saved!' : 'Save Progress'}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getLastSavedText()}</p>
          {metadata.isDirty && <p className="text-amber-500">Unsaved changes</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}