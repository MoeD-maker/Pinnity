import { useState, useEffect } from "react";
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
import { apiRequest } from "@/lib/queryClient";
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

const StatCard = ({ title, value, icon, description, trend, trendValue, action }: StatCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="h-5 w-5 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
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
          >
            {action.label}
          </Button>
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

  // Fetch vendors data from API
  const { 
    data: vendorsData,
    isLoading: isLoadingVendors,
    error: vendorsError
  } = useQuery({
    queryKey: ['/api/v1/admin/vendors'],
    enabled: !!user && user.userType === 'admin'
  });

  // Fetch deals data from API
  const { 
    data: dealsData,
    isLoading: isLoadingDeals,
    error: dealsError
  } = useQuery({
    queryKey: ['/api/v1/admin/deals'],
    enabled: !!user && user.userType === 'admin'
  });

  // Fetch transactions (redemptions) data from API
  const { 
    data: transactionsData,
    isLoading: isLoadingTransactions,
    error: transactionsError
  } = useQuery({
    queryKey: ['/api/v1/admin/transactions'],
    enabled: !!user && user.userType === 'admin'
  });

  // Fetch users data from API
  const { 
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError
  } = useQuery({
    queryKey: ['/api/v1/admin/users'],
    enabled: !!user && user.userType === 'admin'
  });

  // Fetch dashboard summary data (for activity feed and alerts)
  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    error: dashboardError
  } = useQuery({
    queryKey: ['/api/v1/admin/dashboard'],
    enabled: !!user && user.userType === 'admin'
  });
  
  // Process recent activity data
  const recentActivity = React.useMemo(() => {
    if (!dashboardData || !dashboardData.recentActivity) return [];
    
    return dashboardData.recentActivity.map((activity: any) => {
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
  const stats = React.useMemo(() => {
    // Initialize with default values
    const defaultStats = {
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
    
    if (isLoadingVendors || isLoadingDeals || isLoadingUsers || isLoadingTransactions) {
      return defaultStats;
    }
    
    // Process vendors data
    if (vendorsData && Array.isArray(vendorsData)) {
      defaultStats.pendingVendors = vendorsData.filter((vendor: any) => 
        vendor.status === 'pending' || vendor.verificationStatus === 'pending'
      ).length;
      
      defaultStats.approvedVendors = vendorsData.filter((vendor: any) => 
        vendor.status === 'approved' && vendor.verificationStatus === 'approved'
      ).length;
      
      defaultStats.rejectedVendors = vendorsData.filter((vendor: any) => 
        vendor.status === 'rejected' || vendor.verificationStatus === 'rejected'
      ).length;
    }
    
    // Process deals data
    if (dealsData && Array.isArray(dealsData)) {
      defaultStats.pendingDeals = dealsData.filter((deal: any) => 
        deal.status === 'pending'
      ).length;
      
      defaultStats.activeDeals = dealsData.filter((deal: any) => 
        deal.status === 'approved' && new Date(deal.endDate) > new Date()
      ).length;
      
      defaultStats.rejectedDeals = dealsData.filter((deal: any) => 
        deal.status === 'rejected'
      ).length;
      
      defaultStats.expiredDeals = dealsData.filter((deal: any) => 
        deal.status === 'approved' && new Date(deal.endDate) <= new Date()
      ).length;
    }
    
    // Process users data
    if (usersData && Array.isArray(usersData)) {
      defaultStats.totalUsers = usersData.length;
    }
    
    // Process transactions data for today's redemptions
    if (transactionsData && Array.isArray(transactionsData)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      defaultStats.redemptionsToday = transactionsData.filter((transaction: any) => {
        const transactionDate = new Date(transaction.createdAt || transaction.timestamp);
        return transactionDate >= today && transaction.type === 'redemption';
      }).length;
    }
    
    return defaultStats;
  }, [vendorsData, dealsData, usersData, transactionsData, isLoadingVendors, isLoadingDeals, isLoadingUsers, isLoadingTransactions]);

  // Generate alerts based on stats
  const alerts = React.useMemo(() => {
    const newAlerts = [];
    
    if (stats.pendingVendors > 0) {
      newAlerts.push({
        id: 1,
        title: "Vendor Verification Required",
        description: `${stats.pendingVendors} vendors are waiting for verification`,
        priority: stats.pendingVendors > 3 ? "high" : "medium"
      });
    }
    
    if (stats.pendingDeals > 0) {
      newAlerts.push({
        id: 2,
        title: "Deal Approval Backlog",
        description: `${stats.pendingDeals} deals are pending approval`,
        priority: stats.pendingDeals > 5 ? "high" : "medium"
      });
    }
    
    return newAlerts;
  }, [stats]);

  // Show error toast if any data fetching fails
  useEffect(() => {
    const errors = [vendorsError, dealsError, transactionsError, usersError, dashboardError].filter(Boolean);
    
    if (errors.length > 0) {
      console.error("Error fetching dashboard data:", errors);
      toast({
        title: "Error",
        description: "Failed to load some dashboard data. Please try again.",
        variant: "destructive"
      });
    }
  }, [vendorsError, dealsError, transactionsError, usersError, dashboardError, toast]);

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
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-4 w-4" />}
          description="Registered platform users"
        />
        <StatCard
          title="Rejected Vendors"
          value={stats.rejectedVendors}
          icon={<XCircle className="h-4 w-4" />}
          description="Vendors that were rejected"
        />
        <StatCard
          title="Rejected Deals"
          value={stats.rejectedDeals}
          icon={<XCircle className="h-4 w-4" />}
          description="Rejected deal submissions"
        />
        <StatCard
          title="Expired Deals"
          value={stats.expiredDeals}
          icon={<Clock className="h-4 w-4" />}
          description="Deals that have expired"
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
              {recentActivity.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
              <Button variant="outline" className="w-full">View All Activity</Button>
            </TabsContent>
            <TabsContent value="vendors" className="space-y-4">
              {recentActivity
                .filter(activity => activity.type === "vendor_application")
                .map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              <Button variant="outline" className="w-full">View All Vendor Activity</Button>
            </TabsContent>
            <TabsContent value="deals" className="space-y-4">
              {recentActivity
                .filter(activity => activity.type === "deal_submission" || activity.type === "deal_redemption")
                .map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              <Button variant="outline" className="w-full">View All Deal Activity</Button>
            </TabsContent>
            <TabsContent value="users" className="space-y-4">
              {recentActivity
                .filter(activity => activity.type === "user_registration")
                .map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
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