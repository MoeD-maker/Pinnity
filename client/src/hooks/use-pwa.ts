import { useState, useEffect } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window {
    deferredPrompt: BeforeInstallPromptEvent | null;
  }
}

interface UsePwaInstallReturn {
  canInstall: boolean;
  installApp: () => Promise<boolean>;
  isInstalledPwa: boolean;
}

export function usePwaInstall(): UsePwaInstallReturn {
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isInstalledPwa, setIsInstalledPwa] = useState<boolean>(false);

  useEffect(() => {
    // Check if the app is running as an installed PWA
    const checkIfInstalledPwa = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true ||
                          document.referrer.includes('android-app://');
      
      setIsInstalledPwa(isStandalone);
    };

    checkIfInstalledPwa();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Store the event for later use
      window.deferredPrompt = e as BeforeInstallPromptEvent;
      
      // Update UI to show the install button
      setCanInstall(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      // Log the installation
      console.log('PWA was installed');
      
      // Clear the deferred prompt
      window.deferredPrompt = null;
      
      // Update state
      setCanInstall(false);
      setIsInstalledPwa(true);
    };

    // Check if we should show the install prompt (not recently dismissed)
    const checkPromptEligibility = () => {
      const lastPromptTime = localStorage.getItem('pwa-install-prompted');
      if (lastPromptTime) {
        const lastPromptDate = new Date(parseInt(lastPromptTime, 10));
        const now = new Date();
        const daysDiff = (now.getTime() - lastPromptDate.getTime()) / (1000 * 3600 * 24);
        
        // If it's been less than 7 days since we last prompted, don't show
        if (daysDiff < 7) {
          setCanInstall(false);
          return;
        }
      }
    };

    checkPromptEligibility();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Also listen for display mode changes
    const mediaQueryList = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalledPwa(e.matches);
    };
    
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handleDisplayModeChange);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(handleDisplayModeChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handleDisplayModeChange);
      } else {
        // Fallback for older browsers
        mediaQueryList.removeListener(handleDisplayModeChange);
      }
    };
  }, []);

  // Function to trigger the install prompt
  const installApp = async (): Promise<boolean> => {
    if (!window.deferredPrompt) {
      return false;
    }

    try {
      // Show the prompt
      window.deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await window.deferredPrompt.userChoice;
      
      // Clear the deferred prompt
      window.deferredPrompt = null;
      
      // Update state based on user choice
      setCanInstall(false);
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  };

  return { canInstall, installApp, isInstalledPwa };
}