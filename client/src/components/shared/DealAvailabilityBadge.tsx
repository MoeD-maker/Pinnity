import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface DealAvailability {
  isAvailableToday: boolean;
  nextAvailableDay?: number | null;
  nextAvailableDayName?: string | null;
  availableDays?: number[];
  availableDayNames?: string[];
}

interface DealAvailabilityBadgeProps {
  isRecurring?: boolean;
  availability?: DealAvailability;
  variant?: 'default' | 'featured' | 'card';
}

/**
 * A component that displays availability information for recurring deals
 */
const DealAvailabilityBadge: React.FC<DealAvailabilityBadgeProps> = ({ 
  isRecurring, 
  availability,
  variant = 'default'
}) => {
  if (!isRecurring || !availability) return null;

  const { isAvailableToday, nextAvailableDayName, availableDayNames = [] } = availability;
  const availabilityText = isAvailableToday 
    ? 'Available Today' 
    : nextAvailableDayName 
      ? `Next Available: ${nextAvailableDayName}` 
      : 'Not Available Today';

  const badgeStyle = variant === 'featured' 
    ? 'bg-[#00796B] hover:bg-[#00796B]/90 text-white' 
    : isAvailableToday 
      ? 'bg-green-100 text-green-800 hover:bg-green-200' 
      : 'bg-amber-100 text-amber-800 hover:bg-amber-200';

  const containerStyle = variant === 'card' 
    ? 'absolute top-2 right-2 z-10' 
    : 'inline-flex';

  return (
    <div className={containerStyle}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              className={`flex items-center gap-1 ${badgeStyle}`}
              variant="outline"
            >
              {isAvailableToday ? <Calendar className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              <span className="text-xs font-medium">{availabilityText}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Recurring Deal</p>
            <p>Available on: {availableDayNames.join(', ')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default DealAvailabilityBadge;