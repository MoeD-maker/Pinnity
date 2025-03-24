import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter as ListFilterIcon, 
  Map as MapIcon, 
  Grid as GridIcon,
  ChevronUp,
  ChevronDown,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { LastUpdatedTimestamp } from '@/components/ui/LastUpdatedTimestamp';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isExpired } from '@/utils/dealReminders';
import { 
  getCacheStatusFromResponse,
  getFreshCacheStatus,
  listenForConnectionRestoration,
  CacheStatus
} from '@/utils/dealsCacheManager';

// Use the barrel export for dashboard components
import { 
  DealMap, 
  DealGrid, 
  FeaturedDeals, 
  CategoryFilter, 
  DealDetail,
  CATEGORIES
} from '@/components/dashboard';
import { Deal } from '@shared/schema';

// Removed view mode type since we're only using grid view

// Map API categories to our internal category IDs
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

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true); // Default to true to show filters
  const [selectedDeal, setSelectedDeal] = useState<number | null>(null);
  const [showExpired, setShowExpired] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const dealsPerPage = 12; // Number of deals to show per page
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();

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

  // State for tracking cached data status using the shared interface
  const [dealsCacheStatus, setDealsCacheStatus] = useState<CacheStatus>({
    isCached: false,
    cacheDate: undefined
  });
  
  const [featuredDealsCacheStatus, setFeaturedDealsCacheStatus] = useState<CacheStatus>({
    isCached: false,
    cacheDate: undefined
  });

  // Fetch all deals
  const { data: deals, isLoading: isLoadingDeals, refetch: refetchDeals } = useQuery({
    queryKey: ['/api/v1/deals'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/v1/deals');
        
        // Use centralized cache utility to check cache status
        const cacheStatus = getCacheStatusFromResponse(response);
        
        // Update cache status
        setDealsCacheStatus(cacheStatus);
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching deals:', error);
        throw error;
      }
    },
  });

  // Fetch featured deals
  const { data: featuredDeals, isLoading: isLoadingFeatured, refetch: refetchFeaturedDeals } = useQuery({
    queryKey: ['/api/v1/deals/featured'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/v1/deals/featured?limit=5');
        
        // Use centralized cache utility to check cache status
        const cacheStatus = getCacheStatusFromResponse(response);
        
        // Update cache status
        setFeaturedDealsCacheStatus(cacheStatus);
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching featured deals:', error);
        throw error;
      }
    },
  });

  // Handle category filter changes
  const handleCategoryChange = (category: string) => {
    // Reset to first page when changing filters
    setCurrentPage(1);
    
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
    setCurrentPage(1);
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Calculate category counts
  const categoryCounter: Record<string, number> = {};
  if (deals && Array.isArray(deals)) {
    // Initialize all categories with 0
    CATEGORIES.forEach(cat => {
      categoryCounter[cat.id] = 0;
    });
    
    // Count deals per category
    deals.forEach((deal: Deal & { business: any }) => {
      const categoryId = mapCategoryToId(deal.category);
      categoryCounter[categoryId] = (categoryCounter[categoryId] || 0) + 1;
    });
    
    // Set "all" category count to total number of deals
    categoryCounter['all'] = deals.length;
  }

  // Handle automatic refresh when connection is restored
  useEffect(() => {
    const handleConnectionRestored = () => {
      console.log('Connection restored - automatically refreshing deals data');
      
      // Set fresh cache status using the utility
      setDealsCacheStatus(getFreshCacheStatus());
      setFeaturedDealsCacheStatus(getFreshCacheStatus());
      
      // Refresh all deals data
      refetchDeals();
      refetchFeaturedDeals();
    };
    
    // Use the centralized utility to listen for connection restoration events
    const cleanup = listenForConnectionRestoration(handleConnectionRestored);
    
    // Clean up event listener on unmount
    return cleanup;
  }, [refetchDeals, refetchFeaturedDeals]);
  
  // Filter deals based on search query, selected categories, and expiration status using useMemo
  const filteredDeals = useMemo(() => {
    if (!deals || !Array.isArray(deals)) return [];
    
    return deals.filter((deal: Deal & { business: any }) => {
      // Map API category to our category system
      const dealCategoryId = mapCategoryToId(deal.category);
      
      const matchesSearch = searchQuery === '' || 
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.business.businessName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.includes(dealCategoryId);
      
      // For individual users, filter out expired deals
      // For business and admin users, show expired deals based on toggle
      const dealExpired = isExpired(deal);
      
      // For individual users (non-business, non-admin)
      if (user?.userType === 'individual' && dealExpired) {
        return false; // Hide expired deals for regular users
      }
      
      // For business and admin users
      if ((user?.userType === 'business' || user?.userType === 'admin') && dealExpired) {
        return showExpired; // Only show if toggle is enabled
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [deals, searchQuery, selectedCategories, showExpired, user?.userType]);
  
  // Calculate pagination data
  const totalPages = Math.ceil(filteredDeals.length / dealsPerPage);
  
  // Ensure current page doesn't exceed total pages when filters change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredDeals.length, totalPages, currentPage]);
  
  // Get current page of deals
  const currentDeals = useMemo(() => {
    const indexOfLastDeal = currentPage * dealsPerPage;
    const indexOfFirstDeal = indexOfLastDeal - dealsPerPage;
    return filteredDeals.slice(indexOfFirstDeal, indexOfLastDeal);
  }, [filteredDeals, currentPage, dealsPerPage]);

  // Handle deal selection for detail view
  const handleDealSelect = (dealId: number) => {
    setSelectedDeal(dealId);
  };

  // Handle deal detail close
  const handleDetailClose = () => {
    setSelectedDeal(null);
  };

  return (
    <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-4">
      {/* Header section */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Discover Local Deals</h1>
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Find and save the best deals near you</p>
          <LastUpdatedTimestamp 
            timestamp={dealsCacheStatus.cacheDate} 
            isCached={dealsCacheStatus.isCached}
            onRefresh={() => refetchDeals()}
          />
        </div>
      </div>

      {/* Search and filter section */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search deals, businesses..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 w-full"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <ListFilterIcon className="h-4 w-4" />
            <span className="inline-block">Filters</span>
            {showFilters ? (
              <ChevronUp className="h-3 w-3 ml-0.5" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-0.5" />
            )}
          </Button>
          
          <div className="hidden md:flex border rounded-md overflow-hidden">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'ghost'} 
              onClick={() => setViewMode('grid')}
              className="rounded-none"
              aria-label="Show as grid"
            >
              <GridIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'map' ? 'default' : 'ghost'} 
              onClick={() => setViewMode('map')}
              className="rounded-none"
              aria-label="Show on map"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category filter section */}
      {showFilters && (
        <Card className="mb-6 w-full">
          <CardContent className="p-4">
            <div className="space-y-4 w-full">
              <CategoryFilter 
                selectedCategories={selectedCategories}
                onChange={handleCategoryChange}
                dealCounts={categoryCounter}
                onClearFilters={handleClearFilters}
              />
              
              {/* Expired deals toggle for business and admin users */}
              {(user?.userType === 'business' || user?.userType === 'admin') && (
                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Switch 
                    id="show-expired" 
                    checked={showExpired}
                    onCheckedChange={setShowExpired}
                  />
                  <Label htmlFor="show-expired" className="flex items-center gap-2 cursor-pointer">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Show expired deals
                  </Label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Featured deals section */}
      {viewMode === 'grid' && filteredDeals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Featured Deals</h2>
          <FeaturedDeals 
            deals={(featuredDeals || []).filter((deal: any) => {
              // If user is individual, filter out expired deals
              if (user?.userType === 'individual' && isExpired(deal)) {
                return false;
              }
              
              // For business and admin users, show expired deals based on toggle
              if ((user?.userType === 'business' || user?.userType === 'admin') && isExpired(deal)) {
                return showExpired;
              }
              
              return true;
            })} 
            isLoading={isLoadingFeatured}
            onSelect={handleDealSelect}
            isCached={featuredDealsCacheStatus.isCached}
            cacheDate={featuredDealsCacheStatus.cacheDate}
            onRefresh={() => refetchFeaturedDeals()}
          />
        </div>
      )}

      {/* Mobile view selector */}
      {isMobile && (
        <Tabs defaultValue="grid" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grid" onClick={() => setViewMode('grid')}>List View</TabsTrigger>
            <TabsTrigger value="map" onClick={() => setViewMode('map')}>Map View</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* No results message */}
      {filteredDeals.length === 0 && !isLoadingDeals && (
        <div className="text-center py-12 pb-16">
          <h3 className="text-xl font-medium mb-2">No deals found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filters
          </p>
          <Button onClick={handleClearFilters}>Clear all filters</Button>
        </div>
      )}

      {/* Main content based on view mode */}
      {filteredDeals.length > 0 && (
        viewMode === 'grid' ? (
          <>
            <DealGrid 
              deals={currentDeals} 
              isLoading={isLoadingDeals}
              onSelect={handleDealSelect}
              isCached={dealsCacheStatus.isCached}
              cacheDate={dealsCacheStatus.cacheDate}
              onRefresh={() => refetchDeals()}
            />
            
            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8 mb-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center mx-2">
                  <span className="text-sm">{currentPage} of {totalPages}</span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-2xl font-semibold">Map View</h2>
              <Badge variant="outline" className="ml-2">
                Showing {filteredDeals.length} deal{filteredDeals.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <DealMap 
              deals={filteredDeals} 
              isLoading={isLoadingDeals}
              onSelect={handleDealSelect}
            />
          </>
        )
      )}

      {/* Deal detail modal */}
      <Dialog
        open={selectedDeal !== null}
        onOpenChange={(open) => {
          if (!open) handleDetailClose();
        }}
      >
        <DialogContent className="sm:max-w-2xl p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
          {selectedDeal !== null && (
            <DealDetail 
              dealId={selectedDeal} 
              onClose={handleDetailClose} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}