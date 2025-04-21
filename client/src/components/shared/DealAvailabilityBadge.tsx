import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CalendarDays, CheckCircle } from 'lucide-react';
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
  variant?: 'default' | 'featured' | 'card' | 'detail';
}

/**
 * An enhanced component that displays availability information for recurring deals
 * with improved visual indicators
 */
const DealAvailabilityBadge: React.FC<DealAvailabilityBadgeProps> = ({ 
  isRecurring, 
  availability,
  variant = 'default'
}) => {
  if (!isRecurring || !availability) return null;

  const { isAvailableToday, nextAvailableDayName, availableDayNames = [] } = availability;
  
  // Enhanced text format
  const availabilityText = isAvailableToday 
    ? 'Available Today' 
    : nextAvailableDayName 
      ? `Next: ${nextAvailableDayName}` 
      : 'Not Available Today';

  // More prominent styling for availability
  const badgeStyle = variant === 'featured' 
    ? 'bg-[#00796B] hover:bg-[#00796B]/90 text-white' 
    : isAvailableToday 
      ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' 
      : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';

  // Position differently based on variant
  const containerStyle = variant === 'card' 
    ? 'absolute top-2 right-2 z-10' 
    : variant === 'detail'
      ? 'inline-flex mb-2'
      : 'inline-flex';

  return (
    <div className={containerStyle}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              className={`flex items-center gap-1.5 ${badgeStyle} py-1 px-2`}
              variant="outline"
            >
              {isAvailableToday 
                ? <CheckCircle className="h-3.5 w-3.5" /> 
                : variant === 'detail' 
                  ? <CalendarDays className="h-3.5 w-3.5" />
                  : <Clock className="h-3.5 w-3.5" />
              }
              <span className="text-xs font-medium">{availabilityText}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-3">
            <div className="space-y-1.5">
              <p className="font-medium">Recurring Deal</p>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-primary" />
                <p className="text-sm">Available on: {availableDayNames.join(', ')}</p>
              </div>
              {isAvailableToday && (
                <div className="flex items-center gap-1.5 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <p className="text-sm font-medium">Available today!</p>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default DealAvailabilityBadge;