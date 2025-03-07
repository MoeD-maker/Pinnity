import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download } from 'lucide-react';

interface InstallPromptProps {
  className?: string;
}

declare global {
  interface Window {
    deferredPrompt: any;
  }
}

export default function InstallPrompt({ className = '' }: InstallPromptProps) {
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const handler = () => {
      setInstallable(Boolean(window.deferredPrompt));
    };

    // Check if the app can be installed when the component mounts
    handler();

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handler);
    
    // Listen for the appinstalled event
    window.addEventListener('appinstalled', () => {
      setInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!window.deferredPrompt) {
      return;
    }

    // Show the install prompt
    window.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await window.deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // Clear the deferredPrompt so it can be garbage collected
    window.deferredPrompt = null;
    
    // If the user accepted, hide our installable state
    if (outcome === 'accepted') {
      setInstallable(false);
    }
  };

  if (!installable) {
    return null;
  }

  return (
    <Card className={`shadow-lg border-2 border-primary/30 ${className}`}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="mr-4">
          <h3 className="font-medium text-base">Install Pinnity</h3>
          <p className="text-sm text-muted-foreground">Get quick access to local deals on your device</p>
        </div>
        <Button onClick={handleInstallClick} className="whitespace-nowrap">
          <Download className="h-4 w-4 mr-2" />
          Install
        </Button>
      </CardContent>
    </Card>
  );
}