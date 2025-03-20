import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useOfflineFormPersistence, PersistenceMetadata } from '@/hooks/useOfflineFormPersistence';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoCircledIcon, CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface OfflineFormContextType {
  // Form persistence metadata
  metadata: PersistenceMetadata;
  
  // Methods
  saveForm: () => Promise<boolean>;
  syncForm: () => Promise<boolean>;
  recoverForm: () => Promise<boolean>;
  clearForm: () => Promise<void>;
  hasPersistedData: boolean;
  
  // Recovery dialog state
  isRecoveryDialogOpen: boolean;
  setIsRecoveryDialogOpen: (isOpen: boolean) => void;
}

const OfflineFormContext = createContext<OfflineFormContextType | null>(null);

export const useOfflineForm = () => {
  const context = useContext(OfflineFormContext);
  if (!context) {
    throw new Error('useOfflineForm must be used within an OfflineFormProvider');
  }
  return context;
};

interface OfflineFormProviderProps {
  children: ReactNode;
  formId: string;
  formData: any;
  syncEndpoint?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
  onRestore?: (data: any) => void;
  renderRecoveryDialog?: (data: any, onRecover: () => void, onDiscard: () => void) => ReactNode;
}

/**
 * Provider component that manages offline form state and persistence
 */
export function OfflineFormProvider({
  children,
  formId,
  formData,
  syncEndpoint,
  autoSave = true,
  autoSaveInterval = 30000, // 30 seconds
  onRestore,
  renderRecoveryDialog
}: OfflineFormProviderProps) {
  const { isOnline } = useOnlineStatus();
  const { toast } = useToast();
  const [isRecoveryDialogOpen, setIsRecoveryDialogOpen] = useState(false);
  const [recoveredData, setRecoveredData] = useState<any>(null);
  
  // Use the offline form persistence hook
  const {
    saveFormState,
    restoreFormState,
    clearFormState,
    syncToServer,
    metadata
  } = useOfflineFormPersistence(formData, {
    formId,
    autoSave,
    autoSaveInterval,
    syncToServerEndpoint: syncEndpoint,
    onRestoreSuccess: (data) => {
      console.log('Form data restored successfully:', data);
      setRecoveredData(data);
      if (onRestore) {
        onRestore(data);
      }
    },
    onRestoreError: (error) => {
      console.error('Error restoring form data:', error);
      toast({
        title: "Recovery Error",
        description: "There was an error recovering your saved data. Please try again.",
        variant: "destructive"
      });
    },
    onSaveSuccess: () => {
      console.log('Form data saved successfully');
    },
    onSaveError: (error) => {
      console.error('Error saving form data:', error);
      toast({
        title: "Save Error",
        description: "There was an error saving your data locally. Please try to save again.",
        variant: "destructive"
      });
    },
    onSyncSuccess: () => {
      console.log('Form data synced successfully');
      toast({
        title: "Sync Complete",
        description: "Your form data has been successfully synchronized with the server.",
      });
    },
    onSyncError: (error) => {
      console.error('Error syncing form data:', error);
      toast({
        title: "Sync Error",
        description: isOnline 
          ? "There was an error syncing your data to the server. We'll try again later." 
          : "You're currently offline. Your data will be synced when you reconnect.",
        variant: isOnline ? "destructive" : "default"
      });
    }
  });
  
  // Check for existing data on mount and show recovery dialog if found
  useEffect(() => {
    const checkForExistingData = async () => {
      try {
        const existingData = await restoreFormState();
        if (existingData) {
          setRecoveredData(existingData);
          setIsRecoveryDialogOpen(true);
        }
      } catch (error) {
        console.error('Error checking for existing data:', error);
      }
    };
    
    checkForExistingData();
  }, [restoreFormState]);
  
  // Handle recovery confirmation
  const handleRecoverForm = async () => {
    if (recoveredData && onRestore) {
      onRestore(recoveredData);
      toast({
        title: "Form Recovered",
        description: "Your previously saved form data has been recovered successfully.",
      });
    }
    setIsRecoveryDialogOpen(false);
  };
  
  // Handle discarding saved data
  const handleDiscardForm = async () => {
    await clearFormState();
    setRecoveredData(null);
    setIsRecoveryDialogOpen(false);
    toast({
      title: "Form Discarded",
      description: "Your previously saved form data has been discarded.",
    });
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return timestamp;
    }
  };
  
  // Wrapper methods to provide better error handling and feedback
  const saveForm = async (): Promise<boolean> => {
    try {
      const success = await saveFormState();
      if (success) {
        toast({
          title: "Progress Saved",
          description: "Your form data has been saved locally.",
        });
      }
      return success;
    } catch (error) {
      console.error('Error in saveForm:', error);
      return false;
    }
  };
  
  const syncForm = async (): Promise<boolean> => {
    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "You're currently offline. Your data will be synced when you reconnect.",
      });
      return false;
    }
    
    try {
      const success = await syncToServer();
      return success;
    } catch (error) {
      console.error('Error in syncForm:', error);
      return false;
    }
  };
  
  const recoverForm = async (): Promise<boolean> => {
    try {
      const data = await restoreFormState();
      return Boolean(data);
    } catch (error) {
      console.error('Error in recoverForm:', error);
      return false;
    }
  };
  
  return (
    <OfflineFormContext.Provider
      value={{
        metadata,
        saveForm,
        syncForm,
        recoverForm,
        clearForm: clearFormState,
        hasPersistedData: metadata.hasPersistedData,
        isRecoveryDialogOpen,
        setIsRecoveryDialogOpen
      }}
    >
      {children}
      
      {/* Default Recovery Dialog */}
      {!renderRecoveryDialog && (
        <Dialog open={isRecoveryDialogOpen} onOpenChange={setIsRecoveryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resume Your Progress</DialogTitle>
              <DialogDescription>
                We found your previously saved form data from {formatTimestamp(metadata.lastSaved)}.
                Would you like to continue where you left off?
              </DialogDescription>
            </DialogHeader>
            
            <div className="my-4">
              <Alert>
                <InfoCircledIcon className="h-4 w-4" />
                <AlertTitle>Form Status Information</AlertTitle>
                <AlertDescription>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div>Last Saved:</div>
                    <div className="font-medium">{formatTimestamp(metadata.lastSaved)}</div>
                    
                    {metadata.lastSyncedToServer && (
                      <>
                        <div>Last Synced:</div>
                        <div className="font-medium">{formatTimestamp(metadata.lastSyncedToServer)}</div>
                      </>
                    )}
                    
                    <div>Sync Status:</div>
                    <div>
                      {metadata.isOfflineSyncPending ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                          Pending Sync
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-800">
                          Up to Date
                        </Badge>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
            
            <DialogFooter className="flex gap-2 sm:justify-between">
              <Button variant="outline" onClick={handleDiscardForm}>
                <CrossCircledIcon className="h-4 w-4 mr-2" />
                Discard Saved Data
              </Button>
              <Button onClick={handleRecoverForm}>
                <CheckCircledIcon className="h-4 w-4 mr-2" />
                Resume Progress
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Custom Recovery Dialog */}
      {renderRecoveryDialog && isRecoveryDialogOpen && recoveredData && (
        renderRecoveryDialog(recoveredData, handleRecoverForm, handleDiscardForm)
      )}
    </OfflineFormContext.Provider>
  );
}

/**
 * Button component to save form progress with offline support
 */
export function SaveProgressButton({
  className,
  showSyncStatus = false,
  variant = 'outline',
  size = 'sm',
  children
}: {
  className?: string;
  showSyncStatus?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  children?: React.ReactNode;
}) {
  const { saveForm, metadata } = useOfflineForm();
  const { isOnline } = useOnlineStatus();
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            onClick={saveForm}
            disabled={metadata.isSaving}
          >
            {metadata.isSaving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              <>
                {children || (
                  <span className="flex items-center">
                    Save Progress
                    {showSyncStatus && metadata.isOfflineSyncPending && !isOnline && (
                      <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-800 text-xs">
                        Offline
                      </Badge>
                    )}
                  </span>
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {metadata.isSaving ? (
            "Saving your progress..."
          ) : (
            <>
              {metadata.hasPersistedData ? (
                <>
                  Last saved: {metadata.lastSaved ? format(new Date(metadata.lastSaved), 'MMM d, h:mm a') : 'Never'}
                  {metadata.isOfflineSyncPending && <div>Will be synced when online</div>}
                </>
              ) : (
                "Save your progress to continue later"
              )}
            </>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}