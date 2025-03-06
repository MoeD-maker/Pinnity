import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DealMap, DealDetail } from '@/components/dashboard';
import { Button } from '@/components/ui/button';
import { Search, Filter, MapPin } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function MapPage() {
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

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="p-4 shadow-sm bg-background z-10">
        <div className="container max-w-7xl mx-auto flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for deals, businesses, or categories..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
                {selectedCategories.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary w-5 h-5 text-xs flex items-center justify-center text-primary-foreground">
                    {selectedCategories.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.map((category: string) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCategories([...selectedCategories, category]);
                    } else {
                      setSelectedCategories(selectedCategories.filter(c => c !== category));
                    }
                  }}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
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