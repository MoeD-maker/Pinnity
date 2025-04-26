import React, { useState, useEffect } from 'react';
import { LastUpdatedTimestamp } from '@/components/ui/LastUpdatedTimestamp';
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsList, TabsTrigger, Tabs, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ChevronDown, 
  Search, 
  Store, 
  Check, 
  X, 
  AlertTriangle, 
  MoreHorizontal, 
  Filter, 
  Calendar, 
  Download, 
  Clock, 
  RotateCcw,
  Tag,
  Eye,
  PenTool,
  Percent,
  Info,
  MessageSquare,
  History,
  Calendar as CalendarIcon,
  Bookmark,
  Edit
} from 'lucide-react';
import { useLocation } from 'wouter';
import ViewDetailsLink from '@/components/admin/ViewDetailsLink';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Types for deal and business data
interface Business {
  id: number;
  businessName: string;
  businessCategory: string;
  address?: string;
  phone?: string;
  email: string;
  status: "new" | "in_review" | "approved" | "rejected";
  verificationStatus: string;
}

interface Deal {
  id: number;
  title: string;
  description: string;
  category: string;
  startDate: string;
  endDate: string;
  submissionDate: string;
  dealType: string;
  discount?: string;
  status: "pending" | "approved" | "rejected" | "expired";
  imageUrl?: string;
  terms?: string;
  businessId: number;
  business: Business;
  redemptionCount?: number;
  viewCount?: number;
  revisionCount?: number;
  lastUpdated?: string;
}

