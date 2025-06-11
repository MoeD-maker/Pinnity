import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import RedemptionDialog from '@/components/dashboard/RedemptionDialog';
import DealAvailabilityBadge from '@/components/shared/DealAvailabilityBadge';

// UI components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { 
  Heart, 
  Share2, 
  Calendar, 
  Map, 
  Info, 
  Tag, 
  ArrowLeft, 
  QrCode, 
  Sparkles,
  Clock,
  Star,
  ExternalLink,
  ChevronLeft
} from "lucide-react";

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const dealId = parseInt(id);
  const { toast } = useToast();
  const { user } = useAuth();
  const [showRedemptionDialog, setShowRedemptionDialog] = useState(false);
  
  // Fetch the deal details
  const { data: deal, isLoading, error } = useQuery({
    queryKey: ['/api/v1/deals', dealId],
    queryFn: async () => {
      try {
        return await apiRequest(`/api/v1/deals/${dealId}`);
      } catch (error) {
        console.error('Error fetching deal details:', error);
        throw error;
      }
    },
    enabled: !isNaN(dealId)
  });

  // Add to favorites mutation
  const addToFavorites = useMutation({
    mutationFn: async () => {
      const userId = user?.userId;
      if (!userId) throw new Error('User not authenticated');
      
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
      queryClient.invalidateQueries({ queryKey: ['/api/v1/user', user?.userId, 'favorites'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save this deal',
        variant: 'destructive',
      });
    },
  });

  // Remove from favorites mutation
  const removeFromFavorites = useMutation({
    mutationFn: async () => {
      const userId = user?.userId;
      if (!userId) throw new Error('User not authenticated');
      
      return apiRequest(`/api/v1/user/${userId}/favorites/${dealId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Deal removed',
        description: 'This deal has been removed from your favorites',
      });
      
      // Invalidate favorites query
      queryClient.invalidateQueries({ queryKey: ['/api/v1/user', user?.userId, 'favorites'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to remove this deal',
        variant: 'destructive',
      });
    },
  });

  // Fetch user's favorites to check if this deal is favorited
  const { data: favorites } = useQuery({
    queryKey: ['/api/v1/user', user?.userId, 'favorites'],
    queryFn: async () => {
      if (!user?.userId) return [];
      return apiRequest(`/api/v1/user/${user.userId}/favorites`);
    },
    enabled: !!user?.userId
  });

  // Check if the deal is in favorites
  const isFavorited = favorites?.some((fav: any) => fav.dealId === dealId);

  // Handle toggling favorite
  const handleToggleFavorite = () => {
    if (isFavorited) {
      removeFromFavorites.mutate();
    } else {
      addToFavorites.mutate();
    }
  };

  // Handle sharing
  const handleShare = () => {
    // Use Web Share API if available
    if (navigator.share) {
      navigator.share({
        title: deal?.title,
        text: deal?.description,
        url: window.location.href,
      }).catch(error => {
        console.error('Error sharing:', error);
      });
    } else {
      // Fallback for desktop browsers
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast({
          title: 'Link copied',
          description: 'Deal link copied to clipboard',
        });
      });
    }
  };

  // Check if the deal is expired
  const isExpired = deal?.endDate ? new Date(deal.endDate) < new Date() : false;

  // Go back to previous page
  const handleGoBack = () => {
    // Try to use browser's history to go back
    if (window.history.length > 2) {
      window.history.back();
    } else {
      // Fallback to explore page if no history is available
      setLocation('/explore');
    }
  };

  // Format date nicely
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-4 mt-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-64 bg-muted rounded"></div>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="container max-w-4xl mx-auto p-4 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Deal</CardTitle>
            <CardDescription>
              We couldn't load the details for this deal. It may have been removed or there was a connection issue.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleGoBack}>Go Back</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 pb-24">
      {/* Back button (mobile-friendly) */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleGoBack}
        className="mb-4 pl-2"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <Card className="overflow-hidden">
        {/* Deal image */}
        <div className="relative aspect-video w-full overflow-hidden">
          <img 
            src={deal.imageUrl || "https://images.unsplash.com/photo-1556742111-a301076d9d18?ixlib=rb-4.0.3"} 
            alt={deal.title}
            className="w-full h-full object-cover"
          />
          
          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={handleToggleFavorite} 
              className="h-9 w-9 bg-white/80 backdrop-blur-sm rounded-full shadow-md"
            >
              <Heart className={`h-5 w-5 ${isFavorited ? 'fill-primary text-primary' : ''}`} />
            </Button>
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={handleShare} 
              className="h-9 w-9 bg-white/80 backdrop-blur-sm rounded-full shadow-md"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Status badges */}
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {deal.category && (
              <Badge className="bg-primary/70 backdrop-blur-sm text-white shadow-md">
                {deal.category}
              </Badge>
            )}
            {deal.featured && (
              <Badge className="bg-primary/70 backdrop-blur-sm text-white flex items-center gap-1 shadow-md">
                <Sparkles className="h-3 w-3" />
                Featured
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="backdrop-blur-sm shadow-md">
                <Clock className="h-3 w-3 mr-1" />
                Expired
              </Badge>
            )}
          </div>
          
          {/* Deal Availability Badge for recurring deals */}
          <DealAvailabilityBadge 
            isRecurring={deal.isRecurring} 
            availability={deal.availability}
            variant="featured"
          />
        </div>

        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl md:text-3xl">{deal.title}</CardTitle>
              <CardDescription className="text-base mt-1">
                {deal.business?.businessName && deal.business.businessName}
              </CardDescription>
            </div>
            {deal.discount && (
              <Badge className="text-lg px-3 py-1.5 bg-primary text-white flex-shrink-0">
                {deal.discount}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Dates section */}
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            {deal.startDate && deal.endDate ? (
              <span>
                Valid from {formatDate(deal.startDate)} to {formatDate(deal.endDate)}
              </span>
            ) : (
              <span>No date information available</span>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-medium mb-2">About this deal</h3>
            <p className="text-gray-700">{deal.description}</p>
          </div>

          {/* Terms & Conditions */}
          {deal.terms && (
            <div>
              <h3 className="text-lg font-medium mb-2">Terms & Conditions</h3>
              <div className="bg-muted/50 rounded-md p-4 text-sm">
                <p className="whitespace-pre-line">{deal.terms}</p>
              </div>
            </div>
          )}

          {/* Business info (if available) */}
          {deal.business && (
            <div className="pt-4">
              <Separator className="mb-4" />
              <h3 className="text-lg font-medium mb-3">About the business</h3>
              
              <div className="flex flex-col md:flex-row gap-4">
                {/* Business details */}
                <div className="flex-1 space-y-3">
                  <p className="font-medium">{deal.business.businessName}</p>
                  {deal.business.businessCategory && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Tag className="h-4 w-4 mr-2" />
                      <span>{deal.business.businessCategory}</span>
                    </div>
                  )}
                  {deal.business.businessAddress && (
                    <div className="flex items-start text-sm text-muted-foreground">
                      <Map className="h-4 w-4 mr-2 mt-1" />
                      <span className="whitespace-pre-line">{deal.business.businessAddress}</span>
                    </div>
                  )}
                </div>
                
                {/* Ratings summary (if implemented) */}
                {deal.business.avgRating && (
                  <div className="flex-shrink-0 border rounded-md p-3 text-center w-full md:w-auto">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xl font-bold">{deal.business.avgRating.toFixed(1)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {deal.business.ratingCount || 0} ratings
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between border-t p-6">
          {/* Could redirect to business view */}
          <Button variant="outline" onClick={() => deal.business?.id && setLocation(`/businesses/${deal.business.id}`)}>
            View Business
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          
          {/* Redemption button */}
          <Button 
            disabled={isExpired} 
            onClick={() => setShowRedemptionDialog(true)}
            className="w-full sm:w-auto"
          >
            {isExpired ? 'Deal Expired' : 'Redeem Deal'}
            {!isExpired && <QrCode className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>

      {/* Redemption dialog using the consistent component */}
      <RedemptionDialog
        isOpen={showRedemptionDialog}
        onClose={() => setShowRedemptionDialog(false)}
        dealId={dealId}
        dealTitle={deal.title}
        businessName={deal.business?.businessName || ""}
        onRedeemSuccess={() => {
          // Refresh deal data after successful redemption
          queryClient.invalidateQueries({ queryKey: ['/api/v1/deals', dealId] });
        }}
      />
    </div>
  );
}