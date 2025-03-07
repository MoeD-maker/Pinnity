import React from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getExpirationNotificationText } from '@/utils/dealReminders';

// Import the DealLike interface from the utils
import { DealLike } from '@/utils/dealReminders';

interface ExpiringDealsNotificationProps {
  deals: DealLike[];
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
  if (!deals || deals.length === 0) {
    return null;
  }
  
  return (
    <Card className="w-full max-w-md shadow-lg border-yellow-300 border-l-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-base">Deals Expiring Soon</CardTitle>
          </div>
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          {deals.length === 1 
            ? "You have 1 saved deal that's about to expire" 
            : `You have ${deals.length} saved deals that are about to expire`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {deals.slice(0, 3).map((deal) => (
            <li key={deal.id} className="text-sm">
              • {getExpirationNotificationText(deal)}
            </li>
          ))}
          {deals.length > 3 && (
            <li className="text-sm text-muted-foreground">
              • And {deals.length - 3} more...
            </li>
          )}
        </ul>
      </CardContent>
      {onViewAll && (
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onViewAll}
            className="w-full flex items-center gap-1"
          >
            View all expiring deals
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}