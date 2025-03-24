import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Bell, Shield, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import PasswordChangeForm from '@/components/profile/PasswordChangeForm';
import EditProfileDialog from '@/components/profile/EditProfileDialog';
import UserRatingsList from '@/components/ratings/UserRatingsList';
import RecentRedemptionsRatingPrompt from '@/components/ratings/RecentRedemptionsRatingPrompt';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  // Get the authenticated user ID from AuthContext
  const { user: authUser } = useAuth();
  const { toast } = useToast();
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
      try {
        const response = await apiRequest(`/api/v1/user/${userId}/notification-preferences`);
        return response;
      } catch (error: any) {
        // If no preferences exist yet, return default preferences
        if (error.status === 404) {
          return {
            emailNotifications: false,
            pushNotifications: false,
            dealAlerts: false,
            weeklyNewsletter: false
          };
        }
        throw error;
      }
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

  // Mutation for updating notification preferences
  const { mutate: updatePreferences, isPending } = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/v1/user/${userId}/notification-preferences`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings updated',
        description: 'Your preferences have been saved successfully.',
        duration: 3000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/user', userId, 'notification-preferences'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
    },
  });

  const handleToggleChange = (field: string, value: boolean) => {
    if (!preferences) return;
    
    updatePreferences({
      ...preferences,
      [field]: value,
    });
  };

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
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Personal Information
            </CardTitle>
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
              {userId && user && (
                <EditProfileDialog
                  userId={userId}
                  user={user}
                  trigger={<Button variant="outline">Edit Profile</Button>}
                />
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Notification Settings - Now directly on profile page */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch 
                  id="email-notifications" 
                  checked={preferences?.emailNotifications ?? false}
                  onCheckedChange={(checked) => handleToggleChange('emailNotifications', checked)}
                  disabled={isPending || isLoadingPreferences}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch 
                  id="push-notifications" 
                  checked={preferences?.pushNotifications ?? false}
                  onCheckedChange={(checked) => handleToggleChange('pushNotifications', checked)}
                  disabled={isPending || isLoadingPreferences}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="deal-alerts">Deal Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about new deals in your area
                  </p>
                </div>
                <Switch 
                  id="deal-alerts" 
                  checked={preferences?.dealAlerts ?? false}
                  onCheckedChange={(checked) => handleToggleChange('dealAlerts', checked)}
                  disabled={isPending || isLoadingPreferences}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="weekly-newsletter">Weekly Newsletter</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive our weekly newsletter with top deals
                  </p>
                </div>
                <Switch 
                  id="weekly-newsletter" 
                  checked={preferences?.weeklyNewsletter ?? false}
                  onCheckedChange={(checked) => handleToggleChange('weeklyNewsletter', checked)}
                  disabled={isPending || isLoadingPreferences}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Privacy Settings - Simplified on profile page */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Settings
            </CardTitle>
            <CardDescription>Manage your privacy preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="location-sharing">Location Sharing</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow the app to access your location for personalized deals
                  </p>
                </div>
                <Switch 
                  id="location-sharing" 
                  checked={preferences?.locationSharing ?? true}
                  onCheckedChange={(checked) => handleToggleChange('locationSharing', checked)}
                  disabled={isPending || isLoadingPreferences}
                />
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                We value your privacy. Your data is securely stored and only used to provide you with personalized deals and services.
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* Password Change Form */}
        {userId && <PasswordChangeForm userId={userId} />}
        
        {/* Recent Redemptions Ratings Prompt */}
        {userId && <RecentRedemptionsRatingPrompt userId={userId} />}
        
        {/* User Ratings List */}
        {userId && <UserRatingsList userId={userId} />}
        
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