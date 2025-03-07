import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, Calendar, Phone, Globe, Clock, Share2, Heart, Award } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';

interface DealDetailProps {
  dealId: number;
  onClose: () => void;
}

export default function DealDetail({ dealId, onClose }: DealDetailProps) {
  const [step, setStep] = useState<'details' | 'redeem'>('details');
  const { toast } = useToast();
  
  // Fetch the deal details
  const { data: deal, isLoading } = useQuery({
    queryKey: ['/api/deals', dealId],
    queryFn: async () => {
      return apiRequest(`/api/deals/${dealId}`);
    }
  });

  // Add to favorites mutation
  const addToFavorites = useMutation({
    mutationFn: async () => {
      // For demonstration purposes only - in a real app, get userId from auth context
      const userId = 1;
      
      return apiRequest(`/api/user/${userId}/favorites`, {
        method: 'POST',
        data: { dealId }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Deal saved',
        description: 'This deal has been added to your favorites',
      });
      
      // Invalidate favorites query
      queryClient.invalidateQueries({ queryKey: ['/api/user/favorites'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save this deal',
        variant: 'destructive',
      });
    },
  });

  // Redeem deal mutation
  const redeemDeal = useMutation({
    mutationFn: async () => {
      // For demonstration purposes only - in a real app, get userId from auth context
      const userId = 1;
      
      return apiRequest(`/api/user/${userId}/redemptions`, {
        method: 'POST',
        data: { dealId }
      });
    },
    onSuccess: () => {
      toast({
        title: 'Deal redeemed',
        description: 'Show this screen to the business to claim your deal',
      });
      
      // Invalidate redemptions query
      queryClient.invalidateQueries({ queryKey: ['/api/user/redemptions'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to redeem this deal',
        variant: 'destructive',
      });
    },
  });

  // Share deal functionality
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: deal?.title,
        text: `Check out this deal: ${deal?.title}`,
        url: window.location.href,
      })
      .catch((error) => console.error('Error sharing:', error));
    } else {
      // Fallback for browsers that don't support navigator.share
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          toast({
            title: 'Link copied',
            description: 'Deal link copied to clipboard',
          });
        })
        .catch((error) => console.error('Error copying to clipboard:', error));
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <DealDetailSkeleton />
        ) : deal ? (
          <>
            <DialogHeader>
              <div className="flex justify-between items-center mb-2">
                <Badge>{deal.category}</Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => addToFavorites.mutate()}>
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogTitle className="text-2xl">{deal.title}</DialogTitle>
              <DialogDescription className="text-base font-medium">
                {deal.business.businessName}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" value={step === 'redeem' ? 'redeem' : 'details'} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="details" 
                  onClick={() => setStep('details')}
                >
                  Details
                </TabsTrigger>
                <TabsTrigger 
                  value="redeem" 
                  onClick={() => setStep('redeem')}
                >
                  How to Redeem
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Show image only in details tab with proper spacing */}
                <div className="aspect-video rounded-lg overflow-hidden mb-6">
                  <img 
                    src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
                    alt={deal.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="bg-card rounded-lg p-5 border shadow-sm">
                  <h3 className="font-medium mb-3">About This Deal</h3>
                  <p className="text-muted-foreground">{deal.description}</p>
                </div>

                <div className="bg-card rounded-lg p-5 border shadow-sm">
                  <h3 className="font-medium mb-3">Business Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-muted p-2 rounded-md">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <span className="mt-1">{deal.business.address || 'Address not available'}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-muted p-2 rounded-md">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <span className="mt-1">{deal.business.phone || 'Phone not available'}</span>
                    </div>
                    {deal.business.website && (
                      <div className="flex items-start gap-3">
                        <div className="bg-muted p-2 rounded-md">
                          <Globe className="h-4 w-4 text-primary" />
                        </div>
                        <a 
                          href={deal.business.website.startsWith('http') ? deal.business.website : `https://${deal.business.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline mt-1"
                        >
                          {deal.business.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card rounded-lg p-5 border shadow-sm">
                  <h3 className="font-medium mb-3">Deal Validity</h3>
                  <div className="flex items-start gap-3">
                    <div className="bg-muted p-2 rounded-md">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="mt-1">
                      <p>Valid until {format(new Date(deal.endDate), 'MMMM d, yyyy')}</p>
                      <p className="text-sm text-muted-foreground">
                        Expires {formatDistanceToNow(new Date(deal.endDate), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>

                {deal.terms && (
                  <div className="bg-card rounded-lg p-5 border shadow-sm">
                    <h3 className="font-medium mb-3">Terms & Conditions</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {deal.terms}
                    </p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="redeem" className="mt-6 pb-4">
                <div className="bg-card rounded-lg p-6 border shadow-sm">
                  <div className="text-center mb-6">
                    <div className="bg-primary/10 inline-flex p-3 rounded-full mb-3">
                      <Award className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium mb-1">How to redeem this deal</h3>
                    <p className="text-muted-foreground">
                      Follow these simple steps to claim your offer
                    </p>
                  </div>

                  <div className="space-y-6 mb-8">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-base">Click the Redeem button</h4>
                        <p className="text-sm text-muted-foreground">
                          This will generate a unique redemption code
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-base">Visit {deal.business.businessName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Go to the business location during operating hours
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-base">Show your redemption code</h4>
                        <p className="text-sm text-muted-foreground">
                          Present the code to the staff to claim your deal
                        </p>
                      </div>
                    </div>
                  </div>

                  {deal.redemptionCode && (
                    <div className="mt-8 p-6 border-2 rounded-lg bg-primary/5 text-center">
                      <p className="text-sm font-medium uppercase text-muted-foreground tracking-wide mb-3">Redemption Code</p>
                      <div className="text-2xl font-mono font-bold tracking-wider">{deal.redemptionCode}</div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              {step === 'details' ? (
                <Button 
                  className="w-full" 
                  onClick={() => setStep('redeem')}
                >
                  Redeem This Deal
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  onClick={() => redeemDeal.mutate()}
                  disabled={redeemDeal.isPending}
                >
                  {redeemDeal.isPending ? 'Processing...' : 'Confirm Redemption'}
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-6">
            <p>Could not load deal details. Please try again.</p>
            <Button variant="outline" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DealDetailSkeleton() {
  return (
    <>
      <DialogHeader>
        <div className="flex justify-between items-center mb-2">
          <Skeleton className="h-5 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </DialogHeader>

      <Skeleton className="aspect-video w-full rounded-lg mb-4" />
      
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        
        <div className="pt-4">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full mt-1" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </div>
      </div>
      
      <div className="mt-6">
        <Skeleton className="h-10 w-full" />
      </div>
    </>
  );
}