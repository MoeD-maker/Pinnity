import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RatingData, RedemptionRating } from '@shared/schema';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Define proper types for our rating queries
export interface UserRatingItem extends RedemptionRating {
  deal: {
    title: string;
    description: string;
    [key: string]: any;
  };
  business: {
    businessName: string;
    [key: string]: any;
  };
  user?: {
    firstName: string;
    lastName: string;
    [key: string]: any;
  };
}

export interface BusinessRatingSummary {
  averageRating: number;
  totalRatings: number;
  ratingCounts: Record<number, number>;
}

export function useCreateRating() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ redemptionId, data }: { redemptionId: number; data: RatingData }) => {
      return await apiRequest(`/api/v1/redemptions/${redemptionId}/ratings`, {
        method: 'POST',
        data: data,
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/v1/user'] });
      
      toast({
        title: 'Thank you for your feedback!',
        description: 'Your rating has been submitted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to submit rating',
        description: error.message || 'Something went wrong. Please try again.',
      });
    },
  });
}

export function useUserRatings(userId: number) {
  return useQuery<UserRatingItem[]>({
    queryKey: ['/api/v1/user', userId, 'ratings'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });
}

export function useBusinessRatings(businessId: number) {
  return useQuery<UserRatingItem[]>({
    queryKey: ['/api/v1/business', businessId, 'ratings'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!businessId,
  });
}

export function useBusinessRatingSummary(businessId: number) {
  return useQuery<BusinessRatingSummary>({
    queryKey: ['/api/v1/business', businessId, 'ratings', 'summary'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!businessId,
  });
}