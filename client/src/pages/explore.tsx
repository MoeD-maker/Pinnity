import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CategoryFilter, DealGrid, DealDetail } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, MapPin } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function ExplorePage() {
  const [selectedDealId, setSelectedDealId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Fetch all deals
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['/api/deals'],
    queryFn: async () => {
      const response = await apiRequest('/api/deals');
      return response || [];
    },
  });
  
  // Extract all unique categories from deals
  const categories = [...new Set(deals.map((deal: any) => deal.category))];
  
  // Filter deals based on search query and selected categories
  const filteredDeals = deals.filter((deal: any) => {
    const matchesSearch = 
      !searchQuery || 
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.business.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategories.length === 0 || selectedCategories.includes(deal.category);
    
    return matchesSearch && matchesCategory;
  });

  // Toggle category selection
  const handleCategoryToggle = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
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
        
        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Categories sidebar */}
        <Card className="h-fit sticky top-20 hidden lg:block">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Categories</h3>
            <div className="space-y-2">
              {categories.map((category: string) => (
                <div
                  key={category}
                  className={`px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${
                    selectedCategories.includes(category)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-secondary'
                  }`}
                  onClick={() => handleCategoryToggle(category)}
                >
                  {category}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Mobile category filter */}
          <div className="lg:hidden overflow-x-auto pb-2">
            <CategoryFilter
              categories={categories}
              selectedCategories={selectedCategories}
              onChange={handleCategoryToggle}
            />
          </div>

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
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
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