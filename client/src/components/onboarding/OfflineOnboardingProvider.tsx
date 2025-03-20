import React, { ReactNode, useState, useEffect } from 'react';
import { OfflineFormProvider, useOfflineForm, SaveProgressButton } from './OfflineAwareFormProvider';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InfoCircledIcon, CodeIcon, CrossCircledIcon, CheckCircledIcon } from '@radix-ui/react-icons';
import { Loader2, WifiOff, Save, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  [key: string]: any;
}

interface OfflineOnboardingProviderProps {
  children: ReactNode;
  userType: 'individual' | 'business';
  user: UserData;
  formData: any;
  onRestore?: (data: any) => void;
  syncEndpoint?: string;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

/**
 * Provider component that wraps the onboarding flow with offline capabilities
 */
export function OfflineOnboardingProvider({
  children,
  userType,
  user,
  formData,
  onRestore,
  syncEndpoint = `/api/onboarding/${userType}/sync`,
  autoSave = true,
  autoSaveInterval = 30000 // 30 seconds
}: OfflineOnboardingProviderProps) {
  const { isOnline } = useOnlineStatus();
  const { toast } = useToast();
  const [showOfflineAlert, setShowOfflineAlert] = useState(false);
  
  // Show offline alert when user goes offline
  useEffect(() => {
    if (!isOnline) {
      setShowOfflineAlert(true);
      
      // Auto-hide the alert after 5 seconds
      const timer = setTimeout(() => {
        setShowOfflineAlert(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isOnline]);
  
  return (
    <OfflineFormProvider
      formId={`onboarding-${userType}-${user.id}`}
      formData={formData}
      syncEndpoint={syncEndpoint}
      autoSave={autoSave}
      autoSaveInterval={autoSaveInterval}
      onRestore={onRestore}
    >
      <OfflineOnboardingContent showOfflineAlert={showOfflineAlert}>
        {children}
      </OfflineOnboardingContent>
    </OfflineFormProvider>
  );
}

interface OfflineOnboardingContentProps {
  children: ReactNode;
  showOfflineAlert: boolean;
}

/**
 * Content wrapper that adds offline status indicators and sync controls
 */
function OfflineOnboardingContent({ children, showOfflineAlert }: OfflineOnboardingContentProps) {
  const { isOnline } = useOnlineStatus();
  const { saveForm, syncForm, metadata } = useOfflineForm();
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  // Handle manual sync button click
  const handleSync = async () => {
    setSyncInProgress(true);
    try {
      await syncForm();
    } finally {
      setSyncInProgress(false);
    }
  };
  
  return (
    <div className="relative">
      {/* Offline Status Alert - shown when user goes offline */}
      <AnimatePresence>
        {showOfflineAlert && !isOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="sticky top-0 z-50 mb-4"
          >
            <Alert className="bg-yellow-50 border-yellow-200">
              <WifiOff className="h-4 w-4 text-yellow-800" />
              <AlertTitle className="text-yellow-800">You're currently offline</AlertTitle>
              <AlertDescription className="text-yellow-700">
                Don't worry! Your progress will be saved locally and synchronized when you're back online.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sync Status Indicator - always visible when there are pending changes */}
      {metadata.isOfflineSyncPending && (
        <div className="mb-4 flex items-center justify-between px-4 py-2 bg-blue-50 border border-blue-100 rounded-md">
          <div className="flex items-center">
            <CodeIcon className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-blue-700 text-sm font-medium">
              {isOnline ? 'Changes ready to sync' : 'Changes will sync when online'}
            </span>
          </div>
          
          {isOnline && (
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-white"
              onClick={handleSync}
              disabled={syncInProgress}
            >
              {syncInProgress ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" /> 
                  Sync Now
                </>
              )}
            </Button>
          )}
        </div>
      )}
      
      {/* Main Content */}
      {children}
      
      {/* Bottom Save Bar - fixed at bottom when scrolling on mobile */}
      <div className="sticky bottom-0 left-0 right-0 p-2 bg-white/80 backdrop-blur-sm border-t mt-4 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {metadata.lastSaved ? (
              <>Last saved: {format(new Date(metadata.lastSaved), 'h:mm a')}</>
            ) : (
              <>Not saved yet</>
            )}
            
            {!isOnline && (
              <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-800 text-xs">
                Offline
              </Badge>
            )}
            
            {metadata.isOfflineSyncPending && isOnline && (
              <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-800 text-xs">
                Needs Sync
              </Badge>
            )}
          </div>
          
          <SaveProgressButton variant="default" size="sm" />
        </div>
      </div>
      
      {/* Offline Sync Completion Dialog - shown when sync completes after reconnecting */}
      <OfflineSyncCompletedDialog />
    </div>
  );
}

/**
 * Dialog that shows when offline changes have been successfully synced
 */
function OfflineSyncCompletedDialog() {
  const { metadata } = useOfflineForm();
  const { isOnline } = useOnlineStatus();
  const [showDialog, setShowDialog] = useState(false);
  
  // Show dialog when we come back online and sync completes
  useEffect(() => {
    if (isOnline && metadata.lastSyncedToServer && !metadata.isOfflineSyncPending) {
      const lastSynced = new Date(metadata.lastSyncedToServer);
      const justSynced = Date.now() - lastSynced.getTime() < 5000; // Within last 5 seconds
      
      if (justSynced) {
        setShowDialog(true);
      }
    }
  }, [isOnline, metadata.lastSyncedToServer, metadata.isOfflineSyncPending]);
  
  if (!showDialog) return null;
  
  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sync Completed</DialogTitle>
          <DialogDescription>
            Your offline changes have been successfully synchronized with the server.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-4 flex items-center justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircledIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => setShowDialog(false)}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Enhanced onboarding session recovery notice with offline support
 */
export function OfflineSessionRecoveryNotice({
  onContinue,
  onDiscard
}: {
  onContinue: () => void;
  onDiscard: () => void;
}) {
  const { metadata } = useOfflineForm();
  const { isOnline } = useOnlineStatus();
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  
  if (!metadata.hasPersistedData || !metadata.lastSaved) {
    return null;
  }
  
  // Format the saved date for readability
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else {
      const days = Math.floor(diffMins / 1440);
      return `${days} day${days === 1 ? '' : 's'} ago`;
    }
  };
  
  const handleDiscard = () => {
    setConfirmingDiscard(false);
    onDiscard();
  };
  
  return (
    <>
      <Card className="mb-4 p-4 border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <InfoCircledIcon className="h-5 w-5 text-blue-600" />
          </div>
          
          <div className="flex-grow">
            <h3 className="text-sm font-medium text-blue-800">Resume Your Previous Session</h3>
            <p className="text-sm text-blue-700 mt-1">
              We found your saved progress from {formatTimeAgo(metadata.lastSaved)}.
              {metadata.isOfflineSyncPending && !isOnline && (
                <span className="block mt-1 text-yellow-700">
                  Note: Some changes are pending synchronization when you're back online.
                </span>
              )}
            </p>
          </div>
          
          <div className="flex-shrink-0 flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setConfirmingDiscard(true)}
            >
              Discard
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={onContinue}
            >
              Continue
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Confirm discard dialog */}
      <Dialog open={confirmingDiscard} onOpenChange={setConfirmingDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Saved Progress?</DialogTitle>
            <DialogDescription>
              Are you sure you want to discard your saved progress? This action cannot be undone.
              {metadata.isOfflineSyncPending && (
                <Alert className="mt-4 bg-yellow-50 border-yellow-200">
                  <AlertTitle className="text-yellow-800">Warning</AlertTitle>
                  <AlertDescription className="text-yellow-700">
                    You have unsynchronized changes that will be lost if you discard this session.
                  </AlertDescription>
                </Alert>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmingDiscard(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscard}
            >
              <CrossCircledIcon className="mr-2 h-4 w-4" />
              Discard Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}