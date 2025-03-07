import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Star } from 'lucide-react';
import RatingDialog from '@/components/ui/RatingDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';

interface Redemption {
  id: number;
  status: string;
  hasRating: boolean;
  deal: {
    id: number;
    title: string;
    business: {
      businessName: string;
    };
  };
}

interface RecentRedemptionsRatingPromptProps {
  userId: number;
}

export default function RecentRedemptionsRatingPrompt({ userId }: RecentRedemptionsRatingPromptProps) {
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user's recent redemptions
  const { data: redemptions, isLoading } = useQuery<Redemption[]>({
    queryKey: ['/api/user', userId, 'redemptions'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });

  // Get only unrated redemptions
  const unratedRedemptions = redemptions && Array.isArray(redemptions) 
    ? redemptions.filter((redemption: Redemption) => {
        // Check if this redemption doesn't have a rating yet
        return redemption.status === 'redeemed' && !redemption.hasRating;
      })
    : [];

  const handleRateClick = (redemption: Redemption) => {
    setSelectedRedemption(redemption);
    setIsRatingDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rate Your Recent Experiences</CardTitle>
          <CardDescription>Share your feedback on deals you've redeemed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse space-y-3">
              <div className="h-5 bg-gray-200 rounded w-3/4 mx-auto"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              <div className="h-10 bg-gray-200 rounded w-1/3 mx-auto mt-3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!unratedRedemptions || unratedRedemptions.length === 0) {
    return null; // Don't show the component if there are no unrated redemptions
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2 text-primary" />
            Rate Your Recent Experiences
          </CardTitle>
          <CardDescription>Your feedback helps improve local businesses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {unratedRedemptions.map((redemption: Redemption) => (
              <div key={redemption.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">{redemption.deal.title}</h4>
                    <p className="text-sm text-muted-foreground">{redemption.deal.business.businessName}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleRateClick(redemption)}
                    className="text-sm"
                  >
                    <Star className="h-4 w-4 mr-1" /> Rate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedRedemption && (
        <RatingDialog
          isOpen={isRatingDialogOpen}
          onClose={() => {
            setIsRatingDialogOpen(false);
            setSelectedRedemption(null);
          }}
          redemptionId={selectedRedemption.id}
          dealTitle={selectedRedemption.deal.title}
          businessName={selectedRedemption.deal.business.businessName}
        />
      )}
    </>
  );
}