import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Store, 
  Tag, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  Loader2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Define the type for dashboard stats
type StatValue = string | number;

interface DashboardStats {
  pendingVendors: StatValue;
  approvedVendors: StatValue;
  rejectedVendors: StatValue;
  pendingDeals: StatValue;
  activeDeals: StatValue;
  totalUsers: StatValue;
  rejectedDeals: StatValue;
  expiredDeals: StatValue;
  alertCount: number;
  redemptionsToday: StatValue;
}

const StatCard = ({ 
  title, 
  value, 
  icon, 
  description, 
  trend, 
  trendValue, 
  action, 
  isLoading 
}: StatCardProps & { isLoading?: boolean }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-5 w-5 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                  trend === "up" 
                    ? "bg-green-100 text-green-800" 
                    : trend === "down" 
                      ? "bg-red-100 text-red-800" 
                      : "bg-gray-100 text-gray-800"
                }`}>
                  {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
                </span>
              </div>
            )}
            {action && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={action.onClick}
                disabled={isLoading}
              >
                {action.label}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

interface ActivityItem {
  id: number;
  type: "vendor_application" | "deal_submission" | "user_registration" | "deal_redemption";
  status: "pending" | "approved" | "rejected" | "completed";
  title: string;
  description: string;
  timestamp: string;
}

const ActivityCard = ({ activity }: { activity: ActivityItem }) => {
  const getStatusIcon = () => {
    switch (activity.status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getTypeIcon = () => {
    switch (activity.type) {
      case "vendor_application":
        return <Store className="h-4 w-4" />;
      case "deal_submission":
        return <Tag className="h-4 w-4" />;
      case "user_registration":
        return <Users className="h-4 w-4" />;
      case "deal_redemption":
        return <Tag className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background">
        {getTypeIcon()}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium leading-none">{activity.title}</p>
          <div className="flex items-center">
            {getStatusIcon()}
            <span className="ml-1 text-xs capitalize">{activity.status}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{activity.description}</p>
        <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
      </div>
    </div>
  );
};

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Check if user is admin and redirect if not
  useEffect(() => {
    if (!user) {
      console.log("No user found, redirecting to login");
      setLocation("/auth");
      return;
    }
    
    if (user.userType !== "admin") {
      console.log("User is not admin, redirecting to dashboard");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin area",
        variant: "destructive"
      });
      setLocation("/");
      return;
    }
    
    console.log("Admin authentication successful");
  }, [user, setLocation, toast]);

  // Fetch function for vendors data
  const fetchVendors = async () => {
    const response = await fetch('/api/v1/admin/businesses');
    if (!response.ok) throw new Error('Failed to fetch vendors');
    return response.json();
  };

  // Fetch vendors data from API
  const { 
    data: vendorsData,
    isLoading: isLoadingVendors,
    error: vendorsError
  } = useQuery({
    queryKey: ['/api/v1/admin/businesses'],
    queryFn: fetchVendors,
    enabled: !!user && user.userType === 'admin'
  });
  
  // Fetch function for pending businesses
  const fetchPendingBusinesses = async () => {
    const response = await fetch('/api/v1/admin/businesses/pending');
    if (!response.ok) throw new Error('Failed to fetch pending businesses');
    return response.json();
  };
  
  // Fetch pending businesses specifically from the same endpoint used by vendor management
  const {
    data: pendingBusinessesData,
    isLoading: isLoadingPendingBusinesses,
    error: pendingBusinessesError
  } = useQuery({
    queryKey: ['/api/v1/admin/businesses/pending'],
    queryFn: fetchPendingBusinesses,
    enabled: !!user && user.userType === 'admin'
  });

  // Fetch function for deals data
  const fetchDeals = async () => {
    const response = await fetch('/api/v1/admin/deals');
    if (!response.ok) throw new Error('Failed to fetch deals');
    return response.json();
  };

  // Fetch deals data from API
  const { 
    data: dealsData,
    isLoading: isLoadingDeals,
    error: dealsError
  } = useQuery({
    queryKey: ['/api/v1/admin/deals'],
    queryFn: fetchDeals,
    enabled: !!user && user.userType === 'admin'
  });

  // Fetch function for transactions data
  const fetchTransactions = async () => {
    const response = await fetch('/api/v1/admin/transactions');
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  };

  // Fetch transactions (redemptions) data from API
  const { 
    data: transactionsData,
    isLoading: isLoadingTransactions,
    error: transactionsError
  } = useQuery({
    queryKey: ['/api/v1/admin/transactions'],
    queryFn: fetchTransactions,
    enabled: !!user && user.userType === 'admin'
  });

  // Fetch function for users data
  const fetchUsers = async () => {
    const response = await fetch('/api/v1/admin/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  };

  // Fetch users data from API
  const { 
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError
  } = useQuery({
    queryKey: ['/api/v1/admin/users'],
    queryFn: fetchUsers,
    enabled: !!user && user.userType === 'admin'
  });
  
  // All loading states and data are fetched directly from the individual queries

  // Fetch function for dashboard data
  const fetchDashboard = async () => {
    const response = await fetch('/api/v1/admin/dashboard');
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    return response.json();
  };

  // Fetch dashboard summary data (for activity feed and alerts)
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    error: dashboardError
  } = useQuery({
    queryKey: ['/api/v1/admin/dashboard'],
    queryFn: fetchDashboard,
    enabled: !!user && user.userType === 'admin'
  });
  
  // Define type for dashboard data
  interface DashboardData {
    recentActivity?: Array<{
      id: number;
      type: "vendor_application" | "deal_submission" | "user_registration" | "deal_redemption";
      status: "pending" | "approved" | "rejected" | "completed";
      title: string;
      description: string;
      timestamp: string;
    }>;
    stats?: Record<string, any>;
  }

  // Process recent activity data
  const recentActivity = useMemo(() => {
    if (!dashboardData) return [];
    
    const typedDashboardData = dashboardData as DashboardData;
    if (!typedDashboardData.recentActivity) return [];
    
    return typedDashboardData.recentActivity.map((activity) => {
      const timestamp = new Date(activity.timestamp);
      const now = new Date();
      const diffMs = now.getTime() - timestamp.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      let timeAgo;
      if (diffMinutes < 60) {
        timeAgo = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else {
        timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      }
      
      return {
        ...activity,
        timestamp: timeAgo
      };
    });
  }, [dashboardData]);

  // Calculate stats based on API data
  const stats: DashboardStats = useMemo(() => {
    // Initialize with default values and error states
    const defaultStats: DashboardStats = {
      pendingVendors: 'N/A',
      approvedVendors: 'N/A', 
      rejectedVendors: 'N/A',
      pendingDeals: 'N/A',
      activeDeals: 'N/A',
      totalUsers: 'N/A',
      rejectedDeals: 'N/A',
      expiredDeals: 'N/A',
      alertCount: 0,
      redemptionsToday: 'N/A'
    };
    
    // Return loading state for relevant fields
    // Note: For backward compatibility, continue to check isLoadingPendingBusinesses
    if (isLoadingVendors || isLoadingDeals || isLoadingUsers || isLoadingTransactions) {
      return defaultStats;
    }
    
    // Initialize with numeric values
    const numericStats: DashboardStats = {
      pendingVendors: 0,
      approvedVendors: 0, 
      rejectedVendors: 0,
      pendingDeals: 0,
      activeDeals: 0,
      totalUsers: 0,
      rejectedDeals: 0,
      expiredDeals: 0,
      alertCount: 0,
      redemptionsToday: 0
    };
    
      // Process vendors data for ALL vendor-related stats
    // This ensures consistency across all dashboard components and vendor management page
    if (vendorsData) {
      try {
        // Convert vendorsData to array if it's an object with numeric keys (legacy API format)
        let vendorsArray: any[] = [];
        
        if (Array.isArray(vendorsData)) {
          vendorsArray = vendorsData;
        } else if (vendorsData && typeof vendorsData === 'object') {
          // Handle object format (legacy API might return an object with numeric keys)
          vendorsArray = Object.values(vendorsData);
          console.log("Converted vendors object to array:", vendorsArray.length);
        } else {
          console.error("Vendors data is not an array or object:", vendorsData);
          numericStats.pendingVendors = 'Error';
          numericStats.approvedVendors = 'Error';
          numericStats.rejectedVendors = 'Error';
          return numericStats;
        }
          
        // Calculate all vendor-related stats directly from the vendors data
        // This is the same approach used in the vendor management page
        const pendingVendors = vendorsArray.filter((vendor: any) => 
          vendor.verificationStatus === 'pending'
        );
        
        const approvedVendors = vendorsArray.filter((vendor: any) => 
          vendor.verificationStatus === 'approved' || 
          vendor.verificationStatus === 'verified'
        );
        
        const rejectedVendors = vendorsArray.filter((vendor: any) => 
          vendor.verificationStatus === 'rejected'
        );
        
        // Update all vendor-related stats
        numericStats.pendingVendors = pendingVendors.length;
        numericStats.approvedVendors = approvedVendors.length;
        numericStats.rejectedVendors = rejectedVendors.length;
        
        // Log vendor counts for debugging
        console.log(`Dashboard: Found ${pendingVendors.length} pending vendors`);
        console.log(`Dashboard: Found ${approvedVendors.length} approved vendors (including ${
          approvedVendors.filter(v => v.verificationStatus === 'verified').length
        } verified vendors)`);
        console.log(`Dashboard: Found ${rejectedVendors.length} rejected vendors`);
      } catch (error) {
        console.error("Error processing vendors data:", error);
        numericStats.pendingVendors = 'Error';
        numericStats.approvedVendors = 'Error';
        numericStats.rejectedVendors = 'Error';
      }
    }
    
    // Process deals data
    if (dealsData) {
      try {
        // Convert dealsData to array if it's an object with numeric keys (legacy API format)
        let dealsArray: any[] = [];
        
        if (Array.isArray(dealsData)) {
          dealsArray = dealsData;
        } else if (dealsData && typeof dealsData === 'object') {
          // Handle object format (legacy API might return an object with numeric keys)
          dealsArray = Object.values(dealsData);
          console.log("Converted deals object to array:", dealsArray.length);
        } else {
          console.error("Deals data is not an array or object:", dealsData);
          numericStats.pendingDeals = 'Error';
          numericStats.activeDeals = 'Error';
          numericStats.rejectedDeals = 'Error';
          numericStats.expiredDeals = 'Error';
          return numericStats;
        }
        
        // Include deals with pending_revision status in pending count
        numericStats.pendingDeals = dealsArray.filter((deal: any) => 
          deal.status === 'pending' || deal.status === 'pending_revision'
        ).length;
        
        numericStats.activeDeals = dealsArray.filter((deal: any) => 
          deal.status === 'approved' && new Date(deal.endDate) > new Date()
        ).length;
        
        numericStats.rejectedDeals = dealsArray.filter((deal: any) => 
          deal.status === 'rejected'
        ).length;
        
        numericStats.expiredDeals = dealsArray.filter((deal: any) => 
          deal.status === 'approved' && new Date(deal.endDate) <= new Date()
        ).length;
        
        // Log deal counts for debugging
        console.log(`Dashboard: Found ${numericStats.pendingDeals} pending deals`);
        console.log(`Dashboard: Found ${numericStats.activeDeals} active deals`);
        console.log(`Dashboard: Found ${numericStats.rejectedDeals} rejected deals`);
        console.log(`Dashboard: Found ${numericStats.expiredDeals} expired deals`);
      } catch (error) {
        console.error("Error processing deals data:", error);
        numericStats.pendingDeals = 'Error';
        numericStats.activeDeals = 'Error';
        numericStats.rejectedDeals = 'Error';
        numericStats.expiredDeals = 'Error';
      }
    }
    
    // Process users data
    if (usersData) {
      try {
        // Convert usersData to array if it's an object with numeric keys (legacy API format)
        let usersArray: any[] = [];
        
        if (Array.isArray(usersData)) {
          usersArray = usersData;
        } else if (usersData && typeof usersData === 'object') {
          // Handle object format (legacy API might return an object with numeric keys)
          usersArray = Object.values(usersData);
          console.log("Converted users object to array:", usersArray.length);
        } else {
          console.error("Users data is not an array or object:", usersData);
          numericStats.totalUsers = 'Error';
          return numericStats;
        }
        
        numericStats.totalUsers = usersArray.length;
        console.log(`Dashboard: Found ${numericStats.totalUsers} total users`);
      } catch (error) {
        console.error("Error processing users data:", error);
        numericStats.totalUsers = 'Error';
      }
    }
    
    // Process transactions data for today's redemptions
    if (transactionsData) {
      try {
        // Convert transactionsData to array if it's an object with numeric keys
        let transactionsArray: any[] = [];
        
        if (Array.isArray(transactionsData)) {
          transactionsArray = transactionsData;
        } else if (transactionsData && typeof transactionsData === 'object') {
          // Handle object format (legacy API might return an object with numeric keys)
          transactionsArray = Object.values(transactionsData);
          console.log("Converted transactions object to array:", transactionsArray.length);
        } else {
          console.error("Transactions data is not an array or object:", transactionsData);
          numericStats.redemptionsToday = 'Error';
          return numericStats;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        numericStats.redemptionsToday = transactionsArray.filter((transaction: any) => {
          try {
            const transactionDate = new Date(transaction.createdAt || transaction.timestamp);
            return transactionDate >= today && transaction.type === 'redemption';
          } catch (err) {
            // Skip invalid entries
            return false;
          }
        }).length;
        
        console.log(`Dashboard: Found ${numericStats.redemptionsToday} redemptions today`);
      } catch (error) {
        console.error("Error processing transaction data:", error);
        numericStats.redemptionsToday = 'Error';
      }
    }
    
    return numericStats;
  }, [
    vendorsData, 
    dealsData, 
    usersData, 
    transactionsData,
    isLoadingVendors, 
    isLoadingDeals, 
    isLoadingUsers, 
    isLoadingTransactions
  ]);

  // Generate alerts based on stats
  const alerts = useMemo(() => {
    const newAlerts = [];
    
    // Helper function to check if a stat value is a positive number
    const isPositiveNumber = (value: StatValue): boolean => {
      if (typeof value === 'number') {
        return value > 0;
      } else if (typeof value === 'string' && !isNaN(Number(value))) {
        return Number(value) > 0;
      }
      return false;
    };
    
    // Helper function to compare stat value with a threshold
    const isGreaterThan = (value: StatValue, threshold: number): boolean => {
      if (typeof value === 'number') {
        return value > threshold;
      } else if (typeof value === 'string' && !isNaN(Number(value))) {
        return Number(value) > threshold;
      }
      return false;
    };
    
    // Check for pending vendors
    if (isPositiveNumber(stats.pendingVendors)) {
      newAlerts.push({
        id: 1,
        title: "Vendor Verification Required",
        description: `${stats.pendingVendors} vendors are waiting for verification`,
        priority: isGreaterThan(stats.pendingVendors, 3) ? "high" : "medium"
      });
    }
    
    // Check for pending deals
    if (isPositiveNumber(stats.pendingDeals)) {
      newAlerts.push({
        id: 2,
        title: "Deal Approval Backlog",
        description: `${stats.pendingDeals} deals are pending approval`,
        priority: isGreaterThan(stats.pendingDeals, 5) ? "high" : "medium"
      });
    }
    
    return newAlerts;
  }, [stats]);

  // Show error toast if any data fetching fails
  useEffect(() => {
    const errors = [
      vendorsError,
      pendingBusinessesError,
      dealsError,
      transactionsError,
      usersError,
      dashboardError
    ].filter(Boolean);
    
    if (errors.length > 0) {
      console.error("Error fetching dashboard data:", errors);
      toast({
        title: "Error",
        description: "Failed to load some dashboard data. Please try again.",
        variant: "destructive"
      });
    }
  }, [
    vendorsError,
    pendingBusinessesError,
    dealsError,
    transactionsError,
    usersError,
    dashboardError, 
    toast
  ]);

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Pending Vendors"
          value={stats.pendingVendors}
          icon={<Store className="h-4 w-4" />}
          description="Vendors awaiting approval"
          isLoading={isLoadingVendors}
          action={{
            label: "View All",
            onClick: () => window.location.href = "/admin/vendors"
          }}
        />
        <StatCard
          title="Approved Vendors"
          value={stats.approvedVendors}
          icon={<CheckCircle className="h-4 w-4" />}
          description="Active vendors"
          isLoading={isLoadingVendors}
          action={{
            label: "View All",
            onClick: () => window.location.href = "/admin/vendors?status=approved"
          }}
        />
        <StatCard
          title="Pending Deals"
          value={stats.pendingDeals}
          icon={<Tag className="h-4 w-4" />}
          description="Deals awaiting moderation"
          isLoading={isLoadingDeals}
          action={{
            label: "Review",
            onClick: () => window.location.href = "/admin/deals"
          }}
        />
        <StatCard
          title="Active Deals"
          value={stats.activeDeals}
          icon={<CheckCircle className="h-4 w-4" />}
          description="Currently active deals"
          isLoading={isLoadingDeals}
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-4 w-4" />}
          description="Registered platform users"
          isLoading={isLoadingUsers}
        />
        <StatCard
          title="Rejected Vendors"
          value={stats.rejectedVendors}
          icon={<XCircle className="h-4 w-4" />}
          description="Vendors that were rejected"
          isLoading={isLoadingVendors}
        />
        <StatCard
          title="Rejected Deals"
          value={stats.rejectedDeals}
          icon={<XCircle className="h-4 w-4" />}
          description="Rejected deal submissions"
          isLoading={isLoadingDeals}
        />
        <StatCard
          title="Redemptions Today"
          value={stats.redemptionsToday}
          icon={<Activity className="h-4 w-4" />}
          description="Deals redeemed today"
          isLoading={isLoadingTransactions}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-7 lg:grid-cols-12">
        <div className="md:col-span-4 lg:col-span-8">
          <Tabs defaultValue="activity">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <TabsList>
                <TabsTrigger value="activity">All</TabsTrigger>
                <TabsTrigger value="vendors">Vendors</TabsTrigger>
                <TabsTrigger value="deals">Deals</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="activity" className="space-y-4">
              {isLoadingDashboard ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Loading activity data...</p>
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity as ActivityItem} />
                ))
              ) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  <p>No recent activity to display</p>
                </div>
              )}
              <Button variant="outline" className="w-full">View All Activity</Button>
            </TabsContent>
            <TabsContent value="vendors" className="space-y-4">
              {isLoadingDashboard ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Loading vendor activity...</p>
                </div>
              ) : recentActivity.filter(activity => activity.type === "vendor_application").length > 0 ? (
                recentActivity
                  .filter(activity => activity.type === "vendor_application")
                  .map((activity) => (
                    <ActivityCard key={activity.id} activity={activity as ActivityItem} />
                  ))
              ) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  <p>No vendor activity to display</p>
                </div>
              )}
              <Button variant="outline" className="w-full">View All Vendor Activity</Button>
            </TabsContent>
            <TabsContent value="deals" className="space-y-4">
              {isLoadingDashboard ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Loading deal activity...</p>
                </div>
              ) : recentActivity.filter(activity => activity.type === "deal_submission" || activity.type === "deal_redemption").length > 0 ? (
                recentActivity
                  .filter(activity => activity.type === "deal_submission" || activity.type === "deal_redemption")
                  .map((activity) => (
                    <ActivityCard key={activity.id} activity={activity as ActivityItem} />
                  ))
              ) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  <p>No deal activity to display</p>
                </div>
              )}
              <Button variant="outline" className="w-full">View All Deal Activity</Button>
            </TabsContent>
            <TabsContent value="users" className="space-y-4">
              {isLoadingDashboard ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Loading user activity...</p>
                </div>
              ) : recentActivity.filter(activity => activity.type === "user_registration").length > 0 ? (
                recentActivity
                  .filter(activity => activity.type === "user_registration")
                  .map((activity) => (
                    <ActivityCard key={activity.id} activity={activity as ActivityItem} />
                  ))
              ) : (
                <div className="flex items-center justify-center h-24 text-muted-foreground">
                  <p>No user activity to display</p>
                </div>
              )}
              <Button variant="outline" className="w-full">View All User Activity</Button>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="md:col-span-3 lg:col-span-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">System Alerts</CardTitle>
                <Badge variant="destructive">{alerts.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingVendors || isLoadingDeals ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">Loading alerts...</p>
                </div>
              ) : (
                <>
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex gap-2 border-l-4 border-red-500 pl-4 py-2">
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-medium">{alert.title}</h3>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                    </div>
                  ))}
                  {alerts.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-muted-foreground">
                      <p>No alerts at this time</p>
                    </div>
                  )}
                </>
              )}
              <Button variant="outline" className="w-full">
                View All Alerts
              </Button>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <Store className="mr-2 h-4 w-4" />
                Approve Vendors
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Tag className="mr-2 h-4 w-4" />
                Moderate Deals
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Activity className="mr-2 h-4 w-4" />
                View Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;