import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DealMap, DealDetail, CategoryFilter, CATEGORIES } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Search, Filter, MapPin, X } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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

export default function MapPage() {
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  
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
      return apiRequest('/api/deals');
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

  // Active filters count (for badge display)
  const activeFiltersCount = selectedCategories.length + (searchQuery ? 1 : 0);

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="p-4 shadow-sm bg-background z-10">
        <div className="container max-w-7xl mx-auto flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for deals, businesses..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="ml-1 rounded-full bg-primary w-5 h-5 text-xs flex items-center justify-center text-primary-foreground">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-xl">
              <SheetHeader className="text-left">
                <div className="flex items-center justify-between">
                  <SheetTitle>Filter Deals</SheetTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearFilters}
                    className="h-8 px-2 text-xs"
                    disabled={activeFiltersCount === 0}
                  >
                    Clear all
                  </Button>
                </div>
                <SheetDescription>
                  Filter deals by category or search for specific ones
                </SheetDescription>
              </SheetHeader>
              
              <div className="py-6">
                <h3 className="text-sm font-medium mb-3">Categories</h3>
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
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setIsFilterSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    setIsFilterSheetOpen(false);
                  }}
                >
                  Apply Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Active filters indicator */}
      {activeFiltersCount > 0 && (
        <div className="bg-background px-4 py-2 border-t border-b z-10">
          <div className="container max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Active filters:</span>
            
            {searchQuery && (
              <div className="flex items-center bg-muted rounded-full px-3 py-1 text-xs">
                <span className="mr-1">Search: "{searchQuery}"</span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4 p-0 ml-1"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {selectedCategories.map(catId => {
              const category = CATEGORIES.find(c => c.id === catId);
              if (!category) return null;
              
              return (
                <div key={catId} className="flex items-center bg-muted rounded-full px-3 py-1 text-xs">
                  <span>{category.name}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => handleCategoryChange(catId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs ml-auto whitespace-nowrap"
              onClick={handleClearFilters}
            >
              Clear all
            </Button>
          </div>
        </div>
      )}
      
      {/* Map */}
      <div className="flex-1 overflow-hidden relative">
        <DealMap
          deals={filteredDeals}
          isLoading={isLoading}
          onSelect={(dealId) => setSelectedDealId(dealId)}
        />
        
        {selectedDealId && (
          <div className="absolute bottom-0 left-0 right-0 max-h-[60vh] overflow-auto bg-background shadow-lg rounded-t-xl z-20">
            <div className="p-4 sticky top-0 bg-background border-b">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-2 top-2"
                onClick={() => setSelectedDealId(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-semibold">Deal Details</h2>
            </div>
            <div className="p-0 sm:p-4">
              <DealDetail
                dealId={selectedDealId}
                onClose={() => setSelectedDealId(null)}
              />
            </div>
          </div>
        )}
        
        {/* Current location button */}
        <Button 
          variant="secondary" 
          size="icon" 
          className="absolute right-4 bottom-28 z-10 rounded-full h-12 w-12 shadow-md"
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                console.log('Current location:', position.coords);
                // Here you'd update the map center
              },
              (error) => {
                console.error('Error getting location:', error);
              }
            );
          }}
        >
          <MapPin className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}