import React, { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MapPin, Calendar, Clock, Database } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { isExpiringSoon, getExpirationText, isExpired } from '@/utils/dealReminders';
import ExpiringSoonBadge from '@/components/deals/ExpiringSoonBadge';
import ExpiredBadge from '@/components/deals/ExpiredBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import CachedDataAlert from '@/components/ui/CachedDataAlert';

// Use a looser type for the API response since it may not match the database schema exactly
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
    address?: string;
    phone?: string;
    website?: string;
    [key: string]: any;
  };
  [key: string]: any; // Allow any additional properties
}

interface DealGridProps {
  deals: DealWithBusiness[];
  isLoading: boolean;
  onSelect: (dealId: number) => void;
  isCached?: boolean;
  cacheDate?: string | number | Date;
  onRefresh?: () => void;
}

export default function DealGrid({ 
  deals, 
  isLoading, 
  onSelect, 
  isCached = false,
  cacheDate,
  onRefresh
}: DealGridProps) {
  // For optimization, we could implement virtualization for large lists

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full pb-16">
        {Array.from({ length: 6 }).map((_, i) => (
          <DealCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-12 pb-16">
        <h3 className="text-xl font-medium mb-2">No deals found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
      </div>
    );
  }

  return (
    <>
      <CachedDataAlert 
        isCached={isCached} 
        cachedDate={cacheDate} 
        onRefresh={onRefresh}
        className="mb-4"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full pb-16">
        {deals.map((deal, index) => (
          <DealCard 
            key={`deal-${deal.id}-${index}`} 
            deal={deal} 
            onSelect={() => onSelect(deal.id)} 
            isCached={isCached}
          />
        ))}
      </div>
    </>
  );
}

interface DealCardProps {
  deal: DealWithBusiness;
  onSelect: () => void;
  isCached?: boolean;
}

function DealCard({ deal, onSelect, isCached = false }: DealCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Apply defensive programming by providing defaults for missing values
  const safeTitle = deal?.title || 'Untitled Deal';
  const safeDescription = deal?.description || 'No description available';
  const safeCategory = deal?.category || 'Other';
  const safeImageUrl = deal?.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3';
  const safeId = deal?.id || 0;
  
  // Get business name safely
  const safeBusiness = deal?.business || {};
  const safeBusinessName = safeBusiness?.businessName || 'Unknown Business';
  
  // Get formatted expiration text
  const expirationText = getExpirationText(deal);
  
  // Calculate discount percentage or value
  const discount = deal?.discount || '';

  return (
    <Card 
      ref={ref} 
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer w-full"
      onClick={onSelect}
    >
      {inView ? (
        <div className="aspect-video relative overflow-hidden">
          <img 
            src={safeImageUrl} 
            alt={safeTitle}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-primary text-primary-foreground">
              {discount}
            </Badge>
          </div>
          <FavoriteButton dealId={safeId} />
          
          {/* Cache indicator for individual deal cards */}
          {isCached && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs flex gap-1 items-center px-2 py-0.5">
                <Database className="h-3 w-3" />
                <span>Cached</span>
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-muted animate-pulse" />
      )}
      
      <CardHeader className="p-3 sm:p-4 pb-2">
        <div className="flex justify-between items-start">
          <div className="w-full">
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
              <Badge variant="outline" className="text-xs">
                {safeCategory}
              </Badge>
              {deal && isExpired(deal) ? (
                <ExpiredBadge deal={deal} />
              ) : deal && isExpiringSoon(deal) && (
                <ExpiringSoonBadge deal={deal} />
              )}
            </div>
            <h3 className="font-semibold text-base sm:text-lg line-clamp-1">{safeTitle}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
              {safeBusinessName}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-4 pt-0">
        <p className="text-xs sm:text-sm line-clamp-2 mb-2">
          {safeDescription}
        </p>
        
        <div className="flex items-center text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 mr-1" />
          <span className="mr-3">2.4 miles</span>
          <Calendar className="h-3 w-3 mr-1" />
          <span>{expirationText}</span>
        </div>
      </CardContent>
      
      <CardFooter className="p-3 sm:p-4 pt-0">
        <Button onClick={onSelect} className="w-full text-sm h-9">
          View Deal
        </Button>
      </CardFooter>
    </Card>
  );
}

function DealCardSkeleton() {
  return (
    <Card className="overflow-hidden w-full">
      <div className="aspect-video">
        <Skeleton className="h-full w-full" />
      </div>
      <CardHeader className="p-3 sm:p-4 pb-2">
        <Skeleton className="h-5 w-20 mb-2" />
        <Skeleton className="h-5 sm:h-6 w-full mb-1" />
        <Skeleton className="h-3 sm:h-4 w-2/3" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <Skeleton className="h-3 sm:h-4 w-full mb-1" />
        <Skeleton className="h-3 sm:h-4 w-full mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
      <CardFooter className="p-3 sm:p-4 pt-0">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

interface FavoriteButtonProps {
  dealId: number;
}

export function FavoriteButton({ dealId }: FavoriteButtonProps) {
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
        return response;
      } catch (error) {
        console.error('Error fetching favorites:', error);
        return [];
      }
    },
    enabled: !!user,
  });
  
  // Set initial favorite state once favorites are loaded
  React.useEffect(() => {
    if (favorites) {
      try {
        // Safely check if favorites is array-like and has the some method
        const favoritesArray = Array.isArray(favorites) 
          ? favorites 
          : (typeof favorites === 'object' && favorites !== null)
            ? Object.values(favorites)
            : [];
            
        // Use our normalized array to check if the deal is a favorite
        const isFav = favoritesArray.some((fav: any) => 
          fav && typeof fav === 'object' && fav.deal && fav.deal.id === dealId
        );
        setIsFavorite(isFav);
      } catch (error) {
        console.error('Error checking favorite status:', error);
        setIsFavorite(false); // Default to not favorite on error
      }
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
      className="absolute top-2 left-2 bg-white/80 hover:bg-white"
      onClick={handleToggleFavorite}
      disabled={isPending}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
    </Button>
  );
}