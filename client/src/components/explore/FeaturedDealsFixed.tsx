import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Sparkles, RefreshCw } from 'lucide-react';
import FeaturedDealFavoriteButton from '@/components/explore/FavoriteButton';
import { isWithinDays } from '@/utils/dateUtils';

// Cached data alert component for all deal display sections
interface CachedDataAlertProps {
  isCached: boolean;
  cachedDate?: Date | string | number;
  onRefresh?: () => void;
  className?: string;
}

function CachedDataAlert({ 
  isCached,
  cachedDate,
  onRefresh,
  className
}: CachedDataAlertProps) {
  // Don't show anything if not cached
  if (!isCached || !cachedDate) {
    return null;
  }

  // Format the cache date
  const formatDate = (date: Date | string | number) => {
    if (date instanceof Date) {
      // Format as time if today, otherwise as date + time
      const now = new Date();
      const isToday = now.toDateString() === date.toDateString();
      
      return isToday
        ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        : date.toLocaleString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit'
          });
    }
    
    return new Date(date).toLocaleString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex items-center gap-2 text-xs text-amber-600 ${className}`}>
      <Database className="h-3 w-3" />
      <span>
        Showing cached data from {formatDate(cachedDate)}
      </span>
      {onRefresh && (
        <Button 
          variant="link" 
          size="sm" 
          className="h-auto p-0 text-xs text-amber-800 hover:text-amber-900 font-medium" 
          onClick={(e) => {
            e.preventDefault();
            onRefresh();
          }}
        >
          Refresh
        </Button>
      )}
    </div>
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
  const [isCached, setIsCached] = useState(false);
  const [cacheDate, setCacheDate] = useState<Date | undefined>(undefined);
  
  // Get featured deals directly from the dedicated featured endpoint with proper limit parameter
  const { data: allDeals, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/v1/deals/featured', { limit, timestamp: Date.now() }],
    queryFn: async () => {
      try {
        // Use the raw fetch instead of apiRequest to access headers
        // Pass the limit parameter to the API
        const url = `/api/v1/deals/featured?limit=${limit}&_t=${Date.now()}`;
        const response = await fetch(url, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        // Check cache status from response headers
        const cacheControl = response.headers.get('Cache-Control');
        const cacheDate = response.headers.get('X-Cache-Date');
        
        setIsCached(!!cacheControl && cacheControl.includes('max-age=0'));
        setCacheDate(cacheDate ? new Date(cacheDate) : undefined);
        
        const data = await response.json();
        
        if (data && typeof data === 'object') {
          // Handle both array and object responses
          if (Array.isArray(data)) {
            return data;
          } else {
            // Convert object with numeric keys to array
            return Object.values(data);
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
    // Filter out deals with missing or incomplete business data for clean production state
    const validDeals = allDeals.filter(deal => 
      deal.business && 
      deal.business.businessName && 
      deal.business.businessName !== 'Unknown Business' &&
      deal.business.businessName.trim() !== ''
    );
    return validDeals.slice(0, limit);
  }, [allDeals, limit]);

  // Handle refresh click with proper event handling
  const handleRefresh = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    refetch();
  }, [refetch]);

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
          {Array.from({ length: 3 }).map((_, i) => (
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
        
        {/* Refresh button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          className="flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>
      </div>
      
      <CachedDataAlert 
        isCached={isCached} 
        cachedDate={cacheDate} 
        onRefresh={handleRefresh}
        className="mb-2"
      />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {featuredDeals.map(deal => (
          <Card 
            key={deal.id} 
            className="overflow-hidden transition-all hover:shadow-md cursor-pointer border-2 border-primary/20 relative"
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
              
              {/* Featured badge */}
              <div className="absolute top-2 right-2">
                <Badge className="bg-primary text-white flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>Featured</span>
                </Badge>
              </div>
              
              {/* Cache indicator */}
              {isCached && (
                <div className="absolute top-10 right-2">
                  <Badge variant="outline" className="bg-amber-100/90 text-amber-800 border-amber-200 text-xs flex gap-1 items-center px-2 py-0.5">
                    <Database className="h-3 w-3" />
                    <span>Cached</span>
                  </Badge>
                </div>
              )}
              
              {/* Deal discount badge */}
              <div className="absolute bottom-2 left-2 flex flex-wrap gap-2">
                {deal.discount && (
                  <Badge className="bg-primary text-white">
                    {deal.discount}
                  </Badge>
                )}
                
                {/* Expiration badges */}
                {deal.expiresAt && (
                  <>
                    {new Date(deal.expiresAt) < new Date() ? (
                      <Badge variant="destructive" className="bg-white/90 text-red-500 border-red-200">
                        Expired
                      </Badge>
                    ) : isWithinDays(new Date(deal.expiresAt), 3) && (
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