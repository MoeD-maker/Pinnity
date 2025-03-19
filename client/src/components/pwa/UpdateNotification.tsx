import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Toast, ToastDescription, ToastTitle } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { applyUpdates } from '@/serviceWorkerRegistration';
import { RefreshCw } from 'lucide-react';

/**
 * Enhanced Update Notification Component
 * 
 * Detects when a new service worker version is available
 * and provides a notification with a refresh button to apply updates.
 */
export default function UpdateNotification() {
  const [isVisible, setIsVisible] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const { toast } = useToast();

  // Handle the update process
  const handleUpdate = () => {
    toast({
      title: 'Updating...',
      description: 'Applying new version of Pinnity',
      duration: 3000,
    });
    
    // Call the service worker update function
    applyUpdates();
  };

  // User dismisses update for now
  const handleDismiss = () => {
    setIsVisible(false);
    
    // Save timestamp of dismissed update to show again later
    localStorage.setItem('pinnity_update_dismissed', Date.now().toString());
  };

  useEffect(() => {
    // Check if a waiting worker is already available on mount
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.waiting) {
          setUpdateReady(true);
          setIsVisible(true);
        }
      });
    }

    // Listen for new service worker updates
    const handlePwaUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ registration: ServiceWorkerRegistration }>;
      
      if (customEvent.detail?.registration.waiting) {
        // Check if update was recently dismissed (within last hour)
        const lastDismissed = parseInt(localStorage.getItem('pinnity_update_dismissed') || '0', 10);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        if (lastDismissed < oneHourAgo) {
          console.log('New app version ready to install');
          setUpdateReady(true);
          setIsVisible(true);
        } else {
          console.log('Update notification suppressed (recently dismissed)');
        }
      }
    };

    // Add event listener for custom pwaUpdate event
    window.addEventListener('pwaUpdate', handlePwaUpdate);

    // Clean up
    return () => {
      window.removeEventListener('pwaUpdate', handlePwaUpdate);
    };
  }, []);

  // Don't render anything if there's no update or notification is dismissed
  if (!isVisible || !updateReady) {
    return null;
  }
  
  return (
    <Toast open={isVisible} onOpenChange={setIsVisible} className="fixed bottom-4 right-4 md:top-4 md:bottom-auto z-50">
      <div className="flex items-center">
        <RefreshCw className="h-5 w-5 text-primary mr-2" />
        <div>
          <ToastTitle className="text-sm font-medium">App Update Available</ToastTitle>
          <ToastDescription className="text-xs mt-1">
            A new version of Pinnity is ready to install.
          </ToastDescription>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button 
          size="sm" 
          variant="default" 
          onClick={handleUpdate}
          className="bg-primary hover:bg-primary/90 text-xs py-1 h-8"
        >
          Update Now
        </Button>
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={handleDismiss}
          className="text-xs py-1 h-8"
        >
          Later
        </Button>
      </div>
    </Toast>
  );
}