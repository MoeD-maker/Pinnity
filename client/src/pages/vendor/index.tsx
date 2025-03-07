import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, BarChart3, Calendar, Tag, Settings, FileText, Store, PackageOpen } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import MainLayout from '@/components/layout/MainLayout';

export default function VendorDashboard() {
  const { user } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState({
    activeDeals: 0,
    viewCount: 0,
    redemptionCount: 0,
    savesCount: 0
  });

  useEffect(() => {
    async function fetchBusinessData() {
      try {
        if (user && user.id) {
          // Fetch business profile
          const businessData = await apiRequest(`/api/business/user/${user.id}`);
          setBusiness(businessData);

          // Fetch deals if business exists
          if (businessData && businessData.id) {
            const dealsData = await apiRequest(`/api/business/${businessData.id}/deals`);
            setDeals(dealsData || []);
            
            // Calculate stats
            const activeDeals = dealsData ? dealsData.filter((deal: any) => 
              new Date(deal.endDate) >= new Date() && deal.status === 'approved'
            ).length : 0;
            
            // Sum up counts
            const viewCount = dealsData ? dealsData.reduce((sum: number, deal: any) => sum + (deal.views || 0), 0) : 0;
            const redemptionCount = dealsData ? dealsData.reduce((sum: number, deal: any) => sum + (deal.redemptionCount || 0), 0) : 0;
            const savesCount = dealsData ? dealsData.reduce((sum: number, deal: any) => sum + (deal.saves || 0), 0) : 0;
            
            setStats({
              activeDeals,
              viewCount,
              redemptionCount,
              savesCount
            });
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B]"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Vendor Dashboard</h1>
          <p className="text-gray-500">
            Welcome back, {business?.businessName || user?.firstName}
          </p>
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

        <Tabs defaultValue="deals" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="business">Business Profile</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="deals" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Deals</h2>
              <Button className="bg-[#00796B] hover:bg-[#004D40]">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Deal
              </Button>
            </div>
            
            {deals.length === 0 ? (
              <EmptyState 
                title="No deals yet"
                description="Create your first deal to start attracting customers"
                actionText="Create Deal"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="business">
            <BusinessProfile business={business} />
          </TabsContent>
          
          <TabsContent value="analytics">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Performance Analytics</h2>
              <p className="text-gray-500">Detailed analytics will be available soon.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
              <p className="text-gray-500">Account settings will be available soon.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
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

function EmptyState({ title, description, actionText }: { title: string; description: string; actionText: string }) {
  return (
    <div className="bg-white p-8 rounded-lg border border-dashed border-gray-300 text-center">
      <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      <Button className="bg-[#00796B] hover:bg-[#004D40]">
        <PlusCircle className="mr-2 h-4 w-4" /> {actionText}
      </Button>
    </div>
  );
}

function DealCard({ deal }: { deal: any }) {
  const isActive = new Date(deal.endDate) >= new Date();
  const statusColors: Record<string, string> = {
    approved: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    rejected: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800'
  };

  return (
    <Card className="overflow-hidden">
      {deal.imageUrl && (
        <div className="h-48 w-full relative overflow-hidden">
          <img 
            src={deal.imageUrl} 
            alt={deal.title} 
            className="object-cover w-full h-full"
          />
          <div className="absolute top-2 right-2">
            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[deal.status] || 'bg-gray-100'}`}>
              {deal.status || 'Draft'}
            </span>
          </div>
        </div>
      )}
      <CardHeader>
        <CardTitle>{deal.title}</CardTitle>
        <CardDescription>
          {new Date(deal.startDate).toLocaleDateString()} - {new Date(deal.endDate).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{deal.description}</p>
        <div className="flex space-x-4 text-sm mt-2">
          <div className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-1" />
            <span>{deal.views || 0} views</span>
          </div>
          <div className="flex items-center">
            <PackageOpen className="h-4 w-4 mr-1" />
            <span>{deal.redemptionCount || 0} used</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4 flex justify-between">
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" /> Edit
        </Button>
        <Button size="sm" variant="ghost" className="text-gray-500">
          <Settings className="h-4 w-4 mr-2" /> Manage
        </Button>
      </CardFooter>
    </Card>
  );
}

function BusinessProfile({ business }: { business: any }) {
  if (!business) {
    return (
      <EmptyState 
        title="Business profile not found"
        description="Complete your business profile to get started"
        actionText="Complete Profile"
      />
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h2 className="text-xl font-semibold mb-4">Business Information</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Business Name</h3>
          <p className="mb-4">{business.businessName}</p>
          
          <h3 className="text-sm font-medium text-gray-500 mb-1">Category</h3>
          <p className="mb-4">{business.businessCategory}</p>
          
          <h3 className="text-sm font-medium text-gray-500 mb-1">Address</h3>
          <p className="mb-4">{business.address}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-1">Phone</h3>
          <p className="mb-4">{business.phone}</p>
          
          <h3 className="text-sm font-medium text-gray-500 mb-1">Website</h3>
          <p className="mb-4">{business.website || 'Not provided'}</p>
          
          <h3 className="text-sm font-medium text-gray-500 mb-1">Verification Status</h3>
          <p className="mb-4">
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
              business.verificationStatus === 'verified' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {business.verificationStatus || 'Pending'}
            </span>
          </p>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Business Description</h3>
        <p className="text-gray-700">{business.description || 'No description provided'}</p>
      </div>
      
      <div className="mt-6 pt-6 border-t flex justify-end">
        <Button variant="outline" className="mr-2">
          <FileText className="h-4 w-4 mr-2" /> Edit Profile
        </Button>
        <Button className="bg-[#00796B] hover:bg-[#004D40]">
          <Store className="h-4 w-4 mr-2" /> Verify Business
        </Button>
      </div>
    </div>
  );
}