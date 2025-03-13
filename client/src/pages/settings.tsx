import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Bell, Moon, Globe, Shield, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id || 1;
  
  // Fetch user notification preferences
  const { data: preferences, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ['/api/user', userId, 'notification-preferences'],
    queryFn: async () => {
      const response = await apiRequest(`/api/user/${userId}/notification-preferences`);
      return response;
    },
  });

  // Mutation for updating notification preferences
  const { mutate: updatePreferences, isPending } = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/user/${userId}/notification-preferences`, {
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
      queryClient.invalidateQueries({ queryKey: ['/api/user', userId, 'notification-preferences'] });
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

  return (
    <div className="container max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-primary mb-6">Settings</h1>
      
      <Tabs defaultValue="notifications">
        <TabsList className="mb-6">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Customize how you want to receive notifications
              </CardDescription>
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
        </TabsContent>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Appearance Settings
              </CardTitle>
              <CardDescription>
                Customize the app appearance and themes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dark-mode">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark theme
                    </p>
                  </div>
                  <Switch 
                    id="dark-mode" 
                    checked={false}
                    disabled={true}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="reduce-motion">Reduce Motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimize animations throughout the app
                    </p>
                  </div>
                  <Switch 
                    id="reduce-motion" 
                    checked={false}
                    disabled={true}
                  />
                </div>
                
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    Theme settings coming soon!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Manage how your data is used and displayed
              </CardDescription>
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
                    checked={true}
                    disabled={true}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="anonymous-ratings">Anonymous Ratings</Label>
                    <p className="text-sm text-muted-foreground">
                      Submit ratings without showing your name
                    </p>
                  </div>
                  <Switch 
                    id="anonymous-ratings" 
                    checked={true}
                    disabled={true}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="activity-history">Activity History</Label>
                    <p className="text-sm text-muted-foreground">
                      Control whether your activity history is saved
                    </p>
                  </div>
                  <Switch 
                    id="activity-history" 
                    checked={true}
                    disabled={true}
                  />
                </div>
                
                <div className="mt-6">
                  <Button variant="outline" disabled={true}>
                    <Eye className="h-4 w-4 mr-2" />
                    Request My Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}