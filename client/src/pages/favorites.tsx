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
  
  // State for notification banner
  const [showExpiringNotification, setShowExpiringNotification] = useState(true);
  const [expiringDeals, setExpiringDeals] = useState<any[]>([]);
  
  // Fetch user favorites
  const { data: favorites, isLoading } = useQuery({
    queryKey: ['/api/user', userId, 'favorites'],
    queryFn: async () => {
      const response = await apiRequest(`/api/user/${userId}/favorites`);
      return response;
    },
  });

  // Check for expiring deals when favorites are loaded
  useEffect(() => {
    if (favorites && favorites.length > 0) {
      const deals = favorites.map((fav: any) => fav.deal);
      const expiringSoon = getExpiringSoonDeals(deals);
      setExpiringDeals(expiringSoon);
      
      // Request notification permission if there are expiring deals
      if (expiringSoon.length > 0) {
        requestNotificationPermission().then(permission => {
          if (permission === 'granted') {
            // Check and send notifications for expiring deals
            checkAndNotifyExpiringSoonDeals(expiringSoon, true);
          }
        });
      }
    }
  }, [favorites]);

  // Handler for selecting a deal
  const handleSelectDeal = (dealId: number) => {
    console.log('Selected deal', dealId);
    // In a real app, navigate to the deal details page
    // navigate(`/deals/${dealId}`);
  };

  return (
    <div className="container max-w-7xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">Your Saved Deals</h1>
        <p className="text-muted-foreground">Deals you've saved for later</p>
      </div>

      {/* Expiring Deals Notification Banner */}
      {showExpiringNotification && expiringDeals.length > 0 && (
        <div className="mb-6">
          <ExpiringDealsNotification 
            deals={expiringDeals}
            onClose={() => setShowExpiringNotification(false)}
            onViewAll={() => {
              // Scroll to the first expiring deal or handle as needed
              console.log('View all expiring deals');
            }}
          />
        </div>
      )}

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
          onSelect={handleSelectDeal}
        />
      )}
    </div>
  );
}