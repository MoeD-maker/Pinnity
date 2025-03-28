import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, Calendar, Phone, Globe, Clock, Share2, Heart, Award, AlertCircle, CheckCircle, Sparkles, Info } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { queryClient } from '@/lib/queryClient';
import { isExpired, isExpiringSoon, getExpirationText } from '@/utils/dateUtils';
import { apiRequest } from '@/lib/queryClient';
import { checkDealRedemptionStatus } from '@/lib/dealUtils';
import RedemptionDialog from './RedemptionDialog';

interface DealDetailProps {
  dealId: number;
  onClose: () => void;
}

export default function DealDetail({ dealId, onClose }: DealDetailProps) {
  const [step, setStep] = useState<'details' | 'redeem'>('details');
  const [showRedemptionDialog, setShowRedemptionDialog] = useState(false);
  const [redemptionStatus, setRedemptionStatus] = useState<{
    hasRedeemed: boolean;
    redemptionCount: number;
    maxRedemptionsPerUser: number | null;
    canRedeem: boolean;
    success: boolean;
    error?: any;
  }>({
    hasRedeemed: false,
    redemptionCount: 0,
    maxRedemptionsPerUser: null,
    canRedeem: true,
    success: false
  });
  const { toast } = useToast();
  
  // Fetch the deal details
  const { data: deal, isLoading, refetch } = useQuery({
    queryKey: ['/api/v1/deals', dealId],
    queryFn: async () => {
      return apiRequest(`/api/v1/deals/${dealId}`);
    }
  });
  
  // Check redemption status
  useEffect(() => {
    async function checkRedemption() {
      if (!deal) return;
      
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user?.id;
      
      if (!userId) return;
      
      const status = await checkDealRedemptionStatus(userId, dealId);
      setRedemptionStatus(status);
    }
    
    checkRedemption();
  }, [dealId, deal]);

  // Add to favorites mutation
  const addToFavorites = useMutation({
    mutationFn: async () => {
      // Get userId from local storage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user?.id || 1;
      
      return apiRequest(`/api/v1/user/${userId}/favorites`, {
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
      queryClient.invalidateQueries({ queryKey: ['/api/v1/user/favorites'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save this deal',
        variant: 'destructive',
      });
    },
  });

  // Handle redemption success
  const handleRedemptionSuccess = async () => {
    // Refetch the deal to update redemption count
    await refetch();
    
    // Update any other data that might be affected
    queryClient.invalidateQueries({ queryKey: ['/api/v1/user/redemptions'] });
    
    // Update redemption status immediately
    if (deal) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = user?.id;
      
      if (userId) {
        const status = await checkDealRedemptionStatus(userId, dealId);
        setRedemptionStatus(status);
      }
    }
    
    // Show a success toast
    toast({
      title: "Deal Redeemed Successfully!",
      description: "Your redemption has been recorded",
    });
  };

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
      <DialogContent 
        className="w-[calc(100%-32px)] max-h-[90vh] overflow-y-auto mx-auto sm:max-w-[600px] p-4 sm:p-6 sm:pt-5 pt-10"
        aria-labelledby="deal-detail-title"
        aria-describedby="deal-detail-description"
      >
        {isLoading ? (
          <DealDetailSkeleton />
        ) : deal ? (
          <>
            {/* Close button in top right corner */}
            <DialogClose className="absolute top-5 right-5 rounded-full h-7 w-7 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground" />
            
            {/* Heart & Share buttons in top left corner */}
            <div className="absolute top-5 left-5 flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => addToFavorites.mutate()} 
                className="h-7 w-7 sm:h-8 sm:w-8 bg-white/90 rounded-full"
              >
                <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleShare} 
                className="h-7 w-7 sm:h-8 sm:w-8 bg-white/90 rounded-full"
              >
                <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
            
            {/* Modified header with more spacing and mobile-friendly design */}            
            <DialogHeader className="pb-2 pt-4 sm:pt-3 mt-6">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="text-xs sm:text-sm">{deal.category}</Badge>
                  {deal.featured && (
                    <Badge className="bg-primary text-white flex items-center gap-1 text-xs">
                      <Sparkles className="h-3 w-3" />
                      <span>Featured</span>
                    </Badge>
                  )}
                </div>
              </div>
              <DialogTitle id="deal-detail-title" className="text-xl sm:text-2xl leading-tight mb-1">{deal.title}</DialogTitle>
              <DialogDescription id="deal-detail-description" className="text-sm sm:text-base font-medium">
                {deal.business.businessName}
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" value={step === 'redeem' ? 'redeem' : 'details'} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="details" 
                  onClick={() => setStep('details')}
                  className="text-xs sm:text-sm py-1.5 sm:py-2"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger 
                  value="redeem" 
                  onClick={() => setStep('redeem')}
                  className="text-xs sm:text-sm py-1.5 sm:py-2"
                >
                  How to Redeem
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Show image only in details tab with proper spacing */}
                <div className={`aspect-video rounded-lg overflow-hidden mb-6 relative ${deal.featured ? 'border-2 border-primary/30' : ''}`}>
                  <img 
                    src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
                    alt={deal.title}
                    className="w-full h-full object-cover"
                  />
                  {deal.featured && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-primary text-white flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        <span>Featured</span>
                      </Badge>
                    </div>
                  )}
                </div>
                
                <div className="bg-card rounded-lg p-4 sm:p-5 border shadow-sm">
                  <h3 className="font-medium mb-3 text-sm sm:text-base">About This Deal</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{deal.description}</p>
                </div>

                <div className="bg-card rounded-lg p-4 sm:p-5 border shadow-sm">
                  <h3 className="font-medium mb-3 text-sm sm:text-base">Business Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="bg-muted p-1.5 sm:p-2 rounded-md">
                        <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <span className="mt-0.5 text-xs sm:text-sm sm:mt-1 break-words">{deal.business.address || 'Address not available'}</span>
                    </div>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="bg-muted p-1.5 sm:p-2 rounded-md">
                        <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <span className="mt-0.5 text-xs sm:text-sm sm:mt-1">{deal.business.phone || 'Phone not available'}</span>
                    </div>
                    {deal.business.website && (
                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="bg-muted p-1.5 sm:p-2 rounded-md">
                          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                        </div>
                        <a 
                          href={deal.business.website.startsWith('http') ? deal.business.website : `https://${deal.business.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline mt-0.5 text-xs sm:text-sm sm:mt-1 break-all"
                        >
                          {deal.business.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-card rounded-lg p-4 sm:p-5 border shadow-sm">
                  <h3 className="font-medium mb-3 text-sm sm:text-base">Deal Validity</h3>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="bg-muted p-1.5 sm:p-2 rounded-md">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                    <div className="mt-0.5 sm:mt-1">
                      <p className="text-xs sm:text-sm">Valid until {format(new Date(deal.endDate), 'MMMM d, yyyy')}</p>
                      <p className={`text-xs ${isExpired(deal) ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                        {isExpired(deal) ? 'Expired' : isExpiringSoon(deal) ? 
                          `Expires soon (${getExpirationText(deal)})` : 
                          `Expires ${formatDistanceToNow(new Date(deal.endDate), { addSuffix: true })}`}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Redemption status section */}
                <div className="bg-card rounded-lg p-4 sm:p-5 border shadow-sm">
                  <h3 className="font-medium mb-3 text-sm sm:text-base">Redemption Status</h3>
                  <div className="space-y-2">
                    {redemptionStatus.hasRedeemed ? (
                      <>
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs sm:text-sm font-medium">You have already redeemed this deal</span>
                        </div>
                        
                        {/* When the user has redeemed the deal at least once */}
                        {redemptionStatus.maxRedemptionsPerUser !== null && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {redemptionStatus.maxRedemptionsPerUser > 0 && redemptionStatus.redemptionCount >= redemptionStatus.maxRedemptionsPerUser ? (
                              <p className="text-amber-600">You've reached the maximum number of redemptions on this deal.</p>
                            ) : (
                              <>
                                <p>You can redeem this deal {redemptionStatus.maxRedemptionsPerUser - redemptionStatus.redemptionCount} more {(redemptionStatus.maxRedemptionsPerUser - redemptionStatus.redemptionCount) === 1 ? 'time' : 'times'}</p>
                                <p className="mt-1">({redemptionStatus.redemptionCount} of {redemptionStatus.maxRedemptionsPerUser} redemptions used)</p>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-primary" />
                          <span className="text-xs sm:text-sm">You haven't redeemed this deal yet</span>
                        </div>
                        
                        {/* When the user hasn't redeemed the deal yet */}
                        {redemptionStatus.maxRedemptionsPerUser !== null && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <p>You can redeem this deal {redemptionStatus.maxRedemptionsPerUser} {redemptionStatus.maxRedemptionsPerUser === 1 ? 'time' : 'times'}</p>
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* If the deal has reached total limit, show this warning regardless of personal redemptions */}
                    {deal.redemptionCount !== undefined && deal.totalRedemptionsLimit !== undefined && 
                     deal.totalRedemptionsLimit > 0 && deal.redemptionCount >= deal.totalRedemptionsLimit && (
                      <div className="mt-2 text-xs text-amber-600">
                        <p>This deal has reached its maximum redemption limit.</p>
                      </div>
                    )}
                  </div>
                </div>

                {deal.terms && (
                  <div className="bg-card rounded-lg p-4 sm:p-5 border shadow-sm">
                    <h3 className="font-medium mb-3 text-sm sm:text-base">Terms & Conditions</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-line">
                      {deal.terms}
                    </p>
                  </div>
                )}
                
                {/* Add Redeem Now button to details tab */}
                <div className="mt-6 flex flex-col items-center">
                  {isExpired(deal) ? (
                    <Button 
                      className="w-full max-w-xs"
                      variant="outline"
                      disabled
                    >
                      Deal Expired
                    </Button>
                  ) : redemptionStatus.hasRedeemed && redemptionStatus.redemptionCount >= (redemptionStatus.maxRedemptionsPerUser || 1) ? (
                    <Button 
                      className="w-full max-w-xs"
                      variant="outline"
                      disabled
                    >
                      Redeemed
                    </Button>
                  ) : (deal.redemptionCount !== undefined && deal.totalRedemptionsLimit !== undefined && 
                      deal.totalRedemptionsLimit > 0 && deal.redemptionCount >= deal.totalRedemptionsLimit) ? (
                    <Button 
                      className="w-full max-w-xs"
                      variant="outline"
                      disabled
                    >
                      No More Redemptions Available
                    </Button>
                  ) : (
                    <Button 
                      className="bg-[#00796B] hover:bg-[#00695C] w-full max-w-xs"
                      onClick={() => setShowRedemptionDialog(true)}
                    >
                      Redeem Now
                    </Button>
                  )}
                  
                  <div className="mt-4 text-xs sm:text-sm text-muted-foreground">
                    <h4 className="font-medium mb-1">Additional instructions:</h4>
                    <p>Please inform the vendor you have a Pinnity coupon before asking for the bill</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="redeem" className="mt-6 pb-4">
                <div className="bg-card rounded-lg p-4 sm:p-6 border shadow-sm">
                  <div className="text-center mb-5 sm:mb-6">
                    <div className="bg-primary/10 inline-flex p-2 sm:p-3 rounded-full mb-2 sm:mb-3">
                      <Award className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-medium mb-1">How to redeem this deal</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Follow these simple steps to claim your offer
                    </p>
                  </div>

                  <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="bg-primary text-primary-foreground w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium text-sm sm:text-base">Visit {deal.business.businessName}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Go to the business location during operating hours
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="bg-primary text-primary-foreground w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium text-sm sm:text-base">Get the redemption code from staff</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          The business staff will provide you with the deal's redemption code
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="bg-primary text-primary-foreground w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium text-sm sm:text-base">Enter the redemption code</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Enter the code provided by the staff to confirm your redemption
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col items-center">
                    {isExpired(deal) ? (
                      <Button 
                        className="w-full max-w-xs"
                        variant="outline"
                        disabled
                      >
                        Deal Expired
                      </Button>
                    ) : redemptionStatus.hasRedeemed && redemptionStatus.redemptionCount >= (redemptionStatus.maxRedemptionsPerUser || 1) ? (
                      <Button 
                        className="w-full max-w-xs"
                        variant="outline"
                        disabled
                      >
                        Redeemed
                      </Button>
                    ) : (deal.redemptionCount !== undefined && deal.totalRedemptionsLimit !== undefined && 
                        deal.totalRedemptionsLimit > 0 && deal.redemptionCount >= deal.totalRedemptionsLimit) ? (
                      <Button 
                        className="w-full max-w-xs"
                        variant="outline"
                        disabled
                      >
                        No More Redemptions Available
                      </Button>
                    ) : (
                      <Button 
                        className="bg-[#00796B] hover:bg-[#00695C] w-full max-w-xs"
                        onClick={() => setShowRedemptionDialog(true)}
                      >
                        Redeem Now
                      </Button>
                    )}
                    
                    <div className="mt-4 text-xs sm:text-sm text-muted-foreground">
                      <h4 className="font-medium mb-1">Additional instructions:</h4>
                      <p>Please inform the vendor you have a Pinnity coupon before asking for the bill</p>
                    </div>
                    
                    {/* Display redemption status information in the redeem tab too */}
                    {redemptionStatus.hasRedeemed && (
                      <div className="mt-4 flex flex-col items-center">
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <CheckCircle className="h-4 w-4" />
                          <span className="font-medium">You have already redeemed this deal</span>
                        </div>
                        
                        {/* Show remaining redemptions if applicable */}
                        {redemptionStatus.maxRedemptionsPerUser !== null && 
                         redemptionStatus.maxRedemptionsPerUser > 1 && 
                         redemptionStatus.redemptionCount < redemptionStatus.maxRedemptionsPerUser && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <p>You can redeem this deal {redemptionStatus.maxRedemptionsPerUser - redemptionStatus.redemptionCount} more {(redemptionStatus.maxRedemptionsPerUser - redemptionStatus.redemptionCount) === 1 ? 'time' : 'times'}</p>
                          </div>
                        )}
                        
                        {/* Show max redemptions reached message */}
                        {redemptionStatus.maxRedemptionsPerUser !== null && 
                         redemptionStatus.redemptionCount >= redemptionStatus.maxRedemptionsPerUser && (
                          <div className="mt-1 text-xs text-amber-600">
                            <p>You've reached the maximum number of redemptions on this deal.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Redemption dialog */}
            {showRedemptionDialog && (
              <RedemptionDialog
                isOpen={showRedemptionDialog}
                onClose={() => setShowRedemptionDialog(false)}
                dealId={deal.id}
                dealTitle={deal.title}
                businessName={deal.business.businessName}
                onRedeemSuccess={handleRedemptionSuccess}
              />
            )}
          </>
        ) : (
          <div className="text-center p-6">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold mb-1">Deal Not Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              We couldn't find details for this deal. It may have expired or been removed.
            </p>
            <Button variant="outline" onClick={onClose}>Go Back</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DealDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-16 bg-muted rounded"></div>
      <div className="h-8 w-3/4 bg-muted rounded"></div>
      <div className="h-4 w-1/2 bg-muted rounded"></div>
      
      <div className="h-10 bg-muted rounded"></div>
      
      <div className="aspect-video bg-muted rounded"></div>
      
      <div className="space-y-2">
        <div className="h-5 w-32 bg-muted rounded"></div>
        <div className="h-20 bg-muted rounded"></div>
      </div>
      
      <div className="space-y-2">
        <div className="h-5 w-40 bg-muted rounded"></div>
        <div className="h-4 w-full bg-muted rounded"></div>
        <div className="h-4 w-full bg-muted rounded"></div>
        <div className="h-4 w-3/4 bg-muted rounded"></div>
      </div>
    </div>
  );
}