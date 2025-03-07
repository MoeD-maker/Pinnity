import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DealGrid } from '@/components/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { getExpiringSoonDeals, checkAndNotifyExpiringSoonDeals, requestNotificationPermission } from '@/utils/dealReminders';
import ExpiringDealsNotification from '@/components/deals/ExpiringDealsNotification';

export default function FavoritesPage() {
  // For demonstration purposes, hardcoded user ID
  const userId = 1;
  
  // Fetch user favorites
  const { data: favorites, isLoading } = useQuery({
    queryKey: ['/api/user', userId, 'favorites'],
    queryFn: async () => {
      const response = await apiRequest(`/api/user/${userId}/favorites`);
      return response;
    },
  });

  return (
    <div className="container max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Your Saved Deals</h1>
        <p className="text-muted-foreground">Deals you've saved for later</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="h-40 bg-muted animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : favorites?.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No saved deals yet</h3>
          <p className="text-muted-foreground">
            Explore deals and click the heart icon to save them for later
          </p>
        </div>
      ) : (
        <DealGrid
          deals={favorites?.map((fav: any) => fav.deal) || []}
          isLoading={isLoading}
          onSelect={(dealId) => console.log('Selected deal', dealId)}
        />
      )}
    </div>
  );
}