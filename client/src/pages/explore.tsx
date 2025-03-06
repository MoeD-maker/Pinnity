import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CategoryFilter, DealGrid, DealDetail, CATEGORIES } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, MapPin, Filter as FilterIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
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
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['/api/deals'],
    queryFn: async () => {
      const response = await apiRequest('/api/deals');
      return response || [];
    },
  });
  
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
    <div className="container max-w-7xl mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary">Explore Deals</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Categories sidebar */}
        <Card className="h-fit sticky top-20 hidden lg:block">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Categories</h3>
            <div className="space-y-1.5 pt-1">
              {CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    category.id === 'all' 
                      ? (selectedCategories.length === 0 || selectedCategories.includes('all'))
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary' 
                      : selectedCategories.includes(category.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-secondary'
                  }`}
                  onClick={() => handleCategoryChange(category.id)}
                >
                  <category.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{category.name}</span>
                  {categoryCounter[category.id] > 0 && category.id !== 'all' && (
                    <span className={`ml-auto px-1.5 py-0.5 text-xs rounded-full ${
                      selectedCategories.includes(category.id) 
                        ? 'bg-primary-foreground/20 text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {categoryCounter[category.id]}
                    </span>
                  )}
                </div>
              ))}

              {selectedCategories.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearFilters}
                  className="w-full justify-start text-sm mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Mobile category filter */}
          {showFilters && (
            <Card className="lg:hidden">
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

          {/* Location indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Showing deals near San Francisco, CA</span>
            <Button variant="link" className="p-0 h-auto" size="sm">
              Change
            </Button>
          </div>

          {/* Deal grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
            <div className="text-center py-12">
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
        <DialogContent className="max-w-2xl">
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