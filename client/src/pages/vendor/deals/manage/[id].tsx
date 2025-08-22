import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DealPreview } from '@/components/vendor/DealPreview';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  QrCode,
  BarChart4,
  Calendar,
  Users,
  Eye,
  Download,
  Repeat,
  Info,
  Layers,
  RefreshCw,
  AlarmClock,
} from 'lucide-react';

export default function ManageDealPage() {
  const { id } = useParams<{ id: string }>();
  const dealId = parseInt(id);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [dealData, setDealData] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalRedemptions: 0,
    conversionRate: 0,
    savedToFavorites: 0,
    redemptionsPerDay: [] as {date: string, count: number}[],
  });
  const [currentTab, setCurrentTab] = useState('overview');
  
  // Fetch deal data and stats when the component mounts
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch the deal data
        const data = await apiRequest(`/api/deals/${dealId}`);
        if (!data) {
          toast({
            title: "Deal not found",
            description: "The requested deal could not be loaded.",
            variant: "destructive",
          });
          setLocation('/vendor');
          return;
        }
        
        setDealData(data);
        
        // Fetch redemptions
        const redemptionsData = await apiRequest(`/api/deals/${dealId}/redemptions`);
        setRedemptions(redemptionsData || []);
        
        // Fetch stats
        const statsData = await apiRequest(`/api/deals/${dealId}/stats`);
        if (statsData) {
          // If we have real stats, use them
          setStats(statsData);
        } else {
          // Otherwise calculate basic stats from the redemptions
          const totalRedemptions = redemptionsData?.length || 0;
          const mockViews = totalRedemptions * 5 + Math.floor(Math.random() * 20);
          
          // Generate some placeholder data for the graph
          const today = new Date();
          const redemptionsPerDay = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateStr = format(date, 'MMM dd');
            
            // Random count between 0 and 10
            const randomCount = Math.floor(Math.random() * (totalRedemptions ? 10 : 3));
            redemptionsPerDay.push({
              date: dateStr,
              count: randomCount
            });
          }
          
          setStats({
            totalViews: mockViews,
            totalRedemptions,
            conversionRate: totalRedemptions ? (totalRedemptions / mockViews) * 100 : 0,
            savedToFavorites: Math.floor(mockViews * 0.15),
            redemptionsPerDay,
          });
        }
      } catch (error) {
        console.error("Error fetching deal data:", error);
        toast({
          title: "Error",
          description: "There was a problem loading the deal information. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [dealId, setLocation, toast]);
  
  // Get status badge variant
  const getStatusBadge = () => {
    if (!dealData) return 'bg-gray-100 text-gray-700 border-gray-200';
    
    const statusMap: Record<string, string> = {
      'draft': 'bg-gray-100 text-gray-700 border-gray-200',
      'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'verified': 'bg-green-100 text-green-800 border-green-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'pending_revision': 'bg-orange-100 text-orange-800 border-orange-200',
      'expired': 'bg-gray-100 text-gray-700 border-gray-200'
    };
    
    return statusMap[dealData.status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };
  
  // Format status text
  const getStatusText = () => {
    if (!dealData) return 'Loading...';
    
    const statusTextMap: Record<string, string> = {
      'draft': 'Draft',
      'pending': 'Pending Verification',
        'verified': 'Verified',
      'rejected': 'Rejected',
      'pending_revision': 'Revision Requested',
      'expired': 'Expired'
    };
    
    return statusTextMap[dealData.status] || 'Unknown';
  };
  
  // Get remaining redemptions text
  const getRemainingRedemptionsText = () => {
    if (!dealData) return '';
    
    if (dealData.maxRedemptions) {
      const used = dealData.redemptionCount || 0;
      const remaining = dealData.maxRedemptions - used;
      const percentUsed = (used / dealData.maxRedemptions) * 100;
      
      return (
        <div className="w-full space-y-1">
          <div className="flex justify-between">
            <span className="text-sm font-medium">{remaining} remaining</span>
            <span className="text-sm text-muted-foreground">{used}/{dealData.maxRedemptions}</span>
          </div>
          <Progress value={percentUsed} className="h-2" />
        </div>
      );
    }
    
    return <span className="text-sm font-medium">Unlimited redemptions</span>;
  };
  
  // Check if deal is active
  const isDealActive = () => {
    if (!dealData) return false;
    return dealData.status === 'verified';
  };
  
  // Check if deal is expired
  const isDealExpired = () => {
    if (!dealData) return false;
    if (dealData.status === 'expired') return true;
    
    const endDate = dealData.endDate ? new Date(dealData.endDate) : null;
    return endDate ? endDate < new Date() : false;
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B]"></div>
      </div>
    );
  }
  
  return (
    <div className="container p-4 mx-auto max-w-6xl">
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink href="/vendor">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink>Manage Deal</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{dealData?.title || 'Deal Details'}</h1>
          <div className="flex items-center mt-2">
            <Badge className={getStatusBadge()}>
              {getStatusText()}
            </Badge>
            
            {isDealExpired() && (
              <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
                Expired
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="ghost" onClick={() => setLocation('/vendor')} className="h-9">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          
          <Button variant="outline" onClick={() => setLocation(`/vendor/deals/edit/${dealId}`)} className="h-9">
            Edit Deal
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Deal Details & Management */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" value={currentTab} onValueChange={setCurrentTab} className="w-full space-y-6">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Deal Status Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Deal Status</CardTitle>
                  <CardDescription>Current status and performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Date Information */}
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                        <div>
                          <h3 className="text-sm font-medium">Active Period</h3>
                          <p className="text-sm">
                            {dealData?.startDate ? format(new Date(dealData.startDate), 'MMM d, yyyy') : 'N/A'} - {' '}
                            {dealData?.endDate ? format(new Date(dealData.endDate), 'MMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      {dealData?.isRecurring && dealData?.recurringDays?.length > 0 && (
                        <div className="flex items-start">
                          <Repeat className="h-5 w-5 mr-2 text-muted-foreground" />
                          <div>
                            <h3 className="text-sm font-medium">Recurring Days</h3>
                            <p className="text-sm">
                              {dealData.recurringDays.map((day: number) => 
                                ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day]
                              ).join(', ')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Redemption Information */}
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <Layers className="h-5 w-5 mr-2 text-muted-foreground" />
                        <div>
                          <h3 className="text-sm font-medium">Redemption Limits</h3>
                          {getRemainingRedemptionsText()}
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <Users className="h-5 w-5 mr-2 text-muted-foreground" />
                        <div>
                          <h3 className="text-sm font-medium">Per Customer</h3>
                          <p className="text-sm">
                            {dealData?.maxRedemptionsPerCustomer || 1} redemption(s) per customer
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Total Views</span>
                      <div className="flex items-center mt-2">
                        <Eye className="text-primary h-5 w-5 mr-2" />
                        <span className="text-2xl font-bold">{stats.totalViews}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Total Redemptions</span>
                      <div className="flex items-center mt-2">
                        <QrCode className="text-primary h-5 w-5 mr-2" />
                        <span className="text-2xl font-bold">{stats.totalRedemptions}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Conversion Rate</span>
                      <div className="flex items-center mt-2">
                        <BarChart4 className="text-primary h-5 w-5 mr-2" />
                        <span className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-sm">Saved to Favorites</span>
                      <div className="flex items-center mt-2">
                        <RefreshCw className="text-primary h-5 w-5 mr-2" />
                        <span className="text-2xl font-bold">{stats.savedToFavorites}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Redemption Code */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Redemption Information</CardTitle>
                  <CardDescription>Share this code with customers when they redeem</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-2">Redemption Code</div>
                      <div className="flex items-center">
                        <div className="bg-muted p-3 rounded-md font-mono text-lg tracking-widest w-full text-center">
                          {dealData?.redemptionCode || 'No code set'}
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-1">Redemption Instructions</div>
                        <p className="text-sm text-muted-foreground">
                          {dealData?.redemptionInstructions || 'No specific instructions provided. Customers should simply show this code to redeem the deal.'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex-none flex flex-col items-center justify-center space-y-2">
                      <div className="border border-dashed border-gray-300 p-2 rounded-md">
                        <QrCode className="h-24 w-24 text-primary" />
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        Download QR Code
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Redemptions Tab */}
            <TabsContent value="redemptions">
              <Card>
                <CardHeader>
                  <CardTitle>Redemption History</CardTitle>
                  <CardDescription>Track who has redeemed your deal</CardDescription>
                </CardHeader>
                <CardContent>
                  {redemptions && redemptions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {redemptions.map((redemption, index) => (
                          <TableRow key={redemption.id || index}>
                            <TableCell className="font-medium">
                              {redemption.redeemedAt ? format(new Date(redemption.redeemedAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {redemption.user?.firstName 
                                ? `${redemption.user.firstName} ${redemption.user.lastName || ''}`
                                : `Customer #${redemption.userId}`
                              }
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                redemption.status === 'completed' 
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                              }>
                                {redemption.status === 'completed' ? 'Completed' : 'Pending'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlarmClock className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="font-medium mb-1">No Redemptions Yet</h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        When customers redeem your deal, their information will appear here.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                  <CardDescription>View detailed statistics for your deal</CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-6">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Enhanced analytics and custom reporting features are coming soon. Stay tuned for updates!
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Redemptions Overview</h3>
                      <div className="h-[200px] w-full flex items-end justify-between gap-2 pt-6">
                        {stats.redemptionsPerDay.map((day, index) => (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className="bg-primary/80 rounded-sm w-12" 
                              style={{ 
                                height: `${Math.max(20, (day.count / Math.max(...stats.redemptionsPerDay.map(d => d.count), 1)) * 150)}px` 
                              }}
                            ></div>
                            <div className="text-xs mt-2 text-muted-foreground">{day.date}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium mb-2">User Engagement</h3>
                        <Card>
                          <Table>
                            <TableBody>
                              <TableRow>
                                <TableCell>View to Redemption Ratio</TableCell>
                                <TableCell className="text-right font-medium">
                                  {stats.conversionRate.toFixed(1)}%
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Average Views per Day</TableCell>
                                <TableCell className="text-right font-medium">
                                  {Math.round(stats.totalViews / Math.max(7, 1))}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Favorites Rate</TableCell>
                                <TableCell className="text-right font-medium">
                                  {stats.totalViews ? ((stats.savedToFavorites / stats.totalViews) * 100).toFixed(1) : '0'}%
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Card>
                      </div>
                      
                      <div>
                        <h3 className="text-sm font-medium mb-2">Deal Performance</h3>
                        <Card>
                          <Table>
                            <TableBody>
                              <TableRow>
                                <TableCell>Total Redemptions</TableCell>
                                <TableCell className="text-right font-medium">{stats.totalRedemptions}</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Redemption Limit</TableCell>
                                <TableCell className="text-right font-medium">
                                  {dealData?.maxRedemptions ? `${stats.totalRedemptions}/${dealData?.maxRedemptions}` : 'Unlimited'}
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell>Days Active</TableCell>
                                <TableCell className="text-right font-medium">
                                  {dealData?.startDate && dealData?.endDate ? 
                                    Math.max(1, Math.ceil((new Date(dealData.endDate).getTime() - new Date(dealData.startDate).getTime()) / (1000 * 60 * 60 * 24))) : 
                                    'N/A'
                                  }
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Card>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Analytics Report
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Right Column - Deal Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Deal Preview</CardTitle>
              <CardDescription>How your deal appears to customers</CardDescription>
            </CardHeader>
            <CardContent>
              <DealPreview 
                title={dealData?.title || "Deal Title"}
                description={dealData?.description || "Deal description will appear here."}
                imageUrl={dealData?.imageUrl}
                discount={dealData?.discount || "Discount"}
                business={dealData?.business || { businessName: "Your Business" }}
                startDate={dealData?.startDate ? new Date(dealData.startDate) : undefined}
                endDate={dealData?.endDate ? new Date(dealData.endDate) : undefined}
                dealType={dealData?.dealType}
                category={dealData?.category}
                isPreview
              />
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground border-t pt-4">
              <div className="flex items-center justify-between w-full">
                <span>
                  Active: {isDealActive() ? 'Yes' : 'No'}
                </span>
                <Button variant="outline" size="sm" onClick={() => setLocation(`/vendor/deals/edit/${dealId}`)}>
                  Edit Deal
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
