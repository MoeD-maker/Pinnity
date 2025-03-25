import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shuffle, Sparkles } from 'lucide-react';

interface DealWithBusiness {
  id: number;
  title: string;
  description: string;
  category: string;
  imageUrl?: string;
  business: {
    businessName: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface SurpriseDealsProps {
  deals: DealWithBusiness[];
  isLoading: boolean;
  onSelect: (dealId: number) => void;
  title?: string;
}

export default function SurpriseDeals({ 
  deals, 
  isLoading, 
  onSelect,
  title = "Surprise Me"
}: SurpriseDealsProps) {
  const [randomDeals, setRandomDeals] = useState<DealWithBusiness[]>([]);
  
  // Function to get random deals
  const getRandomDeals = () => {
    if (deals.length <= 3) {
      setRandomDeals([...deals]);
      return;
    }
    
    // Create a copy of the deals array
    const dealsCopy = [...deals];
    const randomSelection: DealWithBusiness[] = [];
    
    // Pick 3 random deals
    for (let i = 0; i < 3 && dealsCopy.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * dealsCopy.length);
      randomSelection.push(dealsCopy[randomIndex]);
      dealsCopy.splice(randomIndex, 1);
    }
    
    setRandomDeals(randomSelection);
  };
  
  // Get random deals on initial render
  useEffect(() => {
    if (deals.length > 0 && !isLoading) {
      getRandomDeals();
    }
  }, [deals, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {title}
          </h2>
          <Button variant="ghost" size="sm" disabled>
            <Shuffle className="h-4 w-4 mr-1" />
            Refresh
          </Button>
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
              <CardFooter className="p-3 pt-0">
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (deals.length === 0 || randomDeals.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-4 mb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          {title}
        </h2>
        <Button variant="ghost" size="sm" onClick={getRandomDeals}>
          <Shuffle className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {randomDeals.map(deal => (
          <Card 
            key={deal.id} 
            className="overflow-hidden transition-all hover:shadow-md cursor-pointer"
            onClick={() => onSelect(deal.id)}
          >
            <div className="aspect-video relative overflow-hidden">
              <img 
                src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
                alt={deal.title}
                className="w-full h-full object-cover transition-transform hover:scale-105"
              />
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
                onClick={() => onSelect(deal.id)}
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