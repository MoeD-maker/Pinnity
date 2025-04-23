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
  Activity 
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  const [stats, setStats] = useState({
    pendingVendors: 0,
    pendingDeals: 0,
    activeDeals: 0,
    totalUsers: 0,
    rejectedDeals: 0,
    expiredDeals: 0,
    alertCount: 0
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Generate alerts based on stats
  const [alerts, setAlerts] = useState<{ id: number; title: string; description: string; priority: string }[]>([]);

  // Fetch actual dashboard data from the API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log("Fetching dashboard data...");
        
        // First try the versioned route, if that fails, fall back to the legacy route
        let response;
        try {
          response = await apiRequest("/api/v1/admin/dashboard");
          console.log("Successfully fetched dashboard data with versioned route");
        } catch (error) {
          console.log("Versioned route failed, falling back to legacy route");
          response = await apiRequest("/api/admin/dashboard");
        }
        
        console.log("Dashboard data response:", response);
        
        // Update stats from API response
        if (response && response.stats) {
          console.log("Setting stats from API:", response.stats);
          setStats(response.stats);
          
          // Generate alerts based on stats
          const newAlerts = [];
          
          if (response.stats.pendingVendors > 0) {
            newAlerts.push({
              id: 1,
              title: "Vendor Verification Required",
              description: `${response.stats.pendingVendors} vendors are waiting for verification`,
              priority: response.stats.pendingVendors > 3 ? "high" : "medium"
            });
          }
          
          if (response.stats.pendingDeals > 0) {
            newAlerts.push({
              id: 2,
              title: "Deal Approval Backlog",
              description: `${response.stats.pendingDeals} deals are pending approval`,
              priority: response.stats.pendingDeals > 5 ? "high" : "medium"
            });
          }
          
          setAlerts(newAlerts);
        } else {
          console.error("No stats data in response:", response);
          
          // Fallback stats to prevent UI errors
          setStats({
            pendingVendors: 0,
            pendingDeals: 0,
            activeDeals: 0,
            totalUsers: 0,
            rejectedDeals: 0,
            expiredDeals: 0,
            alertCount: 0
          });
        }
        
        // Update recent activity from API response
        if (response && response.recentActivity && Array.isArray(response.recentActivity)) {
          console.log("Setting activity data:", response.recentActivity);
          // Format timestamps for display
          const formattedActivity = response.recentActivity.map((activity: any) => {
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
          
          setRecentActivity(formattedActivity);
        } else {
          console.error("No activity data in response or invalid format");
          setRecentActivity([]);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive"
        });
      }
    };

    fetchDashboardData();
    
    // Set up periodic refresh every 5 minutes
    const refreshInterval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    
    // Clean up interval on unmount
    return () => clearInterval(refreshInterval);
  }, []);

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
          trend="up"
          trendValue="3 today"
          action={{
            label: "View All",
            onClick: () => window.location.href = "/admin/vendors"
          }}
        />
        <StatCard
          title="Pending Deals"
          value={stats.pendingDeals}
          icon={<Tag className="h-4 w-4" />}
          description="Deals awaiting moderation"
          trend="up"
          trendValue="7 today"
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
          trend="up"
          trendValue="12 this week"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users className="h-4 w-4" />}
          description="Registered platform users"
          trend="up"
          trendValue="42 this month"
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