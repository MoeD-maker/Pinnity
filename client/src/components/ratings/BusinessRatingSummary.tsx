import React from 'react';
import { useBusinessRatingSummary, useBusinessRatings } from '@/hooks/use-ratings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BusinessRatingSummary as BusinessRatingSummaryType, UserRatingItem } from '@/hooks/use-ratings';

interface BusinessRatingSummaryProps {
  businessId: number;
}

export default function BusinessRatingSummary({ businessId }: BusinessRatingSummaryProps) {
  const { 
    data: summary, 
    isLoading: isSummaryLoading, 
    error: summaryError 
  } = useBusinessRatingSummary(businessId);
  
  const { 
    data: ratings, 
    isLoading: isRatingsLoading, 
    error: ratingsError 
  } = useBusinessRatings(businessId);
  
  const isLoading = isSummaryLoading || isRatingsLoading;
  const error = summaryError || ratingsError;

  if (isLoading) {
    return <BusinessRatingSummarySkeleton />;
  }

  if (error) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Customer Ratings</CardTitle>
          <CardDescription>See how customers are rating your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            Failed to load ratings. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || !ratings || ratings.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Customer Ratings</CardTitle>
          <CardDescription>See how customers are rating your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No ratings received yet. As customers redeem and rate your deals, their feedback will appear here.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Customer Ratings</CardTitle>
        <CardDescription>See how customers are rating your business</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Detailed Reviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="text-center mb-4 md:mb-0">
                <div className="text-6xl font-bold">{summary.averageRating.toFixed(1)}</div>
                <div className="flex justify-center mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.round(summary.averageRating)
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {summary.totalRatings} {summary.totalRatings === 1 ? 'review' : 'reviews'}
                </div>
              </div>
              
              <div className="flex-1 space-y-2 w-full">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <div key={stars} className="flex items-center">
                    <div className="w-12 text-sm font-medium">{stars} stars</div>
                    <Progress
                      value={(summary.ratingCounts[stars] || 0) / summary.totalRatings * 100}
                      className="h-2 flex-1 mx-2"
                    />
                    <div className="w-10 text-sm text-right">
                      {summary.ratingCounts[stars] || 0}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details">
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="font-semibold">
                        {rating.anonymous ? 'Anonymous User' : `${rating.user?.firstName || 'User'}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">Deal: {rating.deal?.title}</p>
                    </div>
                    <div className="flex space-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < rating.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {rating.comment && (
                    <div className="mt-2 text-sm border-t pt-2">{rating.comment}</div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Posted on {format(new Date(rating.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function BusinessRatingSummarySkeleton() {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Customer Ratings</CardTitle>
        <CardDescription>See how customers are rating your business</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="text-center mb-4 md:mb-0">
            <Skeleton className="h-16 w-16 mx-auto rounded-full" />
            <Skeleton className="h-4 w-24 mx-auto mt-2" />
            <Skeleton className="h-3 w-16 mx-auto mt-1" />
          </div>
          
          <div className="flex-1 space-y-2 w-full">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-2 flex-1 mx-2" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}