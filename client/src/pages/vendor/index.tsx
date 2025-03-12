import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, BarChart3, Calendar, Tag, Settings, FileText, Store, 
  PackageOpen, Bell, CheckCircle, AlertCircle, Clock, HelpCircle, Star,
  Search, Copy
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import BusinessRatingSummary from '@/components/ratings/BusinessRatingSummary';

// Define status colors for consistent use across components
const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-800 border-green-200',
  verified: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  expired: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-blue-100 text-blue-800 border-blue-200'
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [business, setBusiness] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const [stats, setStats] = useState({
    activeDeals: 0,
    viewCount: 0,
    redemptionCount: 0,
    savesCount: 0
  });

  // Notifications for demo purposes
  const [notifications] = useState([
    { id: 1, type: 'approval', message: 'Your business profile has been approved!', read: false },
    { id: 2, type: 'deal', message: 'Your "Summer Sale" deal is expiring in 3 days', read: true }
  ]);

  useEffect(() => {
    async function fetchBusinessData() {
      try {
        if (user && user.id) {
          // Get business by user ID from storage
          const businessResponse = await apiRequest(`/api/business/user/${user.id}`);
          
          if (businessResponse) {
            setBusiness(businessResponse);
            
            // Fetch deals if business exists
            if (businessResponse.id) {
              const dealsData = await apiRequest(`/api/business/${businessResponse.id}/deals`);
              setDeals(dealsData || []);
              
              // Calculate stats
              const activeDeals = dealsData ? dealsData.filter((deal: any) => 
                new Date(deal.endDate) >= new Date() && deal.status === 'approved'
              ).length : 0;
              
              // Sum up counts
              const viewCount = dealsData ? dealsData.reduce((sum: number, deal: any) => sum + (deal.viewCount || 0), 0) : 0;
              const redemptionCount = dealsData ? dealsData.reduce((sum: number, deal: any) => sum + (deal.redemptionCount || 0), 0) : 0;
              const savesCount = dealsData ? dealsData.reduce((sum: number, deal: any) => sum + (deal.saveCount || 0), 0) : 0;
              
              setStats({
                activeDeals,
                viewCount,
                redemptionCount,
                savesCount
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBusinessData();
  }, [user]);

  const handleCreateDeal = () => {
    setLocation('/vendor/deals/create');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B]"></div>
      </div>
    );
  }

  const isBusinessApproved = business?.verificationStatus === 'verified';

  return (
    <div className="container mx-auto px-2 sm:px-4 py-6 overflow-hidden">
      {/* Welcome and approval status banner */}
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4 sm:mb-2 gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome, {business?.businessName || user?.firstName}</h1>
            <p className="text-gray-500 mt-1">Manage your deals and business profile</p>
          </div>
          <Button 
            className="bg-[#00796B] hover:bg-[#004D40] sm:mt-0 w-full sm:w-auto"
            disabled={!isBusinessApproved}
            onClick={handleCreateDeal}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create Deal
          </Button>
        </div>

        {/* Approval status banner */}
        {!isBusinessApproved && (
          <Alert className="mt-4 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-yellow-700" />
            <AlertTitle className="text-yellow-800">Approval Pending</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Your business profile is currently under review. You'll be able to create deals once approved.
              <div className="mt-2 flex items-center">
                <span className="text-sm mr-2">Estimated time: 1-2 business days</span>
                <Button variant="outline" size="sm" className="h-7 ml-auto">
                  <HelpCircle className="h-3.5 w-3.5 mr-1.5" /> Contact Support
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Notification area */}
        {notifications.length > 0 && (
          <div className="mt-4 space-y-2">
            {notifications.map(notification => (
              <Alert key={notification.id} className={`${notification.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}>
                <Bell className={`h-4 w-4 ${notification.read ? 'text-gray-500' : 'text-blue-500'}`} />
                <AlertDescription className={`${notification.read ? 'text-gray-700' : 'text-blue-700'}`}>
                  {notification.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          title="Active Deals" 
          value={stats.activeDeals} 
          description="Currently running deals"
          icon={<Tag className="h-5 w-5 text-[#00796B]" />}
        />
        <StatCard 
          title="Total Views" 
          value={stats.viewCount} 
          description="Views across all deals"
          icon={<BarChart3 className="h-5 w-5 text-[#00796B]" />}
        />
        <StatCard 
          title="Redemptions" 
          value={stats.redemptionCount} 
          description="Total customer redemptions"
          icon={<PackageOpen className="h-5 w-5 text-[#00796B]" />}
        />
        <StatCard 
          title="Saved Deals" 
          value={stats.savesCount} 
          description="Deals saved by customers"
          icon={<Calendar className="h-5 w-5 text-[#00796B]" />}
        />
      </div>

      {!isBusinessApproved && (
        <VerificationRequirements business={business} />
      )}

      <Tabs defaultValue="deals" className="w-full">
        <div className="overflow-x-auto pb-1 mb-6">
          <TabsList className="min-w-[500px] w-full">
            <TabsTrigger value="deals">My Deals</TabsTrigger>
            <TabsTrigger value="redemptions">Verify Redemptions</TabsTrigger>
            <TabsTrigger value="business">Business Profile</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="deals" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-2 mb-4">
            <h2 className="text-xl font-semibold">Your Deals</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Settings className="h-4 w-4 mr-2" /> Filter
              </Button>
              <Button 
                className="bg-[#00796B] hover:bg-[#004D40] w-full sm:w-auto"
                disabled={!isBusinessApproved}
                onClick={handleCreateDeal}
                size="sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Deal
              </Button>
            </div>
          </div>
          
          {deals.length === 0 ? (
            <EmptyState 
              title="No deals yet"
              description="Create your first deal to start attracting customers"
              actionText="Create Deal"
              onClick={handleCreateDeal}
              disabled={!isBusinessApproved}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="redemptions">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Verify Redemption</h2>
            
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <div className="relative w-full max-w-full sm:max-w-md">
                <input
                  type="search"
                  placeholder="Search deals by title or category..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-[#00796B] focus:border-[#00796B]"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="w-full sm:w-auto sm:ml-4">
                <Select defaultValue="active">
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Deals</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="overflow-x-auto border rounded-md">
              <div className="min-w-[700px]">
                <table className="w-full border-collapse mb-0">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Deal</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date Range</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Redemption PIN</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Redemptions</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {deals.length > 0 ? deals.map((deal: any) => {
                    const isActive = new Date(deal.endDate) >= new Date() && new Date(deal.startDate) <= new Date();
                    const isUpcoming = new Date(deal.startDate) > new Date();
                    const statusClass = isActive ? 'bg-green-100 text-green-800' : 
                                       isUpcoming ? 'bg-blue-100 text-blue-800' : 
                                       'bg-gray-100 text-gray-800';
                    
                    return (
                      <tr key={deal.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm">
                          <div className="font-medium">{deal.title}</div>
                        </td>
                        <td className="px-4 py-4 text-sm">{deal.dealType?.replace('_', ' ') || '-'}</td>
                        <td className="px-4 py-4 text-sm">
                          {format(new Date(deal.startDate), 'MM/dd/yyyy')} - {format(new Date(deal.endDate), 'MM/dd/yyyy')}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-base font-bold">{deal.redemptionCode}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0" 
                              onClick={() => {
                                navigator.clipboard.writeText(deal.redemptionCode);
                                toast({
                                  title: "PIN Copied",
                                  description: "Redemption PIN copied to clipboard"
                                });
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span>{deal.redemptionCount || 0}/{deal.totalRedemptions || '∞'}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Badge className={statusClass}>
                            {isActive ? 'Active' : isUpcoming ? 'Upcoming' : 'Expired'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                        No deals found. <Button variant="link" onClick={handleCreateDeal} className="p-0 h-auto text-primary">Create your first deal</Button>
                      </td>
                    </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="max-w-full sm:max-w-md mx-auto mt-4 sm:mt-6">
              <div className="mb-4 sm:mb-6">
                <h3 className="font-medium mb-3 sm:mb-4">Customer Verification</h3>
                  
                {/* Step 1 */}
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                    <div className="bg-blue-100 w-5 h-5 rounded-full flex items-center justify-center mr-2 text-xs font-bold text-blue-800">1</div>
                    Customer shows deal in their Pinnity app
                  </h4>
                  <p className="text-sm text-blue-700 pl-7">
                    Verify the deal details and confirm it's valid and not expired
                  </p>
                </div>
                
                {/* Step 2 */}
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                    <div className="bg-blue-100 w-5 h-5 rounded-full flex items-center justify-center mr-2 text-xs font-bold text-blue-800">2</div>
                    Provide your redemption PIN
                  </h4>
                  <p className="text-sm text-blue-700 pl-7 mb-3">
                    Give the customer the PIN for your deal that they will enter in their app
                  </p>
                  <div className="pl-7">
                    <div className="flex items-center">
                      <select 
                        className="border border-blue-300 rounded-md p-2 text-sm w-full bg-white focus:ring-[#00796B] focus:border-[#00796B]"
                      >
                        <option value="">-- Select a deal --</option>
                        {deals.map(deal => (
                          <option key={deal.id} value={deal.id}>
                            {deal.title} ({deal.redemptionCode || 'No PIN'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                {/* Step 3 */}
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                    <div className="bg-blue-100 w-5 h-5 rounded-full flex items-center justify-center mr-2 text-xs font-bold text-blue-800">3</div>
                    Confirm redemption
                  </h4>
                  <p className="text-sm text-blue-700 pl-7 mb-3">
                    Watch as the customer enters the PIN and receives confirmation
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-medium mb-2">Recent Redemptions</h3>
                {deals.length > 0 && deals.some(d => d.redemptionCount > 0) ? (
                  <div className="mt-3 divide-y border rounded-md overflow-hidden">
                    {deals.filter(d => d.redemptionCount > 0).map(deal => (
                      <div key={deal.id} className="p-3 bg-white hover:bg-gray-50">
                        <div className="flex justify-between">
                          <div>
                            <p className="font-medium text-sm">{deal.title}</p>
                            <p className="text-xs text-gray-500">
                              {deal.redemptionCount} redemptions
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-8 text-xs">
                            View Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 mb-4">No recent redemptions found</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="business">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
              <h2 className="text-xl font-semibold">Business Profile</h2>
              <Button variant="outline" className="w-full sm:w-auto">
                <FileText className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-1/3">
                <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden">
                  {business?.imageUrl ? (
                    <img 
                      src={business.imageUrl} 
                      alt={business.businessName} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Store className="h-16 w-16 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="mt-6">
                  <Badge className={`${statusColors[business?.verificationStatus || 'pending']} mb-2`}>
                    {business?.verificationStatus === 'verified' ? 'Verified' : 'Pending Verification'}
                  </Badge>
                  <h3 className="text-lg font-medium">{business?.businessName}</h3>
                  <p className="text-sm text-gray-500 capitalize">{business?.businessCategory} Business</p>
                </div>
              </div>
              
              <div className="md:w-2/3">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h4 className="text-xs text-gray-500">Address</h4>
                    <p className="text-sm">{business?.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500">Phone</h4>
                    <p className="text-sm">{business?.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500">Website</h4>
                    <p className="text-sm">{business?.website || 'Not provided'}</p>
                  </div>
                  <div>
                    <h4 className="text-xs text-gray-500">Email</h4>
                    <p className="text-sm">{user?.email || 'Not provided'}</p>
                  </div>
                </div>
                
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p className="text-sm mb-6">{business?.description || 'No business description provided'}</p>
                
                <Separator className="my-6" />
                
                <h3 className="text-sm font-medium text-gray-500 mb-2">Hours of Operation</h3>
                <div className="text-sm mb-6">
                  <p className="text-gray-500">No hours of operation set</p>
                </div>
                
                <h3 className="text-sm font-medium text-gray-500 mb-2">Social Media</h3>
                <div className="text-sm">
                  <p className="text-gray-500">No social media links added</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-2 sm:mb-4">Performance Analytics</h2>
            <p className="text-gray-500 mb-4 sm:mb-6">Track the performance of your deals over time</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Deal Views - Last 30 Days</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                  <p className="text-gray-500">Analytics charts will appear here</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Redemptions - Last 30 Days</CardTitle>
                </CardHeader>
                <CardContent className="h-64 flex items-center justify-center">
                  <p className="text-gray-500">Analytics charts will appear here</p>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4 flex items-center">
                <Star className="h-5 w-5 text-[#FF9800] mr-2" /> Customer Ratings & Feedback
              </h3>
              
              {business?.id ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Rating Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <BusinessRatingSummary businessId={business.id} />
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Recent Reviews</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {/* We'll display the most recent ratings here */}
                          <p className="text-sm text-gray-500">No reviews available yet</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Ratings information will appear once you have customer ratings</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// A simple circle component for the verification checklist
function Circle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function StatCard({ title, value, description, icon }: { title: string; value: number; description: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ 
  title, 
  description, 
  actionText, 
  onClick, 
  disabled = false 
}: { 
  title: string; 
  description: string; 
  actionText: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="bg-white p-4 sm:p-8 rounded-lg border border-dashed border-gray-300 text-center">
      <Store className="h-10 sm:h-12 w-10 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
      <h3 className="text-lg font-medium mb-1 sm:mb-2">{title}</h3>
      <p className="text-gray-500 mb-3 sm:mb-4 text-sm sm:text-base">{description}</p>
      <Button 
        className="bg-[#00796B] hover:bg-[#004D40] w-full sm:w-auto"
        onClick={onClick}
        disabled={disabled}
      >
        <PlusCircle className="mr-2 h-4 w-4" /> {actionText}
      </Button>
    </div>
  );
}

function DealCard({ deal }: { deal: any }) {
  const isActive = new Date(deal.endDate) >= new Date() && new Date(deal.startDate) <= new Date();
  const isUpcoming = new Date(deal.startDate) > new Date();
  const isExpired = new Date(deal.endDate) < new Date();
  
  // Status logic - include pending and approval states
  let status = deal.status || 'draft';
  
  // If deal is in 'pending' approval state
  const isPending = status === 'pending';
  
  // Show appropriate status label based on approval state and date
  let statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  if (status === 'approved') {
    if (isExpired) statusLabel = 'Expired';
    else if (isUpcoming) statusLabel = 'Upcoming';
    else statusLabel = 'Active';
  }
  
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      {deal.imageUrl && (
        <div className="h-48 w-full relative overflow-hidden">
          <img 
            src={deal.imageUrl} 
            alt={deal.title} 
            className="object-cover w-full h-full"
          />
          <div className="absolute top-2 right-2">
            <Badge className={`${statusColors[status]}`}>
              {statusLabel}
            </Badge>
          </div>
          {isPending && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-white/90 px-4 py-2 rounded-md flex items-center">
                <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                <span className="text-sm font-medium">Awaiting Approval</span>
              </div>
            </div>
          )}
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{deal.title}</CardTitle>
        <CardDescription>
          {new Date(deal.startDate).toLocaleDateString()} - {new Date(deal.endDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4 flex-grow">
        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{deal.description}</p>
        <div className="flex space-x-4 text-sm mt-2">
          <div className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-1" />
            <span>{deal.viewCount || 0} views</span>
          </div>
          <div className="flex items-center">
            <PackageOpen className="h-4 w-4 mr-1" />
            <span>{deal.redemptionCount || 0} used</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 flex flex-col sm:flex-row gap-2 sm:justify-between">
        <Button variant="outline" size="sm" className="w-full sm:w-auto justify-center">
          <FileText className="h-4 w-4 mr-2" /> Edit
        </Button>
        <Button size="sm" variant="ghost" className="text-gray-500 w-full sm:w-auto justify-center">
          <Settings className="h-4 w-4 mr-2" /> Manage
        </Button>
      </CardFooter>
    </Card>
  );
}

function VerificationRequirements({ business }: { business: any }) {
  const documents = [
    { id: 'business_license', name: 'Business License', status: business?.governmentId ? 'completed' : 'missing' },
    { id: 'identity', name: 'Government-issued ID', status: business?.proofOfAddress ? 'completed' : 'missing' },
    { id: 'proof_address', name: 'Proof of Address', status: business?.proofOfBusiness ? 'completed' : 'missing' }
  ];

  const completedCount = documents.filter(doc => doc.status === 'completed').length;
  const progressPercentage = (completedCount / documents.length) * 100;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Complete Your Verification</CardTitle>
        <CardDescription>
          Submit the required documents to verify your business
        </CardDescription>
        <Progress value={progressPercentage} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map(doc => (
            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0">
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  doc.status === 'completed' ? 'text-green-500' : 'text-gray-300'
                }`}>
                  {doc.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium">{doc.name}</p>
                </div>
              </div>
              <div className="pl-9 sm:pl-0">
                {doc.status === 'completed' ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Submitted
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Upload
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 sm:pt-6">
        <div className="flex items-start sm:items-center text-xs sm:text-sm text-gray-500">
          <Clock className="w-4 h-4 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
          <span>Estimated approval: 1-2 business days after all documents are submitted</span>
        </div>
      </CardFooter>
    </Card>
  );
}