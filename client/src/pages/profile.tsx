import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@/components/icons/user';

export default function ProfilePage() {
  // For demo purposes, hardcoded user ID
  const userId = 1;
  
  // Fetch user data
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['/api/user', userId],
    queryFn: async () => {
      const response = await apiRequest(`/api/user/${userId}`);
      return response;
    },
  });

  // Fetch user notification preferences
  const { data: preferences, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ['/api/user', userId, 'notification-preferences'],
    queryFn: async () => {
      const response = await apiRequest(`/api/user/${userId}/notification-preferences`);
      return response;
    },
  });

  // Fetch user redemptions
  const { data: redemptions, isLoading: isLoadingRedemptions } = useQuery({
    queryKey: ['/api/user', userId, 'redemptions'],
    queryFn: async () => {
      const response = await apiRequest(`/api/user/${userId}/redemptions`);
      return response;
    },
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
                  {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
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
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive emails about deal updates</p>
                </div>
                <Switch 
                  id="email-notifications" 
                  checked={preferences?.emailNotifications} 
                  disabled
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                </div>
                <Switch 
                  id="push-notifications" 
                  checked={preferences?.pushNotifications} 
                  disabled
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="deal-alerts">Deal Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified about new deals in your area</p>
                </div>
                <Switch 
                  id="deal-alerts" 
                  checked={preferences?.dealAlerts} 
                  disabled
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="newsletter">Weekly Newsletter</Label>
                  <p className="text-sm text-muted-foreground">Receive our weekly newsletter</p>
                </div>
                <Switch 
                  id="newsletter" 
                  checked={preferences?.weeklyNewsletter} 
                  disabled
                />
              </div>
            </div>
            
            <div className="mt-6">
              <Button variant="outline">Update Preferences</Button>
            </div>
          </CardContent>
        </Card>
        
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
                        {redemption.deal.business.businessName} • {new Date(redemption.redemptionDate).toLocaleDateString()}
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