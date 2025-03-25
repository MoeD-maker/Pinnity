import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuthState } from '@/contexts/AuthContext';

// FavoriteButton for the EnhancedDealGrid
interface FavoriteButtonProps {
  dealId: number;
  className?: string;
}

/**
 * A button component to add/remove a deal from favorites
 */
export default function FeaturedDealFavoriteButton({ dealId, className = '' }: FavoriteButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthState();
  
  // Get user favorites
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: [`/api/v1/user/${user?.id}/favorites`],
    queryFn: async () => {
      try {
        // Only fetch if user is authenticated
        if (!isAuthenticated || !user?.id) {
          return [];
        }
        
        const response = await apiRequest(`/api/v1/user/${user.id}/favorites`);
        
        // Handle different response formats
        if (response && typeof response === 'object') {
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
    enabled: isAuthenticated && !!user?.id,
  });
  
  // Add to favorites mutation
  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiRequest(`/api/v1/user/${user.id}/favorites`, {
        method: 'POST',
        body: { dealId },
      });
    },
    onSuccess: () => {
      // Invalidate favorites query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/v1/user/${user?.id}/favorites`] });
      toast({
        title: 'Added to favorites',
        description: 'This deal has been added to your favorites.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding to favorites',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    },
  });
  
  // Remove from favorites mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiRequest(`/api/v1/user/${user.id}/favorites/${dealId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      // Invalidate favorites query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/v1/user/${user?.id}/favorites`] });
      toast({
        title: 'Removed from favorites',
        description: 'This deal has been removed from your favorites.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing from favorites',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    },
  });
  
  // Check if deal is in favorites
  const isFavorite = React.useMemo(() => {
    if (!favorites || !Array.isArray(favorites)) return false;
    
    return favorites.some((favorite: any) => {
      // Handle different API response structures
      if (favorite.dealId) {
        return favorite.dealId === dealId;
      } else if (favorite.deal && favorite.deal.id) {
        return favorite.deal.id === dealId;
      }
      return false;
    });
  }, [favorites, dealId]);
  
  // Handle toggle favorite
  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to add deals to your favorites.',
        variant: 'destructive',
      });
      return;
    }
    
    if (isFavorite) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };
  
  return (
    <Button
      variant="secondary"
      size="icon"
      className={`h-8 w-8 rounded-full bg-white/90 hover:bg-white text-muted-foreground hover:text-rose-500 ${
        isFavorite ? '!text-rose-500 hover:text-rose-600' : ''
      } ${className}`}
      onClick={toggleFavorite}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
    </Button>
  );
}