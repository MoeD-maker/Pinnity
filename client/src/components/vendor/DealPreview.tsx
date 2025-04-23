import React from 'react';
import { format } from 'date-fns';
import { CalendarDays, Star, Tag, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface DealPreviewProps {
  title: string;
  description: string;
  imageUrl?: string;
  discount: string;
  business: {
    logoUrl?: string;
    businessName: string;
  };
  startDate?: Date;
  endDate?: Date;
  dealType?: string;
  category?: string;
  isPreview?: boolean;
}

export function DealPreview({
  title,
  description,
  imageUrl,
  discount,
  business,
  startDate,
  endDate,
  dealType = 'percentage_off',
  category = 'food',
  isPreview = false
}: DealPreviewProps) {
  // Get business initials as fallback for logo
  const businessInitials = business.businessName
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  
  // Format date range
  const dateRange = startDate && endDate
    ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
    : 'Date Range Not Set';
  
  // Select category badge color
  const getCategoryBadgeColor = () => {
    switch (category) {
      case 'food': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'retail': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'services': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'beauty': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'fitness': return 'bg-green-100 text-green-800 border-green-200';
      case 'entertainment': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'travel': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Select deal type icon
  const getDealTypeIcon = () => {
    switch (dealType) {
      case 'percentage_off': return '% OFF';
      case 'fixed_amount': return '$ OFF';
      case 'buy_one_get_one': return 'BOGO';
      case 'free_item': return 'FREE';
      case 'special_price': return 'DEAL';
      default: return 'DEAL';
    }
  };
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200",
      isPreview ? "max-w-xs mx-auto" : "w-full"
    )}>
      <div className="relative">
        {/* Deal Image */}
        <div className="relative aspect-[1.91/1] bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-neutral-200 to-neutral-300">
              <Tag className="w-12 h-12 text-neutral-400" />
            </div>
          )}
          
          {/* Discount Badge */}
          <div className="absolute left-3 top-3">
            <Badge className="text-sm font-medium bg-primary/90 hover:bg-primary">
              {discount}
            </Badge>
          </div>
          
          {/* Business Logo */}
          <div className="absolute right-3 top-3">
            {business.logoUrl ? (
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white">
                <img 
                  src={business.logoUrl} 
                  alt={business.businessName} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // If logo fails to load, replace with initials
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.classList.add('flex', 'items-center', 'justify-center', 'bg-primary');
                    e.currentTarget.parentElement!.innerHTML = `<span class="text-sm font-medium text-white">${businessInitials}</span>`;
                  }}
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center bg-primary">
                <span className="text-sm font-medium text-white">{businessInitials}</span>
              </div>
            )}
          </div>
        </div>
        
        <CardContent className="p-4">
          {/* Category */}
          <Badge variant="outline" className={cn("mb-2 text-xs", getCategoryBadgeColor())}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
          
          {/* Title */}
          <h3 className="font-semibold text-base line-clamp-2 mb-1">{title}</h3>
          
          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
          
          {/* Business Name */}
          <div className="flex items-center gap-2 text-sm mb-2">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="font-medium">{business.businessName}</span>
          </div>
          
          {/* Date Range */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{dateRange}</span>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Limited time offer</span>
          </div>
          
          <Badge variant="secondary" className="text-xs font-medium">
            {getDealTypeIcon()}
          </Badge>
        </CardFooter>
      </div>
    </Card>
  );
}