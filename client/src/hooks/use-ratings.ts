import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RatingData } from '@shared/schema';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useCreateRating() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ redemptionId, data }: { redemptionId: number; data: RatingData }) => {
      return await apiRequest(`/api/redemptions/${redemptionId}/ratings`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
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
  return useQuery({
    queryKey: ['/api/user', userId, 'ratings'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!userId,
  });
}

export function useBusinessRatings(businessId: number) {
  return useQuery({
    queryKey: ['/api/business', businessId, 'ratings'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!businessId,
  });
}

export function useBusinessRatingSummary(businessId: number) {
  return useQuery({
    queryKey: ['/api/business', businessId, 'ratings', 'summary'],
    queryFn: getQueryFn({ on401: 'returnNull' }),
    enabled: !!businessId,
  });
}