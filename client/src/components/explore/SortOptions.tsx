import React from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  ThumbsUp, 
  ArrowUpDown
} from 'lucide-react';
import useWindowSize from '@/hooks/use-window-size';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export type SortOption = 'trending' | 'newest' | 'endingSoon' | 'popular';

interface SortOptionsProps {
  selectedSort: SortOption;
  onChange: (sortOption: SortOption) => void;
  variant?: 'tabs' | 'select' | 'buttons';
  className?: string;
}

export default function SortOptions({ 
  selectedSort, 
  onChange, 
  variant = 'tabs',
  className = ''
}: SortOptionsProps) {
  
  // Common sort options data
  const sortOptions = [
    { 
      id: 'trending' as SortOption, 
      label: 'Trending Now', 
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Deals with high views and saves'
    },
    { 
      id: 'newest' as SortOption, 
      label: 'New Arrivals', 
      icon: <Clock className="h-4 w-4" />,
      description: 'Recently added deals'
    },
    { 
      id: 'endingSoon' as SortOption, 
      label: 'Ending Soon', 
      icon: <Calendar className="h-4 w-4" />,
      description: 'Deals about to expire'
    },
    { 
      id: 'popular' as SortOption, 
      label: 'Most Popular', 
      icon: <ThumbsUp className="h-4 w-4" />,
      description: 'Highest redemption rates'
    }
  ];
  
  // Use our custom hook for better device detection
  const { isMobile } = useWindowSize();
  
  // On small screens, use select variant for better mobile UX
  const effectiveVariant = isMobile ? 'select' : variant;
  
  // Render as tabs (default on desktop)
  if (effectiveVariant === 'tabs') {
    return (
      <div className={className}>
        <Tabs 
          value={selectedSort} 
          onValueChange={(value) => onChange(value as SortOption)}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-4 h-12 sm:h-11">
            {sortOptions.map(option => (
              <TabsTrigger 
                key={option.id} 
                value={option.id}
                className="flex items-center justify-center gap-1 py-2.5 px-1"
              >
                <span className="hidden sm:inline">{option.icon}</span>
                <span className="text-xs sm:text-sm truncate">{option.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    );
  }
  
  // Render as a select dropdown
  if (effectiveVariant === 'select') {
    return (
      <div className={className}>
        <Select value={selectedSort} onValueChange={(value) => onChange(value as SortOption)}>
          <SelectTrigger className="w-full h-11 px-3">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground mr-1" />
              <span className="text-sm font-medium">Sort:</span>
              {sortOptions.find(opt => opt.id === selectedSort)?.icon}
              <SelectValue placeholder="Select sort order" />
            </div>
          </SelectTrigger>
          <SelectContent position="popper" className="min-w-[240px]">
            {sortOptions.map(option => (
              <SelectItem key={option.id} value={option.id} className="py-2">
                <div className="flex items-center gap-2">
                  {option.icon}
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  // Render as buttons
  return (
    <div className={`flex flex-wrap gap-2 sm:gap-2 ${className}`}>
      {sortOptions.map(option => (
        <Button 
          key={option.id}
          variant={selectedSort === option.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.id)}
          className="flex items-center gap-1 h-10 sm:h-9 px-2 sm:px-3 flex-1 sm:flex-none"
        >
          {option.icon}
          <span className="text-xs sm:text-sm">{option.label}</span>
        </Button>
      ))}
    </div>
  );
}