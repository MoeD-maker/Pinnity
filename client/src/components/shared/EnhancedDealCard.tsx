import React, { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  MapPin, 
  Calendar, 
  Clock, 
  ThumbsUp,
  Share2,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { isExpiringSoon, getExpirationText, isExpired } from '@/utils/dealReminders';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import DealAvailabilityBadge from '@/components/shared/DealAvailabilityBadge';

// Interface for deal with business data
interface DealWithBusiness {
  id: number;
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  startDate: Date | string;
  endDate: Date | string;
  discount?: string;
  business: {
    id?: number;
    businessName: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    website?: string;
    [key: string]: any;
  };
  isRecurring?: boolean;
  availability?: {
    isAvailableToday: boolean;
    nextAvailableDay?: number | null;
    nextAvailableDayName?: string | null;
    availableDays?: number[];
    availableDayNames?: string[];
  };
  redemptionCount?: number;
  viewCount?: number;
  featured?: boolean;
  [key: string]: any;
}

interface EnhancedDealCardProps {
  deal: DealWithBusiness;
  onSelect: () => void;
  distanceText: string;
  isLarge?: boolean;
}

const EnhancedDealCard: React.FC<EnhancedDealCardProps> = ({ 
  deal, 
  onSelect, 
  distanceText,
  isLarge = false 
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Get formatted expiration text
  const expirationText = getExpirationText(deal);
  
  // Calculate discount percentage or value
  const discount = deal.discount || '';
  
  // Check if the deal is ending soon (less than 3 days)
  const endDate = new Date(deal.endDate);
  const today = new Date();
  const daysLeft = differenceInDays(endDate, today);
  const isEndingSoon = daysLeft >= 0 && daysLeft < 3;
  
  // Check if deal is popular (more than 50 redemptions)
  const isPopular = (deal.redemptionCount || 0) > 50;
  
  // Get recurring days text
  const recurringDaysText = deal.isRecurring && deal.availability?.availableDayNames?.length 
    ? `Available on: ${deal.availability.availableDayNames.join(' & ')}` 
    : '';

  return (
    <Card 
      ref={ref} 
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer w-full"
      onClick={onSelect}
    >
      {inView ? (
        <div className="aspect-video relative overflow-hidden">
          <img 
            src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
            alt={deal.title}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
          {/* Discount badge */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-primary text-primary-foreground text-sm font-semibold">
              {discount}
            </Badge>
          </div>
          
          {/* Favorite button */}
          <FavoriteButton dealId={deal.id} />
          
          {/* Share button - new addition */}
          <ShareButton />
          
          {/* Deal Availability Badge for recurring deals */}
          <DealAvailabilityBadge 
            isRecurring={deal.isRecurring} 
            availability={deal.availability}
            variant="card"
          />
          
          {/* Distance indicator */}
          <div className="absolute bottom-2 left-2">
            <Badge 
              variant="outline" 
              className="bg-black/70 text-white border-transparent text-xs flex gap-1 items-center px-2 py-0.5"
            >
              <MapPin className="h-3 w-3" />
              <span>{distanceText}</span>
            </Badge>
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-muted animate-pulse" />
      )}
      
      <CardHeader className="p-3 sm:p-4 pb-1 pt-3">
        {/* Business Identity area - new addition */}
        <div className="flex items-center gap-3 mb-2 border-b pb-2">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
            {deal.business?.logoUrl || deal.business?.image_url ? (
              <img 
                src={deal.business.logoUrl || deal.business.image_url} 
                alt={deal.business.businessName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  console.error("Logo failed to load:", e);
                  // Replace with fallback on error
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement?.querySelector('div')?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-full w-full flex items-center justify-center bg-primary/10 text-primary font-semibold ${deal.business?.logoUrl || deal.business?.image_url ? 'hidden' : ''}`}>
              {deal.business.businessName.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm line-clamp-1">{deal.business.businessName}</p>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs h-5 px-1.5">
                {deal.category}
              </Badge>
              {isPopular && (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs h-5 px-1.5 flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  <span>{deal.redemptionCount}+ redeemed</span>
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Deal title */}
        <h3 className="font-semibold text-base sm:text-lg line-clamp-1 mt-1">
          {deal.title}
        </h3>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-4 pt-0">
        <p className="text-xs sm:text-sm line-clamp-2 mb-3">
          {deal.description}
        </p>
        
        {/* Date & availability information - enhanced */}
        <div className="space-y-1">
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1.5" />
            <span className={isEndingSoon ? "text-amber-600 font-medium" : ""}>
              {isEndingSoon ? `Ending soon: ${daysLeft} days left` : expirationText}
            </span>
          </div>
          
          {/* Recurring deal days indicator - new addition */}
          {deal.isRecurring && recurringDaysText && (
            <div className="flex items-center text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3 mr-1.5" />
              <span>{recurringDaysText}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-3 sm:p-4 pt-1 flex justify-end items-center">
        {/* View Deal button - enhanced */}
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }} 
          className="px-3 h-9 bg-primary/90 hover:bg-primary text-white"
          size="sm"
        >
          View Deal
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// Favorite button component
function FavoriteButton({ dealId }: { dealId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Check if this deal is already in favorites
  const { data: favorites } = useQuery({
    queryKey: ['/api/v1/user', user?.id, 'favorites'],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await apiRequest(`/api/v1/user/${user.id}/favorites`);
        return response || [];
      } catch (error) {
        console.error('Error fetching favorites:', error);
        return [];
      }
    },
    enabled: !!user,
  });
  
  // Set initial favorite state once favorites are loaded
  React.useEffect(() => {
    if (favorites && Array.isArray(favorites)) {
      const isFav = favorites.some((fav: any) => fav?.deal?.id === dealId);
      setIsFavorite(isFav);
    }
  }, [favorites, dealId]);
  
  // Add to favorites mutation
  const addToFavorites = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return apiRequest(`/api/v1/user/${user.id}/favorites`, {
        method: 'POST',
        data: { dealId }
      });
    },
    onSuccess: () => {
      setIsFavorite(true);
      toast({
        title: 'Deal saved',
        description: 'Deal has been added to your favorites',
      });
      // Invalidate favorites query to fetch updated list
      queryClient.invalidateQueries({ queryKey: ['/api/v1/user', user?.id, 'favorites'] });
    },
    onError: (error) => {
      console.error('Error adding to favorites:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add deal to favorites',
      });
    }
  });
  
  // Remove from favorites mutation
  const removeFromFavorites = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return apiRequest(`/api/v1/user/${user.id}/favorites/${dealId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      setIsFavorite(false);
      toast({
        title: 'Deal removed',
        description: 'Deal has been removed from your favorites',
      });
      // Invalidate favorites query to fetch updated list
      queryClient.invalidateQueries({ queryKey: ['/api/v1/user', user?.id, 'favorites'] });
    },
    onError: (error) => {
      console.error('Error removing from favorites:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove deal from favorites',
      });
    }
  });
  
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click event
    
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to save deals to favorites',
      });
      return;
    }
    
    if (isFavorite) {
      removeFromFavorites.mutate();
    } else {
      addToFavorites.mutate();
    }
  };
  
  const isPending = addToFavorites.isPending || removeFromFavorites.isPending;
  
  return (
    <Button 
      size="icon" 
      variant="ghost" 
      className="absolute top-2 left-2 bg-white/80 hover:bg-white h-8 w-8"
      onClick={handleToggleFavorite}
      disabled={isPending}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
    </Button>
  );
}

// Share button component - new addition
function ShareButton() {
  const { toast } = useToast();
  
  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click event
    
    // Check if navigator.share is available (mainly mobile devices)
    if (navigator.share) {
      navigator.share({
        title: 'Check out this deal on Pinnity!',
        url: window.location.href,
      })
      .catch(error => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback - copy link to clipboard
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast({
            title: 'Link copied',
            description: 'Deal link copied to clipboard',
          });
        })
        .catch(error => {
          console.error('Error copying link:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to copy link',
          });
        });
    }
  };
  
  return (
    <Button 
      size="icon" 
      variant="ghost" 
      className="absolute top-2 left-12 bg-white/80 hover:bg-white h-8 w-8"
      onClick={handleShare}
      aria-label="Share deal"
    >
      <Share2 className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}

export default EnhancedDealCard;