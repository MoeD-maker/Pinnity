import { useState, useEffect } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// We're only extending the Window interface in the global scope, not redefining it
declare global {
  interface Window {
    deferredPrompt: any; // Using 'any' to avoid type conflicts
  }
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [installationResult, setInstallationResult] = useState<'accepted' | 'dismissed' | null>(null);
  
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Store the event for later use
      window.deferredPrompt = e as BeforeInstallPromptEvent;
      
      // Update UI to indicate app can be installed
      setCanInstall(true);
    };
    
    const handleAppInstalled = () => {
      // App was installed
      setCanInstall(false);
      window.deferredPrompt = null;
    };
    
    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Check if deferredPrompt exists on mount (e.g. if event was fired before hook was initialized)
    if (window.deferredPrompt) {
      setCanInstall(true);
    }
    
    // Clean up
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  const promptInstall = async () => {
    if (!window.deferredPrompt) {
      console.warn('No installation prompt available');
      return false;
    }
    
    // Show the prompt
    await window.deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const choiceResult = await window.deferredPrompt.userChoice;
    
    // User has responded to the prompt
    setInstallationResult(choiceResult.outcome);
    
    // Clear the saved prompt since it can't be used again
    window.deferredPrompt = null;
    setCanInstall(false);
    
    return choiceResult.outcome === 'accepted';
  };
  
  return {
    canInstall,
    promptInstall,
    installationResult
  };
}