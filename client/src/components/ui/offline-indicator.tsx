import React, { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getPendingRequestCount } from '@/lib/offlineStorage';
import { AlertTriangle, CloudOff, RefreshCw, Check, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineIndicatorProps {
  className?: string;
  variant?: 'minimal' | 'compact' | 'full';
  position?: 'top' | 'bottom' | 'inline';
  showSyncButton?: boolean;
  onSyncRequested?: () => Promise<void>;
}

/**
 * Component to display the offline status with visual indicators
 */
export function OfflineIndicator({
  className,
  variant = 'compact',
  position = 'top',
  showSyncButton = true,
  onSyncRequested
}: OfflineIndicatorProps) {
  const { isOnline, lastOnlineAt, attemptReconnection, connectionAttempts } = useOnlineStatus();
  const [pendingRequests, setPendingRequests] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Format the time since last online
  const formattedOfflineTime = lastOnlineAt ? getTimeSince(lastOnlineAt) : 'unknown time';
  
  // Update the pending request count
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await getPendingRequestCount();
      setPendingRequests(count);
    };
    
    updatePendingCount();
    
    // Update every 10 seconds
    const interval = setInterval(updatePendingCount, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Attempt to sync pending requests
  const handleSyncRequested = async () => {
    if (syncInProgress || !isOnline) return;
    
    setSyncInProgress(true);
    
    try {
      if (onSyncRequested) {
        await onSyncRequested();
      }
      
      // Update the count after sync
      const count = await getPendingRequestCount();
      setPendingRequests(count);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncInProgress(false);
    }
  };
  
  // Show the tooltip briefly when going offline
  useEffect(() => {
    if (!isOnline) {
      setShowTooltip(true);
      const timeout = setTimeout(() => setShowTooltip(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline]);
  
  // Define classes based on position
  const positionClasses = {
    top: 'fixed top-0 left-0 right-0 z-50',
    bottom: 'fixed bottom-0 left-0 right-0 z-50',
    inline: 'relative'
  };
  
  // Skip rendering if online and no pending requests (for minimal variant)
  if (isOnline && pendingRequests === 0 && variant === 'minimal') {
    return null;
  }
  
  return (
    <AnimatePresence>
      {(!isOnline || pendingRequests > 0 || variant === 'full') && (
        <TooltipProvider>
          <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
            <TooltipTrigger asChild>
              <motion.div
                initial={{ opacity: 0, y: position === 'bottom' ? 40 : -40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: position === 'bottom' ? 40 : -40 }}
                className={cn(
                  position !== 'inline' && positionClasses[position],
                  "flex items-center justify-center px-4 py-2 text-sm transition-all",
                  isOnline ? "bg-yellow-50 text-yellow-900" : "bg-red-50 text-red-900",
                  variant === 'minimal' && 'bg-transparent py-0',
                  className
                )}
              >
                {/* Status icon */}
                <div className="flex items-center mr-2">
                  {isOnline ? (
                    <Wifi size={16} className="text-green-600" />
                  ) : (
                    <WifiOff size={16} className="text-red-600 animate-pulse" />
                  )}
                </div>
                
                {/* Status text - only show in full or compact mode */}
                {variant !== 'minimal' && (
                  <div className="flex-1">
                    {!isOnline ? (
                      <span className="font-medium">
                        You're offline {variant === 'full' && `for ${formattedOfflineTime}`}
                      </span>
                    ) : pendingRequests > 0 ? (
                      <span className="font-medium">
                        {pendingRequests} {pendingRequests === 1 ? 'change' : 'changes'} pending sync
                      </span>
                    ) : (
                      <span className="font-medium">Connected</span>
                    )}
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="flex items-center ml-2 space-x-2">
                  {!isOnline && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => attemptReconnection()}
                      disabled={connectionAttempts > 0 && connectionAttempts % 5 === 0}
                    >
                      <RefreshCw size={14} className={connectionAttempts > 0 ? 'animate-spin' : ''} />
                      {variant === 'full' && <span className="ml-1">Try again</span>}
                    </Button>
                  )}
                  
                  {isOnline && pendingRequests > 0 && showSyncButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={handleSyncRequested}
                      disabled={syncInProgress}
                    >
                      {syncInProgress ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <CloudOff size={14} />
                      )}
                      {variant === 'full' && (
                        <span className="ml-1">
                          {syncInProgress ? 'Syncing...' : 'Sync now'}
                        </span>
                      )}
                    </Button>
                  )}
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              {!isOnline ? (
                <p>You're offline. Your changes will be saved locally and synced when you reconnect.</p>
              ) : pendingRequests > 0 ? (
                <p>You have {pendingRequests} {pendingRequests === 1 ? 'change' : 'changes'} waiting to be synced to the server.</p>
              ) : (
                <p>You're online and all changes are synced.</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </AnimatePresence>
  );
}

/**
 * Format the time since a given date in a readable format
 */
function getTimeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' minutes';
  
  return Math.floor(seconds) + ' seconds';
}