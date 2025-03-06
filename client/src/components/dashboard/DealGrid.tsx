import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Deal } from '@shared/schema';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, MapPin, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface DealGridProps {
  deals: (Deal & { business: any })[];
  isLoading: boolean;
  onSelect: (dealId: number) => void;
}

export default function DealGrid({ deals, isLoading, onSelect }: DealGridProps) {
  // For optimization, we could implement virtualization for large lists

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <DealCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium mb-2">No deals found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {deals.map((deal) => (
        <DealCard 
          key={deal.id} 
          deal={deal} 
          onSelect={() => onSelect(deal.id)} 
        />
      ))}
    </div>
  );
}

interface DealCardProps {
  deal: Deal & { business: any };
  onSelect: () => void;
}

function DealCard({ deal, onSelect }: DealCardProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  // Format the expiration date
  const expiresIn = formatDistanceToNow(new Date(deal.endDate), { addSuffix: true });
  
  // Calculate discount percentage or value
  const discount = deal.discount || '';

  return (
    <Card 
      ref={ref} 
      className="overflow-hidden transition-all hover:shadow-md cursor-pointer"
      onClick={onSelect}
    >
      {inView ? (
        <div className="aspect-video relative overflow-hidden">
          <img 
            src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
            alt={deal.title}
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-primary text-primary-foreground">
              {discount}
            </Badge>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute top-2 left-2 bg-white/80 hover:bg-white"
            onClick={(e) => {
              e.stopPropagation();
              // Add favorite functionality here
            }}
          >
            <Heart className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        <div className="aspect-video bg-muted animate-pulse" />
      )}
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <Badge variant="outline" className="mb-2">
              {deal.category}
            </Badge>
            <h3 className="font-semibold text-lg line-clamp-1">{deal.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-1">
              {deal.business.businessName}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        <p className="text-sm line-clamp-2 mb-2">
          {deal.description}
        </p>
        
        <div className="flex items-center text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 mr-1" />
          <span className="mr-3">2.4 miles</span>
          <Calendar className="h-3 w-3 mr-1" />
          <span>Expires {expiresIn}</span>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0">
        <Button onClick={onSelect} className="w-full">
          View Deal
        </Button>
      </CardFooter>
    </Card>
  );
}

function DealCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video">
        <Skeleton className="h-full w-full" />
      </div>
      <CardHeader className="p-4 pb-2">
        <Skeleton className="h-5 w-20 mb-2" />
        <Skeleton className="h-6 w-full mb-1" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}