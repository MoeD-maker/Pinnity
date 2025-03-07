import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { applyUpdates } from '../../serviceWorkerRegistration';

export default function UpdateNotification() {
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);

  useEffect(() => {
    // Listen for update events from the service worker
    const handleUpdateFound = () => {
      setShowUpdateAlert(true);
    };

    window.addEventListener('serviceWorkerUpdateFound', handleUpdateFound);

    return () => {
      window.removeEventListener('serviceWorkerUpdateFound', handleUpdateFound);
    };
  }, []);

  const handleUpdate = () => {
    // Apply the update
    applyUpdates();
    // Hide the notification
    setShowUpdateAlert(false);
  };

  if (!showUpdateAlert) {
    return null;
  }

  return (
    <Alert variant="default" className="border-primary/50 bg-primary/10 fixed bottom-4 right-4 max-w-md z-50">
      <AlertCircle className="h-4 w-4 text-primary" />
      <div className="ml-3 flex-1">
        <AlertTitle className="text-primary">Update Available</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          A new version of Pinnity is available. Update now to get the latest features and improvements.
        </AlertDescription>
      </div>
      <Button variant="outline" size="sm" className="ml-3 flex items-center" onClick={handleUpdate}>
        <RefreshCw className="h-3 w-3 mr-1" />
        Update
      </Button>
    </Alert>
  );
}