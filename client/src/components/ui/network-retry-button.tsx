import { useState, useEffect } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface NetworkRetryButtonProps extends Omit<ButtonProps, 'onClick'> {
  onRetry: () => Promise<any>;
  loadingText?: string;
  offlineText?: string;
  retryText?: string;
  maxRetries?: number;
  onMaxRetriesReached?: () => void;
}

/**
 * Network-aware retry button that handles online/offline states
 * and provides visual feedback during retry operations.
 */
export function NetworkRetryButton({
  onRetry,
  loadingText = 'Retrying...',
  offlineText = 'You\'re Offline',
  retryText = 'Retry',
  maxRetries = 3,
  onMaxRetriesReached,
  className,
  variant = 'default',
  disabled,
  children,
  ...props
}: NetworkRetryButtonProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryExhausted, setRetryExhausted] = useState(false);
  
  // Update online status when network state changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Reset retry count when online status changes
  useEffect(() => {
    if (isOnline) {
      setRetryExhausted(false);
    }
  }, [isOnline]);
  
  const handleRetry = async () => {
    if (!isOnline) {
      toast({
        title: "You're offline",
        description: "Please check your internet connection and try again",
        variant: "destructive",
      });
      return;
    }
    
    if (retryExhausted) {
      toast({
        title: "Retry limit reached",
        description: "Please try again later or refresh the page",
        variant: "destructive",
      });
      return;
    }
    
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    try {
      await onRetry();
      // Reset retry count on success
      setRetryCount(0);
      toast({
        title: "Success",
        description: "Operation completed successfully",
      });
    } catch (error) {
      console.error('Retry failed:', error);
      
      // Check if we've reached max retries
      if (retryCount >= maxRetries) {
        setRetryExhausted(true);
        
        toast({
          title: "Retry limit reached",
          description: "Please try again later or refresh the page",
          variant: "destructive",
        });
        
        if (onMaxRetriesReached) {
          onMaxRetriesReached();
        }
      } else {
        toast({
          title: "Retry failed",
          description: `Attempt ${retryCount} of ${maxRetries} failed. Please try again.`,
          variant: "destructive",
        });
      }
    } finally {
      setIsRetrying(false);
    }
  };
  
  // Determine button state
  const isDisabled = disabled || isRetrying || retryExhausted;
  const buttonText = isRetrying ? loadingText : !isOnline ? offlineText : retryText;
  const buttonIcon = isRetrying ? (
    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  ) : !isOnline ? (
    <WifiOff className="mr-2 h-4 w-4" />
  ) : (
    <RefreshCw className="mr-2 h-4 w-4" />
  );
  
  // Variant based on state
  const buttonVariant = !isOnline 
    ? 'outline' 
    : retryExhausted 
      ? 'destructive' 
      : variant;
  
  return (
    <Button
      variant={buttonVariant as any}
      onClick={handleRetry}
      disabled={isDisabled}
      className={cn(className)}
      {...props}
    >
      {buttonIcon}
      {children || buttonText}
      {retryCount > 0 && !isRetrying && !retryExhausted && (
        <span className="ml-2 text-xs bg-background/20 px-1.5 py-0.5 rounded-full">
          {retryCount}/{maxRetries}
        </span>
      )}
    </Button>
  );
}