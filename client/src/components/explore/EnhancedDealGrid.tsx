import React, { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Heart, 
  MapPin, 
  Calendar, 
  Clock, 
  Database,
  Star, 
  ArrowUpRight,
  Shuffle,
  ThumbsUp,
  Sparkles
} from 'lucide-react';
import DealAvailabilityBadge from '@/components/shared/DealAvailabilityBadge';
import EnhancedDealCard from '@/components/shared/EnhancedDealCard';
import { formatDistanceToNow } from 'date-fns';
import { isExpiringSoon, getExpirationText, isExpired } from '@/utils/dealReminders';
import ExpiringSoonBadge from '@/components/deals/ExpiringSoonBadge';
import ExpiredBadge from '@/components/deals/ExpiredBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import CachedDataAlert from '@/components/ui/CachedDataAlert';
import { motion, AnimatePresence } from 'framer-motion';
import useWindowSize from '@/hooks/use-window-size';

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
  viewCount?: number;
  saveCount?: number;
  redemptionCount?: number;
  createdAt?: string | Date;
  [key: string]: any; // Allow any additional properties
}

interface EnhancedDealGridProps {
  deals: DealWithBusiness[];
  isLoading: boolean;
  onSelect: (dealId: number) => void;
  isCached?: boolean;
  cacheDate?: string | number | Date;
  onRefresh?: () => void;
  viewMode?: 'grid' | 'large' | 'swipeable';
  sortBy?: 'trending' | 'newest' | 'endingSoon' | 'popular';
  onRandomDeal?: () => void;
}

