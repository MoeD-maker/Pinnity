import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter as ListFilterIcon, Map as MapIcon, Grid as GridIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Use the barrel export for dashboard components
import { 
  DealMap, 
  DealGrid, 
  FeaturedDeals, 
  CategoryFilter, 
  DealDetail 
} from '@/components/dashboard';
import { Deal } from '@shared/schema';

type ViewMode = 'grid' | 'map';

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();

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
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Filter deals based on search query and selected categories
  const filteredDeals = deals?.filter((deal: Deal & { business: any }) => {
    const matchesSearch = searchQuery === '' || 
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.business.businessName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategories.length === 0 || 
      selectedCategories.includes(deal.category);
    
    return matchesSearch && matchesCategory;
  }) || [];

  // Handle deal selection for detail view
  const handleDealSelect = (dealId: number) => {
    setSelectedDeal(dealId);
  };

  // Handle deal detail close
  const handleDetailClose = () => {
    setSelectedDeal(null);
  };

  // Get all unique categories from deals
  const categories = deals ? 
    [...new Set(deals.map((deal: Deal) => deal.category))] : 
    [];

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
              categories={categories} 
              selectedCategories={selectedCategories}
              onChange={handleCategoryChange}
            />
          </CardContent>
        </Card>
      )}

      {/* Featured deals section */}
      {viewMode === 'grid' && !isMobile && (
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

      {/* Main content based on view mode */}
      {viewMode === 'grid' ? (
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