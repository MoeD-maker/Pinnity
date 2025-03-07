import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, X } from 'lucide-react';
import { DealLike, isExpired } from '@/utils/dealReminders';

interface ExpiringSoonBadgeProps {
  deal: DealLike;
  className?: string;
}

/**
 * A badge that shows when a deal is expiring soon
 */
export default function ExpiringSoonBadge({ deal, className = '' }: ExpiringSoonBadgeProps) {
  // Handle different date formats
  const endDate = typeof deal.endDate === 'string' 
    ? new Date(deal.endDate) 
    : deal.endDate instanceof Date 
      ? deal.endDate 
      : new Date();
      
  const now = new Date();
  
  // Calculate the difference in hours
  const diffTime = endDate.getTime() - now.getTime();
  const diffHours = diffTime / (1000 * 60 * 60);
  
  // Only show the badge if the deal is expiring within 48 hours
  if (diffHours <= 0 || diffHours > 48) {
    return null;
  }
  
  let badgeText = '';
  let badgeVariant: 'destructive' | 'outline' = 'destructive';
  
  if (diffHours < 1) {
    badgeText = 'Expires in < 1 hour';
  } else if (diffHours < 24) {
    badgeText = `Expires in ${Math.floor(diffHours)} hour${Math.floor(diffHours) !== 1 ? 's' : ''}`;
  } else {
    badgeText = `Expires in ${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) !== 1 ? 's' : ''}`;
    badgeVariant = 'outline';
  }
  
  return (
    <Badge 
      variant={badgeVariant} 
      className={`flex items-center gap-1 ${className}`}
    >
      <Clock className="h-3 w-3" />
      {badgeText}
    </Badge>
  );
}