export default function EnhancedDealGrid({ 
  deals, 
  isLoading, 
  onSelect, 
  isCached = false,
  cacheDate,
  onRefresh,
  viewMode = 'grid',
  sortBy = 'trending',
  onRandomDeal
}: EnhancedDealGridProps) {

  // Calculate distance indicator text (would be replaced with actual geo logic)
  const getDistanceIndicator = (index: number) => {
    // This is a placeholder. In a real app, this would use geolocation
    const mockDistances = ['0.3 miles', '1.2 miles', '2.4 miles', '3.7 miles', '0.8 miles'];
    return mockDistances[index % mockDistances.length];
  };

  // Use our custom hook for better device detection
  const { isMobile } = useWindowSize();

  if (isLoading) {
    // Show fewer items on mobile for faster rendering
    const skeletonCount = viewMode === 'large' ? 
      { mobile: 2, desktop: 4 } : 
      { mobile: 3, desktop: 6 };
    
    const count = isMobile ? skeletonCount.mobile : skeletonCount.desktop;
    
    // For swipeable view, show a single card loader
    if (viewMode === 'swipeable') {
      return (
        <div className="max-w-md mx-auto pb-16">
          <div className="text-xs text-muted-foreground flex justify-between mb-4">
            <span>← Swipe left to skip</span>
            <span>Swipe right to save →</span>
          </div>
          <Card className="overflow-hidden shadow-lg w-full">
            <div className="aspect-square relative">
              <Skeleton className="h-full w-full" />
            </div>
            <CardHeader className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        </div>
      );
    }
    
    return (
      <div className={viewMode === 'large' 
        ? "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 w-full pb-16 max-w-full overflow-hidden" 
        : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 w-full pb-16 max-w-full overflow-hidden"
      }>
        {Array.from({ length: count }).map((_, i) => (
          <DealCardSkeleton key={i} isLarge={viewMode === 'large'} />
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
      
      {viewMode === 'swipeable' ? (
        <SwipeableDealCards deals={deals} onSelect={onSelect} />
      ) : (
        <div className={viewMode === 'large' 
          ? "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full pb-16 max-w-full overflow-hidden" 
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 w-full pb-16 max-w-full overflow-hidden"
        }>
          {deals.map((deal, index) => (
            <EnhancedDealCard 
              key={deal.id} 
              deal={deal} 
              onSelect={() => onSelect(deal.id)}
              distanceText={getDistanceIndicator(index)}
              isLarge={viewMode === 'large'}
            />
          ))}
        </div>
      )}
      
      {/* Random deal button */}
      {onRandomDeal && (
        <div className="flex justify-center mt-4 mb-6">
          <Button 
            onClick={onRandomDeal}
            variant="outline"
            className="gap-2"
          >
            <Shuffle className="h-4 w-4" />
            Show me a random deal
          </Button>
        </div>
      )}
    </>
  );
}

interface DealCardProps {
  deal: DealWithBusiness;
  onSelect: () => void;
  isCached?: boolean;
  isLarge?: boolean;
  distanceText: string;
  sortType?: 'trending' | 'newest' | 'endingSoon' | 'popular';
}

function DealCard({ 
  deal, 
  onSelect, 
  isCached = false,
  isLarge = false,
  distanceText,
  sortType
}: DealCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Get formatted expiration text
  const expirationText = getExpirationText(deal);
  
  // Calculate discount percentage or value
  const discount = deal.discount || '';
  
  // Convert dates for relevant badges
  const createdAt = deal.createdAt ? new Date(deal.createdAt) : undefined;
  const isNew = createdAt ? (Date.now() - createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000) : false;
  
  // Determine popularity or trending indicators
  const isPopular = (deal.redemptionCount || 0) > 50;
  const isTrending = (deal.viewCount || 0) > 100 || (deal.saveCount || 0) > 20;

  return (
    <Card 
      ref={ref} 
      className={`overflow-hidden transition-all hover:shadow-md cursor-pointer w-full ${
        isLarge ? 'flex flex-col sm:flex-row h-full' : ''
      } ${deal.featured ? 'border-2 border-primary/20 relative' : ''}`}
      onClick={onSelect}
    >
      {inView ? (
        <div className={`${isLarge ? 'aspect-square sm:w-1/2' : 'aspect-video'} relative overflow-hidden`}>
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
          
          {/* Deal Availability Badge for recurring deals */}
          <DealAvailabilityBadge 
            isRecurring={deal.isRecurring} 
            availability={deal.availability}
            variant="card"
          />
          
          {/* Cache indicator for individual deal cards */}
          {isCached && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-xs flex gap-1 items-center px-2 py-0.5">
                <Database className="h-3 w-3" />
                <span>Cached</span>
              </Badge>
            </div>
          )}
          
          {/* Distance indicator with visual proximity cue */}
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
        <div className={`${isLarge ? 'aspect-square sm:w-1/2' : 'aspect-video'} bg-muted animate-pulse`} />
      )}
      
      <div className={isLarge ? 'flex flex-col justify-between flex-1' : ''}>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <div className="flex justify-between items-start">
            <div className="w-full">
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {deal.category}
                </Badge>
                {isExpired(deal) ? (
                  <ExpiredBadge deal={deal} />
                ) : isExpiringSoon(deal) && (
                  <ExpiringSoonBadge deal={deal} />
                )}
                
                {/* New deal badge */}
                {isNew && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                    New
                  </Badge>
                )}
                
                {/* Add trending or popular badges based on metrics */}
                {isPopular && sortType === 'popular' && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200 text-xs flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    <span>Popular</span>
                  </Badge>
                )}
                
                {isTrending && sortType === 'trending' && (
                  <Badge variant="outline" className="bg-pink-100 text-pink-700 border-pink-200 text-xs flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>Trending</span>
                  </Badge>
                )}
                
                {/* Featured badge */}
                {deal.featured && (
                  <Badge className="bg-primary text-white flex items-center gap-1 text-xs">
                    <Sparkles className="h-3 w-3" />
                    <span>Featured</span>
                  </Badge>
                )}
              </div>
              <h3 className={`font-semibold ${isLarge ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'} line-clamp-1`}>
                {deal.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                {deal.business?.businessName || 'Unknown Business'}
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-4 pt-0">
          <p className={`text-xs sm:text-sm ${isLarge ? 'line-clamp-3' : 'line-clamp-2'} mb-2`}>
            {deal.description}
          </p>
          
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            <span>{expirationText}</span>
          </div>
        </CardContent>
        
        <CardFooter className="p-3 sm:p-4 pt-0">
          <Button 
            onClick={onSelect} 
            className="w-full h-11 sm:h-9 text-sm"
          >
            View Deal
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}

function DealCardSkeleton({ isLarge = false }: { isLarge?: boolean }) {
  return (
    <Card className={`overflow-hidden w-full ${
      isLarge ? 'flex flex-col sm:flex-row h-full' : ''
    }`}>
      <div className={`${isLarge ? 'aspect-square sm:w-1/2' : 'aspect-video'}`}>
        <Skeleton className="h-full w-full" />
      </div>
      <div className={isLarge ? 'flex flex-col flex-1' : ''}>
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
      </div>
    </Card>
  );
}

interface FavoriteButtonProps {
  dealId: number;
}

function FavoriteButton({ dealId }: FavoriteButtonProps) {
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
        // Convert from object to array if needed (API returns object with numeric keys)
        if (response && typeof response === 'object' && !Array.isArray(response)) {
          console.log("Converting favorites from object to array format");
          return Object.values(response);
        }
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
      className="absolute top-2 left-2 bg-white/80 hover:bg-white h-10 w-10 sm:h-8 sm:w-8 shadow-sm"
      onClick={handleToggleFavorite}
      disabled={isPending}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={`h-5 w-5 sm:h-4 sm:w-4 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
    </Button>
  );
}

// Swipeable deal cards component
function SwipeableDealCards({ deals, onSelect }: { deals: DealWithBusiness[], onSelect: (dealId: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [startX, setStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const currentDeal = deals[currentIndex];
  
  // Handle swipe gesture for touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startX) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    if (Math.abs(diff) > 30) {
      setDirection(diff > 0 ? 'right' : 'left');
    } else {
      setDirection(null);
    }
  };
  
  // Handle swipe gesture for mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !startX) return;
    
    const currentX = e.clientX;
    const diff = currentX - startX;
    
    if (Math.abs(diff) > 30) {
      setDirection(diff > 0 ? 'right' : 'left');
    } else {
      setDirection(null);
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      processSwipeAction();
      setIsDragging(false);
    }
  };
  
  // Handle the end of touch events
  const handleTouchEnd = () => {
    processSwipeAction();
  };
  
  // Process the swipe action (shared between mouse and touch)
  const processSwipeAction = () => {
    if (direction === 'left') {
      // Skip this deal
      if (currentIndex < deals.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        toast({
          title: "That's all folks!",
          description: "You've seen all available deals",
        });
      }
    } else if (direction === 'right') {
      // Save deal to favorites
      if (user) {
        console.log('Saving deal to favorites:', currentDeal.id);
        apiRequest(`/api/v1/user/${user.id}/favorites`, {
          method: 'POST',
          data: { dealId: currentDeal.id }
        }).then((response) => {
          console.log('Deal successfully saved to favorites:', response);
          toast({
            title: 'Deal saved!',
            description: 'Added to your favorites',
          });
          queryClient.invalidateQueries({ queryKey: ['/api/v1/user', user.id, 'favorites'] });
        }).catch(err => {
          console.error('Error saving deal:', err);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not save the deal',
          });
        });
      } else {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to save deals',
        });
      }
      
      // Move to next deal
      if (currentIndex < deals.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        toast({
          title: "That's all folks!",
          description: "You've seen all available deals",
        });
      }
    }
    
    setDirection(null);
    setStartX(0);
  };
  
  // Swipe instructions
  const SwipeInstructions = () => (
    <div className="flex justify-between text-xs text-muted-foreground mb-4">
      <div className="flex items-center">
        <span className="mr-1">← Swipe left to skip</span>
      </div>
      <div className="flex items-center">
        <span className="mr-1">Swipe right to save →</span>
      </div>
    </div>
  );
  
  if (!currentDeal) return null;
  
  return (
    <div className="max-w-md mx-auto mb-12">
      <SwipeInstructions />
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentDeal.id}
          initial={{ opacity: 1, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
            rotate: direction === 'left' ? -5 : direction === 'right' ? 5 : 0,
          }}
          exit={{ 
            opacity: 0,
            scale: 0.95,
            x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
          }}
          transition={{ duration: 0.3 }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="touch-manipulation cursor-grab"
          style={{ userSelect: 'none' }}
        >
          <Card className="overflow-hidden shadow-lg w-full">
            <div className={`aspect-square relative overflow-hidden ${currentDeal.featured ? 'border-2 border-primary/20' : ''}`}>
              <img 
                src={currentDeal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
                alt={currentDeal.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4">
                <Badge variant="secondary" className="bg-primary text-primary-foreground text-lg px-3 py-1">
                  {currentDeal.discount || ''}
                </Badge>
              </div>
              
              {/* Featured badge */}
              {currentDeal.featured && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-primary text-white flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Featured</span>
                  </Badge>
                </div>
              )}
              
              {/* Swipe direction indicators */}
              {direction === 'left' && (
                <div className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-red-500 text-white rounded-full p-3">
                  <span className="font-bold">SKIP</span>
                </div>
              )}
              
              {direction === 'right' && (
                <div className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-green-500 text-white rounded-full p-3">
                  <span className="font-bold">SAVE</span>
                </div>
              )}
            </div>
            
            <CardHeader className="p-4">
              <h2 className="text-xl font-bold">{currentDeal.title}</h2>
              <p className="text-muted-foreground">{currentDeal.business?.businessName || 'Unknown Business'}</p>
            </CardHeader>
            
            <CardContent className="p-4 pt-0">
              <p className="mb-4">
                {currentDeal.description}
              </p>
              <div className="flex justify-between text-sm text-muted-foreground">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>2.4 miles</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{getExpirationText(currentDeal)}</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="p-4 pt-0">
              <Button onClick={() => onSelect(currentDeal.id)} className="w-full">
                View Details
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
      
      <div className="mt-4 flex justify-between items-center">
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => {
            setDirection('left');
            setTimeout(() => {
              setDirection(null);
              if (currentIndex < deals.length - 1) {
                setCurrentIndex(prev => prev + 1);
              }
            }, 300);
          }}
          className="h-12 w-24 sm:h-10 sm:w-20 text-base sm:text-sm"
        >
          Skip
        </Button>
        
        <div className="text-sm text-center text-muted-foreground px-2">
          {currentIndex + 1} / {deals.length}
        </div>
        
        <Button 
          variant="default"
          size="lg" 
          onClick={() => {
            setDirection('right');
            setTimeout(() => {
              // Save deal to favorites
              if (user) {
                console.log('Saving deal to favorites from button:', currentDeal.id);
                apiRequest(`/api/v1/user/${user.id}/favorites`, {
                  method: 'POST',
                  data: { dealId: currentDeal.id }
                }).then((response) => {
                  console.log('Deal successfully saved to favorites from button:', response);
                  toast({
                    title: 'Deal saved!',
                    description: 'Added to your favorites',
                  });
                  queryClient.invalidateQueries({ queryKey: ['/api/v1/user', user.id, 'favorites'] });
                }).catch(err => {
                  console.error('Error saving deal:', err);
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not save the deal',
                  });
                });
              } else {
                toast({
                  title: 'Sign in required',
                  description: 'Please sign in to save deals',
                });
              }
              
              setDirection(null);
              if (currentIndex < deals.length - 1) {
                setCurrentIndex(prev => prev + 1);
              }
            }, 300);
          }}
          className="h-12 w-24 sm:h-10 sm:w-20 text-base sm:text-sm"
        >
          Save
        </Button>
      </div>
    </div>
  );
}