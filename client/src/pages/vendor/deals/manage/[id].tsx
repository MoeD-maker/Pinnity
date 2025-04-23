import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  Edit, 
  Trash, 
  Eye, 
  Clock, 
  BarChart3, 
  CalendarIcon, 
  PackageOpen, 
  Users, 
  Heart, 
  AlertTriangle 
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const statusColors: Record<string, string> = {
  approved: 'bg-green-100 text-green-800 border-green-200',
  verified: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  pending_revision: 'bg-orange-100 text-orange-800 border-orange-200',
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  expired: 'bg-gray-100 text-gray-700 border-gray-200',
  active: 'bg-blue-100 text-blue-800 border-blue-200'
};

export default function ManageDealPage() {
  const { id } = useParams<{ id: string }>();
  const dealId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("overview");

  // Fetch deal data and redemptions
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch the deal details
        const dealResponse = await apiRequest(`/api/deals/${dealId}`);
        
        if (dealResponse) {
          setDeal(dealResponse);
          
          // Fetch redemption data
          try {
            const redemptionsResponse = await apiRequest(`/api/deals/${dealId}/redemptions`);
            if (redemptionsResponse) {
              // Sort redemptions by date (most recent first)
              const sortedRedemptions = Array.isArray(redemptionsResponse) 
                ? redemptionsResponse.sort((a, b) => new Date(b.redeemedAt).getTime() - new Date(a.redeemedAt).getTime())
                : [];
              setRedemptions(sortedRedemptions);
            }
          } catch (error) {
            console.error("Error fetching redemptions:", error);
            setRedemptions([]);
          }
        } else {
          // Handle the case where deal is not found
          toast({
            title: "Deal Not Found",
            description: "The requested deal could not be found.",
            variant: "destructive"
          });
          setLocation("/vendor");
        }
      } catch (error) {
        console.error("Error fetching deal data:", error);
        toast({
          title: "Error",
          description: "Failed to load deal data. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dealId, toast, setLocation]);

  // Handle edit button click
  const handleEditDeal = () => {
    setLocation(`/vendor/deals/edit/${dealId}`);
  };

  // Handle delete deal
  const handleDeleteDeal = async () => {
    try {
      await apiRequest(`/api/deals/${dealId}`, {
        method: 'DELETE'
      });
      
      toast({
        title: "Deal Deleted",
        description: "The deal has been successfully deleted.",
      });
      
      // Navigate back to vendor dashboard
      setLocation("/vendor");
    } catch (error) {
      console.error("Error deleting deal:", error);
      toast({
        title: "Error",
        description: "Failed to delete the deal. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00796B]"></div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="container p-4 mx-auto max-w-6xl">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Deal not found. It may have been deleted or is unavailable.</AlertDescription>
        </Alert>
        <Button onClick={() => setLocation("/vendor")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  // Check deal status
  const status = deal.status || 'draft';
  const isApproved = status === 'approved';
  const isPending = status === 'pending';
  const isRejected = status === 'rejected';
  const isPendingRevision = status === 'pending_revision';
  
  // Check deal time status
  const now = new Date();
  const startDate = new Date(deal.startDate);
  const endDate = new Date(deal.endDate);
  const isActive = isApproved && now >= startDate && now <= endDate;
  const isUpcoming = isApproved && now < startDate;
  const isExpired = now > endDate;
  
  // Determine overall status text and style
  let statusText = status.charAt(0).toUpperCase() + status.slice(1);
  let statusClass = statusColors[status] || 'bg-gray-100 text-gray-700';
  
  if (isApproved) {
    if (isExpired) {
      statusText = 'Expired';
      statusClass = statusColors.expired;
    } else if (isUpcoming) {
      statusText = 'Upcoming';
      statusClass = 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (isActive) {
      statusText = 'Active';
      statusClass = statusColors.active;
    }
  } else if (isPendingRevision) {
    statusText = 'Revision Requested';
  } else if (isRejected) {
    statusText = 'Rejected';
  }

  // Calculate time remaining or time until start
  let timeDisplay = "";
  if (isActive) {
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    timeDisplay = `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`;
  } else if (isUpcoming) {
    const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    timeDisplay = `Starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
  }

  // Calculate redemption rate
  const redemptionRate = deal.viewCount ? ((deal.redemptionCount || 0) / deal.viewCount) * 100 : 0;
  
  // Calculate save rate
  const saveRate = deal.viewCount ? ((deal.saveCount || 0) / deal.viewCount) * 100 : 0;

  return (
    <div className="container p-4 mx-auto max-w-6xl">
      <Breadcrumb className="mb-6">
        <BreadcrumbItem>
          <BreadcrumbLink href="/vendor">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink>Manage Deal</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{deal.title}</h1>
          <div className="flex items-center mt-2">
            <Badge className={`${statusClass} mr-2`}>
              {statusText}
            </Badge>
            {timeDisplay && (
              <p className="text-sm text-muted-foreground flex items-center">
                <Clock className="h-3.5 w-3.5 mr-1" />
                {timeDisplay}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleEditDeal}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the deal
                  and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDeal} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Status alerts for deals with pending/rejected status */}
      {isPending && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-700" />
          <AlertDescription className="text-yellow-700">
            This deal is awaiting approval from our team. You'll be notified once it's reviewed.
          </AlertDescription>
        </Alert>
      )}
      
      {isRejected && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium">This deal was rejected for the following reason:</p>
            <p className="mt-1">{deal.rejectionReason || "Did not meet platform guidelines"}</p>
            <p className="mt-2">You can edit the deal to address these issues and resubmit it for approval.</p>
          </AlertDescription>
        </Alert>
      )}
      
      {isPendingRevision && (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-700" />
          <AlertDescription className="text-orange-700">
            <p className="font-medium">Our team has requested revisions to this deal:</p>
            <p className="mt-1">{deal.revisionNotes || "Please make some changes to meet our platform guidelines."}</p>
            <p className="mt-2">Edit the deal to address these issues and resubmit it for approval.</p>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={currentTab} value={currentTab} onValueChange={setCurrentTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <div className="aspect-video w-full overflow-hidden">
                  <img 
                    src={deal.imageUrl || "https://placehold.co/600x400/e2e8f0/94a3b8?text=No+Image"} 
                    alt={deal.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle>{deal.title}</CardTitle>
                  <CardDescription>
                    {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Description</h3>
                    <p className="text-sm text-muted-foreground">{deal.description}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-1">Deal Type</h3>
                    <p className="text-sm text-muted-foreground capitalize">{deal.dealType?.replace('_', ' ')} - {deal.discount}</p>
                  </div>
                  
                  {deal.isRecurring && deal.recurringDays?.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-1">Recurring Schedule</h3>
                      <div className="flex flex-wrap gap-1">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                          deal.recurringDays.includes(i) && (
                            <Badge key={i} variant="outline" className="bg-gray-50">
                              {day}
                            </Badge>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-sm font-medium mb-1">Terms & Conditions</h3>
                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                      {deal.terms || "No terms specified"}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-sm font-medium mb-1">Redemption Details</h3>
                    <div className="bg-muted p-3 rounded-md">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Redemption Code:</span>
                        <Badge variant="outline" className="font-mono bg-white">
                          {deal.redemptionCode || "N/A"}
                        </Badge>
                      </div>
                      <div className="text-sm mb-2">
                        <span className="font-medium">Max per customer:</span>{" "}
                        {deal.maxRedemptionsPerCustomer || 1}
                      </div>
                      {deal.redemptionInstructions && (
                        <div className="text-sm">
                          <span className="font-medium">Instructions:</span>{" "}
                          {deal.redemptionInstructions}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Views</span>
                      <span className="font-medium">{deal.viewCount || 0}</span>
                    </div>
                    <Progress value={100} className="h-1" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Redemptions</span>
                      <span className="font-medium">{deal.redemptionCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{redemptionRate.toFixed(1)}% redemption rate</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px] text-xs">
                              Redemption rate shows what percentage of people who viewed 
                              your deal ended up redeeming it.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Progress 
                      value={Math.min(100, (deal.redemptionCount || 0) / (deal.viewCount || 1) * 100)} 
                      className="h-1"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Saved</span>
                      <span className="font-medium">{deal.saveCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{saveRate.toFixed(1)}% save rate</span>
                    </div>
                    <Progress 
                      value={Math.min(100, (deal.saveCount || 0) / (deal.viewCount || 1) * 100)} 
                      className="h-1"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setCurrentTab("analytics")}
                  >
                    <BarChart3 className="mr-1 h-3.5 w-3.5" />
                    View Full Analytics
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex">
                    <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full border border-primary">
                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Created</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(deal.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  {isPending || isApproved || isRejected || isPendingRevision ? (
                    <div className="flex">
                      <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full border border-primary">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Submitted for Approval</p>
                        <p className="text-xs text-muted-foreground">
                          {deal.submittedAt ? format(new Date(deal.submittedAt), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  
                  {isApproved && (
                    <div className="flex">
                      <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full border border-green-500">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Approved</p>
                        <p className="text-xs text-muted-foreground">
                          {deal.approvedAt ? format(new Date(deal.approvedAt), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {isRejected && (
                    <div className="flex">
                      <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full border border-red-500">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Rejected</p>
                        <p className="text-xs text-muted-foreground">
                          {deal.rejectedAt ? format(new Date(deal.rejectedAt), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {isPendingRevision && (
                    <div className="flex">
                      <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full border border-orange-500">
                        <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Revision Requested</p>
                        <p className="text-xs text-muted-foreground">
                          {deal.revisionRequestedAt ? format(new Date(deal.revisionRequestedAt), 'MMM d, yyyy') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {isUpcoming && (
                    <div className="flex">
                      <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full border border-dashed border-blue-500">
                        <div className="h-2 w-2 rounded-full bg-transparent"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Goes Active</p>
                        <p className="text-xs text-muted-foreground">
                          {format(startDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {isActive && (
                    <div className="flex">
                      <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full border border-blue-500">
                        <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Became Active</p>
                        <p className="text-xs text-muted-foreground">
                          {format(startDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {isExpired ? (
                    <div className="flex">
                      <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full border border-gray-500">
                        <div className="h-2 w-2 rounded-full bg-gray-500"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Expired</p>
                        <p className="text-xs text-muted-foreground">
                          {format(endDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex">
                      <div className="mr-3 h-6 w-6 flex items-center justify-center rounded-full border border-dashed border-gray-300">
                        <div className="h-2 w-2 rounded-full bg-transparent"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Expires</p>
                        <p className="text-xs text-muted-foreground">
                          {format(endDate, 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Redemptions Tab */}
        <TabsContent value="redemptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Redemption Activity</CardTitle>
              <CardDescription>
                Track who has redeemed your deal and when
              </CardDescription>
            </CardHeader>
            <CardContent>
              {redemptions.length === 0 ? (
                <div className="text-center py-8">
                  <PackageOpen className="mx-auto h-12 w-12 text-muted-foreground mb-2 opacity-30" />
                  <h3 className="text-lg font-medium">No redemptions yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    When customers redeem your deal, it will appear here.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="h-12 px-4 text-left font-medium">Customer</th>
                          <th className="h-12 px-4 text-left font-medium">Date & Time</th>
                          <th className="h-12 px-4 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {redemptions.map((redemption, index) => (
                          <tr key={index} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 align-middle">
                              <div className="flex items-center">
                                <Users className="h-5 w-5 text-gray-400 mr-2" />
                                <span>{redemption.customerName || `Customer ${redemption.userId}`}</span>
                              </div>
                            </td>
                            <td className="p-4 align-middle">
                              {format(new Date(redemption.redeemedAt), 'MMM d, yyyy h:mm a')}
                            </td>
                            <td className="p-4 align-middle">
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                {redemption.status || "Completed"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Key metrics for your deal's performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">Views</span>
                      <span className="text-2xl font-bold">{deal.viewCount || 0}</span>
                      <span className="text-xs text-muted-foreground mt-1">Total views of your deal</span>
                    </div>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">Redemptions</span>
                      <span className="text-2xl font-bold">{deal.redemptionCount || 0}</span>
                      <span className="text-xs text-muted-foreground mt-1">{redemptionRate.toFixed(1)}% of views</span>
                    </div>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">Saved</span>
                      <span className="text-2xl font-bold">{deal.saveCount || 0}</span>
                      <span className="text-xs text-muted-foreground mt-1">{saveRate.toFixed(1)}% of views</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Daily Performance</CardTitle>
                <CardDescription>
                  Performance over time (visualization would be added here)
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <div className="text-center p-6">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                  <h3 className="text-lg font-medium">Analytics chart will appear here</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    As your deal collects more data, a chart showing daily views, 
                    redemptions, and saves will be displayed here.
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>
                  Useful insights based on your deal's performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deal.viewCount === 0 ? (
                    <div className="flex">
                      <div className="mr-3 text-yellow-500">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">No views yet</p>
                        <p className="text-sm text-muted-foreground">
                          Your deal hasn't received any views yet. This could be because it's 
                          new or still pending approval.
                        </p>
                      </div>
                    </div>
                  ) : deal.redemptionCount === 0 ? (
                    <div className="flex">
                      <div className="mr-3 text-yellow-500">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">No redemptions yet</p>
                        <p className="text-sm text-muted-foreground">
                          Your deal has {deal.viewCount} views but no redemptions. Consider making your offer more
                          attractive or ensure the redemption process is clear.
                        </p>
                      </div>
                    </div>
                  ) : redemptionRate < 5 ? (
                    <div className="flex">
                      <div className="mr-3 text-yellow-500">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Low redemption rate</p>
                        <p className="text-sm text-muted-foreground">
                          Your redemption rate of {redemptionRate.toFixed(1)}% is below average. Consider 
                          improving your offer or making the redemption process clearer.
                        </p>
                      </div>
                    </div>
                  ) : redemptionRate >= 15 ? (
                    <div className="flex">
                      <div className="mr-3 text-green-500">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Great redemption rate!</p>
                        <p className="text-sm text-muted-foreground">
                          Your redemption rate of {redemptionRate.toFixed(1)}% is excellent. Your offer is resonating 
                          well with customers.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex">
                      <div className="mr-3 text-blue-500">
                        <Info className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Average performance</p>
                        <p className="text-sm text-muted-foreground">
                          Your deal is performing as expected with a {redemptionRate.toFixed(1)}% redemption rate.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {saveRate > 10 && (
                    <div className="flex">
                      <div className="mr-3 text-green-500">
                        <Heart className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Popular deal!</p>
                        <p className="text-sm text-muted-foreground">
                          Your deal has a high save rate of {saveRate.toFixed(1)}%, indicating strong customer interest.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {isExpired ? (
                    <div className="flex">
                      <div className="mr-3 text-gray-500">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Deal has expired</p>
                        <p className="text-sm text-muted-foreground">
                          This deal has expired. Consider creating a new deal based on what worked well here.
                        </p>
                      </div>
                    </div>
                  ) : isUpcoming ? (
                    <div className="flex">
                      <div className="mr-3 text-blue-500">
                        <CalendarIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Deal starts soon</p>
                        <p className="text-sm text-muted-foreground">
                          This deal will become active on {format(startDate, 'MMM d, yyyy')}. 
                          Make sure your business is prepared to handle redemptions.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button variant="outline" onClick={() => setLocation("/vendor")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    </div>
  );
}