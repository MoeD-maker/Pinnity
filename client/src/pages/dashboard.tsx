import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter as ListFilterIcon, 
  Map as MapIcon, 
  Grid as GridIcon,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

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

type ViewMode = 'grid' | 'map';

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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true); // Default to true to show filters
  const [selectedDeal, setSelectedDeal] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

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
  const { data: deals, isLoading: isLoadingDeals } = useQuery({
    queryKey: ['/api/deals'],
    queryFn: async () => {
      const response = await apiRequest('/api/deals');
      return response || [];
    },
  });

  // Fetch featured deals
  const { data: featuredDeals, isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['/api/deals/featured'],
    queryFn: async () => {
      const response = await apiRequest('/api/deals/featured?limit=5');
      return response || [];
    },
  });

  // Handle category filter changes
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

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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

  // Filter deals based on search query and selected categories
  const filteredDeals = deals && Array.isArray(deals) 
    ? deals.filter((deal: Deal & { business: any }) => {
        // Map API category to our category system
        const dealCategoryId = mapCategoryToId(deal.category);
        
        const matchesSearch = searchQuery === '' || 
          deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deal.business.businessName.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesCategory = selectedCategories.length === 0 || 
          selectedCategories.includes(dealCategoryId);
        
        return matchesSearch && matchesCategory;
      })
    : [];

  // Handle deal selection for detail view
  const handleDealSelect = (dealId: number) => {
    setSelectedDeal(dealId);
  };

  // Handle deal detail close
  const handleDetailClose = () => {
    setSelectedDeal(null);
  };

  return (
    <div className="container max-w-7xl mx-auto p-4">
      {/* Header section */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Discover Local Deals</h1>
        <p className="text-muted-foreground">Find and save the best deals near you</p>
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
            Filters
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
            >
              <GridIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'map' ? 'default' : 'ghost'} 
              onClick={() => setViewMode('map')}
              className="rounded-none"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category filter section */}
      {showFilters && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <CategoryFilter 
              selectedCategories={selectedCategories}
              onChange={handleCategoryChange}
              dealCounts={categoryCounter}
              onClearFilters={handleClearFilters}
            />
          </CardContent>
        </Card>
      )}

      {/* Featured deals section */}
      {viewMode === 'grid' && !isMobile && filteredDeals.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Featured Deals</h2>
          <FeaturedDeals 
            deals={featuredDeals || []} 
            isLoading={isLoadingFeatured}
            onSelect={handleDealSelect}
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
        <div className="text-center py-12">
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
          <DealGrid 
            deals={filteredDeals} 
            isLoading={isLoadingDeals}
            onSelect={handleDealSelect}
          />
        ) : (
          <DealMap 
            deals={filteredDeals} 
            isLoading={isLoadingDeals}
            onSelect={handleDealSelect}
          />
        )
      )}

      {/* Deal detail modal */}
      {selectedDeal !== null && (
        <DealDetail 
          dealId={selectedDeal} 
          onClose={handleDetailClose} 
        />
      )}
    </div>
  );
}