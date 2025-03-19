import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, MapPin, Filter as FilterIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
// Import each component separately to avoid potential bundling issues
import CategoryFilter from '@/components/dashboard/CategoryFilter';
import { CATEGORIES } from '@/components/dashboard/CategoryFilter';
import DealGrid from '@/components/dashboard/DealGrid';
import DealDetail from '@/components/dashboard/DealDetail';
import CachedDataAlert from '@/components/ui/CachedDataAlert';
import Breadcrumbs, { commonPathLabels } from '@/components/navigation/Breadcrumbs';
import { 
  getCacheStatusFromResponse, 
  getFreshCacheStatus,
  listenForConnectionRestoration,
  CacheStatus
} from '@/utils/dealsCacheManager';
// Import the Deal type
import { Deal } from '@shared/schema';

// Map API categories to our internal category IDs (same as in dashboard.tsx)
const mapCategoryToId = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  
  if (lowerCategory.includes('restaurant')) return 'restaurants';
  if (lowerCategory.includes('café') || lowerCategory.includes('cafe') || lowerCategory.includes('coffee')) return 'cafes';
  if (lowerCategory.includes('retail') || lowerCategory.includes('shop')) return 'retail';
  if (lowerCategory.includes('beauty') || lowerCategory.includes('spa') || lowerCategory.includes('salon')) return 'beauty';
  if (lowerCategory.includes('health') || lowerCategory.includes('fitness') || lowerCategory.includes('gym')) return 'health';
  if (lowerCategory.includes('entertainment') || lowerCategory.includes('movie') || lowerCategory.includes('theater')) return 'entertainment';
  if (lowerCategory.includes('service')) return 'services';
  if (lowerCategory.includes('travel') || lowerCategory.includes('hotel') || lowerCategory.includes('accommodation')) return 'travel';
  if (lowerCategory.includes('bar') || lowerCategory.includes('club') || lowerCategory.includes('nightlife')) return 'nightlife';
  
  return 'other';
};

