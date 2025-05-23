import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import useWindowSize from '@/hooks/use-window-size';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  MapPin, 
  Filter as FilterIcon, 
  RefreshCw,
  ArrowDown
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import DealDetail from '@/components/dashboard/DealDetail';
import Breadcrumbs, { commonPathLabels } from '@/components/navigation/Breadcrumbs';
import { 
  getCacheStatusFromResponse, 
  getFreshCacheStatus,
  listenForConnectionRestoration,
  CacheStatus
} from '@/utils/dealsCacheManager';
//import { isExpired } from '@/utils/dealReminders';

// Import our new components
import {
  CategoryCards,
  CategoryTabs,
  EnhancedDealGrid,
  MoodFilters,
  SortOptions,
  SurpriseDeals,
  SortOption,
  MoodFilter
} from '@/components/explore';
import FeaturedDeals from '@/components/explore/FeaturedDealsFixed';

// Import the CATEGORIES for mapping
import { CATEGORIES } from '@/components/dashboard/CategoryFilter';

// Map API categories to our internal category IDs
const mapCategoryToId = (category: string | undefined): string => {
  // Handle undefined or null category
  if (!category) return 'other';
  
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

export default function EnhancedExplorePage() {
  // Basic state
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Get user info from auth context
  const { user } = useAuth();
  
  // New state for enhanced features
  const [sortOption, setSortOption] = useState<SortOption>('trending');
  const [selectedMoods, setSelectedMoods] = useState<MoodFilter[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'large' | 'swipeable'>('grid');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [includeFeatured, setIncludeFeatured] = useState(true);
  
  // State for tracking cached data status
  const [dealsCacheStatus, setDealsCacheStatus] = useState<CacheStatus>({
    isCached: false,
    cacheDate: undefined
  });
  
  // Load saved filters on initial render
  useEffect(() => {
    // Load saved categories
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
    
    // Load featured deals preference
    const savedFeaturedPref = localStorage.getItem('pinnity-include-featured');
    if (savedFeaturedPref !== null) {
      try {
        setIncludeFeatured(JSON.parse(savedFeaturedPref));
      } catch (e) {
        console.error('Error parsing featured deals preference:', e);
      }
    }
  }, []);
  
  // Fetch all deals
  const { data: deals = [], isLoading, error, refetch: refetchDeals } = useQuery({
    queryKey: ['/api/v1/deals', refreshTrigger],
    queryFn: async () => {
      try {
        // Use the raw fetch instead of apiRequest to access headers
        const response = await fetch('/api/v1/deals');
        
        // Check if response is from cache using centralized utility
        const cacheStatus = getCacheStatusFromResponse(response);
        
        // Update cache status
        setDealsCacheStatus(cacheStatus);
        
        const data = await response.json();
        
        // Check if data is an object with numeric keys instead of an array
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          console.log('Converting object to array format');
          // Convert object to array
          return Object.values(data);
        }
        
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
    category?: string;
    imageUrl?: string;
    startDate: Date | string;
    endDate: Date | string;
    discount?: string;
    viewCount?: number;
    saveCount?: number;
    redemptionCount?: number;
    createdAt?: string | Date;
    business?: {
      businessName?: string;
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
  
  // Process deals based on sort option
  const processedDeals = useMemo(() => {
    if (!Array.isArray(deals)) return [];
    
    let results = [...deals];
    
    // Apply sorting based on selected option
    switch (sortOption) {
      case 'trending':
        // Sort by view count and save count
        results.sort((a: any, b: any) => {
          const aScore = (a.viewCount || 0) + (a.saveCount || 0) * 5;
          const bScore = (b.viewCount || 0) + (b.saveCount || 0) * 5;
          return bScore - aScore;
        });
        break;
        
      case 'newest':
        // Sort by created date (newest first)
        results.sort((a: any, b: any) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate;
        });
        break;
        
      case 'endingSoon':
        // Sort by end date (soonest first)
        results.sort((a: any, b: any) => {
          const aDate = a.endDate ? new Date(a.endDate).getTime() : 0;
          const bDate = b.endDate ? new Date(b.endDate).getTime() : 0;
          return aDate - bDate;
        });
        break;
        
      case 'popular':
        // Sort by redemption count
        results.sort((a: any, b: any) => {
          return (b.redemptionCount || 0) - (a.redemptionCount || 0);
        });
        break;
    }
    
    return results;
  }, [deals, sortOption]);
  
  // Filter deals based on search query, selected categories, moods, and expiration status
  const filteredDeals = useMemo(() => {
    if (!Array.isArray(processedDeals)) return [];
    
    return processedDeals.filter((deal: DealWithBusiness) => {
      // Skip invalid deals
      if (!deal || typeof deal !== 'object') return false;
      
      // Check if deal is expired
      const isDealExpired = () => {
        if (!deal.endDate) return false;
        const now = new Date();
        const endDate = new Date(deal.endDate);
        return endDate < now;
      };
      
      // For individual users, hide expired deals
      // For business and admin users, show expired deals
      if (user?.userType === 'individual' && isDealExpired()) {
        return false; // Hide expired deals for regular users
      }
      
      // Map API category to our category system
      const dealCategoryId = mapCategoryToId(deal.category);
      
      // Search query filter
      const matchesSearch = !searchQuery || 
        (deal.title && deal.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (deal.description && deal.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (deal.business && deal.business.businessName && 
         deal.business.businessName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Category filter
      const matchesCategory = selectedCategories.length === 0 || 
        selectedCategories.includes(dealCategoryId);
      
      // Mood filter (simplified implementation - in a real app, this would use tags or metadata)
      const matchesMood = selectedMoods.length === 0 || selectedMoods.some(mood => {
        // This is a very simplified implementation
        // In a real app, this would match against proper deal tags or categories
        switch (mood) {
          case 'dateNight':
            return dealCategoryId === 'restaurants' || dealCategoryId === 'nightlife';
          case 'familyFun':
            return dealCategoryId === 'entertainment';
          case 'quickBites':
            return dealCategoryId === 'restaurants' || dealCategoryId === 'cafes';
          case 'budgetFriendly':
            // Check if the discount is high
            return (deal.discount || '').includes('50%') || (deal.discount || '').includes('FREE');
          case 'coffee':
            return dealCategoryId === 'cafes';
          // Add more mood matching logic here
          default:
            return false;
        }
      });
      
      return matchesSearch && matchesCategory && matchesMood;
    });
  }, [processedDeals, searchQuery, selectedCategories, selectedMoods, user?.userType]);
  
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
      
      // Save to localStorage
      localStorage.setItem('pinnity-category-filters', JSON.stringify(newCategories));
      
      return newCategories;
    });
  };

  // Handle mood filter selection
  const handleMoodChange = (mood: MoodFilter) => {
    setSelectedMoods(prev => {
      if (prev.includes(mood)) {
        return prev.filter(m => m !== mood);
      } else {
        return [...prev, mood];
      }
    });
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSelectedCategories([]);
    setSelectedMoods([]);
    setSearchQuery('');
    setIncludeFeatured(true); // Reset featured deals toggle to default (included)
    localStorage.removeItem('pinnity-category-filters');
    localStorage.removeItem('pinnity-include-featured'); // Clear featured deals preference
  };
  
  // Handle random deal selection
  const handleRandomDeal = () => {
    if (filteredDeals.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredDeals.length);
      setSelectedDealId(filteredDeals[randomIndex].id);
    }
  };
  
  // Handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
    refetchDeals();
  };

  // Use the window size hook for responsive behavior
  const { isMobile } = useWindowSize();
  
  return (
    <div className="container max-w-7xl mx-auto px-2 sm:px-4 md:px-6 pt-3 pb-16 min-h-screen overflow-hidden">
      {/* Breadcrumbs navigation */}
      <Breadcrumbs 
        pathLabels={commonPathLabels} 
        className="mb-4 overflow-x-auto" 
      />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 w-full">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary">Explore</h1>
          <p className="text-muted-foreground mt-1">
            Discover amazing local deals
          </p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto max-w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              className="pl-10 h-12 text-base sm:text-sm w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-shrink-0 h-12 w-12 p-0 ${showFilters ? 'bg-muted' : ''}`}
            aria-label="Toggle filters"
          >
            <FilterIcon className="h-5 w-5" />
          </Button>
          
          <Button
            variant="outline"
            onClick={handleRefresh}
            className="flex-shrink-0 h-12 w-12 p-0"
            aria-label="Refresh deals"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Horizontal category tabs for quick filtering */}
      <CategoryTabs 
        selectedCategories={selectedCategories}
        onChange={handleCategoryChange}
        dealCounts={categoryCounter}
        className="mb-4 sm:mb-6"
      />
      
      {/* Mobile filters */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-semibold">Filters</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters}
                className="h-9 text-sm"
              >
                Clear all
              </Button>
            </div>
            
            <Separator />
            
            {/* Mood filters */}
            <MoodFilters 
              selectedMoods={selectedMoods}
              onChange={handleMoodChange}
              className="pt-1"
            />
            
            <Separator className="my-1" />
            
            {/* Visual category selection */}
            <CategoryCards
              selectedCategories={selectedCategories}
              onChange={handleCategoryChange}
              dealCounts={categoryCounter}
            />
            
            <Separator className="my-1" />
            
            {/* Featured Deals Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label htmlFor="featured-deals" className="font-medium">Featured Deals</Label>
                <p className="text-xs text-muted-foreground">Include promoted deals in results</p>
              </div>
              <Switch
                id="featured-deals"
                checked={includeFeatured}
                onCheckedChange={(value) => {
                  setIncludeFeatured(value);
                  // Save preference to localStorage
                  localStorage.setItem('pinnity-include-featured', JSON.stringify(value));
                }}
              />
            </div>
            
            <div className="pt-2">
              <Button 
                onClick={() => setShowFilters(false)} 
                className="w-full sm:w-auto h-11"
              >
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Sort options */}
      <div className="mb-4 sm:mb-6">
        <SortOptions 
          selectedSort={sortOption}
          onChange={setSortOption}
          variant="tabs"
        />
      </div>
      
      {/* Location indicator */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm text-muted-foreground mb-4 sm:mb-6">
        <MapPin className="h-4 w-4 flex-shrink-0" />
        <span className="mr-1">Showing deals near San Francisco, CA</span>
        <Button variant="link" className="p-0 h-auto text-xs sm:text-sm">
          Change
        </Button>
      </div>
      
      {/* Display mode buttons (grid/large/swipeable) */}
      <div className="flex justify-center sm:justify-end mb-4 sm:mb-6 gap-1 sm:gap-2">
        <Button 
          variant={viewMode === 'grid' ? 'default' : 'outline'} 
          onClick={() => setViewMode('grid')}
          className="px-2 sm:px-4 h-10 text-xs sm:text-sm flex-1 sm:flex-none max-w-[110px] sm:max-w-none"
        >
          Grid View
        </Button>
        <Button 
          variant={viewMode === 'large' ? 'default' : 'outline'} 
          onClick={() => setViewMode('large')}
          className="px-2 sm:px-4 h-10 text-xs sm:text-sm flex-1 sm:flex-none max-w-[110px] sm:max-w-none"
        >
          Large Cards
        </Button>
        <Button 
          variant={viewMode === 'swipeable' ? 'default' : 'outline'} 
          onClick={() => setViewMode('swipeable')}
          className="px-2 sm:px-4 h-10 text-xs sm:text-sm flex-1 sm:flex-none max-w-[110px] sm:max-w-none"
        >
          Swipe Mode
        </Button>
      </div>
      
      {/* Deal grid with enhanced features */}
      {isLoading ? (
        <EnhancedDealGrid
          deals={[]}
          isLoading={true}
          onSelect={() => {}}
          viewMode={viewMode}
          sortBy={sortOption}
        />
      ) : filteredDeals.length === 0 ? (
        <div className="text-center py-12 pb-16">
          <h3 className="text-xl font-medium mb-2">No deals found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search or filters
          </p>
          <Button onClick={handleClearFilters}>Clear all filters</Button>
        </div>
      ) : (
        <>
          {/* Featured Deals section (if not in swipeable mode and includeFeatured is true) */}
          {viewMode !== 'swipeable' && includeFeatured && (
            <FeaturedDeals
              onSelect={(dealId: number) => setSelectedDealId(dealId)}
              title="Featured Deals"
              limit={3}
            />
          )}
          
          {/* Explanatory message for featured deals when filters are active - show different message based on includeFeatured state */}
          {viewMode !== 'swipeable' && (showFilters || selectedCategories.length > 0 || searchQuery || selectedMoods.length > 0) && (
            <div className={`${includeFeatured ? 'bg-blue-50' : 'bg-gray-50'} p-3 rounded-lg mb-6 text-sm flex items-center`}>
              <div className={`h-4 w-4 ${includeFeatured ? 'text-blue-500' : 'text-gray-500'} mr-2 flex-shrink-0`}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              {includeFeatured ? (
                <p>
                  Featured deals are always shown regardless of filters. 
                  {filteredDeals.length > 0 ? 
                    " All deals below match your selected filters." :
                    " No deals match your current filters."}
                </p>
              ) : (
                <p>
                  Featured deals are hidden. 
                  {filteredDeals.length > 0 ? 
                    " Only deals matching your selected filters are shown." : 
                    " No deals match your current filters."}
                </p>
              )}
            </div>
          )}
          
          {/* Section divider between featured and all deals - only shown when featured deals are included */}
          {viewMode !== 'swipeable' && includeFeatured && filteredDeals.length > 0 && (
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-gray-500">
                  {filteredDeals.length > 0 ? 
                    `${filteredDeals.length} All Deals` : 
                    "No Matching Deals"}
                </span>
              </div>
            </div>
          )}
          
          {/* Enhanced deal grid with our sorting and view modes */}
          <EnhancedDealGrid
            deals={filteredDeals}
            isLoading={isLoading}
            onSelect={(dealId: number) => setSelectedDealId(dealId)}
            isCached={dealsCacheStatus.isCached}
            cacheDate={dealsCacheStatus.cacheDate}
            onRefresh={handleRefresh}
            viewMode={viewMode}
            sortBy={sortOption}
            onRandomDeal={handleRandomDeal}
          />
          
          {/* "Load more" button (in a real app this would implement pagination) */}
          {filteredDeals.length > 9 && viewMode !== 'swipeable' && (
            <div className="flex justify-center mt-8">
              <Button variant="outline" className="gap-2">
                Load more deals
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Deal detail dialog */}
      {/* We don't need to add DialogTitle here because DealDetail component has its own */}
      {selectedDealId && (
        <DealDetail
          dealId={selectedDealId}
          onClose={() => setSelectedDealId(null)}
        />
      )}
    </div>
  );
}