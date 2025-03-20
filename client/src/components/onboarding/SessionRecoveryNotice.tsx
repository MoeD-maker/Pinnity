import { useState } from 'react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { HistoryIcon, XCircleIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SessionRecoveryNoticeProps {
  hasPersistedData: boolean;
  lastSaved: Date | null;
  onRestore: () => void;
  onDiscard: () => void;
}

export function SessionRecoveryNotice({ 
  hasPersistedData, 
  lastSaved,
  onRestore, 
  onDiscard 
}: SessionRecoveryNoticeProps) {
  const [open, setOpen] = useState(hasPersistedData);
  const [showingDialog, setShowingDialog] = useState(false);
  const { toast } = useToast();
  
  if (!hasPersistedData || !lastSaved) {
    return null;
  }
  
  // Format the saved date for readability
  const formatSavedDate = (date: Date) => {
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
  
  const handleRestore = () => {
    onRestore();
    setOpen(false);
    toast({
      title: "Progress restored",
      description: "Your previous form data has been restored",
    });
  };
  
  const confirmDiscard = () => {
    setShowingDialog(true);
  };
  
  const handleDiscard = () => {
    onDiscard();
    setOpen(false);
    setShowingDialog(false);
    toast({
      title: "Progress discarded",
      description: "Your previous form data has been cleared",
    });
  };
  
  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="bg-gray-50 border-gray-200 text-gray-700 flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <HistoryIcon className="h-4 w-4" />
        <span>Restore saved progress</span>
      </Button>
    );
  }
  
  return (
    <>
      <div className="bg-indigo-50 border border-indigo-100 rounded-md p-4 mb-6 flex items-start gap-3">
        <HistoryIcon className="h-5 w-5 text-indigo-600 mt-1 flex-shrink-0" />
        <div className="flex-grow">
          <h3 className="font-medium text-indigo-900">Resume from where you left off</h3>
          <p className="text-sm text-indigo-700 mt-1">
            We found your saved progress from {formatSavedDate(lastSaved)}. 
            Would you like to continue where you left off?
          </p>
          <div className="mt-3 flex gap-2">
            <Button 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleRestore}
            >
              Restore progress
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="border-indigo-200 text-indigo-700"
              onClick={confirmDiscard}
            >
              Start fresh
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-indigo-400 hover:text-indigo-500"
          onClick={() => setOpen(false)}
        >
          <XCircleIcon className="h-5 w-5" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
      
      <AlertDialog open={showingDialog} onOpenChange={setShowingDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard saved progress?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your saved form progress. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscard} className="bg-red-500 hover:bg-red-600">
              Yes, discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}