export default function ExplorePage() {
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  
  // State for tracking cached data status
  const [dealsCacheStatus, setDealsCacheStatus] = useState<CacheStatus>({
    isCached: false,
    cacheDate: undefined
  });
  
  // Load saved filters on initial render
  useEffect(() => {
    const savedCategories = localStorage.getItem('pinnity-category-filters');
    if (savedCategories) {
      try {
        const parsed = JSON.parse(savedCategories);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedCategories(parsed);
        }
      } catch (e) {
        console.error('Error parsing saved categories:', e);
      }
    }
  }, []);
  
  // Fetch all deals
  const { data: deals = [], isLoading, error, refetch: refetchDeals } = useQuery({
    queryKey: ['/api/deals'],
    queryFn: async () => {
      try {
        // Use the raw fetch instead of apiRequest to access headers
        const response = await fetch('/api/deals');
        
        // Check if response is from cache using centralized utility
        const cacheStatus = getCacheStatusFromResponse(response);
        
        // Update cache status
        setDealsCacheStatus(cacheStatus);
        
        const data = await response.json();
        console.log("API Response:", data);
        return data;
      } catch (error) {
        console.error('Error fetching deals:', error);
        throw error;
      }
    },
  });
  
  // Handle automatic refresh when connection is restored
  useEffect(() => {
    const handleConnectionRestored = () => {
      console.log('Connection restored - automatically refreshing deals data');
      
      // Set fresh cache status using the utility
      setDealsCacheStatus(getFreshCacheStatus());
      
      // Refresh deals data
      refetchDeals();
    };
    
    // Use the centralized utility to listen for connection restoration events
    const cleanup = listenForConnectionRestoration(handleConnectionRestored);
    
    // Clean up event listener on unmount
    return cleanup;
  }, [refetchDeals]);
  
  // Log error if any occurs
  if (error) {
    console.error("Error fetching deals:", error);
  }
  
  // Define a local Deal & Business interface to avoid TypeScript errors
  interface DealWithBusiness {
    id: number;
    title: string;
    description: string;
    category: string;
    imageUrl?: string;
    startDate: Date;
    endDate: Date;
    discount?: string;
    business: {
      businessName: string;
      address?: string;
      phone?: string;
      website?: string;
    };
  }

  // Calculate category counts
  const categoryCounter: Record<string, number> = {};
  if (deals && Array.isArray(deals)) {
    // Initialize all categories with 0
    CATEGORIES.forEach(cat => {
      categoryCounter[cat.id] = 0;
    });
    
    // Count deals per category
    deals.forEach((deal: DealWithBusiness) => {
      const categoryId = mapCategoryToId(deal.category);
      categoryCounter[categoryId] = (categoryCounter[categoryId] || 0) + 1;
    });
    
    // Set "all" category count to total number of deals
    categoryCounter['all'] = deals.length;
  }
  
  // Filter deals based on search query and selected categories
  const filteredDeals = deals && Array.isArray(deals) 
    ? deals.filter((deal: DealWithBusiness) => {
        // Map API category to our category system
        const dealCategoryId = mapCategoryToId(deal.category);
        
        const matchesSearch = !searchQuery || 
          deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deal.business.businessName.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = selectedCategories.length === 0 || 
          selectedCategories.includes(dealCategoryId);
        
        return matchesSearch && matchesCategory;
      })
    : [];

  // Handle category selection
  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      // If 'all' is selected, clear all other selections
      if (category === 'all') {
        return [];
      }
      
      // If any other category is selected, remove 'all' if it's there
      let newCategories = prev.filter(c => c !== 'all');
      
      // Toggle the selected category
      if (newCategories.includes(category)) {
        newCategories = newCategories.filter(c => c !== category);
      } else {
        newCategories = [...newCategories, category];
      }
      
      return newCategories;
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSearchQuery('');
  };

  return (
    <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Explore Deals</h1>
          <p className="text-muted-foreground mt-1">
            Discover local deals and promotions
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-shrink-0 lg:hidden"
          >
            <FilterIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 sm:gap-6">
        {/* Categories sidebar */}
        <Card className="h-fit sticky top-20 hidden lg:block">
          <CardContent className="p-4">
            <CategoryFilter
              selectedCategories={selectedCategories}
              onChange={handleCategoryChange}
              dealCounts={categoryCounter}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>

        <div className="space-y-4 sm:space-y-6">
          {/* Mobile category filter */}
          {showFilters && (
            <Card className="lg:hidden w-full">
              <CardContent className="p-4">
                <CategoryFilter
                  selectedCategories={selectedCategories}
                  onChange={handleCategoryChange}
                  dealCounts={categoryCounter}
                  onClearFilters={handleClearFilters}
                />
              </CardContent>
            </Card>
          )}

          {/* Location indicator */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="mr-1">Showing deals near San Francisco, CA</span>
            <Button variant="link" className="p-0 h-auto" size="sm">
              Change
            </Button>
          </div>
          
          {/* Cache status alert */}
          <CachedDataAlert 
            isCached={dealsCacheStatus.isCached} 
            cachedDate={dealsCacheStatus.cacheDate} 
            onRefresh={() => refetchDeals()}
          />

          {/* Deal grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full pb-16">
              {Array.from({ length: 9 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-0">
                    <div className="h-40 bg-muted animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-5 bg-muted animate-pulse rounded-md" />
                      <div className="h-4 bg-muted animate-pulse rounded-md w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDeals.length === 0 ? (
            <div className="text-center py-12 pb-16">
              <h3 className="text-xl font-medium mb-2">No deals found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button onClick={handleClearFilters}>Clear all filters</Button>
            </div>
          ) : (
            <DealGrid
              deals={filteredDeals}
              isLoading={isLoading}
              onSelect={(dealId) => setSelectedDealId(dealId)}
              isCached={dealsCacheStatus.isCached}
              cacheDate={dealsCacheStatus.cacheDate}
              onRefresh={() => refetchDeals()}
            />
          )}
        </div>
      </div>

      {/* Deal detail dialog */}
      <Dialog 
        open={selectedDealId !== null} 
        onOpenChange={(open) => {
          if (!open) setSelectedDealId(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          {selectedDealId && (
            <DealDetail
              dealId={selectedDealId}
              onClose={() => setSelectedDealId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}