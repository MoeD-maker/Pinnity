import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useBackgroundSync } from '@/lib/backgroundSync';
import { registerBackgroundSync } from '@/lib/backgroundSync';
import { initOfflineStorage } from '@/lib/offlineStorage';
import { OfflineIndicator } from '@/components/ui/offline-indicator';
import { useToast } from '@/hooks/use-toast';

interface OfflineOnboardingContextType {
  isOnline: boolean;
  isSyncPending: boolean;
  lastOnlineAt: Date | null;
  performSync: () => Promise<void>;
  offlineDuration: number | null;
}

const OfflineOnboardingContext = createContext<OfflineOnboardingContextType | null>(null);

export const useOfflineOnboarding = () => {
  const context = useContext(OfflineOnboardingContext);
  if (!context) {
    throw new Error('useOfflineOnboarding must be used within an OfflineOnboardingProvider');
  }
  return context;
};

interface OfflineOnboardingProviderProps {
  children: ReactNode;
  autoSyncOnReconnect?: boolean;
}

/**
 * Provider component that manages offline state and synchronization for the onboarding flow
 */
export function OfflineOnboardingProvider({
  children,
  autoSyncOnReconnect = true
}: OfflineOnboardingProviderProps) {
  const { isOnline, lastOnlineAt, offlineDuration, attemptReconnection } = useOnlineStatus();
  const { syncStatus, lastSyncResult, isSyncingEnabled, performSync } = useBackgroundSync();
  const { toast } = useToast();
  
  const [isSyncPending, setIsSyncPending] = useState(false);
  
  // Initialize offline storage and background sync on mount
  useEffect(() => {
    const initialize = async () => {
      // Initialize the offline storage system
      await initOfflineStorage();
      
      // Try to register background sync if the browser supports it
      const syncRegistered = await registerBackgroundSync();
      console.log(`Background sync registration ${syncRegistered ? 'successful' : 'not supported'}`);
    };
    
    initialize();
  }, []);
  
  // Handle online/offline status changes
  useEffect(() => {
    if (isOnline) {
      // We're back online
      toast({
        title: "You're back online",
        description: "Your data will be synchronized automatically.",
        duration: 3000
      });
      
      // Auto-sync if enabled
      if (autoSyncOnReconnect) {
        performSync();
      }
    } else {
      // We've gone offline
      toast({
        title: "You're offline",
        description: "Don't worry, you can continue the onboarding process. We'll save your progress locally.",
        duration: 5000
      });
    }
  }, [isOnline, toast, autoSyncOnReconnect, performSync]);
  
  // Handle sync status changes
  useEffect(() => {
    setIsSyncPending(syncStatus === 'syncing');
    
    // Show toast for sync completion if we have results
    if (lastSyncResult && syncStatus !== 'syncing') {
      if (syncStatus === 'success') {
        toast({
          title: "Sync completed",
          description: `Successfully synchronized ${lastSyncResult.success} items.`,
          duration: 3000
        });
      } else if (syncStatus === 'error' && lastSyncResult.failed > 0) {
        toast({
          title: "Sync partially failed",
          description: `${lastSyncResult.success} items synced, ${lastSyncResult.failed} failed. Will retry automatically.`,
          duration: 5000,
          variant: "destructive"
        });
      }
    }
  }, [syncStatus, lastSyncResult, toast]);
  
  // Manual sync handler
  const handleManualSync = async () => {
    if (!isOnline) {
      // Try to reconnect first
      const reconnected = await attemptReconnection();
      
      if (!reconnected) {
        toast({
          title: "Still offline",
          description: "Can't synchronize while offline. Please check your connection.",
          duration: 3000,
          variant: "destructive"
        });
        return;
      }
    }
    
    // Perform the sync
    await performSync();
  };
  
  return (
    <OfflineOnboardingContext.Provider
      value={{
        isOnline,
        isSyncPending,
        lastOnlineAt,
        performSync: handleManualSync,
        offlineDuration
      }}
    >
      {children}
      
      {/* Offline indicator that shows at the top of the page */}
      <OfflineIndicator 
        position="top" 
        variant="compact" 
        showSyncButton={true}
        onSyncRequested={handleManualSync}
      />
    </OfflineOnboardingContext.Provider>
  );
}