import React, { useState, useEffect } from 'react';
import { Bell, X, Timer, ExternalLink } from 'lucide-react';
import { Link } from 'wouter';
import { Deal } from '@shared/schema';
import { DealWithBusiness, getExpiringSoonDeals } from '@/utils/dealReminders';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface ExpiringDealsNotificationProps {
  deals: (Deal | DealWithBusiness)[];
  onClose?: () => void;
  onViewAll?: () => void;
}

/**
 * Component to display notifications for deals that are expiring soon
 */
export default function ExpiringDealsNotification({ 
  deals,
  onClose,
  onViewAll
}: ExpiringDealsNotificationProps) {
  const [visible, setVisible] = useState(false);
  const { toast } = useToast();
  
  // Get deals that are expiring soon
  const expiringSoonDeals = getExpiringSoonDeals(deals);
  const expiringSoonCount = expiringSoonDeals.length;
  
  // Show the notification if there are expiring deals
  useEffect(() => {
    if (expiringSoonCount > 0) {
      setVisible(true);
    }
  }, [expiringSoonCount]);
  
  // Handle closing the notification
  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };
  
  // Handle viewing all expiring deals
  const handleViewAll = () => {
    if (onViewAll) onViewAll();
    handleClose();
  };
  
  // Don't render anything if there are no expiring deals or if notification is not visible
  if (expiringSoonCount === 0 || !visible) {
    return null;
  }
  
  // Show toast for single expiring deal
  if (expiringSoonCount === 1) {
    const deal = expiringSoonDeals[0];
    const businessName = 'business' in deal ? deal.business.businessName : 'a business';
    
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm shadow-lg">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-sm font-medium">Deal Expiring Soon</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-orange-500 hover:bg-orange-100 hover:text-orange-700"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="pb-3 pt-0">
            <div className="text-sm">
              <p className="mb-1 font-medium">{deal.title}</p>
              <p className="text-xs text-muted-foreground">
                From {businessName}
              </p>
            </div>
          </CardContent>
          
          <CardFooter className="pt-0">
            <div className="flex gap-2 w-full justify-between">
              <Button
                variant="ghost"
                size="sm" 
                className="text-xs h-8"
                onClick={handleClose}
              >
                Dismiss
              </Button>
              
              <Button 
                size="sm" 
                className="text-xs bg-orange-500 hover:bg-orange-600 h-8"
                asChild
              >
                <Link href={`/deals/${deal.id}`}>
                  <Timer className="h-3 w-3 mr-1" />
                  View Deal
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Show summary notification for multiple deals
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm shadow-lg">
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-sm font-medium">Deals Expiring Soon</CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-orange-500 hover:bg-orange-100 hover:text-orange-700"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3 pt-0">
          <div className="text-sm">
            <p className="mb-1">You have <strong>{expiringSoonCount}</strong> saved deals expiring soon!</p>
            <p className="text-xs text-muted-foreground">
              Don't miss out on these offers before they expire.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="pt-0">
          <div className="flex gap-2 w-full justify-between">
            <Button
              variant="ghost"
              size="sm" 
              className="text-xs h-8"
              onClick={handleClose}
            >
              Dismiss
            </Button>
            
            <Button 
              size="sm" 
              className="text-xs bg-orange-500 hover:bg-orange-600 h-8"
              onClick={handleViewAll}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View All
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}