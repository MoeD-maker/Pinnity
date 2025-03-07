import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { usePwaInstall } from '@/hooks/use-pwa';
import { X, Download, PhoneIcon } from 'lucide-react';

interface InstallPromptProps {
  className?: string;
}

// This fixes the type error with duplicate declarations in other files
// We won't redeclare the global Window interface here since it's already
// declared in use-pwa.ts with the correct type

export default function InstallPrompt({ className = '' }: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const { canInstall, installApp } = usePwaInstall();
  const { toast } = useToast();

  useEffect(() => {
    // Only show the prompt if the app can be installed
    setShowPrompt(canInstall);
  }, [canInstall]);

  const handleInstall = async () => {
    try {
      const installed = await installApp();
      if (installed) {
        setShowPrompt(false);
        toast({
          title: 'App Installed',
          description: 'Pinnity has been successfully installed on your device',
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Installation failed:', error);
      toast({
        title: 'Installation Failed',
        description: 'There was an error installing Pinnity. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store a flag in localStorage to avoid showing the prompt again for some time
    localStorage.setItem('pwa-install-prompted', Date.now().toString());
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <Card className={`shadow-lg border-primary/20 ${className}`}>
      <CardHeader className="pb-2 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="absolute right-2 top-2 h-8 w-8 rounded-full"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle className="text-lg text-primary flex items-center gap-2">
          <PhoneIcon className="h-5 w-5" />
          Install Pinnity
        </CardTitle>
        <CardDescription>Add to your home screen for the best experience</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <span>Faster access to deals and seamless offline experience</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <span>Get push notifications for new deals and offers</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-primary text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <span>Works offline to view saved deals and redeem codes</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleInstall} className="w-full gap-2">
          <Download className="h-4 w-4" />
          Install App
        </Button>
      </CardFooter>
    </Card>
  );
}