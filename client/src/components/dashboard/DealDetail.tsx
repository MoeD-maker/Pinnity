import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, Calendar, Phone, Globe, Clock, Share2, Heart, Award, AlertCircle, CheckCircle } from 'lucide-react';
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
  const [enteredCode, setEnteredCode] = useState<string>("");
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error' | 'pending'>('idle');
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

  // Handle Code input change
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEnteredCode(e.target.value);
    // Reset verification status when code changes
    if (verificationStatus !== 'idle') {
      setVerificationStatus('idle');
    }
  };

  // Verify redemption code mutation
  const verifyCode = useMutation({
    mutationFn: async () => {
      // For demonstration purposes only - in a real app, get userId from auth context
      const userId = 1;
      
      return apiRequest(`/api/deals/${dealId}/verify-code`, {
        method: 'POST',
        data: { code: enteredCode }
      });
    },
    onSuccess: (response) => {
      if (response.valid) {
        setVerificationStatus('success');
        toast({
          title: 'Code verified',
          description: 'Deal redemption successful!',
        });
        
        // Create redemption
        redeemDeal.mutate();
      } else {
        setVerificationStatus('error');
        toast({
          title: 'Invalid Code',
          description: 'The code you entered is incorrect. Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      setVerificationStatus('error');
      toast({
        title: 'Verification failed',
        description: 'Failed to verify the code. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Redeem deal mutation - only called after code verification
  const redeemDeal = useMutation({
    mutationFn: async () => {
      // For demonstration purposes only - in a real app, get userId from auth context
      const userId = 1;
      
      return apiRequest(`/api/user/${userId}/redemptions`, {
        method: 'POST',
        data: { dealId }
      });
    },
    onSuccess: (data) => {
      // Show redemption success
      toast({
        title: 'Deal redeemed successfully!',
        description: 'Your redemption has been recorded',
      });
      
      // Invalidate redemptions query
      queryClient.invalidateQueries({ queryKey: ['/api/user/redemptions'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to record the redemption',
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
      <DialogContent className="w-[calc(100%-24px)] max-h-[90vh] overflow-y-auto mx-auto sm:max-w-[600px] p-3 sm:p-6">
        {isLoading ? (
          <DealDetailSkeleton />
        ) : deal ? (
          <>
            {/* Add close class with right margin to prevent overlap */}
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => addToFavorites.mutate()} 
                className="h-7 w-7 sm:h-8 sm:w-8 bg-white rounded-full"
              >
                <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
            
            <DialogHeader>
              <div className="flex justify-between items-center mb-2">
                <Badge className="text-xs sm:text-sm">{deal.category}</Badge>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleShare} 
                  className="h-7 w-7 sm:h-8 sm:w-8"
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
              <DialogTitle className="text-xl sm:text-2xl">{deal.title}</DialogTitle>
              <DialogDescription className="text-sm sm:text-base font-medium">
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
                <div className="aspect-video rounded-lg overflow-hidden mb-6">
                  <img 
                    src={deal.imageUrl || 'https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3'} 
                    alt={deal.title}
                    className="w-full h-full object-cover"
                  />
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
                      <p className="text-xs text-muted-foreground">
                        Expires {formatDistanceToNow(new Date(deal.endDate), { addSuffix: true })}
                      </p>
                    </div>
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
                        <h4 className="font-medium text-sm sm:text-base">Enter the code below to redeem</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Enter the code provided by the staff to confirm your redemption
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-6 sm:mt-8 p-4 sm:p-6 border-2 rounded-lg 
                    ${verificationStatus === 'success' 
                     ? 'bg-green-50 border-green-200' 
                     : verificationStatus === 'error' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-primary/5'} 
                    flex flex-col items-center`}>
                    <p className="text-sm font-medium uppercase text-muted-foreground tracking-wide mb-3">
                      {verificationStatus === 'success' 
                        ? 'Redemption Successful!' 
                        : 'Enter Redemption Code'}
                    </p>
                    
                    {verificationStatus === 'success' ? (
                      <div className="flex flex-col items-center">
                        <div className="bg-green-100 p-2 sm:p-3 rounded-full mb-3">
                          <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                        </div>
                        <p className="text-center text-xs sm:text-sm text-green-700 mb-2">
                          Your deal has been successfully redeemed!
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0 mb-3 sm:mb-4 items-center">
                          <input 
                            type="text" 
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="Enter Code"
                            value={enteredCode}
                            onChange={handleCodeChange}
                            className={`border rounded-md px-3 py-2 text-center font-mono text-base sm:text-lg tracking-wider w-full sm:w-40 max-w-[200px]
                              ${verificationStatus === 'error' 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                                : 'border-input focus:border-primary focus:ring-primary'}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              setVerificationStatus('pending');
                              verifyCode.mutate();
                            }}
                            disabled={verifyCode.isPending || !enteredCode || enteredCode.length < 4}
                            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm"
                          >
                            {verifyCode.isPending ? 'Verifying...' : 'Verify Code'}
                          </Button>
                        </div>
                        
                        {verificationStatus === 'error' && (
                          <div className="mb-2 sm:mb-3 flex items-center space-x-1.5 sm:space-x-2 text-red-600">
                            <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="text-xs">Invalid code. Please try again.</span>
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          The business staff will provide you with this code when you visit
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              {step === 'details' ? (
                <Button 
                  className="w-full text-sm sm:text-base py-1.5 sm:py-2" 
                  onClick={() => setStep('redeem')}
                >
                  Redeem This Deal
                </Button>
              ) : verificationStatus === 'success' ? (
                <Button 
                  variant="outline"
                  className="w-full text-sm sm:text-base py-1.5 sm:py-2" 
                  onClick={onClose}
                >
                  Close
                </Button>
              ) : (
                <Button 
                  className="w-full text-sm sm:text-base py-1.5 sm:py-2" 
                  onClick={() => {
                    setVerificationStatus('pending');
                    verifyCode.mutate();
                  }}
                  disabled={verifyCode.isPending || !enteredCode || enteredCode.length < 4 || verificationStatus === 'pending'}
                >
                  {verifyCode.isPending ? 'Verifying Code...' : 'Verify Redemption Code'}
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <div className="text-center py-4 sm:py-6">
            <p className="text-sm sm:text-base">Could not load deal details. Please try again.</p>
            <Button variant="outline" onClick={onClose} className="mt-3 sm:mt-4 text-xs sm:text-sm py-1.5 sm:py-2">
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
          <Skeleton className="h-4 sm:h-5 w-16 sm:w-20" />
          <div className="flex gap-1.5 sm:gap-2">
            <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded" />
            <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded" />
          </div>
        </div>
        <Skeleton className="h-6 sm:h-8 w-3/4 mb-2" />
        <Skeleton className="h-3 sm:h-4 w-1/2" />
      </DialogHeader>

      <Skeleton className="aspect-video w-full rounded-lg mb-4" />
      
      <div className="space-y-3 sm:space-y-4">
        <Skeleton className="h-8 sm:h-10 w-full" />
        <Skeleton className="h-3 sm:h-4 w-full" />
        <Skeleton className="h-3 sm:h-4 w-full" />
        <Skeleton className="h-3 sm:h-4 w-3/4" />
        
        <div className="pt-3 sm:pt-4">
          <Skeleton className="h-4 sm:h-5 w-32 sm:w-40 mb-2" />
          <Skeleton className="h-3 sm:h-4 w-full" />
          <Skeleton className="h-3 sm:h-4 w-full mt-1" />
          <Skeleton className="h-3 sm:h-4 w-1/2 mt-1" />
        </div>
      </div>
      
      <div className="mt-4 sm:mt-6">
        <Skeleton className="h-8 sm:h-10 w-full" />
      </div>
    </>
  );
}