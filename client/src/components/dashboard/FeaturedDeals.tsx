import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Deal } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart } from 'lucide-react';
import { isExpired, isExpiringSoon } from '@/utils/dealReminders';
import ExpiredBadge from '@/components/deals/ExpiredBadge';
import ExpiringSoonBadge from '@/components/deals/ExpiringSoonBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
    queryKey: ['/api/user', user?.id, 'favorites'],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await apiRequest(`/api/user/${user.id}/favorites`);
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
      const isFav = favorites.some((fav: any) => fav.deal?.id === dealId);
      setIsFavorite(isFav);
    }
  }, [favorites, dealId]);
  
  // Add to favorites mutation
  const addToFavorites = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      return apiRequest(`/api/user/${user.id}/favorites`, {
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
      queryClient.invalidateQueries({ queryKey: ['/api/user', user?.id, 'favorites'] });
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
      return apiRequest(`/api/user/${user.id}/favorites/${dealId}`, {
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
      queryClient.invalidateQueries({ queryKey: ['/api/user', user?.id, 'favorites'] });
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
  deals: (Deal & { business: any })[];
  isLoading: boolean;
  onSelect: (dealId: number) => void;
}

export default function FeaturedDeals({ deals, isLoading, onSelect }: FeaturedDealsProps) {
  if (isLoading) {
    return (
      <div className="flex overflow-x-auto gap-4 pb-4 px-0 max-w-[100vw] hide-scrollbar">
        {Array.from({ length: 4 }).map((_, i) => (
          <FeaturedDealSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No featured deals available</p>
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 px-0 sm:px-0 max-w-[100vw]">
      {deals.map((deal) => (
        <FeaturedDealCard 
          key={deal.id} 
          deal={deal} 
          onSelect={() => onSelect(deal.id)} 
        />
      ))}
    </div>
  );
}

// Featured Deal Card Component
interface FeaturedDealCardProps {
  deal: Deal & { business: any };
  onSelect: () => void;
}

function FeaturedDealCard({ deal, onSelect }: FeaturedDealCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Calculate discount percentage or value
  const discount = deal.discount || '';

  return (
    <Card 
      ref={ref} 
      className="overflow-hidden flex-shrink-0 w-[250px] sm:w-[280px] cursor-pointer transition-all hover:shadow-md"
      onClick={onSelect}
    >
      {inView ? (
        <div className="aspect-[4/3] relative">
          <img 
            src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
            alt={deal.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge className="self-start bg-primary text-white">
                {discount}
              </Badge>
              {isExpired(deal) ? (
                <ExpiredBadge deal={deal} className="bg-white/90" />
              ) : isExpiringSoon(deal) && (
                <ExpiringSoonBadge deal={deal} className="bg-white/90" />
              )}
            </div>
            <h3 className="text-white font-semibold line-clamp-1">{deal.title}</h3>
            <p className="text-white/90 text-sm line-clamp-1">
              {deal.business.businessName}
            </p>
          </div>
          <div className="absolute top-2 left-2">
            <FeaturedDealFavoriteButton dealId={deal.id} />
          </div>
        </div>
      ) : (
        <div className="aspect-[4/3] bg-muted animate-pulse" />
      )}
      
      <CardContent className="p-3">
        <p className="text-sm line-clamp-2 text-muted-foreground">
          {deal.description}
        </p>
      </CardContent>
    </Card>
  );
}

// Skeleton for loading state
function FeaturedDealSkeleton() {
  return (
    <Card className="overflow-hidden flex-shrink-0 w-[250px] sm:w-[280px]">
      <div className="aspect-[4/3]">
        <Skeleton className="h-full w-full" />
      </div>
      <CardContent className="p-3">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}