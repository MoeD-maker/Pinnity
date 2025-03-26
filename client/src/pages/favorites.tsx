import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DealGrid } from '@/components/dashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { 
  getExpiringSoonDeals, 
  checkAndNotifyExpiringSoonDeals, 
  requestNotificationPermission,
  DealLike,
  isExpired
} from '@/utils/dealReminders';
import { useAuth } from '@/contexts/AuthContext';
import ExpiringDealsNotification from '@/components/deals/ExpiringDealsNotification';

// Helper function to safely convert any favoriteS data format to an array
const normalizeFavoritesData = (data: any): any[] => {
  // Return empty array for null/undefined
  if (!data) return [];
  
  // If already an array, filter out any null/undefined items
  if (Array.isArray(data)) {
    return data.filter(item => item != null);
  }
  
  // If an object with properties, convert to array
  if (typeof data === 'object') {
    const values = Object.values(data);
    return values.filter(item => item != null);
  }
  
  // Default to empty array for any other data type
  return [];
};

export default function FavoritesPage() {
  // Get the authenticated user from the auth context
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State for notification banner and toggles
  const [showExpiringNotification, setShowExpiringNotification] = useState(true);
  const [showExpired, setShowExpired] = useState(false);
  const [expiringDeals, setExpiringDeals] = useState<DealLike[]>([]);
  
  // Fetch user favorites
  const { data: favoritesRaw, isLoading } = useQuery({
    queryKey: ['/api/v1/user', user?.id, 'favorites'],
    queryFn: async () => {
      try {
        // Use the current user's ID from the auth context
        if (!user?.id) {
          console.error('No authenticated user found');
          return [];
        }
        
        const response = await apiRequest(`/api/v1/user/${user.id}/favorites`);
        return response; // Return raw response to process with normalizeFavoritesData
      } catch (error) {
        console.error('Error fetching favorites:', error);
        return [];
      }
    },
    // Only run query when we have a user ID
    enabled: !!user?.id
  });
  
  // Create a memoized, normalized version of the favorites data
  const favorites = useMemo(() => {
    return normalizeFavoritesData(favoritesRaw);
  }, [favoritesRaw]);

  // Check for expiring deals when favorites are loaded
  useEffect(() => {
    if (favorites) {
      try {
        // Ensure favorites is an array and handle object format
        const favsArray = Array.isArray(favorites) 
          ? favorites 
          : (typeof favorites === 'object' && favorites !== null)
            ? Object.values(favorites)
            : [];
            
        // Only proceed if we have valid favorites
        if (favsArray.length > 0) {
          // Extract deals from favorites and filter out any invalid entries
          const deals = favsArray
            .filter(fav => fav && typeof fav === 'object' && fav.deal)
            .map((fav: { deal: any }) => fav.deal);
          
          // Use our own implementation of expiring soon to avoid type issues
          const isExpiringSoon = (deal: { endDate?: string | Date }) => {
            if (!deal || !deal.endDate) return false;
            
            const now = new Date();
            const endDate = new Date(deal.endDate);
            const diffMs = endDate.getTime() - now.getTime();
            const diffHrs = diffMs / (1000 * 60 * 60);
            
            // Consider a deal as expiring soon if it expires within 48 hours (from constants)
            return diffHrs > 0 && diffHrs <= 48;
          };
          
          // Get deals that are expiring soon
          const expiringSoon = deals.filter((deal: { endDate?: string | Date }) => isExpiringSoon(deal));
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
      } catch (error) {
        console.error('Error checking for expiring deals:', error);
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

      {/* Expired deals toggle */}
      {(user?.userType === 'business' || user?.userType === 'admin') && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="show-expired-favorites" 
                checked={showExpired}
                onCheckedChange={setShowExpired}
              />
              <Label htmlFor="show-expired-favorites" className="flex items-center gap-2 cursor-pointer">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Show expired deals
              </Label>
            </div>
          </CardContent>
        </Card>
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
      ) : !favorites || favorites.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No saved deals yet</h3>
          <p className="text-muted-foreground">
            Explore deals and click the heart icon to save them for later
          </p>
        </div>
      ) : (
        <DealGrid
          deals={favorites
            .filter(fav => fav && typeof fav === 'object' && fav.deal && typeof fav.deal === 'object') 
            .map((fav: { deal: any }) => fav.deal)
            .filter((deal: { endDate?: string | Date, id?: number }) => {
              // Skip invalid deals
              if (!deal || typeof deal !== 'object') return false;
              
              // Check if deal is expired with inline function to avoid type issues
              const isDealExpired = () => {
                if (!deal.endDate) return false;
                const now = new Date();
                const endDate = new Date(deal.endDate);
                return endDate < now;
              };
              
              const dealExpired = isDealExpired();
              
              // For individual users, filter out expired deals
              if (user?.userType === 'individual' && dealExpired) {
                return false;
              }
              
              // For business and admin users, show expired deals based on toggle
              if ((user?.userType === 'business' || user?.userType === 'admin') && dealExpired) {
                return showExpired;
              }
              
              return true;
            })}
          isLoading={isLoading}
          onSelect={handleSelectDeal}
        />
      )}
    </div>
  );
}