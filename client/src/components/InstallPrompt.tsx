import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Define the BeforeInstallPromptEvent interface as it's not included in standard TypeScript definitions
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

interface InstallPromptProps {
  delay?: number; // Delay in ms before showing prompt
  showOnlyOnce?: boolean; // Show once per browser session
}

const InstallPrompt = ({ 
  delay = 3000, 
  showOnlyOnce = true 
}: InstallPromptProps) => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if the app is already installed
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone || 
                         document.referrer.includes('android-app://');
    
    if (isStandalone) {
      setIsInstalled(true);
      console.log('Application is already installed');
    }

    // Only show once per session if enabled
    if (showOnlyOnce && sessionStorage.getItem('pwa-prompt-shown') === 'true') {
      console.log('Install prompt already shown this session');
      return;
    }
  }, [showOnlyOnce]);

  // Listen for installation events
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the default browser prompt
      e.preventDefault();
      // Save the event for later use
      setInstallPromptEvent(e);
      console.log('Install prompt captured and ready to use');
      
      // Show the prompt after delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true);
          if (showOnlyOnce) {
            sessionStorage.setItem('pwa-prompt-shown', 'true');
          }
        }
      }, delay);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      console.log('Application was successfully installed');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [delay, isInstalled, showOnlyOnce]);

  // Handle install button click
  const handleInstallClick = async () => {
    if (!installPromptEvent) {
      console.log('No install prompt event available');
      return;
    }

    try {
      // Show the native install prompt
      await installPromptEvent.prompt();
      
      // Wait for the user's choice
      const choiceResult = await installPromptEvent.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setInstallPromptEvent(null);
        setShowPrompt(false);
      } else {
        console.log('User dismissed the install prompt');
      }
    } catch (error) {
      console.error('Error prompting for install:', error);
    }
  };

  // Dismiss the prompt
  const handleDismiss = () => {
    setShowPrompt(false);
    console.log('User dismissed the custom install prompt');
  };

  if (!showPrompt || isInstalled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 z-50 animate-in slide-in-from-bottom">
      <div className="bg-[#00796B] p-4 flex justify-between items-center">
        <h3 className="text-white font-semibold">Install Pinnity</h3>
        <button 
          onClick={handleDismiss}
          className="text-white hover:bg-[#005b4f] p-1 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
      
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <img src="/logo192.png" alt="Pinnity Logo" className="w-12 h-12 rounded-lg" />
          <div>
            <p className="font-medium">Pinnity</p>
            <p className="text-sm text-gray-600">Discover Local Deals</p>
          </div>
        </div>
        
        <p className="text-sm text-gray-700 mb-4">
          Install Pinnity on your device for quick access to deals even offline.
        </p>
        
        <div className="flex justify-end gap-2">
          <button 
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            Not now
          </button>
          <button 
            onClick={handleInstallClick}
            className="px-4 py-2 text-sm bg-[#00796B] text-white rounded-md hover:bg-[#005b4f] transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;