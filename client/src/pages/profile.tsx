import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { User as UserIcon } from 'lucide-react';
import PasswordChangeForm from '@/components/profile/PasswordChangeForm';
import UserRatingsList from '@/components/ratings/UserRatingsList';
import RecentRedemptionsRatingPrompt from '@/components/ratings/RecentRedemptionsRatingPrompt';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  // Get the authenticated user ID from AuthContext
  const { user: authUser } = useAuth();
  const userId = authUser?.id;
  
  // Fetch user data
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/v1/user', userId],
    queryFn: async () => {
      // Only fetch if we have a userId
      if (!userId) return null;
      const response = await apiRequest(`/api/v1/user/${userId}`);
      return response;
    },
    enabled: !!userId, // Only run query if userId exists
  });

  // Fetch user notification preferences
  const { data: preferences, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ['/api/v1/user', userId, 'notification-preferences'],
    queryFn: async () => {
      if (!userId) return null;
      const response = await apiRequest(`/api/v1/user/${userId}/notification-preferences`);
      return response;
    },
    enabled: !!userId,
  });

  // Fetch user redemptions
  const { data: redemptions, isLoading: isLoadingRedemptions } = useQuery({
    queryKey: ['/api/v1/user', userId, 'redemptions'],
    queryFn: async () => {
      if (!userId) return null;
      const response = await apiRequest(`/api/v1/user/${userId}/redemptions`);
      return response;
    },
    enabled: !!userId,
  });

  const isLoading = isLoadingUser || isLoadingPreferences || isLoadingRedemptions;

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-4">
        <div className="h-16 w-32 bg-muted animate-pulse mb-4 rounded-md" />
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <div className="h-6 w-24 bg-muted animate-pulse mb-2 rounded-md" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded-md" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div>
                  <div className="h-5 w-24 bg-muted animate-pulse mb-2 rounded-md" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="h-6 w-48 bg-muted animate-pulse mb-2 rounded-md" />
              <div className="h-4 w-64 bg-muted animate-pulse rounded-md" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-5 w-40 bg-muted animate-pulse rounded-md" />
                    <div className="h-5 w-10 bg-muted animate-pulse rounded-md" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-primary mb-6">Your Profile</h1>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Manage your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.avatarUrl || ''} alt={user?.name} />
                <AvatarFallback className="bg-primary text-white">
                  {user?.name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-medium">{user?.name}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="mt-1 text-sm">{user?.name}</div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="mt-1 text-sm">{user?.email}</div>
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <div className="mt-1 text-sm">{user?.phone || 'Not provided'}</div>
              </div>
            </div>
            
            <div className="mt-6">
              <Button variant="outline">Edit Profile</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simplified notification summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Active Notifications</h4>
                <ul className="space-y-2 text-sm">
                  {preferences?.emailNotifications && (
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      Email notifications
                    </li>
                  )}
                  {preferences?.pushNotifications && (
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      Push notifications
                    </li>
                  )}
                  {preferences?.dealAlerts && (
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      Deal alerts
                    </li>
                  )}
                  {preferences?.weeklyNewsletter && (
                    <li className="flex items-center">
                      <span className="text-green-600 mr-2">✓</span>
                      Weekly newsletter
                    </li>
                  )}
                  {!preferences?.emailNotifications && 
                   !preferences?.pushNotifications && 
                   !preferences?.dealAlerts && 
                   !preferences?.weeklyNewsletter && (
                    <li className="text-muted-foreground italic">
                      No notifications enabled
                    </li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="mt-6">
              <Link href="/settings?tab=notifications">
                <Button variant="default" className="w-full">
                  Manage Notification Settings
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Update your notification preferences in the settings page
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Password Change Form */}
        <PasswordChangeForm userId={userId} />
        
        {/* Recent Redemptions Ratings Prompt */}
        <RecentRedemptionsRatingPrompt userId={userId} />
        
        {/* User Ratings List */}
        <UserRatingsList userId={userId} />
        
        <Card>
          <CardHeader>
            <CardTitle>Deal History</CardTitle>
            <CardDescription>Your recent deal redemptions</CardDescription>
          </CardHeader>
          <CardContent>
            {redemptions && redemptions.length > 0 ? (
              <div className="space-y-4">
                {redemptions.map((redemption: any) => (
                  <div key={redemption.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{redemption.deal.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {redemption.deal.business.businessName} • {new Date(redemption.redeemedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      <span 
                        className={`px-2 py-1 rounded-full ${
                          redemption.status === 'redeemed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {redemption.status === 'redeemed' ? 'Redeemed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">You haven't redeemed any deals yet</p>
                <Button variant="outline" className="mt-4">Explore Deals</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}