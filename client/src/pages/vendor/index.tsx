import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, BarChart3, Calendar, Tag, Settings, FileText, Store, 
  PackageOpen, Bell, CheckCircle, AlertCircle, Clock, HelpCircle, Star,
  Search, Copy, Filter as FilterIcon, X, MapPin, Share2, User, Calendar as CalendarIcon
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
import DealFilterDialog, { FilterOptions } from '@/components/vendor/DealFilterDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Define status colors for consistent use across components
const statusColors: Record<string, string> = {
  verified: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  expired: 'bg-gray-100 text-gray-700 border-gray-200',
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [business, setBusiness] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<any>({}); // Store applied filters
  const [allDeals, setAllDeals] = useState<any[]>([]); // Store all deals for filtering
  const [filteredDeals, setFilteredDeals] = useState<any[]>([]); // Store filtered deals
  const [selectedDeal, setSelectedDeal] = useState<any>(null); // Selected deal for details
  const [redemptionDialogOpen, setRedemptionDialogOpen] = useState<boolean>(false); // Control redemption details dialog
  const [statusFilter, setStatusFilter] = useState<string>("all"); // Track selected status filter
  const [stats, setStats] = useState({
    activeDeals: 0,
    viewCount: 0,
    redemptionCount: 0,
    savesCount: 0
  });

  // Notification system will be implemented in the header bell icon
  // This is a placeholder for the notification system
  const [notifications, setNotifications] = useState<Array<{
    id: number;
    type: string;
    message: string;
    read: boolean;
    createdAt?: Date;
  }>>([]);

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
              const dealsResponse = await apiRequest(`/api/business/${businessResponse.id}/deals`);
              
              // Convert the response to an array if it's an object with numeric keys
              let dealsArray: any[] = [];
              
              if (dealsResponse) {
                // Check if it's already an array
                if (Array.isArray(dealsResponse)) {
                  dealsArray = dealsResponse;
                } 
                // Check if it's an object with numeric keys
                else if (typeof dealsResponse === 'object' && dealsResponse !== null) {
                  // Filter out non-numeric keys like 'apiVersion'
                  dealsArray = Object.keys(dealsResponse)
                    .filter(key => !isNaN(Number(key)))
                    .map(key => dealsResponse[key]);
                }
              }
              
              // Store both the original and filtered deals
              console.log("Original dealsArray with status:", dealsArray.map(d => ({id: d.id, title: d.title, status: d.status})));
              setAllDeals(dealsArray);
              setDeals(dealsArray);
              setFilteredDeals(dealsArray);
              console.log("Processed deals array:", dealsArray);
              
              // Calculate stats
              const activeDeals = dealsArray.filter((deal: any) => 
                new Date(deal.endDate) >= new Date() && deal.status === 'verified'
              ).length;
              
              // Sum up counts
              const viewCount = dealsArray.reduce((sum: number, deal: any) => sum + (deal.viewCount || 0), 0);
              const redemptionCount = dealsArray.reduce((sum: number, deal: any) => sum + (deal.redemptionCount || 0), 0);
              const savesCount = dealsArray.reduce((sum: number, deal: any) => sum + (deal.saveCount || 0), 0);
              
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
  
  // Handle opening the redemption details dialog
  const handleViewRedemptionDetails = (deal: any) => {
    setSelectedDeal(deal);
    setRedemptionDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B]"></div>
      </div>
    );
  }

  const isBusinessVerified = business?.verificationStatus === 'verified';
  
  // Count active filters for badge display
  const countActiveFilters = (): number => {
    if (!activeFilters || Object.keys(activeFilters).length === 0) return 0;
    
    let count = 0;
    
    // Status filters
    if (activeFilters.status) {
      Object.values(activeFilters.status).forEach(value => {
        if (value) count++;
      });
      
      // Don't count active status if it's the only one selected (default state)
      if (count === 1 && activeFilters.status.active && 
          !activeFilters.status.upcoming && 
          !activeFilters.status.expired && 
          !activeFilters.status.pending && 
          !activeFilters.status.rejected) {
        count = 0;
      }
    }
    
    // Time filters
    if (activeFilters.timeFrame && activeFilters.timeFrame !== 'all') count++;
    
    // Deal type filters
    if (activeFilters.dealTypes) {
      Object.values(activeFilters.dealTypes).forEach(value => {
        if (value) count++;
      });
    }
    
    // Performance filters
    if (activeFilters.performance && activeFilters.performance !== 'all') count++;
    
    // Sorting (don't count default 'newest' sort)
    if (activeFilters.sortBy && activeFilters.sortBy !== 'newest') count++;
    
    return count;
  };

  // Function to handle applying filters
  const handleApplyFilters = (filters: FilterOptions) => {
    console.log('Applied filters:', filters);
    setActiveFilters(filters);
    
    // Start with all deals
    let filteredResults = [...allDeals];
    const now = new Date();
    
    // Filter by status if any status filters are selected
    const hasStatusFilters = Object.values(filters.status).some(status => status);
    if (hasStatusFilters) {
      filteredResults = filteredResults.filter(deal => {
        const isTimeActive = new Date(deal.endDate) >= now && new Date(deal.startDate) <= now;
        const isUpcoming = new Date(deal.startDate) > now;
        const isExpired = new Date(deal.endDate) < now;
        
        // Special case: If only 'active' is selected (default state), show all deals
        if (filters.status.active && 
            !filters.status.upcoming && 
            !filters.status.expired && 
            !filters.status.pending && 
            !filters.status.rejected) {
          return true;
        }
        
        // Only include deals that match the selected status filters
        return (filters.status.active && isTimeActive && (deal.status === 'verified')) ||
               (filters.status.upcoming && isUpcoming) ||
               (filters.status.expired && isExpired) ||
               (filters.status.pending && deal.status === 'pending') ||
               (filters.status.rejected && deal.status === 'rejected');
      });
    }
    
    // Filter by deal type if any type filters are selected
    const hasDealTypeFilters = Object.values(filters.dealTypes).some(type => type);
    if (hasDealTypeFilters) {
      filteredResults = filteredResults.filter(deal => {
        return (filters.dealTypes.percent_off && deal.dealType === 'percent_off') ||
               (filters.dealTypes.fixed_amount && deal.dealType === 'fixed_amount') ||
               (filters.dealTypes.bogo && deal.dealType === 'bogo') ||
               (filters.dealTypes.free_item && deal.dealType === 'free_item') ||
               (filters.dealTypes.special_offer && deal.dealType === 'special_offer');
      });
    }
    
    // Apply time frame filters
    if (filters.timeFrame !== 'all') {
      const today = new Date();
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(today.getDate() + 7);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      switch (filters.timeFrame) {
        case 'ending-soon':
          // Deals ending in the next 7 days
          filteredResults = filteredResults.filter(deal => {
            const endDate = new Date(deal.endDate);
            return endDate >= today && endDate <= oneWeekFromNow;
          });
          break;
        case 'recent':
          // Deals created in the last 30 days
          filteredResults = filteredResults.filter(deal => {
            return new Date(deal.createdAt) >= thirtyDaysAgo;
          });
          break;
        // For 'custom' time range, we'd need date pickers in the UI
        // This would be implemented when that UI is added
      }
    }
    
    // Apply performance filters
    if (filters.performance !== 'all') {
      // Sort by the appropriate performance metric
      switch (filters.performance) {
        case 'most-viewed':
          filteredResults.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
          break;
        case 'most-redeemed':
          filteredResults.sort((a, b) => (b.redemptionCount || 0) - (a.redemptionCount || 0));
          break;
        case 'most-saved':
          filteredResults.sort((a, b) => (b.saveCount || 0) - (a.saveCount || 0));
          break;
        case 'least-performing':
          // Combined metric for least performing (views + redemptions + saves)
          filteredResults.sort((a, b) => {
            const aScore = (a.viewCount || 0) + (a.redemptionCount || 0) + (a.saveCount || 0);
            const bScore = (b.viewCount || 0) + (b.redemptionCount || 0) + (b.saveCount || 0);
            return aScore - bScore;
          });
          break;
      }
      
      // Limit to top 10 for performance filters if there are more than 10 items
      if (filteredResults.length > 10) {
        filteredResults = filteredResults.slice(0, 10);
      }
    } else {
      // Apply general sorting if not sorted by performance
      switch (filters.sortBy) {
        case 'newest':
          filteredResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case 'oldest':
          filteredResults.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case 'alphabetical':
          filteredResults.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'end-date':
          filteredResults.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
          break;
        case 'popularity':
          filteredResults.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
          break;
      }
    }
    
    // Update the filtered deals state
    setDeals(filteredResults);
    setFilteredDeals(filteredResults);
    
    toast({
      title: "Filters Applied",
      description: `Showing ${filteredResults.length} deals based on your filters`,
    });
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto container-responsive mb-12 sm:mb-24 overflow-x-hidden">
      {/* Filter dialog */}
      <DealFilterDialog 
        open={filterOpen}
        onOpenChange={setFilterOpen}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
      />
      
      {/* Redemption Details Dialog */}
      <RedemptionDetailsDialog
        deal={selectedDeal}
        open={redemptionDialogOpen}
        onOpenChange={setRedemptionDialogOpen}
      />
      
      {/* Welcome and verification status banner */}
      <header className="mb-6 sm:mb-8">
        <div className="flex-responsive justify-between sm:items-start mb-4 sm:mb-2 gap-3 sm:gap-0">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Welcome, {business?.businessName || user?.firstName}</h1>
            <p className="text-gray-500 mt-1">Manage your deals and business profile</p>
          </div>
          <Button 
            className="bg-[#00796B] hover:bg-[#004D40] sm:mt-0 w-full sm:w-auto"
            disabled={!isBusinessVerified}
            onClick={handleCreateDeal}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Create Deal
          </Button>
        </div>

        {/* Verification status banner */}
        {!isBusinessVerified && (
          <Alert className="mt-4 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-yellow-700" />
            <AlertTitle className="text-yellow-800">Verification Pending</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Your business profile is currently under review. You'll be able to create deals once verified.
              <div className="mt-2 flex items-center">
                <span className="text-sm mr-2">Estimated time: 1-2 business days</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 ml-auto"
                  onClick={() => window.location.href = 'mailto:hello@pinnity.ca?subject=Vendor Support Request&body=Hello, I need assistance with my vendor account.'}
                >
                  <HelpCircle className="h-3.5 w-3.5 mr-1.5" /> Contact Support
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Notifications will be handled by the bell icon in the header */}
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
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

      {!isBusinessVerified && (
        <VerificationRequirements business={business} />
      )}

      <Tabs defaultValue="deals" className="w-full">
        <div className="overflow-x-auto pb-1 mb-4 sm:mb-6 scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
          <TabsList className="w-full">
            <TabsTrigger value="deals" className="flex-1 text-center px-2 sm:px-4 text-xs sm:text-sm py-1.5 sm:py-2">My Deals</TabsTrigger>
            <TabsTrigger value="redemptions" className="flex-1 text-center px-2 sm:px-4 text-xs sm:text-sm py-1.5 sm:py-2">Verify Redemptions</TabsTrigger>
            <TabsTrigger value="business" className="flex-1 text-center px-2 sm:px-4 text-xs sm:text-sm py-1.5 sm:py-2">Business Profile</TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 text-center px-2 sm:px-4 text-xs sm:text-sm py-1.5 sm:py-2">Analytics</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="deals" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold truncate max-w-full sm:max-w-[230px]">Your Deals</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              {Object.keys(activeFilters).length > 0 ? (
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full sm:w-auto"
                    onClick={() => setFilterOpen(true)}
                  >
                    <FilterIcon className="h-4 w-4 mr-2" /> Filter
                    <Badge variant="secondary" className="ml-1 bg-gray-200">{countActiveFilters()}</Badge>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-auto"
                    onClick={() => {
                      setActiveFilters({});
                      // Add console logging
                      console.log("Resetting filters, allDeals:", allDeals);
                      setDeals(allDeals);
                      setFilteredDeals(allDeals);
                      toast({
                        title: "Filters Reset",
                        description: "Showing all deals"
                      });
                    }}
                  >
                    <X className="h-4 w-4 mr-1" /> Reset
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full sm:w-auto"
                  onClick={() => setFilterOpen(true)}
                >
                  <FilterIcon className="h-4 w-4 mr-2" /> Filter
                </Button>
              )}
              <Button 
                className="bg-[#00796B] hover:bg-[#004D40] w-full sm:w-auto"
                disabled={!isBusinessVerified}
                onClick={handleCreateDeal}
                size="sm"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Create Deal
              </Button>
            </div>
          </div>
          
          {deals.length === 0 ? (
            <EmptyState 
              title="No deals yet"
              description="Create your first deal to start attracting customers"
              actionText="Create Deal"
              onClick={handleCreateDeal}
              disabled={!isBusinessVerified}
            />
          ) : (
            <div className="card-grid">
              {deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="redemptions">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <h2 className="text-xl font-semibold mb-2 sm:mb-4">Verify Redemption</h2>
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="relative w-full max-w-full sm:max-w-md">
                <input
                  type="search"
                  placeholder="Search deals by title or category..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-[#00796B] focus:border-[#00796B] text-sm"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div className="w-full sm:w-auto mt-2 sm:mt-0">
                <Select 
                  value={statusFilter} 
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    // Filter deals based on the selected status
                    if (value === 'all') {
                      setDeals(allDeals);
                    } else {
                      const now = new Date();
                      const filtered = allDeals.filter((deal) => {
                        const isTimeActive = new Date(deal.endDate) >= now && new Date(deal.startDate) <= now;
                        const isUpcoming = new Date(deal.startDate) > now;
                        const isExpired = new Date(deal.endDate) < now;
                        
                        if (value === 'active') {
                          return isTimeActive && (deal.status === 'verified');
                        } else if (value === 'upcoming') {
                          return isUpcoming;
                        } else if (value === 'expired') {
                          return isExpired || deal.status === 'expired';
                        }
                        return true;
                      });
                      setDeals(filtered);
                    }
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px] text-sm">
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
            
            {/* Mobile card view - only visible on small screens */}
            <div className="block md:hidden space-y-3 mb-4">
              {deals.length > 0 ? deals.map((deal: any) => {
                // Get status display logic from existing code
                let statusClass, statusText;
                
                // Same status determination code as in your table rows
                if (deal.status === 'pending') {
                  statusClass = 'bg-yellow-100 text-yellow-800';
                  statusText = 'Pending Verification';
                } else if (deal.status === 'verified' && new Date(deal.endDate) >= new Date() && new Date(deal.startDate) <= new Date()) {
                  statusClass = 'bg-green-100 text-green-800';
                  statusText = 'Active';
                } else if (deal.status === 'verified' && new Date(deal.startDate) > new Date()) {
                  statusClass = 'bg-blue-100 text-blue-800';
                  statusText = 'Upcoming';
                } else if (new Date(deal.endDate) < new Date() || deal.status === 'expired') {
                  statusClass = 'bg-gray-100 text-gray-800';
                  statusText = 'Expired';
                } else if (deal.status === 'rejected') {
                  statusClass = 'bg-red-100 text-red-800';
                  statusText = 'Rejected';
                } else if (deal.status === 'draft') {
                  statusClass = 'bg-gray-100 text-gray-700';
                  statusText = 'Draft';
                } else if (deal.status === 'canceled') {
                  statusClass = 'bg-red-50 text-red-600';
                  statusText = 'Canceled';
                } else {
                  // Determine a more appropriate status based on dates
                  const now = new Date();
                  try {
                    const startDate = new Date(deal.startDate || deal.start_date);
                    const endDate = new Date(deal.endDate || deal.end_date);
                    
                    // Check if dates are valid before using them
                    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                      statusClass = 'bg-gray-100 text-gray-800';
                      statusText = 'Invalid Dates';
                    } else {
                      const isTimeActive = endDate >= now && startDate <= now;
                      const isUpcoming = startDate > now;
                      const isExpired = endDate < now;
                      
                      if (isExpired) {
                        statusClass = 'bg-gray-100 text-gray-800';
                        statusText = 'Expired';
                      } else if (isUpcoming) {
                        statusClass = 'bg-blue-100 text-blue-800';
                        statusText = 'Upcoming';
                      } else if (isTimeActive) {
                        statusClass = 'bg-green-100 text-green-800';
                        statusText = 'Active';
                      } else {
                        statusClass = 'bg-gray-100 text-gray-800';
                        statusText = deal.status || 'Inactive';
                      }
                    }
                  } catch (error) {
                    console.error('Date processing error:', error, deal);
                    statusClass = 'bg-gray-100 text-gray-800';
                    statusText = 'Error';
                  }
                }
                
                return (
                  <div key={deal.id} className="border rounded-md p-3 bg-white">
                    <div className="font-medium mb-2">{deal.title}</div>
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="font-medium text-gray-500">Type:</div>
                      <div>{deal.dealType?.replace('_', ' ') || '-'}</div>
                      
                      <div className="font-medium text-gray-500">Dates:</div>
                      <div>
                        {(() => {
                          try {
                            const startDate = new Date(deal.startDate || deal.start_date);
                            const endDate = new Date(deal.endDate || deal.end_date);
                            
                            // Check if dates are valid
                            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                              return 'Invalid dates';
                            }
                            
                            return `${format(startDate, 'MM/dd/yy')} - ${format(endDate, 'MM/dd/yy')}`;
                          } catch (error) {
                            console.error('Date formatting error:', error, deal);
                            return 'Invalid dates';
                          }
                        })()}
                      </div>
                      
                      <div className="font-medium text-gray-500">PIN:</div>
                      <div className="flex items-center">
                        <span className="font-mono font-bold mr-2">{deal.redemptionCode}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 sm:h-6 sm:w-6" // Larger on mobile, smaller on desktop
                          onClick={() => {
                            navigator.clipboard.writeText(deal.redemptionCode);
                            toast({
                              title: "PIN Copied",
                              description: "Redemption PIN copied to clipboard"
                            });
                          }}
                        >
                          <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      </div>
                      
                      <div className="font-medium text-gray-500">Used:</div>
                      <div>{deal.redemptionCount || 0}/{deal.totalRedemptions || '∞'}</div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Badge className={`${statusClass} text-xs`}>
                        {statusText}
                      </Badge>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No deals found. <Button variant="link" onClick={handleCreateDeal} className="p-0 h-auto text-primary">Create your first deal</Button>
                </p>
              )}
            </div>
              
            {/* Desktop table view - hidden on mobile */}
            <div className="hidden md:block overflow-x-auto border rounded-md scrollbar-hide table-responsive py-1">
              <div className="w-full">
                <table className="w-full border-collapse mb-0 table-fixed-mobile">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Deal</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Type</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Date Range</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Redemption PIN</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500">Redemptions</th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                  {deals.length > 0 ? deals.map((deal: any) => {
                    // Deal verification status (from the backend)
                    const isPending = deal.status === 'pending';
                    const isVerified = deal.status === 'verified';
                    
                    // Deal time-based status - with safe date handling
                    let isTimeActive = false, isUpcoming = false, isExpired = false;
                    try {
                      const startDate = new Date(deal.startDate || deal.start_date);
                      const endDate = new Date(deal.endDate || deal.end_date);
                      const now = new Date();
                      
                      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
                        isTimeActive = endDate >= now && startDate <= now;
                        isUpcoming = startDate > now;
                        isExpired = endDate < now;
                      }
                    } catch (error) {
                      console.error('Date processing error in table:', error, deal);
                    }
                    
                    // Determine overall status and style
                    let statusClass, statusText;
                    
                    if (isPending) {
                      statusClass = 'bg-yellow-100 text-yellow-800';
                      statusText = 'Pending Verification';
                    } else if (isVerified && isTimeActive) {
                      statusClass = 'bg-green-100 text-green-800';
                      statusText = 'Active';
                    } else if (isVerified && isUpcoming) {
                      statusClass = 'bg-blue-100 text-blue-800';
                      statusText = 'Upcoming';
                    } else if (isExpired || deal.status === 'expired') {
                      statusClass = 'bg-gray-100 text-gray-800';
                      statusText = 'Expired';
                    } else if (deal.status === 'rejected') {
                      statusClass = 'bg-red-100 text-red-800';
                      statusText = 'Rejected';
                    } else if (deal.status === 'draft') {
                      statusClass = 'bg-gray-100 text-gray-700';
                      statusText = 'Draft';
                    } else if (deal.status === 'canceled') {
                      statusClass = 'bg-red-50 text-red-600';
                      statusText = 'Canceled';
                    } else {
                      // Fallback for any other status - typically shouldn't happen
                      // Instead of "Unknown", use a more specific status based on date
                      if (isExpired) {
                        statusClass = 'bg-gray-100 text-gray-800';
                        statusText = 'Expired';
                      } else if (isUpcoming) {
                        statusClass = 'bg-blue-100 text-blue-800';
                        statusText = 'Upcoming';
                      } else {
                        statusClass = 'bg-gray-100 text-gray-800';
                        statusText = deal.status || 'Inactive';
                      }
                    }
                    
                    return (
                      <tr key={deal.id} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm">
                          <div className="font-medium">{deal.title}</div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm">{deal.dealType?.replace('_', ' ') || '-'}</td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap">
                          {(() => {
                            try {
                              const startDate = new Date(deal.startDate || deal.start_date);
                              const endDate = new Date(deal.endDate || deal.end_date);
                              
                              // Check if dates are valid
                              if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                                return 'Invalid dates';
                              }
                              
                              return `${format(startDate, 'MM/dd/yy')} - ${format(endDate, 'MM/dd/yy')}`;
                            } catch (error) {
                              console.error('Date formatting error:', error, deal);
                              return 'Invalid dates';
                            }
                          })()}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-xs sm:text-sm font-bold">{deal.redemptionCode}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 sm:h-6 sm:w-6" // Larger on mobile, smaller on desktop
                              onClick={() => {
                                navigator.clipboard.writeText(deal.redemptionCode);
                                toast({
                                  title: "PIN Copied",
                                  description: "Redemption PIN copied to clipboard"
                                });
                              }}
                            >
                              <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm">
                          <span>{deal.redemptionCount || 0}/{deal.totalRedemptions || '∞'}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-4 text-right">
                          <Badge className={`${statusClass} text-xs`}>
                            {statusText}
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
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={() => handleViewRedemptionDetails(deal)}
                          >
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
              <h2 className="text-xl font-semibold truncate max-w-full sm:max-w-[230px]">Business Profile</h2>
              <Button 
                variant="outline" 
                className="w-full sm:w-auto mt-1 sm:mt-0"
                onClick={() => setLocation('/vendor/profile')}
              >
                <FileText className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            </div>
            
            <div className="flex flex-col sm:flex-col md:flex-row gap-4 sm:gap-6">
              <div className="w-full md:w-1/3">
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <Card>
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base">Rating Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0">
                        <BusinessRatingSummary businessId={business.id} />
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div>
                    <Card>
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base">Recent Reviews</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="space-y-3 sm:space-y-4 max-h-64 sm:max-h-96 overflow-y-auto">
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
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 pt-3 sm:pt-4 px-3 sm:px-5">
        <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">{title}</CardTitle>
        <div className="flex-shrink-0">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-5 pb-3 sm:pb-4">
        <div className="text-xl sm:text-2xl font-bold">{value}</div>
        <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 line-clamp-1">{description}</p>
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
  const [, setLocation] = useLocation();
  const isActive = new Date(deal.endDate) >= new Date() && new Date(deal.startDate) <= new Date();
  const isUpcoming = new Date(deal.startDate) > new Date();
  const isExpired = new Date(deal.endDate) < new Date();
  
  // Status logic - include pending and verification states
  let status = deal.status || 'draft';
  
  // If deal is in 'pending' verification state
  const isPending = status === 'pending';
  
  // Show appropriate status label based on verification state and date
  let statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  if (status === 'verified') {
    if (isExpired) statusLabel = 'Expired';
    else if (isUpcoming) statusLabel = 'Upcoming';
    else statusLabel = 'Active';
  }
  
  // Navigation handlers
  const handleEditDeal = () => {
    console.log(`Navigating to edit page for deal ${deal.id}`);
    setLocation(`/vendor/deals/edit/${deal.id}`);
  };
  
  const handleManageDeal = () => {
    console.log(`Navigating to manage page for deal ${deal.id}`);
    setLocation(`/vendor/deals/manage/${deal.id}`);
  };
  
  return (
    <Card className="overflow-hidden h-full flex flex-col shadow-sm hover:shadow transition-shadow duration-200">
      {deal.imageUrl && (
        <div className="h-32 sm:h-36 md:h-48 w-full relative overflow-hidden">
          <img 
            src={deal.imageUrl} 
            alt={deal.title} 
            className="object-cover w-full h-full"
          />
          <div className="absolute top-2 right-2">
            <Badge className={`${statusColors[status]} text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1`}>
              {statusLabel}
            </Badge>
          </div>
          {isPending && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-white/90 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md flex items-center">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 mr-1.5 sm:mr-2" />
                <span className="text-xs sm:text-sm font-medium">Awaiting Verification</span>
              </div>
            </div>
          )}
        </div>
      )}
      <CardHeader className="pb-0 pt-3 sm:pt-4 sm:pb-1 px-3 sm:px-4 md:px-6">
        <CardTitle className="text-sm sm:text-base md:text-lg line-clamp-1 truncate">{deal.title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm truncate">
          {new Date(deal.startDate).toLocaleDateString()} - {new Date(deal.endDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2 pb-2 sm:pb-3 px-3 sm:px-4 md:px-6 flex-grow">
        <p className="text-xs sm:text-sm text-gray-500 mb-2 line-clamp-2">{deal.description}</p>
        <div className="flex space-x-3 sm:space-x-4 text-xs sm:text-sm mt-2">
          <div className="flex items-center">
            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            <span className="whitespace-nowrap">{deal.viewCount || 0} views</span>
          </div>
          <div className="flex items-center">
            <PackageOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
            <span className="whitespace-nowrap">{deal.redemptionCount || 0} used</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-2 sm:pt-3 pb-2 sm:pb-3 px-3 sm:px-4 md:px-6 flex flex-row gap-2 justify-between">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs h-7 sm:h-8 px-2 sm:px-3 whitespace-nowrap"
          onClick={handleEditDeal}
        >
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Edit
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="text-xs h-7 sm:h-8 text-gray-500 px-2 sm:px-3 whitespace-nowrap"
          onClick={handleManageDeal}
        >
          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" /> Manage
        </Button>
      </CardFooter>
    </Card>
  );
}

function VerificationRequirements({ business }: { business: any }) {
  // Check for actual document URLs from the database
  const hasBusinessLicense = business?.government_id || business?.governmentId;
  const hasProofOfAddress = business?.proof_of_address || business?.proofOfAddress; 
  const hasGovernmentId = business?.proof_of_business || business?.proofOfBusiness;
  
  const documents = [
    { id: 'business_license', name: 'Business License', status: hasBusinessLicense ? 'completed' : 'missing' },
    { id: 'identity', name: 'Government-issued ID', status: hasGovernmentId ? 'completed' : 'missing' },
    { id: 'proof_address', name: 'Proof of Address', status: hasProofOfAddress ? 'completed' : 'missing' }
  ];

  const completedCount = documents.filter(doc => doc.status === 'completed').length;
  const progressPercentage = (completedCount / documents.length) * 100;

  return (
    <Card className="mb-6 sm:mb-8">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl">Complete Your Verification</CardTitle>
        <CardDescription className="text-xs sm:text-sm mt-1">
          Submit the required documents to verify your business
        </CardDescription>
        <Progress value={progressPercentage} className="h-2 mt-2 sm:mt-3" />
      </CardHeader>
      <CardContent className="px-4 sm:px-6 py-2 sm:py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {documents.map(doc => (
            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="flex items-center">
                <div className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center ${
                  doc.status === 'completed' ? 'text-green-500' : 'text-gray-300'
                }`}>
                  {doc.status === 'completed' ? (
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
                <div className="ml-3 sm:ml-4 flex-1">
                  <p className="text-xs sm:text-sm font-medium">{doc.name}</p>
                </div>
              </div>
              <div className="pl-7 sm:pl-0 mt-1 sm:mt-0">
                {doc.status === 'completed' ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs py-0.5 px-2">
                    Submitted
                  </Badge>
                ) : (
                  <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs w-full sm:w-auto px-2 sm:px-3 text-nowrap">
                    Upload
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t px-4 sm:px-6 pt-3 sm:pt-4 pb-4 sm:pb-5">
        <div className="flex items-start sm:items-center text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
          <span>Estimated verification: 1-2 business days after all documents are submitted</span>
        </div>
      </CardFooter>
    </Card>
  );
}

// Redemption Details Dialog Component
function RedemptionDetailsDialog({ 
  deal, 
  open, 
  onOpenChange 
}: { 
  deal: any; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) {
  if (!deal) return null;

  // Get redemption history data from the deal
  // In a real implementation, we would fetch this from an API
  const mockRedemptions = Array.from({ length: deal.redemptionCount || 3 }, (_, i) => {
    // Create mock data for demonstration purposes only
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    return {
      id: `red-${i}-${deal.id}`,
      dealId: deal.id,
      userId: 1000 + i,
      customerName: `Customer ${1000 + i}`,
      redemptionDate: date,
      code: deal.redemptionCode || "CODE123",
      status: "completed"
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Redemption Details</DialogTitle>
          <DialogDescription>
            View details for all redemptions of "{deal.title}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 max-h-[400px] overflow-y-auto space-y-3">
          {mockRedemptions.length > 0 ? (
            mockRedemptions.map((redemption) => (
              <div key={redemption.id} className="border rounded-md p-3 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm flex items-center">
                      <User className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                      {redemption.customerName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <CalendarIcon className="h-3 w-3 mr-1.5" />
                      {format(new Date(redemption.redemptionDate), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {redemption.status}
                  </Badge>
                </div>
                <div className="bg-white p-2 rounded border text-xs flex items-center">
                  <code className="font-mono font-bold">{redemption.code}</code>
                  <div className="ml-auto pl-3">
                    <Button size="sm" variant="ghost" className="h-7 px-2">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 text-sm py-8">No redemption details available</p>
          )}
        </div>

        <DialogFooter className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
