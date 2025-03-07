import { useState, useEffect } from 'react';
import { applyUpdates, checkForUpdates } from '@/serviceWorkerRegistration';
import { Button } from '@/components/ui/button';
import { Toast, ToastDescription, ToastAction, ToastTitle } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

export default function UpdateNotification() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for service worker updates
    checkForUpdates(() => {
      setShowUpdatePrompt(true);

      // Show a toast notification for the update
      toast({
        title: 'Update Available',
        description: 'A new version of Pinnity is available',
        action: (
          <ToastAction altText="Update now" onClick={() => applyUpdates()}>
            Update now
          </ToastAction>
        ),
        duration: 10000, // 10 seconds
      });
    });

    // Listen for the custom event triggered when the service worker finds an update
    const handleUpdateFound = () => {
      setShowUpdatePrompt(true);
    };

    window.addEventListener('serviceWorkerUpdateFound', handleUpdateFound);

    return () => {
      window.removeEventListener('serviceWorkerUpdateFound', handleUpdateFound);
    };
  }, [toast]);

  // If no update is available, don't render anything
  if (!showUpdatePrompt) {
    return null;
  }

  const handleUpdate = () => {
    applyUpdates();
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  return (
    <Toast open={showUpdatePrompt} onOpenChange={setShowUpdatePrompt}>
      <ToastTitle>Update Available</ToastTitle>
      <ToastDescription>
        A new version of Pinnity is available. Update now for the latest features and improvements.
      </ToastDescription>
      <div className="mt-4 flex gap-2">
        <Button 
          size="sm" 
          variant="default" 
          onClick={handleUpdate}
          className="bg-green-600 hover:bg-green-700"
        >
          Update Now
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleDismiss}
        >
          Later
        </Button>
      </div>
    </Toast>
  );
}