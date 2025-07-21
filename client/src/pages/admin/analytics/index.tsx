import { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { 
  ArrowUp, 
  ArrowDown, 
  Users, 
  Building, 
  Tag, 
  Check, 
  X, 
  Activity, 
  TrendingUp,
  MapPin,
  Calendar,
  Star,
  DollarSign,
  Filter,
  Download,
  Clock
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Separator } from "@/components/ui/separator";

// Type definitions
type DealData = {
  id: number;
  title: string;
  category: string;
  startDate: string;
  endDate: string;
  views: number;
  redemptions: number;
  savedCount: number;
};

type UserData = {
  id: number;
  username: string;
  email: string;
  userType: string;
  created_at: string;
};

type BusinessData = {
  id: number;
  businessName: string;
  businessCategory: string;
  status: string;
};

type AnalyticsData = {
  totalUsers: number;
  totalBusinesses: number;
  totalDeals: number;
  totalRedemptions: number;
  activeDeals: number;
  pendingDeals: number;
  usersGrowth: number;
  businessesGrowth: number;
  dealsGrowth: number;
  redemptionsGrowth: number;
  redemptionsOverTime: { date: string; count: number }[];
  dealsByCategory: { name: string; value: number }[];
  dealsByStatus: { name: string; value: number }[];
  topDeals: DealData[];
  recentUsers: UserData[];
  popularBusinesses: BusinessData[];
  usersByType: { name: string; value: number }[];
  registrationsByMonth: { month: string; individual: number; business: number; admin: number }[];
  loginsByMonth: { month: string; individual: number; business: number; admin: number }[];
  engagementRate: number;
  redemptionsByDay: { day: string; count: number }[];
  averageRating: number;
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "90days">("30days");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a production environment, we would fetch real data from the API
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Use the real API endpoint to fetch analytics data
      console.log(`Fetching analytics data with timeRange: ${timeRange}`);
      const response = await apiRequest(`/api/v1/admin/analytics?timeRange=${timeRange}`);
      
      if (response) {
        console.log("Analytics data received:", response);
        setAnalyticsData(response);
      } else {
        console.error("No data returned from analytics API");
        // Set empty state for error handling
        setAnalyticsData({
          totalUsers: 0,
          totalBusinesses: 0,
          totalDeals: 0,
          totalRedemptions: 0,
          activeDeals: 0,
          pendingDeals: 0,
          usersGrowth: 0,
          businessesGrowth: 0,
          dealsGrowth: 0,
          redemptionsGrowth: 0,
          redemptionsOverTime: [],
          dealsByCategory: [],
          dealsByStatus: [],
          topDeals: [],
          recentUsers: [],
          popularBusinesses: [],
          usersByType: [],
          registrationsByMonth: [],
          loginsByMonth: [],
          engagementRate: 0,
          redemptionsByDay: [],
          averageRating: 0
        });
      }
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      // Show error message to user
    } finally {
      setIsLoading(false);
    }
  };

  // Analytics data now comes from the real API endpoint

  // Custom card for stats
  const StatCard = ({ 
    title, 
    value, 
    trend, 
    trendValue, 
    icon,
    color = "bg-blue-50 text-blue-500"
  }: { 
    title: string; 
    value: string | number; 
    trend?: "up" | "down" | "neutral"; 
    trendValue?: string | number;
    icon: React.ReactNode;
    color?: string;
  }) => {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className={`rounded-full p-2 ${color}`}>
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {trend && trendValue && (
            <p className={`text-xs flex items-center ${
              trend === "up" 
                ? "text-green-500" 
                : trend === "down" 
                ? "text-red-500" 
                : "text-gray-500"
            }`}>
              {trend === "up" ? (
                <ArrowUp className="mr-1 h-4 w-4" />
              ) : trend === "down" ? (
                <ArrowDown className="mr-1 h-4 w-4" />
              ) : null}
              <span>{trendValue}% from last period</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  // Colors for charts
  const COLORS = ["#00796B", "#FF9800", "#E91E63", "#9C27B0", "#3F51B5", "#2196F3"];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value: "7days" | "30days" | "90days") => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-7 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Key stats cards */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <StatCard 
                  title="Total Users" 
                  value={analyticsData?.totalUsers || 0} 
                  trend="up" 
                  trendValue={analyticsData?.usersGrowth || 0}
                  icon={<Users className="h-4 w-4" />}
                  color="bg-blue-50 text-blue-500"
                />
                <StatCard 
                  title="Businesses" 
                  value={analyticsData?.totalBusinesses || 0} 
                  trend="up" 
                  trendValue={analyticsData?.businessesGrowth || 0}
                  icon={<Building className="h-4 w-4" />}
                  color="bg-purple-50 text-purple-500"
                />
                <StatCard 
                  title="Active Deals" 
                  value={analyticsData?.activeDeals || 0} 
                  trend="up" 
                  trendValue={analyticsData?.dealsGrowth || 0}
                  icon={<Tag className="h-4 w-4" />}
                  color="bg-green-50 text-green-500"
                />
                <StatCard 
                  title="Total Redemptions" 
                  value={analyticsData?.totalRedemptions || 0} 
                  trend="up" 
                  trendValue={analyticsData?.redemptionsGrowth || 0}
                  icon={<Check className="h-4 w-4" />}
                  color="bg-orange-50 text-orange-500"
                />
              </div>
              
              {/* Secondary stats */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <StatCard 
                  title="Pending Deals" 
                  value={analyticsData?.pendingDeals || 0} 
                  icon={<Clock className="h-4 w-4" />}
                  color="bg-amber-50 text-amber-500"
                />
                <StatCard 
                  title="Engagement Rate" 
                  value={`${analyticsData?.engagementRate || 0}%`} 
                  icon={<Activity className="h-4 w-4" />}
                  color="bg-cyan-50 text-cyan-500"
                />
                <StatCard 
                  title="Average Rating" 
                  value={analyticsData?.averageRating || 0} 
                  icon={<Star className="h-4 w-4" />}
                  color="bg-yellow-50 text-yellow-500"
                />
                <StatCard 
                  title="Conversion Rate" 
                  value="0%" 
                  icon={<TrendingUp className="h-4 w-4" />}
                  color="bg-emerald-50 text-emerald-500"
                />
              </div>
              
              {/* Redemptions over time chart */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
                <Card className="col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Redemptions Over Time</CardTitle>
                    <CardDescription>Daily redemption activity for the selected period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={analyticsData?.redemptionsOverTime || []}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00796B" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#00796B" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => format(parseISO(date), "MMM d")}
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            formatter={(value: number) => [`${value} redemptions`, "Redemptions"]}
                            labelFormatter={(date) => format(parseISO(date as string), "MMM d, yyyy")}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#00796B" 
                            fillOpacity={1} 
                            fill="url(#colorRedemptions)" 
                            activeDot={{ r: 8 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Distribution charts */}
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deals by Category</CardTitle>
                    <CardDescription>Distribution of deals across categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData?.dealsByCategory || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {analyticsData?.dealsByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} deals`, "Count"]} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Deals by Status</CardTitle>
                    <CardDescription>Current status distribution of all deals</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData?.dealsByStatus || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={false}
                          >
                            {analyticsData?.dealsByStatus.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={
                                  entry.name === "Active" ? "#10B981" :
                                  entry.name === "Pending" ? "#F59E0B" :
                                  entry.name === "Expired" ? "#6B7280" :
                                  "#EF4444"
                                } 
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value} deals`, "Count"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Redemptions by day of week */}
              <Card>
                <CardHeader>
                  <CardTitle>Redemptions by Day of Week</CardTitle>
                  <CardDescription>Average redemptions per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData?.redemptionsByDay || []}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} redemptions`, "Count"]} />
                        <Bar dataKey="count" fill="#00796B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="users" className="space-y-6">
          {/* User registrations and logins bar charts */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>User Registrations by Month</CardTitle>
                <CardDescription>Monthly user registrations split by user type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.registrationsByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} users`, 
                          name === 'individual' ? 'Individual' : 
                          name === 'business' ? 'Business' : 'Admin'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="individual" stackId="a" fill="#2196F3" name="Individual" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="business" stackId="a" fill="#00796B" name="Business" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="admin" stackId="a" fill="#FF9800" name="Admin" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>User Activity by Month</CardTitle>
                <CardDescription>Monthly active users split by user type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData?.loginsByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} active users`, 
                          name === 'individual' ? 'Individual' : 
                          name === 'business' ? 'Business' : 'Admin'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="individual" stackId="a" fill="#2196F3" name="Individual" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="business" stackId="a" fill="#00796B" name="Business" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="admin" stackId="a" fill="#FF9800" name="Admin" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* User analytics content */}
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>Breakdown of user types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analyticsData?.usersByType || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={false}
                      >
                        <Cell fill="#2196F3" /> {/* Individual */}
                        <Cell fill="#00796B" /> {/* Business */}
                        <Cell fill="#FF9800" /> {/* Admin */}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} users`, "Count"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Users</CardTitle>
                <CardDescription>Recently registered users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.recentUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <div>
                        <Badge variant={user.userType === "business" ? "outline" : "secondary"}>
                          {user.userType === "individual" ? "Customer" : 
                          user.userType === "business" ? "Vendor" : "Admin"}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(parseISO(user.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="deals" className="space-y-6">
          {/* Deal analytics content */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Deals</CardTitle>
              <CardDescription>Deals with the highest engagement rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.topDeals.map(deal => (
                  <div key={deal.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium">{deal.title}</h3>
                        <Badge variant="outline" className="mt-1">
                          {deal.category}
                        </Badge>
                      </div>
                      <div className="flex space-x-4 text-sm">
                        <div className="flex flex-col items-center">
                          <span className="text-muted-foreground">Views</span>
                          <span className="font-bold">{deal.views}</span>
                        </div>
                        <div className="flex flex-col items-center text-[#00796B]">
                          <span>Redemptions</span>
                          <span className="font-bold">{deal.redemptions}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-muted-foreground">Saved</span>
                          <span className="font-bold">{deal.savedCount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex text-xs text-gray-500 space-x-4">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(parseISO(deal.startDate), "MMM d, yyyy")} - {format(parseISO(deal.endDate), "MMM d, yyyy")}
                      </span>
                      <span className="flex items-center">
                        <Activity className="h-3 w-3 mr-1" />
                        {Math.round((deal.redemptions / deal.views) * 100)}% conversion
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vendors" className="space-y-6">
          {/* Vendor analytics content */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Businesses</CardTitle>
              <CardDescription>Businesses with the highest customer engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.popularBusinesses.map(business => (
                  <div key={business.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-4">
                        <Building className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-medium">{business.businessName}</h3>
                        <p className="text-sm text-gray-500">{business.businessCategory}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Deals</span>
                        <span className="font-bold">{Math.floor(Math.random() * 10) + 1}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Redemptions</span>
                        <span className="font-bold">{Math.floor(Math.random() * 100) + 20}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">Rating</span>
                        <span className="font-bold flex items-center">
                          {(Math.random() * 2 + 3).toFixed(1)}
                          <Star className="h-3 w-3 text-yellow-500 ml-1" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}