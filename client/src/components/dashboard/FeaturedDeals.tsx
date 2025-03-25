import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Heart, Database, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import CachedDataAlert from '@/components/ui/CachedDataAlert';

// Utility function to check if a date is within X days from now
function isWithinDays(date: Date, days: number): boolean {
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= days;
}

interface DealWithBusiness {
  id: number;
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  discount?: string;
  expiresAt?: string | null;
  endDate?: string | null; // Added for DealLike compatibility
  business: {
    businessName: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Feature Deal Favorite Button
interface FeaturedDealFavoriteButtonProps {
  dealId: number;
}

function FeaturedDealFavoriteButton({ dealId }: FeaturedDealFavoriteButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = React.useState(false);
  
  // Get user favorites to determine initial state
  const { data: favorites } = useQuery({
    queryKey: ['/api/v1/user', user?.id, 'favorites'],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await apiRequest(`/api/v1/user/${user.id}/favorites`);
        if (response && typeof response === 'object') {
          // Handle both array and object responses
          if (Array.isArray(response)) {
            return response;
          } else {
            // Convert object with numeric keys to array
            return Object.values(response);
          }
        }
        return [];
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
      // Make sure favorites is an array before calling .some
      const favoriteArray = Array.isArray(favorites) ? favorites : Object.values(favorites || {});
      const isFav = favoriteArray.some((fav: any) => 
        (fav.dealId === dealId) || (fav.deal && fav.deal.id === dealId)
      );
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
      className="bg-white/80 hover:bg-white"
      onClick={handleToggleFavorite}
      disabled={isPending}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
    </Button>
  );
}

// Featured Deals Component
interface FeaturedDealsProps {
  onSelect: (dealId: number) => void;
  title?: string;
  limit?: number;
}

export default function FeaturedDeals({ 
  onSelect,
  title = "Featured Deals",
  limit = 3
}: FeaturedDealsProps) {
  const { toast } = useToast();
  
  // Get featured deals from API endpoint
  const { data: allDeals, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/v1/deals/featured'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/v1/deals/featured');
        
        if (response && typeof response === 'object') {
          // Handle both array and object responses
          if (Array.isArray(response)) {
            return response;
          } else {
            // Convert object with numeric keys to array
            return Object.values(response);
          }
        }
        return [];
      } catch (error) {
        console.error('Error fetching featured deals:', error);
        throw error;
      }
    }
  });
  
  // Get just the first X featured deals
  const featuredDeals = React.useMemo(() => {
    if (!allDeals || !Array.isArray(allDeals)) return [];
    return allDeals.slice(0, limit);
  }, [allDeals, limit]);

  if (error) {
    console.error('Error loading featured deals:', error);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="aspect-video">
                <Skeleton className="h-full w-full" />
              </div>
              <CardContent className="p-3">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (!featuredDeals || featuredDeals.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4 mb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          {title}
        </h2>
        
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {featuredDeals.map((deal: DealWithBusiness) => (
          <Card 
            key={deal.id} 
            className="overflow-hidden transition-all hover:shadow-md cursor-pointer"
            onClick={() => onSelect(deal.id)}
          >
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
                alt={deal.title}
                className="w-full h-full object-cover transition-transform hover:scale-105"
              />
              <div className="absolute top-2 left-2">
                <FeaturedDealFavoriteButton dealId={deal.id} />
              </div>
              
              {/* Deal discount badge */}
              <div className="absolute bottom-2 left-2 flex flex-wrap gap-2">
                {deal.discount && (
                  <Badge className="bg-primary text-white">
                    {deal.discount}
                  </Badge>
                )}
                
                {/* Expiration badges */}
                {(deal.expiresAt || deal.endDate) && (
                  <>
                    {new Date(deal.expiresAt || deal.endDate || '') < new Date() ? (
                      <Badge variant="destructive" className="bg-white/90 text-red-500 border-red-200">
                        Expired
                      </Badge>
                    ) : isWithinDays(new Date(deal.expiresAt || deal.endDate || ''), 3) && (
                      <Badge variant="outline" className="bg-white/90 text-amber-600 border-amber-200">
                        Expires Soon
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>
            <CardContent className="p-3">
              <h3 className="font-semibold text-base line-clamp-1">{deal.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">{deal.business?.businessName || 'Unknown Business'}</p>
              <p className="text-sm line-clamp-2">{deal.description}</p>
            </CardContent>
            <CardFooter className="p-3 pt-0">
              <Button 
                variant="secondary" 
                className="w-full" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(deal.id);
                }}
              >
                View Deal
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}