export default function DealsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [filter, setFilter] = useState({
    status: "pending",
    category: "all",
    dateRange: "all",
    businessId: "all",
  });
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDeals, setSelectedDeals] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedDealForRejection, setSelectedDealForRejection] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [selectedDealForModification, setSelectedDealForModification] = useState<number | null>(null);
  const [modificationsMessage, setModificationsMessage] = useState("");
  const [dealDetailDialogOpen, setDealDetailDialogOpen] = useState(false);
  const [selectedDealForDetail, setSelectedDealForDetail] = useState<Deal | null>(null);
  
  // State for tracking cached data status
  const [dealsCacheStatus, setDealsCacheStatus] = useState<{
    isCached: boolean;
    cacheDate?: number;
  }>({
    isCached: false,
    cacheDate: undefined
  });

  // Fetch deal data
  const { data: deals = [], isLoading, refetch: refetchDeals } = useQuery({
    queryKey: ['admin', 'deals', filter.status],
    queryFn: async () => {
      try {
        // Get deals with the selected status - default to pending
        const status = filter.status || 'pending';
        
        // First attempt the versioned route, then fallback to legacy route if it fails
        console.log(`Trying to fetch deals with status: ${status}`);
        
        let response;
        // Try versioned route first
        try {
          response = await apiRequest(`/api/v1/deals/status/${status}`);
          console.log(`Successfully fetched deals from versioned route: /api/v1/deals/status/${status}`);
        } catch (firstError) {
          console.log(`Versioned route failed with error:`, firstError);
          console.log(`Falling back to legacy route: /api/deals/status/${status}`);
          
          try {
            response = await apiRequest(`/api/deals/status/${status}`);
          } catch (secondError) {
            console.log(`Legacy route also failed with error:`, secondError);
            console.log(`Trying alternate admin endpoint as last resort`);
            
            try {
              // Try the admin API endpoint for dashboard stats to get general deal data
              const dashboardResponse = await apiRequest('/api/v1/admin/dashboard');
              console.log('Retrieved dashboard data as fallback:', dashboardResponse);
              
              // See if we can extract deals from the dashboard data
              const allDeals = await apiRequest('/api/v1/admin/debug/deals');
              if (allDeals && allDeals.dealsByStatus && allDeals.dealsByStatus[status]) {
                response = allDeals.dealsByStatus[status];
                console.log(`Using deals from debug endpoint:`, response);
              } else {
                // Last resort - just return empty array with diagnostic info
                console.log('All deal fetching attempts failed, returning empty array');
                return [];
              }
            } catch (finalError) {
              console.log('All endpoints failed. Returning empty array.', finalError);
              return [];
            }
          }
        }
        
        // Update cache status
        setDealsCacheStatus({
          isCached: false,
          cacheDate: Date.now()
        });
        
        console.log('Deals API response:', response);
        
        // If response is null or undefined, return empty array
        if (!response) {
          console.error('Response is null or undefined');
          return [];
        }
        
        // Check for new special wrapped format
        if (response._isArray && response.data && Array.isArray(response.data)) {
          console.log('Received special wrapped array format. Length:', response._length);
          response = response.data;
        } 
        // If response is an object with numeric keys rather than an array, convert it to an array
        else if (typeof response === 'object' && !Array.isArray(response)) {
          console.log('Converting object with numeric keys to array:', response);
          
          // First, check if response has pendingDeals (from dashboard)
          if (response.pendingDeals && Array.isArray(response.pendingDeals)) {
            console.log('Found pendingDeals array property, using that instead');
            response = response.pendingDeals;
          }
          // Then check if it's an object with numeric keys (like {0: deal1, 1: deal2})
          else {
            const keys = Object.keys(response);
            const isNumericKeysObject = keys.length > 0 && keys.every(key => !isNaN(Number(key)));
            
            if (isNumericKeysObject) {
              // First attempt: Convert using map method
              try {
                const dealsArray = keys.map(key => response[key]);
                console.log('Converted deals array (method 1):', dealsArray);
                response = dealsArray;
              } catch (error) {
                console.error('Error converting object to array (method 1):', error);
                
                // Second attempt: Convert using Object.values
                try {
                  const dealsArray = Object.values(response);
                  console.log('Converted deals array (method 2):', dealsArray);
                  response = dealsArray;
                } catch (error) {
                  console.error('Error converting object to array (method 2):', error);
                  
                  // Final fallback: Try using Array.from
                  try {
                    // @ts-ignore - Forcing conversion
                    const dealsArray = Array.from(response);
                    console.log('Converted deals array (method 3):', dealsArray);
                    response = dealsArray;
                  } catch (error) {
                    console.error('All conversion methods failed:', error);
                    // Last resort: just return empty array to prevent UI errors
                    return [];
                  }
                }
              }
            }
          }
        }
        
        if (!response || !Array.isArray(response)) {
          console.error('Invalid deal data returned from API after conversion attempt:', response);
          toast({
            title: "Data format error",
            description: "The deal data returned from the server was invalid. Please try again.",
            variant: "destructive",
          });
          return [];
        }
        
        // Map the response to match our expected deal structure
        // Converting createdAt to submissionDate for display
        const dealData = response.map((deal: any) => ({
          ...deal,
          submissionDate: deal.createdAt || new Date().toISOString(),
          lastUpdated: deal.updatedAt || deal.createdAt || new Date().toISOString(),
          // Ensure all required fields exist
          status: deal.status || 'pending',
          businessId: deal.businessId || 0,
          // Make sure business is defined
          business: deal.business || {
            id: deal.businessId || 0,
            businessName: 'Unknown Business'
          }
        }));
        
        console.log(`Fetched ${dealData.length} deals with status: ${status}`);
        return dealData;
      } catch (error) {
        console.error('Error fetching deals:', error);
        toast({
          title: "Error fetching deals",
          description: "There was a problem loading deals. Please try again.",
          variant: "destructive",
        });
        return [];
      }
    }
  });

  // Mutation for approving deals
  const approveDealMutation = useMutation({
    mutationFn: async ({ dealId, feedback }: { dealId: number, feedback?: string }) => {
      // Use the real API endpoint to update the deal status with optional feedback
      console.log(`Approving deal ${dealId} with feedback: ${feedback || 'none'}`);
      const response = await apiRequest(`/api/deals/${dealId}/status`, {
        method: 'PUT',
        data: { 
          status: 'approved',
          feedback: feedback || null
        }
      });
      return response;
    },
    onSuccess: () => {
      // Invalidate queries to refetch data - invalidate all status filters
      queryClient.invalidateQueries({ queryKey: ['admin', 'deals'] });
      toast({
        title: "Deal approved",
        description: "The deal has been approved and is now live.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error approving deal:", error);
      toast({
        title: "Error approving deal",
        description: "There was a problem approving the deal. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for rejecting deals
  const rejectDealMutation = useMutation({
    mutationFn: async ({ dealId, reason }: { dealId: number, reason: string }) => {
      // Use real API to update deal status to rejected with feedback
      console.log(`Rejecting deal ${dealId} with reason: ${reason}`);
      if (!reason || reason.trim() === '') {
        throw new Error("Rejection reason is required");
      }
      
      const response = await apiRequest(`/api/deals/${dealId}/status`, {
        method: 'PUT',
        data: { 
          status: 'rejected',
          feedback: reason
        }
      });
      return response;
    },
    onSuccess: () => {
      // Close dialog and reset form
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedDealForRejection(null);
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin', 'deals'] });
      toast({
        title: "Deal rejected",
        description: "The deal has been rejected with feedback.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error rejecting deal:", error);
      toast({
        title: "Error rejecting deal",
        description: error instanceof Error ? error.message : "There was a problem rejecting the deal. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation for requesting modifications on deals
  const requestModificationMutation = useMutation({
    mutationFn: async ({ dealId, feedback }: { dealId: number, feedback: string }) => {
      // Use real API to update deal status to pending_revision with feedback
      console.log(`Requesting modifications for deal ${dealId} with feedback: ${feedback}`);
      if (!feedback || feedback.trim() === '') {
        throw new Error("Modification details are required");
      }
      
      const response = await apiRequest(`/api/deals/${dealId}/status`, {
        method: 'PUT',
        data: { 
          status: 'pending_revision',
          feedback: feedback
        }
      });
      return response;
    },
    onSuccess: () => {
      // Close dialog and reset form
      setModifyDialogOpen(false);
      setModificationsMessage("");
      setSelectedDealForModification(null);
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin', 'deals'] });
      toast({
        title: "Modifications requested",
        description: "The vendor has been notified about the requested changes.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Error requesting modifications:", error);
      toast({
        title: "Error requesting modifications",
        description: error instanceof Error ? error.message : "There was a problem requesting modifications. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for modifying deals
  const modifyDealMutation = useMutation({
    mutationFn: async ({ dealId, modifications }: { dealId: number, modifications: string }) => {
      // This would be an API call in a real application
      console.log(`Modifying deal ${dealId} with changes: ${modifications}`);
      return { success: true };
    },
    onSuccess: () => {
      // Close dialog and reset form
      setModifyDialogOpen(false);
      setModificationsMessage("");
      setSelectedDealForModification(null);
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin', 'deals'] });
    }
  });

  // Get filtered deals based on current filters and search
  const filteredDeals = React.useMemo(() => {
    if (!deals) return [];
    
    return deals.filter((deal: Deal) => {
      // Filter by status
      if (filter.status !== "all" && deal.status !== filter.status) {
        return false;
      }
      
      // Filter by category
      if (filter.category !== "all" && deal.category !== filter.category) {
        return false;
      }
      
      // Filter by business
      if (filter.businessId !== "all" && deal.businessId.toString() !== filter.businessId) {
        return false;
      }
      
      // Filter by date range (simplified for mock)
      if (filter.dateRange === "today") {
        const today = new Date().toISOString().split('T')[0];
        return deal.submissionDate === today;
      } else if (filter.dateRange === "thisWeek") {
        // Pretend this week includes the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return new Date(deal.submissionDate) >= oneWeekAgo;
      } else if (filter.dateRange === "thisMonth") {
        // Pretend this month is the current month
        const today = new Date();
        const thisMonth = today.getMonth();
        const thisYear = today.getFullYear();
        const dealDate = new Date(deal.submissionDate);
        return dealDate.getMonth() === thisMonth && dealDate.getFullYear() === thisYear;
      }
      
      // Search query
      if (searchQuery) {
        return (
          deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deal.business.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          deal.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      return true;
    });
  }, [deals, filter, searchQuery]);

  // Toggle select all deals
  useEffect(() => {
    if (selectAll) {
      setSelectedDeals(filteredDeals.map((d: Deal) => d.id));
    } else {
      setSelectedDeals([]);
    }
  }, [selectAll, filteredDeals]);
  
  // Handle automatic refresh when connection is restored
  useEffect(() => {
    const handleConnectionRestored = () => {
      console.log('Connection restored in admin deals - refreshing data');
      // Set cached status to false since we're getting fresh data
      setDealsCacheStatus({
        isCached: false,
        cacheDate: Date.now()
      });
      // Invalidate and refresh all deals data
      queryClient.invalidateQueries({ queryKey: ['admin', 'deals'] });
    };
    
    // Listen for the custom connection restored event
    window.addEventListener('connectionRestored', handleConnectionRestored);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('connectionRestored', handleConnectionRestored);
    };
  }, [queryClient]);

  // Handle deal selection toggle
  const toggleDealSelection = (dealId: number) => {
    if (selectedDeals.includes(dealId)) {
      setSelectedDeals(selectedDeals.filter(id => id !== dealId));
    } else {
      setSelectedDeals([...selectedDeals, dealId]);
    }
  };

  // Get unique categories and businesses for filters
  const categories = React.useMemo(() => {
    if (!deals) return [] as string[];
    return Array.from(new Set(deals.map((d: Deal) => d.category))) as string[];
  }, [deals]);

  const businesses = React.useMemo(() => {
    if (!deals) return [];
    // Extract unique businesses
    const businessMap = new Map();
    deals.forEach((d: Deal) => {
      if (!businessMap.has(d.business.id)) {
        businessMap.set(d.business.id, d.business);
      }
    });
    // Convert to array of business objects
    return Array.from(businessMap.values()).map((b: Business) => ({
      id: b.id,
      name: b.businessName
    }));
  }, [deals]);

  // Format status badges
  const getStatusBadge = (status: string) => {
    switch(status) {
      case "pending":
        return <Badge variant="outline" className="flex items-center gap-1 bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200"><Check className="h-3 w-3" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="flex items-center gap-1 bg-red-50 text-red-700 border-red-200"><X className="h-3 w-3" /> Rejected</Badge>;
      case "expired":
        return <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 text-gray-700 border-gray-200"><AlertTriangle className="h-3 w-3" /> Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDealTypeBadge = (type: string) => {
    switch(type) {
      case "percentage":
        return <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700 border-blue-200"><Percent className="h-3 w-3" /> Percentage</Badge>;
      case "bogo":
        return <Badge variant="outline" className="flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200"><Tag className="h-3 w-3" /> BOGO</Badge>;
      case "freebie":
        return <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200"><Tag className="h-3 w-3" /> Freebie</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleApproveDeal = (dealId: number, feedback?: string) => {
    approveDealMutation.mutate({ dealId, feedback });
  };

  const handleRejectDeal = () => {
    if (selectedDealForRejection && rejectionReason) {
      rejectDealMutation.mutate({
        dealId: selectedDealForRejection,
        reason: rejectionReason
      });
    }
  };

  const handleModifyDeal = () => {
    if (selectedDealForModification && modificationsMessage) {
      modifyDealMutation.mutate({
        dealId: selectedDealForModification,
        modifications: modificationsMessage
      });
    }
  };

  const viewDealDetails = (deal: Deal) => {
    setSelectedDealForDetail(deal);
    setDealDetailDialogOpen(true);
  };

  // Counts by status
  const pendingDealsCount = deals?.filter((d: Deal) => d.status === "pending").length || 0;
  const approvedDealsCount = deals?.filter((d: Deal) => d.status === "approved").length || 0;
  const rejectedDealsCount = deals?.filter((d: Deal) => d.status === "rejected").length || 0;
  const expiredDealsCount = deals?.filter((d: Deal) => d.status === "expired").length || 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Deal Management</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Deal Management</h1>
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Review and moderate deal submissions</p>
            <LastUpdatedTimestamp 
              timestamp={dealsCacheStatus.cacheDate} 
              isCached={dealsCacheStatus.isCached}
              onRefresh={() => refetchDeals()}
            />
          </div>
        </div>
        <div className="space-x-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Deal Statistics</CardTitle>
          <CardDescription>Overview of deal submission status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="text-sm font-medium text-yellow-700">Pending</div>
              <div className="text-2xl font-bold text-yellow-800 mt-1">{pendingDealsCount}</div>
              <div className="text-xs text-yellow-600 mt-1">
                Awaiting review
              </div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="text-sm font-medium text-green-700">Approved</div>
              <div className="text-2xl font-bold text-green-800 mt-1">{approvedDealsCount}</div>
              <div className="text-xs text-green-600 mt-1">
                Live on platform
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="text-sm font-medium text-red-700">Rejected</div>
              <div className="text-2xl font-bold text-red-800 mt-1">{rejectedDealsCount}</div>
              <div className="text-xs text-red-600 mt-1">
                Not approved
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">Total Deals</div>
              <div className="text-2xl font-bold mt-1">{deals.length}</div>
              <div className="text-xs text-muted-foreground mt-1">
                All time
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Deal Submissions</CardTitle>
              <CardDescription>Review and manage submitted deals</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search deals..." 
                  className="pl-8 w-full sm:w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem className="font-medium" disabled>
                    Filter by Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, status: "all"})}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, status: "pending"})}>
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, status: "approved"})}>
                    Approved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, status: "rejected"})}>
                    Rejected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, status: "expired"})}>
                    Expired
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem className="font-medium" disabled>
                    Filter by Category
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, category: "all"})}>
                    All Categories
                  </DropdownMenuItem>
                  {categories.map(category => (
                    <DropdownMenuItem 
                      key={category} 
                      onClick={() => setFilter({...filter, category})}
                    >
                      {category}
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem className="font-medium" disabled>
                    Filter by Business
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, businessId: "all"})}>
                    All Businesses
                  </DropdownMenuItem>
                  {businesses.map(business => (
                    <DropdownMenuItem 
                      key={business.id} 
                      onClick={() => setFilter({...filter, businessId: business.id.toString()})}
                    >
                      {business.name}
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem className="font-medium" disabled>
                    Filter by Date
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, dateRange: "all"})}>
                    All Time
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, dateRange: "today"})}>
                    Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, dateRange: "thisWeek"})}>
                    This Week
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilter({...filter, dateRange: "thisMonth"})}>
                    This Month
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs 
            defaultValue="pending" 
            value={filter.status === "all" ? "all" : filter.status}
            onValueChange={(value) => setFilter({...filter, status: value === "all" ? "all" : value as any})}
            className="w-full"
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All Deals
                <Badge variant="outline" className="ml-2">{deals.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending
                <Badge variant="outline" className="ml-2">{pendingDealsCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved
                <Badge variant="outline" className="ml-2">{approvedDealsCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected
                <Badge variant="outline" className="ml-2">{rejectedDealsCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="expired">
                Expired
                <Badge variant="outline" className="ml-2">{expiredDealsCount}</Badge>
              </TabsTrigger>
            </TabsList>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]">
                      <Checkbox 
                        checked={selectAll} 
                        onCheckedChange={(checked) => {
                          setSelectAll(checked === true);
                        }}
                      />
                    </TableHead>
                    <TableHead>Deal</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Redemptions</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeals.map((deal: Deal) => (
                    <TableRow key={deal.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedDeals.includes(deal.id)} 
                          onCheckedChange={() => toggleDealSelection(deal.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div 
                            className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground overflow-hidden"
                            onClick={() => viewDealDetails(deal)}
                            style={{ cursor: 'pointer' }}
                          >
                            {deal.imageUrl ? (
                              <img src={deal.imageUrl} alt={deal.title} className="h-full w-full object-cover" />
                            ) : (
                              <Tag className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <div 
                              className="font-medium hover:underline cursor-pointer"
                              onClick={() => viewDealDetails(deal)}
                            >
                              {deal.title}
                            </div>
                            <div className="text-xs text-muted-foreground">{deal.category}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {deal.business.businessName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{deal.business.businessName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getDealTypeBadge(deal.dealType)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                          {new Date(deal.submissionDate).toLocaleDateString()}
                        </div>
                        {deal.revisionCount && deal.revisionCount > 0 ? (
                          <div className="text-xs text-muted-foreground mt-1">
                            {deal.revisionCount} revision{deal.revisionCount !== 1 ? 's' : ''}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(deal.startDate).toLocaleDateString()} - {new Date(deal.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.ceil((new Date(deal.endDate).getTime() - new Date(deal.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Bookmark className="h-3 w-3 text-muted-foreground" />
                          <span>{deal.redemptionCount || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(deal.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDealDetails(deal)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {deal.status === "pending" && (
                                <DropdownMenuItem 
                                  className="cursor-pointer text-green-600"
                                  onClick={() => handleApproveDeal(deal.id, '')}
                                >
                                  <Check className="mr-2 h-4 w-4" />
                                  <span>Approve</span>
                                </DropdownMenuItem>
                              )}
                              
                              {deal.status === "pending" && (
                                <DropdownMenuItem 
                                  className="cursor-pointer"
                                  onClick={() => {
                                    setSelectedDealForModification(deal.id);
                                    setModifyDialogOpen(true);
                                  }}
                                >
                                  <PenTool className="mr-2 h-4 w-4" />
                                  <span>Approve with Modifications</span>
                                </DropdownMenuItem>
                              )}
                              
                              {deal.status === "pending" && (
                                <DropdownMenuItem 
                                  className="cursor-pointer text-destructive"
                                  onClick={() => {
                                    setSelectedDealForRejection(deal.id);
                                    setRejectDialogOpen(true);
                                  }}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  <span>Reject</span>
                                </DropdownMenuItem>
                              )}
                              
                              {deal.status === "rejected" && (
                                <DropdownMenuItem className="cursor-pointer">
                                  <RotateCcw className="mr-2 h-4 w-4" />
                                  <span>Reconsider</span>
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem className="cursor-pointer">
                                <History className="mr-2 h-4 w-4" />
                                <span>View History</span>
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem 
                                className="cursor-pointer"
                                onClick={() => setLocation(`/admin/deals/edit/${deal.id}`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit Deal</span>
                              </DropdownMenuItem>
                              
                              <DropdownMenuItem className="cursor-pointer">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                <span>Contact Business</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredDeals.length === 0 && (
                <div className="text-center py-10">
                  <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground font-medium">No deals match your filters</p>
                  <Button 
                    variant="link" 
                    className="mt-2" 
                    onClick={() => {
                      setFilter({
                        status: "all",
                        category: "all",
                        dateRange: "all",
                        businessId: "all",
                      });
                      setSearchQuery("");
                    }}
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-6 flex-col sm:flex-row gap-4">
          <div className="text-sm text-muted-foreground">
            {selectedDeals.length === 0 
              ? 'No deals selected' 
              : `${selectedDeals.length} deal${selectedDeals.length === 1 ? '' : 's'} selected`}
          </div>
          <div className="flex gap-2">
            {selectedDeals.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedDeals([])}
                >
                  Clear Selection
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-green-600"
                  onClick={() => {
                    // Handle bulk approval
                    selectedDeals.forEach(id => approveDealMutation.mutate({dealId: id}));
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve Selected
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    // Open reject dialog for bulk rejection
                    setSelectedDealForRejection(-1); // Use -1 to indicate bulk operation
                    setRejectDialogOpen(true);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject Selected
                </Button>
              </>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Reject Deal Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDealForRejection === -1 
                ? `Reject ${selectedDeals.length} Selected Deal${selectedDeals.length !== 1 ? 's' : ''}` 
                : 'Reject Deal'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this deal. This feedback will be sent to the business owner.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Rejection Reason</h3>
              <Textarea 
                placeholder="Explain why this deal is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Select a Template (Optional)</h3>
              <Select>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Choose a reason template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclear">Unclear Deal Terms</SelectItem>
                  <SelectItem value="misleading">Potentially Misleading</SelectItem>
                  <SelectItem value="policy">Violates Platform Policy</SelectItem>
                  <SelectItem value="incomplete">Incomplete Information</SelectItem>
                  <SelectItem value="images">Image Quality Issues</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectDeal}
              disabled={!rejectionReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify Deal Dialog */}
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve with Modifications</DialogTitle>
            <DialogDescription>
              Specify the changes needed before the deal can be approved. The business owner will be notified of these requested changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Requested Modifications</h3>
              <Textarea 
                placeholder="Specify what changes are needed..."
                value={modificationsMessage}
                onChange={(e) => setModificationsMessage(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Common Modification Requests</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setModificationsMessage(prev => 
                      prev + (prev ? '\n\n' : '') + 'Please clarify the terms and conditions of this deal.'
                    )}
                  >
                    Clarify Terms
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setModificationsMessage(prev => 
                      prev + (prev ? '\n\n' : '') + 'Please provide higher quality images for this deal.'
                    )}
                  >
                    Better Images
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setModificationsMessage(prev => 
                      prev + (prev ? '\n\n' : '') + 'Please specify the exact discount amount more clearly.'
                    )}
                  >
                    Specify Discount
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleModifyDeal}
              disabled={!modificationsMessage.trim()}
            >
              Send Modification Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deal Detail Dialog */}
      <Dialog open={dealDetailDialogOpen} onOpenChange={setDealDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Deal Details</DialogTitle>
          </DialogHeader>
          {selectedDealForDetail && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/3 h-[150px] rounded-md bg-muted flex items-center justify-center text-muted-foreground overflow-hidden">
                  {selectedDealForDetail.imageUrl ? (
                    <img src={selectedDealForDetail.imageUrl} alt={selectedDealForDetail.title} className="h-full w-full object-cover" />
                  ) : (
                    <Tag className="h-10 w-10" />
                  )}
                </div>
                <div className="w-full md:w-2/3">
                  <h2 className="text-xl font-semibold">{selectedDealForDetail.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {selectedDealForDetail.business.businessName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{selectedDealForDetail.business.businessName}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {getStatusBadge(selectedDealForDetail.status)}
                    {getDealTypeBadge(selectedDealForDetail.dealType)}
                  </div>
                  <div className="text-sm mt-3 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(selectedDealForDetail.startDate).toLocaleDateString()} - {new Date(selectedDealForDetail.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Description</h3>
                <p className="text-sm">{selectedDealForDetail.description}</p>
              </div>
              
              {selectedDealForDetail.terms && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Terms & Conditions</h3>
                  <p className="text-sm">{selectedDealForDetail.terms}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Submitted</div>
                  <div className="text-sm font-medium">{new Date(selectedDealForDetail.submissionDate).toLocaleDateString()}</div>
                </div>
                
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Category</div>
                  <div className="text-sm font-medium">{selectedDealForDetail.category}</div>
                </div>
                
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Views</div>
                  <div className="text-sm font-medium">{selectedDealForDetail.viewCount || 0}</div>
                </div>
                
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Redemptions</div>
                  <div className="text-sm font-medium">{selectedDealForDetail.redemptionCount || 0}</div>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-2">Business Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start">
                    <span className="w-24 text-muted-foreground">Name:</span>
                    <span>{selectedDealForDetail.business.businessName}</span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-24 text-muted-foreground">Category:</span>
                    <span>{selectedDealForDetail.business.businessCategory}</span>
                  </div>
                  {selectedDealForDetail.business.address && (
                    <div className="flex items-start">
                      <span className="w-24 text-muted-foreground">Address:</span>
                      <span>{selectedDealForDetail.business.address}</span>
                    </div>
                  )}
                  <div className="flex items-start">
                    <span className="w-24 text-muted-foreground">Email:</span>
                    <span>{selectedDealForDetail.business.email}</span>
                  </div>
                  {selectedDealForDetail.business.phone && (
                    <div className="flex items-start">
                      <span className="w-24 text-muted-foreground">Phone:</span>
                      <span>{selectedDealForDetail.business.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="space-x-2">
            {selectedDealForDetail && (
              <Button
                variant="outline"
                onClick={() => {
                  setLocation(`/admin/deals/edit/${selectedDealForDetail.id}`);
                  setDealDetailDialogOpen(false);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Deal
              </Button>
            )}
            {selectedDealForDetail && selectedDealForDetail.status === "pending" && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedDealForRejection(selectedDealForDetail.id);
                    setDealDetailDialogOpen(false);
                    setRejectDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedDealForModification(selectedDealForDetail.id);
                    setDealDetailDialogOpen(false);
                    setModifyDialogOpen(true);
                  }}
                >
                  <PenTool className="mr-2 h-4 w-4" />
                  Approve with Changes
                </Button>
                <Button 
                  onClick={() => {
                    handleApproveDeal(selectedDealForDetail.id);
                    setDealDetailDialogOpen(false);
                  }}
                  className="text-green-600"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </>
            )}
            {selectedDealForDetail && selectedDealForDetail.status !== "pending" && (
              <Button onClick={() => setDealDetailDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}