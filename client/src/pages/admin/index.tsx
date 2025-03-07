import { useState, useEffect } from "react";
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
            <Badge variant={trend === "up" ? "success" : trend === "down" ? "destructive" : "secondary"} className="text-xs">
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
            </Badge>
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
  const [stats, setStats] = useState({
    pendingVendors: 12,
    pendingDeals: 24,
    activeDeals: 85,
    totalUsers: 542,
    alertCount: 3
  });

  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([
    {
      id: 1,
      type: "vendor_application",
      status: "pending",
      title: "New Vendor Application",
      description: "Coffee Corner has applied for vendor verification",
      timestamp: "10 minutes ago"
    },
    {
      id: 2,
      type: "deal_submission",
      status: "pending",
      title: "New Deal Submitted",
      description: "Urban Threads submitted '50% Off Summer Collection'",
      timestamp: "25 minutes ago"
    },
    {
      id: 3,
      type: "deal_redemption",
      status: "completed",
      title: "Deal Redemption",
      description: "Bistro Delight's 'Free Appetizer' was redeemed 15 times today",
      timestamp: "1 hour ago"
    },
    {
      id: 4,
      type: "user_registration",
      status: "completed",
      title: "User Growth",
      description: "25 new users registered in the last 24 hours",
      timestamp: "2 hours ago"
    },
    {
      id: 5,
      type: "deal_submission",
      status: "approved",
      title: "Deal Approved",
      description: "Morning Brew Café's 'BOGO Coffee' deal was approved",
      timestamp: "3 hours ago"
    }
  ]);

  const [alerts, setAlerts] = useState([
    {
      id: 1,
      title: "Vendor Verification Required",
      description: "3 vendors have been waiting for verification for over 48 hours",
      priority: "high"
    },
    {
      id: 2,
      title: "Deal Approval Backlog",
      description: "8 deals have been pending approval for over 24 hours",
      priority: "medium"
    },
    {
      id: 3,
      title: "User Complaint",
      description: "A user has reported an issue with a redeemed deal at 'Bistro Delight'",
      priority: "medium"
    }
  ]);

  // In a real application, you would fetch this data from your API
  useEffect(() => {
    // Simulating API call
    const fetchDashboardData = async () => {
      try {
        // const response = await apiRequest("/api/admin/dashboard");
        // setStats(response.stats);
        // setRecentActivity(response.recentActivity);
        // setAlerts(response.alerts);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
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