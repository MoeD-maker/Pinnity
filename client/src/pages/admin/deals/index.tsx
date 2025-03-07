import React, { useState, useEffect } from 'react';
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
  Bookmark
} from 'lucide-react';
import ViewDetailsLink from '@/components/admin/ViewDetailsLink';
import { apiRequest } from "@/lib/queryClient";
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

  // Fetch deal data
  const { data: deals = [], isLoading } = useQuery({
    queryKey: ['admin', 'deals'],
    queryFn: async () => {
      // This would be an API call in a real application
      // Mock data for demonstration
      const mockDeals: Deal[] = [
        {
          id: 1,
          title: "50% Off Your First Coffee",
          description: "Get 50% off your first coffee purchase. Valid for new customers only.",
          category: "Food & Beverage",
          startDate: "2023-07-01",
          endDate: "2023-07-31",
          submissionDate: "2023-06-15",
          dealType: "percentage",
          discount: "50%",
          status: "pending",
          businessId: 1,
          business: {
            id: 1,
            businessName: "Coffee Corner",
            businessCategory: "Food & Beverage",
            address: "123 Main St, Anytown, USA",
            phone: "555-123-4567",
            email: "info@coffeecorner.com",
            status: "approved",
            verificationStatus: "verified"
          },
          redemptionCount: 0,
          viewCount: 0,
          revisionCount: 0,
          lastUpdated: "2023-06-15"
        },
        {
          id: 2,
          title: "Buy One Get One Free - Summer Collection",
          description: "Purchase any item from our summer collection and get another item of equal or lesser value for free.",
          category: "Retail",
          startDate: "2023-07-15",
          endDate: "2023-08-15",
          submissionDate: "2023-06-20",
          dealType: "bogo",
          status: "pending",
          businessId: 2,
          business: {
            id: 2,
            businessName: "Urban Threads",
            businessCategory: "Retail",
            address: "456 Fashion Ave, Style City, SC 20002",
            phone: "555-234-5678",
            email: "support@urbanthreads.com",
            status: "approved",
            verificationStatus: "verified"
          },
          redemptionCount: 0,
          viewCount: 0,
          revisionCount: 0,
          lastUpdated: "2023-06-20"
        },
        {
          id: 3,
          title: "Free Appetizer with Any Entree",
          description: "Receive a free appetizer when you purchase any entree. Valid for dine-in only.",
          category: "Food & Beverage",
          startDate: "2023-07-01",
          endDate: "2023-09-30",
          submissionDate: "2023-06-18",
          dealType: "freebie",
          status: "approved",
          businessId: 3,
          business: {
            id: 3,
            businessName: "Bistro Delight",
            businessCategory: "Food & Beverage",
            address: "789 Gourmet Blvd, Taste City, TC 30003",
            phone: "555-345-6789",
            email: "reservations@bistrodelight.com",
            status: "approved",
            verificationStatus: "verified"
          },
          redemptionCount: 45,
          viewCount: 320,
          revisionCount: 1,
          lastUpdated: "2023-06-22"
        },
        {
          id: 4,
          title: "20% Off All Electronics",
          description: "Save 20% on all electronics in our store. Cannot be combined with other offers.",
          category: "Electronics",
          startDate: "2023-07-01",
          endDate: "2023-07-15",
          submissionDate: "2023-06-22",
          dealType: "percentage",
          discount: "20%",
          status: "rejected",
          businessId: 4,
          business: {
            id: 4,
            businessName: "Tech Haven",
            businessCategory: "Electronics",
            address: "101 Circuit Dr, Digital City, DC 40004",
            phone: "555-456-7890",
            email: "info@techhaven.com",
            status: "approved",
            verificationStatus: "verified"
          },
          redemptionCount: 0,
          viewCount: 0,
          revisionCount: 0,
          lastUpdated: "2023-06-23"
        },
        {
          id: 5,
          title: "Free One-Week Trial Membership",
          description: "Try our gym for free for one week. Includes access to all facilities and classes.",
          category: "Health & Fitness",
          startDate: "2023-07-01",
          endDate: "2023-12-31",
          submissionDate: "2023-06-25",
          dealType: "freebie",
          status: "pending",
          businessId: 5,
          business: {
            id: 5,
            businessName: "Fitness First",
            businessCategory: "Health & Fitness",
            address: "202 Muscle Rd, Fit Town, FT 50005",
            phone: "555-567-8901",
            email: "member@fitnessfirst.com",
            status: "approved",
            verificationStatus: "verified"
          },
          redemptionCount: 0,
          viewCount: 0,
          revisionCount: 0,
          lastUpdated: "2023-06-25"
        },
        {
          id: 6,
          title: "Summer Reading Sale - 30% Off All Books",
          description: "Get 30% off all books in our store. Perfect for your summer reading list!",
          category: "Books & Media",
          startDate: "2023-07-01",
          endDate: "2023-08-31",
          submissionDate: "2023-06-26",
          dealType: "percentage",
          discount: "30%",
          status: "approved",
          businessId: 7,
          business: {
            id: 7,
            businessName: "Bookworm's Haven",
            businessCategory: "Books & Media",
            address: "404 Reader Ln, Story City, SC 70007",
            phone: "555-789-0123",
            email: "books@bookworm.com",
            status: "approved",
            verificationStatus: "verified"
          },
          redemptionCount: 12,
          viewCount: 89,
          revisionCount: 0,
          lastUpdated: "2023-06-28"
        },
        {
          id: 7,
          title: "Free Pet Grooming with Annual Checkup",
          description: "Schedule an annual vet checkup and receive a free pet grooming session.",
          category: "Pets",
          startDate: "2023-07-01",
          endDate: "2023-09-30",
          submissionDate: "2023-06-27",
          dealType: "freebie",
          status: "pending",
          businessId: 6,
          business: {
            id: 6,
            businessName: "Pet Paradise",
            businessCategory: "Pets",
            address: "303 Paw Path, Animal City, AC 60006",
            phone: "555-678-9012",
            email: "care@petparadise.com",
            status: "approved",
            verificationStatus: "verified"
          },
          redemptionCount: 0,
          viewCount: 0,
          revisionCount: 0,
          lastUpdated: "2023-06-27"
        }
      ];
      return mockDeals;
    }
  });

  // Mutation for approving deals
  const approveDealMutation = useMutation({
    mutationFn: async (dealId: number) => {
      // This would be an API call in a real application
      console.log(`Approving deal ${dealId}`);
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin', 'deals'] });
    }
  });

  // Mutation for rejecting deals
  const rejectDealMutation = useMutation({
    mutationFn: async ({ dealId, reason }: { dealId: number, reason: string }) => {
      // This would be an API call in a real application
      console.log(`Rejecting deal ${dealId} with reason: ${reason}`);
      return { success: true };
    },
    onSuccess: () => {
      // Close dialog and reset form
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedDealForRejection(null);
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['admin', 'deals'] });
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
    
    return deals.filter(deal => {
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
      setSelectedDeals(filteredDeals.map(d => d.id));
    } else {
      setSelectedDeals([]);
    }
  }, [selectAll, filteredDeals]);

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
    if (!deals) return [];
    return Array.from(new Set(deals.map(d => d.category)));
  }, [deals]);

  const businesses = React.useMemo(() => {
    if (!deals) return [];
    return Array.from(new Set(deals.map(d => d.business))).map(b => ({
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

  const handleApproveDeal = (dealId: number) => {
    approveDealMutation.mutate(dealId);
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
  const pendingDealsCount = deals?.filter(d => d.status === "pending").length || 0;
  const approvedDealsCount = deals?.filter(d => d.status === "approved").length || 0;
  const rejectedDealsCount = deals?.filter(d => d.status === "rejected").length || 0;
  const expiredDealsCount = deals?.filter(d => d.status === "expired").length || 0;

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
          <p className="text-muted-foreground">Review and moderate deal submissions</p>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeals.map((deal) => (
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
                                  onClick={() => handleApproveDeal(deal.id)}
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
                    selectedDeals.forEach(id => approveDealMutation.mutate(id));
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