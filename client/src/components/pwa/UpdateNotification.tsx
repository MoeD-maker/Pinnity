import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Toast, ToastDescription, ToastAction, ToastTitle } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

export default function UpdateNotification() {
  const [open, setOpen] = useState(true);
  const { toast } = useToast();

  const handleUpdate = () => {
    // If we can access the service worker, use it to apply updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          // Send message to service worker to skip waiting and activate new version
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          
          // Show toast while reloading
          toast({
            title: 'Updating...',
            description: 'Applying new version of Pinnity',
            duration: 3000,
          });
          
          // Reload the page after a short delay to apply updates
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      });
    }
  };

  const handleDismiss = () => {
    setOpen(false);
  };

  // This component is only rendered when an update is available
  // (controlled by the parent App component), so we don't need
  // to check for update availability here
  
  return (
    <Toast open={open} onOpenChange={setOpen}>
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