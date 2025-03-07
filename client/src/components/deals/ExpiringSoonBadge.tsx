import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Timer } from 'lucide-react';
import { Deal } from '@shared/schema';
import { isExpiringSoon, getExpirationNotificationText, DealWithBusiness } from '@/utils/dealReminders';

interface ExpiringSoonBadgeProps {
  deal: Deal | DealWithBusiness;
  className?: string;
}

/**
 * A badge that shows when a deal is expiring soon
 */
export default function ExpiringSoonBadge({ deal, className = '' }: ExpiringSoonBadgeProps) {
  // Only show the badge if the deal is expiring soon
  if (!isExpiringSoon(deal)) {
    return null;
  }

  const expirationText = getExpirationNotificationText(deal);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="destructive" 
            className={`flex items-center gap-1 ml-auto px-2 ${className}`}
          >
            <Timer className="h-3 w-3" />
            <span>Expiring Soon</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{expirationText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}