import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Deal } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart } from 'lucide-react';

interface FeaturedDealsProps {
  deals: (Deal & { business: any })[];
  isLoading: boolean;
  onSelect: (dealId: number) => void;
}

export default function FeaturedDeals({ deals, isLoading, onSelect }: FeaturedDealsProps) {
  if (isLoading) {
    return (
      <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
        {Array.from({ length: 4 }).map((_, i) => (
          <FeaturedDealSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">No featured deals available</p>
      </div>
    );
  }

  return (
    <div className="flex overflow-x-auto gap-4 pb-4 hide-scrollbar">
      {deals.map((deal) => (
        <FeaturedDealCard 
          key={deal.id} 
          deal={deal} 
          onSelect={() => onSelect(deal.id)} 
        />
      ))}
    </div>
  );
}

interface FeaturedDealCardProps {
  deal: Deal & { business: any };
  onSelect: () => void;
}

function FeaturedDealCard({ deal, onSelect }: FeaturedDealCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Calculate discount percentage or value
  const discount = deal.discount || '';

  return (
    <Card 
      ref={ref} 
      className="overflow-hidden flex-shrink-0 w-[280px] cursor-pointer transition-all hover:shadow-md"
      onClick={onSelect}
    >
      {inView ? (
        <div className="aspect-[4/3] relative">
          <img 
            src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
            alt={deal.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-4">
            <Badge className="mb-2 self-start bg-primary text-white">
              {discount}
            </Badge>
            <h3 className="text-white font-semibold line-clamp-1">{deal.title}</h3>
            <p className="text-white/90 text-sm line-clamp-1">
              {deal.business.businessName}
            </p>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute top-2 right-2 bg-white/80 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              // Add favorite functionality here
            }}
          >
            <Heart className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        <div className="aspect-[4/3] bg-muted animate-pulse" />
      )}
      
      <CardContent className="p-3">
        <p className="text-sm line-clamp-2 text-muted-foreground">
          {deal.description}
        </p>
      </CardContent>
    </Card>
  );
}

function FeaturedDealSkeleton() {
  return (
    <Card className="overflow-hidden flex-shrink-0 w-[280px]">
      <div className="aspect-[4/3]">
        <Skeleton className="h-full w-full" />
      </div>
      <CardContent className="p-3">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}