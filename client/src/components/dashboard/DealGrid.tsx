import React, { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MapPin, Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { isExpiringSoon, getExpirationText, isExpired } from '@/utils/dealReminders';
import ExpiringSoonBadge from '@/components/deals/ExpiringSoonBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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
}

export default function DealGrid({ deals, isLoading, onSelect }: DealGridProps) {
  // For optimization, we could implement virtualization for large lists

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <DealCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-2">No deals found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {deals.map((deal) => (
        <DealCard 
          key={deal.id} 
          deal={deal} 
          onSelect={() => onSelect(deal.id)} 
        />
      ))}
    </div>
  );
}

interface DealCardProps {
  deal: DealWithBusiness;
  onSelect: () => void;
}

function DealCard({ deal, onSelect }: DealCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Get formatted expiration text
  const expirationText = getExpirationText(deal);
  
  // Calculate discount percentage or value
  const discount = deal.discount || '';

  return (
    <Card 
      ref={ref} 
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer"
      onClick={onSelect}
    >
      {inView ? (
        <div className="aspect-video relative overflow-hidden">
          <img 
            src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
            alt={deal.title}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-primary text-primary-foreground">
              {discount}
            </Badge>
          </div>
          <FavoriteButton dealId={deal.id} />
          
        </div>
      ) : (
        <div className="aspect-video bg-muted animate-pulse" />
      )}
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              <Badge variant="outline">
                {deal.category}
              </Badge>
              {isExpiringSoon(deal) && (
                <ExpiringSoonBadge deal={deal} />
              )}
            </div>
            <h3 className="font-semibold text-lg line-clamp-1">{deal.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {deal.business.businessName}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <p className="text-sm line-clamp-2 mb-2">
          {deal.description}
        </p>
        
        <div className="flex items-center text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 mr-1" />
          <span className="mr-3">2.4 miles</span>
          <Calendar className="h-3 w-3 mr-1" />
          <span>{expirationText}</span>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button onClick={onSelect} className="w-full">
          View Deal
        </Button>
      </CardFooter>
    </Card>
  );
}

function DealCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video">
        <Skeleton className="h-full w-full" />
      </div>
      <CardHeader className="p-4 pb-2">
        <Skeleton className="h-5 w-20 mb-2" />
        <Skeleton className="h-6 w-full mb-1" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
      <CardFooter className="p-4 pt-0">
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
      const isFav = favorites.some((fav: any) => fav.deal.id === dealId);
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
      className="absolute top-2 left-2 bg-white/80 hover:bg-white"
      onClick={handleToggleFavorite}
      disabled={isPending}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
    </Button>
  );
}