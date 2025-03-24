import React from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  ThumbsUp, 
  ArrowUpDown
} from 'lucide-react';
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
  
  // Render as tabs (default)
  if (variant === 'tabs') {
    return (
      <div className={className}>
        <Tabs 
          value={selectedSort} 
          onValueChange={(value) => onChange(value as SortOption)}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-4">
            {sortOptions.map(option => (
              <TabsTrigger 
                key={option.id} 
                value={option.id}
                className="flex items-center gap-1"
              >
                <span className="hidden sm:inline">{option.icon}</span>
                <span className="text-xs sm:text-sm">{option.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
    );
  }
  
  // Render as a select dropdown
  if (variant === 'select') {
    return (
      <div className={className}>
        <Select value={selectedSort} onValueChange={(value) => onChange(value as SortOption)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select sort order" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map(option => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex items-center gap-2">
                  {option.icon}
                  <div>
                    <div>{option.label}</div>
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
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {sortOptions.map(option => (
        <Button 
          key={option.id}
          variant={selectedSort === option.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(option.id)}
          className="flex items-center gap-1"
        >
          {option.icon}
          <span>{option.label}</span>
        </Button>
      ))}
    </div>
  );
}