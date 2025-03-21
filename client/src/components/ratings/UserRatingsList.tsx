import React from 'react';
import { useUserRatings } from '@/hooks/use-ratings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface UserRatingsListProps {
  userId: number | undefined;
}

export default function UserRatingsList({ userId }: UserRatingsListProps) {
  const { data: ratings, isLoading, error } = useUserRatings(userId);

  if (isLoading) {
    return <UserRatingsListSkeleton />;
  }

  if (error) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Ratings</CardTitle>
          <CardDescription>History of deals you've rated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-red-500">
            Failed to load ratings. Please try again later.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ratings || ratings.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Ratings</CardTitle>
          <CardDescription>History of deals you've rated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            You haven't rated any deals yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Your Ratings</CardTitle>
        <CardDescription>History of deals you've rated</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ratings.map((rating) => (
            <div key={rating.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{rating.deal.title}</h4>
                  <p className="text-sm text-muted-foreground">{rating.business.businessName}</p>
                </div>
                <div className="flex items-center">
                  {rating.anonymous && (
                    <Badge variant="outline" className="mr-2">
                      Anonymous
                    </Badge>
                  )}
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
      </CardContent>
    </Card>
  );
}

function UserRatingsListSkeleton() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Your Ratings</CardTitle>
        <CardDescription>History of deals you've rated</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="w-3/5">
                  <Skeleton className="h-5 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <div>
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="mt-2">
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="mt-2">
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}