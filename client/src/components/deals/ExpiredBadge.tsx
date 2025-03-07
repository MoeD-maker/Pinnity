import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { DealLike, isExpired } from '@/utils/dealReminders';

interface ExpiredBadgeProps {
  deal: DealLike;
  className?: string;
}

/**
 * A badge that shows when a deal is expired
 */
export default function ExpiredBadge({ deal, className = '' }: ExpiredBadgeProps) {
  if (!isExpired(deal)) {
    return null;
  }
  
  return (
    <Badge 
      variant="outline" 
      className={`flex items-center gap-1 border-destructive text-destructive ${className}`}
    >
      <X className="h-3 w-3" />
      Expired
    </Badge>
  );
}